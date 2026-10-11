
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Cấu hình hình ảnh ghim trên bản đồ.
const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// Lắng nghe thao tác nhấn vào bản đồ.
function MapClickHandler({ onSelect }) {
  useMapEvents({
    click(event) {
      onSelect({
        latitude: event.latlng.lat,
        longitude: event.latlng.lng,
      });
    },
  });

  return null;
}

export default function LocationPicker({ value, onChange }) {
  const defaultCenter = [10.7665, 106.7060];

  const hasLocation =
    value.latitude !== "" &&
    value.longitude !== "" &&
    value.latitude != null &&
    value.longitude != null;

  const position = hasLocation
    ? [Number(value.latitude), Number(value.longitude)]
    : null;

  return (
    <div>
      <p>Nhấn vào bản đồ để chọn vị trí quán ăn.</p>

      <MapContainer
        center={position || defaultCenter}
        zoom={14}
        style={{
          height: "400px",
          width: "100%",
          borderRadius: "12px",
        }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapClickHandler onSelect={onChange} />

        {position && (
          <Marker position={position} icon={markerIcon} />
        )}
      </MapContainer>

      {position && (
        <p>
          Vĩ độ: {position[0].toFixed(6)} | Kinh độ:{" "}
          {position[1].toFixed(6)}
        </p>
      )}
    </div>
  );
}