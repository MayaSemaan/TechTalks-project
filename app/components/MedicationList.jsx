"use client";

import axios from "axios";

export default function MedicationList({ medications, onEdit, onDelete }) {
  const base = process.env.NEXT_PUBLIC_API_BASE || "";

  const handleDelete = async (id) => {
    if (!confirm("Delete this medication? This will remove all reminders."))
      return;
    try {
      await axios.delete(`${base}/api/medications`, { data: { id } });
      onDelete(id);
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    }
  };

  if (!medications || medications.length === 0)
    return <p style={{ fontStyle: "italic" }}>No medications added yet.</p>;

  return (
    <ul
      style={{
        listStyle: "none",
        padding: 0,
        display: "flex",
        flexDirection: "column",
        gap: "15px",
      }}
    >
      {medications.map((med) => (
        <li
          key={med._id}
          style={{
            padding: "15px",
            borderRadius: "8px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            backgroundColor: "#fff",
          }}
        >
          <div style={{ fontSize: "16px" }}>
            <strong>{med.name}</strong> - {med.dosage} {med.unit} ({med.type})
            <br />
            Frequency: {med.frequency} | Times: {med.times.join(", ")}
            <br />
            {med.startDate && `Start: ${med.startDate}`}{" "}
            {med.endDate && `End: ${med.endDate}`}
            <br />
            Reminders: {med.reminders ? "ON" : "OFF"}
            <br />
            Notes: {med.notes || "-"}
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={() => onEdit(med)}
              style={{
                backgroundColor: "#2196F3",
                color: "#fff",
                border: "none",
                padding: "8px 14px",
                borderRadius: "5px",
                cursor: "pointer",
              }}
            >
              Edit
            </button>
            <button
              onClick={() => handleDelete(med._id)}
              style={{
                backgroundColor: "#f44336",
                color: "#fff",
                border: "none",
                padding: "8px 14px",
                borderRadius: "5px",
                cursor: "pointer",
              }}
            >
              Delete
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
