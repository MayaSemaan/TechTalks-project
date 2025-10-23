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

// Safe date formatter
const formatDate = (date) => {
  if (!date || date === "null" || date === "undefined") return "N/A";
  let d;
  if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [y, m, day] = date.split("-");
    d = new Date(Number(y), Number(m) - 1, Number(day));
  } else {
    d = new Date(date);
  }
  if (!(d instanceof Date) || isNaN(d.getTime())) return "N/A";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

// Normalize medication object

// Normalize medication object
// Normalize medication object and ensure frequency is correct
const normalizeMedication = (raw) => {
  const med = raw || {};
  const schedule = med.schedule || "daily";
  const ci = med.customInterval || null;

  let frequency = "";
  if (schedule === "custom" && ci?.number && ci?.unit) {
    const n = Number(ci.number) || 1;
    const unit = ci.unit || "day";
    frequency = `Every ${n} ${unit}${n > 1 ? "s" : ""}`;
  } else {
    frequency = schedule.charAt(0).toUpperCase() + schedule.slice(1); // daily/weekly/monthly
  }

  return {
    _id: med._id,
    name: med.name || "Unnamed Medication",
    dosage: med.dosage ?? 0,
    unit: med.unit || "mg",
    type: med.type || "tablet",
    schedule,
    customInterval: ci,
    frequency,
    times: Array.isArray(med.times) ? med.times : [],
    startDate: med.startDate || "",
    endDate: med.endDate || "",
    reminders: !!med.reminders,
    notes: med.notes || "",
    filteredDoses: Array.isArray(med.filteredDoses) ? med.filteredDoses : [],
    __raw: med,
  };
};

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

  const [reportToDelete, setReportToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [medSearch, setMedSearch] = useState("");
  const [medFilterDay, setMedFilterDay] = useState("");
  const [medStatusFilter, setMedStatusFilter] = useState("");
  const [reportSearch, setReportSearch] = useState("");
  const [reportDateFrom, setReportDateFrom] = useState("");
  const [reportDateTo, setReportDateTo] = useState("");

  // Load dashboard data
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchDashboardData(patientId);
      if (!res.success && !Array.isArray(res) && typeof res !== "object")
        throw new Error(res.error || "Failed to fetch dashboard");

      const medsRaw = Array.isArray(res)
        ? res
        : Array.isArray(res.medications)
        ? res.medications
        : [];
      const meds = medsRaw.map(normalizeMedication);

      setData((prev) => ({
        ...prev,
        ...(res.user ? { user: res.user } : {}),
        medications: meds,
        reports: Array.isArray(res.reports) ? res.reports : prev.reports,
        chartData: Array.isArray(res.chartData)
          ? res.chartData
          : prev.chartData,
      }));
    } catch (err) {
      setError(err.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [patientId]);

  // Save medication from modal
  const handleSaveFromModal = async (payload) => {
    setSaving(true);
    try {
      const token =
        typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const url = editingMed?._id
        ? `/api/doctor/patient/${patientId}/medications/${editingMed._id}`
        : `/api/doctor/patient/${patientId}/medications`;
      const method = editingMed?._id ? "PUT" : "POST";

      // Ensure payload.customInterval.number is a Number and compute frequency so the local state is consistent
      if (payload.customInterval) {
        payload.customInterval.number =
          Number(payload.customInterval.number) || 1;
        payload.customInterval.unit = payload.customInterval.unit || "day";
      }

      payload.frequency =
        payload.schedule === "custom" && payload.customInterval
          ? `Every ${payload.customInterval.number} ${
              payload.customInterval.unit
            }${payload.customInterval.number > 1 ? "s" : ""}`
          : payload.schedule || "daily";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to save medication");
      }

      const saved = await res.json();
      // backend returns { medication: {...} } for both POST and PUT
      const medRaw = saved?.medication ?? saved ?? null;
      if (!medRaw) throw new Error("Invalid server response");

      const medWithInterval = normalizeMedication(medRaw);

      setData((prev) => {
        const updatedMeds = editingMed
          ? prev.medications.map((m) =>
              m._id === medWithInterval._id ? medWithInterval : m
            )
          : [medWithInterval, ...prev.medications];
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

  // Open modal for adding med
  const handleAddMedication = () => {
    setEditingMed(null);
    setModalOpen(true);
  };

  // Open modal for editing med
  const handleEditMedication = async (med) => {
    setModalLoading(true);
    try {
      const token =
        typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const res = await fetch(
        `/api/doctor/patient/${patientId}/medications/${med._id}`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      if (!res.ok) throw new Error("Failed to fetch medication");
      const payload = await res.json();
      const medRaw = payload?.medication ?? payload ?? null;
      if (!medRaw)
        throw new Error("Invalid server response when fetching medication");
      setEditingMed(normalizeMedication(medRaw));
      setModalOpen(true);
    } catch (err) {
      console.error(err);
      alert(err.message);
    } finally {
      setModalLoading(false);
    }
  };

  // Filtered medications
  const filteredMeds = useMemo(() => {
    return (data.medications || [])
      .map((m) => {
        let doses = m.filteredDoses || [];
        if (medStatusFilter) {
          doses = doses.filter((d) =>
            medStatusFilter === "taken"
              ? d.taken === true
              : medStatusFilter === "missed"
              ? d.taken === false
              : d.taken == null
          );
        }
        if (medFilterDay) {
          const filterDate = new Date(medFilterDay);
          filterDate.setHours(0, 0, 0, 0);
          doses = doses.filter((d) => {
            const doseDate = d.date ? new Date(d.date) : null;
            if (!doseDate) return false;
            doseDate.setHours(0, 0, 0, 0);
            return doseDate.getTime() === filterDate.getTime();
          });
        }
        return { ...m, filteredDoses: doses };
      })
      .filter((m) => m.name.toLowerCase().includes(medSearch.toLowerCase()));
  }, [data.medications, medSearch, medStatusFilter, medFilterDay]);

  // Reports filtered
  const filteredReports = useMemo(() => {
    return (data.reports || []).filter((r) => {
      const titleMatch = (r.title || "")
        .toLowerCase()
        .includes(reportSearch.toLowerCase());
      const from = reportDateFrom ? new Date(reportDateFrom) : null;
      const to = reportDateTo ? new Date(reportDateTo) : null;
      const dateMatch =
        (!from && !to) ||
        (!r.uploadedAt
          ? false
          : (from ? new Date(r.uploadedAt) >= from : true) &&
            (to ? new Date(r.uploadedAt) <= to : true));
      return titleMatch && dateMatch;
    });
  }, [data.reports, reportSearch, reportDateFrom, reportDateTo]);

  const selectedDate = medFilterDay ? new Date(medFilterDay) : new Date();
  selectedDate.setHours(0, 0, 0, 0);

  const totalDoses = filteredMeds
    .flatMap((m) => m.filteredDoses || [])
    .filter((d) => {
      const doseDate = d.date ? new Date(d.date) : null;
      if (!doseDate) return false;
      doseDate.setHours(0, 0, 0, 0);
      return doseDate.getTime() === selectedDate.getTime();
    });

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
            {data.user?.name || "Patient"}'s Dashboard
          </h1>
          <button
            onClick={handleAddMedication}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
          >
            Add Medication
          </button>
        </header>

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
              Summary for {medFilterDay || "today"}
            </h2>
            <div className="w-full h-64">
              {totalDoses.length === 0 ? (
                <p className="text-gray-600 text-center mt-24">
                  No doses recorded for this day.
                </p>
              ) : (
                <ChartComponent data={pieData} />
              )}
            </div>
          </div>
        </section>

        {/* Medications */}
        <section className="bg-white shadow-md rounded-xl p-4 md:p-6 space-y-4">
          <h2 className="font-semibold text-blue-900 mb-2">Medications</h2>

          {/* Filters */}
          <div className="flex flex-col md:flex-row md:items-center md:space-x-2 space-y-2 md:space-y-0 mb-2">
            <input
              type="text"
              placeholder="Search medications..."
              value={medSearch}
              onChange={(e) => setMedSearch(e.target.value)}
              className="w-full md:w-1/3 border border-gray-300 rounded px-3 py-1"
            />
            <input
              type="date"
              value={medFilterDay}
              onChange={(e) => setMedFilterDay(e.target.value)}
              className="w-full md:w-1/4 border border-gray-300 rounded px-3 py-1"
            />
            <select
              value={medStatusFilter}
              onChange={(e) => setMedStatusFilter(e.target.value)}
              className="w-full md:w-1/4 border border-gray-300 rounded px-3 py-1"
            >
              <option value="">All Statuses</option>
              <option value="taken">Taken</option>
              <option value="missed">Missed</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          {filteredMeds.length === 0 ? (
            <p className="text-gray-600">No medications found.</p>
          ) : (
            <ul className="space-y-4">
              {filteredMeds.map((med, medIdx) => (
                <li
                  key={med._id || medIdx}
                  className="border rounded p-4 bg-blue-50 space-y-2"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-lg">{med.name}</p>
                      <p className="text-sm text-gray-700">
                        {med.dosage} {med.unit} ({med.type})
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        <span className="font-medium">Frequency:</span>{" "}
                        {med.frequency || "N/A"}
                      </p>

                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Start Date:</span>{" "}
                        {formatDate(med.startDate)}
                      </p>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">End Date:</span>{" "}
                        {formatDate(med.endDate)}
                      </p>
                    </div>
                    <button
                      onClick={() => handleEditMedication(med)}
                      className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 transition"
                    >
                      Edit
                    </button>
                  </div>

                  {/* Doses section */}
                  <div className="ml-4">
                    <p className="font-semibold text-gray-800">Doses:</p>
                    {!med.filteredDoses?.length ? (
                      <p className="text-gray-500 text-sm italic">
                        No doses available.
                      </p>
                    ) : (
                      <ul className="ml-2 list-disc text-gray-800 text-sm">
                        {med.filteredDoses
                          ?.slice()
                          .sort(
                            (a, b) =>
                              new Date(`${a.date || ""} ${a.time || ""}`) -
                              new Date(`${b.date || ""} ${b.time || ""}`)
                          )
                          .map((d, idx) => {
                            const doseDate = d.date ? new Date(d.date) : null;
                            const doseDay = doseDate
                              ? new Date(doseDate)
                              : null;
                            if (doseDay) doseDay.setHours(0, 0, 0, 0);

                            let status;
                            if (
                              doseDay &&
                              doseDay.getTime() === selectedDate.getTime()
                            ) {
                              status =
                                d.taken === true
                                  ? "Taken"
                                  : d.taken === false
                                  ? "Missed"
                                  : "Pending";
                            } else {
                              status = "Not for selected day";
                            }

                            const statusColor =
                              status === "Taken"
                                ? "text-blue-600"
                                : status === "Missed"
                                ? "text-red-600"
                                : status === "Pending"
                                ? "text-gray-600"
                                : "text-gray-400";

                            return (
                              <li key={d.doseId || idx}>
                                {d.time || "-"} –{" "}
                                <span
                                  className={`font-semibold ${statusColor}`}
                                >
                                  {status}
                                </span>
                              </li>
                            );
                          })}
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

          {/* Filters */}
          <div className="flex flex-col md:flex-row md:items-center md:space-x-2 space-y-2 md:space-y-0 mb-2">
            <input
              type="text"
              placeholder="Search Reports..."
              value={reportSearch}
              onChange={(e) => setReportSearch(e.target.value)}
              className="w-full md:w-1/3 border border-gray-300 rounded px-3 py-1"
            />
            <input
              type="date"
              value={reportDateFrom}
              onChange={(e) => setReportDateFrom(e.target.value)}
              className="w-full md:w-1/4 border border-gray-300 rounded px-3 py-1"
            />
            <input
              type="date"
              value={reportDateTo}
              onChange={(e) => setReportDateTo(e.target.value)}
              className="w-full md:w-1/4 border border-gray-300 rounded px-3 py-1"
            />
          </div>

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
                  <div className="flex gap-2">
                    <a
                      href={`/reports/view/${
                        r._id
                      }?doctorId=${doctorId}&patientId=${patientId}&t=${new Date().getTime()}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 transition"
                    >
                      View
                    </a>
                    <button
                      onClick={() =>
                        router.push(
                          `/reports/edit/${
                            r._id
                          }?doctorId=${doctorId}&patientId=${patientId}&t=${new Date().getTime()}`
                        )
                      }
                      className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600 transition"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setReportToDelete(r)}
                      className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() =>
              router.push(
                `/reports/upload?doctorId=${doctorId}&patientId=${patientId}&t=${new Date().getTime()}`
              )
            }
            className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
          >
            Add Report
          </button>
        </section>
      </div>

      {/* Medication Modal */}
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

      {/* Delete Report Modal */}
      {reportToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-xl p-6 shadow-lg relative">
            <button
              onClick={() => !deleting && setReportToDelete(null)}
              className="absolute top-3 right-3 text-gray-600 hover:text-gray-900 text-xl font-bold"
            >
              ×
            </button>
            <h2 className="text-lg font-semibold mb-4">Confirm Delete</h2>
            <p className="mb-4">
              Are you sure you want to delete the report "{reportToDelete.title}
              "?
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setReportToDelete(null)}
                disabled={deleting}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setDeleting(true);
                  try {
                    const token =
                      typeof window !== "undefined"
                        ? localStorage.getItem("token")
                        : null;
                    const res = await fetch(
                      `/api/reports/${reportToDelete._id}`,
                      {
                        method: "DELETE",
                        headers: token
                          ? { Authorization: `Bearer ${token}` }
                          : {},
                      }
                    );
                    if (!res.ok) throw new Error("Failed to delete report");
                    setData((prev) => ({
                      ...prev,
                      reports: prev.reports.filter(
                        (r) => r._id !== reportToDelete._id
                      ),
                    }));
                    setReportToDelete(null);
                  } catch (err) {
                    console.error(err);
                    alert(err.message);
                  } finally {
                    setDeleting(false);
                  }
                }}
                disabled={deleting}
                className="bg-red-500 text-white px-3 py-2 rounded hover:bg-red-600 transition"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
