import type { Locale } from 'date-fns';
import { enUS, ja, ko } from 'date-fns/locale';

import type { SupportedLanguage } from './config';

/**
 * date-fns 로케일 매핑
 */
export const DATE_LOCALES: Record<SupportedLanguage, Locale> = {
  ko: ko,
  en: enUS,
  ja: ja,
};

/**
 * 현재 언어에 맞는 date-fns 로케일 가져오기
 */
export function getDateLocale(language: SupportedLanguage): Locale {
  return DATE_LOCALES[language] || DATE_LOCALES.ko;
}

/**
 * 날짜 포맷 패턴 (언어별)
 */
export const DATE_FORMATS: Record<
  SupportedLanguage,
  {
    short: string;
    medium: string;
    long: string;
    time: string;
    datetime: string;
  }
> = {
  ko: {
    short: 'yyyy-MM-dd',
    medium: 'yyyy년 MM월 dd일',
    long: 'yyyy년 MM월 dd일 EEEE',
    time: 'HH:mm:ss',
    datetime: 'yyyy-MM-dd HH:mm:ss',
  },
  en: {
    short: 'MM/dd/yyyy',
    medium: 'MMM dd, yyyy',
    long: 'MMMM dd, yyyy EEEE',
    time: 'hh:mm:ss a',
    datetime: 'MM/dd/yyyy hh:mm:ss a',
  },
  ja: {
    short: 'yyyy/MM/dd',
    medium: 'yyyy年MM月dd日',
    long: 'yyyy年MM月dd日 EEEE',
    time: 'HH:mm:ss',
    datetime: 'yyyy/MM/dd HH:mm:ss',
  },
};

/**
 * 현재 언어의 날짜 포맷 가져오기
 */
export function getDateFormat(
  language: SupportedLanguage,
  type: keyof typeof DATE_FORMATS.ko = 'medium'
): string {
  return DATE_FORMATS[language]?.[type] || DATE_FORMATS.ko[type];
}
