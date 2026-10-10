import { useState } from "react";

function MapView({
  pois,
  selectedPoi,
  language,
  onSelectPoi,
}) {
  const [zoom, setZoom] = useState(1);

  const [userLocation, setUserLocation] =
    useState(null);

  const [locationError, setLocationError] =
    useState("");

  const handleZoomIn = () => {
    setZoom((value) =>
      Math.min(value + 0.1, 1.4)
    );
  };

  const handleZoomOut = () => {
    setZoom((value) =>
      Math.max(value - 0.1, 0.8)
    );
  };

  const handleLocate = () => {
    setLocationError("");

    if (!navigator.geolocation) {
      setLocationError(
        "Trình duyệt không hỗ trợ GPS."
      );
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => {
        setLocationError(
          "Không lấy được vị trí. Hãy kiểm tra quyền GPS."
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      }
    );
  };

  return (
    <>
      <div className="map-toolbar">
        <div className="zoom-controls">
          <button
            type="button"
            onClick={handleZoomIn}
            aria-label="Phóng to bản đồ"
          >
            +
          </button>

          <button
            type="button"
            onClick={handleZoomOut}
            aria-label="Thu nhỏ bản đồ"
          >
            −
          </button>
        </div>

        <button
          type="button"
          className="locate-button"
          onClick={handleLocate}
          aria-label="Lấy vị trí hiện tại"
        >
          ◎
        </button>
      </div>

      <div className="map-stage">
        <div
          className="map-world"
          style={{
            transform: `scale(${zoom})`,
          }}
        >
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
              aria-label={`Chọn ${poi.content[language].name}`}
            >
              {poi.icon}
            </button>
          ))}

          {userLocation && (
            <div className="gps-info">
              <strong>Vị trí hiện tại</strong>

              <span>
                {userLocation.latitude.toFixed(5)},{" "}
                {userLocation.longitude.toFixed(5)}
              </span>
            </div>
          )}

          <div className="current-position">
            <span />
          </div>
        </div>
      </div>

      {locationError && (
        <div className="location-error">
          {locationError}
        </div>
      )}
    </>
  );
}

export default MapView;