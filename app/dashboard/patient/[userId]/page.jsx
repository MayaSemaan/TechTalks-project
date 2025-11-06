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
} from "../../../utils/api.js";
import EditPatientMedicationModal from "../../../components/EditPatientMedicationModal.jsx";

function isMedicationForDate(med, selectedDate) {
  if (!med || !med.startDate) return false;

  const startDate = new Date(med.startDate);
  const endDate = med.endDate ? new Date(med.endDate) : null;

  // normalize (zero time)
  startDate.setHours(0, 0, 0, 0);
  const sDate = new Date(selectedDate);
  sDate.setHours(0, 0, 0, 0);

  // range check
  if (endDate) {
    const e = new Date(endDate);
    e.setHours(0, 0, 0, 0);
    if (sDate > e) return false;
  }
  if (sDate < startDate) return false;

  const schedule = med.schedule || "daily";

  const diffDays = Math.floor((sDate - startDate) / (1000 * 60 * 60 * 24));

  // helpers to read custom interval (accept different shapes)
  const customNumber = med?.customInterval?.number ?? med?.customValue ?? 1;
  let customUnit =
    med?.customInterval?.unit ?? med?.unit ?? med?.customUnit ?? "day"; // try several names

  // normalize unit
  customUnit = ("" + customUnit).toLowerCase();
  if (customUnit.endsWith("s")) customUnit = customUnit.slice(0, -1); // "days" -> "day"

  switch (schedule) {
    case "daily":
      return true;

    case "weekly":
      // occurs on same weekday as startDate
      return startDate.getDay() === sDate.getDay();

    case "monthly": {
      const diffMonths =
        (sDate.getFullYear() - startDate.getFullYear()) * 12 +
        (sDate.getMonth() - startDate.getMonth());

      if (diffMonths < 0) return false; // before start date

      const sameDay =
        startDate.getDate() === sDate.getDate() ||
        (startDate.getDate() > 28 && sDate.getDate() >= 28);

      return diffMonths % 1 === 0 && sameDay; // every month
    }

    case "custom": {
      if (!customNumber || !customUnit) return false;

      if (customUnit === "day") {
        return diffDays % Number(customNumber) === 0;
      }

      if (customUnit === "week") {
        const diffWeeks = Math.floor(diffDays / 7);
        // require same weekday as startDate and match every N weeks
        return (
          diffWeeks % Number(customNumber) === 0 &&
          startDate.getDay() === sDate.getDay()
        );
      }

      if (customUnit === "month") {
        const diffMonths =
          (sDate.getFullYear() - startDate.getFullYear()) * 12 +
          (sDate.getMonth() - startDate.getMonth());
        if (diffMonths < 0) return false;

        const sameDay =
          sDate.getDate() === startDate.getDate() ||
          (startDate.getDate() > 28 && sDate.getDate() >= 28);

        return diffMonths % Number(customNumber) === 0 && sameDay;
      }

      return false;
    }

    default:
      return false;
  }
}

// --- Helper: generate doses for a single target date (used when adding new med)
function generateDosesForDate(times, med, targetDate) {
  if (!Array.isArray(times) || times.length === 0) return [];

  const date = new Date(targetDate);
  date.setHours(0, 0, 0, 0);
  const dayStr = date.toISOString().split("T")[0];

  return times.map((time, idx) => ({
    doseId: `${med._id || med.id || "new"}-${idx}-${dayStr}`,
    date: date.toISOString(),
    time,
    taken: null,
  }));
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

// ---------- Main Component ----------
export default function PatientDashboardPage() {
  const { userId } = useParams();
  const router = useRouter();
  const [token, setToken] = useState(null);
  const [creatingMed, setCreatingMed] = useState(false);
  const [medToDelete, setMedToDelete] = useState(null); // med object pending deletion
  const [deleteSuccessMsg, setDeleteSuccessMsg] = useState(""); // success message

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

      const medsWithConfirm = (res.medications || []).map((m) => {
        const med = { ...m, showDeleteConfirm: false };
        const selectedDate = medFilterDay ? new Date(medFilterDay) : new Date();

        // If API didn't return doses for today, generate them
        const isForToday = isMedicationForDate(med, selectedDate);

        if (isForToday && med.times?.length > 0) {
          // Always regenerate doses for selected day if missing
          const hasDoseForDay = (med.doses || []).some((d) => {
            const dDay = new Date(d.date).toISOString().split("T")[0];
            const sDay = selectedDate.toISOString().split("T")[0];
            return dDay === sDay;
          });

          if (!hasDoseForDay) {
            med.doses = generateDosesForDate(med.times, med, selectedDate);
          }

          med.notForSelectedDay = false;
        } else {
          med.doses = [];
          med.notForSelectedDay = true;
        }

        return med;
      });

      setData({
        user: res.user,
        meds: medsWithConfirm,
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

  // --- Toggle Dose Status ---
  const handleDoseToggle = async (medId, doseId, newStatus, doseDate) => {
    // newStatus should be true / false / null
    try {
      // Optimistic UI update
      setData((prev) => ({
        ...prev,
        meds: prev.meds.map((med) => {
          if (med._id !== medId) return med;
          const updatedDoses = med.filteredDoses.map((d) =>
            d.doseId === doseId ? { ...d, taken: newStatus } : d
          );
          return { ...med, filteredDoses: updatedDoses };
        }),
      }));

      // Call API, pass date of the dose
      const result = await updateDoseStatus(medId, doseId, newStatus, doseDate);

      if (!result.success) throw new Error(result.error || "Failed to update");

      // Update dose from API response to be fully consistent
      setData((prev) => ({
        ...prev,
        meds: prev.meds.map((med) => {
          if (med._id !== medId) return med;
          const updatedDoses = med.filteredDoses.map((d) =>
            d.doseId === result.updatedDose.doseId
              ? { ...d, ...result.updatedDose }
              : d
          );
          return { ...med, filteredDoses: updatedDoses };
        }),
      }));
    } catch (err) {
      console.error(err);
      alert(err.message);
      loadData(); // fallback to refresh if API failed
    }
  };

  // --- Delete Medication ---
  const handleDeleteMedication = async (medId) => {
    const med = data.meds.find((m) => m._id === medId);
    if (!med) return;

    // Open modal instead of using confirm()
    setMedToDelete(med);
  };

  // --- Save Edited Medication ---
  const handleSaveEdit = async (medData) => {
    if (!medData?._id) {
      alert("Medication ID is required");
      return;
    }

    try {
      const res = await fetch(`/api/medications/${medData._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : undefined,
        },
        body: JSON.stringify(medData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update medication");

      // ✅ Instantly update local state and recheck if the med is for selected day
      setData((prev) => {
        const updatedMeds = prev.meds.map((m) => {
          if (m._id !== medData._id) return m;

          const updatedMed = { ...m, ...data.medication };

          const schedule = updatedMed.schedule || "daily";
          const times = updatedMed.times || [];
          const startDate = updatedMed.startDate
            ? new Date(updatedMed.startDate)
            : new Date();
          const customInterval = updatedMed.customInterval || {
            number: 1,
            unit: "day",
          };

          const selectedDay = medFilterDay
            ? new Date(medFilterDay)
            : new Date();
          const selectedDayStr = selectedDay.toISOString().split("T")[0];

          // 🧠 Determine if medication is for the selected day
          const diffTime = selectedDay - startDate;
          if (diffTime < 0) {
            updatedMed.filteredDoses = [];
            updatedMed.notForSelectedDay = true;
            return updatedMed;
          }

          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

          let isForToday = false;

          switch (schedule) {
            case "daily":
              isForToday = true;
              break;
            case "weekly":
              isForToday = startDate.getDay() === selectedDay.getDay();
              break;
            case "monthly":
              isForToday = startDate.getDate() === selectedDay.getDate();
              break;
            case "custom":
              const { number, unit } = customInterval;

              if (unit === "day") {
                isForToday = diffDays % number === 0;
              } else if (unit === "week") {
                const diffWeeks = Math.floor(diffDays / 7);
                isForToday =
                  diffWeeks % number === 0 &&
                  selectedDay.getDay() === startDate.getDay();
              } else if (unit === "month") {
                const diffMonths =
                  (selectedDay.getFullYear() - startDate.getFullYear()) * 12 +
                  (selectedDay.getMonth() - startDate.getMonth());
                isForToday =
                  diffMonths % number === 0 &&
                  selectedDay.getDate() === startDate.getDate();
              }
              break;
          }

          // 🕒 Build or clear doses based on result
          if (isForToday) {
            updatedMed.filteredDoses = times.map((time, idx) => ({
              doseId: `${m._id}-${idx}-${selectedDayStr}`,
              time,
              date: selectedDay.toISOString(),
              taken: null,
            }));
            updatedMed.notForSelectedDay = false;
          } else {
            updatedMed.filteredDoses = [];
            updatedMed.notForSelectedDay = true;
          }

          return updatedMed;
        });

        return { ...prev, meds: updatedMeds };
      });

      console.log(
        "✅ Medication and doses updated successfully with full schedule logic"
      );
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
    const selectedDayStr = (medFilterDay ? new Date(medFilterDay) : new Date())
      .toISOString()
      .split("T")[0];

    return data.meds
      .map((med) => {
        // 1️⃣ Get doses for selected day
        let dosesForDay = [];

        if (med.filteredDoses && med.filteredDoses.length > 0) {
          dosesForDay = med.filteredDoses.filter((d) => {
            const doseDay = new Date(d.date).toISOString().split("T")[0];
            return doseDay === selectedDayStr;
          });
        }

        // 2️⃣ If no doses exist for the day, generate from times
        const selectedDate = new Date(selectedDayStr);

        if (
          isMedicationForDate(med, selectedDate) &&
          (!dosesForDay || dosesForDay.length === 0) &&
          med.times?.length > 0
        ) {
          dosesForDay = med.times.map((time, idx) => ({
            doseId: `${med._id}-${idx}-${selectedDayStr}`,
            time,
            date: selectedDate.toISOString(),
            taken: null,
          }));
        }

        // 3️⃣ Deduplicate doses by doseId
        const uniqueDoses = Array.from(
          new Map(dosesForDay.map((d) => [d.doseId, d])).values()
        );

        // 4️⃣ Apply status filter
        const filteredDoses = uniqueDoses.filter((d) => {
          if (!medStatusFilter) return true;
          if (medStatusFilter === "taken") return d.taken === true;
          if (medStatusFilter === "missed") return d.taken === false;
          if (medStatusFilter === "pending") return d.taken == null;
          return true;
        });

        return {
          ...med,
          filteredDoses,
        };
      })
      .filter((med) =>
        (med.name || "").toLowerCase().includes(medSearch.toLowerCase())
      );
  }, [data.meds, medSearch, medStatusFilter, medFilterDay]);

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
        <div className="fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg z-50">
          {deleteSuccessMsg}
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
                    {med.filteredDoses?.length > 0 ? (
                      med.filteredDoses.map((d) => {
                        const selectedDay = new Date(medFilterDay || new Date())
                          .toISOString()
                          .split("T")[0];
                        const doseDay = new Date(d.date)
                          .toISOString()
                          .split("T")[0];

                        const isSelectedDay = selectedDay === doseDay;

                        let statusText = "Pending";
                        let statusColor = "text-gray-600";

                        if (!isSelectedDay) {
                          statusText = "Not for selected day";
                          statusColor = "text-gray-400";
                        } else if (d.taken === true) {
                          statusText = "Taken";
                          statusColor = "text-blue-600";
                        } else if (d.taken === false) {
                          statusText = "Missed";
                          statusColor = "text-red-600";
                        }

                        return (
                          <div
                            key={d.doseId || d.time}
                            className="flex justify-between items-center text-sm"
                          >
                            <span>
                              {d.time || "-"} –{" "}
                              <span className={`font-semibold ${statusColor}`}>
                                {statusText}
                              </span>
                            </span>

                            {/* Show buttons only if the dose belongs to selected day */}
                            {isSelectedDay && (
                              <div className="flex gap-1">
                                <button
                                  onClick={() =>
                                    handleDoseToggle(
                                      med._id,
                                      d.doseId,
                                      true,
                                      d.date
                                    )
                                  }
                                  className="px-2 py-1 bg-blue-500 text-white rounded text-xs"
                                >
                                  Taken
                                </button>
                                <button
                                  onClick={() =>
                                    handleDoseToggle(
                                      med._id,
                                      d.doseId,
                                      false,
                                      d.date
                                    )
                                  }
                                  className="px-2 py-1 bg-red-500 text-white rounded text-xs"
                                >
                                  Missed
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-gray-500 text-sm">
                        No doses for selected day
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
            token={token} // ✅ pass token
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
                      selectedDate
                    );
                    newMed.notForSelectedDay = false;
                  } else {
                    newMed.filteredDoses = [];
                    newMed.notForSelectedDay = true;
                  }

                  return { ...prev, meds: [...prev.meds, newMed] };
                });

                setCreatingMed(false);
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

        {/* Reports */}
        <section className="bg-white shadow-md rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-blue-900 mb-2">Reports</h2>
          <div className="flex flex-col md:flex-row md:space-x-2 space-y-2 md:space-y-0 mb-2">
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
                      href={`/reports/view/${r._id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="underline text-blue-600"
                    >
                      View
                    </a>
                    <a
                      href={r.fileUrl}
                      download
                      className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 transition"
                    >
                      Download
                    </a>
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
