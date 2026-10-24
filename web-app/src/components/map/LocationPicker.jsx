import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import L from "leaflet";
import markerIconUrl from "leaflet/dist/images/marker-icon.png";
import markerIconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import markerShadowUrl from "leaflet/dist/images/marker-shadow.png";
import "leaflet/dist/leaflet.css";

const markerIcon = new L.Icon({
  iconUrl: markerIconUrl,
  iconRetinaUrl: markerIconRetinaUrl,
  shadowUrl: markerShadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function MapClickHandler({ onSelect }) {
  useMapEvents({
    click(event) {
      onSelect({ latitude: event.latlng.lat, longitude: event.latlng.lng });
    },
  });
  return null;
}

export default function LocationPicker({ value, onChange }) {
  const defaultCenter = [10.7665, 106.706];
  const hasLocation = value.latitude !== "" && value.longitude !== "" && value.latitude != null && value.longitude != null;
  const position = hasLocation ? [Number(value.latitude), Number(value.longitude)] : null;

  return (
    <div>
      <p>Nhấn vào bản đồ để chọn vị trí quán ăn.</p>
      <MapContainer
        center={position ?? defaultCenter}
        zoom={14}
        className="leaflet-map-picker"
        style={{ height: 400, width: "100%", borderRadius: 12 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapClickHandler onSelect={onChange} />
        {position && <Marker position={position} icon={markerIcon} />}
      </MapContainer>
      {position && <p>Vĩ độ: {position[0].toFixed(6)} | Kinh độ: {position[1].toFixed(6)}</p>}
    </div>
  );
}
