"use client";
import { useEffect, useState } from "react";

export default function ReportList({ refreshTrigger }) {
  const [reports, setReports] = useState([]);

  async function loadReports() {
    try {
      const res = await fetch("/api/reports");
      if (!res.ok) throw new Error("Failed to fetch reports");
      const data = await res.json();
      setReports(data);
    } catch (err) {
      console.error("Error fetching reports:", err);
    }
  }

  useEffect(() => {
    loadReports();
  }, [refreshTrigger]); // reload whenever trigger changes

  if (!reports.length) {
    return (
      <div className="bg-white p-4 rounded-xl shadow-md mt-6 text-gray-600">
        No reports uploaded yet.
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-xl shadow-md mt-6">
      <h2 className="font-semibold text-lg mb-3 text-purple-700">📄 Uploaded Reports</h2>
      <ul className="divide-y divide-gray-200">
        {reports.map((r) => (
          <li key={r._id} className="flex justify-between items-center py-2">
            <span className="font-medium text-gray-800">{r.title}</span>
            <a
              href={r.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-600 hover:underline"
            >
              View 
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
