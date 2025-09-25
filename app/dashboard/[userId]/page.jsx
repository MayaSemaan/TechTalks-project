"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import axios from "axios";
import dynamic from "next/dynamic";

const Recharts = dynamic(() => import("recharts"), { ssr: false });

export default function DashboardPage() {
  const params = useParams();
  const userId = params.userId;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState({
    meds: [],
    reports: [],
    chartData: [],
    metrics: {},
  });

  useEffect(() => {
    if (!userId) return;
    const fetchData = async () => {
      try {
        setLoading(true);
        const base = process.env.NEXT_PUBLIC_API_BASE || "";
        const res = await axios.get(`${base}/api/dashboard?userId=${userId}`);
        setData(res.data);
      } catch (err) {
        console.error(err);
        setError(err.response?.data?.error || err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [userId]);

  if (loading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>;

  // Destructure named exports after module is loaded
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
    <div className="p-6 max-w-5xl mx-auto space-y-6 bg-gradient-to-br from-blue-50 via-white to-purple-50 min-h-screen">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
        <h1 className="text-2xl font-bold">Patient Dashboard</h1>
        <div className="text-lg font-semibold">
          Adherence: {data.metrics.adherencePercent ?? "N/A"}%
        </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card p-4">
          <h2 className="font-semibold mb-2">Adherence (last 7 days)</h2>
          {LineChart && ResponsiveContainer ? (
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
                  stroke="#8884d8"
                />
                <Line
                  type="monotone"
                  dataKey="missed"
                  name="Missed"
                  stroke="#ff7300"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p>Loading chart...</p>
          )}
        </div>

        <div className="card p-4">
          <h2 className="font-semibold mb-2">Medications</h2>
          {data.meds.length === 0 ? (
            <p>No medications added.</p>
          ) : (
            <ul className="list-disc ml-5">
              {data.meds.map((m) => (
                <li key={m._id}>{m.name}</li>
              ))}
            </ul>
          )}

          <h3 className="mt-4 font-semibold">Recent Reports</h3>
          {data.reports.length === 0 ? (
            <p>No reports available.</p>
          ) : (
            <ul className="list-disc ml-5">
              {data.reports.map((r) => (
                <li key={r._id}>
                  <a
                    href={r.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="underline text-blue-600"
                  >
                    {r.title}
                  </a>{" "}
                  <span className="text-sm text-gray-500">
                    ({new Date(r.uploadedAt).toLocaleDateString()})
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
