import {
  useEffect,
  useMemo,
  useState,
} from "react";

import "./App.css";
import { categories } from "./data/categories";
import { languages } from "./data/languages";

import AppHeader from "./components/AppHeader";
import DiscoveryPanel from "./components/DiscoveryPanel";
import MapStatus from "./components/map/MapStatus";
import MapView from "./components/map/MapView";
import SelectedPoiPanel from "./components/SelectedPoiPanel";

import { saveLanguage } from "./services/languageService";
import { loadPois } from "./services/poiService";

function MapApp() {
  // =========================
  // UC2: POI loading state
  // =========================
  const [pois, setPois] = useState([]);
  const [isLoadingPois, setIsLoadingPois] =
    useState(true);
  const [poiLoadError, setPoiLoadError] =
    useState("");

  const [selectedPoi, setSelectedPoi] =
    useState(null);

  const [isPoiDetailsOpen, setIsPoiDetailsOpen] =
    useState(false);

  // =========================
  // App / UI state
  // =========================
  const [language, setLanguage] =
    useState("vi");

  const [searchTerm, setSearchTerm] =
    useState("");

  const [selectedCategory, setSelectedCategory] =
    useState("all");

  const [languageError, setLanguageError] =
    useState("");

  // =========================
  // UC2: Load map and POIs
  // =========================
  useEffect(() => {
    const fetchPois = async () => {
      setIsLoadingPois(true);
      setPoiLoadError("");

      try {
        const loadedPois = await loadPois();

        setPois(loadedPois);

        setSelectedPoi(
          loadedPois.length > 0
            ? loadedPois[0]
            : null
        );
      } catch (error) {
          console.error("Lỗi tải POI từ API:", error);

          setPoiLoadError("load-error");
      } finally {
        setIsLoadingPois(false);
      }
    };

    fetchPois();
  }, []);

  // =========================
  // Language
  // =========================
  const speechLanguage =
    languages.find(
      (item) => item.code === language
    )?.speech ?? "vi-VN";

  // =========================
  // Filter POIs
  // =========================
  const filteredPois = useMemo(() => {
  const normalizedSearch = searchTerm
    .trim()
    .toLowerCase();

  return pois.filter((poi) => {
    // Ưu tiên nội dung theo ngôn ngữ đã chọn.
    // Nếu thiếu, dùng tiếng Việt rồi mới dùng dữ liệu gốc.
    const content =
      poi.content?.[language] ??
      poi.content?.vi ??
      {};

    const name =
      content.name ?? poi.name ?? "";

    const category =
      content.category ?? poi.categoryKey ?? "";

    const description =
      content.description ?? poi.description ?? "";

    const matchesSearch =
      !normalizedSearch ||
      String(name)
        .toLowerCase()
        .includes(normalizedSearch) ||
      String(category)
        .toLowerCase()
        .includes(normalizedSearch) ||
      String(description)
        .toLowerCase()
        .includes(normalizedSearch);

    // Hỗ trợ dữ liệu cũ: phở/bánh mì được xếp vào nhóm Đồ ăn.
    const legacyFoodKeys = ["food", "pho", "banh-mi"];
    const matchesCategory =
      selectedCategory === "all" ||
      (selectedCategory === "food"
        ? legacyFoodKeys.includes(poi.categoryKey)
        : poi.categoryKey === selectedCategory);

    return (
      matchesSearch &&
      matchesCategory &&
      poi.isActive !== false &&
      poi.approvalStatus !== "pending"
    );
  });
}, [
  pois,
  language,
  searchTerm,
  selectedCategory,
]);

  // =========================
  // UC1: Select Language
  // =========================
  const handleLanguageChange = (
    nextLanguage
  ) => {
    setLanguageError("");

    try {
      saveLanguage(nextLanguage);

      window.speechSynthesis?.cancel();

      setLanguage(nextLanguage);
    } catch {
      setLanguageError("language-save-error");
    }
  };

  // =========================
  // Select POI
  // =========================
  const handleSelectPoi = (poi) => {
    window.speechSynthesis?.cancel();

    setSelectedPoi(poi);
    setIsPoiDetailsOpen(true);
  };

  const handleClosePoi = () => {
    window.speechSynthesis?.cancel();

    setIsPoiDetailsOpen(false);
  };

  return (
    <div className="map-app">
      <AppHeader
        language={language}
        languages={languages}
        onLanguageChange={
          handleLanguageChange
        }
        languageError={languageError}
      />

      <main className="main-layout">
        <DiscoveryPanel
          filteredPois={filteredPois}
          categories={categories}
          language={language}
          searchTerm={searchTerm}
          selectedCategory={selectedCategory}
          selectedPoi={selectedPoi}
          onSearchChange={setSearchTerm}
          onClearSearch={() =>
            setSearchTerm("")
          }
          onCategoryChange={
            setSelectedCategory
          }
          onSelectPoi={handleSelectPoi}
        />

        <section className="map-area">
          <MapStatus
            loading={isLoadingPois}
            error={poiLoadError}
            language={language}
          />

          {!isLoadingPois && !poiLoadError && (
            <>
              <MapView
                pois={pois}
                selectedPoi={selectedPoi}
                language={language}
                onSelectPoi={handleSelectPoi}
              />

              {isPoiDetailsOpen && (
                <SelectedPoiPanel
                  key={`${selectedPoi?.id}-${language}`}
                  selectedPoi={selectedPoi}
                  language={language}
                  speechLanguage={speechLanguage}
                  onClose={handleClosePoi}
                />
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}

export default MapApp;