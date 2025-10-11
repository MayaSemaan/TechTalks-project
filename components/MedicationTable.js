"use client";
import { useState } from "react";
import MedicationForm from "./MedicationForm";
import { deleteMedication, updateMedication } from "@/utils/api";

export default function MedicationTable({ medications = [], onUpdated }) {
  const [editingMed, setEditingMed] = useState(null);

  async function handleDelete(id) {
    if (!confirm("Are you sure you want to delete this medication?")) return;
    const result = await deleteMedication(id);
    if (result.success) {
      onUpdated && onUpdated();
    } else {
      alert("Delete failed: " + result.error);
    }
  }

  async function handleUpdate(med) {
    const payload = {
      name: med.name,
      dosage: med.dosage,
      schedule: med.schedule,
      status: med.status,
    };
    const result = await updateMedication(med._id, payload);
    if (result.success) {
      setEditingMed(null);
      onUpdated && onUpdated();
    } else {
      alert("Update failed: " + result.error);
    }
  }

  if (editingMed) {
    return (
      <MedicationForm
        medData={editingMed}
        onSave={handleUpdate}
        onCancel={() => setEditingMed(null)}
      />
    );
  }

  if (!medications.length) {
    return (
      <div className="text-center p-6 bg-white rounded-xl shadow-md text-gray-500">
        No medications saved.
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      {medications.map((m) => (
        <div
          key={m._id}
          className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200 hover:shadow-2xl transition-all duration-300"
        >
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-xl font-bold text-gray-800">{m.name}</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setEditingMed(m)}
                className="text-blue-600 hover:text-blue-800 font-semibold transition"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(m._id)}
                className="text-red-600 hover:text-red-800 font-semibold transition"
              >
                Delete
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <p>
              <span className="font-medium text-gray-700">Dosage:</span> {m.dosage || "-"}
            </p>
            <p>
              <span className="font-medium text-gray-700">Schedule:</span> {m.schedule || "-"}
            </p>
            <p>
              <span className="font-medium text-gray-700">Status:</span>{" "}
              <span
                className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                  m.status === "taken"
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {m.status.toUpperCase()}
              </span>
            </p>
          </div>

          {m.createdAt && (
            <p className="mt-4 text-gray-400 text-sm">
              Created: {new Date(m.createdAt).toLocaleString()}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
