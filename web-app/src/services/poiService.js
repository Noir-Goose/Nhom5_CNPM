
const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000"
).replace(/\/$/, "");

export async function loadPois(language = "vi") {
  const url =
    `${API_BASE_URL}/api/v1/poi/load-all?lang=${encodeURIComponent(language)}`;

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Không thể tải POI. HTTP ${response.status}`);
  }

  const data = await response.json();

  // Hỗ trợ cả API trả về mảng trực tiếp và dạng { value: [...] }.
  const pois = Array.isArray(data) ? data : data?.value;

  if (!Array.isArray(pois)) {
    throw new Error("API không trả về danh sách POI hợp lệ.");
  }

  return pois;
}

export async function getPoiById(poiId) {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/poi/${encodeURIComponent(poiId)}`,
    { headers: { Accept: "application/json" } },
  );

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      typeof data.detail === "string"
        ? data.detail
        : `Không thể tải thông tin địa điểm. HTTP ${response.status}`,
    );
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Dữ liệu chi tiết địa điểm không hợp lệ.");
  }

  return data;
}
