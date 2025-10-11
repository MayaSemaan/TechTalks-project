"use client";

import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export default function ComplianceChart({ medications = [] }) {
  // Create labels for the last 7 days (Mon–Sun style)
  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const today = new Date();
  const last7Days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(today.getDate() - (6 - i)); // past 6 days + today
    return {
      label: daysOfWeek[d.getDay()],
      dateStr: d.toISOString().split("T")[0], // YYYY-MM-DD for comparison
    };
  });

  const taken = Array(7).fill(0);
  const missed = Array(7).fill(0);

  // Group meds by date
  medications.forEach((med) => {
    const date = new Date(med.date || med.createdAt || Date.now());
    const medDateStr = date.toISOString().split("T")[0];
    const dayIndex = last7Days.findIndex((d) => d.dateStr === medDateStr);

    if (dayIndex !== -1) {
      if (med.status === "taken") taken[dayIndex]++;
      else if (med.status === "missed") missed[dayIndex]++;
    }
  });

  const data = {
    labels: last7Days.map((d) => d.label),
    datasets: [
      {
        label: "Taken",
        data: taken,
        backgroundColor: "rgba(0, 123, 255, 0.7)",
        borderRadius: 6,
      },
      {
        label: "Missed",
        data: missed,
        backgroundColor: "rgba(255, 99, 132, 0.7)",
        borderRadius: 6,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: "top",
        labels: { color: "#111", font: { size: 13 } }, // dark text
      },
    },
    scales: {
      x: {
        ticks: { color: "#111", font: { size: 12 } },
        grid: { color: "rgba(200, 200, 200, 0.3)" }, // light gray grid
      },
      y: {
        beginAtZero: true,
        ticks: { color: "#111", stepSize: 1 },
        grid: { color: "rgba(200, 200, 200, 0.3)" },
      },
    },
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-200 mb-6">
      <h2 className="font-semibold mb-4 text-gray-800 text-lg">
        📊 Compliance Overview (Last 7 Days)
      </h2>
      <Bar data={data} options={options} />
    </div>
  );
}
