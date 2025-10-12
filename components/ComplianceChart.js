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

export default function ComplianceChart({ medications = [], fromDate, toDate }) {
  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Use provided fromDate and toDate, otherwise default to last 7 days
  const start = fromDate ? new Date(fromDate) : new Date(new Date().setDate(new Date().getDate() - 6));
  const end = toDate ? new Date(toDate) : new Date();

  // Create labels and dates array between start and end
  const dateArray = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const copy = new Date(d); // prevent mutation
    dateArray.push({
      label: daysOfWeek[copy.getDay()],
      date: copy,
      dateStr: copy.toISOString().split("T")[0],
    });
  }

  const taken = Array(dateArray.length).fill(0);
  const missed = Array(dateArray.length).fill(0);

  // Count all medications cumulatively for each day
  medications.forEach((med) => {
    const medDate = new Date(med.createdAt || med.date || Date.now());
    const medDateStr = medDate.toISOString().split("T")[0];

    dateArray.forEach((d, i) => {
      if (medDateStr <= d.dateStr) {
        if (med.status === "taken") taken[i]++;
        else if (med.status === "missed") missed[i]++;
      }
    });
  });

  const data = {
    labels: dateArray.map((d) => d.label),
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
        labels: { color: "#111", font: { size: 13 } },
      },
    },
    scales: {
      x: { ticks: { color: "#111", font: { size: 12 } }, grid: { color: "rgba(200, 200, 200, 0.3)" } },
      y: { beginAtZero: true, ticks: { color: "#111", stepSize: 1 }, grid: { color: "rgba(200, 200, 200, 0.3)" } },
    },
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-200 mb-6">
      <h2 className="font-semibold mb-4 text-gray-800 text-lg">
        📊 Compliance Overview ({dateArray.length} Days)
      </h2>
      <Bar data={data} options={options} />
    </div>
  );
}
