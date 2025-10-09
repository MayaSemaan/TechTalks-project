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

      const fetchedMeds = Array.isArray(res.data) ? res.data : [];

      const normalized = fetchedMeds.map((med) => {
        const dosesByTime = {};
        (med.doses || []).forEach((d) => {
          const key = d.time;
          if (
            !dosesByTime[key] ||
            new Date(d.date) > new Date(dosesByTime[key].date)
          ) {
            dosesByTime[key] = d;
          }
        });

        const doses = (med.times || []).map((t) => {
          const d = dosesByTime[t] || {};
          let takenStatus = "pending";
          if (d.taken === true || d.taken === "taken") takenStatus = "taken";
          else if (d.taken === false || d.taken === "missed")
            takenStatus = "missed";
          return {
            time: t,
            taken: takenStatus,
            date: d.date || new Date().toISOString(),
          };
        });

        const customInterval =
          med.schedule === "custom"
            ? med.customInterval || { number: 1, unit: "day" }
            : null;

        return {
          ...med,
          times: med.times || [],
          doses,
          customInterval,
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
          med.schedule === "custom" && med.customInterval
            ? {
                number: Number(med.customInterval.number) || 1,
                unit: med.customInterval.unit || "day",
              }
            : null,
      };

      if (editingMed) {
        // ✅ Merge old doses with new times
        const existingDoses = editingMed.doses || [];
        const updatedTimes = payload.times || [];

        const mergedDoses = updatedTimes.map((time) => {
          const existing = existingDoses.find((d) => d.time === time);
          return (
            existing || {
              time,
              taken: "pending",
              date: new Date().toISOString(),
            }
          );
        });

        const updatedMed = {
          ...editingMed,
          ...payload,
          times: updatedTimes, // ✅ important: update times array
          doses: mergedDoses,
          customInterval:
            payload.schedule === "custom"
              ? payload.customInterval || { number: 1, unit: "day" }
              : null,
          reminders: payload.reminders || false,
        };

        const res = await axios.put(
          `/api/medications/${editingMed._id}`,
          updatedMed,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        setMedications((prev) =>
          prev.map((m) => (m._id === editingMed._id ? updatedMed : m))
        );
      } else {
        // ✅ New medication
        const res = await axios.post("/api/medications", payload, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const newMed = {
          ...res.data,
          times: res.data.times || [],
          doses: (res.data.times || []).map((t, i) => ({
            time: t,
            taken: res.data.doses?.[i]?.taken || "pending",
            date: res.data.doses?.[i]?.date || new Date().toISOString(),
          })),
          customInterval:
            res.data.schedule === "custom"
              ? res.data.customInterval || { number: 1, unit: "day" }
              : null,
          reminders: res.data.reminders || false,
        };

        setMedications((prev) => [...prev, newMed]);
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
