import { useMemo, type ReactNode } from 'react';

import { useSetBreadcrumbs, type BreadcrumbItem } from '@/shared/lib/breadcrumb';

export interface PageBreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: PageBreadcrumbItem[];
  actions?: ReactNode;
  icon?: ReactNode;
}

export function PageHeader({ title, description, breadcrumbs, actions, icon }: PageHeaderProps) {
  // Convert to BreadcrumbItem format and set in header via context
  const breadcrumbItems = useMemo<BreadcrumbItem[]>(() => {
    return (
      breadcrumbs?.map(item => ({
        label: item.label,
        href: item.href,
      })) ?? []
    );
  }, [breadcrumbs]);

  useSetBreadcrumbs(breadcrumbItems);

  return (
    <header className="bg-background border-b">
      <div className="px-8 py-6">
        {/* Title and Actions */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            {icon && (
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-primary">
                {icon}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold truncate">{title}</h1>
              {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
            </div>
          </div>
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </div>
      </div>
    </header>
  );
}
