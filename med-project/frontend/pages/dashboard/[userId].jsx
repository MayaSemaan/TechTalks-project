import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import axios from 'axios';
import dynamic from 'next/dynamic';

// Recharts components are client-side only; import dynamically to avoid SSR issues
const { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend, ResponsiveContainer, BarChart, Bar } = require('recharts');

export default function DashboardPage() {
  const router = useRouter();
  const { userId } = router.query;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!userId) return;
    const base = process.env.NEXT_PUBLIC_API_BASE || '';

    setLoading(true);
    setError(null);

    axios.get(`${base}/dashboard/${userId}`)
      .then(res => setData(res.data))
      .catch(err => {
        console.error(err);
        setError(err.response?.data?.error || err.message);
      })
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>;

  return (
    <div className="p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Patient Dashboard</h1>
        <div>Adherence: {data.metrics.adherencePercent ?? 'N/A'}%</div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card p-4">
          <h2 className="font-semibold mb-2">Adherence (last 30 days)</h2>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <LineChart data={data.chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="taken" name="Taken" stroke="#8884d8" />
                <Line type="monotone" dataKey="missed" name="Missed" stroke="#ff7300" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-4">
          <h2 className="font-semibold mb-2">Medication List</h2>
          <ul>
            {data.meds.map(m => (
              <li key={m.id} className="py-1">{m.name}</li>
            ))}
          </ul>

          <h3 className="mt-4 font-semibold">Recent Reports</h3>
          <ul>
            {data.reports.map(r => (
              <li key={r.id} className="py-1">
                <a href={r.fileUrl} target="_blank" rel="noreferrer" className="underline">{r.title}</a>
                <span className="ml-2 text-sm text-gray-500">{new Date(r.uploadedAt).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section>
        <h2 className="font-semibold mb-2">History (last 30 days)</h2>
        <div className="overflow-auto">
          <table className="min-w-full text-left border-collapse">
            <thead>
              <tr>
                <th>Date</th>
                <th>Taken</th>
                <th>Missed</th>
              </tr>
            </thead>
            <tbody>
              {data.chartData.map(row => (
                <tr key={row.date}>
                  <td className="py-1">{row.date}</td>
                  <td className="py-1">{row.taken}</td>
                  <td className="py-1">{row.missed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}