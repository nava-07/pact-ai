import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../config/env.js';
import { User } from '../models/index.js';
import { requireAuth } from '../middleware/auth.js';
import { ah, HttpError } from '../utils/errors.js';
export const auth = Router();
const creds = z.object({ email: z.string().email().max(200), password: z.string().min(8).max(200) });
const pub = (u: any) => ({ id: String(u._id), email: u.email, name: u.name, phone: u.phone ?? '', dob: u.dob ?? '', country: u.country ?? '', currency: u.currency ?? '', paypalEmail: u.paypalEmail ?? '', notifyApprove: u.notifyApprove ?? true, notifyPay: u.notifyPay ?? true });
const login = (res: Response, uid: string) => res.cookie('pact_token', jwt.sign({ uid }, env.SESSION_SECRET, { expiresIn: '7d' }), { httpOnly: true, sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax', secure: env.NODE_ENV === 'production', maxAge: 7 * 864e5 });
auth.post('/auth/register', ah(async (req, res) => {
  const b = creds.extend({ name: z.string().trim().min(2).max(80) }).strict().parse(req.body);
  if (await User.exists({ email: b.email.toLowerCase() })) throw new HttpError(409, 'An account with this email already exists');
  const u = await User.create({ email: b.email, name: b.name, passwordHash: await bcrypt.hash(b.password, 12) }); login(res, String(u._id)); res.status(201).json(pub(u));
}));
auth.post('/auth/login', ah(async (req, res) => {
  const b = creds.strict().parse(req.body); const u = await User.findOne({ email: b.email.toLowerCase() });
  if (!u || !(await bcrypt.compare(b.password, u.passwordHash))) throw new HttpError(401, 'Invalid email or password');
  login(res, String(u._id)); res.json(pub(u));
}));
auth.post('/auth/logout', (_req, res) => { res.clearCookie('pact_token'); res.json({ ok: true }); });
auth.get('/auth/me', requireAuth, ah(async (req, res) => { const u = await User.findById(req.uid); if (!u) throw new HttpError(401, 'Sign in required'); res.json(pub(u)); }));
auth.put('/auth/profile', requireAuth, ah(async (req, res) => {
  const b = z.object({
    name: z.string().trim().min(2).max(80).optional(),
    phone: z.string().max(20).optional(),
    dob: z.string().max(20).optional(),
    country: z.string().max(10).optional(),
    currency: z.string().max(5).optional(),
    paypalEmail: z.string().max(200).optional(),
    notifyApprove: z.boolean().optional(),
    notifyPay: z.boolean().optional(),
  }).strict().parse(req.body);
  const u = await User.findByIdAndUpdate(req.uid, { $set: b }, { new: true });
  if (!u) throw new HttpError(401, 'Sign in required');
  res.json(pub(u));
}));

auth.post('/auth/change-password', requireAuth, ah(async (req, res) => {
  const b = z.object({ current: z.string().min(8).max(200), newPassword: z.string().min(8).max(200) }).strict().parse(req.body);
  const u = await User.findById(req.uid);
  if (!u || !(await bcrypt.compare(b.current, u.passwordHash))) throw new HttpError(401, 'Current password is incorrect');
  u.passwordHash = await bcrypt.hash(b.newPassword, 12);
  await u.save();
  res.json({ ok: true });
}));

