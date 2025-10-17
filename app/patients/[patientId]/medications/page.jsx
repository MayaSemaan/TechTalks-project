"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import jwtDecode from "jwt-decode";
import MedicationForm from "../../../components/MedicationForm";
import MedicationCard from "../../../components/MedicationCard";

export default function MedicationsPage() {
  const router = useRouter();
  const [medications, setMedications] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingMed, setEditingMed] = useState(null);
  const [patientId, setPatientId] = useState(null);
  const [loading, setLoading] = useState(true);

  // ------------------------------
  // Load logged-in patient's ID
  // ------------------------------
  useEffect(() => {
    const loadPatientId = () => {
      let id = null;
      try {
        const token = localStorage.getItem("token");
        if (token) {
          const decoded = jwtDecode(token);
          id = decoded.id || decoded._id;
        }
      } catch (err) {
        console.warn("Failed to decode token:", err);
      }

      id =
        id ||
        localStorage.getItem("medicationsPatientId") ||
        localStorage.getItem("userId");

      if (id) {
        setPatientId(id);
        console.log("Using patient ID:", id);
      } else {
        console.error("❌ No patient ID found");
        setLoading(false);
      }
    };
    loadPatientId();
  }, []);

  // ------------------------------
  // Fetch medications from backend
  // ------------------------------
  useEffect(() => {
    if (!patientId) return;

    const fetchMedications = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        if (!token) return;

        const res = await axios.get(`/api/medications?userId=${patientId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const fetchedMeds = Array.isArray(res.data) ? res.data : [];

        // Normalize doses
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

          return {
            ...med,
            times: med.times || [],
            doses,
            reminders: !!med.reminders,
          };
        });

        setMedications(normalized);
      } catch (err) {
        console.error(
          "Failed to fetch medications:",
          err.response?.data || err.message || err
        );
        setMedications([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMedications();
  }, [patientId]);

  // ------------------------------
  // Save or update a medication
  // ------------------------------
  const handleSave = async (med) => {
    if (!patientId) return;

    try {
      if (Number(med.dosage) <= 0) {
        alert("Dosage must be greater than 0");
        return;
      }

      const token = localStorage.getItem("token");
      if (!token) return;

      const payload = {
        ...med,
        userId: patientId,
        dosage: Number(med.dosage),
        customInterval:
          med.schedule === "custom" && med.customInterval
            ? {
                number: Number(med.customInterval.number) || 1,
                unit: med.customInterval.unit || "day",
              }
            : undefined,
      };

      if (editingMed) {
        const existingDoses = editingMed.doses || [];
        const mergedDoses = (payload.times || []).map((time) => {
          const existing = existingDoses.find((d) => d.time === time);
          return (
            existing || {
              time,
              taken: "pending",
              date: new Date().toISOString(),
            }
          );
        });

        const updatedMed = { ...editingMed, ...payload, doses: mergedDoses };

        await axios.put(`/api/medications/${editingMed._id}`, updatedMed, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setMedications((prev) =>
          prev.map((m) => (m._id === editingMed._id ? updatedMed : m))
        );
      } else {
        const res = await axios.post("/api/medications", payload, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const newMed = {
          ...res.data,
          times: res.data.times || [],
          doses: (res.data.times || []).map((t) => {
            const existing = res.data.doses?.find((d) => d.time === t);
            return {
              time: t,
              taken: existing?.taken || "pending",
              date: existing?.date || new Date().toISOString(),
            };
          }),
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
      console.error(
        "Failed to save medication:",
        err.response?.data || err.message || err
      );
      alert(
        `Failed to save medication: ${
          err.response?.data?.error || err.message || err
        }`
      );
    }
  };

  // ------------------------------
  // Delete medication
  // ------------------------------
  const handleDelete = async (id) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      await axios.delete(`/api/medications/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMedications((prev) => prev.filter((m) => m._id !== id));
    } catch (err) {
      console.error(
        "Failed to delete medication:",
        err.response?.data || err.message || err
      );
      alert(
        `Failed to delete medication: ${
          err.response?.data?.error || err.message || err
        }`
      );
    }
  };

  // ------------------------------
  // Toggle dose taken/missed
  // ------------------------------
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

      // Only send time + status to backend
      await axios.put(
        `/api/medications/${medId}`,
        { time, status },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
    } catch (err) {
      console.error(
        "Failed to update dose:",
        err.response?.data || err.message || err
      );
    }
  };

  // ------------------------------
  // Render
  // ------------------------------
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
            onClick={() => router.back()}
            className="mb-4 bg-gray-300 text-black px-4 py-2 rounded-xl hover:bg-gray-400 transition"
          >
            ← Back to Dashboard
          </button>

          <button
            onClick={() => setShowForm(true)}
            className="mb-6 bg-blue-500 text-white px-4 py-2 rounded-xl hover:bg-blue-600 transition"
          >
            ➕ Add Medication
          </button>

          {loading ? (
            <p className="text-gray-500">Loading medications...</p>
          ) : medications.length === 0 ? (
            <p className="text-gray-500">No medications yet.</p>
          ) : (
            <div className="space-y-4">
              {medications.map((med) => (
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
