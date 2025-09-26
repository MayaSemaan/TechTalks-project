"use client";
import axios from "axios";
import { useState, useEffect } from "react";

export default function MedicationCard({ med, onStatusChange, onEdit, onDelete }) {
  // Map schedule to approximate time
  const scheduleTimes = {
    morning: "08:00",
    evening: "20:00"
  };

  const medTime = scheduleTimes[med.schedule] || "N/A";

  const [isDueSoon, setIsDueSoon] = useState(false);

  useEffect(() => {
    const checkDue = () => {
      if (med.status !== "pending") {
        setIsDueSoon(false);
        return;
      }

      const currentTime = new Date();
      const [hours, minutes] = medTime.split(":").map(Number);
      const medDateTime = new Date();
      medDateTime.setHours(hours, minutes, 0, 0);

      // Due within 1 hour
      const oneHour = 60 * 60 * 1000;
      setIsDueSoon(currentTime >= medDateTime && currentTime <= new Date(medDateTime.getTime() + oneHour));
    };

    checkDue();
    const interval = setInterval(checkDue, 60 * 1000);

    return () => clearInterval(interval);
  }, [med.status, medTime]);

  const handleMarkTaken = async () => {
    try {
      await axios.put(`http://localhost:5000/medications/${med.id}`, { status: "taken" });
      onStatusChange(med.id, "taken");
    } catch {
      alert("Failed to update status");
    }
  };

  const handleMarkMissed = async () => {
    try {
      await axios.put(`http://localhost:5000/medications/${med.id}`, { status: "missed" });
      onStatusChange(med.id, "missed");
    } catch {
      alert("Failed to update status");
    }
  };

  const statusColor =
    med.status === "taken"
      ? "green"
      : med.status === "missed"
      ? "red"
      : "orange";

  const cardStyle = {
    border: "1px solid #ccc",
    borderRadius: "8px",
    padding: "12px",
    marginBottom: "10px",
    backgroundColor: isDueSoon ? "#fff3cd" : "#f8f8f8", // highlight due soon
  };

  return (
    <div style={cardStyle}>
      <h3>
        {med.name} - {med.dosage} {med.type ? `(${med.type})` : ""}
      </h3>
      <p>Frequency: {med.frequency || "N/A"}</p>
      <p>Schedule: {med.schedule} ({medTime})</p>
      <p>
        Status:{" "}
        <span style={{ color: statusColor, fontWeight: "bold" }}>
          {med.status || "Pending"}
        </span>
      </p>
      <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
        <button
          onClick={handleMarkTaken}
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
          onClick={handleMarkMissed}
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
