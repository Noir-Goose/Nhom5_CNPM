
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export async function login(email, password) {
  const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.detail || "Đăng nhập thất bại.");
  }

  return data;
}


export async function submitPoiRequest(poiData) {
  const token = localStorage.getItem("access_token");

  if (!token) {
    throw new Error("Bạn chưa đăng nhập. Vui lòng đăng nhập lại.");
  }

  const response = await fetch(
    `${API_BASE_URL}/api/v1/owner/poi/submissions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(poiData),
    },
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      typeof data.detail === "string"
        ? data.detail
        : "Không thể gửi yêu cầu tạo địa điểm.",
    );
  }

  return data;
}


export async function getMyPoiSubmissions() {
  const token = localStorage.getItem("access_token");

  if (!token) {
    throw new Error(
      "Bạn chưa đăng nhập. Vui lòng đăng nhập lại."
    );
  }

  const response = await fetch(
    `${API_BASE_URL}/api/v1/owner/poi/submissions`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      typeof data.detail === "string"
        ? data.detail
        : "Không thể tải trạng thái yêu cầu."
    );
  }

  return data;
}
