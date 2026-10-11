import { useMemo, useState } from "react";

function getPoiCoordinates(poi) {
  // Hỗ trợ các cách đặt tên tọa độ thường gặp.
  const latitude =
    poi.latitude ??
    poi.lat ??
    poi.location?.latitude ??
    poi.location?.lat;

  const longitude =
    poi.longitude ??
    poi.lng ??
    poi.lon ??
    poi.location?.longitude ??
    poi.location?.lng ??
    poi.location?.lon;

  if (
    latitude == null ||
    longitude == null ||
    latitude === "" ||
    longitude === ""
  ) {
    return null;
  }

  const lat = Number(latitude);
  const lng = Number(longitude);

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return null;
  }

  return { latitude: lat, longitude: lng };
}

// Tính khoảng cách giữa hai tọa độ GPS theo km.
function calculateDistance(pointA, pointB) {
  const toRadians = (degrees) =>
    (degrees * Math.PI) / 180;

  const earthRadiusKm = 6371;

  const lat1 = toRadians(pointA.latitude);
  const lat2 = toRadians(pointB.latitude);
  const deltaLat = toRadians(
    pointB.latitude - pointA.latitude
  );
  const deltaLng = toRadians(
    pointB.longitude - pointA.longitude
  );

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLng / 2) ** 2;

  const safeA = Math.min(1, Math.max(0, a));

  return (
    2 *
    earthRadiusKm *
    Math.atan2(
      Math.sqrt(safeA),
      Math.sqrt(1 - safeA)
    )
  );
}

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
  const [isLocating, setIsLocating] =
    useState(false);

  const nearbyPois = useMemo(() => {
    if (!userLocation) {
      return [];
    }

    return pois
      .map((poi) => {
        const coordinates = getPoiCoordinates(poi);

        if (!coordinates) {
          return null;
        }

        return {
          poi,
          distance: calculateDistance(
            userLocation,
            coordinates
          ),
        };
      })
      .filter(
        (item) =>
          item !== null && item.distance <= 5
      )
      .sort((a, b) => a.distance - b.distance);
  }, [pois, userLocation]);

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
        "Trình duyệt không hỗ trợ định vị GPS."
      );
      return;
    }

    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setIsLocating(false);
      },
      (error) => {
        const messages = {
          1: "Bạn chưa cấp quyền vị trí. Hãy cho phép truy cập vị trí trong trình duyệt.",
          2: "Không xác định được vị trí. Hãy kiểm tra GPS hoặc kết nối mạng.",
          3: "Lấy vị trí quá lâu. Vui lòng thử lại.",
        };

        setLocationError(
          messages[error.code] ??
            "Không lấy được vị trí hiện tại."
        );
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
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
          disabled={isLocating}
          aria-label="Lấy vị trí hiện tại"
          title="Lấy vị trí hiện tại"
        >
          {isLocating ? "…" : "◎"}
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

          {pois.map((poi) => {
            const content = poi.content?.[language];

            // Tránh lỗi nếu POI chưa có nội dung ngôn ngữ này.
            if (!content || !poi.position) {
              return null;
            }

            return (
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
                title={content.name}
                aria-label={`Chọn ${content.name}`}
              >
                {poi.icon}
              </button>
            );
          })}

          {userLocation && (
            <div className="gps-info">
              <strong>Vị trí GPS hiện tại</strong>

              <span>
                {userLocation.latitude.toFixed(5)},{" "}
                {userLocation.longitude.toFixed(5)}
              </span>
            </div>
          )}

          {userLocation && (
            <div
              className="current-position"
              title="Vị trí GPS hiện tại"
              aria-label="Vị trí GPS hiện tại"
            >
              <span />
            </div>
          )}
        </div>
      </div>

      {locationError && (
        <div
          className="location-error"
          role="alert"
        >
          {locationError}
        </div>
      )}

      {userLocation && (
        <section className="nearby-pois">
          <h3>Địa điểm gần bạn (trong 5 km)</h3>

          {nearbyPois.length > 0 ? (
            <ul>
              {nearbyPois.map(({ poi, distance }) => (
                <li key={poi.id}>
                  <button
                    type="button"
                    onClick={() => onSelectPoi(poi)}
                  >
                    {poi.content?.[language]?.name ??
                      "Địa điểm chưa có tên"}
                    {" — "}
                    {distance < 1
                      ? `${Math.round(distance * 1000)} m`
                      : `${distance.toFixed(2)} km`}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p>
              Không tìm thấy POI nào trong bán kính 5 km,
              hoặc các POI chưa có tọa độ GPS hợp lệ.
            </p>
          )}
        </section>
      )}
    </>
  );
}

export default MapView;