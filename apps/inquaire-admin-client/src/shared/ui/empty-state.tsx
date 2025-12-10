import { type LucideIcon, FileQuestion, Inbox, MessageSquare, Search, Users } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  variant?: 'default' | 'search' | 'error';
}

/**
 * Production-ready Empty State Component
 *
 * Usage:
 * <EmptyState
 *   icon={Users}
 *   title="고객이 없습니다"
 *   description="첫 번째 고객을 추가해보세요."
 *   action={{ label: '고객 추가', onClick: () => setShowDialog(true) }}
 * />
 */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  variant = 'default',
}: EmptyStateProps) {
  const bgColor =
    variant === 'error' ? 'bg-red-50' : variant === 'search' ? 'bg-blue-50' : 'bg-gray-50';
  const iconColor =
    variant === 'error' ? 'text-red-600' : variant === 'search' ? 'text-blue-600' : 'text-gray-400';

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className={`flex items-center justify-center w-16 h-16 rounded-full ${bgColor} mb-4`}>
        <Icon className={`w-8 h-8 ${iconColor}`} />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      {description && <p className="text-sm text-gray-600 max-w-md mb-6">{description}</p>}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

/**
 * Specific empty state variants
 */
export function NoSearchResults({ onClear }: { onClear?: () => void }) {
  return (
    <EmptyState
      icon={Search}
      title="검색 결과가 없습니다"
      description="다른 검색어로 시도해보세요."
      variant="search"
      action={onClear ? { label: '검색 초기화', onClick: onClear } : undefined}
    />
  );
}

export function NoInquiries({ onCreate }: { onCreate?: () => void }) {
  return (
    <EmptyState
      icon={MessageSquare}
      title="문의가 없습니다"
      description="고객 문의가 들어오면 여기에 표시됩니다."
      action={onCreate ? { label: '테스트 문의 생성', onClick: onCreate } : undefined}
    />
  );
}

export function NoCustomers({ onCreate }: { onCreate?: () => void }) {
  return (
    <EmptyState
      icon={Users}
      title="고객이 없습니다"
      description="첫 번째 고객을 추가하거나, 문의가 들어오면 자동으로 생성됩니다."
      action={onCreate ? { label: '고객 추가', onClick: onCreate } : undefined}
    />
  );
}

export function NoData({ message = '데이터가 없습니다' }: { message?: string }) {
  return <EmptyState icon={FileQuestion} title={message} description="나중에 다시 확인해주세요." />;
}
