"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

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
      const res = await axios.post("http://localhost:5000/login", form);

      console.log("Login successful:", res.data);

      // store token for authentication
      localStorage.setItem("token", res.data.token || "dummy-token"); // use real token from backend if available

      router.push("/dashboard");
    } catch (err) {
      console.error("Login error:", err.response?.data || err.message);
      setError(err.response?.data?.message || "Invalid email or password.");
    }
  };

  return (
    <div style={{ maxWidth: "400px", margin: "50px auto", padding: "20px", border: "1px solid #ccc", borderRadius: "10px", fontFamily: "sans-serif" }}>
      <h1 style={{ textAlign: "center", color: "#333" }}>Login</h1>
      {error && <p style={{ color: "red", textAlign: "center", fontSize: "14px" }}>{error}</p>}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
        <input type="email" name="email" onChange={handleChange} value={form.email} placeholder="Email" required style={{ padding: "12px", borderRadius: "8px", border: "1px solid #ccc", width: "100%" }} />
        <input type="password" name="password" onChange={handleChange} value={form.password} placeholder="Password" required style={{ padding: "12px", borderRadius: "8px", border: "1px solid #ccc", width: "100%" }} />
        <button type="submit" style={{ padding: "12px", borderRadius: "8px", border: "none", backgroundColor: "#0070f3", color: "#fff", fontWeight: "bold", cursor: "pointer" }}>
          Login
        </button>
      </form>
    </div>
  );
}
