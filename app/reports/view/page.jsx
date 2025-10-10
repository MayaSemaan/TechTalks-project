"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import Link from "next/link";

export default function ViewReportsPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [role, setRole] = useState("");
  const base = process.env.NEXT_PUBLIC_API_BASE || "";

  useEffect(() => {
    if (typeof window === "undefined") return;

    const fetchReports = async () => {
      try {
        setLoading(true);
        setError("");

        const token = localStorage.getItem("token");
        const userRole = localStorage.getItem("role") || "patient";
        setRole(userRole);

        if (!token) {
          setError("You must be logged in to view reports.");
          setReports([]);
          return;
        }

        const res = await axios.get(`${base}/api/reports`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setReports(res.data || []);
      } catch (err) {
        console.error("Failed to fetch reports:", err);
        setError(err.response?.data?.error || "Failed to load reports");
        setReports([]);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, [base]);

  const getRoleText = () => {
    switch (role) {
      case "patient":
        return "Showing your reports";
      case "doctor":
        return "Showing reports for your patients";
      case "family":
        return "Showing reports for linked family members";
      default:
        return "Showing accessible reports";
    }
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-50 p-8">
        <p className="text-lg text-gray-700">Loading reports...</p>
      </div>
    );

  if (error)
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50 p-8">
        <p className="text-lg text-red-600 font-semibold">{error}</p>
      </div>
    );

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-blue-100 to-blue-200 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2 text-blue-900">View Reports</h1>
        {role && (
          <p className="text-gray-700 mb-6 font-semibold">{getRoleText()}</p>
        )}

        {reports.length === 0 ? (
          <p className="text-gray-600 text-lg">
            No reports available for you at this time.
          </p>
        ) : (
          <div className="space-y-4">
            {reports.map((report) => (
              <div
                key={report._id}
                className="bg-white shadow-md rounded-lg p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center"
              >
                <div>
                  <h2 className="text-xl font-semibold text-blue-800">
                    {report.title}
                  </h2>
                  <p className="text-gray-700">{report.description}</p>
                  <p className="text-gray-500 text-sm mt-1">
                    Patient: {report.patient?.name || "Unknown"}
                  </p>
                </div>
                {report.fileUrl && (
                  <Link
                    href={`/reports/view/${report._id}`}
                    className="mt-3 sm:mt-0 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition"
                  >
                    {role === "patient"
                      ? "View Your Report"
                      : role === "doctor"
                      ? "View Patient Report"
                      : role === "family"
                      ? "View Family Report"
                      : "View Report"}
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
