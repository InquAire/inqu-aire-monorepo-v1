/**
 * Token Manager
 * Handles token storage, validation, and expiration
 */

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const TOKEN_EXPIRY_KEY = 'token_expiry';

/**
 * 토큰 저장
 * @param accessToken JWT access token
 * @param refreshToken Refresh token
 * @param expiresIn Access token 만료 시간 (초) - 기본값: 900 (15분)
 */
export function saveTokens(
  accessToken: string,
  refreshToken: string,
  expiresIn: number = 900
): void {
  if (typeof window === 'undefined') return;

  const expiryTime = Date.now() + expiresIn * 1000;

  console.log('[TokenManager] Saving tokens:', {
    expiresIn,
    expiryTime: new Date(expiryTime).toISOString(),
    now: new Date().toISOString(),
  });

  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());
}

/**
 * Access Token 가져오기
 */
export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

/**
 * Refresh Token 가져오기
 */
export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

/**
 * 토큰 만료 시간 가져오기
 */
export function getTokenExpiry(): number | null {
  if (typeof window === 'undefined') return null;
  const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
  return expiry ? parseInt(expiry, 10) : null;
}

/**
 * 토큰 만료 여부 확인
 * @param bufferSeconds 만료 전 갱신을 위한 버퍼 시간 (기본값: 60초)
 */
export function isTokenExpired(bufferSeconds: number = 60): boolean {
  const expiry = getTokenExpiry();
  if (!expiry) {
    console.log('[TokenManager] No expiry found, considering expired');
    return true;
  }

  const now = Date.now();
  const buffer = bufferSeconds * 1000;
  const isExpired = now >= expiry - buffer;

  console.log('[TokenManager] Token expiry check:', {
    expiry: new Date(expiry).toISOString(),
    now: new Date(now).toISOString(),
    bufferSeconds,
    isExpired,
    timeRemaining: Math.floor((expiry - now) / 1000) + 's',
  });

  return isExpired;
}

/**
 * 토큰 만료까지 남은 시간 (밀리초)
 */
export function getTimeUntilExpiry(): number {
  const expiry = getTokenExpiry();
  if (!expiry) return 0;

  const remaining = expiry - Date.now();
  return Math.max(0, remaining);
}

/**
 * 모든 토큰 제거
 */
export function clearTokens(): void {
  if (typeof window === 'undefined') return;

  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
}

/**
 * 토큰 존재 여부 확인
 */
export function hasTokens(): boolean {
  return !!(getAccessToken() && getRefreshToken());
}

/**
 * 유효한 토큰 존재 여부 (만료되지 않은)
 */
export function hasValidTokens(): boolean {
  return hasTokens() && !isTokenExpired();
}
