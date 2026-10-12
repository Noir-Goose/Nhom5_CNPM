
const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"
).replace(/\/$/, "");

async function adminPoiRequest(path, options = {}) {
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
      ...(options.body ? { "Content-Type": "application/json" } : {}),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      typeof data.detail === "string"
        ? data.detail
        : `Yêu cầu quản lý POI thất bại (HTTP ${response.status}).`,
    );
  }

  return data;
}

// Danh sách POI Owner đã gửi.
export function getPoiSubmissions(status = "pending") {
  const allowedStatuses = [
    "pending",
    "approved",
    "rejected",
    "revision_requested",
  ];

  if (!allowedStatuses.includes(status)) {
    throw new Error("Trạng thái POI không hợp lệ.");
  }

  const query = new URLSearchParams({ status });

  return adminPoiRequest(
    `/api/v1/admin/poi-submissions?${query.toString()}`,
  );
}

// Danh sách POI đang lưu trên hệ thống.
export function getSystemPois() {
  return adminPoiRequest("/api/v1/admin/pois");
}

// Duyệt POI Owner gửi lên.
export function approvePoiSubmission(submissionId) {
  return adminPoiRequest(
    `/api/v1/admin/poi-submissions/${encodeURIComponent(submissionId)}/approve`,
    { method: "PATCH" },
  );
}

// Từ chối POI Owner gửi lên, kèm lý do.
export function rejectPoiSubmission(submissionId, message) {
  return adminPoiRequest(
    `/api/v1/admin/poi-submissions/${encodeURIComponent(submissionId)}/reject`,
    {
      method: "PATCH",
      body: JSON.stringify({ message }),
    },
  );
}

// Admin chỉnh sửa POI đang có trên hệ thống.
export function updateSystemPoi(poiId, poiData) {
  return adminPoiRequest(
    `/api/v1/admin/pois/${encodeURIComponent(poiId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(poiData),
    },
  );
}

// Admin yêu cầu POI Owner chỉnh sửa.
export function requestPoiRevision(poiId, message) {
  return adminPoiRequest(
    `/api/v1/admin/pois/${encodeURIComponent(poiId)}/request-revision`,
    {
      method: "POST",
      body: JSON.stringify({ message }),
    },
  );
}
