// Fetch dashboard data
export async function fetchDashboardData(userId, filters = {}) {
  try {
    const params = new URLSearchParams({ userId });
    if (filters.status) params.append("status", filters.status);
    if (filters.fromDate) params.append("fromDate", filters.fromDate);
    if (filters.toDate) params.append("toDate", filters.toDate);

    const res = await fetch(`/api/dashboard?${params.toString()}`, { cache: "no-store" });
    const data = await res.json();
    if (!res.ok || data.success === false) throw new Error(data.error || "Failed to fetch data");
    return data;
  } catch (error) {
    console.error("fetchDashboardData error:", error);
    return { success: false, error: error.message };
  }
}

// Add medication
export async function addMedication(med) {
  try {
    const res = await fetch("/api/dashboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(med),
    });
    const data = await res.json();
    if (!res.ok || data.success === false) throw new Error(data.error || "Failed to add medication");
    return data;
  } catch (error) {
    console.error("addMedication error:", error);
    return { success: false, error: error.message };
  }
}

// Update medication
export async function updateMedication(id, updates) {
  try {
    const res = await fetch(`/api/dashboard?id=${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (!res.ok || data.success === false) throw new Error(data.error || "Failed to update medication");
    return data;
  } catch (error) {
    console.error("updateMedication error:", error);
    return { success: false, error: error.message };
  }
}

// Delete medication
export async function deleteMedication(id) {
  try {
    const res = await fetch(`/api/dashboard?id=${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });
    const data = await res.json();
    if (!res.ok || data.success === false) throw new Error(data.error || "Failed to delete medication");
    return data;
  } catch (error) {
    console.error("deleteMedication error:", error);
    return { success: false, error: error.message };
  }
}
