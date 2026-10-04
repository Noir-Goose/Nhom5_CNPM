function MapView({
  pois,
  selectedPoi,
  language,
  onSelectPoi,
}) {
  return (
    <>
      <div className="map-toolbar">
        <div className="zoom-controls">
          <button type="button">+</button>
          <button type="button">−</button>
        </div>

        <button
          type="button"
          className="locate-button"
        >
          ◎
        </button>
      </div>

      <div className="map-stage">
        <div className="map-world">
          <div className="road road-1" />
          <div className="road road-2" />
          <div className="road road-3" />
          <div className="road road-4" />

          <span className="map-place place-1">
            Chợ Xóm Chiếu
          </span>

          <span className="map-place place-2">
            Đường Hoàng Diệu
          </span>

          {pois.map((poi) => (
            <button
              type="button"
              key={poi.id}
              className={`map-marker ${
                selectedPoi?.id === poi.id
                  ? "active"
                  : ""
              }`}
              style={{
                left: `${poi.position.x}%`,
                top: `${poi.position.y}%`,
              }}
              onClick={() => onSelectPoi(poi)}
              title={poi.content[language].name}
            >
              {poi.icon}
            </button>
          ))}

          <div className="current-position">
            <span />
          </div>
        </div>
      </div>
    </>
  );
}

export default MapView;