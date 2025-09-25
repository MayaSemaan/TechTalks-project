"use client";

import { useState } from "react";

export default function ViewReportsPage() {
  // Empty list for now, will fetch real reports later
  const [reports, setReports] = useState([]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-blue-100 to-blue-200 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-blue-900">View Reports</h1>

        {reports.length === 0 ? (
          <p className="text-gray-600 text-lg">No reports available.</p>
        ) : (
          <div className="space-y-4">
            {reports.map((report) => (
              <div
                key={report.id}
                className="bg-white shadow-md rounded-lg p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center"
              >
                <div>
                  <h2 className="text-xl font-semibold text-blue-800">
                    {report.title}
                  </h2>
                  <p className="text-gray-700">{report.description}</p>
                  <p className="text-gray-500 text-sm mt-1">
                    Patient: {report.patientName || "Unknown"}
                  </p>
                </div>
                {report.fileUrl && (
                  <a
                    href={report.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 sm:mt-0 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition"
                  >
                    View File
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
