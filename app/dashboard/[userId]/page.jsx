"use client";

import { useParams } from "next/navigation"; // ✅ import useParams
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const Recharts = dynamic(() => import("recharts"), { ssr: false });

export default function DashboardPage() {
  const { userId } = useParams(); // ✅ get userId from URL dynamically
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState({
    meds: [],
    reports: [],
    chartData: [],
    metrics: {},
  });

  const base = process.env.NEXT_PUBLIC_API_BASE || "";

  useEffect(() => {
    if (!userId) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem("token");
        if (!token) throw new Error("No token found. Please login.");

        const res = await fetch(`${base}/api/dashboard/${userId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Failed to fetch dashboard data");
        }

        const json = await res.json();
        setData({
          meds: json.medications || [],
          reports: json.reports || [],
          chartData: json.chartData || [],
          metrics: json.metrics || {},
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId, base]);

  if (loading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>;

  const {
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    Legend,
    ResponsiveContainer,
  } = Recharts || {};

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

        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Adherence Chart */}
          <div className="bg-white shadow-md rounded-xl p-6">
            <h2 className="font-semibold mb-2 text-blue-900">
              Adherence (last 7 days)
            </h2>
            {LineChart && ResponsiveContainer && data.chartData.length ? (
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

          {/* Medications & Recent Reports */}
          <div className="bg-white shadow-md rounded-xl p-6 space-y-4">
            <div>
              <h2 className="font-semibold text-blue-900 mb-2">Medications</h2>
              {data.meds.length === 0 ? (
                <p className="text-gray-600">No medications added.</p>
              ) : (
                <ul className="list-disc ml-5 text-gray-800">
                  {data.meds.map((m) => (
                    <li key={m._id}>{m.name}</li>
                  ))}
                </ul>
              )}
            </div>

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
                          {new Date(r.uploadedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <a
                          href={r.fileUrl}
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
