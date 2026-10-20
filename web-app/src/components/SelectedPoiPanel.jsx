import { uiLabels } from "../data/i18n/uiLabels";
import AudioPlayer from "./AudioPlayer";

function SelectedPoiPanel({
  selectedPoi,
  language,
  speechLanguage,
  onClose,
  onGetPoiQr,
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
      <div className="selected-poi-image">
      <span aria-hidden="true">
        {selectedPoi.icon ?? "📍"}
      </span>

      <button
        type="button"
        className="get-poi-qr-button"
        onClick={() => onGetPoiQr?.(selectedPoi)}
        title={
          ({
            vi: "Lấy QR địa điểm này",
            en: "Get QR for this place",
            fr: "Obtenir le QR de ce lieu",
            zh: "获取此地点的二维码",
            ja: "この場所のQRコードを取得",
            ko: "이 장소의 QR 코드 받기",
            es: "Obtener QR de este lugar",
          })[language] ?? "Get QR for this place"
        }
      >
        <svg
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <path d="M14 14h3v3h-3zM20 14v2M14 20h2M20 19v2M17 20h1" />
        </svg>

      </button>
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