import { uiLabels } from "../../data/i18n/uiLabels";

function MapStatus({ loading, error, language = "vi" }) {
  const labels = uiLabels.map;
  if (loading) {
    return <div className="map-status">{labels.loading[language] ?? labels.loading.vi}</div>;
  }
  if (error) {
    const mapStillAvailable = {
      vi: "Bản đồ nền vẫn hiển thị; danh sách địa điểm cần kết nối máy chủ.",
      en: "The base map is available; places require a connection to the server.",
    };
    return (
      <div className="map-status error">
        <div>{labels.loadError[language] ?? labels.loadError.vi}</div>
        <small>{mapStillAvailable[language] ?? mapStillAvailable.en}</small>
      </div>
    );
  }
  return null;
}

export default MapStatus;
