import { useEffect, useState } from "react";

export default function PatientReports({ patientId }) {
  const [reports, setReports] = useState([]);

  useEffect(() => {
    async function fetchReports() {
      const res = await fetch(`/api/reports/patient/${patientId}`);
      const json = await res.json();
      setReports(json);
    }
    fetchReports();
  }, [patientId]);

  if (!reports.length) return <p>No reports found.</p>;

  return (
    <div>
      <h1>Patient Reports</h1>
      <ul>
        {reports.map((r) => (
          <li key={r._id}>
            {r.title} - <a href={`/api/reports/${r._id}/download`}>Download</a>
          </li>
        ))}
      </ul>
    </div>
  );
}

PatientReports.getInitialProps = async ({ query }) => {
  return { patientId: query.patientId };
};