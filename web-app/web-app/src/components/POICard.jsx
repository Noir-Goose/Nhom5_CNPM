function POICard({ poi, language, selected, onSelect }) {
  const content = poi.content[language];

  return (
    <button
      type="button"
      className={`poi-card ${selected ? "selected" : ""}`}
      onClick={() => onSelect(poi)}
    >
      <div className="poi-image">
        {poi.icon}
      </div>

      <div className="poi-card-body">
        <div className="poi-title-row">
          <h3>{content.name}</h3>

          <span className="poi-distance">
            {poi.distance}m
          </span>
        </div>

        <p>{content.category}</p>

        <div className="poi-meta">
          <span>★ {poi.rating}</span>

          <span>•</span>

          <span className={poi.isOpen ? "open" : "closed"}>
            {poi.isOpen ? "Đang mở" : "Đã đóng"}
          </span>
        </div>
      </div>
    </button>
  );
}

export default POICard;