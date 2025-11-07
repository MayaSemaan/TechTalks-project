"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
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

// ✅ Utility to check same day
const isSameDay = (date1, date2) => {
  if (!date1 || !date2) return false;
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
};

// ✅ Check if a dose should be generated for a specific day
const shouldGenerateDose = (med, day) => {
  if (!med.startDate) return false;
  const start = new Date(med.startDate);
  const d = new Date(day);

  if (d < start) return false;

  switch (med.schedule) {
    case "daily":
      return true;
    case "weekly":
      return d.getDay() === start.getDay();
    case "monthly":
      return d.getDate() === start.getDate();
    case "custom":
      if (!med.customInterval) return false;
      const intervalNum = med.customInterval.number || 1;
      const intervalUnit = med.customInterval.unit || "day";
      let diff = 0;
      switch (intervalUnit) {
        case "day":
          diff = Math.floor((d - start) / (1000 * 60 * 60 * 24));
          break;
        case "week":
          diff = Math.floor((d - start) / (1000 * 60 * 60 * 24 * 7));
          break;
        case "month":
          diff =
            (d.getFullYear() - start.getFullYear()) * 12 +
            (d.getMonth() - start.getMonth());
          break;
      }
      return diff >= 0 && diff % intervalNum === 0;
    default:
      return false;
  }
};

// ✅ Generate doses for a day respecting schedule and times
const generateDosesForDay = (med, day) => {
  const existing = (med.doses || []).filter((d) => isSameDay(d.date, day));
  if (existing.length > 0) return existing;

  if (!shouldGenerateDose(med, day)) return [];

  return (med.times || []).map((time, idx) => ({
    doseId: `${day.toISOString()}-${idx}`,
    date: new Date(day).toISOString(),
    time,
    taken: null,
  }));
};

export default function FamilyPatientDashboard() {
  const { familyId, patientId } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState({
    user: null,
    medications: [],
    reports: [],
    chartData: [],
  });

  const [medSearch, setMedSearch] = useState("");
  const [medStatusFilter, setMedStatusFilter] = useState("");
  const [reportSearch, setReportSearch] = useState("");
  const [reportDateFrom, setReportDateFrom] = useState("");
  const [reportDateTo, setReportDateTo] = useState("");

  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );

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

      setData({ ...result.data, medications: meds });
    } catch (err) {
      setError(err.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [familyId, patientId]);

  const handleChangeDoseStatus = async (medId, dose, taken) => {
    try {
      if (!familyId || !patientId) return;
      if (!dose) return;

      let doseId = dose.doseId;

      if (!doseId) {
        const day = new Date(selectedDate);
        const idx =
          medId && dose.time
            ? data.medications
                .find((m) => m._id === medId)
                ?.times?.indexOf(dose.time) || 0
            : 0;
        doseId = `${day.toISOString()}-${idx}`;
      }

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
      if (!res.ok || !result.success)
        throw new Error(result.message || "Failed");

      // Update only the specific dose in state
      setData((prev) => ({
        ...prev,
        medications: prev.medications.map((m) => {
          if (m._id !== medId) return m;

          // Copy doses
          const updatedDoses = m.doses.map((d) =>
            d.doseId === doseId ? { ...d, taken } : d
          );

          // If backend returned a new dose (e.g., generated), ensure it's added
          const newDoseFromBackend = result.data.doses.find(
            (d) => d.doseId === doseId
          );
          if (
            newDoseFromBackend &&
            !updatedDoses.some((d) => d.doseId === doseId)
          ) {
            updatedDoses.push(newDoseFromBackend);
          }

          return {
            ...m,
            doses: updatedDoses,
            // filteredDoses will be regenerated by useMemo (filteredMeds)
          };
        }),
      }));
    } catch (err) {
      console.error(err);
      alert("Could not update dose status.");
    }
  };

  // ✅ Filtered medications with start/end date check
  // ✅ Check if a med is active for a specific day based on schedule
  const isMedForDay = (med, day) => {
    if (!med.startDate) return false;

    const start = new Date(med.startDate);
    const end = med.endDate ? new Date(med.endDate) : null;
    const d = new Date(day);

    if (d < start || (end && d > end)) return false;

    switch (med.schedule) {
      case "daily":
        return true;

      case "weekly":
        return d.getDay() === start.getDay();

      case "monthly":
        return d.getDate() === start.getDate();

      case "custom":
        if (!med.customInterval) return false;
        const num = med.customInterval.number || 1;
        const unit = med.customInterval.unit || "day";

        let isScheduledDay = false;

        if (unit === "day") {
          const diffDays = Math.floor((d - start) / (1000 * 60 * 60 * 24));
          isScheduledDay = diffDays >= 0 && diffDays % num === 0;
        } else if (unit === "week") {
          const diffDays = Math.floor((d - start) / (1000 * 60 * 60 * 24));
          // Check weeks interval AND day of week matches
          isScheduledDay = diffDays >= 0 && diffDays % (num * 7) === 0;
        } else if (unit === "month") {
          const monthsDiff =
            (d.getFullYear() - start.getFullYear()) * 12 +
            (d.getMonth() - start.getMonth());
          isScheduledDay =
            monthsDiff >= 0 &&
            monthsDiff % num === 0 &&
            d.getDate() === start.getDate();
        }

        return isScheduledDay;

      default:
        return false;
    }
  };

  // ✅ Generate doses for a day
  const generateDosesWithStatus = (med, day) => {
    const d = new Date(day);
    const isForToday = isMedForDay(med, d);

    return (med.times || []).map((time, idx) => {
      const existingDose = (med.doses || []).find(
        (dose) => isSameDay(dose.date, d) && dose.time === time
      );

      const dose = existingDose || {
        doseId: `${d.toISOString()}-${idx}`,
        date: d.toISOString(),
        time,
        taken: null,
      };

      return {
        ...dose,
        displayStatus: isForToday
          ? dose.taken === true
            ? "Taken"
            : dose.taken === false
            ? "Missed"
            : "Pending"
          : "Not for selected day",
      };
    });
  };

  // ✅ Updated filteredMeds
  const filteredMeds = useMemo(() => {
    const day = new Date(selectedDate);

    return (data.medications || [])
      .map((med) => {
        const dosesForDay = generateDosesWithStatus(med, day);

        return {
          ...med,
          filteredDoses: medStatusFilter
            ? dosesForDay.filter((d) =>
                medStatusFilter === "taken"
                  ? d.displayStatus === "Taken"
                  : medStatusFilter === "missed"
                  ? d.displayStatus === "Missed"
                  : medStatusFilter === "pending"
                  ? d.displayStatus === "Pending"
                  : true
              )
            : dosesForDay.sort((a, b) =>
                (a.time || "00:00").localeCompare(b.time || "00:00")
              ),
        };
      })
      .filter((m) => m.name.toLowerCase().includes(medSearch.toLowerCase()));
  }, [data.medications, medSearch, medStatusFilter, selectedDate]);

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

  // ✅ Pie chart now uses filtered meds (no separate date picker)
  const totalDosesForPie = filteredMeds.flatMap((m) => m.filteredDoses);

  const pieData =
    totalDosesForPie.length > 0
      ? {
          labels: ["Taken", "Missed", "Pending"],
          values: [
            totalDosesForPie.filter((d) => d.displayStatus === "Taken").length,
            totalDosesForPie.filter((d) => d.displayStatus === "Missed").length,
            totalDosesForPie.filter((d) => d.displayStatus === "Pending")
              .length,
          ],
          colors: ["#3b82f6", "#ef4444", "#9ca3af"],
        }
      : null;

  if (loading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>;

  return (
    <div className="min-h-screen bg-blue-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <header className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push(`/dashboard/family/${familyId}`)}
              className="bg-gray-300 text-gray-800 px-3 py-1 rounded hover:bg-gray-400 transition"
            >
              ← All Patients
            </button>
            <h1 className="text-2xl font-bold text-blue-900">
              {data.user?.name || "Patient"}'s Dashboard
            </h1>
          </div>
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
                  <Line type="monotone" dataKey="missed" stroke="#ef4444" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p>No chart data available.</p>
            )}
          </div>

          <div className="bg-white shadow-md rounded-xl p-4 md:p-6">
            <h2 className="font-semibold mb-2 text-blue-900">Pie Chart</h2>
            <div className="w-full h-64">
              {pieData ? (
                <ChartComponent data={pieData} />
              ) : (
                <p className="text-center text-gray-500 mt-20">
                  No doses available for selected filters
                </p>
              )}
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
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
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
                      <span className="font-medium">Start Date:</span>{" "}
                      {med.startDate
                        ? new Date(med.startDate).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "N/A"}
                    </p>
                    {med.endDate && (
                      <p className="text-sm text-gray-600 mt-1">
                        <span className="font-medium">End Date:</span>{" "}
                        {new Date(med.endDate).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    )}
                    <p className="text-sm text-gray-600 mt-1">
                      <span className="font-medium">Frequency:</span>{" "}
                      {med.schedule === "custom"
                        ? `Every ${med.customInterval?.number || 1} ${
                            med.customInterval?.unit || "day"
                          }${(med.customInterval?.number || 1) > 1 ? "s" : ""}`
                        : med.schedule || "N/A"}
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
                          .sort((a, b) =>
                            (a.time || "00:00").localeCompare(b.time || "00:00")
                          )
                          .map((d, idx) => (
                            <li
                              key={d.doseId || idx}
                              className="flex items-center justify-between"
                            >
                              <span>
                                {d.time || "-"} –{" "}
                                <span
                                  className={`font-semibold ${
                                    d.displayStatus === "Taken"
                                      ? "text-blue-600"
                                      : d.displayStatus === "Missed"
                                      ? "text-red-600"
                                      : "text-gray-600"
                                  }`}
                                >
                                  {d.displayStatus}
                                </span>
                              </span>

                              {/* Buttons always visible for valid doses */}
                              {d.displayStatus !== "Not for selected day" && (
                                <div className="flex gap-1">
                                  <button
                                    onClick={() =>
                                      handleChangeDoseStatus(med._id, d, true)
                                    }
                                    className={`px-1 py-0.1 rounded text-xs ${
                                      d.taken === true
                                        ? "bg-blue-600 text-white"
                                        : "bg-blue-500 text-white"
                                    }`}
                                  >
                                    Taken
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleChangeDoseStatus(med._id, d, false)
                                    }
                                    className={`px-1 py-0.1 rounded text-xs ${
                                      d.taken === false
                                        ? "bg-red-600 text-white"
                                        : "bg-red-500 text-white"
                                    }`}
                                  >
                                    Missed
                                  </button>
                                </div>
                              )}
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
