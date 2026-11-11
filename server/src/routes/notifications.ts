import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { ah, HttpError } from '../utils/errors.js';
import { Notification } from '../models/index.js';
import { pageOf } from '../services/access.js';

export const notifications = Router();
notifications.use(requireAuth);

notifications.get('/notifications', ah(async (req, res) => {
  const { limit, skip } = pageOf(req.query);
  const filter: any = { user: req.uid };
  if (req.query.unread === 'true') filter.read = false;
  const [items, total, unread] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments({ user: req.uid, read: false }),
  ]);
  res.json({ items, total, unread });
}));

notifications.patch('/notifications/:id/read', ah(async (req, res) => {
  const n = await Notification.findOneAndUpdate(
    { _id: req.params.id, user: req.uid },
    { read: true },
    { new: true }
  );
  if (!n) throw new HttpError(404, 'Not found');
  res.json({ ok: true });
}));

notifications.post('/notifications/mark-all-read', ah(async (req, res) => {
  await Notification.updateMany({ user: req.uid, read: false }, { read: true });
  res.json({ ok: true });
}));
