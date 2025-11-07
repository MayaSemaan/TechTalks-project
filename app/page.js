"use client";

import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-b from-blue-50 via-blue-100 to-blue-200 p-4 md:p-8">
      {/* Hero Section */}
      <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-blue-900 mb-4 sm:mb-6 text-center leading-snug">
        Welcome to HealthTrack
      </h1>
      <p className="text-base sm:text-lg md:text-xl text-blue-800 mb-6 sm:mb-10 text-center max-w-full sm:max-w-xl px-2">
        Track medications, monitor health reports, and stay on top of care —
        whether you are managing your own health, supporting a family member, or
        caring for your patients.
      </p>

      {/* Action Buttons */}
      <div className="flex gap-4 sm:gap-6 mb-8 sm:mb-12 flex-wrap justify-center w-full">
        <button
          onClick={() => router.push("/login")}
          className="bg-blue-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-xl hover:bg-blue-700 transition font-semibold w-full sm:w-auto"
        >
          Login
        </button>
        <button
          onClick={() => router.push("/signup")}
          className="bg-green-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-xl hover:bg-green-700 transition font-semibold w-full sm:w-auto"
        >
          Sign Up
        </button>
      </div>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-8 max-w-6xl w-full px-2 sm:px-0">
        <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 flex flex-col items-center text-center">
          <h2 className="font-semibold text-blue-900 mb-2 text-lg sm:text-xl">
            For Patients
          </h2>
          <p className="text-gray-700 text-sm sm:text-base">
            Manage your own medications and view your health reports easily in
            one place.
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 flex flex-col items-center text-center">
          <h2 className="font-semibold text-blue-900 mb-2 text-lg sm:text-xl">
            For Family Caregivers
          </h2>
          <p className="text-gray-700 text-sm sm:text-base">
            Track the medications and health reports of your loved ones, and
            stay informed about their care.
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 flex flex-col items-center text-center">
          <h2 className="font-semibold text-blue-900 mb-2 text-lg sm:text-xl">
            For Doctors
          </h2>
          <p className="text-gray-700 text-sm sm:text-base">
            Monitor your patients’ medications, upload health reports, and
            provide better care through our dashboard.
          </p>
        </div>
      </div>
    </div>
  );
}
