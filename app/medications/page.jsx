"use client";

import { useState, useEffect } from "react";
import MedicationForm from "../../components/MedicationForm.jsx";
import MedicationList from "../../components/MedicationList.jsx";
import axios from "axios";

export default function MedicationsPage() {
  const [medications, setMedications] = useState([]);
  const [editingMed, setEditingMed] = useState(null);

  const fetchMeds = async () => {
    try {
      const base = process.env.NEXT_PUBLIC_API_BASE || "";
      const res = await axios.get(`${base}/api/medications`);
      setMedications(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchMeds();
  }, []);

  const handleSave = async (med) => {
    try {
      const base = process.env.NEXT_PUBLIC_API_BASE || "";
      if (editingMed) {
        await axios.put(`${base}/api/medications/${med.id}`, med);
      } else {
        await axios.post(`${base}/api/medications`, med);
      }
      setEditingMed(null);
      fetchMeds();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    try {
      const base = process.env.NEXT_PUBLIC_API_BASE || "";
      await axios.delete(`${base}/api/medications/${id}`);
      fetchMeds();
    } catch (err) {
      console.error(err);
    }
  };

  const handleEdit = (med) => setEditingMed(med);

  return (
    <div className="p-6 max-w-2xl mx-auto bg-gradient-to-br from-blue-50 via-white to-purple-50 min-h-screen rounded-lg">
      <MedicationForm
        onSave={handleSave}
        onCancel={() => setEditingMed(null)}
        initialData={editingMed}
      />
      <div className="mt-6">
        <MedicationList
          medications={medications}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </div>
    </div>
  );
}
