import { useEffect, useState } from "react";
import { fetchDashboardData } from "@/utils/api";

export default function DashboardPage() {
  const [data, setData] = useState(null);

  useEffect(() => {
    async function loadData() {
      const filters = {
        status: "",
        fromDate: "2025-10-01",
        toDate: "2025-10-05",
      };

      const result = await fetchDashboardData("68d1810de1e8d2230d03390a", filters);
      console.log("📦 Dashboard data:", result);
      setData(result);
    }
    loadData();
  }, []);

  if (!data) return <p>Loading...</p>;

  return (
    <div style={{ padding: "20px" }}>
      <h1>Dashboard Test</h1>
      <p>Total Medications: {data.totalMeds}</p>
      <p>Compliance: {data.compliance}%</p>

      <h3>Medications:</h3>
      <ul>
        {data.medications.map((med) => (
          <li key={med._id}>
            {med.name} — {med.status}
          </li>
        ))}
      </ul>
    </div>
  );
}
