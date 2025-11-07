"use client";

import { useState, useEffect } from "react";
import axios from "axios";

export default function AssignDoctorPage() {
  const [email, setEmail] = useState("");
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [doctorId, setDoctorId] = useState("");

  useEffect(() => {
    // Get logged-in doctor ID from localStorage
    const id = localStorage.getItem("userId");
    if (id) setDoctorId(id);
  }, []);

  const handleAssign = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    if (!email) {
      setError("Please enter a patient's email");
      setLoading(false);
      return;
    }

    try {
      // Find patient ID by email
      const res = await axios.get(`/api/patients/search?email=${email}`);
      const patient = res.data;

      if (!patient?._id) {
        setError("❌ Patient not found.");
        setLoading(false);
        return;
      }

      const patientId = patient._id;

      // Assign patient to doctor
      await axios.post("/api/doctor/assign", { doctorId, patientId });

      setSuccess(`✅ Patient (${email}) successfully assigned!`);
      setEmail("");
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "⚠️ Failed to assign patient.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-blue-100 to-blue-200 flex items-center justify-center p-8">
      <div className="max-w-md w-full bg-white shadow-md rounded-xl p-8">
        <h1 className="text-3xl font-bold text-blue-900 text-center mb-6">
          Assign a Patient
        </h1>

        {error && <p className="text-red-600 text-center mb-3">{error}</p>}
        {success && (
          <p className="text-green-600 text-center mb-3">{success}</p>
        )}

        <form onSubmit={handleAssign} className="space-y-4">
          <input
            type="email"
            placeholder="Enter patient's email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-400"
          />

          <button
            type="submit"
            disabled={loading}
            className={`w-full font-bold py-3 rounded-xl text-white transition ${
              loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-500 hover:bg-blue-600"
            }`}
          >
            {loading ? "Assigning..." : "Assign Patient"}
          </button>

          <button
            type="button"
            onClick={() => {
              const id = localStorage.getItem("userId");
              window.location.href = `/dashboard/doctor/${id}`;
            }}
            className="w-full font-bold py-3 rounded-xl text-gray-800 bg-gray-300 hover:bg-gray-400 transition"
          >
            Go to Dashboard
          </button>
        </form>
      </div>
    </div>
  );
}
