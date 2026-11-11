# Pact AI — hackathon submission kit

**Tagline:** Delegate the Plan. Own the Payment.

## One-line pitch
Pact AI lets groups plan shared spending with AI, but only a human approval plus PayPal can release money, and every step is recorded in an audit ledger.

## Problem
Groups (college trips, flatmates, clubs) plan budgets in chats and spreadsheets. Money moves informally, approvals are unclear, and nobody can prove who agreed to what. Letting an AI agent pay on their behalf is risky.

## Solution
1. **AI drafts** a structured budget from plain language (Gemini). Output is validated and labelled as estimates.
2. **Policy engine decides** (deterministic server code, not AI): budget limits, roles, and versioned approvals.
3. **A human approves** the exact amount, currency and purpose. Any material change invalidates the approval ("What changed?" shows old/new amounts and remaining budget).
4. **PayPal moves the money**: the server creates the order from the approved record, the buyer approves in PayPal, the server captures and verifies.
5. **Ledger records everything**, append-only, with PayPal order and capture references.

## How PayPal is used
- PayPal Sandbox, Orders v2 API, server-side OAuth.
- `create-order`: amount is read from the approved expense. A browser-supplied amount is rejected.
- Buyer approves on PayPal; return page asks the server to `capture-order`.
- Capture is verified (status, amount, currency, our reference) before anything is marked paid. A redirect alone never completes a payment.
- Idempotency: `PayPal-Request-Id` on create and capture; duplicate capture requests and duplicate webhooks are safe.
- Webhook: `verify-webhook-signature`, processed once per event id. Reconcile endpoint re-checks status with PayPal.
- Each member pays their own share through their own checkout. The app does not claim to split one payment among recipients.

## What is different
Consent-aware agentic payments: the AI can suggest and explain, but cannot approve, raise limits, or pay. The rules live in a testable policy engine.

## Judge test steps
1. Open the live demo URL (add yours here).
2. Sign up (demo OTP code `123456`), set a 4-digit PIN.
3. Plan → generate → Save as pact.
4. Open the pact → edit Transport → read "What changed?" → Approve → Pay with PayPal.
5. Log in on PayPal's sandbox page with the Sandbox buyer account provided in the submission form (never include real credentials in the repo).
6. You return to a confirmation page showing the capture reference; check Ledger.

## 2-minute demo script
0:00 problem (10s) · 0:10 generate plan with Gemini · 0:35 edit amount, show What changed + approval reset · 1:00 approve, pay in PayPal Sandbox · 1:30 return page + ledger reference · 1:50 mention policy engine tests and security.

## Honest limitations
Sandbox only; phone OTP and PIN are demo-grade; copilot is rule-based; single currency per pact; webhook needs a public URL; no multi-approver quorum yet.
