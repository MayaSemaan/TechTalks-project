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

const ChartComponent = ({ data }) => {
  const chartData = {
    labels: data.labels,
    datasets: [
      {
        label: "Medications",
        data: data.values,
        backgroundColor: [
          "#4A90E2",
          "#50E3C2",
          "#F5A623",
          "#9013FE",
        ],
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
          font: {
            size: 14,
            weight: "bold",
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
};

export default ChartComponent;
