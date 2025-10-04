"use client";

import { useState, useEffect } from "react";

export default function MedicationForm({ onSave, onCancel, initialData }) {
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [unit, setUnit] = useState("mg");
  const [type, setType] = useState("pill");
  const [frequency, setFrequency] = useState("Daily");
  const [times, setTimes] = useState([""]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reminders, setReminders] = useState(false);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || "");
      setDosage(initialData.dosage || "");
      setUnit(initialData.unit || "mg");
      setType(initialData.type || "pill");
      setFrequency(initialData.frequency || "Daily");
      setTimes(initialData.times || [""]);
      setStartDate(initialData.startDate || "");
      setEndDate(initialData.endDate || "");
      setReminders(initialData.reminders || false);
      setNotes(initialData.notes || "");
    }
  }, [initialData]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return alert("Medication name is required");
    if (!dosage || isNaN(dosage)) return alert("Dosage must be a number");
    if (times.length === 0 || times.some((t) => !t)) return alert("Select at least one time");

    const medication = {
      name,
      dosage,
      unit,
      type,
      frequency,
      times,
      startDate,
      endDate,
      reminders,
      notes,
      status: initialData?.status || "pending", // default status
      id: initialData?.id || Date.now(),
    };

    onSave(medication);

    // reset form
    setName("");
    setDosage("");
    setUnit("mg");
    setType("pill");
    setFrequency("Daily");
    setTimes([""]);
    setStartDate("");
    setEndDate("");
    setReminders(false);
    setNotes("");
  };

  const handleTimeChange = (index, value) => {
    const newTimes = [...times];
    newTimes[index] = value;
    setTimes(newTimes);
  };

  const addTime = () => setTimes([...times, ""]);
  const removeTime = (index) => setTimes(times.filter((_, i) => i !== index));

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px", padding: "20px", borderRadius: "8px", backgroundColor: "#f8f8f8", boxShadow: "0 0 10px rgba(0,0,0,0.1)" }}>
      <input type="text" placeholder="Medication Name" value={name} onChange={(e) => setName(e.target.value)} style={{ padding: "10px", fontSize: "16px", borderRadius: "5px", border: "1px solid #ccc" }} />
      <div style={{ display: "flex", gap: "10px" }}>
        <input type="number" placeholder="Dosage" value={dosage} onChange={(e) => setDosage(e.target.value)} style={{ flex: 1, padding: "10px", fontSize: "16px", borderRadius: "5px", border: "1px solid #ccc" }} />
        <select value={unit} onChange={(e) => setUnit(e.target.value)} style={{ padding: "10px", fontSize: "16px", borderRadius: "5px", border: "1px solid #ccc" }}>
          <option value="mg">mg</option>
          <option value="ml">ml</option>
          <option value="pills">pills</option>
        </select>
      </div>

      <select value={type} onChange={(e) => setType(e.target.value)} style={{ padding: "10px", fontSize: "16px", borderRadius: "5px", border: "1px solid #ccc" }}>
        <option value="pill">Pill</option>
        <option value="capsule">Capsule</option>
        <option value="syrup">Syrup</option>
        <option value="injection">Injection</option>
      </select>

      <select value={frequency} onChange={(e) => setFrequency(e.target.value)} style={{ padding: "10px", fontSize: "16px", borderRadius: "5px", border: "1px solid #ccc" }}>
        <option value="Daily">Daily</option>
        <option value="Weekly">Weekly</option>
        <option value="Custom">Custom</option>
      </select>

      <div>
        <label>Times of Day:</label>
        {times.map((time, index) => (
          <div key={index} style={{ display: "flex", gap: "10px", marginTop: "5px" }}>
            <input type="time" value={time} onChange={(e) => handleTimeChange(index, e.target.value)} style={{ flex: 1, padding: "10px", borderRadius: "5px", border: "1px solid #ccc" }} />
            {times.length > 1 && <button type="button" onClick={() => removeTime(index)} style={{ padding: "5px 10px", backgroundColor: "#f44336", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer" }}>Remove</button>}
          </div>
        ))}
        <button type="button" onClick={addTime} style={{ marginTop: "5px", padding: "8px 12px", backgroundColor: "#2196F3", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer" }}>Add Time</button>
      </div>

      <div style={{ display: "flex", gap: "10px" }}>
        <div style={{ flex: 1 }}>
          <label>Start Date:</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "5px", border: "1px solid #ccc" }} />
        </div>
        <div style={{ flex: 1 }}>
          <label>End Date:</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "5px", border: "1px solid #ccc" }} />
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <input type="checkbox" checked={reminders} onChange={(e) => setReminders(e.target.checked)} />
        <label>Reminders ON</label>
      </div>

      <textarea placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} style={{ padding: "10px", borderRadius: "5px", border: "1px solid #ccc", fontSize: "16px" }} />

      <div style={{ display: "flex", gap: "10px" }}>
        <button type="submit" style={{ flex: 1, padding: "12px", backgroundColor: "#4CAF50", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer" }}>
          {initialData ? "Update" : "Add"}
        </button>
        {onCancel && <button type="button" onClick={onCancel} style={{ flex: 1, padding: "12px", backgroundColor: "#f44336", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer" }}>Cancel</button>}
      </div>
    </form>
  );
}
