"use client";

import { useState, useEffect } from "react";

export default function MedicationCard({ med, onEdit, onDelete, onDoseClick }) {
  const [localDoses, setLocalDoses] = useState([]);
  const [remindersOn, setRemindersOn] = useState(false);

  useEffect(() => {
    setRemindersOn(!!med.reminders);

    // Sort scheduled times
    const sortedTimes = [...(med.times || [])].sort();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const updatedDoses = sortedTimes.map((time) => {
      const dose = (med.doses || []).find((d) => d.time === time) || {};
      const doseDate = dose.date ? new Date(dose.date) : null;
      let doseDayMatch = false;

      if (doseDate) {
        const d = new Date(doseDate);
        d.setHours(0, 0, 0, 0);
        doseDayMatch = d.getTime() === today.getTime();
      }

      let status = "Not for selected day";
      if (doseDayMatch) {
        if (dose.taken === true || dose.taken === "taken") status = "taken";
        else if (dose.taken === false || dose.taken === "missed")
          status = "missed";
        else status = "pending";
      }

      return {
        doseId: dose.doseId || `${med._id}-${time}`,
        time,
        taken: dose.taken ?? null,
        date: dose.date ?? null,
        status,
      };
    });

    setLocalDoses(updatedDoses);
  }, [med]);

  const handleMark = async (time, status) => {
    setLocalDoses((prev) =>
      prev.map((d) => (d.time === time ? { ...d, status } : d))
    );
    if (typeof onDoseClick === "function") {
      try {
        await onDoseClick(med._id, time, status);
      } catch (err) {
        console.error("onDoseClick error", err);
      }
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
    const number = interval.number || 1;
    const unit = interval.unit || "day";
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

      <div className="mt-2">
        {localDoses.length === 0 ? (
          <p className="text-gray-500 text-sm italic">No scheduled times.</p>
        ) : (
          localDoses.map((d) => (
            <div
              key={d.time}
              className="flex items-center justify-between border-t pt-2 mt-2"
            >
              <span className="text-sm">
                {d.time} –{" "}
                <span className={`font-bold ${getStatusColor(d.status)}`}>
                  {d.status === "pending"
                    ? "Pending (Today)"
                    : d.status === "Not for selected day"
                    ? "Not for selected day"
                    : d.status.charAt(0).toUpperCase() + d.status.slice(1)}
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
          ))
        )}
      </div>

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
