import 'reflect-metadata';

import { Expose, Transform } from 'class-transformer';

/**
 * Expose property for output (camelCase) while reading value from a given input key (e.g., snake_case) on plain->class.
 * Usage: `@ExposeFrom('created_at') createdAt!: string;`
 */
export function ExposeFrom<T = unknown>(
  sourceKey: string,
  map?: (value: unknown, obj: unknown) => T
) {
  return function (target: object, propertyKey: string) {
    Expose()(target, propertyKey);
    Transform(
      ({ obj }) => {
        const v = obj?.[sourceKey];
        return map ? map(v, obj) : v;
      },
      { toClassOnly: true }
    )(target, propertyKey);
  };
}

/** Date -> ISO string mapper */
export const toIso = (v: unknown) => (v instanceof Date ? v.toISOString() : (v ?? null));

/** String caster mapper */
export const toString = (v: unknown) => (v == null ? v : String(v));
