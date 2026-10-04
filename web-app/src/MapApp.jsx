import { useMemo, useState } from "react";

import "./App.css";

import {
  categories,
  languages,
  mockPois,
} from "./data/mockPois";

import AppHeader from "./components/AppHeader";
import DiscoveryPanel from "./components/DiscoveryPanel";
import MapView from "./components/map/MapView";
import SelectedPoiPanel from "./components/SelectedPoiPanel";

import { saveLanguage } from "./services/languageService";

function MapApp() {
  // =========================
  // App state
  // =========================
  const [language, setLanguage] = useState("vi");
  const [selectedPoi, setSelectedPoi] = useState(
    mockPois[0] ?? null
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] =
    useState("all");
  const [languageError, setLanguageError] =
    useState("");

  // =========================
  // Derived data
  // =========================
  const speechLanguage =
    languages.find(
      (item) => item.code === language
    )?.speech ?? "vi-VN";

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
  }, [
    language,
    searchTerm,
    selectedCategory,
  ]);

  // =========================
  // UC1: Select Language
  // =========================
  const handleLanguageChange = (nextLanguage) => {
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
  // POI selection
  // =========================
  const handleSelectPoi = (poi) => {
    setSelectedPoi(poi);
  };

  return (
    <div className="map-app">
      <AppHeader
        language={language}
        languages={languages}
        onLanguageChange={handleLanguageChange}
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
          speechLanguage={speechLanguage}
          onSearchChange={setSearchTerm}
          onClearSearch={() => setSearchTerm("")}
          onCategoryChange={setSelectedCategory}
          onSelectPoi={handleSelectPoi}
        />

        <section className="map-area">
          <MapView
            pois={mockPois}
            selectedPoi={selectedPoi}
            language={language}
            onSelectPoi={handleSelectPoi}
          />

          <SelectedPoiPanel
            selectedPoi={selectedPoi}
            language={language}
          />
        </section>
      </main>
    </div>
  );
}

export default MapApp;