function LanguageSelector({ language, languages, onChange }) {
  const labels = { vi: "Chọn ngôn ngữ", en: "Choose language", zh: "选择语言", ja: "言語を選択", ko: "언어 선택" };
  return (
    <select
      className="language-selector"
      value={language}
      onChange={(event) => onChange(event.target.value)}
      aria-label={labels[language] ?? labels.vi}
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