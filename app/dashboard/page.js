"use client";

import { useState, useEffect } from "react";
import { fetchDashboardData, addMedication } from "@/utils/api";

export default function DashboardPage() {
  const userId = "68d1810de1e8d2230d03390a";
  const [data, setData] = useState(null);
  const [filters, setFilters] = useState({ status: "", fromDate: "", toDate: "" });
  const [newMed, setNewMed] = useState({ name: "", dosage: "", schedule: "", status: "taken" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [filters]);

  async function loadData() {
    setLoading(true);
    const result = await fetchDashboardData(userId, filters);
    if (result.success) setData(result);
    setLoading(false);
  }

  async function handleAddMedication() {
    if (!newMed.name || !newMed.dosage || !newMed.schedule) {
      alert("Please fill all fields");
      return;
    }

    const response = await addMedication({ userId, ...newMed });
    if (response.success) {
      setNewMed({ name: "", dosage: "", schedule: "", status: "taken" });
      await loadData();
    } else {
      alert("❌ Failed to add medication: " + response.error);
    }
  }

  if (loading || !data)
    return (
      <div className="flex items-center justify-center h-screen text-lg text-purple-700 font-semibold">
        Loading Dashboard...
      </div>
    );

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-10">
      <div className="max-w-6xl mx-auto bg-white shadow-xl rounded-3xl p-10 border border-purple-100">
        <h1 className="text-4xl font-bold text-purple-700 text-center mb-8">
          💊 Medication Dashboard
        </h1>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
          <Filter label="Status" value={filters.status} onChange={(v) => setFilters({ ...filters, status: v })} options={["", "taken", "missed"]} />
          <Filter label="From Date" type="date" value={filters.fromDate} onChange={(v) => setFilters({ ...filters, fromDate: v })} />
          <Filter label="To Date" type="date" value={filters.toDate} onChange={(v) => setFilters({ ...filters, toDate: v })} />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10">
          <StatCard title="Total Medications" value={data.totalMeds} color="from-purple-400 to-purple-600" />
          <StatCard title="Compliance Rate" value={`${data.compliance}%`} color="from-pink-400 to-pink-600" />
        </div>

        {/* Add Medication */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-2xl p-6 mb-10 shadow-md">
          <h2 className="text-2xl font-semibold text-purple-700 mb-4">➕ Add New Medication</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <input
              placeholder="Medication Name"
              value={newMed.name}
              onChange={(e) => setNewMed({ ...newMed, name: e.target.value })}
              className="border border-purple-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-purple-400 text-black"
            />
            <input
              placeholder="Dosage"
              value={newMed.dosage}
              onChange={(e) => setNewMed({ ...newMed, dosage: e.target.value })}
              className="border border-purple-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-purple-400 text-black"
            />
            <input
              placeholder="Schedule"
              value={newMed.schedule}
              onChange={(e) => setNewMed({ ...newMed, schedule: e.target.value })}
              className="border border-purple-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-purple-400 text-black"
            />
            <select
              value={newMed.status}
              onChange={(e) => setNewMed({ ...newMed, status: e.target.value })}
              className="border border-purple-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-purple-400 text-black"
            >
              <option value="taken">Taken</option>
              <option value="missed">Missed</option>
            </select>
          </div>
          <button
            onClick={handleAddMedication}
            className="mt-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-5 py-2 rounded-xl font-semibold shadow-md hover:opacity-90 transition"
          >
            Save Medication
          </button>
        </div>

        {/* Medication List */}
        <div>
          <h2 className="text-2xl font-semibold text-purple-700 mb-4">📋 Medications</h2>
          <ul className="space-y-3">
            {data.medications.map((m) => (
              <li key={m._id} className="flex justify-between items-center bg-white border border-purple-100 rounded-2xl shadow-sm px-4 py-3 hover:bg-purple-50 transition">
                <span className="font-medium text-gray-800">{m.name}</span>
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${m.status === "taken" ? "bg-green-200 text-green-800" : "bg-red-200 text-red-800"}`}>
                  {m.status}
                </span>
                <span className="text-gray-500 text-sm">{new Date(m.createdAt).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

// Reusable Components
function Filter({ label, value, onChange, options = null, type = "select" }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-purple-700 mb-1">{label}</label>
      {options ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full border border-purple-300 rounded-xl px-3 py-2 text-black focus:ring-2 focus:ring-purple-400"
        >
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt === "" ? "All" : opt.charAt(0).toUpperCase() + opt.slice(1)}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full border border-purple-300 rounded-xl px-3 py-2 text-black focus:ring-2 focus:ring-purple-400"
        />
      )}
    </div>
  );
}

function StatCard({ title, value, color }) {
  return (
    <div className={`bg-gradient-to-r ${color} text-white rounded-2xl p-6 text-center shadow-md hover:scale-105 transform transition`}>
      <p className="text-3xl font-bold">{value}</p>
      <p className="font-medium text-lg">{title}</p>
    </div>
  );
}
