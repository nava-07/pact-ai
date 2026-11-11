import { Expense, Payment } from '../models/index.js';
import { audit } from './access.js';
// Atomic status flips make capture, reconcile and webhook safe to run twice or concurrently.
export async function completePayment(pay: any, captureId: string, actor: string | undefined, type: string) {
  const done = await Payment.findOneAndUpdate({ _id: pay._id, status: { $in: ['CREATED', 'FAILED'] } }, { status: 'CAPTURED', captureId }, { new: true });
  if (!done) return false;
  await Expense.updateOne({ _id: pay.expense, status: { $in: ['PAYMENT_PENDING', 'PAYMENT_FAILED', 'APPROVED'] } }, { status: 'COMPLETED' });
  await audit({ pact: pay.pact, expense: pay.expense, actor, type, summary: 'Payment captured and verified', amountMinor: pay.amountMinor, currency: pay.currency, ref: captureId }); return true;
}
export async function failPayment(pay: any, reason: string, actor?: string) {
  const done = await Payment.findOneAndUpdate({ _id: pay._id, status: 'CREATED' }, { status: 'FAILED', failureReason: reason }, { new: true });
  if (!done) return false;
  await Expense.updateOne({ _id: pay.expense, status: 'PAYMENT_PENDING' }, { status: 'PAYMENT_FAILED' });
  await audit({ pact: pay.pact, expense: pay.expense, actor, type: 'PAYMENT_FAILED', summary: reason, amountMinor: pay.amountMinor, currency: pay.currency }); return true;
}
