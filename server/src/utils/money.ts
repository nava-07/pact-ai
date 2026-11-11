// All money is integer minor units (cents). No floats touch payment amounts.
export const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD'] as const;
export type Currency = (typeof CURRENCIES)[number];

export function toMinor(input: string): number {
  const m = /^(\d{1,9})(?:\.(\d{1,2}))?$/.exec(input.trim());
  if (!m) throw new Error('Invalid amount');
  return Number(m[1]) * 100 + Number((m[2] ?? '').padEnd(2, '0') || 0);
}
export const isCurrency = (c: string): c is Currency => (CURRENCIES as readonly string[]).includes(c);
export const formatMinor = (n: number) => (n / 100).toFixed(2);
// PayPal expects a decimal string, e.g. "200.00"
export const toPayPalValue = formatMinor;

// Split a total across n parts with no lost cents (remainder spread from the first part).
export function allocate(total: number, n: number): number[] {
  const base = Math.floor(total / n), extra = total - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < extra ? 1 : 0));
}
