import { uiLabels } from "../data/mockPois";
import AudioPlayer from "./AudioPlayer";

function SelectedPoiPanel({
  selectedPoi,
  language,
  speechLanguage,
  onClose,
}) {
  if (!selectedPoi) {
    return null;
  }

  const content =
    selectedPoi.content?.[language];

  if (!content) {
    return null;
  }

  return (
    <div className="selected-poi">
      <div className="selected-poi-image">
        {selectedPoi.icon}
      </div>

      <div className="selected-poi-info">
        <span className="selected-label">
          {uiLabels?.selectedPlace?.[language] ??
            "Địa điểm được chọn"}
        </span>

        <h3>{content.name}</h3>

        <p>
          {selectedPoi.distance}m ·{" "}
          {content.category}
        </p>

        <p className="selected-description">
          {content.description}
        </p>

        <div className="selected-poi-actions">
          <AudioPlayer
            key={`${selectedPoi.id}-${language}`}
            poi={selectedPoi}
            language={language}
            speechLanguage={speechLanguage}
          />

          <button
            type="button"
            className="close-poi-button"
            onClick={onClose}
          >
            {uiLabels?.closePoi?.[language] ??
              "Đóng"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default SelectedPoiPanel;