import { Check, Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from './button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './dropdown-menu';

import { LANGUAGE_NAMES, SUPPORTED_LANGUAGES, type SupportedLanguage } from '@/shared/lib/i18n';

/**
 * 언어 전환 컴포넌트
 *
 * 사용법:
 * <LanguageSwitcher />
 */
export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const currentLanguage = i18n.language as SupportedLanguage;

  const changeLanguage = (language: SupportedLanguage) => {
    i18n.changeLanguage(language);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="언어 변경">
          <Languages className="h-5 w-5" />
          <span className="sr-only">언어 변경</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {SUPPORTED_LANGUAGES.map(language => (
          <DropdownMenuItem
            key={language}
            onClick={() => changeLanguage(language)}
            className="cursor-pointer"
          >
            <span>{LANGUAGE_NAMES[language]}</span>
            {currentLanguage === language && <Check className="ml-auto h-4 w-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * 간단한 언어 전환 버튼 (텍스트 표시)
 */
export function SimpleLanguageSwitcher() {
  const { i18n } = useTranslation();
  const currentLanguage = i18n.language as SupportedLanguage;

  const changeLanguage = (language: SupportedLanguage) => {
    i18n.changeLanguage(language);
  };

  // 다음 언어로 순환
  const nextLanguage = () => {
    const currentIndex = SUPPORTED_LANGUAGES.indexOf(currentLanguage);
    const nextIndex = (currentIndex + 1) % SUPPORTED_LANGUAGES.length;
    changeLanguage(SUPPORTED_LANGUAGES[nextIndex]);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={nextLanguage}
      aria-label="언어 변경"
      className="gap-2"
    >
      <Languages className="h-4 w-4" />
      <span className="text-xs">{LANGUAGE_NAMES[currentLanguage]}</span>
    </Button>
  );
}
