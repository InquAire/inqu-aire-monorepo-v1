/**
 * Breadcrumb Context
 * Manages breadcrumb state for the main header
 */

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbContextValue {
  breadcrumbs: BreadcrumbItem[];
  setBreadcrumbs: (items: BreadcrumbItem[]) => void;
  clearBreadcrumbs: () => void;
}

const BreadcrumbContext = createContext<BreadcrumbContextValue | undefined>(undefined);

interface BreadcrumbProviderProps {
  children: React.ReactNode;
}

export function BreadcrumbProvider({ children }: BreadcrumbProviderProps) {
  const [breadcrumbs, setBreadcrumbsState] = useState<BreadcrumbItem[]>([]);

  const setBreadcrumbs = useCallback((items: BreadcrumbItem[]) => {
    setBreadcrumbsState(items);
  }, []);

  const clearBreadcrumbs = useCallback(() => {
    setBreadcrumbsState([]);
  }, []);

  const value = useMemo<BreadcrumbContextValue>(
    () => ({
      breadcrumbs,
      setBreadcrumbs,
      clearBreadcrumbs,
    }),
    [breadcrumbs, setBreadcrumbs, clearBreadcrumbs]
  );

  return <BreadcrumbContext.Provider value={value}>{children}</BreadcrumbContext.Provider>;
}

export function useBreadcrumb() {
  const context = useContext(BreadcrumbContext);
  if (context === undefined) {
    throw new Error('useBreadcrumb must be used within a BreadcrumbProvider');
  }
  return context;
}

/**
 * Hook to set breadcrumbs on component mount
 */
export function useSetBreadcrumbs(items: BreadcrumbItem[]) {
  const { setBreadcrumbs } = useBreadcrumb();

  React.useEffect(() => {
    setBreadcrumbs(items);
  }, [items, setBreadcrumbs]);
}
