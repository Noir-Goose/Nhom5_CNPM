
import POICard from "./POICard";

import { discoveryLabels as labels } from "../data/i18n/discoveryLabels";

function DiscoveryPanel({
  filteredPois,
  categories,
  language,
  searchTerm,
  selectedCategory,
  selectedPoi,
  onSearchChange,
  onClearSearch,
  onCategoryChange,
  onSelectPoi,
}) {
  const currentLanguage = labels[language] ?? labels.vi;

  const allCategory = categories.find(
    (category) => category.key === "all"
  );

  const otherCategories = categories.filter(
    (category) => category.key !== "all"
  );

  const categoryLabel = (category) => {
    if (category.key === "all") {
      return currentLanguage.all;
    }

    return (
      category.label?.[language] ??
      category.label?.vi ??
      category.key
    );
  };

  return (
    <aside className="discovery-panel">
      <div className="discovery-header">
        <div className="discovery-heading">
          <span className="section-label">
            {currentLanguage.eyebrow}
          </span>

          <h2>{currentLanguage.title}</h2>
        </div>

        <span
          className="result-count"
          aria-label={`${filteredPois.length} ${currentLanguage.count}`}
        >
          {filteredPois.length}
        </span>
      </div>

      <div className="search-box">
        <span className="search-icon" aria-hidden="true">
          ⌕
        </span>

        <input
          type="search"
          value={searchTerm}
          onChange={(event) =>
            onSearchChange(event.target.value)
          }
          placeholder={currentLanguage.search}
          aria-label={currentLanguage.search}
        />

        {searchTerm && (
          <button
            type="button"
            className="clear-search"
            onClick={onClearSearch}
            aria-label={currentLanguage.clear}
            title={currentLanguage.clear}
          >
            ×
          </button>
        )}
      </div>

      <div
        className="category-list"
        role="group"
        aria-label={currentLanguage.title}
      >
        {allCategory && (
          <button
            type="button"
            className={`category-chip ${
              selectedCategory === "all" ? "active" : ""
            }`}
            aria-pressed={selectedCategory === "all"}
            onClick={() => onCategoryChange("all")}
          >
            {categoryLabel(allCategory)}
          </button>
        )}

        {otherCategories.map((category) => (
          <button
            key={category.key}
            type="button"
            className={`category-chip ${
              selectedCategory === category.key ? "active" : ""
            }`}
            aria-pressed={selectedCategory === category.key}
            onClick={() => onCategoryChange(category.key)}
          >
            {categoryLabel(category)}
          </button>
        ))}
      </div>

      <div className="poi-list">
        {filteredPois.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state-icon" aria-hidden="true">
              ⌕
            </span>

            <strong>{currentLanguage.emptyTitle}</strong>

            <p>{currentLanguage.emptyDescription}</p>
          </div>
        ) : (
          filteredPois.map((poi) => (
            <div
              key={poi.id}
              className={`poi-list-item ${
                selectedPoi?.id === poi.id ? "selected" : ""
              }`}
            >
              <POICard
                poi={poi}
                language={language}
                isSelected={selectedPoi?.id === poi.id}
                onSelect={() => onSelectPoi(poi)}
              />
            </div>
          ))
        )}
      </div>
    </aside>
  );
}

export default DiscoveryPanel;
