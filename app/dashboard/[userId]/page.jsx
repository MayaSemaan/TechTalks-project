"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { fetchDashboardData } from "../../utils/api.js";

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState({
    meds: [],
    reports: [],
    chartData: [],
    metrics: {},
  });

  // Separate filters
  const [medFilters, setMedFilters] = useState({
    status: "",
    fromDate: "",
    toDate: "",
  });
  const [reportFilters, setReportFilters] = useState({
    fromDate: "",
    toDate: "",
  });

  useEffect(() => {
    if (!userId) return;
    const loadData = async () => {
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
        const reports = (result.reports || []).map((r) => ({
          ...r,
          uploadedAt: r.uploadedAt ? new Date(r.uploadedAt) : null,
        }));
        setData({
          meds: result.medications || [],
          reports,
          chartData: result.chartData || [],
          metrics: result.metrics || {},
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [userId, medFilters, reportFilters]);

  if (loading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>;

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

        {/* -------------------- FILTERS -------------------- */}
        <div className="bg-white rounded-xl shadow-md p-4 mb-4">
          <h2 className="text-lg font-semibold text-blue-900 mb-2">
            Medication Filters
          </h2>
          <div className="flex flex-col sm:flex-row gap-4 mb-2">
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

        <div className="bg-white rounded-xl shadow-md p-4 mb-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-2">
            Report Filters
          </h2>
          <div className="flex flex-col sm:flex-row gap-4">
            <input
              type="date"
              value={reportFilters.fromDate}
              onChange={(e) =>
                setReportFilters({ ...reportFilters, fromDate: e.target.value })
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

        {/* -------------------- CHART + DATA -------------------- */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Chart */}
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

          {/* Medications + Reports */}
          <div className="bg-white shadow-md rounded-xl p-6 space-y-4">
            {/* Medications */}
            <div>
              <h2 className="font-semibold text-blue-900 mb-2">Medications</h2>
              {data.meds.length === 0 ? (
                <p className="text-gray-600">No medications added.</p>
              ) : (
                <ul className="list-disc ml-5 text-gray-800 mt-2">
                  {data.meds.map((m) => (
                    <li key={m._id}>{m.name}</li>
                  ))}
                </ul>
              )}
            </div>

            {/* Reports */}
            <div>
              <h2 className="font-semibold text-blue-900 mb-2">
                Recent Reports
              </h2>
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
                          {r.uploadedAt
                            ? r.uploadedAt.toLocaleString() // show full date + time
                            : "N/A"}
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
        </section>
      </div>
    </div>
  );
}
