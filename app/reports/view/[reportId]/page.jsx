"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useParams, useRouter } from "next/navigation";

export default function SingleReportPage() {
  const { reportId } = useParams();
  const router = useRouter();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const base = process.env.NEXT_PUBLIC_API_BASE || "";

  // Fetch report
  useEffect(() => {
    if (!reportId) return;

    const fetchReport = async () => {
      try {
        setLoading(true);

        if (typeof window === "undefined") return;

        const token = localStorage.getItem("token");
        if (!token) {
          // User not logged in, redirect to login
          router.replace("/login");
          return;
        }

        const res = await axios.get(`${base}/api/reports/${reportId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setReport(res.data);
      } catch (err) {
        console.error("Failed to fetch report:", err);

        if (err.response?.status === 401 || err.response?.status === 403) {
          setError("Unauthorized. Redirecting to login...");
          setTimeout(() => router.replace("/login"), 2000);
        } else {
          setError(err.response?.data?.error || "Failed to load report");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [reportId, router, base]);

  // Robust Back to Dashboard button
  const handleBack = () => {
    if (typeof window === "undefined") return;

    const userId = localStorage.getItem("userId");

    if (userId) {
      // Navigate to the dashboard for this user
      router.replace(`/dashboard/${userId}`);
    } else {
      // If no userId, send to login page
      router.replace("/login");
    }
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-50">
        <p className="text-lg text-gray-700">Loading report...</p>
      </div>
    );

  if (error)
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <p className="text-lg text-red-600 font-semibold">{error}</p>
      </div>
    );

  if (!report)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-lg text-gray-600">No report found.</p>
      </div>
    );

  const date = report.createdAt || report.uploadedAt || null;
  const formattedDate = date ? new Date(date).toLocaleString() : "Unknown";

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-blue-100 to-blue-200 py-10 px-6">
      <div className="max-w-3xl mx-auto bg-white shadow-lg rounded-2xl p-8 border border-blue-200 relative">
        <button
          onClick={handleBack}
          className="absolute top-4 right-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm transition"
        >
          ← Back to Dashboard
        </button>

        <h1 className="text-3xl font-bold text-blue-900 mb-4">
          {report.title}
        </h1>
        <p className="text-gray-700 mb-6">{report.description}</p>

        <div className="space-y-3 text-gray-600">
          <p>
            <span className="font-semibold text-blue-800">Doctor:</span>{" "}
            {report.doctor?.name || "Unknown"}
          </p>
          <p>
            <span className="font-semibold text-blue-800">Patient:</span>{" "}
            {report.patient?.name || "Unknown"}
          </p>
          <p>
            <span className="font-semibold text-blue-800">Date:</span>{" "}
            {formattedDate}
          </p>
        </div>

        {report.fileUrl && (
          <div className="mt-8 flex gap-4">
            <a
              href={report.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-blue-500 hover:bg-blue-600 text-white px-5 py-2 rounded-lg transition"
            >
              View Report File
            </a>
            <a
              href={`/api/reports/view/${report._id}/download`}
              download
              className="bg-green-500 hover:bg-green-600 text-white px-5 py-2 rounded-lg transition"
            >
              Download PDF
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
