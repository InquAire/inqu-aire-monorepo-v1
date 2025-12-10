/**
 * Password Validation
 * Matches server-side validation rules
 */

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * 비밀번호 강도 검증
 * 서버 요구사항:
 * - 최소 8자
 * - 대문자 1개 이상 (A-Z)
 * - 소문자 1개 이상 (a-z)
 * - 숫자 1개 이상 (0-9)
 * - 특수문자 1개 이상 (@$!%*?&)
 */
export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('비밀번호는 최소 8자 이상이어야 합니다.');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('대문자를 최소 1개 포함해야 합니다.');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('소문자를 최소 1개 포함해야 합니다.');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('숫자를 최소 1개 포함해야 합니다.');
  }

  if (!/[@$!%*?&]/.test(password)) {
    errors.push('특수문자(@$!%*?&)를 최소 1개 포함해야 합니다.');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * 비밀번호 강도 계산
 * @returns 0-100 점수
 */
export function calculatePasswordStrength(password: string): number {
  let strength = 0;

  if (password.length >= 8) strength += 20;
  if (password.length >= 12) strength += 10;
  if (password.length >= 16) strength += 10;

  if (/[a-z]/.test(password)) strength += 15;
  if (/[A-Z]/.test(password)) strength += 15;
  if (/[0-9]/.test(password)) strength += 15;
  if (/[@$!%*?&]/.test(password)) strength += 15;

  return Math.min(strength, 100);
}

/**
 * 비밀번호 강도 레벨
 */
export function getPasswordStrengthLevel(
  strength: number
): 'weak' | 'medium' | 'strong' | 'very-strong' {
  if (strength < 40) return 'weak';
  if (strength < 60) return 'medium';
  if (strength < 80) return 'strong';
  return 'very-strong';
}

/**
 * 비밀번호 강도 메시지
 */
export function getPasswordStrengthMessage(strength: number): string {
  const level = getPasswordStrengthLevel(strength);

  switch (level) {
    case 'weak':
      return '약함';
    case 'medium':
      return '보통';
    case 'strong':
      return '강함';
    case 'very-strong':
      return '매우 강함';
  }
}

/**
 * 비밀번호 강도 색상
 */
export function getPasswordStrengthColor(
  strength: number
): 'red' | 'orange' | 'yellow' | 'green' {
  const level = getPasswordStrengthLevel(strength);

  switch (level) {
    case 'weak':
      return 'red';
    case 'medium':
      return 'orange';
    case 'strong':
      return 'yellow';
    case 'very-strong':
      return 'green';
  }
}
