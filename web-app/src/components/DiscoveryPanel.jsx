
import POICard from "./POICard";

const labels = {
  vi: {
    eyebrow: "KHÁM PHÁ",
    title: "Địa điểm",
    search: "Tìm địa điểm...",
    clear: "Xóa tìm kiếm",
    all: "Tất cả",
    count: "địa điểm",
    emptyTitle: "Không tìm thấy địa điểm",
    emptyDescription: "Thử thay đổi từ khóa hoặc danh mục.",
  },
  en: {
    eyebrow: "EXPLORE",
    title: "Places",
    search: "Search places...",
    clear: "Clear search",
    all: "All",
    count: "places",
    emptyTitle: "No places found",
    emptyDescription: "Try another keyword or category.",
  },
  zh: {
    eyebrow: "探索",
    title: "地点",
    search: "搜索地点...",
    clear: "清除搜索",
    all: "全部",
    count: "个地点",
    emptyTitle: "没有找到地点",
    emptyDescription: "请尝试其他关键词或类别。",
  },
  ja: {
    eyebrow: "探索",
    title: "スポット",
    search: "スポットを検索...",
    clear: "検索をクリア",
    all: "すべて",
    count: "件",
    emptyTitle: "場所が見つかりません",
    emptyDescription: "別のキーワードやカテゴリを試してください。",
  },
  ko: {
    eyebrow: "탐색",
    title: "장소",
    search: "장소 검색...",
    clear: "검색 지우기",
    all: "전체",
    count: "곳",
    emptyTitle: "장소를 찾을 수 없습니다",
    emptyDescription: "다른 키워드나 카테고리를 사용해 보세요.",
  },
};

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
