/**
 * Date Range Filter - Notion-style date range picker
 */

import { Calendar, X } from 'lucide-react';
import { useState } from 'react';

import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover';

export interface DateRange {
  from: string | null;
  to: string | null;
}

interface DateRangeFilterProps {
  label?: string;
  value: DateRange;
  onChange: (value: DateRange) => void;
  className?: string;
}

const PRESET_RANGES = [
  { label: '오늘', getValue: () => getDateRange(0) },
  { label: '어제', getValue: () => getDateRange(-1, -1) },
  { label: '최근 7일', getValue: () => getDateRange(-6) },
  { label: '최근 30일', getValue: () => getDateRange(-29) },
  { label: '이번 달', getValue: () => getMonthRange(0) },
  { label: '지난 달', getValue: () => getMonthRange(-1) },
];

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function getDateRange(fromDays: number, toDays = 0): DateRange {
  const today = new Date();
  const from = new Date(today);
  from.setDate(from.getDate() + fromDays);
  const to = new Date(today);
  to.setDate(to.getDate() + toDays);
  return { from: formatDate(from), to: formatDate(to) };
}

function getMonthRange(monthOffset: number): DateRange {
  const today = new Date();
  const from = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const to = new Date(today.getFullYear(), today.getMonth() + monthOffset + 1, 0);
  return { from: formatDate(from), to: formatDate(to) };
}

function formatDisplayDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

export function DateRangeFilter({
  label = '날짜',
  value,
  onChange,
  className,
}: DateRangeFilterProps) {
  const [open, setOpen] = useState(false);
  const [localFrom, setLocalFrom] = useState(value.from || '');
  const [localTo, setLocalTo] = useState(value.to || '');

  const hasValue = value.from || value.to;

  const getDisplayText = () => {
    if (!hasValue) return label;
    if (value.from && value.to) {
      return `${formatDisplayDate(value.from)} - ${formatDisplayDate(value.to)}`;
    }
    if (value.from) return `${formatDisplayDate(value.from)} ~`;
    if (value.to) return `~ ${formatDisplayDate(value.to)}`;
    return label;
  };

  const handlePresetClick = (preset: (typeof PRESET_RANGES)[number]) => {
    const range = preset.getValue();
    setLocalFrom(range.from || '');
    setLocalTo(range.to || '');
    onChange(range);
    setOpen(false);
  };

  const handleApply = () => {
    onChange({ from: localFrom || null, to: localTo || null });
    setOpen(false);
  };

  const handleClear = () => {
    setLocalFrom('');
    setLocalTo('');
    onChange({ from: null, to: null });
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'h-8 px-2.5 gap-1.5 font-normal',
            'hover:bg-muted/80',
            hasValue && 'bg-primary/10 text-primary hover:bg-primary/15',
            className
          )}
        >
          <Calendar className="h-3.5 w-3.5" />
          <span className="truncate max-w-[150px]">{getDisplayText()}</span>
          {hasValue && (
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                handleClear();
              }}
              className="ml-0.5 p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-3" align="start">
        <div className="space-y-3">
          {/* Preset buttons */}
          <div className="grid grid-cols-3 gap-1">
            {PRESET_RANGES.map(preset => (
              <button
                key={preset.label}
                type="button"
                onClick={() => handlePresetClick(preset)}
                className={cn(
                  'px-2 py-1.5 text-xs rounded-md transition-colors',
                  'hover:bg-muted text-muted-foreground hover:text-foreground'
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="border-t pt-3">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="text-xs text-muted-foreground mb-1 block">시작일</label>
                <input
                  type="date"
                  value={localFrom}
                  onChange={e => setLocalFrom(e.target.value)}
                  className={cn(
                    'w-full h-8 px-2 rounded-md text-sm',
                    'bg-muted/50 border-0',
                    'focus:outline-none focus:ring-1 focus:ring-ring'
                  )}
                />
              </div>
              <span className="text-muted-foreground mt-4">~</span>
              <div className="flex-1">
                <label className="text-xs text-muted-foreground mb-1 block">종료일</label>
                <input
                  type="date"
                  value={localTo}
                  onChange={e => setLocalTo(e.target.value)}
                  className={cn(
                    'w-full h-8 px-2 rounded-md text-sm',
                    'bg-muted/50 border-0',
                    'focus:outline-none focus:ring-1 focus:ring-ring'
                  )}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="ghost" size="sm" onClick={handleClear}>
              초기화
            </Button>
            <Button size="sm" onClick={handleApply}>
              적용
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
