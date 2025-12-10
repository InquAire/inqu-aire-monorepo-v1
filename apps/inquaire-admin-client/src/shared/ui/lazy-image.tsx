/**
 * LazyImage Component
 *
 * 이미지 지연 로딩 및 최적화 컴포넌트
 * - Intersection Observer를 사용한 지연 로딩
 * - 로딩 중 스켈레톤 표시
 * - 에러 처리
 * - 반응형 이미지 지원
 */

import { ImgHTMLAttributes, useEffect, useRef, useState } from 'react';

import { cn } from '../lib/utils';

interface LazyImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  /** 이미지 소스 URL */
  src: string;
  /** 대체 텍스트 (필수) */
  alt: string;
  /** 로딩 중 표시할 플레이스홀더 */
  placeholder?: string;
  /** 에러 시 표시할 이미지 */
  fallback?: string;
  /** 로딩 스켈레톤 높이 */
  skeletonHeight?: string;
  /** 로딩 완료 시 콜백 */
  onLoad?: () => void;
  /** 에러 발생 시 콜백 */
  onError?: () => void;
  /** 루트 마진 (기본값: '50px' - 뷰포트 50px 전에 로드 시작) */
  rootMargin?: string;
  /** 반응형 이미지 srcset */
  srcSet?: string;
  /** 반응형 이미지 sizes */
  sizes?: string;
}

export function LazyImage({
  src,
  alt,
  placeholder,
  fallback = '/images/image-placeholder.svg',
  skeletonHeight = '200px',
  className,
  onLoad,
  onError,
  rootMargin = '50px',
  srcSet,
  sizes,
  ...props
}: LazyImageProps) {
  const [imageSrc, setImageSrc] = useState<string | undefined>(placeholder);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    // Intersection Observer 생성
    if (!observerRef.current) {
      observerRef.current = new IntersectionObserver(
        entries => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              // 뷰포트에 들어오면 이미지 로드 시작
              setImageSrc(src);
              // 옵저버 해제
              if (imgRef.current && observerRef.current) {
                observerRef.current.unobserve(imgRef.current);
              }
            }
          });
        },
        {
          rootMargin,
          threshold: 0.01,
        }
      );
    }

    // 이미지 요소 관찰 시작
    if (imgRef.current && observerRef.current) {
      observerRef.current.observe(imgRef.current);
    }

    // 클린업
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [src, rootMargin]);

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
    onLoad?.();
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
    setImageSrc(fallback);
    onError?.();
  };

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {isLoading && !hasError && (
        <div
          className="absolute inset-0 animate-pulse bg-muted"
          style={{ height: skeletonHeight }}
        />
      )}
      <img
        ref={imgRef}
        src={imageSrc}
        srcSet={srcSet}
        sizes={sizes}
        alt={alt}
        className={cn(
          'transition-opacity duration-300',
          isLoading ? 'opacity-0' : 'opacity-100',
          className
        )}
        onLoad={handleLoad}
        onError={handleError}
        loading="lazy"
        {...props}
      />
    </div>
  );
}

/**
 * Avatar용 LazyImage
 */
interface LazyAvatarImageProps extends LazyImageProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const avatarSizes = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
  xl: 'h-16 w-16',
};

export function LazyAvatarImage({ size = 'md', className, ...props }: LazyAvatarImageProps) {
  return (
    <LazyImage
      className={cn('rounded-full object-cover', avatarSizes[size], className)}
      fallback="/images/avatar-placeholder.svg"
      {...props}
    />
  );
}

/**
 * 배경 이미지용 LazyImage
 */
interface LazyBackgroundImageProps {
  src: string;
  children?: React.ReactNode;
  className?: string;
  overlay?: boolean;
  overlayOpacity?: number;
  rootMargin?: string;
}

export function LazyBackgroundImage({
  src,
  children,
  className,
  overlay = false,
  overlayOpacity = 0.5,
  rootMargin = '50px',
}: LazyBackgroundImageProps) {
  const [backgroundImage, setBackgroundImage] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const divRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            // 이미지 프리로드
            const img = new Image();
            img.src = src;
            img.onload = () => {
              setBackgroundImage(src);
              setIsLoading(false);
            };
            img.onerror = () => {
              setIsLoading(false);
            };

            // 옵저버 해제
            if (divRef.current) {
              observer.unobserve(divRef.current);
            }
          }
        });
      },
      {
        rootMargin,
        threshold: 0.01,
      }
    );

    if (divRef.current) {
      observer.observe(divRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [src, rootMargin]);

  return (
    <div
      ref={divRef}
      className={cn('relative bg-muted', className)}
      style={{
        backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {isLoading && <div className="absolute inset-0 animate-pulse bg-muted" />}
      {overlay && backgroundImage && (
        <div className="absolute inset-0 bg-black" style={{ opacity: overlayOpacity }} />
      )}
      {children && <div className="relative z-10">{children}</div>}
    </div>
  );
}
