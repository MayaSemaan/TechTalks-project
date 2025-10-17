"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import {
  fetchDashboardData,
  updateDoseStatus,
  deleteMedication,
} from "../../../utils/api.js";
import ChartComponent from "../../../components/ChartComponent.jsx";

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

export default function DashboardPage() {
  const { userId } = useParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState({
    meds: [],
    reports: [],
    chartData: [],
    metrics: {},
  });

  const [user, setUser] = useState({ role: "patient", id: null, name: "" });
  const [loggedInUser, setLoggedInUser] = useState({
    role: "patient",
    id: null,
  });

  const [medFilters, setMedFilters] = useState({
    status: "",
    fromDate: "",
    toDate: "",
  });
  const [reportFilters, setReportFilters] = useState({
    fromDate: "",
    toDate: "",
  });

  const loadData = async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchDashboardData(userId, {});
      if (!result.success) throw new Error(result.error);

      setUser(result.user);
      setLoggedInUser(result.loggedInUser || { role: "patient", id: null });

      const medsWithConfirm = (result.medications || []).map((m) => ({
        ...m,
        showDeleteConfirm: false,
      }));

      setData({
        meds: medsWithConfirm,
        reports: result.reports || [],
        chartData: result.chartData || [],
        metrics: { adherencePercent: result.metrics.adherencePercent || 0 },
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [userId]);
  useEffect(() => {
    const handleFocus = () => loadData();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  const clearFilters = () => {
    setMedFilters({ status: "", fromDate: "", toDate: "" });
    setReportFilters({ fromDate: "", toDate: "" });
  };

  const goToMedications = () => router.push("/medications");

  const handleDoseToggle = async (medId, doseId, currentStatus) => {
    const newStatus = currentStatus === true ? false : true;
    const result = await updateDoseStatus(medId, doseId, newStatus);
    if (result.success) {
      setData((prev) => ({
        ...prev,
        meds: prev.meds.map((med) =>
          med._id === medId
            ? {
                ...med,
                filteredDoses: (med.filteredDoses || []).map((d) =>
                  d.doseId === doseId ? { ...d, taken: newStatus } : d
                ),
              }
            : med
        ),
      }));
    }
  };

  const handleDeleteMedication = async (medId) => {
    if (!(loggedInUser.role === "patient" && loggedInUser.id === userId))
      return;
    const result = await deleteMedication(medId);
    if (result.success) {
      setData((prev) => ({
        ...prev,
        meds: prev.meds.filter((med) => med._id !== medId),
      }));
    }
  };

  const filteredMeds = useMemo(() => {
    return data.meds
      .map((m) => {
        let doses = m.filteredDoses || [];

        // Apply date filters
        if (medFilters.fromDate)
          doses = doses.filter(
            (d) => new Date(d.date) >= new Date(medFilters.fromDate)
          );
        if (medFilters.toDate)
          doses = doses.filter(
            (d) => new Date(d.date) <= new Date(medFilters.toDate)
          );

        // Apply status filter (only taken or missed)
        if (medFilters.status === "taken") {
          doses = doses.filter((d) => d.taken === true);
        } else if (medFilters.status === "missed") {
          doses = doses.filter((d) => d.taken === false);
        }

        return { ...m, filteredDoses: doses };
      })
      .filter((m) => m.filteredDoses.length > 0); // remove meds with no doses after filtering
  }, [data.meds, medFilters]);

  const filteredReports = useMemo(() => {
    return data.reports.filter((r) => {
      const uploadedAt = new Date(r.uploadedAt);
      if (
        reportFilters.fromDate &&
        uploadedAt < new Date(reportFilters.fromDate)
      )
        return false;
      if (reportFilters.toDate && uploadedAt > new Date(reportFilters.toDate))
        return false;
      return true;
    });
  }, [data.reports, reportFilters]);

  const totalDoses = filteredMeds.flatMap((m) => m.filteredDoses || []);
  const totalTaken = totalDoses.filter((d) => d.taken === true).length;
  const totalMissed = totalDoses.filter((d) => d.taken === false).length;

  const pieData = {
    labels: ["Taken", "Missed"],
    values: [totalTaken, totalMissed],
    colors: ["#3b82f6", "#f97316"],
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-blue-100 to-blue-200 p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-blue-900">
              {user.name ? `${user.name}'s Dashboard` : "Patient's Dashboard"}
            </h1>
            <span className="px-2 py-1 text-xs rounded bg-blue-200 text-blue-900">
              {user.role.toUpperCase()}
            </span>
          </div>
          <div className="text-lg font-semibold text-blue-900">
            Adherence: {data.metrics.adherencePercent ?? "N/A"}%
          </div>
        </header>

        {/* Filters & Buttons */}
        <div className="flex justify-between items-center bg-white rounded-xl shadow-md p-4 mb-4 flex-wrap gap-4">
          {/* Medication Filters */}
          <div>
            <h2 className="text-lg font-semibold text-blue-900 mb-2">
              Medication Filters
            </h2>
            <div className="flex flex-col sm:flex-row gap-4 mb-2 flex-wrap">
              <select
                value={medFilters.status}
                onChange={(e) =>
                  setMedFilters({ ...medFilters, status: e.target.value })
                }
                className="border rounded p-2 text-black"
              >
                <option value="">All</option>
                <option value="taken">Taken</option>
                <option value="missed">Missed</option>
              </select>
              <input
                type="date"
                value={medFilters.fromDate}
                onChange={(e) =>
                  setMedFilters({ ...medFilters, fromDate: e.target.value })
                }
                className="border rounded p-2 text-black"
              />
              <input
                type="date"
                value={medFilters.toDate}
                onChange={(e) =>
                  setMedFilters({ ...medFilters, toDate: e.target.value })
                }
                className="border rounded p-2 text-black"
              />
            </div>
          </div>

          {/* Report Filters */}
          <div>
            <h2 className="text-lg font-semibold text-blue-900 mb-2">
              Report Filters
            </h2>
            <div className="flex flex-col sm:flex-row gap-4 mb-2 flex-wrap">
              <input
                type="date"
                value={reportFilters.fromDate}
                onChange={(e) =>
                  setReportFilters({
                    ...reportFilters,
                    fromDate: e.target.value,
                  })
                }
                className="border rounded p-2 text-black"
              />
              <input
                type="date"
                value={reportFilters.toDate}
                onChange={(e) =>
                  setReportFilters({ ...reportFilters, toDate: e.target.value })
                }
                className="border rounded p-2 text-black"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2">
            <button
              onClick={clearFilters}
              className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300 transition"
            >
              Clear Filters
            </button>
            <button
              onClick={() => router.push(`/patients/${userId}/medications`)}
              className="bg-blue-500 text-white px-4 py-2 rounded-xl hover:bg-blue-600 transition"
            >
              Manage Medications
            </button>
          </div>
        </div>

        {/* Totals */}
        <div className="bg-white shadow-md rounded-xl p-4 mb-4 flex gap-6 text-blue-900 font-semibold flex-wrap">
          <div>Total Doses: {totalDoses.length}</div>
          <div>Taken: {totalTaken}</div>
          <div>Missed: {totalMissed}</div>
        </div>

        {/* Charts */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white shadow-md rounded-xl p-6">
            <h2 className="font-semibold mb-2 text-blue-900">
              Adherence (last 7 days)
            </h2>
            {data.chartData.length ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={data.chartData}
                  margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="taken"
                    name="Taken"
                    stroke="#3b82f6"
                  />
                  <Line
                    type="monotone"
                    dataKey="missed"
                    name="Missed"
                    stroke="#f97316"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p>No chart data available.</p>
            )}
          </div>
          <div className="bg-white shadow-md rounded-xl p-6">
            <h2 className="font-semibold mb-4 text-blue-900">
              Overall Summary
            </h2>
            <div className="w-full h-64">
              <ChartComponent data={pieData} />
            </div>
          </div>
        </section>

        {/* Medications */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          <div className="bg-white shadow-md rounded-xl p-6 space-y-4">
            <h2 className="font-semibold text-blue-900 mb-2">Medications</h2>
            {filteredMeds.length === 0 ? (
              <p className="text-gray-600">
                No medications found for this filter.
              </p>
            ) : (
              <ul className="text-gray-800 space-y-2">
                {filteredMeds.map((m) => (
                  <li key={m._id} className="border rounded p-3 bg-blue-50">
                    <div className="flex justify-between items-center">
                      <div className="font-semibold flex items-center gap-2">
                        {m.name}
                        <span className="px-1 py-0.5 text-xs rounded bg-blue-100 text-blue-900">
                          {m.role?.toUpperCase() || "PATIENT"}
                        </span>
                      </div>

                      {loggedInUser.role === "patient" &&
                        loggedInUser.id === userId &&
                        (m.showDeleteConfirm ? (
                          <div className="flex gap-2 items-center">
                            <span className="text-sm text-red-600">
                              Confirm?
                            </span>
                            <button
                              onClick={() => handleDeleteMedication(m._id)}
                              className="bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700 transition text-sm"
                            >
                              Yes
                            </button>
                            <button
                              onClick={() =>
                                setData((prev) => ({
                                  ...prev,
                                  meds: prev.meds.map((med) =>
                                    med._id === m._id
                                      ? { ...med, showDeleteConfirm: false }
                                      : med
                                  ),
                                }))
                              }
                              className="bg-gray-200 px-2 py-1 rounded hover:bg-gray-300 transition text-sm"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() =>
                              setData((prev) => ({
                                ...prev,
                                meds: prev.meds.map((med) =>
                                  med._id === m._id
                                    ? { ...med, showDeleteConfirm: true }
                                    : med
                                ),
                              }))
                            }
                            className="text-red-600 hover:underline text-sm transition"
                          >
                            Delete
                          </button>
                        ))}
                    </div>

                    <div className="text-sm text-gray-700 mb-2">
                      {m.dosage} {m.unit} ({m.type})
                    </div>

                    {m.filteredDoses.length ? (
                      <ul className="ml-4 list-disc text-gray-800">
                        {m.filteredDoses.map((d) => (
                          <li key={d.doseId}>
                            {new Date(d.date).toLocaleDateString()} {d.time} –{" "}
                            <button
                              onClick={() =>
                                handleDoseToggle(m._id, d.doseId, d.taken)
                              }
                              disabled={
                                !(
                                  (loggedInUser.role === "patient" &&
                                    loggedInUser.id === userId) ||
                                  loggedInUser.role === "family"
                                )
                              }
                              className={`font-semibold ${
                                d.taken === true
                                  ? "text-green-600"
                                  : d.taken === false
                                  ? "text-red-600"
                                  : "text-gray-600"
                              } transition`}
                            >
                              {d.taken === true
                                ? "Taken"
                                : d.taken === false
                                ? "Missed"
                                : "Pending"}
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-gray-500 text-sm">
                        No doses in this filter.
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Reports */}
          <div className="bg-white shadow-md rounded-xl p-6 space-y-4">
            <h2 className="font-semibold text-blue-900 mb-2">Recent Reports</h2>
            {filteredReports.length === 0 ? (
              <p className="text-gray-600">No reports found for this filter.</p>
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
                        {r.uploadedAt
                          ? new Date(r.uploadedAt).toLocaleString()
                          : "N/A"}
                      </p>
                      {r.role && (
                        <span className="px-1 py-0.5 text-xs rounded bg-blue-100 text-blue-900 mt-1 w-max">
                          {r.role.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <a
                        href={`/reports/view/${r._id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="underline text-blue-600"
                      >
                        View
                      </a>
                      <a
                        href={r.fileUrl}
                        download
                        className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 transition"
                      >
                        Download
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
