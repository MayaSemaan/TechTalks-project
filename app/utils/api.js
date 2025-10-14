// app/utils/api.js

export async function fetchDashboardData(userId, filters = {}) {
  try {
    // Build query parameters for GET request
    const params = new URLSearchParams();
    if (filters.status) params.append("status", filters.status); // "taken" | "missed"
    if (filters.fromDate) params.append("fromDate", filters.fromDate);
    if (filters.toDate) params.append("toDate", filters.toDate);

    const token = localStorage.getItem("token");

    const res = await fetch(`/api/dashboard/${userId}?${params.toString()}`, {
      cache: "no-store",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `API error: ${res.status}`);
    }

    const data = await res.json();
    return { success: true, ...data };
  } catch (error) {
    console.error("fetchDashboardData error:", error);
    return { success: false, error: error.message };
  }
}
