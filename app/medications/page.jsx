"use client";

import { useState } from "react";
import MedicationForm from "../components/MedicationForm";

export default function MedicationsPage() {
  const [medications, setMedications] = useState([]);
  const [editing, setEditing] = useState(null); // null or medication object

  const handleSave = (med) => {
    if (editing) {
      setMedications((prev) => prev.map((m) => (m.id === med.id ? med : m)));
      setEditing(null);
      alert("Medication updated!");
    } else {
      setMedications((prev) => [...prev, med]);
      alert("Medication added successfully!");
    }
  };

  const handleEdit = (med) => setEditing(med);
  const handleDelete = (id) => {
    if (confirm("Delete this medication? This will remove all reminders.")) {
      setMedications((prev) => prev.filter((m) => m.id !== id));
      alert("Medication deleted");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-blue-100 to-blue-200 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-blue-900">
          My Medications
        </h1>

        <MedicationForm
          onSave={handleSave}
          onCancel={() => setEditing(null)}
          initialData={editing}
        />

        {medications.length === 0 ? (
          <p className="text-gray-600 text-lg mt-4">
            No medications added yet.
          </p>
        ) : (
          <div className="space-y-4 mt-4">
            {medications.map((med) => (
              <div
                key={med.id}
                className="bg-white shadow-md rounded-lg p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center"
              >
                <div>
                  <h2 className="text-xl font-semibold text-blue-800">
                    {med.name}
                  </h2>
                  <p className="text-gray-700">
                    Dosage: {med.dosage} {med.unit} ({med.type})
                  </p>
                  <p className="text-gray-700">
                    Frequency: {med.frequency} | Times: {med.times.join(", ")}
                  </p>
                  {med.startDate && (
                    <p className="text-gray-500 text-sm">
                      Start: {med.startDate}
                    </p>
                  )}
                  {med.endDate && (
                    <p className="text-gray-500 text-sm">End: {med.endDate}</p>
                  )}
                  <p className="text-gray-700">
                    Reminders: {med.reminders ? "ON" : "OFF"}
                  </p>
                  <p className="text-gray-700">Notes: {med.notes || "-"}</p>
                </div>

                <div className="mt-3 sm:mt-0 flex gap-2">
                  <button
                    onClick={() => handleEdit(med)}
                    className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(med.id)}
                    className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
