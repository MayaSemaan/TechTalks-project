"use client";
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from "recharts";

const COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#8b5cf6"];

export default function MedicationChart({ data }) {
  // Ensure valid chart data
  const cleanData = (data || [])
    .filter(item => item && item.name) // remove empty entries
    .map((item, index) => ({
      name: String(item.name),
      value: Number(item.value) > 0 ? Number(item.value) : 1, // default to 1 if 0 or invalid
    }));

  return (
    <div className="bg-white p-4 rounded-2xl shadow-md w-full h-64">
      <h2 className="text-lg font-semibold mb-3">Medication Overview</h2>
      {cleanData.length > 0 ? (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={cleanData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={80}
              label
            >
              {cleanData.map((entry, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-center text-gray-500 mt-10">No medication data yet.</p>
      )}
    </div>
  );
}
