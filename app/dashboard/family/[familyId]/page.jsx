"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function FamilyDashboardPage() {
  const { familyId } = useParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [familyData, setFamilyData] = useState({
    familyName: "",
    totalPatients: 0,
    patients: [],
  });

  const loadFamilyData = async () => {
    if (!familyId) return;
    setLoading(true);
    setError(null);

    try {
      const token =
        typeof window !== "undefined" ? localStorage.getItem("token") : null;

      const res = await fetch(`/api/dashboard/family/${familyId}/patients`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const contentType = res.headers.get("content-type");
      if (!contentType?.includes("application/json")) {
        throw new Error("Invalid response from server, expected JSON");
      }

      const result = await res.json();
      if (!result.success) throw new Error(result.error);

      setFamilyData({
        familyName: result.data.familyName || "",
        totalPatients: result.data.totalPatients || 0,
        patients: result.data.patients.map((p) => ({
          patientId: p._id,
          patientName: p.name || "Unnamed Patient",
          patientEmail: p.email || "No email",
          totalMedications: p.totalMedications ?? 0, // ✅ Number of meds
          totalReports: p.totalReports ?? 0,
        })),
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFamilyData();
  }, [familyId]);

  const goToPatientDashboard = (patientId) => {
    if (!patientId) return;
    router.push(`/dashboard/family/${familyId}/patient/${patientId}`);
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>;

  return (
    <div className="min-h-screen p-8 bg-blue-50">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-900">
            {familyData.familyName}'s Dashboard
          </h1>
          <span className="text-lg font-semibold text-blue-900">
            Total Patients: {familyData.totalPatients}
          </span>
        </header>

        <section className="bg-white shadow-md rounded-xl p-6">
          <h2 className="font-semibold text-blue-900 mb-4">Patients</h2>

          {familyData.patients.length === 0 ? (
            <p className="text-gray-600">No linked patients.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {familyData.patients.map((p, index) => (
                <div
                  key={p.patientId || `patient-${index}`}
                  className="border rounded-xl p-4 flex flex-col justify-between bg-blue-100 hover:bg-blue-200 transition"
                >
                  <div className="mb-3">
                    <p className="text-lg font-bold text-blue-900">
                      {p.patientName}
                    </p>
                    <p className="text-sm text-gray-700">{p.patientEmail}</p>
                  </div>

                  <div className="text-sm space-y-1">
                    <p>Total Medications: {p.totalMedications}</p>
                    <p>Total Reports: {p.totalReports}</p>
                  </div>

                  <button
                    onClick={() => goToPatientDashboard(p.patientId)}
                    className="mt-3 bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 transition"
                  >
                    View Patient
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
