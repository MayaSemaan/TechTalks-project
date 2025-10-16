"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchDashboardData } from "../../../utils/api.js";
import ChartComponent from "../../../components/ChartComponent.jsx";

export default function FamilyDashboardPage() {
  const { userId } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState({
    meds: [],
    reports: [],
    chartData: [],
    metrics: {},
  });
  const [user, setUser] = useState({ name: "", role: "patient" });

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchDashboardData(userId);
      if (!result.success) throw new Error(result.error);

      setUser(result.user);
      setData({
        meds: result.medications,
        reports: result.reports,
        chartData: result.chartData,
        metrics: result.metrics,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [userId]);

  if (loading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>;

  return (
    <div className="min-h-screen p-6 bg-blue-50">
      <h1 className="text-2xl font-bold text-blue-900">
        {user.name}'s Dashboard
      </h1>
      {/* Display meds, reports, chart, but read-only */}
      <ChartComponent
        data={{
          labels: ["Taken", "Missed", "Pending"],
          values: [
            data.meds
              .flatMap((m) => m.filteredDoses || [])
              .filter((d) => d.taken === true).length,
            data.meds
              .flatMap((m) => m.filteredDoses || [])
              .filter((d) => d.taken === false).length,
            data.meds
              .flatMap((m) => m.filteredDoses || [])
              .filter((d) => d.taken == null).length,
          ],
          colors: ["#3b82f6", "#f97316", "#a3a3a3"],
        }}
      />
    </div>
  );
}
