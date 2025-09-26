"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import MedicationForm from "../../components/MedicationForm";
import MedicationCard from "../../components/MedicationCard";

// Automatically determine backend URL
const getBackendURL = () => {
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;

    // Localhost frontend → use localhost backend
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return "http://127.0.0.1:5000";
    }

    // For WSL/Docker/VM → use host IP (same as frontend hostname)
    return `http://${hostname}:5000`;
  }

  // Default fallback
  return "http://127.0.0.1:5000";
};

export default function MedicationsPage() {
  const [medications, setMedications] = useState([]);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const BASE_URL = getBackendURL();

  // Fetch medications
  const fetchMedications = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/medications`);
      setMedications(res.data);
    } catch (err) {
      console.error("Failed to fetch medications:", err.message);
      alert(
        "Cannot reach the backend. Make sure your server is running and the URL is correct."
      );
    }
  };

  useEffect(() => {
    fetchMedications();
    const interval = setInterval(fetchMedications, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleSave = async (med) => {
    try {
      if (editing) {
        await axios.put(`${BASE_URL}/medications/${med.id}`, med);
        setMedications((prev) => prev.map((m) => (m.id === med.id ? med : m)));
      } else {
        const res = await axios.post(`${BASE_URL}/medications`, med);
        setMedications((prev) => [...prev, res.data]);
      }
      setEditing(null);
      setShowForm(false);
    } catch (err) {
      console.error("Failed to save medication:", err.message);
      alert("Failed to save medication");
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await axios.put(`${BASE_URL}/medications/${id}`, { status });
      setMedications((prev) => prev.map((m) => (m.id === id ? { ...m, status } : m)));
    } catch (err) {
      console.error("Failed to update status:", err.message);
      alert("Failed to update status");
    }
  };

  const handleEdit = (med) => {
    setEditing(med);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this medication?")) return;
    try {
      await axios.delete(`${BASE_URL}/medications/${id}`);
      setMedications((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      console.error("Failed to delete medication:", err.message);
      alert("Failed to delete medication");
    }
  };

  return (
    <div style={{ maxWidth: "600px", margin: "40px auto", padding: "0 20px" }}>
      <h1 style={{ textAlign: "center", marginBottom: "30px" }}>My Medications</h1>
      <button
        onClick={() => setShowForm(true)}
        style={{
          marginBottom: "15px",
          padding: "10px 15px",
          backgroundColor: "#2196F3",
          color: "#fff",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer",
        }}
      >
        + Add Medication
      </button>

      {showForm && (
        <MedicationForm
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false);
            setEditing(null);
          }}
          initialData={editing}
        />
      )}

      {medications.length === 0 ? (
        <p>No medications yet.</p>
      ) : (
        medications.map((med) => (
          <MedicationCard
            key={med.id}
            med={med}
            onStatusChange={handleStatusChange}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ))
      )}
    </div>
  );
}
