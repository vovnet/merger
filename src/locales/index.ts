import { ru, TranslationKey } from "./ru";
import { en } from "./en";

type SupportedLanguage = "ru" | "en";

const translations: Record<SupportedLanguage, Record<TranslationKey, string>> = {
  ru,
  en,
};

let currentLang: SupportedLanguage = "ru";

// 🎯 Установка языка (вызывается из YGProvider или BootScene)
export function setLanguage(lang: string): void {
  if (lang in translations) {
    currentLang = lang as SupportedLanguage;
  } else {
    console.warn(`⚠️ Язык '${lang}' не поддерживается, используем 'ru'`);
    currentLang = "ru";
  }
}

// 🎯 Получение перевода
export function t(key: TranslationKey, params?: Record<string, string | number>): string {
  let text = translations[currentLang][key];

  // Подстановка параметров: "Открыто: {current} / {total}" → "Открыто: 5 / 10"
  if (params) {
    Object.entries(params).forEach(([paramKey, value]) => {
      text = text.replace(`{${paramKey}}`, String(value));
    });
  }

  return text;
}

// 🎯 Получение текущего языка (для отладки)
export function getCurrentLanguage(): SupportedLanguage {
  return currentLang;
}
