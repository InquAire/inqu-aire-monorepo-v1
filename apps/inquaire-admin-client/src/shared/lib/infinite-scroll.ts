/**
 * 무한 스크롤 유틸리티
 *
 * Intersection Observer를 사용한 무한 스크롤 구현
 */
import { useCallback, useEffect, useRef, useState } from 'react';

interface UseInfiniteScrollOptions {
  /** 다음 페이지를 불러올 함수 */
  onLoadMore: () => void;
  /** 로딩 중 여부 */
  isLoading: boolean;
  /** 더 이상 불러올 데이터가 없는지 여부 */
  hasMore: boolean;
  /** 루트 마진 (기본값: '200px' - 하단 200px 전에 로드 시작) */
  rootMargin?: string;
  /** threshold (기본값: 0.1) */
  threshold?: number;
  /** 비활성화 여부 */
  disabled?: boolean;
}

/**
 * 무한 스크롤 훅
 *
 * @example
 * const loadMoreRef = useInfiniteScroll({
 *   onLoadMore: fetchNextPage,
 *   isLoading: isFetchingNextPage,
 *   hasMore: hasNextPage,
 * });
 *
 * return (
 *   <div>
 *     {items.map(item => <div key={item.id}>{item.name}</div>)}
 *     <div ref={loadMoreRef}>Loading...</div>
 *   </div>
 * );
 */
export function useInfiniteScroll({
  onLoadMore,
  isLoading,
  hasMore,
  rootMargin = '200px',
  threshold = 0.1,
  disabled = false,
}: UseInfiniteScrollOptions) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const target = entries[0];
      if (target.isIntersecting && !isLoading && hasMore && !disabled) {
        onLoadMore();
      }
    },
    [onLoadMore, isLoading, hasMore, disabled]
  );

  useEffect(() => {
    const element = loadMoreRef.current;
    if (!element) return;

    // Intersection Observer 생성
    observerRef.current = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin,
      threshold,
    });

    // 요소 관찰 시작
    observerRef.current.observe(element);

    // 클린업
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [handleObserver, rootMargin, threshold]);

  return loadMoreRef;
}

/**
 * React Query의 useInfiniteQuery와 함께 사용하는 무한 스크롤 훅
 *
 * @example
 * const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
 *   queryKey: ['items'],
 *   queryFn: fetchItems,
 *   getNextPageParam: (lastPage) => lastPage.nextCursor,
 * });
 *
 * const loadMoreRef = useInfiniteScrollQuery({
 *   fetchNextPage,
 *   hasNextPage,
 *   isFetchingNextPage,
 * });
 */
export function useInfiniteScrollQuery({
  fetchNextPage,
  hasNextPage = false,
  isFetchingNextPage = false,
  rootMargin = '200px',
  threshold = 0.1,
  disabled = false,
}: {
  fetchNextPage: () => void;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  rootMargin?: string;
  threshold?: number;
  disabled?: boolean;
}) {
  return useInfiniteScroll({
    onLoadMore: fetchNextPage,
    isLoading: isFetchingNextPage,
    hasMore: hasNextPage,
    rootMargin,
    threshold,
    disabled,
  });
}

/**
 * 스크롤 위치를 저장하고 복원하는 훅
 *
 * @example
 * const { saveScrollPosition, restoreScrollPosition } = useScrollPosition('customers-list');
 *
 * // 페이지 이동 전
 * saveScrollPosition();
 *
 * // 페이지 복귀 후
 * useEffect(() => {
 *   restoreScrollPosition();
 * }, []);
 */
export function useScrollPosition(key: string) {
  const saveScrollPosition = useCallback(() => {
    const scrollY = window.scrollY;
    sessionStorage.setItem(`scroll-${key}`, scrollY.toString());
  }, [key]);

  const restoreScrollPosition = useCallback(() => {
    const savedPosition = sessionStorage.getItem(`scroll-${key}`);
    if (savedPosition) {
      window.scrollTo(0, parseInt(savedPosition, 10));
      sessionStorage.removeItem(`scroll-${key}`);
    }
  }, [key]);

  const clearScrollPosition = useCallback(() => {
    sessionStorage.removeItem(`scroll-${key}`);
  }, [key]);

  return {
    saveScrollPosition,
    restoreScrollPosition,
    clearScrollPosition,
  };
}

/**
 * 스크롤 방향 감지 훅
 *
 * @example
 * const scrollDirection = useScrollDirection();
 *
 * return (
 *   <Header className={scrollDirection === 'down' ? 'hide' : 'show'} />
 * );
 */
export function useScrollDirection(threshold = 10) {
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down' | null>(null);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const difference = scrollY - lastScrollY.current;

      if (Math.abs(difference) > threshold) {
        setScrollDirection(difference > 0 ? 'down' : 'up');
        lastScrollY.current = scrollY;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [threshold]);

  return scrollDirection;
}

/**
 * 스크롤 끝 감지 훅
 *
 * @example
 * const isAtBottom = useScrollEnd();
 *
 * useEffect(() => {
 *   if (isAtBottom && hasMore) {
 *     fetchNextPage();
 *   }
 * }, [isAtBottom]);
 */
export function useScrollEnd(offset = 100) {
  const [isAtBottom, setIsAtBottom] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight;
      const scrollTop = document.documentElement.scrollTop;
      const clientHeight = document.documentElement.clientHeight;

      const isBottom = scrollHeight - scrollTop - clientHeight < offset;
      setIsAtBottom(isBottom);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [offset]);

  return isAtBottom;
}
