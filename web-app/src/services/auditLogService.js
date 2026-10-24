const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"
).replace(/\/$/, "");

async function auditRequest(path) {
  const token = localStorage.getItem("access_token");
  if (!token) throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");

  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof data.detail === "string" ? data.detail : `Không thể tải audit log (HTTP ${response.status}).`);
  }
  return data;
}

export function getAuditLogs(filters) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== "" && value != null) params.set(key, value);
  });
  return auditRequest(`/api/v1/admin/audit-logs?${params.toString()}`);
}

export function getAuditEvent(eventId) {
  return auditRequest(`/api/v1/admin/audit-logs/${encodeURIComponent(eventId)}`);
}
