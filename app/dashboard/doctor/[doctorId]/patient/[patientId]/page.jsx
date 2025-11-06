"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import ChartComponent from "../../../../../components/ChartComponent.jsx";
import EditPatientMedicationModal from "../../../../../components/EditPatientMedicationModal";
import {
  fetchDashboardData,
  updateMedication,
  addMedication,
} from "../../../../../utils/api.js";

// --- Helper: merge generated + backend doses and remove duplicates ---
function mergeAndFilterDoses(generated, backend) {
  const combined = [...generated, ...backend];
  const unique = combined.filter(
    (dose, index, self) =>
      index ===
      self.findIndex(
        (d) =>
          d.medId === dose.medId && d.time === dose.time && d.day === dose.day
      )
  );
  unique.sort((a, b) => (a.time > b.time ? 1 : -1));
  return unique;
}

// ---------- Helpers ----------
const parseSafeDate = (d) => {
  if (!d) return null;
  const dateObj = new Date(d);
  return isNaN(dateObj.getTime()) ? null : dateObj;
};

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

// ---------- Normalize Medication ----------
const normalizeMedication = (raw) => {
  const med = raw || {};

  console.log("DEBUG normalizeMedication:", med.name, med.customInterval);

  // --- Normalize schedule ---
  let schedule = (med.schedule || "daily").toLowerCase();

  // --- Parse customInterval safely ---
  let ci = med.customInterval;
  if (typeof ci === "string") {
    try {
      ci = JSON.parse(ci);
    } catch {
      ci = null;
    }
  }
  if (!ci || typeof ci !== "object") ci = { number: null, unit: null };

  const num = Number(ci.number);
  let unit = ci.unit ? ci.unit.toLowerCase() : null;
  if (unit?.endsWith("s")) unit = unit.slice(0, -1); // singular

  // --- Compute frequency string ---
  let frequency = "N/A";
  if (["daily", "weekly", "monthly"].includes(schedule)) {
    frequency = schedule.charAt(0).toUpperCase() + schedule.slice(1);
  } else if (schedule === "custom" && num && unit) {
    frequency = `Every ${num} ${unit}${num > 1 ? "s" : ""}`;
  } else {
    frequency = "Custom";
  }

  // --- Dates ---
  const backendStart = med.startDate ? med.startDate.split("T")[0] : null;
  const backendEnd = med.endDate ? med.endDate.split("T")[0] : null;
  const doseDates = (med.filteredDoses || med.doses || [])
    .map((d) => d.date?.split("T")[0])
    .filter(Boolean);

  const startDate =
    backendStart || (doseDates.length ? doseDates.sort()[0] : null);
  const endDate =
    backendEnd || (doseDates.length ? doseDates.sort().slice(-1)[0] : null);

  return {
    _id: med._id,
    name: med.name || "Unnamed Medication",
    dosage: med.dosage ?? 0,
    unit: med.unit || "mg",
    type: med.type || "tablet",
    schedule,
    customInterval: { number: num, unit },
    frequency,
    times: Array.isArray(med.times) ? med.times : [],
    startDate,
    endDate,
    startDateDisplay: startDate ? formatDateNice(new Date(startDate)) : "N/A",
    endDateDisplay: endDate ? formatDateNice(new Date(endDate)) : "N/A",
    reminders: !!med.reminders,
    notes: med.notes || "",
    filteredDoses: Array.isArray(med.filteredDoses) ? med.filteredDoses : [],
    doses: Array.isArray(med.doses) ? med.doses : [],
    __raw: med,
  };
};

// Generate doses for a given med and a specific day (YYYY-MM-DD string)
const isSameDay = (date1, date2) => {
  if (!date1 || !date2) return false;
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
};

// ✅ Generate doses for a day respecting schedule and times
const generateDosesForDay = (med, day) => {
  const existing = (med.doses || []).filter((d) => isSameDay(d.date, day));
  if (existing.length > 0) return existing;

  if (!med.startDate) return [];
  const start = new Date(med.startDate);
  const d = new Date(day);
  if (d < start) return [];

  switch (med.schedule) {
    case "daily":
      return (med.times || []).map((time, idx) => ({
        doseId: `${day}-${idx}`,
        date: day,
        time,
        taken: null,
      }));
    case "weekly":
      if (d.getDay() !== start.getDay()) return [];
      return (med.times || []).map((time, idx) => ({
        doseId: `${day}-${idx}`,
        date: day,
        time,
        taken: null,
      }));
    case "monthly":
      if (d.getDate() !== start.getDate()) return [];
      return (med.times || []).map((time, idx) => ({
        doseId: `${day}-${idx}`,
        date: day,
        time,
        taken: null,
      }));
    case "custom":
      if (!med.customInterval?.number || !med.customInterval?.unit) return [];
      const num = med.customInterval.number;
      const unit = med.customInterval.unit.toLowerCase();

      let isValid = false;
      if (unit.startsWith("day")) {
        const diffDays = Math.floor((d - start) / (1000 * 60 * 60 * 24));
        isValid = diffDays >= 0 && diffDays % num === 0;
      } else if (unit.startsWith("week")) {
        const diffWeeks = Math.floor((d - start) / (1000 * 60 * 60 * 24 * 7));
        isValid = diffWeeks >= 0 && diffWeeks % num === 0;
      } else if (unit.startsWith("month")) {
        const diffMonths =
          (d.getFullYear() - start.getFullYear()) * 12 +
          (d.getMonth() - start.getMonth());
        isValid = diffMonths >= 0 && diffMonths % num === 0;
      }

      if (!isValid) return [];
      return (med.times || []).map((time, idx) => ({
        doseId: `${day}-${idx}`,
        date: day,
        time,
        taken: null,
      }));
  }
};

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

// ---------- Main Component ----------
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
  const [saving, setSaving] = useState(false);
  const [reportToDelete, setReportToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [medSearch, setMedSearch] = useState("");
  const [medFilterDay, setMedFilterDay] = useState("");
  const [medStatusFilter, setMedStatusFilter] = useState("");
  const [reportSearch, setReportSearch] = useState("");
  const [reportDateFrom, setReportDateFrom] = useState("");
  const [reportDateTo, setReportDateTo] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchDashboardData(patientId);
      if (!res || res.error)
        throw new Error(res?.error || "Failed to fetch dashboard");

      const medsRaw = Array.isArray(res.medications) ? res.medications : [];
      console.log(
        "Raw Medications:",
        medsRaw.map((m) => ({
          name: m.name,
          schedule: m.schedule,
          customInterval: m.customInterval,
        }))
      );

      const meds = medsRaw.map(normalizeMedication);

      setData({
        user: res.user || null,
        medications: meds,
        reports: Array.isArray(res.reports)
          ? res.reports.map((r) => ({
              ...r,
              uploadedAt: r.uploadedAt
                ? new Date(r.uploadedAt).toISOString()
                : null,
            }))
          : [],
        chartData: Array.isArray(res.chartData) ? res.chartData : [],
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

  const handleSaveFromModal = async (medData) => {
    setSaving(true);
    try {
      let res;
      if (editingMed?._id) {
        res = await updateMedication(editingMed._id, medData);
      } else {
        res = await addMedication(patientId, medData);
      }

      if (!res.success)
        throw new Error(res.error || "Failed to save medication");

      await loadData(); // refresh meds & doses
      setEditingMed(null);
      setModalOpen(false);
    } catch (err) {
      console.error(err);
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddMedication = () => {
    setEditingMed(null);
    setModalOpen(true);
  };

  const handleEditMedication = (med) => {
    const medForModal = {
      ...med,
      startDate: med.startDate ? med.startDate.split("T")[0] : "",
      endDate: med.endDate ? med.endDate.split("T")[0] : "",
    };
    setEditingMed(medForModal);
    setModalOpen(true);
  };

  const filteredMeds = useMemo(() => {
    const selectedDay = new Date(
      medFilterDay || new Date().toISOString().split("T")[0]
    );

    const isSameDay = (d1, d2) =>
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate();

    return (data.medications || [])
      .map((med) => {
        const start = new Date(med.startDate);
        const end = med.endDate ? new Date(med.endDate) : null;
        const inRange = selectedDay >= start && (!end || selectedDay <= end);

        // Determine if selected day matches schedule
        let isScheduledDay = false;

        if (inRange) {
          switch (med.schedule) {
            case "daily":
              isScheduledDay = true;
              break;
            case "weekly":
              isScheduledDay = selectedDay.getDay() === start.getDay();
              break;
            case "monthly":
              isScheduledDay = selectedDay.getDate() === start.getDate();
              break;
            case "custom":
              const num = med.customInterval?.number;
              let unit = med.customInterval?.unit;
              if (num && unit) {
                // Normalize unit
                unit = unit.toLowerCase();
                if (unit.endsWith("s")) unit = unit.slice(0, -1);

                const startMid = new Date(
                  start.getFullYear(),
                  start.getMonth(),
                  start.getDate()
                );
                const selectedMid = new Date(
                  selectedDay.getFullYear(),
                  selectedDay.getMonth(),
                  selectedDay.getDate()
                );
                const diffDays = Math.round(
                  (selectedMid - startMid) / (1000 * 60 * 60 * 24)
                );

                if (unit === "day") {
                  isScheduledDay = diffDays >= 0 && diffDays % num === 0;
                } else if (unit === "week") {
                  const diffWeeks = Math.floor(diffDays / 7);
                  isScheduledDay = diffWeeks >= 0 && diffWeeks % num === 0;
                } else if (unit === "month") {
                  const monthsDiff =
                    (selectedDay.getFullYear() - start.getFullYear()) * 12 +
                    (selectedDay.getMonth() - start.getMonth());
                  isScheduledDay = monthsDiff >= 0 && monthsDiff % num === 0;
                }
              }
              break;
          }
        }

        // Existing doses for the day
        const existingDoses = (med.filteredDoses || []).filter((d) =>
          isSameDay(new Date(d.date), selectedDay)
        );

        let allDosesForDay = [];

        if (isScheduledDay) {
          const generatedDoses = (med.times || [])
            .map((time, idx) => {
              if (!existingDoses.some((d) => d.time === time)) {
                return {
                  doseId: `${med._id}-${selectedDay.toISOString()}-${idx}`,
                  date: selectedDay.toISOString(),
                  time,
                  taken: null,
                };
              }
              return null;
            })
            .filter(Boolean);

          allDosesForDay = [...existingDoses, ...generatedDoses].map((d) => ({
            ...d,
            displayStatus:
              d.taken === true
                ? "Taken"
                : d.taken === false
                ? "Missed"
                : "Pending",
          }));
        } else {
          allDosesForDay = [
            {
              doseId: `${med._id}-noschedule`,
              date: selectedDay.toISOString(),
              time: "-",
              displayStatus: "Not for selected day",
            },
          ];
        }

        // Apply status filtering
        const visibleDoses = medStatusFilter
          ? allDosesForDay.filter((d) =>
              medStatusFilter === "taken"
                ? d.displayStatus === "Taken"
                : medStatusFilter === "missed"
                ? d.displayStatus === "Missed"
                : medStatusFilter === "pending"
                ? d.displayStatus === "Pending"
                : true
            )
          : allDosesForDay;

        return {
          ...med,
          filteredDoses: visibleDoses.sort((a, b) =>
            (a.time || "00:00").localeCompare(b.time || "00:00")
          ),
        };
      })
      .filter((m) => m.name.toLowerCase().includes(medSearch.toLowerCase()));
  }, [data.medications, medSearch, medStatusFilter, medFilterDay]);

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
                  <Line type="monotone" dataKey="missed" stroke="#ef4444" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p>No chart data available.</p>
            )}
          </div>

          <div className="bg-white shadow-md rounded-xl p-4 md:p-6">
            <h2 className="font-semibold mb-4 text-blue-900">
              Summary for{" "}
              {medFilterDay ? formatDateNice(medFilterDay) : "today"}
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
                        {med.frequency}
                      </p>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Start Date:</span>{" "}
                        {med.startDateDisplay}
                      </p>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">End Date:</span>{" "}
                        {med.endDateDisplay}
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
                      <p className="text-gray-500 text-sm italic">
                        No doses available.
                      </p>
                    ) : (
                      <ul className="ml-2 list-disc text-gray-800 text-sm">
                        {med.filteredDoses
                          .slice()
                          .sort(
                            (a, b) =>
                              new Date(`${a.date || ""} ${a.time || ""}`) -
                              new Date(`${b.date || ""} ${b.time || ""}`)
                          )
                          .map((d, idx) => {
                            let status =
                              d.taken === true
                                ? "Taken"
                                : d.taken === false
                                ? "Missed"
                                : "Pending";
                            const statusColor =
                              status === "Taken"
                                ? "text-blue-600"
                                : status === "Missed"
                                ? "text-red-600"
                                : "text-gray-600";
                            return (
                              <li key={d.doseId || idx}>
                                {d.time || "-"} –{" "}
                                <span
                                  className={`font-semibold ${statusColor}`}
                                >
                                  {status}
                                </span>{" "}
                                ({formatDateNice(d.date) || "—"})
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
                      {r.uploadedAt ? formatDateNice(r.uploadedAt) : "N/A"}
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
                      className="bg-gray-500 text-white px-3 py-1 rounded hover:bg-gray-600 transition"
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
        <EditPatientMedicationModal
          patientId={patientId}
          medId={editingMed?._id || null}
          token={
            typeof window !== "undefined" ? localStorage.getItem("token") : null
          }
          onClose={() => {
            setModalOpen(false);
            setEditingMed(null);
          }}
          onSave={handleSaveFromModal}
          initialData={editingMed || null}
        />
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
