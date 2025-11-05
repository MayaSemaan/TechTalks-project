import crypto from "crypto";

// ---------- Date & Time Helpers ----------
export const parseDateSafe = (val) => {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
};

export const toISOStringSafe = (val) => {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d.toISOString();
};

export const normalizeTime = (t) => {
  if (!t) return "00:00";
  const [h, m] = t.split(":").map((n) => n.padStart(2, "0"));
  return `${h}:${m}`;
};

// ---------- Frequency Formatter ----------
export function formatFrequency({ schedule, customInterval }) {
  if (!schedule) return "Unknown";

  switch (schedule) {
    case "daily":
      return "Every day";
    case "weekly":
      return "Every week";
    case "monthly":
      return "Every month";
    case "custom":
      if (customInterval && customInterval.number && customInterval.unit) {
        const plural =
          customInterval.number > 1
            ? `${customInterval.unit}s`
            : customInterval.unit;
        return `Every ${customInterval.number} ${plural}`;
      }
      return "Custom interval";
    default:
      return schedule.charAt(0).toUpperCase() + schedule.slice(1);
  }
}

// ---------- Dose Generation Logic ----------
export const shouldGenerateDose = (med, day) => {
  if (!med.startDate) return false;
  const start = new Date(med.startDate);
  const d = new Date(day);

  // Normalize time for day comparison
  start.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);

  if (d < start) return false;

  const schedule = med.schedule || "daily";

  switch (schedule) {
    case "daily":
      return true;
    case "weekly":
      return (d.getDay() - start.getDay() + 7) % 7 === 0;
    case "monthly":
      return d.getDate() === start.getDate();
    case "custom": {
      const ci = med.customInterval || {};
      const n = Number(ci.number) || 1;
      const unit = ci.unit || "day";

      if (unit === "day")
        return Math.floor((d - start) / (1000 * 60 * 60 * 24)) % n === 0;
      if (unit === "week")
        return Math.floor((d - start) / (1000 * 60 * 60 * 24 * 7)) % n === 0;
      if (unit === "month") {
        const months =
          (d.getFullYear() - start.getFullYear()) * 12 +
          (d.getMonth() - start.getMonth());
        return months % n === 0 && d.getDate() === start.getDate();
      }
      return false;
    }
    default:
      return false;
  }
};

// ---------- Deduplicate Doses ----------
export const dedupeDoses = (doses) => {
  const map = new Map();
  (Array.isArray(doses) ? doses : []).forEach((d) => {
    if (!d.date || !d.time) return;
    const key = `${d.date}-${normalizeTime(d.time)}`;
    const existing = map.get(key);
    if (!existing || (existing.taken === null && d.taken !== null)) {
      map.set(key, {
        ...d,
        time: normalizeTime(d.time),
        doseId: d.doseId || crypto.randomUUID(),
      });
    }
  });
  return Array.from(map.values());
};

// ---------- Check if two dates are the same day ----------
export const isSameDay = (d1, d2) => {
  if (!d1 || !d2) return false;
  const date1 = new Date(d1);
  const date2 = new Date(d2);
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};
