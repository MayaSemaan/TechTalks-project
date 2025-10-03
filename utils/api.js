export async function fetchDashboardData(userId, filters = {}) {
  try {
    const params = new URLSearchParams({ userId, ...filters });
    const res = await fetch(`/api/dashboard?${params.toString()}`);

    if (!res.ok) {
      throw new Error(`API error: ${res.status}`);
    }

    const data = await res.json();
    return data;
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return { success: false, error: error.message };
  }
}

