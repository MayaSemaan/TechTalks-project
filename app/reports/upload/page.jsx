"use client";
import { useState } from "react";

export default function UploadReportPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    const doctorId = "PUT_DOCTOR_ID_HERE"; // replace with doctor’s _id
    const patientId = "PUT_PATIENT_ID_HERE"; // later maybe dynamic

    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        doctor: doctorId,
        patient: patientId,
        title,
        description,
        fileUrl,
      }),
    });

    const data = await res.json();
    if (data.success) {
      setMessage("Report uploaded successfully ✅");
      setTitle("");
      setDescription("");
      setFileUrl("");
    } else {
      setMessage("❌ Error: " + data.error);
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto">
      <h1 className="text-xl font-bold mb-4">Upload Report</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          placeholder="Report Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full p-2 border rounded"
        />
        <textarea
          placeholder="Report Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full p-2 border rounded"
        />
        <input
          type="text"
          placeholder="File URL (just a link for now)"
          value={fileUrl}
          onChange={(e) => setFileUrl(e.target.value)}
          className="w-full p-2 border rounded"
        />
        <button
          type="submit"
          className="w-full bg-blue-600 text-white p-2 rounded"
        >
          Upload
        </button>
      </form>
      {message && <p className="mt-4">{message}</p>}
    </div>
  );
}
