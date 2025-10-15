"use client";
import React from "react";
import { Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend);

export default function ChartComponent({ data }) {
  // Convert [{name, value}, ...] into labels and numbers
  const labels = data.map((item) => item.name);
  const values = data.map((item) => item.value);

  const chartData = {
    labels,
    datasets: [
      {
        label: "Medications",
        data: values,
        backgroundColor: ["#22c55e", "#ef4444", "#facc15", "#3b82f6"],
        borderColor: "#fff",
        borderWidth: 2,
      },
    ],
  };

  const options = {
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          font: { size: 14, weight: "bold" },
        },
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const value = context.parsed;
            const percentage = ((value / total) * 100).toFixed(1);
            return `${context.label}: ${value} (${percentage}%)`;
          },
        },
      },
    },
    maintainAspectRatio: false,
  };

  return (
    <div style={{ width: "100%", height: "300px", marginBottom: "30px" }}>
      <Pie data={chartData} options={options} />
    </div>
  );
}
