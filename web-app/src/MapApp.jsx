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
import PoiBottomSheet from "./components/PoiBottomSheet";
import useIsMobile from "./hooks/useIsMobile";

import { saveLanguage } from "./services/languageService";
import { getPoiById, loadPois } from "./services/poiService";
import { recordPageVisit, recordVisitorPresence } from "./services/tourAnalyticsService";

// [QR-001] Ưu tiên ngôn ngữ trong link QR, sau đó dùng lựa chọn đã lưu.
function getInitialLanguage() {
  const supportedCodes = languages.map((item) => item.code);
  const requestedLanguage = new URLSearchParams(window.location.search).get("lang");

  if (supportedCodes.includes(requestedLanguage)) {
    return requestedLanguage;
  }

  try {
    const savedLanguage = window.localStorage.getItem("q4-language");
    if (supportedCodes.includes(savedLanguage)) return savedLanguage;
  } catch {
    // Continue with the default language when storage is unavailable.
  }

  return "vi";
}

function MapApp() {
  useEffect(() => {
    try {
      if (window.sessionStorage.getItem("q4-visit-recorded")) return;
      window.sessionStorage.setItem("q4-visit-recorded", "1");
      recordPageVisit().catch((error) => console.warn("Could not record page visit:", error));
    } catch {
      recordPageVisit().catch((error) => console.warn("Could not record page visit:", error));
    }
  }, []);

  useEffect(() => {
    const createVisitorId = () => window.crypto?.randomUUID?.() ??
      `visitor-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    let visitorId;
    try {
      visitorId = window.sessionStorage.getItem("q4-visitor-session");
      if (!visitorId) {
        visitorId = createVisitorId();
        window.sessionStorage.setItem("q4-visitor-session", visitorId);
      }
    } catch {
      visitorId = createVisitorId();
    }

    const updatePresence = () => {
      if (document.visibilityState === "visible") {
        recordVisitorPresence(visitorId).catch(() => {});
      }
    };
    updatePresence();
    const intervalId = window.setInterval(updatePresence, 30_000);
    document.addEventListener("visibilitychange", updatePresence);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", updatePresence);
    };
  }, []);

  // [DEVICE-001] Hoi va ghi nho che do bo cuc thiet bi tren trinh duyet.
  const getSavedDeviceMode = () => {
    try {
      return window.localStorage.getItem("food-guide-device-mode");
    } catch {
      return null;
    }
  };
  const [deviceMode, setDeviceMode] = useState(getSavedDeviceMode);
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

  const [isLoadingPoiDetails, setIsLoadingPoiDetails] = useState(false);
  const [poiDetailsError, setPoiDetailsError] = useState("");

  const [isPoiDetailsOpen, setIsPoiDetailsOpen] =
  useState(false);

  const [isSidebarCollapsed, setIsSidebarCollapsed] =
  useState(false);

    const [qrDialog, setQrDialog] = useState(null);

  // Mobile: chế độ giao diện, trạng thái focus ô tìm kiếm, chiều cao thẻ POI
  const isMobile = useIsMobile();
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [sheetLayout, setSheetLayout] = useState({
    height: 0,
    dragging: false,
  });
  
  // =========================
  // App / UI state
  // =========================
  const [language, setLanguage] = useState(getInitialLanguage);

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

  useEffect(() => {
    if (!isPoiDetailsOpen || selectedPoi?.id == null) return undefined;

    let isActive = true;
    setIsLoadingPoiDetails(true);
    setPoiDetailsError("");

    getPoiById(selectedPoi.id)
      .then((poiDetails) => {
        if (isActive) setSelectedPoi(poiDetails);
      })
      .catch((error) => {
        if (isActive) {
          setPoiDetailsError(
            error.message || "Không thể tải thông tin địa điểm. Vui lòng thử lại.",
          );
        }
      })
      .finally(() => {
        if (isActive) setIsLoadingPoiDetails(false);
      });

    return () => {
      isActive = false;
    };
  }, [isPoiDetailsOpen, selectedPoi?.id]);

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

  // [DEVICE-002] Luu lua chon va ap dung bo cuc mobile/desktop.
  const handleDeviceModeChange = (nextMode) => {
    setDeviceMode(nextMode);
    try {
      window.localStorage.setItem("food-guide-device-mode", nextMode);
    } catch {
      // Bo qua neu trinh duyet chan localStorage.
    }
  };

  // =========================
  // Select POI
  // =========================
    const handleSelectPoi = (poi) => {
    window.speechSynthesis?.cancel();

    setIsLoadingPoiDetails(poi?.id != null);
    setPoiDetailsError("");
    setSelectedPoi(poi);
    setIsPoiDetailsOpen(true);

    if (poi?.id == null) {
      setPoiDetailsError("Địa điểm không có mã định danh hợp lệ.");
    }

    // Đóng dropdown POI và hạ bàn phím
        // Chỉ áp dụng trên mobile: đóng dropdown POI và hạ bàn phím
    if (isMobile) {
      setIsSearchFocused(false);
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    }
  };

  // Focus vào ô input => hiện danh sách POI (chỉ có tác dụng trên mobile)
  const handleSidebarFocus = (event) => {
    if (event.target.tagName === "INPUT") {
      setIsSearchFocused(true);
    }
  };

  // Rời khỏi sidebar => đóng danh sách.
  // Trễ 150ms để lần bấm vào POI trong danh sách kịp được xử lý.
  const handleSidebarBlur = (event) => {
    const shell = event.currentTarget;

    setTimeout(() => {
      if (!shell.contains(document.activeElement)) {
        setIsSearchFocused(false);
      }
    }, 150);
  };

  const handleClosePoi = () => {
  window.speechSynthesis?.cancel();

  setIsPoiDetailsOpen(false);
  setIsLoadingPoiDetails(false);
  setPoiDetailsError("");
  };

  // QR mở ứng dụng bản đồ chung.
  const handleOpenAppQr = () => {
    const url = new URL(window.location.href);

    url.searchParams.delete("poi");
    url.searchParams.set("lang", language);
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
    url.searchParams.set("lang", language);
    url.hash = "";

    setQrDialog({
      title: "QR địa điểm",
      url: url.toString(),
    });
  };

   // Thẻ kéo lên cao => ẩn thanh tìm kiếm + categories
    // Tiêu đề hiển thị trên header của thẻ POI (cùng quy tắc với bộ lọc)
  const selectedContent =
    selectedPoi?.content?.[language] ??
    selectedPoi?.content?.vi ??
    {};
  const selectedTitle =
    selectedContent.name ?? selectedPoi?.name ?? "";

  // Thẻ kéo lên cao => ẩn thanh tìm kiếm + categories
  const isSheetHigh =
    isMobile &&
    isPoiDetailsOpen &&
    sheetLayout.height >= window.innerHeight * 0.6;

  const selectedPoiPanel = isPoiDetailsOpen ? (
    <SelectedPoiPanel
      key={`${selectedPoi?.id}-${language}`}
      selectedPoi={selectedPoi}
      language={language}
      speechLanguage={speechLanguage}
      isLoading={isLoadingPoiDetails}
      error={poiDetailsError}
      onClose={handleClosePoi}
      onGetPoiQr={handleOpenPoiQr}
    />
  ) : null;

  return (
    <div
      className={`map-app ${
        isMobile && isPoiDetailsOpen ? "has-poi-sheet" : ""
      }`}
      data-device-mode={deviceMode ?? "mobile"}
    >
      <AppHeader
        language={language}
        languages={languages}
        onLanguageChange={
          handleLanguageChange
        }
        languageError={languageError}
        onGetAppQr={handleOpenAppQr}
        deviceMode={deviceMode}
        onDeviceModeChange={handleDeviceModeChange}
      />

      <main
        className={`main-layout ${
          isSidebarCollapsed && !isMobile ? "sidebar-collapsed" : ""
        }`}
      >
      <aside
        className={`sidebar-shell ${
          isSearchFocused ? "search-focused" : ""
        } ${isSheetHigh ? "hide-on-sheet" : ""}`}
        onFocus={handleSidebarFocus}
        onBlur={handleSidebarBlur}
      >
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

                {!isMobile && (
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
        )}
      </aside>

      <section
        className={`map-area ${
          isPoiDetailsOpen ? "has-selected-poi" : ""
        } ${sheetLayout.dragging ? "is-sheet-dragging" : ""}`}
        style={{ "--sheet-h": `${sheetLayout.height}px` }}
      >
        <MapStatus
          loading={isLoadingPois}
          error={poiLoadError}
          language={language}
        />

        {/* [MAP-001] Luon hien nen ban do, ke ca khi API POI dang loi hoac dang tai. */}
        <MapView
          pois={pois}
          selectedPoi={selectedPoi}
          language={language}
          onSelectPoi={handleSelectPoi}
        />

        {!isLoadingPois && !poiLoadError && (
          isMobile && selectedPoiPanel ? (
            <PoiBottomSheet
              title={selectedTitle}
              resetKey={`${selectedPoi?.id}-${language}`}
              onClose={handleClosePoi}
              onGetQr={() => handleOpenPoiQr(selectedPoi)}
              onLayoutChange={setSheetLayout}
            >
              {selectedPoiPanel}
            </PoiBottomSheet>
          ) : (
            selectedPoiPanel
          )
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

      {!deviceMode && (
        <div className="device-mode-backdrop">
          <section className="device-mode-dialog" role="dialog" aria-modal="true" aria-labelledby="device-mode-title">
            <span className="section-label">TÙY CHỈNH GIAO DIỆN</span>
            <h2 id="device-mode-title">Bạn đang sử dụng thiết bị nào?</h2>
            <p>Chọn chế độ phù hợp để bố trí bản đồ và thông tin dễ xem hơn.</p>
            <div className="device-mode-options">
              <button type="button" onClick={() => handleDeviceModeChange("desktop")}>
                <span aria-hidden="true">▣</span><strong>Desktop💻</strong><small>Bản đồ và danh sách cạnh nhau</small>
              </button>
              <button type="button" onClick={() => handleDeviceModeChange("mobile")}>
                <span aria-hidden="true">▯</span><strong>Mobile📱</strong><small>Bố cục dọc, ưu tiên nội dung</small>
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default MapApp;
