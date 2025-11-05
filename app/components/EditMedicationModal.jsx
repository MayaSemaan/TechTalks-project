"use client";

import { useState, useEffect } from "react";

// Format frequency display
const formatFrequency = ({ schedule, customInterval }) => {
  if (schedule === "daily") return "every day";
  if (schedule === "weekly") return "every week";
  if (schedule === "monthly") return "every month";
  if (schedule === "custom" && customInterval?.number && customInterval?.unit) {
    return `every ${customInterval.number} ${customInterval.unit}${
      customInterval.number > 1 ? "s" : ""
    }`;
  }
  return "";
};

export default function EditMedicationModal({
  patientId,
  medId,
  token,
  onClose,
  onSave,
  initialData,
}) {
  const [med, setMed] = useState({
    name: "",
    dosage: 0,
    unit: "mg",
    type: "tablet",
    schedule: "daily",
    customInterval: { number: 1, unit: "day" },
    startDate: "",
    endDate: "",
    times: [],
    notes: "",
    frequency: "every day",
  });
  const [loading, setLoading] = useState(!!medId);
  const [error, setError] = useState("");

  const formatDateString = (dateStr) =>
    dateStr ? new Date(dateStr).toISOString().split("T")[0] : "";

  // ---------------- Fetch medication ----------------
  useEffect(() => {
    if (!medId) return;

    const fetchMed = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/doctor/patient/${patientId}/medications/${medId}`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: token ? `Bearer ${token}` : "",
            },
          }
        );
        const data = await res.json();
        if (!res.ok)
          throw new Error(data.error || "Failed to fetch medication");

        const fetched = {
          name: data.medication.name || "",
          dosage: data.medication.dosage || 0,
          unit: data.medication.unit || "mg",
          type: data.medication.type || "tablet",
          schedule: data.medication.schedule || "daily",
          customInterval: data.medication.customInterval || {
            number: 1,
            unit: "day",
          },
          startDate: formatDateString(data.medication.startDate),
          endDate: formatDateString(data.medication.endDate),
          times: Array.isArray(data.medication.times)
            ? data.medication.times
            : [],
          notes: data.medication.notes || "",
        };
        fetched.frequency = formatFrequency({
          schedule: fetched.schedule,
          customInterval: fetched.customInterval,
        });
        setMed(fetched);
      } catch (err) {
        console.error("Fetch med error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchMed();
  }, [patientId, medId, token]);

  // ---------------- Apply initialData ----------------
  useEffect(() => {
    if (!initialData) return;
    const initMed = {
      ...initialData,
      startDate: formatDateString(initialData.startDate),
      endDate: formatDateString(initialData.endDate),
      customInterval: initialData.customInterval || { number: 1, unit: "day" },
    };
    initMed.frequency = formatFrequency({
      schedule: initMed.schedule,
      customInterval: initMed.customInterval,
    });
    setMed(initMed);
  }, [initialData]);

  // ---------------- handleChange ----------------
  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "schedule") {
      const customInterval =
        value === "custom"
          ? med.customInterval || { number: 1, unit: "day" }
          : null; // <- set null instead of { number: null, unit: null }
      setMed((prev) => ({
        ...prev,
        schedule: value,
        customInterval,
        frequency: formatFrequency({ schedule: value, customInterval }),
      }));
    } else {
      setMed((prev) => ({ ...prev, [name]: value }));
    }
  };

  // ---------------- handleCustomIntervalChange ----------------
  const handleCustomIntervalChange = (field, val) => {
    setMed((prev) => {
      const newCI = {
        ...prev.customInterval,
        [field]: field === "number" ? Number(val) || 1 : val || "day", // <- fallback defaults
      };
      return {
        ...prev,
        customInterval: newCI,
        frequency: formatFrequency({
          schedule: prev.schedule,
          customInterval: newCI,
        }),
      };
    });
  };

  const handleTimeChange = (index, value) =>
    setMed((prev) => ({
      ...prev,
      times: prev.times.map((t, i) => (i === index ? value : t)),
    }));
  const addTime = () =>
    setMed((prev) => ({ ...prev, times: [...prev.times, ""] }));
  const removeTime = (index) =>
    setMed((prev) => ({
      ...prev,
      times: prev.times.filter((_, i) => i !== index),
    }));

  // ---------------- handleSubmit ----------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...med,
      startDate: med.startDate ? new Date(med.startDate).toISOString() : null,
      endDate: med.endDate ? new Date(med.endDate).toISOString() : null,
      customInterval: med.schedule === "custom" ? med.customInterval : null, // <- always null for non-custom
    };
    try {
      if (onSave) await onSave(payload);
      onClose();
    } catch (err) {
      console.error("Save med error:", err);
      setError(err.message);
    }
  };
  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded shadow w-[450px] max-h-[90vh] overflow-auto">
        <h2 className="text-xl font-bold mb-4">
          {medId ? "Edit Medication" : "Add Medication"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Name */}
          <div>
            <label className="block font-medium">Name</label>
            <input
              name="name"
              value={med.name}
              onChange={handleChange}
              className="border w-full p-2 rounded"
              required
            />
          </div>

          {/* Dosage */}
          <div>
            <label className="block font-medium">Dosage</label>
            <input
              type="number"
              name="dosage"
              value={med.dosage}
              onChange={handleChange}
              className="border w-full p-2 rounded"
              required
            />
          </div>

          {/* Unit */}
          <div>
            <label className="block font-medium">Unit</label>
            <input
              name="unit"
              value={med.unit}
              onChange={handleChange}
              className="border w-full p-2 rounded"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block font-medium">Type</label>
            <input
              name="type"
              value={med.type}
              onChange={handleChange}
              className="border w-full p-2 rounded"
            />
          </div>

          {/* Schedule */}
          <div>
            <label className="block font-medium">Schedule</label>
            <select
              name="schedule"
              value={med.schedule}
              onChange={handleChange}
              className="border w-full p-2 rounded"
            >
              <option value="daily">daily</option>
              <option value="weekly">weekly</option>
              <option value="monthly">monthly</option>
              <option value="custom">custom</option>
            </select>
          </div>

          {/* Custom Interval */}
          {med.schedule === "custom" && (
            <div className="flex gap-2">
              <div>
                <label className="block font-medium">
                  Custom Interval Number
                </label>
                <input
                  type="number"
                  value={med.customInterval?.number || 1}
                  onChange={(e) =>
                    handleCustomIntervalChange("number", e.target.value)
                  }
                  className="border w-full p-2 rounded"
                />
              </div>
              <div>
                <label className="block font-medium">Unit</label>
                <select
                  value={med.customInterval?.unit || "day"}
                  onChange={(e) =>
                    handleCustomIntervalChange("unit", e.target.value)
                  }
                  className="border w-full p-2 rounded"
                >
                  <option value="day">day</option>
                  <option value="week">week</option>
                  <option value="month">month</option>
                </select>
              </div>
            </div>
          )}

          {/* Start Date */}
          <div>
            <label className="block font-medium">Start Date</label>
            <input
              type="date"
              name="startDate"
              value={med.startDate}
              onChange={handleChange}
              className="border w-full p-2 rounded"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block font-medium">End Date</label>
            <input
              type="date"
              name="endDate"
              value={med.endDate}
              onChange={handleChange}
              className="border w-full p-2 rounded"
            />
          </div>

          {/* Times */}
          <div>
            <label className="block font-medium">Times</label>
            {med.times.map((time, idx) => (
              <div key={idx} className="flex gap-2 mb-1">
                <input
                  type="time"
                  value={time}
                  onChange={(e) => handleTimeChange(idx, e.target.value)}
                  className="border p-2 rounded flex-1"
                />
                <button
                  type="button"
                  onClick={() => removeTime(idx)}
                  className="px-2 bg-red-500 text-white rounded"
                >
                  X
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addTime}
              className="px-3 py-1 bg-green-500 text-white rounded mt-1"
            >
              Add Time
            </button>
          </div>

          {/* Notes */}
          <div>
            <label className="block font-medium">Notes</label>
            <textarea
              name="notes"
              value={med.notes}
              onChange={handleChange}
              className="border w-full p-2 rounded"
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-2 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
