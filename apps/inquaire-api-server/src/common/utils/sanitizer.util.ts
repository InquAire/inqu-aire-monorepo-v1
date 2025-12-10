/**
 * XSS 방지를 위한 입력 데이터 Sanitizer
 * DOMPurify를 사용하여 검증된 HTML sanitization 제공
 */

import * as DOMPurify from 'isomorphic-dompurify';

/**
 * HTML 태그 제거
 */
export function stripHtmlTags(input: string): string;
export function stripHtmlTags<T>(input: T): T;
export function stripHtmlTags(input: unknown): unknown {
  if (typeof input !== 'string') {
    return input;
  }

  // HTML 태그 제거
  return input.replace(/<[^>]*>/g, '');
}

/**
 * HTML 특수문자 이스케이프
 */
export function escapeHtml(input: string): string;
export function escapeHtml<T>(input: T): T;
export function escapeHtml(input: unknown): unknown {
  if (typeof input !== 'string') {
    return input;
  }

  const htmlEscapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };

  return input.replace(/[&<>"'/]/g, char => htmlEscapeMap[char]);
}

/**
 * JavaScript 이벤트 핸들러 제거 (on* 속성)
 */
export function removeEventHandlers(input: string): string;
export function removeEventHandlers<T>(input: T): T;
export function removeEventHandlers(input: unknown): unknown {
  if (typeof input !== 'string') {
    return input;
  }

  // on으로 시작하는 이벤트 핸들러 제거
  return input.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
}

/**
 * 스크립트 태그 제거
 */
export function removeScriptTags(input: string): string;
export function removeScriptTags<T>(input: T): T;
export function removeScriptTags(input: unknown): unknown {
  if (typeof input !== 'string') {
    return input;
  }

  // <script> 태그와 그 내용 제거
  return input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
}

/**
 * 위험한 프로토콜 제거 (javascript:, data:, vbscript: 등)
 */
export function removeDangerousProtocols(input: string): string;
export function removeDangerousProtocols<T>(input: T): T;
export function removeDangerousProtocols(input: unknown): unknown {
  if (typeof input !== 'string') {
    return input;
  }

  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:', 'about:'];

  let sanitized = input;
  for (const protocol of dangerousProtocols) {
    const regex = new RegExp(protocol, 'gi');
    sanitized = sanitized.replace(regex, '');
  }

  return sanitized;
}

/**
 * 위험한 HTML 태그 제거
 * XSS 공격에 주로 사용되는 태그만 선택적으로 제거
 */
export function stripDangerousTags(input: string): string;
export function stripDangerousTags<T>(input: T): T;
export function stripDangerousTags(input: unknown): unknown {
  if (typeof input !== 'string') {
    return input;
  }

  // XSS 공격에 자주 사용되는 위험한 태그 목록
  const dangerousTags = [
    'script',
    'iframe',
    'object',
    'embed',
    'applet',
    'meta',
    'link',
    'style',
    'form',
    'input',
    'button',
    'textarea',
    'select',
  ];

  let sanitized = input;

  // 각 위험한 태그 제거 (여는 태그와 닫는 태그 모두)
  for (const tag of dangerousTags) {
    // 여는 태그와 내용 제거: <tag ...>content</tag>
    const openCloseRegex = new RegExp(`<${tag}\\b[^>]*>.*?<\\/${tag}>`, 'gis');
    sanitized = sanitized.replace(openCloseRegex, '');

    // 자체 닫는 태그 제거: <tag ... />
    const selfClosingRegex = new RegExp(`<${tag}\\b[^>]*\\/?>`, 'gi');
    sanitized = sanitized.replace(selfClosingRegex, '');
  }

  return sanitized;
}

/**
 * 종합 XSS Sanitizer (DOMPurify 사용)
 *
 * DOMPurify를 사용하여 검증된 XSS 방어를 제공합니다.
 * 정규식 기반 sanitization의 한계를 극복하고, 복잡한 우회 기법에도 효과적으로 대응합니다.
 */
export function sanitizeInput<T>(input: T): T;
export function sanitizeInput(input: unknown): unknown {
  // null, undefined는 그대로 반환
  if (input === null || input === undefined) {
    return input;
  }

  // 문자열인 경우 DOMPurify로 sanitize
  if (typeof input === 'string') {
    // DOMPurify 설정: 모든 HTML 태그와 속성 제거 (순수 텍스트만 허용)
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: [], // 모든 HTML 태그 제거
      ALLOWED_ATTR: [], // 모든 속성 제거
      KEEP_CONTENT: true, // 태그는 제거하되 내용은 유지
    });
  }

  // 배열인 경우 각 요소를 재귀적으로 sanitize
  if (Array.isArray(input)) {
    return input.map(item => sanitizeInput(item));
  }

  // 객체인 경우 각 값을 재귀적으로 sanitize
  if (typeof input === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }

  // 그 외 (숫자, 불리언 등)는 그대로 반환
  return input;
}

/**
 * HTML 허용 Sanitizer (특정 태그와 속성 허용)
 *
 * 사용 사례: 리치 텍스트 에디터, 마크다운 변환 등
 * 기본 sanitizeInput과 달리 안전한 HTML 태그를 허용합니다.
 */
export function sanitizeHtml(
  input: string,
  allowedTags?: string[],
  allowedAttributes?: Record<string, string[]>
): string;
export function sanitizeHtml<T>(input: T, allowedTags?: string[], allowedAttributes?: Record<string, string[]>): T;
export function sanitizeHtml(
  input: unknown,
  allowedTags: string[] = ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
  allowedAttributes: Record<string, string[]> = { a: ['href', 'title'] }
): unknown {
  if (typeof input !== 'string') {
    return input;
  }

  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: allowedTags,
    ALLOWED_ATTR: Object.values(allowedAttributes).flat(),
    KEEP_CONTENT: true,
  });
}

/**
 * SQL Injection 방지를 위한 특수문자 이스케이프
 * (참고: Prisma ORM은 자동으로 SQL Injection을 방지하므로 일반적으로 불필요)
 */
export function escapeSqlSpecialChars(input: string): string;
export function escapeSqlSpecialChars<T>(input: T): T;
export function escapeSqlSpecialChars(input: unknown): unknown {
  if (typeof input !== 'string') {
    return input;
  }

  return input.replace(/['";\\]/g, char => `\\${char}`);
}
