"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { useSearchParams, useRouter } from "next/navigation";

export default function UploadReportPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const patientId = searchParams.get("patientId");
  const doctorId = searchParams.get("doctorId");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState(null);
  const [checkingRole, setCheckingRole] = useState(true);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [reports, setReports] = useState([]);
  const base = process.env.NEXT_PUBLIC_API_BASE || "";

  // Check logged-in user role
  useEffect(() => {
    const checkDoctor = async () => {
      const token = localStorage.getItem("token");
      if (!token) return router.push("/login");

      try {
        const res = await axios.get(`${base}/api/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data.role !== "doctor") router.push("/");
      } catch {
        router.push("/login");
      } finally {
        setCheckingRole(false);
      }
    };
    checkDoctor();
  }, [base, router]);

  // Fetch reports
  useEffect(() => {
    const fetchReports = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(
          `${base}/api/reports/patient/${patientId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setReports(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    if (patientId) fetchReports();
  }, [patientId, base]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !file) {
      setErrorMessage("Title and file are required.");
      return setTimeout(() => setErrorMessage(""), 3000);
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) return setErrorMessage("You must be logged in.");

      const formData = new FormData();
      formData.append("title", title);
      formData.append("description", description);
      formData.append("patient", patientId);
      formData.append("file", file);

      const res = await axios.post(`${base}/api/reports`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // ✅ Immediately add new report
      setReports((prev) => [res.data, ...prev]);

      setSuccessMessage("Report uploaded successfully!");
      setTitle("");
      setDescription("");
      setFile(null);
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      console.error(err);
      setErrorMessage(err.response?.data?.error || err.message);
      setTimeout(() => setErrorMessage(""), 3000);
    }
  };

  if (checkingRole) return <div className="p-6">Checking permissions...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-blue-100 to-blue-200 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-8 relative">
        <button
          onClick={() => {
            if (doctorId && patientId) {
              router.push(`/dashboard/doctor/${doctorId}/patient/${patientId}`);
            } else {
              router.push("/dashboard");
            }
          }}
          className="mb-4 bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400 transition"
        >
          ← Back to Dashboard
        </button>

        <h1 className="text-3xl font-bold mb-6 text-blue-900">Upload Report</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
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

        {/* Messages */}
        {errorMessage && (
          <div className="absolute inset-0 flex justify-center items-center">
            <div className="bg-red-500 text-white px-6 py-4 rounded-lg shadow-lg text-center animate-fadeIn">
              {errorMessage}
            </div>
          </div>
        )}
        {successMessage && (
          <div className="absolute inset-0 flex justify-center items-center">
            <div className="bg-green-500 text-white px-6 py-4 rounded-lg shadow-lg text-center animate-fadeIn">
              {successMessage}
            </div>
          </div>
        )}

        {/* Reports List */}
        <div className="mt-8 space-y-4">
          {reports.map((r) => (
            <div key={r._id} className="border p-4 rounded-lg bg-gray-50">
              <h2 className="font-bold">{r.title}</h2>
              <p>{r.description}</p>
              {r.filePath && (
                <a
                  href={`${r.filePath}?t=${new Date().getTime()}`}
                  target="_blank"
                  className="text-blue-600 hover:underline"
                >
                  View File
                </a>
              )}
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}
