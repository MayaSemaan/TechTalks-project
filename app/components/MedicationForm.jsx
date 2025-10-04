"use client";
import { useState, useEffect } from "react";

export default function MedicationForm({ onSave, onCancel, initialData }) {
  const [name, setName] = useState(initialData?.name || "");
  const [dosage, setDosage] = useState(initialData?.dosage || "");
  const [unit, setUnit] = useState(initialData?.unit || "");
  const [type, setType] = useState(initialData?.type || "");
  const [frequency, setFrequency] = useState(initialData?.frequency || "");
  const [times, setTimes] = useState(initialData?.times?.join(", ") || "");
  const [schedule, setSchedule] = useState(initialData?.schedule || "morning");
  const [startDate, setStartDate] = useState(initialData?.startDate || "");
  const [endDate, setEndDate] = useState(initialData?.endDate || "");
  const [notes, setNotes] = useState(initialData?.notes || "");
  const [reminders, setReminders] = useState(initialData?.reminders || false);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setDosage(initialData.dosage);
      setUnit(initialData.unit);
      setType(initialData.type);
      setFrequency(initialData.frequency);
      setTimes(initialData.times.join(", "));
      setSchedule(initialData.schedule);
      setStartDate(initialData.startDate);
      setEndDate(initialData.endDate);
      setNotes(initialData.notes);
      setReminders(initialData.reminders);
    }
  }, [initialData]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      id: initialData?.id,
      name,
      dosage,
      unit,
      type,
      frequency,
      times: times.split(",").map((t) => t.trim()),
      schedule,
      startDate,
      endDate,
      notes,
      reminders,
      status: initialData?.status || "pending",
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white shadow p-4 rounded mb-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Medication Name"
          required
          className="border p-2 rounded"
        />
        <input
          value={dosage}
          onChange={(e) => setDosage(e.target.value)}
          placeholder="Dosage"
          required
          className="border p-2 rounded"
        />
        <input
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          placeholder="Unit (mg/ml)"
          className="border p-2 rounded"
        />
        <input
          value={type}
          onChange={(e) => setType(e.target.value)}
          placeholder="Type (pill/liquid)"
          className="border p-2 rounded"
        />
        <input
          value={frequency}
          onChange={(e) => setFrequency(e.target.value)}
          placeholder="Frequency"
          className="border p-2 rounded"
        />
        <input
          value={times}
          onChange={(e) => setTimes(e.target.value)}
          placeholder="Times (comma separated)"
          className="border p-2 rounded"
        />
        <select
          value={schedule}
          onChange={(e) => setSchedule(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="morning">Morning</option>
          <option value="evening">Evening</option>
        </select>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="border p-2 rounded"
        />
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="border p-2 rounded"
        />
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes"
          className="border p-2 rounded col-span-1 sm:col-span-2"
        />
        <label className="flex items-center gap-2 col-span-1 sm:col-span-2">
          <input
            type="checkbox"
            checked={reminders}
            onChange={(e) => setReminders(e.target.checked)}
          />{" "}
          Enable Reminders
        </label>
      </div>
      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 transition"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
