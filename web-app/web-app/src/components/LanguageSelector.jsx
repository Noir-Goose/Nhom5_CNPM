function LanguageSelector({ language, languages, onChange }) {
  return (
    <select
      className="language-selector"
      value={language}
      onChange={(event) => onChange(event.target.value)}
      aria-label="Chọn ngôn ngữ"
    >
      {languages.map((item) => (
        <option key={item.code} value={item.code}>
          {item.label}
        </option>
      ))}
    </select>
  );
}

export default LanguageSelector;