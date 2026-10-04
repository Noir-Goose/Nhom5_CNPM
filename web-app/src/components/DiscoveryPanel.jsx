import POICard from "./POICard";
import AudioPlayer from "./AudioPlayer";

function DiscoveryPanel({
  filteredPois,
  categories,
  language,
  searchTerm,
  selectedCategory,
  selectedPoi,
  speechLanguage,
  onSearchChange,
  onClearSearch,
  onCategoryChange,
  onSelectPoi,
}) {
  return (
    <aside className="discovery-panel">
      <div className="discovery-header">
        <div>
          <span className="section-label">
            KHÁM PHÁ
          </span>

          <h2>Địa điểm gần bạn</h2>
        </div>

        <span className="result-count">
          {filteredPois.length}
        </span>
      </div>

      <div className="search-box">
        <span>⌕</span>

        <input
          value={searchTerm}
          onChange={(event) =>
            onSearchChange(event.target.value)
          }
          type="text"
          placeholder="Tìm món ăn, địa điểm..."
        />

        {searchTerm && (
          <button
            type="button"
            className="clear-search"
            onClick={onClearSearch}
          >
            ×
          </button>
        )}
      </div>

      <div className="category-list">
        {categories.map((category) => (
          <button
            type="button"
            key={category.key}
            className={`category-chip ${
              selectedCategory === category.key
                ? "active"
                : ""
            }`}
            onClick={() =>
              onCategoryChange(category.key)
            }
          >
            {category.label[language]}
          </button>
        ))}
      </div>

      <div className="poi-list">
        {filteredPois.length === 0 ? (
          <div className="empty-state">
            <strong>Không tìm thấy địa điểm</strong>

            <p>
              Thử từ khóa hoặc danh mục khác.
            </p>
          </div>
        ) : (
          filteredPois.map((poi) => (
            <POICard
              key={poi.id}
              poi={poi}
              language={language}
              selected={selectedPoi?.id === poi.id}
              onSelect={onSelectPoi}
            />
          ))
        )}
      </div>

      <AudioPlayer
        key={`${selectedPoi?.id}-${language}`}
        poi={selectedPoi}
        language={language}
        speechLanguage={speechLanguage}
      />
    </aside>
  );
}

export default DiscoveryPanel;
