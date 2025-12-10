export function nowSeoul(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
}

export function toIsoDate(d: Date | number | string): string {
  const dt = d instanceof Date ? d : new Date(d);
  return dt.toISOString();
}
