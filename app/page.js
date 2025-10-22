"use client";

import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-b from-blue-50 via-blue-100 to-blue-200 p-8">
      <h1 className="text-4xl md:text-5xl font-bold text-blue-900 mb-6 text-center">
        Welcome to HealthTrack
      </h1>
      <p className="text-lg md:text-xl text-blue-800 mb-10 text-center max-w-xl">
        Track medications, monitor health reports, and stay on top of care —
        whether you are managing your own health, supporting a family member, or
        caring for your patients.
      </p>

      <div className="flex gap-6 mb-12 flex-wrap justify-center">
        <button
          onClick={() => router.push("/login")}
          className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition font-semibold"
        >
          Login
        </button>
        <button
          onClick={() => router.push("/signup")}
          className="bg-green-600 text-white px-6 py-3 rounded-xl hover:bg-green-700 transition font-semibold"
        >
          Sign Up
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl w-full text-center">
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="font-semibold text-blue-900 mb-2">For Patients</h2>
          <p className="text-gray-700">
            Manage your own medications and view your health reports easily in
            one place.
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="font-semibold text-blue-900 mb-2">
            For Family Caregivers
          </h2>
          <p className="text-gray-700">
            Track the medications and health reports of your loved ones, and
            stay informed about their care.
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="font-semibold text-blue-900 mb-2">For Doctors</h2>
          <p className="text-gray-700">
            Monitor your patients’ medications, upload health reports, and
            provide better care through our dashboard.
          </p>
        </div>
      </div>
    </div>
  );
}
