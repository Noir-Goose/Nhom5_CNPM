import { uiLabels } from "../../data/i18n/uiLabels";

function MapStatus({ loading, error, language = "vi" }) {
  const labels = uiLabels.map;
  if (loading) {
    return <div className="map-status">{labels.loading[language] ?? labels.loading.vi}</div>;
  }
  if (error) {
    return <div className="map-status error">{labels.loadError[language] ?? labels.loadError.vi}</div>;
  }
  return null;
}

export default MapStatus;
