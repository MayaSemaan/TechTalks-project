"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function DoctorDashboardPage() {
  const { doctorId } = useParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [doctorData, setDoctorData] = useState({
    doctorName: "",
    totalPatients: 0,
    patients: [],
  });

  const loadDoctorData = async () => {
    if (!doctorId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/dashboard/doctor/${doctorId}/patients`);
      const contentType = res.headers.get("content-type");
      if (!contentType?.includes("application/json")) {
        throw new Error("Invalid response from server, expected JSON");
      }
      const result = await res.json();
      if (!result.success) throw new Error(result.error);

      setDoctorData({
        doctorName: result.data.doctorName,
        totalPatients: result.data.totalPatients,
        patients: result.data.patients.map((p) => ({
          patientId: p.patientId,
          patientName: p.patientName,
          patientEmail: p.patientEmail,
          complianceTotal: p.complianceTotal,
          dosesTaken: p.dosesTaken,
          dosesMissed: p.dosesMissed,
          dosesPending: p.dosesPending,
          totalReports: p.totalReports,
        })),
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDoctorData();
  }, [doctorId]);

  const goToPatientDashboard = (patientId) =>
    router.push(`/dashboard/patient/${patientId}`);

  if (loading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>;

  return (
    <div className="min-h-screen p-8 bg-blue-50">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-900">
            Dr. {doctorData.doctorName}'s Dashboard
          </h1>
          <span className="text-lg font-semibold text-blue-900">
            Total Patients: {doctorData.totalPatients}
          </span>
        </header>

        <section className="bg-white shadow-md rounded-xl p-6">
          <h2 className="font-semibold text-blue-900 mb-4">Patients</h2>

          {doctorData.patients.length === 0 ? (
            <p className="text-gray-600">No patients assigned.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {doctorData.patients.map((p, index) => (
                <div
                  key={p.patientId || `patient-${index}`}
                  className="border rounded-xl p-4 flex flex-col justify-between bg-blue-100 hover:bg-blue-200 transition"
                >
                  <div className="mb-3">
                    <p className="text-lg font-bold text-blue-900">
                      {p.patientName || "Unnamed Patient"}
                    </p>
                    <p className="text-sm text-gray-700">{p.patientEmail}</p>
                  </div>

                  <div className="text-sm space-y-1">
                    <p>Compliance: {p.complianceTotal}%</p>
                    <p>Taken: {p.dosesTaken}</p>
                    <p>Missed: {p.dosesMissed}</p>
                    <p>Pending: {p.dosesPending}</p>
                    <p>Total Reports: {p.totalReports}</p>
                  </div>

                  <button
                    onClick={() =>
                      router.push(
                        `/dashboard/doctor/${doctorId}/patient/${p.patientId}`
                      )
                    }
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
