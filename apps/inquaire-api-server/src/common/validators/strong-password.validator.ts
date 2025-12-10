import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

/**
 * 강력한 비밀번호 검증 제약조건
 *
 * 비밀번호는 다음 조건을 모두 만족해야 합니다:
 * - 최소 8자 이상
 * - 대문자 1개 이상
 * - 소문자 1개 이상
 * - 숫자 1개 이상
 * - 특수문자(@$!%*?&) 1개 이상
 */
@ValidatorConstraint({ name: 'isStrongPassword', async: false })
export class IsStrongPasswordConstraint implements ValidatorConstraintInterface {
  /**
   * 비밀번호 강도 검증
   */
  validate(password: string): boolean {
    if (!password) {
      return false;
    }

    const checks = {
      minLength: password.length >= 8,
      hasUpperCase: /[A-Z]/.test(password),
      hasLowerCase: /[a-z]/.test(password),
      hasNumber: /\d/.test(password),
      hasSpecialChar: /[@$!%*?&]/.test(password),
    };

    // 모든 조건을 만족해야 함
    return Object.values(checks).every(Boolean);
  }

  /**
   * 검증 실패 시 상세 메시지 생성
   */
  defaultMessage(args: ValidationArguments): string {
    const password = args.value as string;

    if (!password) {
      return '비밀번호를 입력해주세요';
    }

    const failures: string[] = [];

    if (password.length < 8) {
      failures.push('최소 8자 이상');
    }
    if (!/[A-Z]/.test(password)) {
      failures.push('대문자 1개 이상');
    }
    if (!/[a-z]/.test(password)) {
      failures.push('소문자 1개 이상');
    }
    if (!/\d/.test(password)) {
      failures.push('숫자 1개 이상');
    }
    if (!/[@$!%*?&]/.test(password)) {
      failures.push('특수문자(@$!%*?&) 1개 이상');
    }

    if (failures.length === 0) {
      return '비밀번호가 유효하지 않습니다';
    }

    return `비밀번호는 다음을 포함해야 합니다: ${failures.join(', ')}`;
  }
}

/**
 * 강력한 비밀번호 검증 데코레이터
 *
 * @example
 * ```typescript
 * export class SignupDto {
 *   @IsStrongPassword()
 *   password!: string;
 * }
 * ```
 *
 * @param validationOptions - 추가 검증 옵션
 */
export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsStrongPasswordConstraint,
    });
  };
}

/**
 * 비밀번호 강도 평가 (선택적 기능)
 *
 * @param password - 평가할 비밀번호
 * @returns 점수 (0-5) 및 강도 레벨
 */
export function evaluatePasswordStrength(password: string): {
  score: number;
  level: 'very_weak' | 'weak' | 'medium' | 'strong' | 'very_strong';
  suggestions: string[];
} {
  let score = 0;
  const suggestions: string[] = [];

  // 기본 조건
  if (password.length >= 8) score++;
  else suggestions.push('최소 8자 이상 입력하세요');

  if (/[A-Z]/.test(password)) score++;
  else suggestions.push('대문자를 포함하세요');

  if (/[a-z]/.test(password)) score++;
  else suggestions.push('소문자를 포함하세요');

  if (/\d/.test(password)) score++;
  else suggestions.push('숫자를 포함하세요');

  if (/[@$!%*?&]/.test(password)) score++;
  else suggestions.push('특수문자(@$!%*?&)를 포함하세요');

  // 추가 보너스
  if (password.length >= 12) score += 0.5;
  if (/[A-Z].*[A-Z]/.test(password)) score += 0.2; // 대문자 2개 이상
  if (/\d.*\d/.test(password)) score += 0.2; // 숫자 2개 이상
  if (/[@$!%*?&].*[@$!%*?&]/.test(password)) score += 0.1; // 특수문자 2개 이상

  // 레벨 결정
  let level: 'very_weak' | 'weak' | 'medium' | 'strong' | 'very_strong';
  if (score < 2) level = 'very_weak';
  else if (score < 3) level = 'weak';
  else if (score < 4) level = 'medium';
  else if (score < 5) level = 'strong';
  else level = 'very_strong';

  return {
    score: Math.min(score, 5),
    level,
    suggestions,
  };
}
