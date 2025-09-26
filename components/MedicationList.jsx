"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import MedicationForm from "./MedicationForm";
import MedicationCard from "./MedicationCard";

export default function MedicationsList() {
  const [medications, setMedications] = useState([]);
  const [editingMed, setEditingMed] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const scheduleTimes = { morning: "08:00", evening: "20:00" };

  // Sort by due time (soonest first)
  const sortBySchedule = (meds) => {
    return meds.sort((a, b) => {
      const aTime = scheduleTimes[a.schedule] || "23:59";
      const bTime = scheduleTimes[b.schedule] || "23:59";
      return aTime.localeCompare(bTime);
    });
  };

  // Fetch medications
  const fetchMedications = async () => {
    try {
      const res = await axios.get("http://localhost:5000/medications");
      const sorted = sortBySchedule(res.data);
      setMedications(sorted);
    } catch (err) {
      console.error(err);
      alert("Failed to fetch medications");
    }
  };

  useEffect(() => {
    fetchMedications();
  }, []);

  const handleSave = async (med) => {
    try {
      if (editingMed) {
        await axios.put(`http://localhost:5000/medications/${med.id}`, med);
        setMedications((prev) =>
          sortBySchedule(prev.map((m) => (m.id === med.id ? med : m)))
        );
      } else {
        const res = await axios.post("http://localhost:5000/medications", med);
        setMedications((prev) => sortBySchedule([...prev, res.data]));
      }
      setEditingMed(null);
      setShowForm(false);
    } catch (err) {
      console.error(err);
      alert("Failed to save medication");
    }
  };

  const handleStatusChange = (id, status) => {
    setMedications((prev) =>
      sortBySchedule(prev.map((m) => (m.id === id ? { ...m, status } : m)))
    );
  };

  const handleEdit = (med) => {
    setEditingMed(med);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this medication?")) return;
    try {
      await axios.delete(`http://localhost:5000/medications/${id}`);
      setMedications((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      console.error(err);
      alert("Failed to delete medication");
    }
  };

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto", padding: "20px" }}>
      <h2>My Medications</h2>

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
            setEditingMed(null);
          }}
          initialData={editingMed}
        />
      )}

      {medications.length === 0 && <p>No medications yet.</p>}

      {medications.map((med) => (
        <MedicationCard
          key={med.id}
          med={med}
          onStatusChange={handleStatusChange}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      ))}
    </div>
  );
}
