import { useMemo, useState } from "react";

import "./App.css";

import {
  categories,
  languages,
  mockPois,
} from "./data/mockPois";

import POICard from "./components/POICard";
import LanguageSelector from "./components/LanguageSelector";
import AudioPlayer from "./components/AudioPlayer";

function MapApp() {
  const [language, setLanguage] = useState("vi");
  const [selectedPoi, setSelectedPoi] = useState(mockPois[0]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] =useState("all");
  const [zoom, setZoom] = useState(1);

  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState("");


  const speechLanguage =
    languages.find((item) => item.code === language)?.speech ??
    "vi-VN";

  const filteredPois = useMemo(() => {
  const normalizedSearch = searchTerm
    .trim()
    .toLowerCase();

  return mockPois.filter((poi) => {
    const content = poi.content[language];

    const matchesSearch =
      !normalizedSearch ||
      content.name
        .toLowerCase()
        .includes(normalizedSearch) ||
      content.category
        .toLowerCase()
        .includes(normalizedSearch) ||
      content.description
        .toLowerCase()
        .includes(normalizedSearch);

    const matchesCategory =
      selectedCategory === "all" ||
      poi.categoryKey === selectedCategory;

    return matchesSearch && matchesCategory;
  });
}, [language, searchTerm, selectedCategory]);

  const handleSelectPoi = (poi) => {
    setSelectedPoi(poi);
  };

  const handleLanguageChange = (nextLanguage) => {
    window.speechSynthesis?.cancel();

    setLanguage(nextLanguage);
  };

  const handleLocate = () => {
    setLocationError("");

    if (!navigator.geolocation) {
      setLocationError("Trình duyệt không hỗ trợ GPS.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => {
        setLocationError(
          "Không lấy được vị trí. Hãy kiểm tra quyền GPS."
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      }
    );
  };

  return (
    <div className="map-app">
      <header className="top-bar">
        <div className="brand">
          <div className="brand-icon">Q4</div>

          <div>
            <h1>Quận 4 Food Guide</h1>
            <span>
              Khám phá ẩm thực bằng thuyết minh
            </span>
          </div>
        </div>

        <LanguageSelector
          language={language}
          languages={languages}
          onChange={handleLanguageChange}
        />
      </header>

      <main className="main-layout">
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
                setSearchTerm(event.target.value)
              }
              type="text"
              placeholder="Tìm món ăn, địa điểm..."
            />

            {searchTerm && (
              <button
                type="button"
                className="clear-search"
                onClick={() => setSearchTerm("")}
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
                  selectedCategory === category.key ? "active" : ""
                }`}
                onClick={() =>
                  setSelectedCategory(category.key)
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
                  selected={
                    selectedPoi?.id === poi.id
                  }
                  onSelect={handleSelectPoi}
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

        <section className="map-area">
          <div className="map-toolbar">
            <div className="zoom-controls">
              <button
                type="button"
                onClick={() =>
                  setZoom((value) =>
                    Math.min(value + 0.1, 1.4)
                  )
                }
              >
                +
              </button>

              <button
                type="button"
                onClick={() =>
                  setZoom((value) =>
                    Math.max(value - 0.1, 0.8)
                  )
                }
              >
                −
              </button>
            </div>

            <button
              type="button"
              className="locate-button"
              onClick={handleLocate}
            >
              ◎
            </button>
          </div>

          <div className="map-stage">
            <div
              className="map-world"
              style={{
                transform: `scale(${zoom})`,
              }}
            >
              <div className="road road-1" />
              <div className="road road-2" />
              <div className="road road-3" />
              <div className="road road-4" />

              <span className="map-place place-1">
                Chợ Xóm Chiếu
              </span>

              <span className="map-place place-2">
                Đường Hoàng Diệu
              </span>

              {mockPois.map((poi) => (
                <button
                  type="button"
                  key={poi.id}
                  className={`map-marker ${
                    selectedPoi?.id === poi.id
                      ? "active"
                      : ""
                  }`}
                  style={{
                    left: `${poi.position.x}%`,
                    top: `${poi.position.y}%`,
                  }}
                  onClick={() =>
                    handleSelectPoi(poi)
                  }
                  title={poi.content[language].name}
                >
                  {poi.icon}
                </button>
              ))}

              {userLocation && (
                <div className="gps-info">
                  <strong>Vị trí hiện tại</strong>

                  <span>
                    {userLocation.latitude.toFixed(5)},{" "}
                    {userLocation.longitude.toFixed(5)}
                  </span>
                </div>
              )}

              <div className="current-position">
                <span />
              </div>
            </div>
          </div>

          {selectedPoi && (
            <div className="selected-poi">
              <div className="selected-poi-image">
                {selectedPoi.icon}
              </div>

              <div className="selected-poi-info">
                <span className="selected-label">
                  ĐỊA ĐIỂM ĐƯỢC CHỌN
                </span>

                <h3>
                  {selectedPoi.content[language].name}
                </h3>

                <p>
                  {selectedPoi.distance}m ·{" "}
                  {selectedPoi.content[language].category}
                </p>

                <p className="selected-description">
                  {selectedPoi.content[language].description}
                </p>
              </div>
            </div>
          )}

          {locationError && (
            <div className="location-error">
              {locationError}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default MapApp;