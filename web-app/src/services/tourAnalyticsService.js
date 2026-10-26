const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"
).replace(/\/$/, "");

// [TOUR-AN-003] Gửi sự kiện nghe ẩn danh; lỗi analytics không làm gián đoạn phát giọng đọc.
export async function recordPageVisit() {
  const response = await fetch(`${API_BASE_URL}/api/v1/analytics/visits`, {
    method: "POST",
    headers: { Accept: "application/json" },
    keepalive: true,
  });
  if (!response.ok) throw new Error(`Visit analytics request failed (${response.status})`);
}

export async function recordVisitorPresence(visitorId) {
  const response = await fetch(`${API_BASE_URL}/api/v1/analytics/presence`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ visitorId }),
    keepalive: true,
  });
  if (!response.ok) throw new Error(`Visitor presence request failed (${response.status})`);
}

export async function recordTourEvent(event) {
  const response = await fetch(`${API_BASE_URL}/api/v1/analytics/tour-events`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(event),
    keepalive: true,
  });

  if (!response.ok) {
    throw new Error(`Tour analytics request failed (${response.status})`);
  }
}

// [TOUR-AN-004] Lấy số liệu tổng hợp cho khu vực Admin, yêu cầu token Admin.
export async function getTourAnalytics(days = 30) {
  const token = localStorage.getItem("access_token");
  if (!token) throw new Error("Vui lòng đăng nhập Admin để xem thống kê tour.");

  const response = await fetch(
    `${API_BASE_URL}/api/v1/admin/analytics/tour?days=${days}`,
    { headers: { Accept: "application/json", Authorization: `Bearer ${token}` } },
  );
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(typeof data.detail === "string" ? data.detail : "Không thể tải thống kê tour.");
  }

  return data;
}

export async function getActiveVisitors() {
  const token = localStorage.getItem("access_token");
  if (!token) throw new Error("Vui lòng đăng nhập Admin để xem số người đang tham gia.");
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/analytics/active-visitors`, {
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof data.detail === "string" ? data.detail : "Không thể tải số người đang tham gia.");
  }
  return data;
}
