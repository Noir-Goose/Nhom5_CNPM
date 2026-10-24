import { useEffect, useMemo, useRef, useState } from "react";
import { loadGoogleMaps } from "./googleMapsLoader";

const DEFAULT_CENTER = { lat: 10.7665, lng: 106.706 };

export default function LocationPicker({ value, onChange }) {
  const mapElementRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const [mapsLibrary, setMapsLibrary] = useState(null);
  const [mapError, setMapError] = useState("");
  const hasLocation = value.latitude !== "" && value.longitude !== "" && value.latitude != null && value.longitude != null;
  const position = useMemo(
    () => hasLocation ? { lat: Number(value.latitude), lng: Number(value.longitude) } : null,
    [hasLocation, value.latitude, value.longitude],
  );

  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps().then((library) => {
      if (!cancelled) setMapsLibrary(library);
    }).catch((error) => {
      if (!cancelled) setMapError(error.message === "missing-api-key" ? "Thiếu VITE_GOOGLE_MAPS_API_KEY." : "Không thể tải Google Maps. Kiểm tra API key, billing và giới hạn domain.");
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!mapsLibrary || !mapElementRef.current || mapRef.current) return;
    mapRef.current = new mapsLibrary.Map(mapElementRef.current, {
      center: position ?? DEFAULT_CENTER,
      zoom: 14,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      gestureHandling: "greedy",
    });
    mapRef.current.addListener("click", (event) => {
      if (event.latLng) onChangeRef.current({ latitude: event.latLng.lat(), longitude: event.latLng.lng() });
    });
  }, [mapsLibrary, position]);

  useEffect(() => {
    if (!mapRef.current || !mapsLibrary || !position) return;
    mapRef.current.panTo(position);
    if (markerRef.current) markerRef.current.setMap(null);
    markerRef.current = new mapsLibrary.Marker({ map: mapRef.current, position });
  }, [mapsLibrary, position]);

  return (
    <div className="google-map-picker">
      <p>Nhấn vào bản đồ để chọn vị trí quán ăn.</p>
      <div ref={mapElementRef} className="google-map-picker-canvas" role="application" aria-label="Google Map location picker" />
      {mapError && <p className="map-provider-error" role="alert">{mapError}</p>}
      {position && <p>Vĩ độ: {position.lat.toFixed(6)} | Kinh độ: {position.lng.toFixed(6)}</p>}
    </div>
  );
}
