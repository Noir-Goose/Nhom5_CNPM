function POICard({ poi, language, selected, onSelect }) {
  const content = poi.content?.[language] ?? poi.content?.vi ?? {};
  const name = content.name ?? poi.name ?? "";
  const category = content.category ?? poi.categoryKey ?? "";
  const openLabel = {
    vi: { open: "Đang mở", closed: "Đã đóng" },
    en: { open: "Open", closed: "Closed" },
    zh: { open: "营业中", closed: "已关闭" },
    ja: { open: "営業中", closed: "営業終了" },
    ko: { open: "영업 중", closed: "영업 종료" },
  }[language] ?? { open: "Đang mở", closed: "Đã đóng" };

  return (
    <button
      type="button"
      className={`poi-card ${selected ? "selected" : ""}`}
      onClick={() => onSelect(poi)}
      aria-label={name}
    >
      <div className="poi-image">{poi.icon ?? "📍"}</div>
      <div className="poi-card-body">
        <div className="poi-title-row"><h3>{name}</h3></div>
        {category && <p>{category}</p>}
        <div className="poi-meta">
          {poi.rating != null && <span>★ {poi.rating}</span>}
          {poi.rating != null && poi.isOpen != null && <span>•</span>}
          {poi.isOpen != null && <span className={poi.isOpen ? "open" : "closed"}>{poi.isOpen ? openLabel.open : openLabel.closed}</span>}
        </div>
      </div>
    </button>
  );
}

export default POICard;
