"use client";
import React, { useState, useEffect } from "react";
import MedicationChart from "@/components/MedicationChart";
import DoctorReports from "@/components/DoctorReports";
import axios from "axios";

export default function Page() {
  const [medications, setMedications] = useState([]);
  const [activeTab, setActiveTab] = useState("dashboard");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get("http://localhost:5000/medications");
        setMedications(res.data);
      } catch (err) {
        console.error("Error fetching meds:", err);
      }
    };
    fetchData();
  }, []);

  // Convert backend meds to chart format
  const chartData = medications.map(m => ({
    name: m.name,
    value: m.status === "taken" ? 1 : 0, // Example logic, adjust as needed
  }));

  const reports = [
    { Report: "Blood Test", Date: "2025-09-20", Doctor: "Dr. Smith" },
    { Report: "X-Ray", Date: "2025-09-22", Doctor: "Dr. Jones" },
  ];

  return (
    <div className="min-h-screen bg-gray-100 p-6 font-sans">
      <h1 className="text-2xl font-bold text-gray-700 mb-6">Dashboard</h1>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-gray-300">
        <button
          className={`pb-2 font-medium ${
            activeTab === "dashboard"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-500"
          }`}
          onClick={() => setActiveTab("dashboard")}
        >
          Dashboard
        </button>
        <button
          className={`pb-2 font-medium ${
            activeTab === "reports"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-500"
          }`}
          onClick={() => setActiveTab("reports")}
        >
          Doctor Reports
        </button>
      </div>

      {activeTab === "dashboard" && (
        <div className="grid gap-6 md:grid-cols-2">
          <MedicationChart data={chartData} />
          <div className="bg-white rounded-2xl shadow-md p-4">
            <h2 className="text-lg font-semibold mb-3">Medications</h2>
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-blue-600 text-white text-left">
                  <th className="p-2">Medication</th>
                  <th className="p-2">Dosage</th>
                  <th className="p-2">Schedule</th>
                </tr>
              </thead>
              <tbody>
                {medications.map((item, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="p-2">{item.name}</td>
                    <td className="p-2">{item.dosage}</td>
                    <td className="p-2">{item.schedule}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "reports" && <DoctorReports reports={reports} />}
    </div>
  );
}
