'use client';

import { type Table } from '@tanstack/react-table';
import { Search, X } from 'lucide-react';

import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';

interface FilterOption {
  label: string;
  value: string;
}

interface FilterableColumn {
  id: string;
  title: string;
  options: FilterOption[];
}

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  searchKey?: string;
  searchPlaceholder?: string;
  filterableColumns?: FilterableColumn[];
}

export function DataTableToolbar<TData>({
  table,
  searchKey,
  searchPlaceholder = '검색...',
  filterableColumns = [],
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0;

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center space-x-2">
        {/* Search input */}
        {searchKey && (
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ''}
              onChange={event => table.getColumn(searchKey)?.setFilterValue(event.target.value)}
              className="h-8 w-[150px] pl-9 lg:w-[250px]"
            />
          </div>
        )}

        {/* Filter dropdowns */}
        {filterableColumns.map(column => {
          const tableColumn = table.getColumn(column.id);
          if (!tableColumn) return null;

          return (
            <Select
              key={column.id}
              value={(tableColumn.getFilterValue() as string) ?? 'all'}
              onValueChange={value =>
                tableColumn.setFilterValue(value === 'all' ? undefined : value)
              }
            >
              <SelectTrigger className="h-8 w-[130px]">
                <SelectValue placeholder={column.title} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 {column.title}</SelectItem>
                {column.options.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        })}

        {/* Reset filters button */}
        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => table.resetColumnFilters()}
            className="h-8 px-2 lg:px-3"
          >
            초기화
            <X className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Column visibility toggle can be added here */}
    </div>
  );
}
