import { isValidObjectId } from 'mongoose';
import { Expense, Pact, AuditEvent } from '../models/index.js';
import { HttpError } from '../utils/errors.js';
import { ExpenseState, Role } from './policy.js';
export async function pactFor(uid: string, id: string) {
  if (!isValidObjectId(id)) throw new HttpError(404, 'Not found');
  const pact = await Pact.findById(id); const m = pact?.members.find(x => String(x.user) === uid);
  if (!pact || !m) throw new HttpError(404, 'Not found'); // same answer for "missing" and "not yours"
  return { pact, role: m.role as Role };
}
export async function expenseFor(uid: string, id: string) {
  if (!isValidObjectId(id)) throw new HttpError(404, 'Not found');
  const e = await Expense.findById(id); if (!e) throw new HttpError(404, 'Not found');
  return { e, ...(await pactFor(uid, String(e.pact))) };
}
export const need = (role: Role, ...ok: Role[]) => { if (!ok.includes(role)) throw new HttpError(403, 'Your role doesn’t allow this action'); };
export const pol = <T>(f: () => T): T => { try { return f(); } catch (e) { throw new HttpError(409, (e as Error).message); } };
export const state = (e: any): ExpenseState => ({ amountMinor: e.amountMinor, currency: e.currency, purpose: e.purpose, status: e.status, version: e.version,
  approval: e.approval ? { amountMinor: e.approval.amountMinor, currency: e.approval.currency, purpose: e.approval.purpose, version: e.approval.version, approvedBy: String(e.approval.approvedBy) } : undefined });
export async function totals(pactId: unknown) {
  const all = await Expense.find({ pact: pactId }); const live = all.filter(e => !['CANCELLED', 'REJECTED'].includes(e.status));
  const sum = (f: (e: any) => boolean) => live.filter(f).reduce((s, e) => s + e.amountMinor, 0);
  return { expenses: all, planned: sum(() => true), pending: sum(e => e.status === 'APPROVED' || e.status === 'PAYMENT_PENDING'), paid: sum(e => e.status === 'COMPLETED') };
}
export const audit = (a: { pact: unknown; expense?: unknown; actor?: unknown; type: string; summary: string; amountMinor?: number; currency?: string; ref?: string; data?: unknown }) => AuditEvent.create(a);
export const pageOf = (q: any) => { const limit = Math.min(Math.max(parseInt(q.limit) || 20, 1), 50), page = Math.max(parseInt(q.page) || 1, 1); return { limit, page, skip: (page - 1) * limit }; };
