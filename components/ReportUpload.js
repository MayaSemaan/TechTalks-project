"use client";
import { useState } from "react";

export default function ReportUpload({ onUploaded }) {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!file) return alert("Select a file first");

    const fd = new FormData();
    fd.append("title", title);
    fd.append("file", file);

    try {
      const res = await fetch("/api/reports", { method: "POST", body: fd });
      if (!res.ok) throw new Error("Upload failed");

      alert("Report uploaded successfully ✅");
      setFile(null);
      setTitle("");

      // Tell parent or page to refresh reports
      if (onUploaded) onUploaded();
    } catch (err) {
      alert("Error uploading: " + err.message);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 mt-6">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Report title"
        className="border p-2 rounded w-40"
      />
      <input
        type="file"
        onChange={(e) => setFile(e.target.files[0])}
        className="border p-2 rounded w-48"
      />
      <button type="submit" className="bg-green-600 text-white px-3 py-2 rounded">
        Upload
      </button>
    </form>
  );
}
