import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { QRCodeSVG } from "qrcode.react"; // Thu vien tao QR

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

  const [isSidebarCollapsed, setIsSidebarCollapsed] =
  useState(false);

  const [qrDialog, setQrDialog] = useState(null);
  
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

        const requestedPoiId =
          new URLSearchParams(window.location.search)
            .get("poi");

        const requestedPoi = requestedPoiId
          ? loadedPois.find(
              (poi) => String(poi.id) === requestedPoiId // Nếu dữ liệu POI sử dụng trường định danh khác id, hãy thay poi.id bằng trường thực tế.
            )
          : null;

        if (requestedPoi) {
          setSelectedPoi(requestedPoi);
          setIsPoiDetailsOpen(true);
        } else {
          setSelectedPoi(
            loadedPois.length > 0
              ? loadedPois[0]
              : null
          );
        }

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

  // QR mở ứng dụng bản đồ chung.
  const handleOpenAppQr = () => {
    const url = new URL(window.location.href);

    url.searchParams.delete("poi");
    url.hash = "";

    setQrDialog({
      title: "QR tham gia ứng dụng",
      url: url.toString(),
    });
  };

  // QR mở đúng POI được chọn.
  const handleOpenPoiQr = (poi) => {
    if (poi?.id == null) {
      console.error("POI chưa có ID hợp lệ.");
      return;
    }

    const url = new URL(window.location.href);

    url.searchParams.set("poi", String(poi.id));
    url.hash = "";

    setQrDialog({
      title: "QR địa điểm",
      url: url.toString(),
    });
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
        onGetAppQr={handleOpenAppQr}
      />

      <main
      className={`main-layout ${
        isSidebarCollapsed ? "sidebar-collapsed" : ""
      }`}
      >
      <aside className="sidebar-shell">
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

        <button
          type="button"
          className="sidebar-toggle"
          onClick={() =>
            setIsSidebarCollapsed((previous) => !previous)
          }
          aria-label={
            isSidebarCollapsed
              ? "Mở sidebar"
              : "Thu gọn sidebar"
          }
          aria-expanded={!isSidebarCollapsed}
          title={
            isSidebarCollapsed
              ? "Mở sidebar"
              : "Thu gọn sidebar"
          }
        >
          {isSidebarCollapsed ? ">" : "<"}
        </button>
      </aside>

      <section
        className={`map-area ${
          isPoiDetailsOpen ? "has-selected-poi" : ""
        }`}
      >
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
                onGetPoiQr={handleOpenPoiQr}
              />
            )}
          </>
        )}
      </section>
          </main>

      {qrDialog && (
        <div
          className="qr-modal-backdrop"
          onClick={() => setQrDialog(null)}
        >
          <section
            className="qr-modal"
            role="dialog"
            aria-modal="true"
            aria-label={qrDialog.title}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="qr-modal-close"
              onClick={() => setQrDialog(null)}
              aria-label="Đóng QR"
            >
              ×
            </button>

            <h2>{qrDialog.title}</h2>

            <div className="qr-code-container">
              <QRCodeSVG
                value={qrDialog.url}
                size={240}
                level="H"
                includeMargin
              />
            </div>

            <p>
              Quét mã QR.
            </p>

            <button
              type="button"
              className="qr-copy-button"
              onClick={() => {
                navigator.clipboard.writeText(
                  qrDialog.url
                );
              }}
            >
              Sao chép đường dẫn
            </button>
          </section>
        </div>
      )}
    </div>
  );
}

export default MapApp;