"use client";
import { useState, useEffect } from "react";

export default function MedicationForm({ medData = null, userId, onSave, onCancel }) {
  const [form, setForm] = useState({
    _id: null,
    name: "",
    dosage: "",
    schedule: "",
    status: "taken",
  });

  useEffect(() => {
    setForm({
      _id: medData?._id || null,
      name: medData?.name ?? "",
      dosage: medData?.dosage ?? "",
      schedule: medData?.schedule ?? "",
      status: medData?.status ?? "taken",
    });
  }, [medData]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!String(form.name).trim() || !String(form.dosage).trim() || !String(form.schedule).trim()) {
      alert("Please fill all fields");
      return;
    }

    if (!form._id && !userId) {
      alert("User ID missing!");
      return;
    }

    const payload = form._id
      ? { _id: form._id, name: form.name, dosage: form.dosage, schedule: form.schedule, status: form.status }
      : { userId, name: form.name, dosage: form.dosage, schedule: form.schedule, status: form.status };

    await onSave(payload);

    if (!form._id) {
      setForm({ _id: null, name: "", dosage: "", schedule: "", status: "taken" });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-md border-l-4 border-green-500 space-y-4">
      <h3 className="text-xl font-bold text-green-700">{form._id ? "Edit Medication" : "Add Medication"}</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block font-semibold text-green-800 mb-1">Name</label>
          <input name="name" value={form.name} onChange={handleChange} className="w-full border px-3 py-2 rounded-lg focus:ring-2 focus:ring-green-400"/>
        </div>

        <div>
          <label className="block font-semibold text-green-800 mb-1">Dosage</label>
          <input name="dosage" value={form.dosage} onChange={handleChange} className="w-full border px-3 py-2 rounded-lg focus:ring-2 focus:ring-green-400"/>
        </div>

        <div>
          <label className="block font-semibold text-green-800 mb-1">Schedule</label>
          <input name="schedule" value={form.schedule} onChange={handleChange} className="w-full border px-3 py-2 rounded-lg focus:ring-2 focus:ring-green-400"/>
        </div>

        <div>
          <label className="block font-semibold text-green-800 mb-1">Status</label>
          <select name="status" value={form.status} onChange={handleChange} className="w-full border px-3 py-2 rounded-lg focus:ring-2 focus:ring-green-400">
            <option value="taken">Taken</option>
            <option value="missed">Missed</option>
          </select>
        </div>
      </div>

      <div className="flex gap-4 mt-4">
        <button type="submit" className="flex-1 bg-green-600 text-white px-4 py-2 rounded-xl hover:bg-green-700 transition">Save</button>
        {onCancel && <button type="button" onClick={onCancel} className="flex-1 bg-gray-200 px-4 py-2 rounded-xl hover:bg-gray-300">Cancel</button>}
      </div>
    </form>
  );
}
