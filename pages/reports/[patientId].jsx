"use client";

import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import axios from "axios";

export default function ReportsPage() {
  const router = useRouter();
  const { patientId } = router.query;
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
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Reports</h1>
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
