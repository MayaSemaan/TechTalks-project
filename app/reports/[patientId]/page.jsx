"use client";

import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import axios from "axios";

export default function ReportsPage({ params }) {
  const { patientId } = params; // using app router params
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!patientId) return;

    const base = process.env.NEXT_PUBLIC_API_BASE || "";
    setLoading(true);

    axios
      .get(`${base}/api/reports?patientId=${patientId}`)
      .then((res) => setReports(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [patientId]);

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 bg-gradient-to-br from-blue-50 via-white to-purple-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-6">Patient Reports</h1>

      {reports.length === 0 ? (
        <p className="text-gray-600">No reports found for this patient.</p>
      ) : (
        <div className="grid gap-4">
          {reports.map((r) => (
            <div
              key={r._id}
              className="card bg-white shadow-md rounded-lg p-4 flex justify-between items-center"
            >
              <div>
                <p className="font-semibold">{r.title}</p>
                <p className="text-sm text-gray-500">
                  Uploaded: {new Date(r.uploadedAt).toLocaleDateString()}
                </p>
              </div>

              <div className="flex gap-2">
                <a
                  href={r.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="underline text-blue-600"
                >
                  View
                </a>
                <a
                  href={r.fileUrl}
                  download
                  className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 transition"
                >
                  Download
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
