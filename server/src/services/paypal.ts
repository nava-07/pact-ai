import { env } from '../config/env.js';
import { toPayPalValue } from '../utils/money.js';
export class PayPalError extends Error { constructor(public status: number, public body: any) { super('PayPal error ' + status); } get issue(): string { return this.body?.details?.[0]?.issue ?? this.body?.name ?? ''; } }
let cached: { t: string; exp: number } | null = null;
async function call<T = any>(path: string, o: { method?: string; body?: unknown; requestId?: string; basic?: boolean } = {}): Promise<T> {
  const headers: Record<string, string> = o.basic ? { Authorization: 'Basic ' + Buffer.from(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' }
    : { Authorization: 'Bearer ' + (await token()), 'Content-Type': 'application/json', ...(o.requestId ? { 'PayPal-Request-Id': o.requestId } : {}) };
  const r = await fetch(env.PAYPAL_BASE_URL + path, { method: o.method ?? 'GET', headers, body: o.basic ? 'grant_type=client_credentials' : o.body ? JSON.stringify(o.body) : undefined, signal: AbortSignal.timeout(15000) });
  const j = await r.json().catch(() => ({})); if (!r.ok) throw new PayPalError(r.status, j); return j as T;
}
async function token() {
  if (cached && cached.exp > Date.now() + 60_000) return cached.t;
  const j = await call<{ access_token: string; expires_in: number }>('/v1/oauth2/token', { method: 'POST', basic: true });
  cached = { t: j.access_token, exp: Date.now() + j.expires_in * 1000 }; return cached.t;
}
export async function createOrder(p: { id: string; expenseId: string; amountMinor: number; currency: string }, purpose: string, requestId: string) {
  const o = await call('/v2/checkout/orders', { method: 'POST', requestId, body: { intent: 'CAPTURE',
    purchase_units: [{ reference_id: p.id, custom_id: p.expenseId, description: purpose.slice(0, 120), amount: { currency_code: p.currency, value: toPayPalValue(p.amountMinor) } }],
    payment_source: { paypal: { experience_context: { return_url: `${env.CLIENT_URL}/pay/return`, cancel_url: `${env.CLIENT_URL}/pay/cancel`, user_action: 'PAY_NOW', shipping_preference: 'NO_SHIPPING' } } } } });
  const link = o.links?.find((l: any) => l.rel === 'payer-action' || l.rel === 'approve');
  if (!o.id || !link) throw new Error('PayPal returned no approval link'); return { id: o.id as string, approveUrl: link.href as string };
}
export const captureOrder = (id: string, requestId: string) => call(`/v2/checkout/orders/${encodeURIComponent(id)}/capture`, { method: 'POST', requestId, body: {} });
export const getOrder = (id: string) => call(`/v2/checkout/orders/${encodeURIComponent(id)}`);
/** Never trust the browser redirect: confirm status, amount, currency and our own reference in PayPal's response. */
export function verifyCapture(exp: { amountMinor: number; currency: string; paymentId: string }, order: any): { ok: true; captureId: string } | { ok: false; reason: string } {
  const pu = order?.purchase_units?.[0], cap = pu?.payments?.captures?.[0];
  if (order?.status !== 'COMPLETED' || cap?.status !== 'COMPLETED') return { ok: false, reason: 'Capture not completed' };
  if (pu.reference_id !== exp.paymentId) return { ok: false, reason: 'Order does not belong to this payment' };
  if (cap.amount?.currency_code !== exp.currency || cap.amount?.value !== toPayPalValue(exp.amountMinor)) return { ok: false, reason: 'Captured amount or currency mismatch' };
  return { ok: true, captureId: cap.id };
}
export async function verifyWebhook(h: (n: string) => string | undefined, event: unknown) {
  if (!env.PAYPAL_WEBHOOK_ID) return false;
  const r = await call<{ verification_status: string }>('/v1/notifications/verify-webhook-signature', { method: 'POST', body: { auth_algo: h('paypal-auth-algo'), cert_url: h('paypal-cert-url'),
    transmission_id: h('paypal-transmission-id'), transmission_sig: h('paypal-transmission-sig'), transmission_time: h('paypal-transmission-time'), webhook_id: env.PAYPAL_WEBHOOK_ID, webhook_event: event } });
  return r.verification_status === 'SUCCESS';
}
