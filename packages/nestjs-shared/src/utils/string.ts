export function isUUID(v?: string | null): boolean {
  if (!v) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

export function safeInt(v: unknown, def = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}
export function nonEmpty<T>(arr?: T[] | null): T[] {
  return Array.isArray(arr) ? arr.filter(x => x != null) : [];
}
