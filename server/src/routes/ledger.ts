import { Router } from 'express';
import { z } from 'zod';
import { AuditEvent, Pact } from '../models/index.js';
import { requireAuth } from '../middleware/auth.js';
import { ah, HttpError } from '../utils/errors.js';
import { pactFor, pageOf } from '../services/access.js';
export const ledger = Router(); ledger.use(requireAuth);
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
ledger.get('/ledger', ah(async (req, res) => { // read-only: there is deliberately no write or delete route
  const q = z.object({ pact: z.string().optional(), type: z.string().optional(), from: z.string().optional(), to: z.string().optional(), min: z.coerce.number().optional(), max: z.coerce.number().optional(), q: z.string().max(80).optional() }).passthrough().parse(req.query);
  const ids = (await Pact.find({ 'members.user': req.uid }, '_id')).map(p => String(p._id)); const f: any = { pact: { $in: q.pact ? ids.filter(i => i === q.pact) : ids } };
  if (q.type) f.type = q.type; if (q.from || q.to) f.createdAt = { ...(q.from && { $gte: new Date(q.from) }), ...(q.to && { $lte: new Date(q.to + 'T23:59:59Z') }) };
  if (q.min !== undefined || q.max !== undefined) f.amountMinor = { ...(q.min !== undefined && { $gte: Math.round(q.min * 100) }), ...(q.max !== undefined && { $lte: Math.round(q.max * 100) }) };
  if (q.q) f.$or = [{ summary: new RegExp(esc(q.q), 'i') }, { ref: new RegExp(esc(q.q), 'i') }, { type: new RegExp(esc(q.q), 'i') }];
  const { limit, skip } = pageOf(req.query); res.json({ items: await AuditEvent.find(f).sort({ createdAt: -1 }).skip(skip).limit(limit), total: await AuditEvent.countDocuments(f) });
}));
ledger.get('/ledger/:id', ah(async (req, res) => {
  const ev = await AuditEvent.findById(req.params.id).catch(() => null); if (!ev) throw new HttpError(404, 'Not found'); await pactFor(String(req.uid), String(ev.pact));
  res.json({ event: ev, related: ev.expense ? await AuditEvent.find({ expense: ev.expense }).sort({ createdAt: 1 }) : [] });
}));
