/**
 * Stats Card - Notion-style statistics card component
 */

import { type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/shared/lib/utils';
import { Card } from '@/shared/ui/card';
import { Skeleton } from '@/shared/ui/skeleton';

export interface StatsCardProps {
  label: string;
  value: string | number | ReactNode;
  icon?: LucideIcon;
  trend?: {
    value: number;
    label?: string;
  };
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  loading?: boolean;
  className?: string;
}

const variantStyles = {
  default: {
    icon: 'bg-muted text-muted-foreground',
    value: 'text-foreground',
  },
  primary: {
    icon: 'bg-primary/10 text-primary',
    value: 'text-primary',
  },
  success: {
    icon: 'bg-emerald-500/10 text-emerald-600',
    value: 'text-emerald-600',
  },
  warning: {
    icon: 'bg-amber-500/10 text-amber-600',
    value: 'text-amber-600',
  },
  danger: {
    icon: 'bg-red-500/10 text-red-600',
    value: 'text-red-600',
  },
};

export function StatsCard({
  label,
  value,
  icon: Icon,
  trend,
  variant = 'default',
  loading = false,
  className,
}: StatsCardProps) {
  const styles = variantStyles[variant];

  return (
    <Card
      className={cn(
        'relative overflow-hidden transition-all hover:shadow-md',
        'border border-border/50',
        className
      )}
    >
      <div className="px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground truncate">{label}</p>
            {loading ? (
              <Skeleton className="h-7 w-16 mt-0.5" />
            ) : (
              <p className={cn('text-xl font-bold tracking-tight mt-0.5', styles.value)}>{value}</p>
            )}
            {trend && !loading && (
              <div className="flex items-center gap-1 mt-0.5">
                <span
                  className={cn(
                    'text-xs font-medium',
                    trend.value >= 0 ? 'text-emerald-600' : 'text-red-600'
                  )}
                >
                  {trend.value >= 0 ? '+' : ''}
                  {trend.value}%
                </span>
                {trend.label && (
                  <span className="text-xs text-muted-foreground">{trend.label}</span>
                )}
              </div>
            )}
          </div>
          {Icon && (
            <div className={cn('rounded-lg p-2 shrink-0', styles.icon)}>
              <Icon className="h-4 w-4" />
            </div>
          )}
        </div>
      </div>
      {/* Subtle gradient overlay */}
      <div
        className={cn(
          'absolute inset-0 bg-gradient-to-br opacity-[0.03] pointer-events-none',
          variant === 'primary' && 'from-primary to-transparent',
          variant === 'success' && 'from-emerald-500 to-transparent',
          variant === 'warning' && 'from-amber-500 to-transparent',
          variant === 'danger' && 'from-red-500 to-transparent'
        )}
      />
    </Card>
  );
}

export interface StatsGridProps {
  children: ReactNode;
  columns?: 2 | 3 | 4;
  className?: string;
}

export function StatsGrid({ children, columns = 4, className }: StatsGridProps) {
  return (
    <div
      className={cn(
        'grid gap-4 mb-6',
        columns === 2 && 'grid-cols-1 sm:grid-cols-2',
        columns === 3 && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
        columns === 4 && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
        className
      )}
    >
      {children}
    </div>
  );
}
