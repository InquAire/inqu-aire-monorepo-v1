import 'reflect-metadata';
import type { Role } from '../types/auth';

export const ROLES_KEY = 'roles';

export function Roles(...roles: Role[]) {
  return (target: object, propertyKey?: string | symbol) => {
    const keyTarget = propertyKey ? target[propertyKey as keyof object] : target;
    Reflect.defineMetadata(ROLES_KEY, roles, keyTarget);
  };
}
