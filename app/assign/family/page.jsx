"use client";

import { useState, useEffect } from "react";
import axios from "axios";

export default function FamilyAssignPage() {
  const [email, setEmail] = useState("");
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // ✅ Ensure only family members can access this page
  useEffect(() => {
    const role = localStorage.getItem("role");
    if (role !== "family") {
      window.location.href = "/login"; // redirect unauthorized users
    }
  }, []);

  const handleAssign = async (e) => {
    e.preventDefault();
    setSuccess("");
    setError("");
    setLoading(true);

    try {
      // 1️⃣ Find patient by email
      const res = await axios.get(`/api/patients/search?email=${email}`);
      const patient = res.data;

      if (!patient?._id) {
        setError("❌ Patient not found.");
        setLoading(false);
        return;
      }

      const patientId = patient._id;
      const token = localStorage.getItem("token");

      if (!token) {
        setError("❌ Authentication token missing. Please log in again.");
        setLoading(false);
        return;
      }

      // 2️⃣ Link this family member to the patient
      await axios.post(
        "/api/LinkingUsers",
        { targetId: patientId, role: "patient" }, // role = patient
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccess(`✅ Successfully linked patient (${email})!`);
      setEmail("");
    } catch (err) {
      console.error("Error assigning patient:", err);
      setError(err.response?.data?.error || "⚠️ Failed to link patient.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-blue-100 to-blue-200 flex items-center justify-center p-8">
      <div className="max-w-md w-full bg-white shadow-md rounded-xl p-8">
        <h1 className="text-3xl font-bold text-blue-900 text-center mb-6">
          Link a Patient
        </h1>

        {error && <p className="text-red-600 text-center mb-3">{error}</p>}
        {success && (
          <p className="text-green-600 text-center mb-3">{success}</p>
        )}

        <form onSubmit={handleAssign} className="space-y-4">
          <input
            type="email"
            placeholder="Enter patient’s email"
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
            {loading ? "Linking..." : "Link Patient"}
          </button>

          {/* ✅ Go to Dashboard button */}
          <button
            type="button"
            onClick={() => {
              const userId = localStorage.getItem("userId");
              window.location.href = `/dashboard/family/${userId}`;
            }}
            className="w-full mt-4 font-bold py-3 rounded-xl text-white bg-green-500 hover:bg-green-600 transition"
          >
            Go to Dashboard
          </button>
        </form>
      </div>
    </div>
  );
}
