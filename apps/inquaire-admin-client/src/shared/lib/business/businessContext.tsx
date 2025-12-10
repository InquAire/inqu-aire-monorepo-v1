/**
 * Business Context
 * Manages currently selected business state for personalization
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { useBusinesses, type Business } from '@/entities/business';
import { useOrganizationSafe } from '@/shared/lib/organization';

const CURRENT_BUSINESS_KEY = 'current_business_id';

export interface BusinessInfo {
  id: string;
  name: string;
  industry_type: string;
}

interface BusinessContextValue {
  /** List of businesses in the current organization */
  businesses: BusinessInfo[];
  /** Currently selected business */
  currentBusiness: BusinessInfo | null;
  /** Set the current business */
  setCurrentBusiness: (business: BusinessInfo) => void;
  /** Whether the context is loading */
  isLoading: boolean;
  /** Whether the user has multiple businesses */
  hasMultipleBusinesses: boolean;
  /** Reset business selection (e.g., on logout) */
  resetBusiness: () => void;
}

const BusinessContext = createContext<BusinessContextValue | undefined>(undefined);

interface BusinessProviderProps {
  children: React.ReactNode;
}

export function BusinessProvider({ children }: BusinessProviderProps) {
  const orgContext = useOrganizationSafe();
  const currentOrganization = orgContext?.currentOrganization ?? null;
  const { data: businessesData, isLoading: businessesLoading } = useBusinesses(
    currentOrganization?.id ?? ''
  );

  // Convert Business[] to BusinessInfo[]
  const businesses: BusinessInfo[] = useMemo(() => {
    if (!businessesData) return [];
    return (businessesData as Business[]).map(b => ({
      id: b.id,
      name: b.name,
      industry_type: b.industry_type,
    }));
  }, [businessesData]);

  const [currentBusiness, setCurrentBusinessState] = useState<BusinessInfo | null>(null);

  // Initialize current business from localStorage or first business
  useEffect(() => {
    if (businesses.length === 0) {
      setCurrentBusinessState(null);
      return;
    }

    const savedBusinessId = localStorage.getItem(CURRENT_BUSINESS_KEY);

    if (savedBusinessId) {
      const savedBusiness = businesses.find(b => b.id === savedBusinessId);
      if (savedBusiness) {
        setCurrentBusinessState(savedBusiness);
        return;
      }
    }

    // Default to first business
    setCurrentBusinessState(businesses[0]);
    localStorage.setItem(CURRENT_BUSINESS_KEY, businesses[0].id);
  }, [businesses]);

  const setCurrentBusiness = useCallback((business: BusinessInfo) => {
    setCurrentBusinessState(business);
    localStorage.setItem(CURRENT_BUSINESS_KEY, business.id);
  }, []);

  const resetBusiness = useCallback(() => {
    setCurrentBusinessState(null);
    localStorage.removeItem(CURRENT_BUSINESS_KEY);
  }, []);

  const value = useMemo<BusinessContextValue>(
    () => ({
      businesses,
      currentBusiness,
      setCurrentBusiness,
      isLoading: businessesLoading,
      hasMultipleBusinesses: businesses.length > 1,
      resetBusiness,
    }),
    [businesses, currentBusiness, setCurrentBusiness, businessesLoading, resetBusiness]
  );

  return <BusinessContext.Provider value={value}>{children}</BusinessContext.Provider>;
}

export function useBusinessContext() {
  const context = useContext(BusinessContext);
  if (context === undefined) {
    throw new Error('useBusinessContext must be used within a BusinessProvider');
  }
  return context;
}

/**
 * Hook to get the current business ID
 * Returns null if no business is selected
 */
export function useCurrentBusinessId(): string | null {
  const { currentBusiness } = useBusinessContext();
  return currentBusiness?.id ?? null;
}

/**
 * Hook to require a business to be selected
 * Throws if no business is selected
 */
export function useRequiredBusinessId(): string {
  const businessId = useCurrentBusinessId();
  if (!businessId) {
    throw new Error('No business selected. Please select a business first.');
  }
  return businessId;
}
