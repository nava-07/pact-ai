// Deterministic policy engine. The AI never calls into a decision here; it only reads results.
import { Currency } from '../utils/money.js';

export type Status = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'PAYMENT_PENDING' | 'COMPLETED'
  | 'REJECTED' | 'CANCELLED' | 'PAYMENT_FAILED' | 'REAPPROVAL_REQUIRED';
export type Role = 'OWNER' | 'APPROVER' | 'MEMBER' | 'VIEWER';

export interface Terms { amountMinor: number; currency: Currency; purpose: string; }
export interface ExpenseState extends Terms {
  status: Status; version: number;
  approval?: Terms & { version: number; approvedBy: string };
}

const T: Record<Status, Status[]> = {
  DRAFT: ['PENDING_APPROVAL', 'CANCELLED'],
  PENDING_APPROVAL: ['APPROVED', 'REJECTED', 'CANCELLED'],
  APPROVED: ['PAYMENT_PENDING', 'REAPPROVAL_REQUIRED', 'CANCELLED'],
  PAYMENT_PENDING: ['COMPLETED', 'PAYMENT_FAILED'],
  PAYMENT_FAILED: ['PAYMENT_PENDING', 'CANCELLED'],
  REAPPROVAL_REQUIRED: ['APPROVED', 'REJECTED', 'CANCELLED'],
  REJECTED: ['DRAFT'], COMPLETED: [], CANCELLED: [],
};
export const canTransition = (from: Status, to: Status) => T[from].includes(to);
export const canApprove = (role: Role) => role === 'OWNER' || role === 'APPROVER';
export const canEdit = (s: Status) => !['PAYMENT_PENDING', 'COMPLETED', 'CANCELLED'].includes(s);

const sameTerms = (a: Terms, b: Terms) =>
  a.amountMinor === b.amountMinor && a.currency === b.currency && a.purpose === b.purpose;
export const isMaterialChange = (prev: Terms, next: Terms) => !sameTerms(prev, next);

/** Applying an edit bumps the version and invalidates approval if the terms changed. */
export function applyEdit(e: ExpenseState, next: Terms): ExpenseState {
  if (!canEdit(e.status)) throw new Error('Expense cannot be edited in its current state');
  if (!isMaterialChange(e, next)) return e;
  return { ...e, ...next, version: e.version + 1, status: e.status === 'APPROVED' ? 'REAPPROVAL_REQUIRED' : e.status };
}

/** Approval must reference the exact current version, or it is stale. */
export function approve(e: ExpenseState, by: string, role: Role, seenVersion: number): ExpenseState {
  if (!canApprove(role)) throw new Error('Not authorised to approve');
  if (!['PENDING_APPROVAL', 'REAPPROVAL_REQUIRED'].includes(e.status)) throw new Error('Nothing to approve');
  if (seenVersion !== e.version) throw new Error('Stale version: expense changed since you reviewed it');
  return { ...e, status: 'APPROVED', approval: { amountMinor: e.amountMinor, currency: e.currency, purpose: e.purpose, version: e.version, approvedBy: by } };
}

/** Gate for PayPal order creation. The amount to charge comes from here, never from the browser. */
export function paymentGate(e: ExpenseState): { ok: true; charge: Terms } | { ok: false; reason: string } {
  if (!['APPROVED', 'PAYMENT_FAILED'].includes(e.status) || !e.approval) return { ok: false, reason: 'Expense is not approved' };
  if (e.approval.version !== e.version || !sameTerms(e.approval, e)) return { ok: false, reason: 'Approval is stale' };
  return { ok: true, charge: { amountMinor: e.approval.amountMinor, currency: e.approval.currency, purpose: e.approval.purpose } };
}

/** Planned spend may not exceed the budget. */
export function checkBudget(budgetMinor: number, others: number[], proposed: number) {
  const planned = others.reduce((s, n) => s + n, 0) + proposed;
  return planned <= budgetMinor ? { ok: true as const, remaining: budgetMinor - planned }
    : { ok: false as const, overBy: planned - budgetMinor };
}

/** Numbers behind "What changed?". AI only phrases these; it never computes them. */
export function diffExpense(budgetMinor: number, plannedBefore: number, prev: Terms, next: Terms, status: Status) {
  const plannedAfter = plannedBefore - prev.amountMinor + next.amountMinor;
  return { previous: prev.amountMinor, next: next.amountMinor, difference: next.amountMinor - prev.amountMinor,
    remainingBefore: budgetMinor - plannedBefore, remainingAfter: budgetMinor - plannedAfter,
    reapprovalRequired: status === 'APPROVED' && isMaterialChange(prev, next) };
}
