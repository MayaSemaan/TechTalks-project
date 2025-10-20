"use client";

import { useState, useEffect } from "react";

export default function ReportForm({ initialData, onSave, onCancel, saving }) {
  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(
    initialData?.description || ""
  );
  const [pdfFile, setPdfFile] = useState(null);
  const [currentFileName, setCurrentFileName] = useState(
    initialData?.fileName || initialData?.fileUrl?.split("/").pop() || ""
  );

  useEffect(() => {
    setTitle(initialData?.title || "");
    setDescription(initialData?.description || "");
    setCurrentFileName(
      initialData?.fileName || initialData?.fileUrl?.split("/").pop() || ""
    );
    setPdfFile(null);
  }, [initialData]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setPdfFile(file || null);
    setCurrentFileName(file ? file.name : initialData?.fileName || "");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !description) {
      alert("Title and description are required");
      return;
    }

    const formData = new FormData();
    formData.append("title", title);
    formData.append("description", description);
    if (pdfFile) formData.append("file", pdfFile);

    await onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Title */}
      <div>
        <label className="block font-semibold mb-1">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full border rounded px-3 py-2"
          required
        />
      </div>

      {/* Description */}
      <div>
        <label className="block font-semibold mb-1">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full border rounded px-3 py-2"
          rows={4}
          required
        />
      </div>

      {/* PDF Upload */}
      <div>
        <label className="block font-semibold mb-1">PDF File</label>
        <input
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          className="mb-2"
        />

        {/* Show current file info */}
        {!pdfFile && initialData?.fileUrl && currentFileName && (
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <span>Current file:</span>
            <a
              href={`${initialData.fileUrl}?t=${new Date().getTime()}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline hover:text-blue-800"
            >
              {currentFileName}
            </a>
          </div>
        )}

        {/* Show new file name after selecting */}
        {pdfFile && (
          <p className="text-sm text-green-600 mt-1">
            New file selected: {pdfFile.name}
          </p>
        )}
      </div>

      {/* Buttons */}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
        >
          {saving ? "Saving..." : "Save"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
