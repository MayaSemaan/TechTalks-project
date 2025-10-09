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
    setError("");

    try {
      const res = await axios.post("/api/login", form);

      if (res.data.token) {
        localStorage.setItem("token", res.data.token);
      }

      router.push(`/dashboard/${res.data.user._id}`);
    } catch (err) {
      setError(err.response?.data?.message || "Invalid email or password.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-blue-100 to-blue-200 flex items-center justify-center p-8">
      <div className="max-w-md w-full bg-white shadow-md rounded-xl p-8">
        <h1 className="text-3xl font-bold text-blue-900 text-center mb-6">
          Login
        </h1>

        {error && <p className="text-red-600 text-center mb-4">{error}</p>}

        <form className="space-y-4" onSubmit={handleSubmit}>
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
