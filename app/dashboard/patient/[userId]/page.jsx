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

  // --- LOAD DASHBOARD DATA ---
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

  // --- TOGGLE DOSE STATUS ---
  const handleDoseToggle = async (medId, doseId, currentStatus) => {
    const newStatus = currentStatus === true ? false : true;
    const result = await updateDoseStatus(medId, doseId, newStatus);
    if (result.success) await loadData();
  };

  // --- DELETE MEDICATION ---
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

  // --- FILTERED MEDS ---
  const filteredMeds = useMemo(() => {
    return data.meds.map((m) => {
      let doses = m.filteredDoses || [];

      if (medFilters.fromDate)
        doses = doses.filter(
          (d) => new Date(d.date) >= new Date(medFilters.fromDate)
        );
      if (medFilters.toDate)
        doses = doses.filter(
          (d) => new Date(d.date) <= new Date(medFilters.toDate)
        );

      if (medFilters.status === "taken")
        doses = doses.filter((d) => d.taken === true);
      else if (medFilters.status === "missed")
        doses = doses.filter((d) => d.taken === false);

      return { ...m, filteredDoses: doses };
    });
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

  // --- PIE CHART DATA ---
  const totalDoses = filteredMeds.flatMap((m) => m.filteredDoses || []);
  const totalTaken = totalDoses.filter((d) => d.taken === true).length;
  const totalMissed = totalDoses.filter((d) => d.taken === false).length;
  const totalPending = totalDoses.filter(
    (d) => d.taken === null || d.taken === undefined
  ).length;

  const pieData = {
    labels: ["Taken", "Missed", "Pending"],
    values: [totalTaken, totalMissed, totalPending],
    colors: ["#3b82f6", "#f97316", "#9ca3af"],
  };

  const getNextScheduledDate = (med) => {
    if (med.schedule === "everyday") return null;
    if (!med.customInterval?.number || !med.customInterval?.unit) return null;

    const start = new Date(med.startDate);
    const last = new Date();
    const next = new Date(start);

    const unit = med.customInterval.unit.toLowerCase();
    const number = med.customInterval.number;

    while (next <= last) {
      if (unit.includes("day")) next.setDate(next.getDate() + number);
      else if (unit.includes("week")) next.setDate(next.getDate() + 7 * number);
      else if (unit.includes("month")) next.setMonth(next.getMonth() + number);
      else break;
    }
    return next;
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

        {/* Filters */}
        <div className="flex justify-between items-center bg-white rounded-xl shadow-md p-4 mb-4 flex-wrap gap-4">
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
          <div>Pending: {totalPending}</div>
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

        {/* --- MEDICATION LIST --- */}
        <div className="bg-white shadow-md rounded-xl p-6 space-y-4 mt-6">
          <h2 className="font-semibold text-blue-900 mb-2">Medications</h2>
          {filteredMeds.length === 0 ? (
            <p className="text-gray-600">
              No medications found for this filter.
            </p>
          ) : (
            filteredMeds.map((m) => {
              const nextDate = getNextScheduledDate(m);
              return (
                <div
                  key={m._id}
                  className="border border-gray-200 rounded-2xl p-4 shadow-sm bg-blue-50 mb-4"
                >
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold text-lg text-blue-700">
                      {m.name}
                    </h3>
                    <span className="text-sm text-gray-500">
                      {new Date(m.startDate).toLocaleDateString()} →{" "}
                      {new Date(m.endDate).toLocaleDateString()}
                    </span>
                  </div>

                  <p className="text-sm text-gray-600 mb-1">
                    {m.dosage} {m.unit} ({m.type})
                  </p>

                  {nextDate && (
                    <p className="text-sm text-blue-700 mb-2">
                      Next scheduled: {nextDate.toLocaleDateString()}
                    </p>
                  )}

                  {m.filteredDoses.length ? (
                    <ul className="space-y-1">
                      {m.filteredDoses.map((d) => {
                        const today = new Date();
                        const start = new Date(m.startDate);
                        const end = new Date(m.endDate);
                        const isTodayActive =
                          today >= new Date(start.setHours(0, 0, 0, 0)) &&
                          today <= new Date(end.setHours(23, 59, 59, 999));

                        let statusLabel = "not active today";
                        let statusColor = "text-gray-500";

                        if (isTodayActive) {
                          if (m.schedule === "everyday") {
                            if (d.taken === true) {
                              statusLabel = "taken";
                              statusColor = "text-green-600";
                            } else if (d.taken === false) {
                              statusLabel = "missed";
                              statusColor = "text-red-600";
                            } else {
                              statusLabel = "pending";
                              statusColor = "text-orange-500";
                            }
                          } else {
                            statusLabel = "-";
                            statusColor = "text-gray-400";
                          }
                        }

                        return (
                          <li
                            key={d.doseId}
                            className="flex justify-between items-center border-b border-gray-100 py-1"
                          >
                            <span className="text-gray-800">{d.time}</span>
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
                              className={`font-semibold ${statusColor} transition`}
                            >
                              {statusLabel}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="text-gray-500 text-sm">
                      No doses in this filter.
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* --- REPORTS --- */}
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
  );
}
