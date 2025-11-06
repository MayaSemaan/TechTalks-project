"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import jwt_decode from "jwt-decode";

// Safe date formatter
const formatDate = (date) => {
  if (!date || date === "null" || date === "undefined") return "N/A";
  const d = typeof date === "string" ? new Date(date) : date;
  if (!(d instanceof Date) || isNaN(d.getTime())) return "N/A";
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function SingleReportPage() {
  const { reportId } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

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
          router.replace("/login");
          return;
        }

        const res = await axios.get(`${base}/api/reports/view/${reportId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        // API now returns the report directly
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

  // Back to Dashboard button
  const handleBack = () => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/login");
      return;
    }

    const fromDoctorId = searchParams.get("doctorId");
    const fromPatientId = searchParams.get("patientId");
    const fromFamilyId = searchParams.get("familyId");

    // Go back to the correct dashboard depending on query params
    if (fromDoctorId && fromPatientId) {
      router.replace(
        `/dashboard/doctor/${fromDoctorId}/patient/${fromPatientId}`
      );
      return;
    }

    if (fromFamilyId && fromPatientId) {
      router.replace(
        `/dashboard/family/${fromFamilyId}/patient/${fromPatientId}`
      );
      return;
    }

    if (fromPatientId && !fromDoctorId && !fromFamilyId) {
      router.replace(`/dashboard/patient/${fromPatientId}`);
      return;
    }

    // fallback: use role from token
    try {
      const decoded = jwt_decode(token);
      const role = decoded.role;
      const userId = decoded.id || decoded._id;
      router.replace(`/dashboard/${role}/${userId}`);
    } catch {
      router.replace("/dashboard");
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
          {report.title || "Untitled Report"}
        </h1>
        <p className="text-gray-700 mb-6">
          {report.description || "No description"}
        </p>

        <div className="space-y-3 text-gray-600">
          <p>
            <span className="font-semibold text-blue-800">Doctor:</span>{" "}
            {report.doctor?.name || "N/A"}
          </p>
          <p>
            <span className="font-semibold text-blue-800">Patient:</span>{" "}
            {report.patient?.name || "N/A"}
          </p>
          <p>
            <span className="font-semibold text-blue-800">Date:</span>{" "}
            {formatDate(report.createdAt || report.uploadedAt || report.date)}
          </p>
        </div>

        {report.fileUrl && (
          <div className="mt-8 flex flex-wrap gap-4">
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
              className="bg-gray-400 hover:bg-gray-500 text-white px-5 py-2 rounded-lg transition"
            >
              Download PDF
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
