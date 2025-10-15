"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

export default function Medications() {
  const router = useRouter();
  const [meds, setMeds] = useState([]);
  const [form, setForm] = useState({ name: "", dosage: "", schedule: "" });
  const [editingId, setEditingId] = useState(null); // Track editing

  const backendUrl = "http://localhost:5000";

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
    } else {
      fetchMeds();
    }
  }, []);

  const fetchMeds = async () => {
    try {
      const res = await axios.get(`${backendUrl}/medications`);
      setMeds(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editingId) {
      // Edit existing medication
      await axios.put(`${backendUrl}/medications/${editingId}`, form);
      setEditingId(null);
    } else {
      // Add new medication
      await axios.post(`${backendUrl}/medications`, form);
    }
    setForm({ name: "", dosage: "", schedule: "" });
    fetchMeds();
  };

  const markTaken = async (id) => {
    await axios.put(`${backendUrl}/medications/${id}`, { status: "taken" });
    fetchMeds();
  };

  const markMissed = async (id) => {
    await axios.put(`${backendUrl}/medications/${id}`, { status: "missed" });
    fetchMeds();
  };

  const deleteMed = async (id) => {
    await axios.delete(`${backendUrl}/medications/${id}`);
    fetchMeds();
  };

  const startEdit = (med) => {
    setForm({ name: med.name, dosage: med.dosage, schedule: med.schedule });
    setEditingId(med.id);
  };

  return (
    <div style={{ maxWidth: "700px", margin: "50px auto", fontFamily: "sans-serif" }}>
      <h1 style={{ textAlign: "center", marginBottom: "20px" }}>My Medications</h1>

      {/* Form for Add / Edit */}
      <form onSubmit={handleSubmit} style={{ display: "flex", gap: "10px", marginBottom: "30px" }}>
        <input
          type="text"
          placeholder="Medication Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
          style={{ flex: 2, padding: "10px", borderRadius: "8px", border: "1px solid #ccc" }}
        />
        <input
          type="text"
          placeholder="Dosage"
          value={form.dosage}
          onChange={(e) => setForm({ ...form, dosage: e.target.value })}
          required
          style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #ccc" }}
        />
        <input
          type="text"
          placeholder="Schedule"
          value={form.schedule}
          onChange={(e) => setForm({ ...form, schedule: e.target.value })}
          required
          style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #ccc" }}
        />
        <button
          type="submit"
          style={{
            padding: "10px 20px",
            borderRadius: "8px",
            border: "none",
            backgroundColor: "#007bff",
            color: "white",
            fontWeight: "bold",
          }}
        >
          {editingId ? "💾 Save" : "+ Add"}
        </button>
      </form>

      {/* Medication list */}
      {meds.map((med) => (
        <div
          key={med.id}
          style={{
            border: "1px solid #ddd",
            borderRadius: "10px",
            padding: "15px",
            marginBottom: "15px",
            boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
          }}
        >
          <div style={{ marginBottom: "10px", fontWeight: "bold" }}>
            {med.name} - {med.dosage}
          </div>
          <div style={{ marginBottom: "10px" }}>Frequency: {med.schedule || "N/A"}</div>
          <div style={{ marginBottom: "10px" }}>
            Status:{" "}
            <span
              style={{
                color:
                  med.status === "pending"
                    ? "orange"
                    : med.status === "taken"
                    ? "green"
                    : "red",
                fontWeight: "bold",
              }}
            >
              {med.status}
            </span>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={() => markTaken(med.id)}
              style={{ flex: 1, backgroundColor: "green", color: "white", border: "none", borderRadius: "5px", padding: "8px" }}
            >
              ✅ Taken
            </button>
            <button
              onClick={() => markMissed(med.id)}
              style={{ flex: 1, backgroundColor: "red", color: "white", border: "none", borderRadius: "5px", padding: "8px" }}
            >
              ❌ Missed
            </button>
            <button
              onClick={() => startEdit(med)}
              style={{ flex: 1, backgroundColor: "#007bff", color: "white", border: "none", borderRadius: "5px", padding: "8px" }}
            >
              ✏️ Edit
            </button>
            <button
              onClick={() => deleteMed(med.id)}
              style={{ flex: 1, backgroundColor: "#dc3545", color: "white", border: "none", borderRadius: "5px", padding: "8px" }}
            >
              🗑️ Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
