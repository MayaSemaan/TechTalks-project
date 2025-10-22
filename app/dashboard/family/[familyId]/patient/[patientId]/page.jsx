"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import ChartComponent from "../../../../../components/ChartComponent.jsx";

// Dynamic imports for Recharts
const ResponsiveContainer = dynamic(
  () => import("recharts").then((m) => m.ResponsiveContainer),
  { ssr: false }
);
const LineChart = dynamic(() => import("recharts").then((m) => m.LineChart), {
  ssr: false,
});
const Line = dynamic(() => import("recharts").then((m) => m.Line), {
  ssr: false,
});
const XAxis = dynamic(() => import("recharts").then((m) => m.XAxis), {
  ssr: false,
});
const YAxis = dynamic(() => import("recharts").then((m) => m.YAxis), {
  ssr: false,
});
const CartesianGrid = dynamic(
  () => import("recharts").then((m) => m.CartesianGrid),
  { ssr: false }
);
const Tooltip = dynamic(() => import("recharts").then((m) => m.Tooltip), {
  ssr: false,
});
const Legend = dynamic(() => import("recharts").then((m) => m.Legend), {
  ssr: false,
});

// Safe date formatter
const formatDate = (date) => {
  if (!date || date === "null" || date === "undefined") return "N/A";
  const d = typeof date === "string" ? new Date(date) : date;
  if (!(d instanceof Date) || isNaN(d.getTime())) return "N/A";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export default function FamilyPatientDashboard() {
  const { familyId, patientId } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState({
    user: null,
    medications: [],
    reports: [],
    chartData: [],
  });

  const [medSearch, setMedSearch] = useState("");
  const [medDateFrom, setMedDateFrom] = useState("");
  const [medDateTo, setMedDateTo] = useState("");
  const [medStatusFilter, setMedStatusFilter] = useState("");
  const [reportSearch, setReportSearch] = useState("");
  const [reportDateFrom, setReportDateFrom] = useState("");
  const [reportDateTo, setReportDateTo] = useState("");

  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const loadData = async () => {
    if (!familyId || !patientId) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/dashboard/family/${familyId}/patient/${patientId}`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );

      const contentType = res.headers.get("content-type");
      if (!contentType?.includes("application/json"))
        throw new Error("Invalid JSON");

      const result = await res.json();
      if (!result.success)
        throw new Error(result.error || "Failed to fetch dashboard");

      const meds = (result.data.medications || []).map((m) => ({
        ...m,
        customInterval: m.customInterval || { number: 1, unit: "day" },
        doses: m.doses || [],
        filteredDoses: m.doses || [],
      }));

      setData({
        ...result.data,
        medications: meds,
      });
    } catch (err) {
      setError(err.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [familyId, patientId]);

  const handleChangeDoseStatus = async (medId, doseId, taken) => {
    try {
      if (!familyId || !patientId) return;

      const res = await fetch(
        `/api/family/patient/${patientId}/medications/${medId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : "",
          },
          body: JSON.stringify({ doseId, taken }),
        }
      );

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.message || "Failed to update dose status");
      }

      setData((prev) => ({
        ...prev,
        medications: prev.medications.map((med) =>
          med._id === medId
            ? {
                ...med,
                doses: result.data.doses,
                filteredDoses: result.data.doses,
              }
            : med
        ),
      }));
    } catch (err) {
      console.error(err);
      alert("Could not update dose status. Try again.");
    }
  };

  // Filtered medications
  const filteredMeds = useMemo(() => {
    return (data.medications || [])
      .map((m) => {
        let doses = m.doses || [];
        if (medStatusFilter)
          doses = doses.filter((d) =>
            medStatusFilter === "taken"
              ? d.taken === true
              : medStatusFilter === "missed"
              ? d.taken === false
              : d.taken == null
          );

        if (medDateFrom || medDateTo) {
          const from = medDateFrom ? new Date(medDateFrom) : null;
          const to = medDateTo ? new Date(medDateTo) : null;
          doses = doses.filter((d) => {
            const dd = new Date(d.date);
            if (from && dd < from) return false;
            if (to && dd > to) return false;
            return true;
          });
        }

        return { ...m, filteredDoses: doses };
      })
      .filter((m) => m.name.toLowerCase().includes(medSearch.toLowerCase()));
  }, [data.medications, medSearch, medDateFrom, medDateTo, medStatusFilter]);

  // Filtered reports
  const filteredReports = useMemo(() => {
    return (data.reports || []).filter((r) => {
      const titleMatch = r.title
        .toLowerCase()
        .includes(reportSearch.toLowerCase());
      const from = reportDateFrom ? new Date(reportDateFrom) : null;
      const to = reportDateTo ? new Date(reportDateTo) : null;
      const dateMatch =
        (!from && !to) ||
        (!r.uploadedAt
          ? false
          : (from ? new Date(r.uploadedAt) >= from : true) &&
            (to ? new Date(r.uploadedAt) <= to : true));
      return titleMatch && dateMatch;
    });
  }, [data.reports, reportSearch, reportDateFrom, reportDateTo]);

  // Pie chart
  const totalDoses = filteredMeds.flatMap((m) => m.filteredDoses || []);
  const totalTaken = totalDoses.filter((d) => d.taken === true).length;
  const totalMissed = totalDoses.filter((d) => d.taken === false).length;
  const totalPending = totalDoses.filter((d) => d.taken == null).length;
  const pieData = {
    labels: ["Taken", "Missed", "Pending"],
    values: [totalTaken, totalMissed, totalPending],
    colors: ["#3b82f6", "#f97316", "#9ca3af"],
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>;

  return (
    <div className="min-h-screen bg-blue-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-900">
            {data.user?.name || "Patient"}'s Dashboard
          </h1>
        </header>

        {/* Charts */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white shadow-md rounded-xl p-4 md:p-6">
            <h2 className="font-semibold mb-2 text-blue-900">
              Adherence (last 7 days)
            </h2>
            {data.chartData?.length ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="taken" stroke="#3b82f6" />
                  <Line type="monotone" dataKey="missed" stroke="#f97316" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p>No chart data available.</p>
            )}
          </div>
          <div className="bg-white shadow-md rounded-xl p-4 md:p-6">
            <h2 className="font-semibold mb-4 text-blue-900">
              Overall Summary
            </h2>
            <div className="w-full h-64">
              <ChartComponent data={pieData} />
            </div>
          </div>
        </section>

        {/* Medications */}
        <section className="bg-white shadow-md rounded-xl p-4 md:p-6 space-y-4">
          <h2 className="font-semibold text-blue-900 mb-2">Medications</h2>

          {/* Filters */}
          <div className="flex flex-col md:flex-row md:items-center md:space-x-2 space-y-2 md:space-y-0 mb-2">
            <input
              type="text"
              placeholder="Search medications..."
              value={medSearch}
              onChange={(e) => setMedSearch(e.target.value)}
              className="w-full md:w-1/3 border border-gray-300 rounded px-3 py-1"
            />
            <input
              type="date"
              value={medDateFrom}
              onChange={(e) => setMedDateFrom(e.target.value)}
              className="w-full md:w-1/4 border border-gray-300 rounded px-3 py-1"
            />
            <input
              type="date"
              value={medDateTo}
              onChange={(e) => setMedDateTo(e.target.value)}
              className="w-full md:w-1/4 border border-gray-300 rounded px-3 py-1"
            />
            <select
              value={medStatusFilter}
              onChange={(e) => setMedStatusFilter(e.target.value)}
              className="w-full md:w-1/4 border border-gray-300 rounded px-3 py-1"
            >
              <option value="">All Statuses</option>
              <option value="taken">Taken</option>
              <option value="missed">Missed</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          {filteredMeds.length === 0 ? (
            <p className="text-gray-600">No medications found.</p>
          ) : (
            <ul className="space-y-4">
              {filteredMeds.map((med, medIdx) => (
                <li
                  key={med._id || medIdx}
                  className="border rounded p-4 bg-blue-50 space-y-2"
                >
                  <div>
                    <p className="font-semibold text-lg">{med.name}</p>
                    <p className="text-sm text-gray-700">
                      {med.dosage} {med.unit} ({med.type})
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      <span className="font-medium">Frequency:</span>{" "}
                      {med.schedule === "custom"
                        ? `Every ${med.customInterval?.number || 1} ${
                            med.customInterval?.unit || "day"
                          }${(med.customInterval?.number || 1) > 1 ? "s" : ""}`
                        : med.schedule || "N/A"}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Start Date:</span>{" "}
                      {formatDate(
                        med.startDate || med.filteredDoses?.[0]?.date
                      )}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">End Date:</span>{" "}
                      {formatDate(
                        med.endDate || med.filteredDoses?.slice(-1)[0]?.date
                      )}
                    </p>
                  </div>

                  {/* Doses */}
                  <div className="ml-4">
                    <p className="font-semibold text-gray-800">Doses:</p>
                    {!med.filteredDoses?.length ? (
                      <p className="text-gray-500 text-sm">
                        No doses available.
                      </p>
                    ) : (
                      <ul className="ml-2 list-disc text-gray-800 text-sm">
                        {med.filteredDoses
                          ?.slice()
                          .sort(
                            (a, b) =>
                              new Date(`${a.date} ${a.time || "00:00"}`) -
                              new Date(`${b.date} ${b.time || "00:00"}`)
                          )
                          .map((d, idx) => (
                            <li
                              key={d.doseId || idx}
                              className="flex items-center justify-between"
                            >
                              <span>
                                {formatDate(d.date)} {d.time || "-"} –{" "}
                                <span
                                  className={`font-semibold ${
                                    d.taken === true
                                      ? "text-blue-600"
                                      : d.taken === false
                                      ? "text-red-600"
                                      : "text-gray-600"
                                  }`}
                                >
                                  {d.taken === true
                                    ? "Taken"
                                    : d.taken === false
                                    ? "Missed"
                                    : "Pending"}
                                </span>
                              </span>
                              <div className="flex gap-1">
                                <button
                                  onClick={() =>
                                    handleChangeDoseStatus(
                                      med._id,
                                      d.doseId,
                                      true
                                    )
                                  }
                                  className="px-2 py-0.5 rounded bg-blue-500 text-white text-xs"
                                >
                                  Taken
                                </button>
                                <button
                                  onClick={() =>
                                    handleChangeDoseStatus(
                                      med._id,
                                      d.doseId,
                                      false
                                    )
                                  }
                                  className="px-2 py-0.5 rounded bg-red-500 text-white text-xs"
                                >
                                  Missed
                                </button>
                              </div>
                            </li>
                          ))}
                      </ul>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Reports */}
        <section className="bg-white shadow-md rounded-xl p-4 md:p-6 space-y-4">
          <h2 className="font-semibold text-blue-900 mb-2">Reports</h2>

          <div className="flex flex-col md:flex-row md:items-center md:space-x-2 space-y-2 md:space-y-0 mb-2">
            <input
              type="text"
              placeholder="Search Reports..."
              value={reportSearch}
              onChange={(e) => setReportSearch(e.target.value)}
              className="w-full md:w-1/3 border border-gray-300 rounded px-3 py-1"
            />
            <input
              type="date"
              value={reportDateFrom}
              onChange={(e) => setReportDateFrom(e.target.value)}
              className="w-full md:w-1/4 border border-gray-300 rounded px-3 py-1"
            />
            <input
              type="date"
              value={reportDateTo}
              onChange={(e) => setReportDateTo(e.target.value)}
              className="w-full md:w-1/4 border border-gray-300 rounded px-3 py-1"
            />
          </div>

          {filteredReports.length === 0 ? (
            <p className="text-gray-600">No reports found.</p>
          ) : (
            <div className="grid gap-4">
              {filteredReports.map((r) => (
                <div
                  key={r._id}
                  className="bg-white shadow-md rounded-xl p-4 flex justify-between items-center"
                >
                  <div className="flex flex-col">
                    <p className="font-semibold">{r.title}</p>
                    <p className="text-sm text-gray-500">
                      Uploaded:{" "}
                      {r.uploadedAt || r.createdAt || r.date
                        ? new Date(
                            r.uploadedAt || r.createdAt || r.date
                          ).toLocaleString()
                        : "N/A"}
                    </p>
                  </div>
                  <div>
                    <a
                      href={`/reports/view/${
                        r._id
                      }?familyId=${familyId}&patientId=${patientId}&t=${Date.now()}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 transition"
                    >
                      View
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
