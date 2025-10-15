"use client";
import { useState, useEffect } from "react";
import axios from "axios";

export default function DoctorReports() {
  const [activeTab, setActiveTab] = useState("patient");
  const [reports, setReports] = useState([]);

  // Fetch reports from backend
  const fetchReports = async () => {
    try {
      const res = await axios.get("http://localhost:5000/reports");
      setReports(res.data);
    } catch (err) {
      console.error("Error fetching reports:", err);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  // Handle upload
  const handleUpload = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    try {
      await axios.post("http://localhost:5000/reports", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      alert("Report uploaded successfully!");
      e.target.reset();
      fetchReports(); // refresh reports
    } catch (err) {
      console.error(err);
      alert("Upload failed.");
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-md p-4">
      <h2 className="text-lg font-semibold mb-4 text-gray-700">Doctor Reports</h2>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200 mb-4">
        <button
          onClick={() => setActiveTab("patient")}
          className={`pb-2 font-medium ${
            activeTab === "patient"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-500"
          }`}
        >
          Patient View
        </button>
        <button
          onClick={() => setActiveTab("doctor")}
          className={`pb-2 font-medium ${
            activeTab === "doctor"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-500"
          }`}
        >
          Doctor View
        </button>
      </div>

      {/* Patient Reports List */}
      {activeTab === "patient" && (
        <div>
          {reports.length > 0 ? (
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-blue-600 text-white text-left">
                  <th className="p-2">Report</th>
                  <th className="p-2">Date</th>
                  <th className="p-2">Doctor</th>
                  <th className="p-2">Download</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r, i) => (
                  <tr key={i} className="border-b hover:bg-gray-50">
                    <td className="p-2">{r.reportType}</td>
                    <td className="p-2">{r.date}</td>
                    <td className="p-2">{r.doctor}</td>
                    <td className="p-2">
                      <a
                        href={`http://localhost:5000/${r.filePath}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-blue-500 text-white px-3 py-1 rounded-md hover:bg-blue-600"
                      >
                        Download
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-gray-500">No reports available.</p>
          )}
        </div>
      )}

      {/* Doctor Upload */}
      {activeTab === "doctor" && (
        <div>
          <p className="text-gray-600 mb-3">
            Upload or manage your patient reports here:
          </p>

          <form
            onSubmit={handleUpload}
            className="flex flex-col gap-2 max-w-md"
          >
            <input
              type="text"
              name="patient"
              placeholder="Patient Name"
              required
              className="border px-2 py-1 rounded"
            />
            <input
              type="text"
              name="reportType"
              placeholder="Report Type"
              required
              className="border px-2 py-1 rounded"
            />
            <input
              type="date"
              name="date"
              required
              className="border px-2 py-1 rounded"
            />
            <input
              type="file"
              name="file"
              required
              className="border px-2 py-1 rounded"
            />
            <button
              type="submit"
              className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600"
            >
              + Upload New Report
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
