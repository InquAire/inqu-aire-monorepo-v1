/**
 * Filter Chip - Notion-style filter tag
 */

import { X } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/shared/lib/utils';

interface FilterChipProps {
  label: string;
  value?: ReactNode;
  onRemove?: () => void;
  onClick?: () => void;
  active?: boolean;
  className?: string;
}

export function FilterChip({
  label,
  value,
  onRemove,
  onClick,
  active = false,
  className,
}: FilterChipProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-sm transition-colors',
        'border border-transparent',
        active
          ? 'bg-primary/10 text-primary border-primary/20'
          : 'bg-muted/60 text-muted-foreground hover:bg-muted',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {value && (
        <>
          <span className="text-muted-foreground/50">:</span>
          <span className="font-medium">{value}</span>
        </>
      )}
      {onRemove && (
        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
