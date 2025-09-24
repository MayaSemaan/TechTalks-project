"use client";

import { useEffect, useState } from "react";
import axios from "axios";

export default function ViewReportsPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const base = process.env.NEXT_PUBLIC_API_BASE || "";
        const res = await axios.get(`${base}/api/reports`);
        setReports(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">All Reports</h1>
      <ul>
        {reports.map((r) => (
          <li key={r._id} className="mb-2">
            <a
              href={r.fileUrl}
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              {r.title}
            </a>
            <span className="ml-2 text-sm text-gray-500">
              {new Date(r.uploadedAt).toLocaleDateString()}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
