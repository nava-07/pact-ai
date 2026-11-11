import { Schema, model } from 'mongoose';
import { CURRENCIES } from '../utils/money.js';
export const STATUSES = ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'PAYMENT_PENDING', 'COMPLETED', 'REJECTED', 'CANCELLED', 'PAYMENT_FAILED', 'REAPPROVAL_REQUIRED'];
export const ROLES = ['OWNER', 'APPROVER', 'MEMBER', 'VIEWER'];
const money = { type: Number, required: true, min: 0, validate: { validator: Number.isInteger, message: '{PATH} must be integer minor units' } };
const currency = { type: String, enum: CURRENCIES, default: 'USD', required: true };
const ref = (r: string, required = true) => ({ type: Schema.Types.ObjectId, ref: r, required });

export const User = model('User', new Schema({ email: { type: String, required: true, unique: true, lowercase: true, trim: true }, name: { type: String, required: true, trim: true, maxlength: 80 }, passwordHash: { type: String, required: true },
  phone: { type: String, default: '' }, dob: { type: String, default: '' }, country: { type: String, default: '' },
  currency: { type: String, enum: [...CURRENCIES, ''], default: '' }, paypalEmail: { type: String, default: '' },
  notifyApprove: { type: Boolean, default: true }, notifyPay: { type: Boolean, default: true } }, { timestamps: true }));

const pactSchema = new Schema({ owner: ref('User'), title: { type: String, required: true, trim: true, maxlength: 120 }, budgetMinor: money, currency, archived: { type: Boolean, default: false },
  members: [new Schema({ user: ref('User'), role: { type: String, enum: ROLES, required: true } }, { _id: false })] }, { timestamps: true });
pactSchema.index({ 'members.user': 1 });
export const Pact = model('Pact', pactSchema);

const approvalTerms = new Schema({ amountMinor: money, currency, purpose: String, version: Number, approvedBy: ref('User'), approvedAt: Date }, { _id: false });
const expenseSchema = new Schema({ pact: ref('Pact'), purpose: { type: String, required: true, trim: true, maxlength: 160 }, amountMinor: money, currency,
  status: { type: String, enum: STATUSES, default: 'DRAFT', required: true }, version: { type: Number, default: 1 }, createdBy: ref('User'), approval: approvalTerms }, { timestamps: true });
expenseSchema.index({ pact: 1, status: 1 });
export const Expense = model('Expense', expenseSchema);

export const Approval = model('Approval', new Schema({ expense: ref('Expense'), pact: ref('Pact'), by: ref('User'), decision: { type: String, enum: ['APPROVED', 'REJECTED'], required: true },
  version: Number, amountMinor: money, currency, purpose: String }, { timestamps: true }));

const paymentSchema = new Schema({ expense: ref('Expense'), pact: ref('Pact'), payer: ref('User'), expenseVersion: Number, amountMinor: money, currency,
  orderId: { type: String, unique: true, sparse: true }, captureId: String, approveUrl: String, status: { type: String, enum: ['CREATED', 'CAPTURED', 'FAILED'], default: 'CREATED' },
  failureReason: String, idempotencyKey: { type: String, required: true, unique: true } }, { timestamps: true });
export const Payment = model('Payment', paymentSchema);

const auditSchema = new Schema({ pact: ref('Pact'), expense: ref('Expense', false), actor: ref('User', false), type: { type: String, required: true }, summary: String,
  amountMinor: Number, currency: String, ref: String, data: Schema.Types.Mixed }, { timestamps: { createdAt: true, updatedAt: false } });
auditSchema.index({ pact: 1, createdAt: -1 });
// Append-only at the application level: no update or delete operations are permitted.
for (const op of ['updateOne', 'updateMany', 'findOneAndUpdate', 'findOneAndReplace', 'replaceOne', 'deleteOne', 'deleteMany', 'findOneAndDelete'])
  auditSchema.pre(op as 'updateOne', () => { throw new Error('Audit events are append-only'); });
auditSchema.pre('save', function () { if (!this.isNew) throw new Error('Audit events are append-only'); });
export const AuditEvent = model('AuditEvent', auditSchema);

export const WebhookEvent = model('WebhookEvent', new Schema({ eventId: { type: String, required: true, unique: true }, type: String, payload: Schema.Types.Mixed, processedAt: Date }, { timestamps: true }));
const notifSchema = new Schema({ user: ref('User'), pact: ref('Pact', false), type: { type: String, required: true },
  title: { type: String, required: true, maxlength: 200 }, message: { type: String, maxlength: 500 }, read: { type: Boolean, default: false },
  link: String }, { timestamps: { createdAt: true, updatedAt: false } });
notifSchema.index({ user: 1, read: 1, createdAt: -1 });
export const Notification = model('Notification', notifSchema);
