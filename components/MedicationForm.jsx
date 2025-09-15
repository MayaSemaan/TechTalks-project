"use client";

import { useState, useEffect } from "react";
import axios from "axios";

export default function MedicationForm({ medication, onSaved, onAddOrUpdate }) {
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [schedule, setSchedule] = useState("");
  const [status, setStatus] = useState("taken");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [messageType, setMessageType] = useState("success");

  useEffect(() => {
    if (medication) {
      setName(medication.name || "");
      setDosage(medication.dosage || "");
      setSchedule(medication.schedule || "");
      setStatus(medication.status || "taken");
    } else {
      setName("");
      setDosage("");
      setSchedule("");
      setStatus("taken");
    }
  }, [medication]);

  const showMessage = (msg, type = "success") => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(null), 3000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let savedMed;
      if (medication && medication._id) {
        const res = await axios.put(
          `http://localhost:5000/medications/${medication._id}`,
          { name, dosage, schedule, status }
        );
        savedMed = res.data;
        showMessage("Medication updated successfully!", "success");
      } else {
        const res = await axios.post("http://localhost:5000/medications", {
          name,
          dosage,
          schedule,
          status,
        });
        savedMed = res.data;
        showMessage("Medication added successfully!", "success");
      }

      if (onAddOrUpdate) onAddOrUpdate(savedMed);

      setName("");
      setDosage("");
      setSchedule("");
      setStatus("taken");

      onSaved && onSaved();
    } catch (err) {
      console.error("Error saving medication:", err);
      showMessage("Failed to save medication!", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 p-4 border rounded shadow-md bg-white"
    >
      {message && (
        <div
          className={`p-2 mb-4 rounded ${
            messageType === "success"
              ? "bg-green-200 text-green-800"
              : "bg-red-200 text-red-800"
          }`}
        >
          {message}
        </div>
      )}

      <div>
        <label className="block font-medium mb-1">Name:</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="border p-2 rounded w-full"
          placeholder="Medication name"
        />
      </div>

      <div>
        <label className="block font-medium mb-1">Dosage:</label>
        <input
          type="text"
          value={dosage}
          onChange={(e) => setDosage(e.target.value)}
          required
          className="border p-2 rounded w-full"
          placeholder="e.g., 2 pills"
        />
      </div>

      <div>
        <label className="block font-medium mb-1">Schedule:</label>
        <input
          type="text"
          value={schedule}
          onChange={(e) => setSchedule(e.target.value)}
          required
          className="border p-2 rounded w-full"
          placeholder="e.g., 9AM, 9PM"
        />
      </div>

      <div>
        <label className="block font-medium mb-1">Status:</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="border p-2 rounded w-full"
        >
          <option value="taken">Taken</option>
          <option value="missed">Missed</option>
        </select>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
      >
        {loading ? "Saving..." : medication ? "Update Medication" : "Add Medication"}
      </button>
    </form>
  );}
