"use client";

import { useState, useEffect } from "react";
import { fetchDashboardData } from "@/utils/api";

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [filters, setFilters] = useState({ status: "", fromDate: "", toDate: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const userId =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("userId")
      : null;

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    fetchDashboardData(userId, filters)
      .then((res) => {
        if (res.success) setData(res);
        else setError(res.error || "Failed to load data");
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load dashboard data");
        setLoading(false);
      });
  }, [userId, filters]);

  if (loading) return <Loader />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <div className="min-h-screen bg-gradient-to-r from-purple-50 to-pink-50 px-6 py-8">
      <div className="max-w-5xl mx-auto bg-white shadow-2xl rounded-3xl p-8 border border-gray-200">
        <h1 className="text-4xl font-bold text-center text-purple-700 mb-8">
          📊 Medication Dashboard
        </h1>

        <Filters filters={filters} setFilters={setFilters} />

        <Stats total={data.totalMeds} compliance={data.compliance} />

        <MedicationsList medications={data.medications} />

        {data.logs?.length > 0 && <LogsList logs={data.logs} />}
      </div>
    </div>
  );
}

function Loader() {
  return (
    <div className="flex justify-center items-center h-screen text-xl font-medium text-purple-700">
      Loading dashboard...
    </div>
  );
}

function ErrorMessage({ message }) {
  return (
    <div className="flex justify-center items-center h-screen text-lg font-semibold text-red-600">
      {message}
    </div>
  );
}

function Filters({ filters, setFilters }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
      <FilterSelect
        label="Status"
        value={filters.status}
        onChange={(v) => setFilters({ ...filters, status: v })}
        options={[
          { value: "", label: "All" },
          { value: "taken", label: "Taken" },
          { value: "missed", label: "Missed" },
        ]}
      />
      <FilterInput
        label="From Date"
        value={filters.fromDate}
        onChange={(v) => setFilters({ ...filters, fromDate: v })}
      />
      <FilterInput
        label="To Date"
        value={filters.toDate}
        onChange={(v) => setFilters({ ...filters, toDate: v })}
      />
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <div>
      <label className="block text-sm font-medium text-purple-700 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-purple-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-400 text-gray-800"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function FilterInput({ label, value, onChange }) {
  return (
    <div>
      <label className="block text-sm font-medium text-purple-700 mb-1">{label}</label>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-purple-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-400 text-gray-800"
      />
    </div>
  );
}

function Stats({ total, compliance }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10">
      <StatCard title="Total Medications" value={total} color="purple" />
      <StatCard title="Compliance Rate" value={`${compliance}%`} color="pink" />
    </div>
  );
}

function StatCard({ title, value, color }) {
  const colors = {
    purple: "from-purple-400 to-purple-600",
    pink: "from-pink-400 to-pink-600",
    blue: "from-blue-400 to-blue-600",
  };
  return (
    <div
      className={`bg-gradient-to-r ${colors[color]} text-white rounded-3xl p-6 text-center shadow-lg hover:scale-105 transform transition`}
    >
      <p className="text-3xl font-bold">{value}</p>
      <p className="font-medium">{title}</p>
    </div>
  );
}

function MedicationsList({ medications }) {
  return (
    <div className="mb-10">
      <h2 className="text-2xl font-semibold text-purple-700 mb-4">Medications</h2>
      <ul className="divide-y divide-gray-200">
        {medications.map((med) => (
          <li
            key={med._id}
            className="py-3 flex justify-between items-center bg-gradient-to-r from-white to-purple-50 rounded-xl px-4 mb-2 shadow-sm"
          >
            <span className="text-gray-800 font-medium">{med.name}</span>
            <span
              className={`px-3 py-1 rounded-full text-sm font-semibold border ${
                med.status === "taken"
                  ? "bg-green-200 text-green-800 border-green-300"
                  : med.status === "missed"
                  ? "bg-red-200 text-red-800 border-red-300"
                  : "bg-yellow-200 text-yellow-800 border-yellow-300"
              }`}
            >
              {med.status}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function LogsList({ logs }) {
  return (
    <div>
      <h2 className="text-2xl font-semibold text-purple-700 mb-4">Reminder Logs</h2>
      <ul className="divide-y divide-gray-200">
        {logs.map((log) => (
          <li
            key={log._id}
            className="py-2 text-gray-700 flex flex-col sm:flex-row sm:justify-between bg-white rounded-xl px-4 mb-2 shadow-sm"
          >
            <span>
              <strong>Medication:</strong> {log.medicationId}
            </span>
            <span>
              <strong>Status:</strong> {log.status}
            </span>
            <span className="text-sm">{new Date(log.createdAt).toLocaleString()}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
