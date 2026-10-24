import { useEffect, useMemo, useRef, useState } from "react";
import { uiLabels } from "../../data/i18n/uiLabels";
import { loadGoogleMaps } from "./googleMapsLoader";

function getPoiCoordinates(poi) {
  if (!poi) return null;
  const rawLatitude = poi.latitude ?? poi.location?.latitude ?? poi.lat;
  const rawLongitude = poi.longitude ?? poi.location?.longitude ?? poi.lng ?? poi.lon;
  if (rawLatitude == null || rawLongitude == null || rawLatitude === "" || rawLongitude === "") return null;
  const latitude = Number(rawLatitude);
  const longitude = Number(rawLongitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  return [latitude, longitude];
}

function calculateDistance(a, b) {
  const toRad = (value) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  const safeH = Math.min(1, Math.max(0, h));
  return 2 * earthRadiusKm * Math.atan2(Math.sqrt(safeH), Math.sqrt(1 - safeH));
}

function createInfoContent(documentRef, { name, category, description }) {
  const root = documentRef.createElement("div");
  const title = documentRef.createElement("strong");
  title.textContent = name;
  root.appendChild(title);
  if (category) {
    const element = documentRef.createElement("p");
    element.textContent = category;
    root.appendChild(element);
  }
  if (description) {
    const element = documentRef.createElement("p");
    element.textContent = description;
    root.appendChild(element);
  }
  return root;
}

export default function MapView({ pois = [], selectedPoi, language, onSelectPoi }) {
  const mapElementRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const infoWindowRef = useRef(null);
  const userMarkerRef = useRef(null);
  const onSelectPoiRef = useRef(onSelectPoi);
  const [mapsLibrary, setMapsLibrary] = useState(null);
  const [mapError, setMapError] = useState("");
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState("");
  const [isLocating, setIsLocating] = useState(false);

  const validPois = useMemo(() => pois.map((poi) => ({ poi, coordinates: getPoiCoordinates(poi) }))
    .filter(({ poi, coordinates }) => coordinates && poi.isActive !== false && poi.approvalStatus !== "pending"), [pois]);
  const selectedCoordinates = useMemo(() => getPoiCoordinates(selectedPoi), [selectedPoi]);
  const labels = uiLabels.map;
  const text = (key) => labels[key]?.[language] ?? labels[key]?.vi ?? "";
  const currentLocationText = text("currentLocation");
  useEffect(() => { onSelectPoiRef.current = onSelectPoi; }, [onSelectPoi]);
  const nearbyPois = useMemo(() => {
    if (!userLocation) return [];
    return validPois.map(({ poi, coordinates }) => ({ poi, distance: calculateDistance(userLocation, coordinates) }))
      .filter(({ distance }) => distance <= 5).sort((a, b) => a.distance - b.distance);
  }, [validPois, userLocation]);

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps().then((library) => {
      if (!cancelled) setMapsLibrary(library);
    }).catch((error) => {
      if (!cancelled) setMapError(error.message === "missing-api-key" ? "apiKeyMissing" : "mapApiError");
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!mapsLibrary || !mapElementRef.current || mapRef.current) return;
    const center = validPois[0]?.coordinates ?? [10.7576, 106.7];
    mapRef.current = new mapsLibrary.Map(mapElementRef.current, {
      center: { lat: center[0], lng: center[1] },
      zoom: 15,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      clickableIcons: false,
      gestureHandling: "greedy",
      mapId: import.meta.env.VITE_GOOGLE_MAP_ID || "DEMO_MAP_ID",
    });
    infoWindowRef.current = new mapsLibrary.InfoWindow();
  }, [mapsLibrary, validPois]);

  useEffect(() => {
    if (!mapRef.current || !mapsLibrary) return;
    markersRef.current.forEach((marker) => { marker.map = null; });
    markersRef.current = validPois.map(({ poi, coordinates }) => {
      const content = poi.content?.[language] ?? poi.content?.vi ?? {};
      const marker = new mapsLibrary.AdvancedMarkerElement({
        map: mapRef.current,
        position: { lat: coordinates[0], lng: coordinates[1] },
        title: content.name ?? poi.name ?? "Địa điểm",
      });
      marker.gmpClickable = true;
      marker.addEventListener("gmp-click", () => {
        infoWindowRef.current.setContent(createInfoContent(document, {
          name: content.name ?? poi.name ?? "Địa điểm",
          category: content.category ?? poi.categoryKey ?? "",
          description: content.description ?? poi.description ?? "",
        }));
        infoWindowRef.current.open({ map: mapRef.current, anchor: marker });
        onSelectPoiRef.current(poi);
      });
      return marker;
    });
    return () => markersRef.current.forEach((marker) => { marker.map = null; });
  }, [mapsLibrary, validPois, language]);

  const selectedLatitude = selectedCoordinates?.[0] ?? null;
  const selectedLongitude = selectedCoordinates?.[1] ?? null;
  useEffect(() => {
    if (mapRef.current && selectedLatitude != null && selectedLongitude != null) {
      mapRef.current.panTo({ lat: selectedLatitude, lng: selectedLongitude });
      mapRef.current.setZoom(Math.max(mapRef.current.getZoom() ?? 15, 15));
    }
  }, [selectedLatitude, selectedLongitude]);

  useEffect(() => {
    if (!mapRef.current || !mapsLibrary || !userLocation) return;
    mapRef.current.panTo({ lat: userLocation[0], lng: userLocation[1] });
    mapRef.current.setZoom(16);
    if (userMarkerRef.current) userMarkerRef.current.map = null;
    const pin = new mapsLibrary.PinElement({
      background: "#2563eb",
      borderColor: "#ffffff",
      glyphColor: "#ffffff",
      scale: 1.1,
    });
    userMarkerRef.current = new mapsLibrary.AdvancedMarkerElement({
      map: mapRef.current,
      position: { lat: userLocation[0], lng: userLocation[1] },
      title: currentLocationText,
      content: pin.element,
    });
  }, [mapsLibrary, userLocation, currentLocationText]);

  const handleLocate = () => {
    setLocationError("");
    if (!navigator.geolocation) {
      setLocationError("gpsUnsupported");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      setUserLocation([coords.latitude, coords.longitude]);
      setIsLocating(false);
    }, (error) => {
      const messages = { 1: "permission", 2: "unknown", 3: "timeout" };
      setLocationError(messages[error.code] ?? "failed");
      setIsLocating(false);
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 });
  };

  return (
    <div className="map-view">
      <div className="map-toolbar">
        <button type="button" onClick={handleLocate} disabled={isLocating} aria-label={text("locate")} title={text("locate")}>
          {isLocating ? text("locating") : text("locate")}
        </button>
      </div>
      <div ref={mapElementRef} className="google-map" role="application" aria-label="Google Map" />
      {mapError && <p className="map-provider-error" role="alert">{text(mapError)}</p>}
      {locationError && <p className="location-error" role="alert">{text(locationError)}</p>}
      {userLocation && <section className="nearby-pois">
        <h3>{text("nearby")}</h3>
        {nearbyPois.length > 0 ? <ul>{nearbyPois.map(({ poi, distance }) => {
          const name = poi.content?.[language]?.name ?? poi.content?.vi?.name ?? poi.name ?? "Địa điểm";
          return <li key={poi.id}><button type="button" onClick={() => onSelectPoi(poi)}>{name}{" — "}{distance < 1 ? `${Math.round(distance * 1000)} m` : `${distance.toFixed(2)} km`}</button></li>;
        })}</ul> : <p>{text("noNearby")}</p>}
      </section>}
    </div>
  );
}
