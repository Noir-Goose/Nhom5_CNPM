import { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { uiLabels } from "../../data/i18n/uiLabels";

function getPoiCoordinates(poi) {
  if (!poi) return null;

  const rawLatitude =
    poi.latitude ?? poi.location?.latitude ?? poi.lat;

  const rawLongitude =
    poi.longitude ??
    poi.location?.longitude ??
    poi.lng ??
    poi.lon;

  if (
    rawLatitude == null ||
    rawLongitude == null ||
    rawLatitude === "" ||
    rawLongitude === ""
  ) {
    return null;
  }

  const latitude = Number(rawLatitude);
  const longitude = Number(rawLongitude);

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }

  return [latitude, longitude];
}

function calculateDistance(a, b) {
  const toRad = (value) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;

  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(dLng / 2) ** 2;

  const safeH = Math.min(1, Math.max(0, h));

  return (
    2 *
    earthRadiusKm *
    Math.atan2(Math.sqrt(safeH), Math.sqrt(1 - safeH))
  );
}

function FitSelectedPoi({ coordinates }) {
  const map = useMap();

  useEffect(() => {
    if (coordinates) {
      map.flyTo(coordinates, Math.max(map.getZoom(), 15), {
        duration: 0.5,
      });
    }
  }, [coordinates, map]);

  return null;
}

function FocusUserLocation({ coordinates }) {
  const map = useMap();

  useEffect(() => {
    if (coordinates) {
      map.flyTo(coordinates, 16, {
        duration: 0.8,
      });
    }
  }, [coordinates, map]);

  return null;
}

export default function MapView({
  pois = [],
  selectedPoi,
  language,
  onSelectPoi,
}) {
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState("");
  const [isLocating, setIsLocating] = useState(false);

  const validPois = useMemo(() => {
    return pois
      .map((poi) => ({
        poi,
        coordinates: getPoiCoordinates(poi),
      }))
      .filter(
        ({ poi, coordinates }) =>
          coordinates &&
          poi.isActive !== false &&
          poi.approvalStatus !== "pending"
      );
  }, [pois]);

  const selectedCoordinates = getPoiCoordinates(selectedPoi);
  const labels = uiLabels.map;
  const text = (key) => labels[key]?.[language] ?? labels[key]?.vi ?? "";

  const nearbyPois = useMemo(() => {
    if (!userLocation) return [];

    return validPois
      .map(({ poi, coordinates }) => ({
        poi,
        distance: calculateDistance(userLocation, coordinates),
      }))
      .filter(({ distance }) => distance <= 5)
      .sort((a, b) => a.distance - b.distance);
  }, [validPois, userLocation]);

  // Không dùng tọa độ mẫu để giả vờ rằng đó là vị trí POI thật.
  const initialCenter =
    selectedCoordinates ??
    validPois[0]?.coordinates ??
    [10.7576, 106.7000];

  const handleLocate = () => {
    setLocationError("");

    if (!navigator.geolocation) {
      setLocationError("gpsUnsupported");
      return;
    }

    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setUserLocation([
          coords.latitude,
          coords.longitude,
        ]);
        setIsLocating(false);
      },
      (error) => {
        const messages = {
          1: "permission",
          2: "unknown",
          3: "timeout",
        };
        setLocationError(messages[error.code] ?? "failed");
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 30000,
      }
    );
  };

  return (
    <div className="map-view">
      <div className="map-toolbar">
        <button
          type="button"
          onClick={handleLocate}
          disabled={isLocating}
          aria-label={text("locate")}
          title={text("locate")}
        >
          {isLocating ? text("locating") : text("locate")}
        </button>
      </div>

      <MapContainer
        center={initialCenter}
        zoom={15}
        scrollWheelZoom
        className="leaflet-map"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FitSelectedPoi coordinates={selectedCoordinates} />
        <FocusUserLocation coordinates={userLocation} />

        {validPois.map(({ poi, coordinates }) => {
          const content =
            poi.content?.[language] ??
            poi.content?.vi ??
            {};

          const name = content.name ?? poi.name ?? "Địa điểm";
          const description =
            content.description ?? poi.description ?? "";
          const category =
            content.category ?? poi.categoryKey ?? "";

          return (
            <Marker
              key={poi.id}
              position={coordinates}
              eventHandlers={{
                click: () => onSelectPoi(poi),
              }}
            >
              <Popup>
                <strong>{name}</strong>
                {category && <p>{category}</p>}
                {description && <p>{description}</p>}
              </Popup>
            </Marker>
          );
        })}

        {userLocation && (
          <Marker position={userLocation}>
            <Popup>{text("currentLocation")}</Popup>
          </Marker>
        )}
      </MapContainer>

      {locationError && (
        <p className="location-error" role="alert">
          {text(locationError)}
        </p>
      )}

      {userLocation && (
        <section className="nearby-pois">
          <h3>{text("nearby")}</h3>

          {nearbyPois.length > 0 ? (
            <ul>
              {nearbyPois.map(({ poi, distance }) => {
                const name =
                  poi.content?.[language]?.name ??
                  poi.content?.vi?.name ??
                  poi.name ??
                  "Địa điểm";

                return (
                  <li key={poi.id}>
                    <button
                      type="button"
                      onClick={() => onSelectPoi(poi)}
                    >
                      {name}
                      {" — "}
                      {distance < 1
                        ? `${Math.round(distance * 1000)} m`
                        : `${distance.toFixed(2)} km`}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p>{text("noNearby")}</p>
          )}
        </section>
      )}
    </div>
  );
}
