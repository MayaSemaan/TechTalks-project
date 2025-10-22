"use client";

import { useState, useEffect, useRef } from "react";
import axios from "axios";
import Link from "next/link";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const emailRef = useRef(null);
  const passwordRef = useRef(null);

  // Pre-fill email from previous login (optional)
  useEffect(() => {
    const savedEmail = localStorage.getItem("savedEmail");
    if (savedEmail) {
      setForm((prev) => ({ ...prev, email: savedEmail }));
      setRememberMe(true);
      passwordRef.current?.focus(); // trigger browser auto-fill
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const res = await axios.post("/api/login", form);

      if (res.data.token && res.data.user?._id) {
        const { role, _id, email } = res.data.user;

        // Save token and user info
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("userId", _id);
        localStorage.setItem("role", role || "patient");

        // Save email for pre-fill next time
        if (rememberMe) {
          localStorage.setItem("savedEmail", email);
        } else {
          localStorage.removeItem("savedEmail");
        }

        // ✅ Redirect based on role
        if (role === "doctor") {
          window.location.href = `/assign/doctor`;
        } else if (role === "family") {
          window.location.href = `/assign/family`;
        } else {
          window.location.href = `/dashboard/patient/${_id}`;
        }
      } else {
        setError("Login failed: invalid response from server.");
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "Invalid email or password.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-blue-100 to-blue-200 flex items-center justify-center p-8">
      <div className="max-w-md w-full bg-white shadow-md rounded-xl p-8">
        <h1 className="text-3xl font-bold text-blue-900 text-center mb-6">
          Login
        </h1>

        {error && <p className="text-red-600 text-center mb-4">{error}</p>}

        <form className="space-y-4" onSubmit={handleSubmit} autoComplete="on">
          <input
            type="email"
            name="email"
            ref={emailRef}
            value={form.email}
            onChange={handleChange}
            placeholder="Email"
            required
            autoComplete="email"
            className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-400"
          />
          <input
            type="password"
            name="password"
            ref={passwordRef}
            value={form.password}
            onChange={handleChange}
            placeholder="Password"
            required
            autoComplete="current-password"
            className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-400"
          />

          <label className="flex items-center gap-2 text-gray-700">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4"
            />
            Remember Me
          </label>

          <button
            type="submit"
            className="w-full bg-blue-500 text-white font-bold py-3 rounded-xl hover:bg-blue-600 transition"
          >
            Login
          </button>
        </form>

        <p className="text-center text-gray-700 mt-4">
          Don’t have an account?{" "}
          <Link href="/signup" className="text-blue-600 font-semibold">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
}
