import { describe, it, expect } from 'vitest';
import { fmt, toMinor } from './money';
describe('money', () => {
  it('formats cents', () => { expect(fmt(20000)).toBe('$200.00'); expect(fmt(-5000)).toBe('−$50.00'); });
  it('parses dollars to cents', () => { expect(toMinor('19.99')).toBe(1999); expect(toMinor('200')).toBe(20000); });
});
