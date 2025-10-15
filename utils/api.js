// API utils
export async function fetchDashboardData(userId) {
  const res = await fetch(`/api/dashboard?userId=${userId}`);
  const data = await res.json();
  return data;
}

export async function addMedication(medication) {
  const res = await fetch("/api/dashboard", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(medication),
  });
  const data = await res.json();
  return data;
}

export async function updateMedication(id, updates) {
  const res = await fetch(`/api/dashboard?id=${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  const data = await res.json();
  return data;
}

export async function deleteMedication(id) {
  const res = await fetch(`/api/dashboard?id=${id}`, {
    method: "DELETE",
  });
  const data = await res.json();
  return data;
}
