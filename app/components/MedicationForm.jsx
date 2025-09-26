"use client";

import { useState, useEffect } from "react";

export default function MedicationForm({ onSave, onCancel, initialData }) {
  const [form, setForm] = useState({
    name: "",
    dosage: "",
    unit: "mg",
    type: "pill",
    frequency: "Daily",
    times: [],
    startDate: "",
    endDate: "",
    reminders: false,
    notes: "",
  });

  useEffect(() => {
    if (initialData) {
      setForm({
        name: initialData.name || "",
        dosage: initialData.dosage || "",
        unit: initialData.unit || "mg",
        type: initialData.type || "pill",
        frequency: initialData.frequency || "Daily",
        times: initialData.times || [],
        startDate: initialData.startDate || "",
        endDate: initialData.endDate || "",
        reminders: initialData.reminders || false,
        notes: initialData.notes || "",
        id: initialData.id || initialData._id,
      });
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleTimesChange = (e, index) => {
    const newTimes = [...form.times];
    newTimes[index] = e.target.value;
    setForm({ ...form, times: newTimes });
  };

  const addTime = () =>
    setForm((prev) => ({ ...prev, times: [...prev.times, ""] }));
  const removeTime = (index) =>
    setForm((prev) => ({
      ...prev,
      times: prev.times.filter((_, i) => i !== index),
    }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
    if (!initialData) {
      setForm({
        name: "",
        dosage: "",
        unit: "mg",
        type: "pill",
        frequency: "Daily",
        times: [],
        startDate: "",
        endDate: "",
        reminders: false,
        notes: "",
      });
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white shadow-lg rounded-xl p-6 border border-gray-200 mb-6"
    >
      <h2 className="text-xl font-semibold text-blue-800 mb-4">
        {initialData ? "Edit Medication" : "Add Medication"}
      </h2>

      <input
        type="text"
        name="name"
        placeholder="Medication Name"
        value={form.name}
        onChange={handleChange}
        required
        className="w-full mb-3 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-400"
      />

      <div className="flex gap-2 mb-3">
        <input
          type="number"
          name="dosage"
          placeholder="Dosage"
          value={form.dosage}
          onChange={handleChange}
          className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-400"
        />
        <select
          name="unit"
          value={form.unit}
          onChange={handleChange}
          className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-400"
        >
          <option value="mg">mg</option>
          <option value="ml">ml</option>
          <option value="pills">pills</option>
        </select>
      </div>

      <div className="flex gap-2 mb-3">
        <select
          name="type"
          value={form.type}
          onChange={handleChange}
          className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-400"
        >
          <option value="pill">Pill</option>
          <option value="capsule">Capsule</option>
          <option value="syrup">Syrup</option>
          <option value="injection">Injection</option>
        </select>

        <select
          name="frequency"
          value={form.frequency}
          onChange={handleChange}
          className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-400"
        >
          <option value="Daily">Daily</option>
          <option value="Weekly">Weekly</option>
          <option value="Custom">Custom</option>
        </select>
      </div>

      <div className="mb-3">
        <label className="block mb-1">Times:</label>
        {form.times.map((time, index) => (
          <div key={index} className="flex gap-2 mb-2">
            <input
              type="time"
              value={time}
              onChange={(e) => handleTimesChange(e, index)}
              className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-400"
            />
            {form.times.length > 1 && (
              <button
                type="button"
                onClick={() => removeTime(index)}
                className="px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
              >
                Remove
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={addTime}
          className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
        >
          Add Time
        </button>
      </div>

      <div className="flex gap-2 mb-3">
        <input
          type="date"
          name="startDate"
          value={form.startDate}
          onChange={handleChange}
          className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-400"
        />
        <input
          type="date"
          name="endDate"
          value={form.endDate}
          onChange={handleChange}
          className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-400"
        />
      </div>

      <label className="flex items-center gap-2 mb-3">
        <input
          type="checkbox"
          name="reminders"
          checked={form.reminders}
          onChange={handleChange}
        />
        Enable reminders
      </label>

      <textarea
        name="notes"
        placeholder="Additional notes"
        value={form.notes}
        onChange={handleChange}
        className="w-full mb-4 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-400"
      />

      <div className="flex justify-end gap-3">
        {initialData && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400 transition"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
        >
          {initialData ? "Update" : "Add"}
        </button>
      </div>
    </form>
  );
}
