"use client";
import { useState, useEffect } from "react";

export default function MedicationCard({
  med,
  onStatusChange,
  onEdit,
  onDelete,
}) {
  const scheduleTimes = { morning: "08:00", evening: "20:00" };
  const medTime = scheduleTimes[med.schedule] || "23:59";

  const [isDueSoon, setIsDueSoon] = useState(false);

  // Check if medication is due soon (overdue)
  useEffect(() => {
    const checkDue = () => {
      if (med.status === "taken" || med.status === "missed") {
        setIsDueSoon(false);
        return;
      }
      const now = new Date();
      const [hours, minutes] = medTime.split(":").map(Number);
      const medDateTime = new Date();
      medDateTime.setHours(hours, minutes, 0, 0);

      // Overdue within 1 hour window
      const oneHour = 60 * 60 * 1000;
      setIsDueSoon(
        now >= medDateTime && now <= new Date(medDateTime.getTime() + oneHour)
      );
    };

    checkDue();
    const interval = setInterval(checkDue, 60 * 1000);
    return () => clearInterval(interval);
  }, [med.status, medTime]);

  const handleStatusClick = async (status) => {
    try {
      await fetch(`http://localhost:5000/medications/${med.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      onStatusChange(med.id, status);
    } catch {
      alert("Failed to update status");
    }
  };

  const cardStyle = {
    border: "1px solid #ccc",
    borderRadius: "8px",
    padding: "12px",
    marginBottom: "10px",
    backgroundColor:
      med.status === "taken"
        ? "#d4edda"
        : med.status === "missed"
        ? "#f8d7da"
        : isDueSoon
        ? "#fff3cd"
        : "#f8f8f8",
  };

  const statusColor =
    med.status === "taken"
      ? "green"
      : med.status === "missed"
      ? "red"
      : "orange";

  return (
    <div style={cardStyle}>
      <h3>
        {med.name} - {med.dosage} {med.unit} {med.type ? `(${med.type})` : ""}
      </h3>
      <p>Frequency: {med.frequency || "N/A"}</p>
      <p>
        Schedule: {med.schedule} ({medTime})
      </p>
      <p>
        Status:{" "}
        <span style={{ color: statusColor, fontWeight: "bold" }}>
          {med.status || "Pending"}
        </span>
      </p>
      <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
        <button
          onClick={() => handleStatusClick("taken")}
          style={{
            padding: "8px 12px",
            backgroundColor: "green",
            color: "#fff",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          ✅ Taken
        </button>
        <button
          onClick={() => handleStatusClick("missed")}
          style={{
            padding: "8px 12px",
            backgroundColor: "red",
            color: "#fff",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          ❌ Missed
        </button>
        <button
          onClick={() => onEdit(med)}
          style={{
            padding: "8px 12px",
            backgroundColor: "#2196F3",
            color: "#fff",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          ✏️ Edit
        </button>
        <button
          onClick={() => onDelete(med.id)}
          style={{
            padding: "8px 12px",
            backgroundColor: "#f44336",
            color: "#fff",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          🗑️ Delete
        </button>
      </div>
    </div>
  );
}
