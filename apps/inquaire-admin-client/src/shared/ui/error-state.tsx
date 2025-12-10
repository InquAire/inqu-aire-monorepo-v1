import { AlertCircle, RefreshCw, ServerCrash, WifiOff } from 'lucide-react';
import { type ReactNode } from 'react';

interface ErrorStateProps {
  title?: string;
  message?: string;
  error?: Error | null;
  onRetry?: () => void;
  retryLabel?: string;
  variant?: 'network' | 'server' | 'generic';
}

/**
 * Production-ready Error State Component
 *
 * Usage:
 * <ErrorState
 *   title="데이터를 불러오지 못했습니다"
 *   message="네트워크 연결을 확인해주세요."
 *   onRetry={() => refetch()}
 *   variant="network"
 * />
 */
export function ErrorState({
  title = '오류가 발생했습니다',
  message,
  error,
  onRetry,
  retryLabel = '다시 시도',
  variant = 'generic',
}: ErrorStateProps) {
  const Icon = variant === 'network' ? WifiOff : variant === 'server' ? ServerCrash : AlertCircle;
  const defaultMessage =
    variant === 'network'
      ? '네트워크 연결을 확인해주세요.'
      : variant === 'server'
        ? '서버에 일시적인 문제가 발생했습니다.'
        : '예기치 않은 오류가 발생했습니다.';

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-50 mb-4">
        <Icon className="w-8 h-8 text-red-600" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-600 max-w-md mb-2">{message || defaultMessage}</p>

      {error && import.meta.env.DEV && (
        <details className="mt-4 text-left max-w-md w-full">
          <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
            개발자 정보 보기
          </summary>
          <pre className="mt-2 p-4 bg-gray-100 rounded-lg text-xs text-gray-800 overflow-auto max-h-40">
            {error.message}
            {error.stack && `\n\n${error.stack}`}
          </pre>
        </details>
      )}

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          {retryLabel}
        </button>
      )}
    </div>
  );
}

/**
 * Inline error alert (for forms, etc.)
 */
export function ErrorAlert({
  children,
  onDismiss,
}: {
  children: ReactNode;
  onDismiss?: () => void;
}) {
  return (
    <div className="rounded-lg bg-red-50 p-4 border border-red-200">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm text-red-800">{children}</p>
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="text-red-600 hover:text-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 rounded p-1"
            aria-label="닫기"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Success alert
 */
export function SuccessAlert({
  children,
  onDismiss,
}: {
  children: ReactNode;
  onDismiss?: () => void;
}) {
  return (
    <div className="rounded-lg bg-green-50 p-4 border border-green-200">
      <div className="flex items-start gap-3">
        <svg
          className="h-5 w-5 text-green-600 shrink-0 mt-0.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <div className="flex-1">
          <p className="text-sm text-green-800">{children}</p>
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="text-green-600 hover:text-green-800 focus:outline-none focus:ring-2 focus:ring-green-500 rounded p-1"
            aria-label="닫기"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
