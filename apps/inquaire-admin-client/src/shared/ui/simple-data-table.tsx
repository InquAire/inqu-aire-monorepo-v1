import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import * as React from 'react';

import { Button } from './button';
import { useTablePagination, useTableSearch, useTableSort } from './hooks';
import { Input } from './input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './table';

import { PAGINATION } from '@/shared/config/pagination-config';

export interface Column<T> {
  key: string;
  title: string;
  render?: (value: unknown, row: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
  hidden?: boolean;
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  searchable?: boolean;
  searchPlaceholder?: string;
  searchKeys?: (keyof T)[]; // Keys to search in
  pageSize?: number;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  rowClassName?: (row: T) => string;
  loading?: boolean;
}

export function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  searchable = false,
  searchPlaceholder = '검색...',
  searchKeys,
  pageSize = PAGINATION.DEFAULT_PAGE_SIZE,
  emptyMessage = '데이터가 없습니다.',
  onRowClick,
  rowClassName,
  loading = false,
}: DataTableProps<T>) {
  // Use custom hooks for table functionality
  const { searchQuery, setSearchQuery, filteredData } = useTableSearch(data, searchKeys);
  const { sortColumn, sortDirection, sortedData, handleSort } = useTableSort(filteredData);
  const { currentPage, totalPages, paginatedData, handlePreviousPage, handleNextPage } =
    useTablePagination(sortedData, pageSize, [searchQuery]);

  // Filter out hidden columns
  const visibleColumns = columns.filter(col => !col.hidden);

  return (
    <div className="space-y-4">
      {/* Search */}
      {searchable && (
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-slate-200 dark:border-slate-700 hover:bg-transparent">
              {visibleColumns.map(column => (
                <TableHead
                  key={column.key}
                  style={{ width: column.width }}
                  className={column.sortable ? 'cursor-pointer select-none' : ''}
                  onClick={() => column.sortable && handleSort(column.key as keyof T)}
                >
                  <div className="flex items-center gap-2">
                    {column.title}
                    {column.sortable && sortColumn === column.key && (
                      <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={visibleColumns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  로딩 중...
                </TableCell>
              </TableRow>
            ) : paginatedData.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={visibleColumns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((row, rowIndex) => (
                <TableRow
                  key={rowIndex}
                  className={`
                    ${onRowClick ? 'cursor-pointer' : ''}
                    ${rowClassName ? rowClassName(row) : ''}
                    hover:bg-slate-50 dark:hover:bg-slate-800
                  `}
                  onClick={() => onRowClick?.(row)}
                >
                  {visibleColumns.map(column => {
                    const value = row[column.key as keyof T];
                    return (
                      <TableCell key={column.key}>
                        {column.render
                          ? column.render(value, row)
                          : (value as React.ReactNode)}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {sortedData.length}개 중 {(currentPage - 1) * pageSize + 1}-
            {Math.min(currentPage * pageSize, sortedData.length)}개 표시
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreviousPage}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              이전
            </Button>
            <div className="text-sm">
              {currentPage} / {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
            >
              다음
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
