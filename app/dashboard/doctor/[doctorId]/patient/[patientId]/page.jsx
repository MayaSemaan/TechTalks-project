"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import ChartComponent from "../../../../../components/ChartComponent.jsx";
import MedicationForm from "../../../../../components/MedicationForm";
import { fetchDashboardData } from "../../../../../utils/api.js";

// Dynamic imports for Recharts
const ResponsiveContainer = dynamic(
  () => import("recharts").then((m) => m.ResponsiveContainer),
  { ssr: false }
);
const LineChart = dynamic(() => import("recharts").then((m) => m.LineChart), {
  ssr: false,
});
const Line = dynamic(() => import("recharts").then((m) => m.Line), {
  ssr: false,
});
const XAxis = dynamic(() => import("recharts").then((m) => m.XAxis), {
  ssr: false,
});
const YAxis = dynamic(() => import("recharts").then((m) => m.YAxis), {
  ssr: false,
});
const CartesianGrid = dynamic(
  () => import("recharts").then((m) => m.CartesianGrid),
  { ssr: false }
);
const Tooltip = dynamic(() => import("recharts").then((m) => m.Tooltip), {
  ssr: false,
});
const Legend = dynamic(() => import("recharts").then((m) => m.Legend), {
  ssr: false,
});

export default function DoctorPatientDashboardPage() {
  const { doctorId, patientId } = useParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState({
    user: null,
    medications: [],
    reports: [],
    chartData: [],
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [editingMed, setEditingMed] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [medFilters, setMedFilters] = useState({
    status: "",
    fromDate: "",
    toDate: "",
  });
  const [reportFilters, setReportFilters] = useState({
    fromDate: "",
    toDate: "",
  });

  // ------------------------------
  // Load dashboard data
  // ------------------------------
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchDashboardData(patientId);
      if (!res.success)
        throw new Error(res.error || "Failed to fetch dashboard");

      const medsWithConfirm = (res.medications || []).map((m) => ({
        ...m,
        showDeleteConfirm: false,
      }));

      setData({
        ...res,
        medications: medsWithConfirm,
      });
    } catch (err) {
      setError(err.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [patientId]);

  // ------------------------------
  // Clear filters
  // ------------------------------
  const clearFilters = () => {
    setMedFilters({ status: "", fromDate: "", toDate: "" });
    setReportFilters({ fromDate: "", toDate: "" });
  };

  // ------------------------------
  // Add/Edit Medication
  // ------------------------------
  const handleAddMedication = () => {
    setEditingMed(null);
    setModalOpen(true);
  };

  const handleEditMedication = async (med) => {
    setModalLoading(true);
    try {
      const token =
        typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const res = await fetch(`/api/medications/${med._id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to fetch medication");
      const payload = await res.json();
      setEditingMed(payload.medication);
      setModalOpen(true);
    } catch (err) {
      console.error(err);
      alert(err.message);
    } finally {
      setModalLoading(false);
    }
  };

  const handleSaveFromModal = async (payload) => {
    setSaving(true);
    try {
      const token =
        typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const method = editingMed?._id ? "PUT" : "POST";
      const url = editingMed?._id
        ? `/api/medications/${editingMed._id}`
        : `/api/medications`;

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to save medication");
      const savedMed = await res.json();

      setData((prev) => {
        let updatedMeds = [...prev.medications];
        if (editingMed?._id) {
          updatedMeds = updatedMeds.map((m) =>
            m._id === editingMed._id ? savedMed : m
          );
        } else {
          updatedMeds.push(savedMed);
        }
        return { ...prev, medications: updatedMeds };
      });

      setModalOpen(false);
      setEditingMed(null);
    } catch (err) {
      console.error(err);
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ------------------------------
  // Filtering medications & reports
  // ------------------------------
  const filteredMeds = useMemo(() => {
    return (data.medications || [])
      .map((m) => {
        let doses = m.filteredDoses || [];

        if (medFilters.fromDate)
          doses = doses.filter(
            (d) => new Date(d.date) >= new Date(medFilters.fromDate)
          );
        if (medFilters.toDate)
          doses = doses.filter(
            (d) => new Date(d.date) <= new Date(medFilters.toDate)
          );

        if (medFilters.status === "taken")
          doses = doses.filter((d) => d.taken === true);
        else if (medFilters.status === "missed")
          doses = doses.filter((d) => d.taken === false);

        return { ...m, filteredDoses: doses };
      })
      .filter((m) => m.filteredDoses.length > 0);
  }, [data.medications, medFilters]);

  const filteredReports = useMemo(() => {
    return (data.reports || []).filter((r) => {
      const uploadedAt = new Date(r.uploadedAt);
      if (
        reportFilters.fromDate &&
        uploadedAt < new Date(reportFilters.fromDate)
      )
        return false;
      if (reportFilters.toDate && uploadedAt > new Date(reportFilters.toDate))
        return false;
      return true;
    });
  }, [data.reports, reportFilters]);

  // ------------------------------
  // Adherence & pie chart
  // ------------------------------
  const totalDoses = filteredMeds.flatMap((m) => m.filteredDoses || []);
  const totalTaken = totalDoses.filter((d) => d.taken === true).length;
  const totalMissed = totalDoses.filter((d) => d.taken === false).length;
  const totalPending = totalDoses.filter((d) => d.taken == null).length;

  const pieData = {
    labels: ["Taken", "Missed", "Pending"],
    values: [totalTaken, totalMissed, totalPending],
    colors: ["#3b82f6", "#f97316", "#9ca3af"],
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>;

  return (
    <div className="min-h-screen bg-blue-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <header className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-900">
            {data.user?.name}'s Dashboard
          </h1>
          <button
            onClick={handleAddMedication}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
          >
            Add Medication
          </button>
        </header>

        {/* Filters */}
        <div className="flex flex-wrap justify-between items-center bg-white rounded-xl shadow-md p-4 gap-4">
          {/* Medication Filters */}
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              value={medFilters.status}
              onChange={(e) =>
                setMedFilters({ ...medFilters, status: e.target.value })
              }
              className="border rounded p-2 text-black"
            >
              <option value="">All</option>
              <option value="taken">Taken</option>
              <option value="missed">Missed</option>
            </select>
            <input
              type="date"
              value={medFilters.fromDate}
              onChange={(e) =>
                setMedFilters({ ...medFilters, fromDate: e.target.value })
              }
              className="border rounded p-2 text-black"
            />
            <input
              type="date"
              value={medFilters.toDate}
              onChange={(e) =>
                setMedFilters({ ...medFilters, toDate: e.target.value })
              }
              className="border rounded p-2 text-black"
            />
            <button
              onClick={clearFilters}
              className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300 transition"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Charts */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white shadow-md rounded-xl p-4 md:p-6">
            <h2 className="font-semibold mb-2 text-blue-900">
              Adherence (last 7 days)
            </h2>
            {data.chartData?.length ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="taken" stroke="#3b82f6" />
                  <Line type="monotone" dataKey="missed" stroke="#f97316" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p>No chart data available.</p>
            )}
          </div>
          <div className="bg-white shadow-md rounded-xl p-4 md:p-6">
            <h2 className="font-semibold mb-4 text-blue-900">
              Overall Summary
            </h2>
            <div className="w-full h-64">
              <ChartComponent data={pieData} />
            </div>
          </div>
        </section>

        {/* Medications */}
        <section className="bg-white shadow-md rounded-xl p-4 md:p-6 space-y-4">
          <h2 className="font-semibold text-blue-900 mb-2">Medications</h2>
          {filteredMeds.length === 0 ? (
            <p className="text-gray-600">No medications found.</p>
          ) : (
            <ul className="space-y-4">
              {filteredMeds.map((med) => (
                <li
                  key={med._id}
                  className="border rounded p-4 bg-blue-50 space-y-2"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold">{med.name}</p>
                      <p className="text-sm text-gray-700">
                        {med.dosage} {med.unit} ({med.type})
                      </p>
                    </div>
                    <button
                      onClick={() => handleEditMedication(med)}
                      className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 transition"
                    >
                      Edit
                    </button>
                  </div>
                  <div className="ml-4">
                    <p className="font-semibold text-gray-800">Doses:</p>
                    {!med.filteredDoses?.length ? (
                      <p className="text-gray-500 text-sm">
                        No doses available.
                      </p>
                    ) : (
                      <ul className="ml-2 list-disc text-gray-800 text-sm">
                        {med.filteredDoses
                          ?.slice()
                          .sort(
                            (a, b) =>
                              new Date(a.date + " " + a.time) -
                              new Date(b.date + " " + b.time)
                          )
                          .map((d, idx) => (
                            <li key={d.doseId || idx}>
                              {d.date
                                ? new Date(d.date).toLocaleDateString()
                                : "-"}{" "}
                              {d.time} –{" "}
                              <span
                                className={`font-semibold ${
                                  d.taken === true
                                    ? "text-blue-600"
                                    : d.taken === false
                                    ? "text-red-600"
                                    : "text-gray-600"
                                }`}
                              >
                                {d.taken === true
                                  ? "Taken"
                                  : d.taken === false
                                  ? "Missed"
                                  : "Pending"}
                              </span>
                            </li>
                          ))}
                      </ul>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Reports */}
        <section className="bg-white shadow-md rounded-xl p-4 md:p-6 space-y-4">
          <h2 className="font-semibold text-blue-900 mb-2">Reports</h2>
          {filteredReports.length === 0 ? (
            <p className="text-gray-600">No reports found.</p>
          ) : (
            <div className="grid gap-4">
              {filteredReports.map((r) => (
                <div
                  key={r._id}
                  className="bg-white shadow-md rounded-xl p-4 flex justify-between items-center"
                >
                  <div className="flex flex-col">
                    <p className="font-semibold">{r.title}</p>
                    <p className="text-sm text-gray-500">
                      Uploaded:{" "}
                      {r.uploadedAt
                        ? new Date(r.uploadedAt).toLocaleString()
                        : "N/A"}
                    </p>
                  </div>
                  <div>
                    <a
                      href={`/reports/view/${r._id}?doctorId=${doctorId}&patientId=${patientId}`}
                      className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 transition"
                    >
                      View
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
          <button
            onClick={() =>
              router.push(
                `/reports/upload?doctorId=${doctorId}&patientId=${patientId}`
              )
            }
            className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
          >
            Add Report
          </button>
        </section>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-start overflow-auto z-50 p-4">
          <div className="bg-white w-full max-w-xl rounded-xl p-6 relative mt-16 md:mt-20 shadow-lg sm:mx-2">
            <button
              onClick={() => {
                if (!saving) {
                  setModalOpen(false);
                  setEditingMed(null);
                }
              }}
              className="absolute top-3 right-3 text-gray-600 hover:text-gray-900 text-xl font-bold"
            >
              ×
            </button>
            {modalLoading ? (
              <p>Loading...</p>
            ) : (
              <MedicationForm
                initialData={editingMed}
                onSave={handleSaveFromModal}
                onCancel={() => {
                  if (!saving) {
                    setModalOpen(false);
                    setEditingMed(null);
                  }
                }}
              />
            )}
            {saving && <p className="mt-3 text-sm text-gray-600">Saving...</p>}
          </div>
        </div>
      )}
    </div>
  );
}
