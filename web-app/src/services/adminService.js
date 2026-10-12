const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

// Lấy danh sách POI Owner theo trạng thái.
// Mặc định lấy danh sách đang chờ duyệt.
export async function getPoiOwnerRegistrations(status = "pending") {
  const allowedStatuses = ["pending", "rejected"];

  if (!allowedStatuses.includes(status)) {
    throw new Error("Trạng thái đăng ký không hợp lệ.");
  }

  const query = new URLSearchParams({ status });

  return adminRequest(
    `/api/v1/admin/poi-owner-registrations?${query.toString()}`,
  );
}

// Duyệt đăng ký POI Owner.
export async function approvePoiOwnerRegistration(userId) {
  return adminRequest(
    `/api/v1/admin/poi-owner-registrations/${encodeURIComponent(userId)}/approve`,
    { method: "PATCH" },
  );
}

// Từ chối đăng ký POI Owner.
export async function rejectPoiOwnerRegistration(userId) {
  return adminRequest(
    `/api/v1/admin/poi-owner-registrations/${encodeURIComponent(userId)}/reject`,
    { method: "PATCH" },
  );
}

export async function deleteRejectedPoiOwnerRegistration(userId) {
  return adminRequest(
    `/api/v1/admin/poi-owner-registrations/${encodeURIComponent(userId)}`,
    { method: "DELETE" },
  );
}
// Gửi yêu cầu đến API Admin và xử lý lỗi chung.
async function adminRequest(path, options = {}) {
  const token = localStorage.getItem("access_token");

  if (!token) {
    throw new Error("Bạn chưa đăng nhập. Vui lòng đăng nhập lại.");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      typeof data.detail === "string"
        ? data.detail
        : `Yêu cầu Admin thất bại (HTTP ${response.status}).`,
    );
  }

  return data;
}

