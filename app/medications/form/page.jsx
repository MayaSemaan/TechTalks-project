"use client";

import { useState } from "react";

export default function MedicationForm({ initialData, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    dosage: initialData?.dosage || "",
    unit: initialData?.unit || "",
    type: initialData?.type || "",
    userId: initialData?.userId || "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const url = formData._id
        ? `/api/medications/${formData._id}`
        : `/api/medications`;
      const method = formData._id ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to save medication");
      }

      const savedMed = await res.json();
      // Notify parent to update dashboard state
      onSave(savedMed.medication || savedMed);
    } catch (err) {
      console.error(err);
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-red-600">{error}</p>}

      <div>
        <label className="block font-semibold mb-1">Name</label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          className="w-full border rounded px-3 py-2"
          required
        />
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="block font-semibold mb-1">Dosage</label>
          <input
            type="number"
            name="dosage"
            value={formData.dosage}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2"
            required
          />
        </div>
        <div className="flex-1">
          <label className="block font-semibold mb-1">Unit</label>
          <input
            type="text"
            name="unit"
            value={formData.unit}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2"
            required
          />
        </div>
      </div>

      <div>
        <label className="block font-semibold mb-1">Type</label>
        <select
          name="type"
          value={formData.type}
          onChange={handleChange}
          className="w-full border rounded px-3 py-2"
          required
        >
          <option value="">Select type</option>
          <option value="pill">Pill</option>
          <option value="syrup">Syrup</option>
          <option value="injection">Injection</option>
        </select>
      </div>

      <div className="flex justify-end gap-2 mt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded border hover:bg-gray-100 transition"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 rounded bg-blue-500 text-white hover:bg-blue-600 transition"
        >
          {loading ? "Saving..." : "Save"}
        </button>
      </div>
    </form>
  );
}
