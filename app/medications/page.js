"use client";

import { useEffect, useState } from "react";

export default function MedicationsPage() {
  const [medications, setMedications] = useState([]);

  useEffect(() => {
    async function fetchMeds() {
      try {
        const res = await fetch("/api/medications");
        const data = await res.json();
        setMedications(data);
      } catch (err) {
        console.error("Failed to fetch medications:", err);
      }
    }
    fetchMeds();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Medications</h1>
      <ul className="space-y-2">
        {medications.map((med) => (
          <li key={med._id} className="border p-2 rounded">
            <p>
              <strong>Name:</strong> {med.name}
            </p>
            <p>
              <strong>Dosage:</strong> {med.dosage}
            </p>
            <p>
              <strong>Status:</strong> {med.status}
            </p>
            <p>
              <strong>Schedule:</strong> {med.schedule}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
