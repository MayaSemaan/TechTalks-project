// app/utils/api.js

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

    // ✅ Helper: safe ISO string
    const parseDateSafe = (val) => {
      if (!val) return null;
      const d = new Date(val);
      return isNaN(d.getTime()) ? null : d.toISOString();
    };

    // ✅ Helper: format frequency consistently
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
export async function updateDoseStatus(medId, doseId, taken) {
  try {
    const token = localStorage.getItem("token");
    const res = await fetch(`/api/medications/${medId}/doses/${doseId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ taken }),
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
