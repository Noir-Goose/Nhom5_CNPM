// Các danh mục nghiệp vụ dùng chung với form đăng ký POI.
// "all" chỉ là bộ lọc, không phải danh mục được lưu vào cơ sở dữ liệu.
export const categories = [
  {
    key: "all",
    label: { vi: "Tất cả", en: "All", zh: "全部", ja: "すべて", ko: "전체" },
  },
  {
    key: "food",
    label: { vi: "Đồ ăn", en: "Food", zh: "美食", ja: "食べ物", ko: "음식" },
  },
  {
    key: "drink",
    label: { vi: "Đồ uống", en: "Drinks", zh: "饮料", ja: "飲み物", ko: "음료" },
  },
  {
    key: "dessert",
    label: { vi: "Tráng miệng", en: "Desserts", zh: "甜点", ja: "デザート", ko: "디저트" },
  },
];

export const poiCategoryOptions = [
  { key: "food", label: "Đồ ăn" },
  { key: "drink", label: "Đồ uống" },
  { key: "dessert", label: "Tráng miệng" },
];
