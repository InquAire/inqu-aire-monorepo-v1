/**
 * 테이블 정렬 및 유틸리티 함수
 */

export type SortDirection = 'asc' | 'desc' | null;

export interface SortConfig<T = Record<string, unknown>> {
  key: keyof T | string;
  direction: SortDirection;
}

export interface ColumnConfig<T = Record<string, unknown>> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  visible?: boolean;
  width?: string | number;
  render?: (value: unknown, row: T) => React.ReactNode;
}

/**
 * 배열 정렬 함수
 */
export function sortData<T>(data: T[], sortConfig: SortConfig<T> | null): T[] {
  if (!sortConfig || !sortConfig.direction) {
    return data;
  }

  const sorted = [...data].sort((a, b) => {
    const aValue = getNestedValue(a as Record<string, unknown>, sortConfig.key as string);
    const bValue = getNestedValue(b as Record<string, unknown>, sortConfig.key as string);

    // null/undefined 처리
    if (aValue == null && bValue == null) return 0;
    if (aValue == null) return 1;
    if (bValue == null) return -1;

    // 문자열 비교
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return aValue.localeCompare(bValue, 'ko-KR');
    }

    // 숫자 비교
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return aValue - bValue;
    }

    // 날짜 비교
    if (aValue instanceof Date && bValue instanceof Date) {
      return aValue.getTime() - bValue.getTime();
    }

    // 불리언 비교
    if (typeof aValue === 'boolean' && typeof bValue === 'boolean') {
      return aValue === bValue ? 0 : aValue ? -1 : 1;
    }

    // 기본 비교
    return String(aValue).localeCompare(String(bValue), 'ko-KR');
  });

  return sortConfig.direction === 'desc' ? sorted.reverse() : sorted;
}

/**
 * 중첩된 객체 값 가져오기
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((current, key) => {
    if (current && typeof current === 'object' && key in current) {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

/**
 * 다음 정렬 방향 계산
 */
export function getNextSortDirection(currentDirection: SortDirection): SortDirection {
  if (currentDirection === null) return 'asc';
  if (currentDirection === 'asc') return 'desc';
  return null;
}

/**
 * 테이블 설정을 LocalStorage에 저장
 */
export function saveTableConfig<T>(
  tableId: string,
  config: {
    columns?: ColumnConfig<T>[];
    sortConfig?: SortConfig<T>;
    pageSize?: number;
  }
) {
  try {
    const stored = localStorage.getItem(`table-config-${tableId}`) || '{}';
    const current = JSON.parse(stored);
    const updated = { ...current, ...config };
    localStorage.setItem(`table-config-${tableId}`, JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to save table config:', error);
  }
}

/**
 * LocalStorage에서 테이블 설정 불러오기
 */
export function loadTableConfig<T>(tableId: string): {
  columns?: ColumnConfig<T>[];
  sortConfig?: SortConfig<T>;
  pageSize?: number;
} | null {
  try {
    const stored = localStorage.getItem(`table-config-${tableId}`);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error('Failed to load table config:', error);
    return null;
  }
}

/**
 * 컬럼 표시/숨김 토글
 */
export function toggleColumnVisibility<T>(
  columns: ColumnConfig<T>[],
  columnKey: keyof T | string
): ColumnConfig<T>[] {
  return columns.map(col => (col.key === columnKey ? { ...col, visible: !col.visible } : col));
}

/**
 * 선택된 행 ID 관리
 */
export class SelectionManager {
  private selected: Set<string | number>;

  constructor(initialSelection: (string | number)[] = []) {
    this.selected = new Set(initialSelection);
  }

  toggle(id: string | number): this {
    if (this.selected.has(id)) {
      this.selected.delete(id);
    } else {
      this.selected.add(id);
    }
    return this;
  }

  select(id: string | number): this {
    this.selected.add(id);
    return this;
  }

  deselect(id: string | number): this {
    this.selected.delete(id);
    return this;
  }

  selectAll(ids: (string | number)[]): this {
    ids.forEach(id => this.selected.add(id));
    return this;
  }

  deselectAll(): this {
    this.selected.clear();
    return this;
  }

  isSelected(id: string | number): boolean {
    return this.selected.has(id);
  }

  getSelected(): (string | number)[] {
    return Array.from(this.selected);
  }

  getCount(): number {
    return this.selected.size;
  }

  isEmpty(): boolean {
    return this.selected.size === 0;
  }
}

/**
 * 행 선택 Hook
 */
import { useCallback, useState } from 'react';

export function useRowSelection<T extends { id: string | number }>(
  initialSelection: (string | number)[] = []
) {
  const [selected, setSelected] = useState<Set<string | number>>(new Set(initialSelection));

  const toggleRow = useCallback((id: string | number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectRow = useCallback((id: string | number) => {
    setSelected(prev => new Set(prev).add(id));
  }, []);

  const deselectRow = useCallback((id: string | number) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const selectAll = useCallback((ids: (string | number)[]) => {
    setSelected(new Set(ids));
  }, []);

  const deselectAll = useCallback(() => {
    setSelected(new Set());
  }, []);

  const isSelected = useCallback((id: string | number) => selected.has(id), [selected]);

  const toggleAll = useCallback(
    (data: T[]) => {
      const allIds = data.map(item => item.id);
      const allSelected = allIds.every(id => selected.has(id));

      if (allSelected) {
        deselectAll();
      } else {
        selectAll(allIds);
      }
    },
    [selected, selectAll, deselectAll]
  );

  const isAllSelected = useCallback(
    (data: T[]) => {
      if (data.length === 0) return false;
      return data.every(item => selected.has(item.id));
    },
    [selected]
  );

  const isSomeSelected = useCallback(
    (data: T[]) => {
      if (data.length === 0) return false;
      return data.some(item => selected.has(item.id)) && !isAllSelected(data);
    },
    [selected, isAllSelected]
  );

  return {
    selected: Array.from(selected),
    selectedSet: selected,
    selectedCount: selected.size,
    isEmpty: selected.size === 0,
    toggleRow,
    selectRow,
    deselectRow,
    selectAll,
    deselectAll,
    isSelected,
    toggleAll,
    isAllSelected,
    isSomeSelected,
  };
}

/**
 * 테이블 정렬 Hook
 */
export function useTableSort<T>(initialSort?: SortConfig<T>) {
  const [sortConfig, setSortConfig] = useState<SortConfig<T> | null>(initialSort || null);

  const requestSort = useCallback((key: keyof T | string) => {
    setSortConfig(current => {
      if (current?.key === key) {
        const nextDirection = getNextSortDirection(current.direction);
        return nextDirection === null ? null : { key, direction: nextDirection };
      }
      return { key, direction: 'asc' };
    });
  }, []);

  const resetSort = useCallback(() => {
    setSortConfig(null);
  }, []);

  return {
    sortConfig,
    requestSort,
    resetSort,
    sortData: useCallback((data: T[]) => sortData(data, sortConfig), [sortConfig]),
  };
}
