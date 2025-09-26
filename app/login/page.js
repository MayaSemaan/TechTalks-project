"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import Link from "next/link";

export default function Login() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // ✅ Updated API path
      const res = await axios.post("/api/login", form);
      console.log("Login successful:", res.data);

      // Optional: store token if backend provides one
      // localStorage.setItem("token", res.data.token);

      router.push("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid email or password.");
    }
  };

  return (
    <div style={{ maxWidth: "400px", margin: "50px auto", padding: "20px", border: "1px solid #ccc", borderRadius: "10px", fontFamily: "sans-serif" }}>
      <h1 style={{ textAlign: "center", color: "#333" }}>Login</h1>
      {error && <p style={{ color: "red", textAlign: "center", fontSize: "14px" }}>{error}</p>}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
        <label>
          Email:
          <input type="email" name="email" onChange={handleChange} value={form.email} required style={{ padding: "12px", borderRadius: "8px", border: "1px solid #ccc", width: "100%" }} />
        </label>
        <label>
          Password:
          <input type="password" name="password" onChange={handleChange} value={form.password} required style={{ padding: "12px", borderRadius: "8px", border: "1px solid #ccc", width: "100%" }} />
        </label>

        <button type="submit" style={{ padding: "12px", borderRadius: "8px", border: "none", backgroundColor: "#0070f3", color: "#fff", fontWeight: "bold", cursor: "pointer" }}>
          Login
        </button>
      </form>

      <p style={{ textAlign: "center", marginTop: "15px", fontSize: "14px" }}>
        Don’t have an account? <Link href="/signup" style={{ color: "#0070f3", fontWeight: "bold" }}>Sign Up</Link>
      </p>
    </div>
  );
}
