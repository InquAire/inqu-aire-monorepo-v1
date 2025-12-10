/**
 * Organization Context
 * Manages current organization state and permissions
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import {
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
  type OrganizationRole,
  type Permission,
} from './permissions';
import type { Organization, OrganizationMembership } from './types';

const STORAGE_KEY = 'inquaire_current_org';

interface OrganizationContextValue {
  // Current organization
  currentOrganization: Organization | null;
  currentRole: OrganizationRole | null;
  currentPermissions: string[];

  // All memberships
  organizations: OrganizationMembership[];

  // Actions
  setOrganizations: (orgs: OrganizationMembership[]) => void;
  switchOrganization: (orgId: string) => void;
  clearOrganization: () => void;

  // Permission helpers
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  hasAllPermissions: (permissions: Permission[]) => boolean;

  // State
  isLoading: boolean;
}

const OrganizationContext = createContext<OrganizationContextValue | undefined>(undefined);

interface OrganizationProviderProps {
  children: React.ReactNode;
  initialOrganizations?: OrganizationMembership[];
}

export function OrganizationProvider({
  children,
  initialOrganizations = [],
}: OrganizationProviderProps) {
  const [organizations, setOrganizationsState] =
    useState<OrganizationMembership[]>(initialOrganizations);
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(() => {
    // Restore from localStorage
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_KEY);
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(true);

  // Get current organization from memberships
  const currentMembership = useMemo(() => {
    if (!currentOrgId || organizations.length === 0) return null;
    return organizations.find(m => m.organization.id === currentOrgId) || null;
  }, [currentOrgId, organizations]);

  const currentOrganization = currentMembership?.organization || null;
  const currentRole = currentMembership?.role || null;
  const currentPermissions = currentMembership?.permissions;

  // Auto-select first organization if none selected
  useEffect(() => {
    if (organizations.length > 0 && !currentMembership) {
      const firstOrg = organizations[0];
      setCurrentOrgId(firstOrg.organization.id);
      localStorage.setItem(STORAGE_KEY, firstOrg.organization.id);
    }
    setIsLoading(false);
  }, [organizations, currentMembership]);

  const setOrganizations = useCallback((orgs: OrganizationMembership[]) => {
    setOrganizationsState(orgs);
  }, []);

  const switchOrganization = useCallback((orgId: string) => {
    setCurrentOrgId(orgId);
    localStorage.setItem(STORAGE_KEY, orgId);
  }, []);

  const clearOrganization = useCallback(() => {
    setCurrentOrgId(null);
    setOrganizationsState([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // Permission check helpers
  const checkPermission = useCallback(
    (permission: Permission) => hasPermission(currentRole ?? undefined, permission),
    [currentRole]
  );

  const checkAnyPermission = useCallback(
    (permissions: Permission[]) => hasAnyPermission(currentRole ?? undefined, permissions),
    [currentRole]
  );

  const checkAllPermissions = useCallback(
    (permissions: Permission[]) => hasAllPermissions(currentRole ?? undefined, permissions),
    [currentRole]
  );

  const value = useMemo<OrganizationContextValue>(
    () => ({
      currentOrganization,
      currentRole,
      currentPermissions: currentPermissions ?? [],
      organizations,
      setOrganizations,
      switchOrganization,
      clearOrganization,
      hasPermission: checkPermission,
      hasAnyPermission: checkAnyPermission,
      hasAllPermissions: checkAllPermissions,
      isLoading,
    }),
    [
      currentOrganization,
      currentRole,
      currentPermissions,
      organizations,
      setOrganizations,
      switchOrganization,
      clearOrganization,
      checkPermission,
      checkAnyPermission,
      checkAllPermissions,
      isLoading,
    ]
  );

  return <OrganizationContext.Provider value={value}>{children}</OrganizationContext.Provider>;
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
}

/**
 * Safe version of useOrganization that returns null instead of throwing
 * Use this in components that may render outside of OrganizationProvider
 */
export function useOrganizationSafe(): OrganizationContextValue | null {
  const context = useContext(OrganizationContext);
  return context ?? null;
}

/**
 * Hook to check if user has access to a specific permission
 */
export function usePermission(permission: Permission): boolean {
  const { hasPermission } = useOrganization();
  return hasPermission(permission);
}

/**
 * Hook to check if user has any of the specified permissions
 */
export function useAnyPermission(permissions: Permission[]): boolean {
  const { hasAnyPermission } = useOrganization();
  return hasAnyPermission(permissions);
}
