import { uiLabels } from "../data/i18n/uiLabels";
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
    selectedPoi.content?.[language] ??
    selectedPoi.content?.vi ??
    {};

  const name =
    content.name ?? selectedPoi.name ?? "Địa điểm";

  const category =
    content.category ?? selectedPoi.categoryKey ?? "";

  const description =
    content.description ?? selectedPoi.description ?? "";

  const selectedLabel =
    uiLabels?.selectedPlace?.[language] ??
    uiLabels?.selectedPlace?.vi ??
    "Địa điểm được chọn";

  const closeLabel =
    uiLabels?.closePoi?.[language] ??
    uiLabels?.closePoi?.vi ??
    "Đóng";

  return (
    <section
      className="selected-poi"
      aria-label={selectedLabel}
    >
      <div className="selected-poi-image" aria-hidden="true">
        {selectedPoi.icon ?? "📍"}
      </div>

      <div className="selected-poi-info">
        <div className="selected-poi-heading">
          <span className="selected-label">
            {selectedLabel}
          </span>

          <button
            type="button"
            className="close-poi-button"
            onClick={onClose}
            aria-label={closeLabel}
            title={closeLabel}
          >
            ×
          </button>
        </div>

        <h3>{name}</h3>

        {category && (
          <p className="selected-category">
            {category}
          </p>
        )}

        {description && (
          <p className="selected-description">
            {description}
          </p>
        )}

        <div className="selected-poi-actions">
          <AudioPlayer
            key={`${selectedPoi.id}-${language}`}
            poi={selectedPoi}
            language={language}
            speechLanguage={speechLanguage}
          />
        </div>
      </div>
    </section>
  );
}

export default SelectedPoiPanel;