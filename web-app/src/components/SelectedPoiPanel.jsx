import { uiLabels } from "../data/mockPois";

function SelectedPoiPanel({ selectedPoi, language }) {
  if (!selectedPoi) {
    return null;
  }

  const content = selectedPoi.content[language];

  return (
    <div className="selected-poi">
      <div className="selected-poi-image">
        {selectedPoi.icon}
      </div>

      <div className="selected-poi-info">
        <span className="selected-label">
          {uiLabels.selectedPlace[language]}
        </span>

        <h3>{content.name}</h3>

        <p>
          {selectedPoi.distance}m ·{" "}
          {content.category}
        </p>

        <p className="selected-description">
          {content.description}
        </p>
      </div>
    </div>
  );
}

export default SelectedPoiPanel;