
const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"
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

export async function login(email, password) {
  const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  return parseResponse(response, "Đăng nhập thất bại.");
}

export async function submitPoiRequest(poiData) {
  const token = getAccessToken();

  const response = await fetch(
    `${API_BASE_URL}/api/v1/owner/poi/submissions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(poiData),
    }
  );

  return parseResponse(
    response,
    "Không thể gửi yêu cầu tạo địa điểm."
  );
}

export async function getMyPoiSubmissions() {
  const token = getAccessToken();

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

  return parseResponse(
    response,
    "Không thể tải trạng thái yêu cầu."
  );
}

export async function resubmitPoiRequest(submissionId, poiData) {
  const token = getAccessToken();

  const response = await fetch(
    `${API_BASE_URL}/api/v1/owner/poi/submissions/${encodeURIComponent(
      submissionId
    )}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(poiData),
    }
  );

  return parseResponse(
    response,
    "Không thể gửi lại yêu cầu chỉnh sửa địa điểm."
  );
}
