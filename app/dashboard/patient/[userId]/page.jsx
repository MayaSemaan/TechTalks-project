"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import ChartComponent from "../../../components/ChartComponent.jsx";
import {
  fetchDashboardData,
  updateDoseStatus,
  deleteMedication,
  updateMedication,
  deleteReport,
} from "../../../utils/api.js";
import EditPatientMedicationModal from "../../../components/EditPatientMedicationModal.jsx";

// ---------- Helper: check if two dates are the same day ----------
function isSameDay(d1, d2) {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

// ---------- Helper: check if a med occurs on selected date ----------
function isMedicationForDate(med, selectedDate) {
  if (!med?.startDate) return false;

  const start = new Date(med.startDate);
  const end = med.endDate ? new Date(med.endDate) : null;
  const sDate = new Date(selectedDate);

  // Reset time
  start.setHours(0, 0, 0, 0);
  sDate.setHours(0, 0, 0, 0);
  if (end) end.setHours(0, 0, 0, 0);

  if (sDate < start) return false;
  if (end && sDate > end) return false;

  const schedule = med.schedule || "daily";
  const customNumber = med?.customInterval?.number ?? 1;
  let customUnit = (med?.customInterval?.unit ?? "day").toLowerCase();
  if (customUnit.endsWith("s")) customUnit = customUnit.slice(0, -1);

  const diffDays = Math.floor((sDate - start) / (1000 * 60 * 60 * 24));

  switch (schedule) {
    case "daily":
      return true;

    case "weekly":
      return start.getDay() === sDate.getDay();

    case "monthly":
      return (
        start.getDate() === sDate.getDate() ||
        (start.getDate() > 28 && sDate.getDate() >= 28)
      );

    case "custom":
      if (customUnit === "day") return diffDays % customNumber === 0;
      if (customUnit === "week") {
        const diffWeeks = Math.floor(diffDays / 7);
        return (
          diffWeeks % customNumber === 0 && start.getDay() === sDate.getDay()
        );
      }
      if (customUnit === "month") {
        const diffMonths =
          (sDate.getFullYear() - start.getFullYear()) * 12 +
          (sDate.getMonth() - start.getMonth());
        return (
          diffMonths % customNumber === 0 &&
          (start.getDate() === sDate.getDate() ||
            (start.getDate() > 28 && sDate.getDate() >= 28))
        );
      }
      return false;

    default:
      return false;
  }
}

// ---------- Helper: generate filtered doses for a med on a selected day ----------
function getFilteredDosesForMed(med, selectedDate) {
  if (!med?.times?.length) return [];

  const date = new Date(selectedDate);
  date.setHours(0, 0, 0, 0);
  const dayStr = date.toISOString().split("T")[0];

  return med.times.map((time, idx) => {
    const doseId = `${med._id}-${idx}-${dayStr}`;

    // check backend
    const existingDose = med.doses?.find(
      (d) => d.doseId === doseId && isSameDay(new Date(d.date), date)
    );

    // fallback to previous filteredDoses (if present)
    const prevDose = med.filteredDoses?.find((d) => d.doseId === doseId);

    return {
      doseId,
      date: date.toISOString(),
      time,
      taken: existingDose?.taken ?? prevDose?.taken ?? null,
    };
  });
}

// ---------- Helper: generate doses for selected day ----------
function generateDosesForDate(times, med, selectedDate, existingDoses = []) {
  if (!times?.length) return [];

  const date = new Date(selectedDate);
  date.setHours(0, 0, 0, 0);
  const dayStr = date.toISOString().split("T")[0];

  return times.map((time, idx) => {
    const doseId = `${med._id || med.id || "new"}-${idx}-${dayStr}`;
    const existingDose = existingDoses.find((d) => d.doseId === doseId);

    return {
      doseId,
      date: date.toISOString(),
      time,
      taken: existingDose?.taken ?? null, // preserve existing taken/missed
    };
  });
}

// ---------- Dynamic Imports for Charts ----------
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

// ---------- Helper ----------
export const formatDateNice = (date) => {
  if (!date) return "N/A";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "N/A";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

// ---------- DoseItem Component ----------
function DoseItem({ dose, medId, selectedDate, onToggle }) {
  const selectedDay = new Date(selectedDate);
  const doseDay = new Date(dose.date);

  // Use helper instead of string comparison
  const isForToday = isSameDay(selectedDay, doseDay);

  // Determine status
  let statusText, statusColor;

  if (!isForToday) {
    statusText = "Not for selected day";
    statusColor = "text-gray-400";
  } else if (dose.taken === true) {
    statusText = "Taken";
    statusColor = "text-blue-600";
  } else if (dose.taken === false) {
    statusText = "Missed";
    statusColor = "text-red-600";
  } else {
    statusText = "Pending";
    statusColor = "text-gray-600";
  }

  return (
    <div className="flex justify-between items-center text-sm">
      <span>
        {dose.time || "-"} –{" "}
        <span className={`font-semibold ${statusColor}`}>{statusText}</span>
      </span>

      {isForToday && (
        <div className="flex gap-1">
          <button
            onClick={() => onToggle(medId, dose.doseId, true, dose.date)}
            className="px-2 py-1 bg-blue-500 text-white rounded text-xs"
          >
            Taken
          </button>
          <button
            onClick={() => onToggle(medId, dose.doseId, false, dose.date)}
            className="px-2 py-1 bg-red-500 text-white rounded text-xs"
          >
            Missed
          </button>
        </div>
      )}
    </div>
  );
}

// ---------- Main Component ----------
export default function PatientDashboardPage() {
  const { userId } = useParams();
  const router = useRouter();
  const [token, setToken] = useState(null);
  const [creatingMed, setCreatingMed] = useState(false);
  const [medToDelete, setMedToDelete] = useState(null); // med object pending deletion
  const [deleteSuccessMsg, setDeleteSuccessMsg] = useState(""); // success message
  const [reportToDelete, setReportToDelete] = useState(null); // report object pending deletion
  const [deleteReportSuccessMsg, setDeleteReportSuccessMsg] = useState(""); // success message
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedToken = localStorage.getItem("token");
      setToken(storedToken);
    }
  }, []);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState({
    user: null,
    meds: [],
    reports: [],
    chartData: [],
    metrics: {},
  });
  const [medSearch, setMedSearch] = useState("");
  const [medFilterDay, setMedFilterDay] = useState("");
  const [medStatusFilter, setMedStatusFilter] = useState("");
  const [reportSearch, setReportSearch] = useState("");
  const [reportDateFrom, setReportDateFrom] = useState("");
  const [reportDateTo, setReportDateTo] = useState("");
  const [editingMed, setEditingMed] = useState(null);

  // --- Load Dashboard Data ---
  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetchDashboardData(userId);
      if (!res || res.error)
        throw new Error(res?.error || "Failed to fetch dashboard");

      const selectedDate = medFilterDay ? new Date(medFilterDay) : new Date();
      selectedDate.setHours(0, 0, 0, 0);
      const dayStr = selectedDate.toISOString().split("T")[0];

      const medsWithDoses = (res.medications || []).map((med) => {
        const filteredDoses = getFilteredDosesForMed(med, selectedDate);

        return {
          ...med,
          filteredDoses,
          notForSelectedDay: !isMedicationForDate(med, selectedDate),
        };
      });

      // Merge localStorage doses for **selected date**, not just today
      if (typeof window !== "undefined") {
        const localDosesKey = `doses-${userId}-${dayStr}`;
        const savedDoses = JSON.parse(
          localStorage.getItem(localDosesKey) || "[]"
        );

        medsWithDoses.forEach((med) => {
          med.filteredDoses = med.filteredDoses.map((d) => {
            const local = savedDoses.find((ld) => ld.doseId === d.doseId);
            return local ? { ...d, taken: local.taken } : d;
          });
        });
      }

      setData({
        user: res.user,
        meds: medsWithDoses,
        reports: res.reports || [],
        chartData: res.chartData || [],
        metrics: { adherencePercent: res.metrics?.adherencePercent || 0 },
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [userId]);

  useEffect(() => {
    const handleFocus = () => loadData();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  // ---------- Update filtered doses when selected date changes ----------
  useEffect(() => {
    const selectedDate = medFilterDay ? new Date(medFilterDay) : new Date();
    selectedDate.setHours(0, 0, 0, 0);

    setData((prev) => ({
      ...prev,
      meds: prev.meds.map((med) => {
        const isForDay = isMedicationForDate(med, selectedDate);

        if (!isForDay) {
          return { ...med, filteredDoses: [], notForSelectedDay: true };
        }

        // Merge backend doses for selected day
        const filteredDoses = getFilteredDosesForMed(med, selectedDate);

        return { ...med, filteredDoses, notForSelectedDay: false };
      }),
    }));
  }, [medFilterDay]);

  // --- Toggle Dose Status ---
  const handleDoseToggle = async (medId, doseId, newStatus, doseDate) => {
    const selectedDate = new Date(doseDate);
    selectedDate.setHours(0, 0, 0, 0);
    const dayStr = selectedDate.toISOString().split("T")[0];

    setData((prev) => {
      const updatedMeds = prev.meds.map((med) => {
        if (med._id !== medId) return med;

        const updatedFilteredDoses = med.filteredDoses.map((d) =>
          d.doseId === doseId ? { ...d, taken: newStatus } : d
        );

        const updatedBackendDoses = [...(med.doses || [])];
        const existingIndex = updatedBackendDoses.findIndex(
          (d) =>
            d.doseId === doseId && isSameDay(new Date(d.date), selectedDate)
        );

        if (existingIndex !== -1) {
          updatedBackendDoses[existingIndex].taken = newStatus;
        } else {
          updatedBackendDoses.push({
            doseId,
            date: selectedDate.toISOString(),
            time:
              med.times.find((_, i) => `${med._id}-${i}-${dayStr}` === doseId)
                ?.time || "",
            taken: newStatus,
          });
        }

        return {
          ...med,
          filteredDoses: updatedFilteredDoses,
          doses: updatedBackendDoses,
        };
      });

      // Save doses for **any selected date** to localStorage
      if (typeof window !== "undefined") {
        const localDosesKey = `doses-${userId}-${dayStr}`;
        const dosesForDay = updatedMeds
          .flatMap((m) => m.filteredDoses || [])
          .filter((d) => isSameDay(new Date(d.date), selectedDate));
        localStorage.setItem(localDosesKey, JSON.stringify(dosesForDay));
      }

      return { ...prev, meds: updatedMeds };
    });

    try {
      await updateDoseStatus(medId, doseId, newStatus, doseDate);
    } catch (err) {
      console.error("Error updating dose:", err);
      loadData(); // rollback if API fails
    }
  };

  // --- Delete Medication ---
  const handleDeleteMedication = async (medId) => {
    const med = data.meds.find((m) => m._id === medId);
    if (!med) return;

    // Open modal instead of using confirm()
    setMedToDelete(med);
  };

  const handleDeleteReport = (report) => {
    setReportToDelete(report);
  };

  const confirmDeleteReport = async () => {
    if (!reportToDelete) return;

    try {
      // Call API to delete the report (you need a deleteReport function in utils/api.js)
      const result = await deleteReport(reportToDelete._id);

      if (result.success) {
        setData((prev) => ({
          ...prev,
          reports: prev.reports.filter((r) => r._id !== reportToDelete._id),
        }));
        setDeleteReportSuccessMsg("Report deleted successfully!");
      } else {
        setDeleteReportSuccessMsg(result.error || "Failed to delete report");
      }
    } catch (err) {
      console.error(err);
      setDeleteReportSuccessMsg("Error deleting report");
    } finally {
      setReportToDelete(null); // close modal
    }

    // Hide success message after 3 seconds
    setTimeout(() => setDeleteReportSuccessMsg(""), 3000);
  };

  const cancelDeleteReport = () => setReportToDelete(null);

  // --- Save Edited Medication ---
  const handleSaveEdit = async (medData) => {
    if (!medData?._id) return alert("Medication ID is required");

    try {
      const res = await fetch(`/api/medications/${medData._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : undefined,
        },
        body: JSON.stringify(medData),
      });

      const dataRes = await res.json();
      if (!res.ok)
        throw new Error(dataRes.error || "Failed to update medication");

      // Update local state
      setData((prev) => {
        const updatedMeds = prev.meds.map((m) => {
          if (m._id !== medData._id) return m;

          const updatedMed = { ...m, ...dataRes.medication };
          const selectedDay = medFilterDay
            ? new Date(medFilterDay)
            : new Date();
          selectedDay.setHours(0, 0, 0, 0);

          const isForToday = isMedicationForDate(updatedMed, selectedDay);

          if (isForToday && updatedMed.times?.length > 0) {
            // preserve existing statuses
            updatedMed.filteredDoses = generateDosesForDate(
              updatedMed.times,
              updatedMed,
              selectedDay,
              m.filteredDoses // pass previous filteredDoses
            );
            updatedMed.notForSelectedDay = false;
          } else {
            updatedMed.filteredDoses = [];
            updatedMed.notForSelectedDay = true;
          }

          return updatedMed;
        });

        return { ...prev, meds: updatedMeds };
      });

      setSuccessMessage("Medication updated successfully!");
      setEditingMed(null);
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      console.error("Update med error:", err);
      alert(err.message);
    }
  };

  // --- Confirm / Cancel Delete ---
  const confirmDelete = async () => {
    if (!medToDelete) return;

    try {
      const result = await deleteMedication(medToDelete._id);

      if (result.success) {
        setData((prev) => ({
          ...prev,
          meds: prev.meds.filter((m) => m._id !== medToDelete._id),
        }));
        setDeleteSuccessMsg("Medication deleted successfully!");
      } else {
        setDeleteSuccessMsg(result.error || "Failed to delete medication");
      }
    } catch (err) {
      console.error(err);
      setDeleteSuccessMsg("Error deleting medication");
    } finally {
      setMedToDelete(null); // close modal
    }

    // Hide success message after 3 seconds
    setTimeout(() => setDeleteSuccessMsg(""), 3000);
  };

  const cancelDelete = () => {
    setMedToDelete(null);
  };

  // --- Filtered Medications ---
  const filteredMeds = useMemo(() => {
    return data.meds.filter((med) =>
      (med.name || "").toLowerCase().includes(medSearch.toLowerCase())
    );
  }, [data.meds, medSearch]);

  // --- Filtered Reports ---
  const filteredReports = useMemo(() => {
    return data.reports.filter((r) => {
      const titleMatch = r.title
        ?.toLowerCase()
        .includes(reportSearch.toLowerCase());
      const from = reportDateFrom ? new Date(reportDateFrom) : null;
      const to = reportDateTo ? new Date(reportDateTo) : null;
      const date = r.uploadedAt ? new Date(r.uploadedAt) : null;
      const dateMatch =
        (!from || (date && date >= from)) && (!to || (date && date <= to));
      return titleMatch && dateMatch;
    });
  }, [data.reports, reportSearch, reportDateFrom, reportDateTo]);

  const totalDoses = filteredMeds.flatMap((m) => m.filteredDoses || []);
  const totalTaken = totalDoses.filter((d) => d.taken === true).length;
  const totalMissed = totalDoses.filter((d) => d.taken === false).length;
  const totalPending = totalDoses.filter((d) => d.taken == null).length;
  const pieData = {
    labels: ["Taken", "Missed", "Pending"],
    values: [totalTaken, totalMissed, totalPending],
    colors: ["#3b82f6", "#ef4444", "#9ca3af"],
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-blue-100 to-blue-200 p-8">
      {/* Success Message Toast */}
      {deleteSuccessMsg && (
        <div className="fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded shadow-lg z-50">
          {deleteSuccessMsg}
        </div>
      )}

      {deleteReportSuccessMsg && (
        <div className="fixed top-16 right-4 bg-blue-500 text-white px-4 py-2 rounded shadow-lg z-50">
          {deleteReportSuccessMsg}
        </div>
      )}

      {successMessage && (
        <div className="fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded shadow-lg z-50">
          {successMessage}
        </div>
      )}

      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <header className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-900">
            {data.user?.name || "Patient"}'s Dashboard
          </h1>
        </header>

        {/* Charts */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white shadow-md rounded-xl p-6">
            <h2 className="font-semibold mb-2 text-blue-900">
              Adherence (last 7 days)
            </h2>
            {data.chartData.length ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="taken" stroke="#3b82f6" />
                  <Line type="monotone" dataKey="missed" stroke="#ef4444" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p>No chart data available.</p>
            )}
          </div>

          <div className="bg-white shadow-md rounded-xl p-6">
            <h2 className="font-semibold mb-4 text-blue-900">Summary</h2>
            <div className="w-full h-64">
              {totalDoses.length === 0 ? (
                <p className="text-gray-600 text-center mt-24">
                  No doses recorded.
                </p>
              ) : (
                <ChartComponent data={pieData} />
              )}
            </div>
          </div>
        </section>

        {/* Medications */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-blue-900">Medications</h2>

          {/* Filters */}
          <div className="flex flex-col md:flex-row md:space-x-2 space-y-2 md:space-y-0 mb-4">
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

            {/* Add Medication Button */}

            <button
              onClick={() => setCreatingMed(true)}
              className="bg-blue-500 text-white px-3 py-0.5 rounded hover:bg-blue-600 text-sm"
            >
              + Add Medication
            </button>
          </div>

          {/* Medication Cards */}
          {filteredMeds.length === 0 ? (
            <p className="text-gray-600">No medications found.</p>
          ) : (
            <div className="flex flex-col space-y-4">
              {filteredMeds.map((med) => (
                <div
                  key={med._id}
                  className="bg-white shadow-lg rounded-xl p-4 flex flex-col justify-between hover:shadow-2xl transition"
                >
                  {/* Medication Header */}
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-bold text-lg text-blue-900">
                        {med.name}
                      </p>
                      <p className="text-gray-600 text-sm">
                        {med.dosage} {med.unit} ({med.type})
                      </p>

                      <p className="text-gray-500 text-xs">
                        Start: {formatDateNice(med.startDate)} | End:{" "}
                        {formatDateNice(med.endDate)}
                      </p>

                      {/* NEW: Schedule / Frequency */}
                      <p className="text-gray-500 text-xs">
                        Schedule:{" "}
                        {med.schedule === "custom" && med.customInterval
                          ? `Every ${med.customInterval.number} ${
                              med.customInterval.unit
                            }${med.customInterval.number > 1 ? "s" : ""}`
                          : med.schedule}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setEditingMed(med)}
                        className="bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 text-xs"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() => handleDeleteMedication(med._id)}
                        className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 text-xs"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {/* Doses */}
                  <div className="space-y-1">
                    {med.filteredDoses.length > 0 ? (
                      med.filteredDoses.map((d) => (
                        <DoseItem
                          key={d.doseId}
                          dose={d}
                          medId={med._id}
                          selectedDate={medFilterDay || new Date()}
                          onToggle={handleDoseToggle}
                        />
                      ))
                    ) : (
                      <p className="text-gray-500 text-sm">
                        {med.notForSelectedDay
                          ? "No doses for selected day"
                          : "No doses recorded"}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Edit Medication Modal */}
        {editingMed && (
          <EditPatientMedicationModal
            medId={editingMed._id}
            initialData={editingMed}
            token={token} // pass token
            onClose={() => setEditingMed(null)}
            onSave={handleSaveEdit}
          />
        )}

        {/* Create Medication Modal */}
        {creatingMed && (
          <EditPatientMedicationModal
            token={token}
            initialData={null} // null means creating new med
            onClose={() => setCreatingMed(false)}
            onSave={async (newMedData) => {
              try {
                const res = await fetch(`/api/medications`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: token ? `Bearer ${token}` : undefined,
                  },
                  body: JSON.stringify(newMedData),
                });

                const data = await res.json();
                if (!res.ok)
                  throw new Error(data.error || "Failed to create medication");

                // Add the new med to state, and generate doses for selected day if appropriate
                setData((prev) => {
                  const newMed = {
                    ...data.medication,
                    showDeleteConfirm: false,
                  };

                  // choose selected date (filter or today)
                  const selectedDate = medFilterDay
                    ? new Date(medFilterDay)
                    : new Date();

                  const isForToday = isMedicationForDate(newMed, selectedDate);

                  if (isForToday && newMed.times?.length > 0) {
                    newMed.filteredDoses = generateDosesForDate(
                      newMed.times,
                      newMed,
                      selectedDate,
                      newMed.doses // existing backend doses
                    );

                    newMed.notForSelectedDay = false;
                  } else {
                    newMed.filteredDoses = [];
                    newMed.notForSelectedDay = true;
                  }

                  return { ...prev, meds: [...prev.meds, newMed] };
                });

                setSuccessMessage("Medication added successfully!");

                setCreatingMed(false);
                setTimeout(() => setSuccessMessage(""), 3000);
              } catch (err) {
                console.error(err);
                alert(err.message);
              }
            }}
          />
        )}

        {/* Delete Confirmation Modal */}
        {medToDelete && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div className="bg-white rounded-xl p-6 w-96 shadow-lg">
              <h3 className="text-lg font-bold mb-4">Delete Medication</h3>
              <p className="mb-4">
                Are you sure you want to delete{" "}
                <span className="font-semibold">{medToDelete.name}</span>?
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={cancelDelete}
                  className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Delete Report Confirmation Modal */}
        {reportToDelete && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div className="bg-white rounded-xl p-6 w-96 shadow-lg">
              <h3 className="text-lg font-bold mb-4">Delete Report</h3>
              <p className="mb-4">
                Are you sure you want to delete{" "}
                <span className="font-semibold">{reportToDelete.title}</span>?
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={cancelDeleteReport}
                  className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteReport}
                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reports Section */}
        <section className="bg-white shadow-md rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-blue-900 mb-2">Reports</h2>

          {/* Filters */}
          <div className="flex flex-wrap gap-2 mb-4">
            <input
              type="text"
              placeholder="Search Reports..."
              value={reportSearch}
              onChange={(e) => setReportSearch(e.target.value)}
              className="flex-1 min-w-[150px] border border-gray-300 rounded px-3 py-1"
            />
            <input
              type="date"
              value={reportDateFrom}
              onChange={(e) => setReportDateFrom(e.target.value)}
              className="flex-1 min-w-[120px] border border-gray-300 rounded px-3 py-1"
            />
            <input
              type="date"
              value={reportDateTo}
              onChange={(e) => setReportDateTo(e.target.value)}
              className="flex-1 min-w-[120px] border border-gray-300 rounded px-3 py-1"
            />
          </div>

          {filteredReports.length === 0 ? (
            <p className="text-gray-600">No reports found.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredReports.map((r) => (
                <div
                  key={r._id}
                  className="bg-white shadow-md rounded-xl p-4 flex flex-col justify-between"
                >
                  <div className="flex flex-col mb-4">
                    <p className="font-semibold text-gray-800 truncate">
                      {r.title}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Uploaded:{" "}
                      {r.uploadedAt
                        ? new Date(r.uploadedAt).toLocaleString()
                        : "N/A"}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-auto">
                    <a
                      href={`/reports/view/${r._id}?patientId=${data.user._id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="underline text-blue-600"
                    >
                      View
                    </a>

                    <a
                      href={r.fileUrl}
                      download
                      className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 transition text-sm"
                    >
                      Download
                    </a>

                    <button
                      onClick={() => handleDeleteReport(r)}
                      className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
