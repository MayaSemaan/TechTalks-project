"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import Link from "next/link";

export default function Signup() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "patient" });
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

    // Frontend validations
    if (!validateEmail(form.email)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    try {
      // ✅ Updated API path
      const res = await axios.post("/api/signup", form);
      console.log("Signup successful:", res.data);

      setSuccessMsg("Signup successful, redirecting...");
      setTimeout(() => {
        router.push("/login");
      }, 2000); // 2 seconds delay
    } catch (err) {
      setError(err.response?.data?.message || "An error occurred during signup.");
    }
  };

  return (
    <div style={{ maxWidth: "400px", margin: "50px auto", padding: "20px", border: "1px solid #ccc", borderRadius: "10px", fontFamily: "sans-serif" }}>
      <h1 style={{ textAlign: "center", color: "#333" }}>Sign Up</h1>

      {error && <p style={{ color: "red", textAlign: "center", fontSize: "14px" }}>{error}</p>}
      {successMsg && <p style={{ color: "green", textAlign: "center", fontSize: "14px" }}>{successMsg}</p>}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
        <label>
          Name:
          <input type="text" name="name" onChange={handleChange} value={form.name} required style={{ padding: "12px", borderRadius: "8px", border: "1px solid #ccc", width: "100%" }} />
        </label>
        <label>
          Email:
          <input type="email" name="email" onChange={handleChange} value={form.email} required style={{ padding: "12px", borderRadius: "8px", border: "1px solid #ccc", width: "100%" }} />
        </label>
        <label>
          Password:
          <input type="password" name="password" onChange={handleChange} value={form.password} required style={{ padding: "12px", borderRadius: "8px", border: "1px solid #ccc", width: "100%" }} />
        </label>
        <label>
          Role:
          <select name="role" onChange={handleChange} value={form.role} style={{ padding: "12px", borderRadius: "8px", border: "1px solid #ccc", width: "100%" }}>
            <option value="patient">Patient</option>
            <option value="family">Family</option>
            <option value="doctor">Doctor</option>
          </select>
        </label>

        <button type="submit" style={{ padding: "12px", borderRadius: "8px", border: "none", backgroundColor: "#0070f3", color: "#fff", fontWeight: "bold", cursor: "pointer" }}>
          Sign Up
        </button>
      </form>

      <p style={{ textAlign: "center", marginTop: "15px", fontSize: "14px" }}>
        Already have an account? <Link href="/login" style={{ color: "#0070f3", fontWeight: "bold" }}>Login</Link>
      </p>
    </div>
  );
}
