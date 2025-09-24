"use client";

import { useState, useEffect } from "react";

export default function MedicationForm({ onSave, onCancel, initialData }) {
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [unit, setUnit] = useState("mg");
  const [type, setType] = useState("pill");
  const [frequency, setFrequency] = useState("Daily");
  const [times, setTimes] = useState([""]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reminders, setReminders] = useState(false);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || "");
      setDosage(initialData.dosage || "");
      setUnit(initialData.unit || "mg");
      setType(initialData.type || "pill");
      setFrequency(initialData.frequency || "Daily");
      setTimes(initialData.times || [""]);
      setStartDate(initialData.startDate || "");
      setEndDate(initialData.endDate || "");
      setReminders(initialData.reminders || false);
      setNotes(initialData.notes || "");
    }
  }, [initialData]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return alert("Medication name is required");
    if (!dosage || isNaN(dosage)) return alert("Dosage must be a number");
    if (times.length === 0 || times.some((t) => !t))
      return alert("Select at least one time");

    onSave({
      name,
      dosage,
      unit,
      type,
      frequency,
      times,
      startDate,
      endDate,
      reminders,
      notes,
      id: initialData?.id || Date.now(),
    });

    // reset form
    setName("");
    setDosage("");
    setUnit("mg");
    setType("pill");
    setFrequency("Daily");
    setTimes([""]);
    setStartDate("");
    setEndDate("");
    setReminders(false);
    setNotes("");
  };

  const handleTimeChange = (index, value) => {
    const newTimes = [...times];
    newTimes[index] = value;
    setTimes(newTimes);
  };

  const addTime = () => setTimes([...times, ""]);
  const removeTime = (index) => setTimes(times.filter((_, i) => i !== index));

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 p-4 bg-gray-100 rounded shadow"
    >
      <input
        type="text"
        placeholder="Medication Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="border p-2 rounded"
      />
      <div className="flex gap-2">
        <input
          type="number"
          placeholder="Dosage"
          value={dosage}
          onChange={(e) => setDosage(e.target.value)}
          className="border p-2 rounded flex-1"
        />
        <select
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="mg">mg</option>
          <option value="ml">ml</option>
          <option value="pills">pills</option>
        </select>
      </div>
      <select
        value={type}
        onChange={(e) => setType(e.target.value)}
        className="border p-2 rounded"
      >
        <option value="pill">Pill</option>
        <option value="capsule">Capsule</option>
        <option value="syrup">Syrup</option>
        <option value="injection">Injection</option>
      </select>
      <select
        value={frequency}
        onChange={(e) => setFrequency(e.target.value)}
        className="border p-2 rounded"
      >
        <option value="Daily">Daily</option>
        <option value="Weekly">Weekly</option>
        <option value="Custom">Custom</option>
      </select>
      <div>
        <label>Times:</label>
        {times.map((t, i) => (
          <div key={i} className="flex gap-2 mt-1">
            <input
              type="time"
              value={t}
              onChange={(e) => handleTimeChange(i, e.target.value)}
              className="border p-2 rounded flex-1"
            />
            {times.length > 1 && (
              <button
                type="button"
                onClick={() => removeTime(i)}
                className="bg-red-500 text-white px-2 rounded"
              >
                Remove
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={addTime}
          className="mt-1 bg-blue-500 text-white px-3 py-1 rounded"
        >
          Add Time
        </button>
      </div>
      <div className="flex gap-2">
        <div className="flex-1">
          <label>Start Date:</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border p-2 rounded w-full"
          />
        </div>
        <div className="flex-1">
          <label>End Date:</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border p-2 rounded w-full"
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={reminders}
          onChange={(e) => setReminders(e.target.checked)}
        />
        <label>Reminders ON</label>
      </div>
      <textarea
        placeholder="Notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        className="border p-2 rounded"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          {initialData ? "Update" : "Add"}
        </button>
        {initialData && (
          <button
            type="button"
            onClick={onCancel}
            className="bg-gray-500 text-white px-4 py-2 rounded"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
