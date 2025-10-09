"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import MedicationForm from "../components/MedicationForm";
import MedicationCard from "../components/MedicationCard";

export default function MedicationsPage() {
  const [medications, setMedications] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingMed, setEditingMed] = useState(null);

  const fetchMedications = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const res = await axios.get("/api/medications", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const meds = Array.isArray(res.data) ? res.data : [];

      const normalized = meds.map((med) => {
        const dosesByTime = {};
        (med.doses || []).forEach((d) => {
          dosesByTime[d.time] = d;
        });

        const doses = (med.times || []).map((t) => {
          const d = dosesByTime[t] || {};
          return {
            time: t,
            taken:
              d.taken === true
                ? "taken"
                : d.taken === false
                ? "missed"
                : "pending",
            date: d.date || new Date().toISOString(),
          };
        });

        return {
          ...med,
          doses,
          customInterval: med.customInterval || null,
          reminders: med.reminders || false,
        };
      });

      setMedications(normalized);
    } catch (err) {
      console.error("Failed to fetch medications:", err.message || err);
      setMedications([]);
    }
  };

  useEffect(() => {
    fetchMedications();
  }, []);

  const handleSave = async (med) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const payload = {
        ...med,
        dosage: Number(med.dosage) || 0,
        customInterval:
          med.schedule === "custom"
            ? {
                number: Number(med.customInterval.number) || 1,
                unit: med.customInterval.unit || "day",
              }
            : null,
      };

      let res;
      if (editingMed) {
        res = await axios.put(`/api/medications/${editingMed._id}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setMedications((prev) =>
          prev.map((m) => (m._id === editingMed._id ? res.data : m))
        );
      } else {
        res = await axios.post("/api/medications", payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setMedications((prev) => [
          ...prev,
          {
            ...res.data,
            doses: res.data.doses || [],
            reminders: res.data.reminders || false,
          },
        ]);
      }

      setShowForm(false);
      setEditingMed(null);
    } catch (err) {
      console.error("Failed to save medication:", err.message || err);
      alert(`Failed to save medication: ${err.message || err}`);
    }
  };

  const handleDelete = async (id) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      await axios.delete(`/api/medications/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMedications((prev) => prev.filter((m) => m._id !== id));
    } catch (err) {
      console.error("Failed to delete medication:", err.message || err);
      alert(`Failed to delete medication: ${err.message || err}`);
    }
  };

  const handleDoseClick = async (medId, time, status) => {
    setMedications((prev) =>
      prev.map((m) =>
        m._id === medId
          ? {
              ...m,
              doses: m.doses.map((d) =>
                d.time === time ? { ...d, taken: status } : d
              ),
            }
          : m
      )
    );

    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      await axios.put(
        `/api/medications/${medId}`,
        { time, status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (err) {
      console.error("Failed to update dose:", err.message || err);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Medications</h1>

      {showForm ? (
        <MedicationForm
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false);
            setEditingMed(null);
          }}
          initialData={editingMed}
        />
      ) : (
        <div>
          <button
            onClick={() => setShowForm(true)}
            className="mb-6 bg-blue-500 text-white px-4 py-2 rounded-xl hover:bg-blue-600 transition"
          >
            ➕ Add Medication
          </button>

          {medications.length === 0 ? (
            <p className="text-gray-500">No medications yet.</p>
          ) : (
            <div className="space-y-4">
              {medications.filter(Boolean).map((med) => (
                <MedicationCard
                  key={med._id}
                  med={med}
                  onEdit={(m) => {
                    setEditingMed(m);
                    setShowForm(true);
                  }}
                  onDelete={handleDelete}
                  onDoseClick={handleDoseClick}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
