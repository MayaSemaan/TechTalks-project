"use client";

import { useEffect, useState } from "react";
import axios from "axios";

export default function ReportsPage({ params }) {
  const { patientId } = params;
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const base = process.env.NEXT_PUBLIC_API_BASE || "";

  useEffect(() => {
    if (!patientId) return;

    const fetchReports = async () => {
      setLoading(true);
      try {
        const res = await axios.get(
          `${base}/api/reports?patientId=${patientId}`
        );
        setReports(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, [patientId]);

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-blue-100 to-blue-200 p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold mb-6 text-blue-900">
          Patient Reports
        </h1>

        {reports.length === 0 ? (
          <p className="text-gray-600">No reports found for this patient.</p>
        ) : (
          <div className="grid gap-4">
            {reports.map((r) => (
              <div
                key={r._id}
                className="bg-white shadow-lg rounded-xl p-6 flex justify-between items-center"
              >
                <div>
                  <p className="font-semibold text-lg">{r.title}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Uploaded: {new Date(r.uploadedAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex gap-3">
                  <a
                    href={r.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 rounded-lg border border-blue-500 text-blue-600 hover:bg-blue-50 transition font-medium"
                  >
                    View
                  </a>
                  <a
                    href={r.fileUrl}
                    download
                    className="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition font-medium"
                  >
                    Download
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
