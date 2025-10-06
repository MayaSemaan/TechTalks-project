export async function fetchDashboardData(userId, filters = {}) {
  try {
    const params = new URLSearchParams({ userId });
    if (filters.status) params.append("status", filters.status);
    if (filters.fromDate) params.append("fromDate", filters.fromDate);
    if (filters.toDate) params.append("toDate", filters.toDate);

    const res = await fetch(`/api/dashboard?${params.toString()}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return await res.json();
  } catch (error) {
    console.error(error);
    return { success: false, error: error.message };
  }
}

export async function addMedication(medication) {
  try {
    const res = await fetch("/api/dashboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(medication),
    });

    if (!res.ok) throw new Error("Failed to add medication");
    return await res.json();
  } catch (error) {
    console.error(error);
    return { success: false, error: error.message };
  }
}
