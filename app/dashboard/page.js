"use client";

import { useState, useEffect } from "react";
import { fetchDashboardData, addMedication, deleteMedication } from "@/utils/api";
import ComplianceChart from "@/components/ComplianceChart";
import MedicationForm from "@/components/MedicationForm";
import MedicationTable from "@/components/MedicationTable";
import ReportUpload from "@/components/ReportUpload";
import ReportList from "@/components/ReportList";

export default function DashboardPage() {
  const userId = "68efb16e684ba880eac6f256"; // Make sure this is correct

  const [data, setData] = useState({
    totalMeds: 0,
    compliance: 0,
    medications: [],
    reports: [],
  });

  const [filters, setFilters] = useState({ status: "", fromDate: "", toDate: "" });
  const [loading, setLoading] = useState(false);
  const [refreshReports, setRefreshReports] = useState(0);

  // Load data whenever filters change
  useEffect(() => {
    loadData();
  }, [filters]);

  async function loadData() {
    setLoading(true);
    const result = await fetchDashboardData(userId, filters);
    if (result.success) {
      setData({
        totalMeds: result.totalMeds || 0,
        compliance: result.compliance || 0,
        medications: result.medications || [],
        reports: result.reports || [],
      });
    }
    setLoading(false);
  }

  async function handleAddMedication(newMed) {
    if (!newMed.name || !newMed.dosage || !newMed.schedule) {
      alert("Please fill all fields");
      return;
    }

    const response = await addMedication({ userId, ...newMed });
    if (response.success) {
      await loadData(); // refresh table and chart
    } else {
      alert("Failed to add medication: " + response.error);
    }
  }

  async function handleDeleteMedication(id) {
    const result = await deleteMedication(id);
    if (result.success) {
      await loadData();
    } else {
      alert("Delete failed: " + result.error);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-sky-700 text-xl font-semibold">
        Loading Dashboard...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-teal-50 p-10 text-gray-800">
      <div className="max-w-7xl mx-auto bg-white shadow-2xl rounded-3xl p-10 border border-sky-100">
        <h1 className="text-4xl font-bold text-center text-sky-700 mb-10">
          🏥 Medication Management Dashboard
        </h1>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
          <Filter
            label="Status"
            value={filters.status}
            onChange={(v) => setFilters({ ...filters, status: v })}
            options={["", "taken", "missed"]}
          />
          <Filter
            label="From Date"
            type="date"
            value={filters.fromDate}
            onChange={(v) => setFilters({ ...filters, fromDate: v })}
          />
          <Filter
            label="To Date"
            type="date"
            value={filters.toDate}
            onChange={(v) => setFilters({ ...filters, toDate: v })}
          />
        </div>

        {/* Stats */}
        <div className="flex flex-wrap justify-center gap-6 mb-10">
          <StatCard title="Total Medications" value={data.totalMeds} color="from-sky-400 to-sky-600" />
          <StatCard title="Compliance Rate" value={`${data.compliance}%`} color="from-teal-400 to-teal-600" />
          <StatCard title="Tracked Days" value="7 Days" color="from-indigo-400 to-indigo-600" />
        </div>

        {/* Compliance Chart */}
        <div className="mb-10">
          <ComplianceChart medications={data.medications} />
        </div>

        {/* Medication Form */}
        <MedicationForm userId={userId} onSave={handleAddMedication} />

        {/* Medication Table */}
        <MedicationTable medications={data.medications} userId={userId} onUpdated={loadData} onDeleted={handleDeleteMedication} />

        {/* Reports Section */}
        <div className="mt-12">
          <h2 className="text-2xl font-semibold text-sky-700 mb-4">📄 Reports Section</h2>
          <ReportUpload userId={userId} onUploaded={() => setRefreshReports(prev => prev + 1)} />
          <ReportList refreshTrigger={refreshReports} />
        </div>
      </div>
    </div>
  );
}

// Reusable Components
function Filter({ label, value, onChange, options = null, type = "select" }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-sky-700 mb-2">{label}</label>
      {options ? (
        <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full border border-sky-300 px-3 py-2 rounded-xl focus:ring-2 focus:ring-sky-400">
          {options.map(opt => (
            <option key={opt} value={opt}>{opt === "" ? "All" : opt.charAt(0).toUpperCase() + opt.slice(1)}</option>
          ))}
        </select>
      ) : (
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full border border-sky-300 px-3 py-2 rounded-xl focus:ring-2 focus:ring-sky-400" />
      )}
    </div>
  );
}

function StatCard({ title, value, color }) {
  return (
    <div className={`bg-gradient-to-r ${color} text-white rounded-2xl p-6 text-center shadow-lg hover:shadow-xl transition`}>
      <p className="text-3xl font-bold">{value}</p>
      <p className="font-medium text-lg mt-1">{title}</p>
    </div>
  );
}
