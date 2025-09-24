"use client";

export default function MedicationList({ medications, onEdit, onDelete }) {
  if (!medications || medications.length === 0)
    return <p>No medications added yet.</p>;

  return (
    <ul className="flex flex-col gap-2">
      {medications.map((m) => (
        <li
          key={m._id || m.id}
          className="border p-3 rounded flex justify-between items-center"
        >
          <div>
            <p className="font-semibold">{m.name}</p>
            <p className="text-sm text-gray-600">
              {m.dosage} {m.unit}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onEdit(m)}
              className="bg-yellow-500 text-white px-2 py-1 rounded"
            >
              Edit
            </button>
            <button
              onClick={() => onDelete(m._id || m.id)}
              className="bg-red-500 text-white px-2 py-1 rounded"
            >
              Delete
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
