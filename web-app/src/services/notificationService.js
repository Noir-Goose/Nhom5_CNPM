const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:8000"
).replace(/\/$/, "");

function getAccessToken() {
  const token = localStorage.getItem("access_token");

  if (!token) {
    throw new Error("Bạn chưa đăng nhập. Vui lòng đăng nhập lại.");
  }

  return token;
}

async function parseResponse(response, defaultMessage) {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      typeof data.detail === "string"
        ? data.detail
        : defaultMessage
    );
  }

  return data;
}

// Lấy danh sách thông báo của POI Owner đang đăng nhập.
export async function getMyNotifications() {
  const token = getAccessToken();

  const response = await fetch(
    `${API_BASE_URL}/api/v1/owner/notifications`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return parseResponse(
    response,
    "Không thể tải danh sách thông báo."
  );
}

// Xem chi tiết thông báo; backend sẽ đánh dấu đã đọc.
export async function getNotificationDetail(notificationId) {
  const token = getAccessToken();

  const response = await fetch(
    `${API_BASE_URL}/api/v1/owner/notifications/${encodeURIComponent(
      notificationId
    )}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return parseResponse(
    response,
    "Không thể tải chi tiết thông báo."
  );
}
