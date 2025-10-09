"use client";

import { useState, useEffect } from "react";

export default function MedicationCard({ med, onEdit, onDelete, onDoseClick }) {
  const [localDoses, setLocalDoses] = useState([]);
  const [remindersOn, setRemindersOn] = useState(false);

  useEffect(() => {
    setRemindersOn(!!med.reminders);

    const sortedTimes = [...(med.times || [])].sort();
    setLocalDoses(
      sortedTimes.map((time) => {
        const dose = med.doses?.find((d) => d.time === time) || {};
        const status =
          dose.taken === true || dose.taken === "taken"
            ? "taken"
            : dose.taken === false || dose.taken === "missed"
            ? "missed"
            : "pending";
        return { time, status };
      })
    );
  }, [med]);

  const handleMark = async (time, status) => {
    setLocalDoses((prev) =>
      prev.map((d) => (d.time === time ? { ...d, status } : d))
    );

    if (typeof onDoseClick === "function") {
      await onDoseClick(med._id, time, status);
    }
  };

  const getStatusColor = (status) =>
    status === "taken"
      ? "text-green-500"
      : status === "missed"
      ? "text-red-500"
      : "text-orange-500";

  const formatDate = (dateStr) =>
    dateStr ? new Date(dateStr).toLocaleDateString() : "-";

  const formatCustomInterval = (interval) => {
    if (!interval) return "";
    const { number, unit } = interval;
    return `Every ${number} ${unit}${number > 1 ? "s" : ""}`;
  };

  return (
    <div className="p-4 rounded-xl shadow-md mb-4 bg-white">
      <h3 className="font-semibold text-lg">
        {med.name} - {med.dosage} {med.unit} ({med.type})
      </h3>

      <p className="text-sm text-gray-600 mt-1">
        <strong>Frequency:</strong>{" "}
        {med.schedule === "custom"
          ? formatCustomInterval(med.customInterval)
          : med.schedule?.charAt(0).toUpperCase() + med.schedule?.slice(1)}
      </p>

      <p className="text-sm text-gray-600">
        <strong>Start:</strong> {formatDate(med.startDate)} |{" "}
        <strong>End:</strong> {formatDate(med.endDate)}
      </p>

      <p className="text-sm mt-1">Reminders: {remindersOn ? "ON" : "OFF"}</p>

      {localDoses.length > 0 && (
        <div className="mt-2">
          {localDoses.map((d, i) => (
            <div
              key={i}
              className="flex items-center justify-between border-t pt-2 mt-2"
            >
              <span className="text-sm">
                {d.time} –{" "}
                <span className={`font-bold ${getStatusColor(d.status)}`}>
                  {d.status}
                </span>
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => handleMark(d.time, "taken")}
                  className="bg-green-500 text-white px-2 py-1 rounded-xl text-xs hover:bg-green-600"
                >
                  Taken
                </button>
                <button
                  onClick={() => handleMark(d.time, "missed")}
                  className="bg-red-500 text-white px-2 py-1 rounded-xl text-xs hover:bg-red-600"
                >
                  Missed
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {med.notes && (
        <p className="mt-2 text-sm text-gray-700">Notes: {med.notes}</p>
      )}

      <div className="flex gap-2 mt-3 flex-wrap">
        <button
          onClick={() => onEdit(med)}
          className="bg-blue-500 text-white px-3 py-1 rounded-xl hover:bg-blue-600 transition"
        >
          Edit
        </button>
        <button
          onClick={() => onDelete(med._id)}
          className="bg-gray-500 text-white px-3 py-1 rounded-xl hover:bg-gray-600 transition"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
