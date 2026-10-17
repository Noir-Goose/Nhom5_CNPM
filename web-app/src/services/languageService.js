import { languages } from "../data/languages";

const LANGUAGE_STORAGE_KEY = "q4-language";

export const saveLanguage = (languageCode) => {
  const isSupported = languages.some(
    (item) => item.code === languageCode
  );

  if (!isSupported) {
    throw new Error(
      "Ngôn ngữ đã chọn không được hỗ trợ."
    );
  }

  try {
    localStorage.setItem(
      LANGUAGE_STORAGE_KEY,
      languageCode
    );
  } catch {
    throw new Error(
      "Không thể lưu ngôn ngữ. Giữ nguyên ngôn ngữ hiện tại."
    );
  }
};