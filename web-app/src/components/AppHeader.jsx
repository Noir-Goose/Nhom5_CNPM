
import LanguageSelector from "./LanguageSelector";
import { uiLabels } from "../data/i18n/uiLabels";

function AppHeader({
  language,
  languages,
  onLanguageChange,
  languageError,
  onGetAppQr, /* Lay QR tham gia ung dung*/
  deviceMode,
  onDeviceModeChange,
}) {
  // [DEVICE-006] Dich nhan chon thiet bi theo ngon ngu hien tai.
  const deviceLabel = {
    vi: "Thiết bị",
    en: "Device",
    zh: "设备",
    ja: "デバイス",
    ko: "기기",
  }[language] ?? "Device";

  return (
    <header className="top-bar">
      <div className="brand">
        <div className="brand-icon" aria-hidden="true">
          Q4
        </div>

        <div className="brand-text">
          <h1>Quận 4 Food Guide</h1>
          <span>{uiLabels.headerSubtitle[language] ?? uiLabels.headerSubtitle.vi}</span>
        </div>
      </div>

      <div className="header-language">
        <div className="header-language-actions">
        {/* [DEVICE-003] Cho phep doi che do hien thi ngay trong header. */}
        <label className="device-mode-control">
          <span>{deviceLabel}</span>
          <select
            value={deviceMode ?? "mobile"}
            onChange={(event) => onDeviceModeChange(event.target.value)}
            aria-label={deviceLabel}
          >
            <option value="desktop">Desktop💻</option>
            <option value="mobile">Mobile📱</option>
          </select>
        </label>
        <button
          type="button"
          className="get-app-qr-button"
          onClick={onGetAppQr}  // Nút lấy QR map chung
        > 
          {({
            vi: "Lấy QR",
            en: "Get QR",
            fr: "Obtenir le QR",
            zh: "获取二维码",
            ja: "QRコードを取得",
            ko: "QR 코드 받기",
            es: "Obtener QR",
          })[language] ?? "Get QR"}
        </button> 

        <LanguageSelector
          language={language}
          languages={languages}
          onChange={onLanguageChange}
        />
      </div>

        {languageError && (
          <div className="language-error" role="alert">
            {uiLabels.languageError[language] ?? uiLabels.languageError.vi}
          </div>
        )}
    </div>
    </header>
  );
}

export default AppHeader;
