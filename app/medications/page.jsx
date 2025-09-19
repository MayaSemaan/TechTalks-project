"use client";

import { useState } from "react";
import MedicationForm from "../../components/MedicationForm";

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
    <div style={{ maxWidth: "600px", margin: "40px auto", padding: "0 20px" }}>
      <h1 style={{ textAlign: "center", marginBottom: "30px" }}>My Medications</h1>

      <MedicationForm onSave={handleSave} onCancel={() => setEditing(null)} initialData={editing} />

      <ul style={{ listStyle: "none", padding: 0 }}>
        {medications.map((med) => (
          <li key={med.id} style={{ backgroundColor: "#f1f1f1", marginBottom: "10px", padding: "15px", borderRadius: "8px", boxShadow: "0 2px 5px rgba(0,0,0,0.05)" }}>
            <div>
              <strong>{med.name}</strong> - {med.dosage} {med.unit} ({med.type})<br />
              Frequency: {med.frequency} | Times: {med.times.join(", ")}<br />
              {med.startDate && `Start: ${med.startDate}`} {med.endDate && `End: ${med.endDate}`}<br />
              Reminders: {med.reminders ? "ON" : "OFF"}<br />
              Notes: {med.notes || "-"}
            </div>
            <div style={{ marginTop: "10px", display: "flex", gap: "10px" }}>
              <button onClick={() => handleEdit(med)} style={{ flex: 1, padding: "10px", backgroundColor: "#2196F3", color: "#fff", border: "none", borderRadius: "5px" }}>Edit</button>
              <button onClick={() => handleDelete(med.id)} style={{ flex: 1, padding: "10px", backgroundColor: "#f44336", color: "#fff", border: "none", borderRadius: "5px" }}>Delete</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
