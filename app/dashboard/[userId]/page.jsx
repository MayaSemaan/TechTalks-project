"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { fetchDashboardData } from "../../utils/api.js";
import ChartComponent from "../../components/ChartComponent.jsx"; // Pie chart

// Dynamic Recharts imports
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

  const [medFilters, setMedFilters] = useState({
    status: "",
    fromDate: "",
    toDate: "",
  });
  const [reportFilters, setReportFilters] = useState({
    fromDate: "",
    toDate: "",
  });

  // Recalculate totals
  const totalDoses = data.meds.flatMap((m) => m.filteredDoses || []);
  const totalTaken = totalDoses.filter((d) => d.taken === true).length;
  const totalMissed = totalDoses.filter((d) => d.taken === false).length;

  const calculateAdherence = (medications) => {
    const allDoses = medications.flatMap((m) => m.filteredDoses || []);
    const taken = allDoses.filter((d) => d.taken === true).length;
    return allDoses.length ? Math.round((taken / allDoses.length) * 100) : 0;
  };

  const buildChartData = (medications) => {
    const chartData = [];
    const end = new Date();
    const start = new Date(end.getTime() - 6 * 24 * 60 * 60 * 1000);
    const currentDate = new Date(start);

    while (currentDate <= end) {
      const dayStart = new Date(currentDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(currentDate);
      dayEnd.setHours(23, 59, 59, 999);

      const allDoses = medications.flatMap((m) => m.filteredDoses || []);
      const dosesForDay = allDoses.filter((d) => {
        const date = new Date(d.date);
        return date >= dayStart && date <= dayEnd;
      });

      chartData.push({
        date: dayStart.toISOString().split("T")[0],
        taken: dosesForDay.filter((d) => d.taken === true).length,
        missed: dosesForDay.filter((d) => d.taken === false).length,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return chartData;
  };

  const loadData = async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);

    try {
      const filtersForAPI = {
        ...medFilters,
        reportFromDate: reportFilters.fromDate,
        reportToDate: reportFilters.toDate,
      };
      const result = await fetchDashboardData(userId, filtersForAPI);
      if (!result.success) throw new Error(result.error);

      const meds = result.medications || [];
      const reports = (result.reports || []).map((r) => ({
        ...r,
        uploadedAt: r.uploadedAt ? new Date(r.uploadedAt) : null,
      }));

      setData({
        meds,
        reports,
        chartData: buildChartData(meds),
        metrics: { adherencePercent: calculateAdherence(meds) },
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Load data initially and whenever filters change
  useEffect(() => {
    loadData();
  }, [userId, medFilters, reportFilters]);

  // Refresh dashboard when navigating back from /medications
  useEffect(() => {
    const handleFocus = () => loadData();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  const clearFilters = () => {
    setMedFilters({ status: "", fromDate: "", toDate: "" });
    setReportFilters({ fromDate: "", toDate: "" });
  };

  const goToMedications = () => {
    router.push("/medications");
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>;

  const pieData = {
    labels: ["Taken", "Missed"],
    values: [totalTaken, totalMissed],
    colors: ["#3b82f6", "#f97316"], // Tailwind blue & orange
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-blue-100 to-blue-200 p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
          <h1 className="text-2xl font-bold text-blue-900">
            Patient Dashboard
          </h1>
          <div className="text-lg font-semibold text-blue-900">
            Adherence: {data.metrics.adherencePercent ?? "N/A"}%
          </div>
        </header>

        {/* Filters */}
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

          {/* Buttons */}
          <div className="flex flex-col gap-2">
            <button
              onClick={clearFilters}
              className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300 transition"
            >
              Clear Filters
            </button>
            <button
              onClick={goToMedications}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
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

        {/* Medications + Reports */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          {/* Medications */}
          <div className="bg-white shadow-md rounded-xl p-6 space-y-4">
            <h2 className="font-semibold text-blue-900 mb-2">Medications</h2>
            {data.meds.length === 0 ? (
              <p className="text-gray-600">No medications added.</p>
            ) : (
              <ul className="text-gray-800 space-y-2">
                {data.meds.map((m) => (
                  <li key={m._id} className="border rounded p-3 bg-blue-50">
                    <div className="font-semibold">{m.name}</div>
                    <div className="text-sm text-gray-700 mb-2">
                      {m.dosage} {m.unit} ({m.type})
                    </div>
                    {m.filteredDoses.length ? (
                      <ul className="ml-4 list-disc text-gray-800">
                        {m.filteredDoses.map((d) => (
                          <li key={d.doseId}>
                            {new Date(d.date).toLocaleDateString()} {d.time} –{" "}
                            {d.taken === true
                              ? "Taken"
                              : d.taken === false
                              ? "Missed"
                              : "Pending"}
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
            {data.reports.length === 0 ? (
              <p className="text-gray-600">No reports available.</p>
            ) : (
              <div className="grid gap-4">
                {data.reports.map((r) => (
                  <div
                    key={r._id}
                    className="bg-white shadow-md rounded-xl p-4 flex justify-between items-center"
                  >
                    <div>
                      <p className="font-semibold">{r.title}</p>
                      <p className="text-sm text-gray-500">
                        Uploaded:{" "}
                        {r.uploadedAt ? r.uploadedAt.toLocaleString() : "N/A"}
                      </p>
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
