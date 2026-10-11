
import LanguageSelector from "./LanguageSelector";

function AppHeader({
  language,
  languages,
  onLanguageChange,
  languageError,
}) {
  return (
    <header className="top-bar">
      <div className="brand">
        <div className="brand-icon" aria-hidden="true">
          Q4
        </div>

        <div className="brand-text">
          <h1>Quận 4 Food Guide</h1>
          <span>Khám phá ẩm thực bằng thuyết minh</span>
        </div>
      </div>

      <div className="header-language">
        <LanguageSelector
          language={language}
          languages={languages}
          onChange={onLanguageChange}
        />

        {languageError && (
          <div className="language-error" role="alert">
            {languageError}
          </div>
        )}
      </div>
    </header>
  );
}

export default AppHeader;
