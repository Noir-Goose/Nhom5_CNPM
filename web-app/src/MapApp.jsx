import {
  useEffect,
  useMemo,
  useState,
} from "react";

import "./App.css";

import {
  categories,
  languages,
} from "./data/mockPois";

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

          setPoiLoadError(
            "Không thể tải bản đồ và danh sách địa điểm."
        );
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
      const content = poi.content?.[language];

      if (!content) {
        return false;
      }

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
    } catch (error) {
      setLanguageError(
        error instanceof Error
          ? error.message
          : "Không thể thay đổi ngôn ngữ."
      );
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