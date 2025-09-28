import { useEffect, useState } from "react";

export default function Dashboard({ userId }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    async function fetchData() {
      const res = await fetch(`/api/dashboard/${userId}`);
      const json = await res.json();
      setData(json);
    }
    fetchData();
  }, [userId]);

  if (!data) return <p>Loading...</p>;

  return (
    <div>
      <h1>Dashboard</h1>

      <h2>Medications</h2>
      <table border="1">
        <thead>
          <tr><th>Name</th><th>Dosage</th><th>Schedule</th><th>Status</th></tr>
        </thead>
        <tbody>
          {data.medications.map((m) => (
            <tr key={m._id}>
              <td>{m.name}</td>
              <td>{m.dosage}</td>
              <td>{m.schedule}</td>
              <td>{m.status}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Reports</h2>
      <ul>
        {data.reports.map((r) => (
          <li key={r._id}>
            {r.title} - <a href={`/api/reports/${r._id}/download`}>Download</a>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Get userId from URL
Dashboard.getInitialProps = async ({ query }) => {
  return { userId: query.userId };
};