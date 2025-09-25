"use client";

export default function MedicationList({ medications, onEdit, onDelete }) {
  if (!medications || medications.length === 0)
    return <p className="text-gray-600 mt-4">No medications added yet.</p>;

  return (
    <ul className="flex flex-col gap-4">
      {medications.map((m) => (
        <li
          key={m._id || m.id}
          className="bg-white shadow-md rounded-lg p-4 flex flex-col md:flex-row justify-between items-start md:items-center hover:shadow-xl transform transition-all duration-200"
        >
          <div className="flex flex-col gap-1">
            <p className="font-semibold text-gray-800 text-lg">{m.name}</p>
            <p className="text-gray-600">
              {m.dosage} {m.unit} | {m.type} | {m.frequency}
            </p>
            {m.times && m.times.length > 0 && (
              <p className="text-gray-500 text-sm">
                Times: {m.times.join(", ")}
              </p>
            )}
            {m.startDate && m.endDate && (
              <p className="text-gray-500 text-sm">
                {m.startDate} → {m.endDate}
              </p>
            )}
          </div>
          <div className="flex gap-2 mt-2 md:mt-0">
            <button
              onClick={() => onEdit(m)}
              className="px-3 py-1 rounded bg-gradient-to-r from-blue-400 to-purple-500 text-white font-medium hover:from-blue-500 hover:to-purple-600 transition-all"
            >
              Edit
            </button>
            <button
              onClick={() => onDelete(m._id || m.id)}
              className="px-3 py-1 rounded bg-red-500 text-white font-medium hover:bg-red-600 transition-all"
            >
              Delete
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
