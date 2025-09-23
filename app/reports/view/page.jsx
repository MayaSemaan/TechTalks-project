"use client";
import { useEffect, useState } from "react";

export default function ViewReportsPage() {
  const [reports, setReports] = useState([]);

  useEffect(() => {
    const doctorId = "PUT_DOCTOR_ID_HERE"; // use seeded Doctor _id
    fetch(`/api/reports?doctor=${doctorId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setReports(data.reports);
      })
      .catch((err) => console.error(err));
  }, []);

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-xl font-bold mb-4">My Reports</h1>
      {reports.length === 0 ? (
        <p>No reports found</p>
      ) : (
        <ul className="space-y-4">
          {reports.map((report) => (
            <li key={report._id} className="border p-4 rounded">
              <h2 className="font-semibold">{report.title}</h2>
              <p>{report.description}</p>
              <p className="text-sm text-gray-600">
                Patient: {report.patient?.name || "Unknown"}
              </p>
              {report.fileUrl && (
                <a
                  href={report.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline"
                >
                  View File
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
