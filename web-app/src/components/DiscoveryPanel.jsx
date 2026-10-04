import POICard from "./POICard";

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
  return (
    <aside className="discovery-panel">
      <div className="discovery-header">
        <div>
          <span className="section-label">
            KHÁM PHÁ
          </span>

          <h2>
            {language === "vi"
              ? "Địa điểm"
              : language === "en"
                ? "Places"
                : language === "zh"
                  ? "地点"
                  : language === "ja"
                    ? "スポット"
                    : "장소"}
          </h2>
        </div>

        <span className="result-count">
          {filteredPois.length}
        </span>
      </div>

      <div className="search-box">
        <span>⌕</span>

        <input
          type="text"
          value={searchTerm}
          onChange={(event) =>
            onSearchChange(
              event.target.value
            )
          }
          placeholder={
            language === "vi"
              ? "Tìm địa điểm..."
              : language === "en"
                ? "Search places..."
                : language === "zh"
                  ? "搜索地点..."
                  : language === "ja"
                    ? "スポットを検索..."
                    : "장소 검색..."
          }
        />

        {searchTerm && (
          <button
            type="button"
            className="clear-search"
            onClick={onClearSearch}
            aria-label="Xóa tìm kiếm"
          >
            ×
          </button>
        )}
      </div>

      <div className="category-list">
        {categories.map((category) => (
          <button
            key={category.key}
            type="button"
            className={`category-chip ${
              selectedCategory === category.key
                ? "active"
                : ""
            }`}
            onClick={() =>
              onCategoryChange(
                category.key
              )
            }
          >
            {category.label?.[language] ??
              category.label?.vi ??
              category.key}
          </button>
        ))}
      </div>

      <div className="poi-list">
        {filteredPois.length === 0 ? (
          <div className="empty-state">
            <strong>
              {language === "vi"
                ? "Không tìm thấy địa điểm"
                : language === "en"
                  ? "No places found"
                  : language === "zh"
                    ? "没有找到地点"
                    : language === "ja"
                      ? "場所が見つかりません"
                      : "장소를 찾을 수 없습니다"}
            </strong>

            <p>
              {language === "vi"
                ? "Thử thay đổi từ khóa hoặc danh mục."
                : language === "en"
                  ? "Try another keyword or category."
                  : language === "zh"
                    ? "尝试其他关键词或类别。"
                    : language === "ja"
                      ? "別のキーワードやカテゴリを試してください。"
                      : "다른 키워드나 카테고리를 사용해 보세요."}
            </p>
          </div>
        ) : (
          filteredPois.map((poi) => (
            <POICard
              key={poi.id}
              poi={poi}
              language={language}
              isSelected={
                selectedPoi?.id === poi.id
              }
              onSelect={() =>
                onSelectPoi(poi)
              }
            />
          ))
        )}
      </div>
    </aside>
  );
}

export default DiscoveryPanel;