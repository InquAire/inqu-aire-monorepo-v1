import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * 접근성 유틸리티 함수
 */

/**
 * 키보드 네비게이션 Hook
 * 화살표 키로 포커스 이동 지원
 */
export function useKeyboardNavigation(
  options: {
    enabled?: boolean;
    onEnter?: () => void;
    onEscape?: () => void;
    onArrowUp?: () => void;
    onArrowDown?: () => void;
    onArrowLeft?: () => void;
    onArrowRight?: () => void;
    onTab?: () => void;
    onShiftTab?: () => void;
  } = {}
) {
  const { enabled = true } = options;

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Enter':
          if (options.onEnter) {
            e.preventDefault();
            options.onEnter();
          }
          break;
        case 'Escape':
          if (options.onEscape) {
            e.preventDefault();
            options.onEscape();
          }
          break;
        case 'ArrowUp':
          if (options.onArrowUp) {
            e.preventDefault();
            options.onArrowUp();
          }
          break;
        case 'ArrowDown':
          if (options.onArrowDown) {
            e.preventDefault();
            options.onArrowDown();
          }
          break;
        case 'ArrowLeft':
          if (options.onArrowLeft) {
            e.preventDefault();
            options.onArrowLeft();
          }
          break;
        case 'ArrowRight':
          if (options.onArrowRight) {
            e.preventDefault();
            options.onArrowRight();
          }
          break;
        case 'Tab':
          if (e.shiftKey && options.onShiftTab) {
            e.preventDefault();
            options.onShiftTab();
          } else if (!e.shiftKey && options.onTab) {
            e.preventDefault();
            options.onTab();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enabled, options]);
}

/**
 * 포커스 트랩 Hook
 * 모달이나 다이얼로그에서 포커스를 가둠
 */
export function useFocusTrap(enabled = true) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);

    // 초기 포커스
    firstElement?.focus();

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled]);

  return containerRef;
}

/**
 * 자동 포커스 Hook
 * 컴포넌트 마운트 시 자동으로 포커스
 */
export function useAutoFocus(enabled = true) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (enabled && ref.current) {
      ref.current.focus();
    }
  }, [enabled]);

  return ref;
}

/**
 * 포커스 복원 Hook
 * 모달을 닫을 때 이전 포커스 위치로 복원
 */
export function useFocusRestore() {
  const previousActiveElement = useRef<HTMLElement | null>(null);

  const saveFocus = useCallback(() => {
    previousActiveElement.current = document.activeElement as HTMLElement;
  }, []);

  const restoreFocus = useCallback(() => {
    previousActiveElement.current?.focus();
    previousActiveElement.current = null;
  }, []);

  return { saveFocus, restoreFocus };
}

/**
 * Skip to content 링크 생성
 */
export function useSkipToContent() {
  const skipToMain = useCallback(() => {
    const main = document.querySelector('main');
    if (main) {
      main.focus();
      main.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  return { skipToMain };
}

/**
 * ARIA 라이브 영역 알림
 */
export function announceToScreenReader(
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
) {
  const liveRegion = document.getElementById('sr-live-region');

  if (!liveRegion) {
    const newRegion = document.createElement('div');
    newRegion.id = 'sr-live-region';
    newRegion.setAttribute('aria-live', priority);
    newRegion.setAttribute('aria-atomic', 'true');
    newRegion.className = 'sr-only';
    newRegion.style.cssText =
      'position:absolute;left:-10000px;width:1px;height:1px;overflow:hidden;';
    document.body.appendChild(newRegion);

    setTimeout(() => {
      newRegion.textContent = message;
    }, 100);
  } else {
    liveRegion.setAttribute('aria-live', priority);
    liveRegion.textContent = '';
    setTimeout(() => {
      liveRegion.textContent = message;
    }, 100);
  }
}

/**
 * 접근 가능한 버튼 props 생성
 */
export function getAccessibleButtonProps(label: string, isPressed?: boolean) {
  return {
    'aria-label': label,
    'aria-pressed': isPressed,
    role: 'button',
    tabIndex: 0,
  };
}

/**
 * 접근 가능한 링크 props 생성
 */
export function getAccessibleLinkProps(label: string, isExternal = false) {
  const props: Record<string, string | boolean | undefined> = {
    'aria-label': label,
  };

  if (isExternal) {
    props['aria-label'] = `${label} (새 창에서 열림)`;
    props.target = '_blank';
    props.rel = 'noopener noreferrer';
  }

  return props;
}

/**
 * 테이블 행 키보드 네비게이션 Hook
 */
export function useTableRowNavigation<T extends { id: string | number }>(
  data: T[],
  onSelect?: (item: T) => void
) {
  const [focusedIndex, setFocusedIndex] = useState(0);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          setFocusedIndex(prev => Math.max(0, prev - 1));
          break;
        case 'ArrowDown':
          e.preventDefault();
          setFocusedIndex(prev => Math.min(data.length - 1, prev + 1));
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          if (onSelect && data[focusedIndex]) {
            onSelect(data[focusedIndex]);
          }
          break;
        case 'Home':
          e.preventDefault();
          setFocusedIndex(0);
          break;
        case 'End':
          e.preventDefault();
          setFocusedIndex(data.length - 1);
          break;
      }
    },
    [data, focusedIndex, onSelect]
  );

  return {
    focusedIndex,
    setFocusedIndex,
    handleKeyDown,
    getRowProps: (index: number) => ({
      tabIndex: index === focusedIndex ? 0 : -1,
      'aria-selected': index === focusedIndex,
      onFocus: () => setFocusedIndex(index),
    }),
  };
}

/**
 * 접근성 체크리스트
 *
 * ✅ 키보드 네비게이션
 * - Tab/Shift+Tab으로 모든 상호작용 요소 접근
 * - Enter/Space로 버튼 활성화
 * - Escape로 모달/드롭다운 닫기
 * - 화살표 키로 목록 네비게이션
 *
 * ✅ 스크린 리더 지원
 * - aria-label로 요소 설명
 * - aria-live로 동적 변경 알림
 * - role 속성으로 요소 역할 명시
 * - alt 텍스트로 이미지 설명
 *
 * ✅ 포커스 관리
 * - 포커스 표시 스타일
 * - 모달에서 포커스 트랩
 * - 포커스 복원
 *
 * ✅ 색상 및 대비
 * - WCAG AA 이상 대비율
 * - 색상에만 의존하지 않는 정보 전달
 *
 * ✅ 폼 접근성
 * - label과 input 연결
 * - 에러 메시지 aria-describedby
 * - 필수 필드 aria-required
 */
