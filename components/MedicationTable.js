"use client";

import { useState } from "react";
import MedicationForm from "./MedicationForm";
import { deleteMedication, updateMedication, addMedication } from "@/utils/api";

export default function MedicationTable({ medications = [], onUpdated, userId }) {
  const [editingMedId, setEditingMedId] = useState(null);
  const [addingNew, setAddingNew] = useState(false); // track adding new medication

  async function handleSave(med) {
    if (med._id) {
      // Edit medication
      const payload = {
        name: med.name,
        dosage: med.dosage,
        schedule: med.schedule,
        status: med.status,
      };
      const result = await updateMedication(med._id, payload);
      if (result.success) setEditingMedId(null);
      else return alert("Update failed: " + result.error);
    } else {
      // Add new medication
      const payload = {
        userId, // important: include userId
        name: med.name,
        dosage: med.dosage,
        schedule: med.schedule,
        status: med.status,
      };
      const result = await addMedication(payload);
      if (!result.success) return alert("Add failed: " + result.error);
      setAddingNew(false);
    }

    onUpdated && onUpdated(); // refresh table
  }

  async function handleDelete(id) {
    if (!confirm("Are you sure you want to delete this medication?")) return;
    const result = await deleteMedication(id);
    if (result.success) onUpdated && onUpdated();
    else alert("Delete failed: " + result.error);
  }

  return (
    <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      {/* Render Add Form at the beginning */}
      {addingNew && (
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200 transition-all duration-300">
          <MedicationForm
            userId={userId}
            onSave={handleSave}
            onCancel={() => setAddingNew(false)}
          />
        </div>
      )}

      {/* Render existing medications */}
      {medications.map((med) => (
        <div
          key={med._id}
          className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200 hover:shadow-2xl transition-all duration-300"
        >
          {editingMedId === med._id ? (
            <MedicationForm
              medData={med}
              userId={userId}
              onSave={handleSave}
              onCancel={() => setEditingMedId(null)}
            />
          ) : (
            <>
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-gray-800">{med.name}</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingMedId(med._id)}
                    className="text-blue-600 hover:text-blue-800 font-semibold transition"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(med._id)}
                    className="text-red-600 hover:text-red-800 font-semibold transition"
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <p>
                  <span className="font-medium text-gray-700">Dosage:</span> {med.dosage || "-"}
                </p>
                <p>
                  <span className="font-medium text-gray-700">Schedule:</span> {med.schedule || "-"}
                </p>
                <p>
                  <span className="font-medium text-gray-700">Status:</span>{" "}
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                      med.status === "taken"
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {med.status.toUpperCase()}
                  </span>
                </p>
              </div>

              {med.createdAt && (
                <p className="mt-4 text-gray-400 text-sm">
                  Created: {new Date(med.createdAt).toLocaleString()}
                </p>
              )}
            </>
          )}
        </div>
      ))}
    </div>
  );
}
