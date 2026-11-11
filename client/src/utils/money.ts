const SYM: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', CAD: 'C$', AUD: 'A$' };
export const fmt = (c: number, cur = 'USD') => (c < 0 ? '−' : '') + (SYM[cur] ?? '$') + (Math.abs(c) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const toMinor = (s: string) => Math.round(parseFloat(s) * 100);
