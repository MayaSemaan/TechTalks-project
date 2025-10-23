"use client";
import { useState, useEffect } from "react";
import jwtDecode from "jwt-decode";

export default function MedicationForm({ onSave, onCancel, initialData }) {
  const defaultMed = {
    name: "",
    dosage: 0,
    unit: "mg",
    type: "tablet",
    schedule: "daily",
    customInterval: { number: 1, unit: "day" },
    times: [],
    startDate: "",
    endDate: "",
    notes: "",
    reminders: false,
    doses: [],
  };

  const formatDateInput = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return isNaN(d) ? "" : d.toISOString().split("T")[0];
  };

  const [name, setName] = useState(initialData?.name || defaultMed.name);
  const [dosage, setDosage] = useState(
    initialData?.dosage || defaultMed.dosage
  );
  const [unit, setUnit] = useState(initialData?.unit || defaultMed.unit);
  const [type, setType] = useState(initialData?.type || defaultMed.type);
  const [schedule, setSchedule] = useState(
    initialData?.schedule || defaultMed.schedule
  );
  const [customInterval, setCustomInterval] = useState(
    initialData?.customInterval || defaultMed.customInterval
  );
  const [times, setTimes] = useState(
    Array.isArray(initialData?.times) ? initialData.times : []
  );
  const [newTime, setNewTime] = useState("");
  const [startDate, setStartDate] = useState(
    formatDateInput(initialData?.startDate)
  );
  const [endDate, setEndDate] = useState(formatDateInput(initialData?.endDate));
  const [notes, setNotes] = useState(initialData?.notes || defaultMed.notes);
  const [reminders, setReminders] = useState(Boolean(initialData?.reminders));
  const [timeError, setTimeError] = useState(false);
  const [dosageError, setDosageError] = useState(false);

  const unitOptions = ["mg", "ml", "pills", "drops"];
  const typeOptions = ["tablet", "capsule", "syrup", "injection"];
  const scheduleOptions = ["daily", "weekly", "monthly", "custom"];
  const intervalUnits = ["day", "week", "month"];

  // Reset custom interval if schedule is not custom
  useEffect(() => {
    if (schedule !== "custom") setCustomInterval({ number: 1, unit: "day" });
  }, [schedule]);

  const addTime = () => {
    if (newTime && !times.includes(newTime)) {
      setTimes([...times, newTime]);
      setNewTime("");
      setTimeError(false);
    }
  };

  const removeTime = (t) => setTimes(times.filter((time) => time !== t));

  const computeFrequency = (schedule, customInterval) => {
    if (schedule === "custom" && customInterval) {
      const number = Number(customInterval.number) || 1;
      const unit = customInterval.unit || "day";
      return `Every ${number} ${unit}${number > 1 ? "s" : ""}`;
    }
    return schedule || "daily";
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (Number(dosage) <= 0) {
      setDosageError(true);
      return;
    }
    if (!startDate || !endDate) {
      alert("Please choose both start and end dates.");
      return;
    }
    if (endDate < startDate) {
      alert("End date cannot be before start date.");
      return;
    }
    if (times.length === 0) {
      setTimeError(true);
      return;
    }

    let userId = initialData?.userId || null;
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (token && !userId) {
      try {
        const decoded = jwtDecode(token);
        userId = decoded.id || decoded._id || userId;
      } catch {}
    }

    const existingDoses = Array.isArray(initialData?.doses)
      ? initialData.doses
      : [];
    const doses = times.map((time) => ({
      doseId:
        existingDoses.find((d) => d.time === time)?.doseId ||
        (typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `temp-${time}-${Math.random().toString(36).slice(2, 8)}`),
      time,
      taken: null,
      date: startDate
        ? new Date(startDate).toISOString()
        : new Date().toISOString(),
    }));

    const payload = {
      name: name || "Unnamed Medication",
      dosage: Number(dosage),
      unit,
      type,
      schedule,
      times,
      startDate,
      endDate,
      notes,
      reminders: Boolean(reminders),
      userId,
      doses,
      customInterval:
        schedule === "custom"
          ? {
              number: Number(customInterval.number) || 1,
              unit: customInterval.unit || "day",
            }
          : null,
    };

    // Compute frequency immediately
    payload.frequency = computeFrequency(schedule, payload.customInterval);

    onSave(payload);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 bg-white p-6 rounded-xl shadow-md"
    >
      <input
        type="text"
        placeholder="Medication Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-400"
      />

      <div className="flex gap-2">
        <div className="flex-1">
          <input
            type="number"
            placeholder="Dosage"
            min={0}
            value={dosage}
            onChange={(e) => setDosage(e.target.value)}
            className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-400"
          />
          {dosageError && (
            <p className="text-red-500 text-sm mt-1">Dosage cannot be 0.</p>
          )}
        </div>
        <select
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          className="flex-1 border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-400"
        >
          {unitOptions.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="flex-1 border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-400"
        >
          {typeOptions.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <label className="font-semibold">Frequency</label>
        <select
          value={schedule}
          onChange={(e) => setSchedule(e.target.value)}
          className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-400"
        >
          {scheduleOptions.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        {schedule === "custom" && (
          <div className="flex gap-2 mt-2">
            <input
              type="number"
              min={1}
              value={customInterval.number}
              onChange={(e) =>
                setCustomInterval({ ...customInterval, number: e.target.value })
              }
              className="flex-1 border border-gray-300 rounded-xl p-2 focus:ring-2 focus:ring-blue-400"
            />
            <select
              value={customInterval.unit}
              onChange={(e) =>
                setCustomInterval({ ...customInterval, unit: e.target.value })
              }
              className="flex-1 border border-gray-300 rounded-xl p-2 focus:ring-2 focus:ring-blue-400"
            >
              {intervalUnits.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <label className="font-semibold">Times of Day</label>
        <div className="flex gap-2">
          <input
            type="time"
            value={newTime}
            onChange={(e) => setNewTime(e.target.value)}
            className="flex-1 border border-gray-300 rounded-xl p-2 focus:ring-2 focus:ring-blue-400"
          />
          <button
            type="button"
            onClick={addTime}
            className="bg-blue-500 text-white px-4 py-2 rounded-xl hover:bg-blue-600 transition"
          >
            Add Time
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {times.map((t) => (
            <div
              key={t}
              className="bg-gray-200 px-3 py-1 rounded-full flex items-center gap-1"
            >
              <span>{t}</span>
              <button
                type="button"
                onClick={() => removeTime(t)}
                className="text-red-500 font-bold"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        {timeError && (
          <p className="text-red-500 text-sm mt-1">
            Please add at least one time.
          </p>
        )}
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="block font-semibold mb-1">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-xl p-2 focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <div className="flex-1">
          <label className="block font-semibold mb-1">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
            min={startDate}
            className="w-full border border-gray-300 rounded-xl p-2 focus:ring-2 focus:ring-blue-400"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={reminders}
          onChange={(e) => setReminders(e.target.checked)}
          id="reminders"
          className="h-4 w-4"
        />
        <label htmlFor="reminders">Enable Reminders</label>
      </div>

      <div className="mt-2">
        <label className="block font-semibold mb-1">Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any additional information..."
          className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-400"
          rows={3}
        />
      </div>

      <div className="flex gap-2 mt-4">
        <button
          type="submit"
          className="flex-1 bg-blue-500 text-white py-3 rounded-xl hover:bg-blue-600 transition"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-gray-300 py-3 rounded-xl hover:bg-gray-400 transition"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
