import { describe, it, expect } from 'vitest';
import { approve, applyEdit, paymentGate, checkBudget, diffExpense, canTransition, ExpenseState } from './policy.js';
import { toMinor, allocate } from '../utils/money.js';

const base: ExpenseState = { amountMinor: 20000, currency: 'USD', purpose: 'Transport', status: 'PENDING_APPROVAL', version: 1 };

describe('money', () => {
  it('parses without floats', () => { expect(toMinor('19.99')).toBe(1999); expect(toMinor('200')).toBe(20000); });
  it('rejects bad input', () => { expect(() => toMinor('-5')).toThrow(); expect(() => toMinor('1.234')).toThrow(); });
  it('allocates every cent', () => { expect(allocate(10001, 3).reduce((a, b) => a + b)).toBe(10001); });
});
describe('approval', () => {
  it('blocks payment before approval', () => { expect(paymentGate(base).ok).toBe(false); });
  it('only owners/approvers approve', () => { expect(() => approve(base, 'u', 'MEMBER', 1)).toThrow(); });
  it('rejects stale versions', () => { expect(() => approve(base, 'u', 'OWNER', 0)).toThrow(/Stale/); });
  it('allows payment at the approved amount', () => {
    const g = paymentGate(approve(base, 'u', 'OWNER', 1));
    expect(g.ok && g.charge.amountMinor).toBe(20000);
  });
  it('edit after approval invalidates it and blocks payment', () => {
    const edited = applyEdit(approve(base, 'u', 'OWNER', 1), { ...base, amountMinor: 25000 });
    expect(edited.status).toBe('REAPPROVAL_REQUIRED'); expect(edited.version).toBe(2);
    expect(paymentGate(edited).ok).toBe(false);
  });
  it('cannot skip states', () => { expect(canTransition('DRAFT', 'COMPLETED')).toBe(false); });
});
describe('budget', () => {
  it('rejects over-budget proposals', () => { expect(checkBudget(50000, [20000, 20000], 15000)).toEqual({ ok: false, overBy: 5000 }); });
  it('diff matches the transport example', () => {
    const d = diffExpense(50000, 50000, base, { ...base, amountMinor: 25000 }, 'APPROVED');
    expect(d.difference).toBe(5000); expect(d.reapprovalRequired).toBe(true);
  });
});
