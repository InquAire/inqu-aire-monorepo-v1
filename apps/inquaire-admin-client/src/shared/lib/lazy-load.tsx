/**
 * 코드 스플리팅 및 지연 로딩 유틸리티
 *
 * 컴포넌트를 동적으로 로드하여 초기 번들 크기를 줄이고 성능을 향상시킵니다.
 */

import {
  ComponentType,
  lazy,
  ComponentProps as ReactComponentProps,
  ReactNode,
  Suspense,
} from 'react';

/**
 * 로딩 폴백 컴포넌트
 */
export function LoadingFallback({ height = '400px' }: { height?: string }) {
  return (
    <div
      className="flex items-center justify-center animate-pulse bg-muted/50 rounded-lg"
      style={{ height }}
    >
      <div className="flex flex-col items-center gap-2">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">로딩 중...</p>
      </div>
    </div>
  );
}

/**
 * Lazy 컴포넌트를 Suspense로 감싸는 HOC
 *
 * @example
 * const LazyChart = lazyLoad(() => import('./Chart'));
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyLoad<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  fallback: ReactNode = <LoadingFallback />
) {
  const LazyComponent = lazy(importFunc);

  return function LazyLoadedComponent(props: ReactComponentProps<T>) {
    return (
      <Suspense fallback={fallback}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}

/**
 * 커스텀 폴백이 있는 Lazy Load
 *
 * @example
 * const LazyDialog = lazyLoadWithFallback(
 *   () => import('./Dialog'),
 *   <DialogSkeleton />
 * );
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyLoadWithFallback<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  customFallback: ReactNode
) {
  return lazyLoad(importFunc, customFallback);
}

/**
 * 프리로딩을 지원하는 Lazy Load
 *
 * @example
 * const { Component: LazyChart, preload } = preloadableLazy(() => import('./Chart'));
 * // 마우스 호버 시 프리로드
 * <button onMouseEnter={preload}>Show Chart</button>
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function preloadableLazy<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>
) {
  let componentPromise: Promise<{ default: T }> | null = null;

  const preload = () => {
    if (!componentPromise) {
      componentPromise = importFunc();
    }
    return componentPromise;
  };

  const LazyComponent = lazy(() => {
    if (componentPromise) {
      return componentPromise;
    }
    return preload();
  });

  const Component = (props: ReactComponentProps<T>) => (
    <Suspense fallback={<LoadingFallback />}>
      <LazyComponent {...props} />
    </Suspense>
  );

  return { Component, preload };
}

/**
 * 여러 컴포넌트를 한번에 프리로드
 */
export function preloadComponents(preloadFuncs: (() => Promise<unknown>)[]) {
  return Promise.all(preloadFuncs.map(fn => fn()));
}
