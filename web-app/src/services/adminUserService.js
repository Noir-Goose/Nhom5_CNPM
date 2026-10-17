const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"
).replace(/\/$/, "");

async function adminUserRequest(path, options = {}) {
  const token = localStorage.getItem("access_token");
  if (!token) throw new Error("Bạn chưa đăng nhập. Vui lòng đăng nhập lại.");

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      typeof data.detail === "string"
        ? data.detail
        : `Không thể xử lý người dùng (HTTP ${response.status}).`,
    );
  }
  return data;
}

export function getUsers() {
  return adminUserRequest("/api/v1/admin/users");
}

export function createUser(user) {
  return adminUserRequest("/api/v1/admin/users", {
    method: "POST",
    body: JSON.stringify(user),
  });
}

export function updateUser(userId, user) {
  return adminUserRequest(`/api/v1/admin/users/${encodeURIComponent(userId)}`, {
    method: "PUT",
    body: JSON.stringify(user),
  });
}

export function setUserActiveStatus(userId, isActive) {
  return adminUserRequest(`/api/v1/admin/users/${encodeURIComponent(userId)}/status`, {
    method: "PATCH",
    body: JSON.stringify({ isActive }),
  });
}
