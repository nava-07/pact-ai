import { Router } from 'express';
import { z } from 'zod';
import { Approval, Expense, Pact, User } from '../models/index.js';
import { requireAuth } from '../middleware/auth.js';
import { ah, HttpError } from '../utils/errors.js';
import { CURRENCIES, formatMinor } from '../utils/money.js';
import { applyEdit, approve, canTransition, checkBudget, diffExpense, ROLE_LIST } from './policy-bridge.js';
import { audit, expenseFor, need, pactFor, pageOf, pol, state, totals } from '../services/access.js';
export const pacts = Router(); pacts.use(requireAuth);
const budget = z.number().int().positive().max(1e11), uid = (r: any) => String(r.uid);
const live = (list: any[], skip?: unknown) => list.filter(e => !['CANCELLED', 'REJECTED'].includes(e.status) && String(e._id) !== String(skip)).map(e => e.amountMinor);

pacts.post('/pacts', ah(async (req, res) => {
  const b = z.object({ title: z.string().trim().min(2).max(120), budgetMinor: budget, currency: z.enum(CURRENCIES).default('USD') }).strict().parse(req.body);
  const p = await Pact.create({ ...b, owner: req.uid, members: [{ user: req.uid, role: 'OWNER' }] });
  await audit({ pact: p._id, actor: req.uid, type: 'PACT_CREATED', summary: 'Pact created', amountMinor: b.budgetMinor, currency: b.currency }); res.status(201).json(p);
}));
pacts.get('/pacts', ah(async (req, res) => {
  const { limit, skip } = pageOf(req.query), f = { 'members.user': req.uid, archived: req.query.archived === 'true' };
  res.json({ items: await Pact.find(f).sort({ updatedAt: -1 }).skip(skip).limit(limit), total: await Pact.countDocuments(f) });
}));
pacts.get('/pacts/:id', ah(async (req, res) => {
  const { pact, role } = await pactFor(uid(req), req.params.id), t = await totals(pact._id);
  await pact.populate('members.user', 'name email');
  res.json({ pact, role, expenses: t.expenses, totals: { budget: pact.budgetMinor, planned: t.planned, pending: t.pending, paid: t.paid, remaining: pact.budgetMinor - t.planned } });
}));
pacts.patch('/pacts/:id', ah(async (req, res) => {
  const { pact, role } = await pactFor(uid(req), req.params.id); need(role, 'OWNER');
  const b = z.object({ title: z.string().trim().min(2).max(120), budgetMinor: budget, archived: z.boolean() }).partial().strict().parse(req.body);
  if (b.budgetMinor !== undefined && b.budgetMinor < (await totals(pact._id)).planned) throw new HttpError(422, 'Budget can’t be below planned spend');
  Object.assign(pact, b); await pact.save(); await audit({ pact: pact._id, actor: req.uid, type: 'PACT_UPDATED', summary: 'Pact updated', data: b }); res.json(pact);
}));
pacts.delete('/pacts/:id', ah(async (req, res) => { // archives; financial history is never deleted
  const { pact, role } = await pactFor(uid(req), req.params.id); need(role, 'OWNER'); pact.archived = true; await pact.save();
  await audit({ pact: pact._id, actor: req.uid, type: 'PACT_ARCHIVED', summary: 'Pact archived' }); res.json({ archived: true });
}));
pacts.post('/pacts/:id/members', ah(async (req, res) => { // documented mechanism: the invitee must already have an account
  const { pact, role } = await pactFor(uid(req), req.params.id); need(role, 'OWNER');
  const b = z.object({ email: z.string().email(), role: z.enum(['APPROVER', 'MEMBER', 'VIEWER']) }).strict().parse(req.body);
  const u = await User.findOne({ email: b.email.toLowerCase() }); if (!u) throw new HttpError(404, 'No account with that email. Ask them to sign up first.');
  if (pact.members.some(m => String(m.user) === String(u._id))) throw new HttpError(409, 'Already a member');
  pact.members.push({ user: u._id, role: b.role }); await pact.save(); await audit({ pact: pact._id, actor: req.uid, type: 'MEMBER_ADDED', summary: `Added ${u.email} as ${b.role}` }); res.status(201).json(pact);
}));

pacts.post('/pacts/:id/expenses', ah(async (req, res) => {
  const { pact, role } = await pactFor(uid(req), req.params.id); need(role, 'OWNER', 'APPROVER', 'MEMBER');
  const b = z.object({ purpose: z.string().trim().min(1).max(160), amountMinor: z.number().int().min(0).max(1e11) }).strict().parse(req.body);
  const c = checkBudget(pact.budgetMinor, live((await totals(pact._id)).expenses), b.amountMinor); if (!c.ok) throw new HttpError(422, `Policy check failed: this would put planned spend ${formatMinor(c.overBy)} over budget`);
  const e = await Expense.create({ ...b, pact: pact._id, currency: pact.currency, createdBy: req.uid });
  await audit({ pact: pact._id, expense: e._id, actor: req.uid, type: 'EXPENSE_PROPOSED', summary: 'Expense proposed', amountMinor: b.amountMinor, currency: pact.currency }); res.status(201).json(e);
}));
pacts.get('/expenses/:id', ah(async (req, res) => { const { e, role } = await expenseFor(uid(req), req.params.id); res.json({ expense: e, role }); }));
pacts.patch('/expenses/:id', ah(async (req, res) => {
  const { e, pact, role } = await expenseFor(uid(req), req.params.id); need(role, 'OWNER', 'APPROVER', 'MEMBER');
  const b = z.object({ amountMinor: z.number().int().min(0).max(1e11), purpose: z.string().trim().min(1).max(160) }).partial().strict().parse(req.body);
  const t = await totals(pact._id), next = { amountMinor: b.amountMinor ?? e.amountMinor, currency: e.currency as any, purpose: b.purpose ?? e.purpose };
  const c = checkBudget(pact.budgetMinor, live(t.expenses, e._id), next.amountMinor); if (!c.ok) throw new HttpError(422, `Policy check failed: this would put planned spend ${formatMinor(c.overBy)} over budget`);
  const before = state(e), after = pol(() => applyEdit(before, next)); const diff = diffExpense(pact.budgetMinor, t.planned, before, next, e.status as any);
  Object.assign(e, { amountMinor: after.amountMinor, purpose: after.purpose, version: after.version, status: after.status }); await e.save();
  await audit({ pact: pact._id, expense: e._id, actor: req.uid, type: diff.reapprovalRequired ? 'EXPENSE_EDITED_APPROVAL_INVALIDATED' : 'EXPENSE_EDITED', summary: 'Expense edited', amountMinor: e.amountMinor, currency: e.currency, data: diff });
  res.json({ expense: e, diff });
}));
pacts.post('/expenses/:id/submit', ah(async (req, res) => {
  const { e, pact, role } = await expenseFor(uid(req), req.params.id); need(role, 'OWNER', 'APPROVER', 'MEMBER');
  if (!canTransition(e.status as any, 'PENDING_APPROVAL')) throw new HttpError(409, 'Can’t submit from ' + e.status); e.status = 'PENDING_APPROVAL'; await e.save();
  await audit({ pact: pact._id, expense: e._id, actor: req.uid, type: 'EXPENSE_SUBMITTED', summary: 'Submitted for approval', amountMinor: e.amountMinor, currency: e.currency }); res.json(e);
}));
pacts.post('/expenses/:id/approve', ah(async (req, res) => {
  const { e, pact, role } = await expenseFor(uid(req), req.params.id); const { version } = z.object({ version: z.number().int() }).strict().parse(req.body);
  const next = pol(() => approve(state(e), uid(req), role as any, version)); // stale versions and wrong roles are refused here
  e.status = next.status; e.approval = { ...next.approval!, approvedBy: req.uid as any, approvedAt: new Date() } as any; await e.save();
  await Approval.create({ expense: e._id, pact: pact._id, by: req.uid, decision: 'APPROVED', version, amountMinor: e.amountMinor, currency: e.currency, purpose: e.purpose });
  await audit({ pact: pact._id, expense: e._id, actor: req.uid, type: 'EXPENSE_APPROVED', summary: 'Approved by ' + role.toLowerCase(), amountMinor: e.amountMinor, currency: e.currency, data: { version, purpose: e.purpose } }); res.json(e);
}));
pacts.post('/expenses/:id/reject', ah(async (req, res) => {
  const { e, pact, role } = await expenseFor(uid(req), req.params.id); need(role, 'OWNER', 'APPROVER');
  if (!canTransition(e.status as any, 'REJECTED')) throw new HttpError(409, 'Can’t reject from ' + e.status); e.status = 'REJECTED'; await e.save();
  await Approval.create({ expense: e._id, pact: pact._id, by: req.uid, decision: 'REJECTED', version: e.version, amountMinor: e.amountMinor, currency: e.currency, purpose: e.purpose });
  await audit({ pact: pact._id, expense: e._id, actor: req.uid, type: 'EXPENSE_REJECTED', summary: 'Rejected', amountMinor: e.amountMinor, currency: e.currency }); res.json(e);
}));
pacts.post('/expenses/:id/cancel', ah(async (req, res) => {
  const { e, pact, role } = await expenseFor(uid(req), req.params.id); need(role, 'OWNER');
  if (!canTransition(e.status as any, 'CANCELLED')) throw new HttpError(409, 'Can’t cancel from ' + e.status); e.status = 'CANCELLED'; await e.save();
  await audit({ pact: pact._id, expense: e._id, actor: req.uid, type: 'EXPENSE_CANCELLED', summary: 'Cancelled', amountMinor: e.amountMinor, currency: e.currency }); res.json(e);
}));
pacts.patch('/pacts/:id/members/:userId', ah(async (req, res) => {
  const { pact, role } = await pactFor(uid(req), req.params.id); need(role, 'OWNER');
  const b = z.object({ role: z.enum(['APPROVER', 'MEMBER', 'VIEWER']) }).strict().parse(req.body), m = pact.members.find(x => String(x.user) === req.params.userId);
  if (!m) throw new HttpError(404, 'Not found'); if (String(m.user) === String(pact.owner)) throw new HttpError(422, 'The owner’s role can’t change');
  m.role = b.role; await pact.save(); await audit({ pact: pact._id, actor: req.uid, type: 'MEMBER_ROLE_CHANGED', summary: 'Role changed to ' + b.role }); res.json({ ok: true });
}));
void ROLE_LIST;
