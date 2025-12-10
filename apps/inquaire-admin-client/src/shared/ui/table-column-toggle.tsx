import { Settings2 } from 'lucide-react';

import type { ColumnConfig } from '../lib/table-utils';

import { Button } from './button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './dropdown-menu';

interface TableColumnToggleProps<T = Record<string, unknown>> {
  columns: ColumnConfig<T>[];
  onColumnsChange: (columns: ColumnConfig<T>[]) => void;
}

/**
 * 테이블 컬럼 표시/숨김 토글 컴포넌트
 *
 * 사용법:
 * <TableColumnToggle
 *   columns={columns}
 *   onColumnsChange={setColumns}
 * />
 */
export function TableColumnToggle<T = Record<string, unknown>>({
  columns,
  onColumnsChange,
}: TableColumnToggleProps<T>) {
  const toggleColumn = (columnKey: keyof T | string) => {
    const updated = columns.map(col =>
      col.key === columnKey ? { ...col, visible: col.visible === false ? true : false } : col
    );
    onColumnsChange(updated);
  };

  const visibleCount = columns.filter(col => col.visible !== false).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings2 className="h-4 w-4" />
          컬럼 ({visibleCount}/{columns.length})
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>컬럼 표시 설정</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {columns.map(column => (
          <DropdownMenuCheckboxItem
            key={String(column.key)}
            checked={column.visible !== false}
            onCheckedChange={() => toggleColumn(column.key)}
          >
            {column.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
