"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";

export default function ReportLinkPage({ params }) {
  const { reportId } = params;
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const base = process.env.NEXT_PUBLIC_API_BASE || "";

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const token = localStorage.getItem("token");

        if (!token) {
          router.push(`/login?redirect=/reports/view/${reportId}`);
          return;
        }

        const res = await axios.get(`${base}/api/reports/view/${reportId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setReport(res.data);
      } catch (err) {
        console.error("Failed to fetch report:", err);
        setError(
          err.response?.data?.error ||
            "You are not authorized to view this report."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [reportId, router, base]);

  if (loading) return <div className="p-6">Loading report...</div>;

  if (error)
    return (
      <div className="p-6 text-red-600">
        <p>{error}</p>
      </div>
    );

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-blue-100 to-blue-200 p-8">
      <div className="max-w-3xl mx-auto bg-white shadow-lg rounded-xl p-6">
        <h1 className="text-2xl font-bold text-blue-900 mb-4">
          {report.title}
        </h1>
        <p className="text-gray-700 mb-2">{report.description}</p>
        <p className="text-gray-500 text-sm mb-2">
          Doctor: {report.doctor?.name || "Unknown"}
        </p>
        <p className="text-gray-500 text-sm mb-4">
          Patient: {report.patient?.name || "Unknown"}
        </p>

        {report.fileUrl && (
          <div className="flex gap-4 mt-4">
            <a
              href={report.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
            >
              View File
            </a>
            <a
              href={report.fileUrl}
              download
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
            >
              Download File
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
