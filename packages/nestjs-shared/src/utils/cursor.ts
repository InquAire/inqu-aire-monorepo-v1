export function encodeCursor(id: bigint): string {
  return Buffer.from(id.toString(), 'utf8').toString('base64url');
}

export function decodeCursor(s?: string | null): bigint | undefined {
  if (!s) return undefined;
  try {
    return BigInt(Buffer.from(s, 'base64url').toString('utf8'));
  } catch {
    return undefined;
  }
}
