"use client";

import { useState, useEffect } from "react";
import axios from "axios";

export default function UploadReportPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [patient, setPatient] = useState("");
  const [file, setFile] = useState(null);
  const [patients, setPatients] = useState([]);
  const base = process.env.NEXT_PUBLIC_API_BASE || "";

  // ✅ Fetch patients (with token)
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${base}/api/patients`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        setPatients(res.data);
      } catch (err) {
        console.error("Failed to fetch patients:", err);
      }
    };
    fetchPatients();
  }, [base]);

  // ✅ Handle form submission (with token)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !patient || !file)
      return alert("Please fill all required fields");

    const formData = new FormData();
    formData.append("title", title);
    formData.append("description", description);
    formData.append("patient", patient);
    formData.append("file", file);

    try {
      const token = localStorage.getItem("token");
      await axios.post(`${base}/api/reports`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      // ✅ Success toast
      alert("✅ Report uploaded successfully!");
      setTitle("");
      setDescription("");
      setPatient("");
      setFile(null);
    } catch (err) {
      alert(err.response?.data?.error || err.message);
      console.error("Upload failed:", err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-blue-100 to-blue-200 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-3xl font-bold mb-6 text-blue-900">Upload Report</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-gray-700 font-medium mb-1">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-gray-700 font-medium mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {/* Patient */}
          <div>
            <label className="block text-gray-700 font-medium mb-1">
              Patient
            </label>
            <select
              value={patient}
              onChange={(e) => setPatient(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-400"
            >
              <option value="">-- Select Patient --</option>
              {patients.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-gray-700 font-medium mb-1">
              Upload File
            </label>
            <input
              type="file"
              onChange={(e) => setFile(e.target.files[0])}
              className="w-full"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition"
          >
            Upload
          </button>
        </form>
      </div>
    </div>
  );
}
