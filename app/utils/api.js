// Fetch dashboard data with meds, reports, chartData, metrics, and user info
export async function fetchDashboardData(userId, filters = {}) {
  try {
    const params = new URLSearchParams();

    // Medication filters
    if (filters.status) params.append("status", filters.status);
    if (filters.fromDate) params.append("fromDate", filters.fromDate);
    if (filters.toDate) params.append("toDate", filters.toDate);

    // Report filters
    if (filters.reportFromDate)
      params.append("reportFromDate", filters.reportFromDate);
    if (filters.reportToDate)
      params.append("reportToDate", filters.reportToDate);

    const token = localStorage.getItem("token");

    const res = await fetch(`/api/dashboard/${userId}?${params.toString()}`, {
      cache: "no-store",
      credentials: "include",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!res.ok) {
      let errData = {};
      try {
        const contentType = res.headers.get("content-type");
        if (contentType?.includes("application/json")) {
          errData = await res.json();
        } else {
          errData.error = await res.text();
        }
      } catch {
        errData.error = `API error: ${res.status}`;
      }
      throw new Error(errData.error || `API error: ${res.status}`);
    }

    const data = await res.json().catch(() => ({}));
    const user = data.user || { role: "patient", _id: userId };

    // Helper: safe ISO string
    const parseDateSafe = (val) => {
      if (!val) return null;
      const d = new Date(val);
      return isNaN(d.getTime()) ? null : d.toISOString();
    };

    // Helper: format frequency consistently
    const formatFrequency = (med) => {
      if (!med) return "N/A";
      if (med.schedule === "custom" && med.customInterval) {
        const number = med.customInterval.number || 1;
        const unit = med.customInterval.unit || "day";
        return `Every ${number} ${unit}${number > 1 ? "s" : ""}`;
      }
      return med.schedule || "daily";
    };

    const medications = (data.medications || []).map((m) => ({
      ...m,
      frequency: formatFrequency(m), // Always recompute
      startDate: parseDateSafe(m.startDate),
      endDate: parseDateSafe(m.endDate),
      filteredDoses: (m.filteredDoses || []).map((d) => ({
        ...d,
        date: parseDateSafe(d.date),
      })),
    }));

    return {
      success: true,
      user,
      loggedInUser: data.loggedInUser || { role: null, id: null },
      medications,
      reports: data.reports || [],
      chartData: data.chartData || [],
      metrics: data.metrics || {},
    };
  } catch (error) {
    console.error("fetchDashboardData error:", error);
    return { success: false, error: error.message };
  }
}

// Update a dose's taken status
export async function updateDoseStatus(medId, doseId, status, date) {
  if (!medId) throw new Error("Medication ID is required");
  if (!doseId) throw new Error("Dose ID is required");
  if (status === undefined || status === null)
    throw new Error("Status is required");

  try {
    const token = localStorage.getItem("token");

    // Send date if provided
    const body = { doseId, status };
    if (date) body.date = date; // date should be ISO string like "2025-11-03"

    const res = await fetch(`/api/medications/${medId}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      let errData = {};
      try {
        const contentType = res.headers.get("content-type");
        if (contentType?.includes("application/json")) {
          errData = await res.json();
        } else {
          errData.error = await res.text();
        }
      } catch {
        errData.error = `API error: ${res.status}`;
      }
      throw new Error(errData.error || `API error: ${res.status}`);
    }

    try {
      return await res.json();
    } catch {
      return { success: true };
    }
  } catch (error) {
    console.error("updateDoseStatus error:", error);
    return { success: false, error: error.message };
  }
}

// Delete a medication
export async function deleteMedication(medId) {
  try {
    const token = localStorage.getItem("token");
    const res = await fetch(`/api/medications/${medId}`, {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!res.ok) {
      let errData = {};
      try {
        const contentType = res.headers.get("content-type");
        if (contentType?.includes("application/json")) {
          errData = await res.json();
        } else {
          errData.error = await res.text();
        }
      } catch {
        errData.error = `API error: ${res.status}`;
      }
      throw new Error(errData.error || `API error: ${res.status}`);
    }

    try {
      return await res.json();
    } catch {
      return { success: true };
    }
  } catch (error) {
    console.error("deleteMedication error:", error);
    return { success: false, error: error.message };
  }
}

// Update a medication and return normalized data
export async function updateMedication(medId, updatedData) {
  if (!medId) throw new Error("Medication ID is required");
  if (!updatedData || typeof updatedData !== "object") {
    throw new Error("Medication data is required");
  }

  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  // Always send valid ISO date strings or null
  const bodyData = {
    ...updatedData,
    startDate: updatedData.startDate
      ? new Date(updatedData.startDate).toISOString()
      : null,
    endDate: updatedData.endDate
      ? new Date(updatedData.endDate).toISOString()
      : null,
  };

  const res = await fetch(`/api/medications/${medId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(bodyData),
  });

  let data;
  try {
    data = await res.json();
  } catch {
    data = {};
  }

  if (!res.ok) {
    throw new Error(data.error || "Failed to update medication");
  }

  // Normalize dates so your dashboard always sees proper ones
  const normalizedData = {
    ...data,
    startDate: data.startDate ? new Date(data.startDate).toISOString() : null,
    endDate: data.endDate ? new Date(data.endDate).toISOString() : null,
  };

  // Always return this shape for consistency
  return {
    success: true,
    data: normalizedData,
  };
}

// Delete a report
export async function deleteReport(reportId) {
  if (!reportId) throw new Error("Report ID is required");

  try {
    const token = localStorage.getItem("token");
    const res = await fetch(`/api/reports/${reportId}`, {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!res.ok) {
      let errData = {};
      try {
        const contentType = res.headers.get("content-type");
        if (contentType?.includes("application/json")) {
          errData = await res.json();
        } else {
          errData.error = await res.text();
        }
      } catch {
        errData.error = `API error: ${res.status}`;
      }
      throw new Error(errData.error || `API error: ${res.status}`);
    }

    try {
      return await res.json();
    } catch {
      return { success: true };
    }
  } catch (error) {
    console.error("deleteReport error:", error);
    return { success: false, error: error.message };
  }
}

export async function addMedication(patientId, medData) {
  try {
    if (!medData || typeof medData !== "object") {
      throw new Error("Medication data is required");
    }

    // --- Normalize / validate payload ---
    const payload = {
      name: medData.name?.trim() || "",
      dosage: Number(medData.dosage) || 0,
      unit: medData.unit || "mg",
      type: medData.type || "tablet",
      schedule: medData.schedule || "daily",
      customInterval:
        medData.schedule === "custom"
          ? medData.customInterval || { number: 1, unit: "day" }
          : undefined,
      times: Array.isArray(medData.times)
        ? medData.times.map((t) => {
            // Ensure HH:MM format
            if (/^\d{1,2}:\d{1,2}$/.test(t)) {
              const [h, m] = t.split(":");
              return `${h.padStart(2, "0")}:${m.padStart(2, "0")}`;
            }
            return t;
          })
        : [],
      startDate: medData.startDate
        ? new Date(medData.startDate).toISOString()
        : new Date().toISOString(),
      endDate: medData.endDate ? new Date(medData.endDate).toISOString() : null,
      reminders: !!medData.reminders,
      notes: medData.notes || "",
      userId: medData.userId || patientId,
    };

    // --- Frontend validation before sending ---
    if (!payload.name) throw new Error("Medication name is required");
    if (!payload.dosage || payload.dosage <= 0)
      throw new Error("Dosage must be greater than 0");
    if (!payload.times.length)
      throw new Error("At least one dose time is required");

    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;

    const res = await fetch(`/api/medications`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });

    let data;
    try {
      data = await res.json();
    } catch {
      data = {};
    }

    if (!res.ok) {
      console.error("addMedication failed:", data);
      throw new Error(data.error || "Failed to add medication");
    }

    return {
      success: true,
      data: data.medication || {},
    };
  } catch (err) {
    console.error("addMedication error:", err);
    return { success: false, error: err.message };
  }
}
