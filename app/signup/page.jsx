"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import Link from "next/link";

export default function Signup() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "patient",
  });
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!validateEmail(form.email)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    try {
      const res = await axios.post("/api/register", form);

      // Auto-login after signup
      const loginRes = await axios.post("/api/login", {
        email: form.email,
        password: form.password,
      });

      const { role, _id } = loginRes.data.user;

      localStorage.setItem("token", loginRes.data.token);
      localStorage.setItem("userId", _id);
      localStorage.setItem("role", role || "patient");

      // Redirect based on role
      if (role === "doctor") {
        window.location.href = `/assign/doctor`;
      } else if (role === "family") {
        window.location.href = `/assign/family`;
      } else {
        window.location.href = `/dashboard/patient/${_id}`;
      }
    } catch (err) {
      setError(err.response?.data?.message || "Error during signup.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-blue-100 to-blue-200 flex items-center justify-center p-8">
      <div className="max-w-md w-full bg-white shadow-md rounded-xl p-8">
        <h1 className="text-3xl font-bold text-blue-900 text-center mb-6">
          Sign Up
        </h1>

        {error && <p className="text-red-600 text-center mb-2">{error}</p>}
        {successMsg && (
          <p className="text-green-600 text-center mb-2">{successMsg}</p>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Name"
            required
            className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-400"
          />
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="Email"
            required
            className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-400"
          />
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            placeholder="Password"
            required
            className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-400"
          />
          <select
            name="role"
            value={form.role}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-400"
          >
            <option value="patient">Patient</option>
            <option value="family">Family</option>
            <option value="doctor">Doctor</option>
          </select>

          <button
            type="submit"
            className="w-full bg-blue-500 text-white font-bold py-3 rounded-xl hover:bg-blue-600 transition"
          >
            Sign Up
          </button>
        </form>

        <p className="text-center text-gray-700 mt-4">
          Already have an account?{" "}
          <Link href="/login" className="text-blue-600 font-semibold">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
