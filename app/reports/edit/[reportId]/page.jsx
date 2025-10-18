"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import ReportForm from "../../../components/ReportForm.jsx";

export default function EditReportPage() {
  const { reportId } = useParams();
  const router = useRouter();

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const loadReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/reports/${reportId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to fetch report");
      const data = await res.json();

      setReport({
        ...data,
        fileName:
          data.fileName || (data.fileUrl ? data.fileUrl.split("/").pop() : ""),
        fileUrl: data.fileUrl || null,
      });
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [reportId]);

  const handleSave = async (formData) => {
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/reports/${reportId}`, {
        method: "PUT",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to update report");
      }

      const updatedReport = await res.json();

      setReport({
        ...updatedReport,
        fileName: updatedReport.fileName || "Existing PDF",
        fileUrl: updatedReport.fileUrl || updatedReport.filePath || null,
      });

      if (updatedReport.doctor?._id && updatedReport.patient?._id) {
        router.push(
          `/dashboard/doctor/${updatedReport.doctor._id}/patient/${updatedReport.patient._id}`
        );
      } else {
        router.push("/dashboard");
      }
    } catch (err) {
      console.error(err);
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="p-6">Loading...</p>;
  if (error) return <p className="p-6 text-red-600">Error: {error}</p>;

  return (
    <div className="min-h-screen p-6 md:p-12 bg-blue-50">
      <div className="max-w-3xl mx-auto bg-white p-6 rounded-xl shadow-md">
        <h1 className="text-2xl font-bold mb-4 text-blue-900">Edit Report</h1>
        <ReportForm
          initialData={report}
          onSave={handleSave}
          onCancel={() => router.back()}
          saving={saving}
        />
      </div>
    </div>
  );
}
