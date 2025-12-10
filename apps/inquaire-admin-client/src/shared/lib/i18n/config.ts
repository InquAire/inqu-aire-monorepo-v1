import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import ko from './locales/ko';
import en from './locales/en';
import ja from './locales/ja';

export const SUPPORTED_LANGUAGES = ['ko', 'en', 'ja'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  ko: '한국어',
  en: 'English',
  ja: '日本語',
};

const resources = {
  ko: { translation: ko },
  en: { translation: en },
  ja: { translation: ja },
};

// SSR 환경 감지
const isServer = typeof window === 'undefined';

// SSR에서는 LanguageDetector를 사용하지 않음 (hydration mismatch 방지)
const i18nInstance = isServer ? i18n.use(initReactI18next) : i18n.use(LanguageDetector).use(initReactI18next);

i18nInstance.init({
  resources,
  lng: isServer ? 'ko' : undefined, // SSR에서는 항상 'ko' 사용
  fallbackLng: 'ko', // 기본 언어
  supportedLngs: SUPPORTED_LANGUAGES,
  debug: false,

  interpolation: {
    escapeValue: false, // React already escapes values
  },

  detection: isServer
    ? undefined
    : {
        // 언어 감지 순서
        order: ['localStorage', 'navigator'],
        // LocalStorage 키
        lookupLocalStorage: 'inquaire-language',
        // 캐시 설정
        caches: ['localStorage'],
      },

  react: {
    useSuspense: false,
  },
});

export default i18n;
