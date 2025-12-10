/**
 * Filter Bar - Notion-style unified filter/search component
 *
 * Features:
 * - Search input with debouncing
 * - Multiple filter dropdowns
 * - Date range filter
 * - Active filter chips display
 * - Clear all filters
 */

import { RotateCcw, SlidersHorizontal } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';

import { DateRangeFilter, type DateRange } from './date-range-filter';
import { FilterChip } from './filter-chip';
import { FilterDropdown, type FilterOption } from './filter-dropdown';
import { SearchInput } from './search-input';

export interface FilterConfig {
  key: string;
  label: string;
  type: 'select' | 'multiselect' | 'date-range';
  options?: FilterOption[];
  searchable?: boolean;
}

export interface FilterBarProps {
  // Search
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  showSearch?: boolean;

  // Filters
  filters?: FilterConfig[];
  filterValues?: Record<string, string | string[] | DateRange>;
  onFilterChange?: (key: string, value: string | string[] | DateRange) => void;

  // Actions
  onClearAll?: () => void;
  showClearAll?: boolean;

  // Customization
  className?: string;
  leftSlot?: ReactNode;
  rightSlot?: ReactNode;

  // Active filters display
  showActiveFilters?: boolean;
}

export function FilterBar({
  searchValue = '',
  onSearchChange,
  searchPlaceholder = '검색...',
  showSearch = true,
  filters = [],
  filterValues = {},
  onFilterChange,
  onClearAll,
  showClearAll = true,
  className,
  leftSlot,
  rightSlot,
  showActiveFilters = true,
}: FilterBarProps) {
  const hasActiveFilters =
    searchValue ||
    Object.entries(filterValues).some(([, value]) => {
      if (!value) return false;
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === 'object' && 'from' in value) {
        return value.from || value.to;
      }
      return Boolean(value);
    });

  const getActiveFilterChips = () => {
    const chips: { key: string; label: string; value: string; onRemove: () => void }[] = [];

    filters.forEach(filter => {
      const value = filterValues[filter.key];
      if (!value) return;

      if (filter.type === 'date-range' && typeof value === 'object' && 'from' in value) {
        if (value.from || value.to) {
          const displayValue =
            value.from && value.to
              ? `${value.from} ~ ${value.to}`
              : value.from
                ? `${value.from} ~`
                : `~ ${value.to}`;
          chips.push({
            key: filter.key,
            label: filter.label,
            value: displayValue,
            onRemove: () => onFilterChange?.(filter.key, { from: null, to: null }),
          });
        }
      } else if (filter.type === 'multiselect' && Array.isArray(value) && value.length > 0) {
        const labels = value
          .map(v => filter.options?.find(o => o.value === v)?.label || v)
          .join(', ');
        chips.push({
          key: filter.key,
          label: filter.label,
          value: labels,
          onRemove: () => onFilterChange?.(filter.key, []),
        });
      } else if (filter.type === 'select' && typeof value === 'string' && value) {
        const option = filter.options?.find(o => o.value === value);
        chips.push({
          key: filter.key,
          label: filter.label,
          value: option?.label || value,
          onRemove: () => onFilterChange?.(filter.key, ''),
        });
      }
    });

    return chips;
  };

  const activeChips = showActiveFilters ? getActiveFilterChips() : [];

  return (
    <div className={cn('space-y-2', className)}>
      {/* Main filter bar */}
      <div className="flex items-center gap-2 flex-wrap">
        {leftSlot}

        {/* Search input */}
        {showSearch && onSearchChange && (
          <SearchInput
            value={searchValue}
            onChange={onSearchChange}
            placeholder={searchPlaceholder}
            className="w-[200px]"
          />
        )}

        {/* Filter icon separator */}
        {filters.length > 0 && (
          <div className="flex items-center gap-1 text-muted-foreground">
            <SlidersHorizontal className="h-4 w-4" />
          </div>
        )}

        {/* Filter dropdowns */}
        {filters.map(filter => {
          const value = filterValues[filter.key];

          if (filter.type === 'date-range') {
            return (
              <DateRangeFilter
                key={filter.key}
                label={filter.label}
                value={(value as DateRange) || { from: null, to: null }}
                onChange={newValue => onFilterChange?.(filter.key, newValue)}
              />
            );
          }

          return (
            <FilterDropdown
              key={filter.key}
              label={filter.label}
              options={filter.options || []}
              value={(value as string | string[]) || (filter.type === 'multiselect' ? [] : '')}
              onChange={newValue => onFilterChange?.(filter.key, newValue)}
              multiple={filter.type === 'multiselect'}
              searchable={filter.searchable}
            />
          );
        })}

        {/* Clear all button */}
        {showClearAll && hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            className="h-8 px-2 text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            초기화
          </Button>
        )}

        {/* Right slot (for actions like "Add filter", etc.) */}
        {rightSlot && <div className="ml-auto flex items-center gap-2">{rightSlot}</div>}
      </div>

      {/* Active filter chips */}
      {showActiveFilters && activeChips.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-muted-foreground mr-1">적용된 필터:</span>
          {activeChips.map(chip => (
            <FilterChip
              key={chip.key}
              label={chip.label}
              value={chip.value}
              onRemove={chip.onRemove}
              active
            />
          ))}
        </div>
      )}
    </div>
  );
}
