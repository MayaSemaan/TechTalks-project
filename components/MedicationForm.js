"use client";

export default function MedicationForm({ newMed, setNewMed, onSave }) {
  return (
    <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-2xl p-6 mb-6 shadow-md">
      <h2 className="text-xl font-semibold text-purple-700 mb-4">➕ Add New Medication</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <input
          placeholder="Medication Name"
          value={newMed.name}
          onChange={(e) => setNewMed({ ...newMed, name: e.target.value })}
          className="border border-purple-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-purple-400 text-black"
        />
        <input
          placeholder="Dosage"
          value={newMed.dosage}
          onChange={(e) => setNewMed({ ...newMed, dosage: e.target.value })}
          className="border border-purple-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-purple-400 text-black"
        />
        <input
          placeholder="Schedule"
          value={newMed.schedule}
          onChange={(e) => setNewMed({ ...newMed, schedule: e.target.value })}
          className="border border-purple-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-purple-400 text-black"
        />
        <select
          value={newMed.status}
          onChange={(e) => setNewMed({ ...newMed, status: e.target.value })}
          className="border border-purple-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-purple-400 text-black"
        >
          <option value="taken">Taken</option>
          <option value="missed">Missed</option>
        </select>
      </div>
      <button
        onClick={onSave}
        className="mt-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-5 py-2 rounded-xl font-semibold shadow-md hover:opacity-90 transition"
      >
        Save Medication
      </button>
    </div>
  );
}
