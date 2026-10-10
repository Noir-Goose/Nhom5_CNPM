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
        <div className="brand-icon">Q4</div>

        <div>
          <h1>Quận 4 Food Guide</h1>
          <span>
            Khám phá ẩm thực bằng thuyết minh
          </span>
        </div>
      </div>

      <div>
        <LanguageSelector
          language={language}
          languages={languages}
          onChange={onLanguageChange}
        />

        {languageError && (
          <div className="language-error">
            {languageError}
          </div>
        )}
      </div>
    </header>
  );
}

export default AppHeader;