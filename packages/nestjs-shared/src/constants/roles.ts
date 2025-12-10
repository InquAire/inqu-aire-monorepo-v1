export const ROLES = { PUBLIC: 'PUBLIC', CUSTOMER: 'CUSTOMER', ADMIN: 'ADMIN' } as const;
export type RoleValue = (typeof ROLES)[keyof typeof ROLES];
