import { Router } from 'express';
import { z } from 'zod';
import { configured } from '../config/env.js';
import { Expense, Payment, Pact, WebhookEvent } from '../models/index.js';
import { requireAuth } from '../middleware/auth.js';
import { ah, HttpError } from '../utils/errors.js';
import { toPayPalValue } from '../utils/money.js';
import { audit, expenseFor, need, pactFor, pageOf, state } from '../services/access.js';
import { paymentGate } from '../services/policy.js';
import { completePayment, failPayment } from '../services/payments.js';
import * as pp from '../services/paypal.js';
export const paypal = Router(); const uid = (r: any) => String(r.uid);
const notReady = () => { if (!configured.paypal) throw new HttpError(503, 'PayPal isn’t configured. Add PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET to .env.'); };

paypal.post('/paypal/create-order', requireAuth, ah(async (req, res) => {
  // .strict(): a browser-supplied amount is rejected outright. The amount comes from the approved expense.
  const { expenseId } = z.object({ expenseId: z.string() }).strict().parse(req.body); notReady();
  const { e, pact, role } = await expenseFor(uid(req), expenseId); need(role, 'OWNER', 'APPROVER');
  const gate = paymentGate(state(e)); if (!gate.ok) throw new HttpError(409, gate.reason);
  const prior = await Payment.find({ expense: e._id, expenseVersion: e.version });
  if (prior.some(p => p.status === 'CAPTURED')) throw new HttpError(409, 'This expense is already paid');
  const open = prior.find(p => p.status === 'CREATED' && p.orderId); if (open) { res.json({ orderId: open.orderId, approveUrl: open.approveUrl, reused: true }); return; }
  const key = `pact-${e._id}-v${e.version}-a${prior.length}`;
  const pay = await Payment.create({ expense: e._id, pact: pact._id, payer: req.uid, expenseVersion: e.version, amountMinor: gate.charge.amountMinor, currency: gate.charge.currency, idempotencyKey: key });
  try {
    const o = await pp.createOrder({ id: String(pay._id), expenseId: String(e._id), amountMinor: pay.amountMinor, currency: pay.currency }, gate.charge.purpose, key);
    pay.orderId = o.id; pay.approveUrl = o.approveUrl; await pay.save();
  } catch (err) { pay.status = 'FAILED'; pay.failureReason = 'Order creation failed'; await pay.save(); throw new HttpError(502, 'Couldn’t start PayPal checkout. Try again.'); }
  e.status = 'PAYMENT_PENDING'; await e.save();
  await audit({ pact: pact._id, expense: e._id, actor: req.uid, type: 'PAYMENT_ATTEMPT_STARTED', summary: 'PayPal order created', amountMinor: pay.amountMinor, currency: pay.currency, ref: pay.orderId });
  res.status(201).json({ orderId: pay.orderId, approveUrl: pay.approveUrl });
}));

async function settle(pay: any, order: any, actor?: string) {
  const v = pp.verifyCapture({ amountMinor: pay.amountMinor, currency: pay.currency, paymentId: String(pay._id) }, order);
  if (v.ok) { await completePayment(pay, v.captureId, actor, 'PAYMENT_CAPTURED'); return v; }
  await audit({ pact: pay.pact, expense: pay.expense, actor, type: 'PAYMENT_VERIFICATION_FAILED', summary: v.reason, ref: pay.orderId }); return v;
}
paypal.post('/paypal/capture-order', requireAuth, ah(async (req, res) => {
  const { orderId } = z.object({ orderId: z.string().min(5).max(64) }).strict().parse(req.body); notReady();
  const pay = await Payment.findOne({ orderId }); if (!pay) throw new HttpError(404, 'Not found');
  const { role } = await pactFor(uid(req), String(pay.pact)); need(role, 'OWNER', 'APPROVER');
  if (pay.status === 'CAPTURED') { res.json({ payment: pay, already: true }); return; } // duplicate request: no second capture
  const e = await Expense.findById(pay.expense); if (!e || e.version !== pay.expenseVersion) throw new HttpError(409, 'The expense changed after checkout started. Start checkout again.');
  let order: any;
  try { order = await pp.captureOrder(orderId, 'cap-' + pay.idempotencyKey); }
  catch (err) {
    if (err instanceof pp.PayPalError && err.issue === 'ORDER_ALREADY_CAPTURED') order = await pp.getOrder(orderId);
    else if (err instanceof pp.PayPalError && err.status < 500) { await failPayment(pay, 'PayPal declined: ' + (err.issue || err.status), uid(req)); throw new HttpError(402, 'PayPal couldn’t complete this payment. You can retry.'); }
    else throw new HttpError(504, 'PayPal didn’t answer, so the payment may or may not have gone through. Use reconcile to check.');
  }
  const v = await settle(pay, order, uid(req)); if (!v.ok) throw new HttpError(502, 'Payment couldn’t be verified: ' + v.reason + '. It has been flagged for review.');
  res.json({ payment: await Payment.findById(pay._id) });
}));
paypal.post('/paypal/reconcile', requireAuth, ah(async (req, res) => { // ask PayPal what really happened
  const { orderId } = z.object({ orderId: z.string().min(5).max(64) }).strict().parse(req.body); notReady();
  const pay = await Payment.findOne({ orderId }); if (!pay) throw new HttpError(404, 'Not found'); const { role } = await pactFor(uid(req), String(pay.pact)); need(role, 'OWNER', 'APPROVER');
  const order = await pp.getOrder(orderId); if (order.status === 'COMPLETED') await settle(pay, order, uid(req)); else if (order.status === 'VOIDED') await failPayment(pay, 'Order voided', uid(req));
  res.json({ paypalStatus: order.status, payment: await Payment.findById(pay._id) });
}));
paypal.post('/paypal/webhook', ah(async (req, res) => {
  const ev = req.body; let ok = false; try { ok = await pp.verifyWebhook(n => req.header(n), ev); } catch { ok = false; }
  if (!ok || !ev?.id) { res.status(400).json({ error: 'Signature not verified' }); return; }
  let rec = await WebhookEvent.findOne({ eventId: ev.id });
  if (rec?.processedAt) { res.json({ received: true, duplicate: true }); return; } // duplicate delivery
  if (!rec) try { rec = await WebhookEvent.create({ eventId: ev.id, type: ev.event_type, payload: ev }); } catch (e: any) { if (e.code === 11000) { res.json({ received: true, duplicate: true }); return; } throw e; }
  const rs = ev.resource ?? {}, orderId = rs.supplementary_data?.related_ids?.order_id, pay = orderId ? await Payment.findOne({ orderId }) : null;
  if (pay && ev.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
    if (rs.amount?.value === toPayPalValue(pay.amountMinor) && rs.amount?.currency_code === pay.currency) await completePayment(pay, rs.id, undefined, 'PAYMENT_VERIFIED_WEBHOOK');
    else await audit({ pact: pay.pact, expense: pay.expense, type: 'PAYMENT_VERIFICATION_FAILED', summary: 'Webhook amount mismatch', ref: orderId });
  } else if (pay && ['PAYMENT.CAPTURE.DENIED', 'PAYMENT.CAPTURE.DECLINED'].includes(ev.event_type)) await failPayment(pay, 'Denied (webhook)');
  rec!.processedAt = new Date(); await rec!.save(); res.json({ received: true });
}));

const mine = async (u: string) => (await Pact.find({ 'members.user': u }, '_id')).map(p => p._id);
paypal.get('/payments', requireAuth, ah(async (req, res) => { const { limit, skip } = pageOf(req.query), f = { pact: { $in: await mine(uid(req)) } }; res.json({ items: await Payment.find(f).sort({ createdAt: -1 }).skip(skip).limit(limit), total: await Payment.countDocuments(f) }); }));
paypal.get('/payments/:id', requireAuth, ah(async (req, res) => { const p = await Payment.findById(req.params.id).catch(() => null); if (!p) throw new HttpError(404, 'Not found'); await pactFor(uid(req), String(p.pact)); res.json(p); }));
