import { describe, it, expect } from 'vitest';
import { verifyCapture } from './paypal.js';
import { parsePlan } from './gemini.js';
import { paymentGate, ExpenseState } from './policy.js';
const exp = { amountMinor: 20000, currency: 'USD', paymentId: 'p1' };
const order = (over: any = {}) => ({ status: 'COMPLETED', purchase_units: [{ reference_id: 'p1', payments: { captures: [{ id: 'C1', status: 'COMPLETED', amount: { currency_code: 'USD', value: '200.00', ...over } }] } }] });
describe('PayPal verification', () => {
  it('accepts a matching capture', () => { expect(verifyCapture(exp, order())).toEqual({ ok: true, captureId: 'C1' }); });
  it('rejects a tampered amount', () => { expect(verifyCapture(exp, order({ value: '2.00' })).ok).toBe(false); });
  it('rejects a currency mismatch', () => { expect(verifyCapture(exp, order({ currency_code: 'EUR' })).ok).toBe(false); });
  it('rejects another payment’s order', () => { const o: any = order(); o.purchase_units[0].reference_id = 'other'; expect(verifyCapture(exp, o).ok).toBe(false); });
  it('rejects an incomplete order', () => { expect(verifyCapture(exp, { ...order(), status: 'APPROVED' }).ok).toBe(false); });
});
describe('AI plan validation', () => {
  const plan = (amt: number) => JSON.stringify({ title: 'Trip', currency: 'USD', totalBudget: 500, expenses: [{ category: 'Transport', amount: amt }] });
  it('accepts a consistent plan and converts to cents', () => { expect(parsePlan(plan(200)).expenses[0].amountMinor).toBe(20000); });
  it('rejects overspending, bad JSON and negative amounts', () => { expect(() => parsePlan(plan(600))).toThrow(); expect(() => parsePlan('nope')).toThrow(); expect(() => parsePlan(plan(-5))).toThrow(); });
});
describe('retry after failed payment', () => {
  const e: ExpenseState = { amountMinor: 100, currency: 'USD', purpose: 'x', status: 'PAYMENT_FAILED', version: 1, approval: { amountMinor: 100, currency: 'USD', purpose: 'x', version: 1, approvedBy: 'u' } };
  it('allows retry of an approved, failed payment', () => { expect(paymentGate(e).ok).toBe(true); });
});
