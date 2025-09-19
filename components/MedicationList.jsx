"use client";

export default function MedicationList({ medications, onEdit, onDelete }) {
  if (!medications || medications.length === 0)
    return <p style={{ fontStyle: "italic" }}>No medications added yet.</p>;

  return (
    <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: "15px" }}>
      {medications.map((med, index) => (
        <li
          key={med.id || index}
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
            <strong>{med.name}</strong> - {med.dosage}{" "}
            {med.schedule && `- ${med.schedule}`} -{" "}
            <span style={{ color: med.status === "taken" ? "green" : med.status === "missed" ? "red" : "#555" }}>
              {med.status}
            </span>
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
              onClick={() => onDelete(med.id)}
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
