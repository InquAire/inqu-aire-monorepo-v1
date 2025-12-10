import { Trash2, X, type LucideIcon } from 'lucide-react';

import { Button } from './button';
import { Separator } from './separator';

export interface BulkAction {
  label: string;
  icon?: LucideIcon;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  onClick: (selectedIds: (string | number)[]) => void;
}

interface TableBulkActionsProps {
  selectedCount: number;
  totalCount?: number;
  onClearSelection: () => void;
  actions?: BulkAction[];
  selectedIds: (string | number)[];
}

/**
 * 테이블 일괄 작업 바
 *
 * 사용법:
 * <TableBulkActions
 *   selectedCount={selectedCount}
 *   totalCount={data.length}
 *   selectedIds={selected}
 *   onClearSelection={deselectAll}
 *   actions={[
 *     {
 *       label: '삭제',
 *       icon: Trash2,
 *       variant: 'destructive',
 *       onClick: (ids) => handleBulkDelete(ids),
 *     },
 *   ]}
 * />
 */
export function TableBulkActions({
  selectedCount,
  totalCount,
  onClearSelection,
  actions = [],
  selectedIds,
}: TableBulkActionsProps) {
  if (selectedCount === 0) {
    return null;
  }

  return (
    <div className="sticky top-0 z-10 flex items-center gap-3 rounded-lg border bg-blue-50 px-4 py-3 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-medium text-blue-900">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
          {selectedCount}
        </span>
        <span>
          {selectedCount}개 선택됨
          {totalCount !== undefined && ` / 전체 ${totalCount}개`}
        </span>
      </div>

      <Separator orientation="vertical" className="h-6" />

      <div className="flex flex-1 items-center gap-2">
        {actions.map((action, index) => {
          const Icon = action.icon;
          return (
            <Button
              key={index}
              size="sm"
              variant={action.variant || 'default'}
              onClick={() => action.onClick(selectedIds)}
              className="gap-2"
            >
              {Icon && <Icon className="h-4 w-4" />}
              {action.label}
            </Button>
          );
        })}
      </div>

      <Button
        size="sm"
        variant="ghost"
        onClick={onClearSelection}
        className="gap-2 text-blue-900 hover:bg-blue-100 hover:text-blue-900"
        aria-label="선택 해제"
      >
        <X className="h-4 w-4" />
        선택 해제
      </Button>
    </div>
  );
}

/**
 * 기본 일괄 작업 액션들
 */
export const commonBulkActions = {
  delete: (onDelete: (ids: (string | number)[]) => void): BulkAction => ({
    label: '삭제',
    icon: Trash2,
    variant: 'destructive',
    onClick: onDelete,
  }),
};
