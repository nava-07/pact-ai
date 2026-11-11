# ⚡ Pact AI — Consent-Aware Agentic Payments

> **"Delegate the Plan. Own the Payment."**  
> *Transforming natural language into structured budgets, collaborative governance, and tamper-proof payments.*

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React_18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Gemini API](https://img.shields.io/badge/Google_Gemini-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev/)
[![PayPal Developer](https://img.shields.io/badge/PayPal_Orders_v2-00457C?style=for-the-badge&logo=paypal&logoColor=white)](https://developer.paypal.com/)

---

## 💡 The Core Problem & Philosophy

Autonomous AI agents moving money without human oversight is a recipe for disaster. Groups planning shared expenses (trips, hackathons, team events, group purchases) often struggle with informal agreements, untracked debts, and zero verifiable audit trails.

**Pact AI introduces Consent-Aware Agentic Payments:**
1. **AI drafts the plan** (Google Gemini API understands intent and breaks it down into line items).
2. **Deterministic policy engine enforces the rules** (hard financial limits, roles, mathematical invariants).
3. **Humans retain sovereign consent** (versioned cryptographic approvals; material changes immediately invalidate approval).
4. **PayPal moves the money** (server-authoritative Orders v2 checkout where the browser never specifies the amount).
5. **Append-only ledger records everything** (tamper-proof audit logs referencing verified PayPal capture IDs).

```
 USER INTENT ──▶ GEMINI DRAFT ──▶ POLICY ENGINE ──▶ HUMAN CONSENT ──▶ PAYPAL CAPTURE ──▶ VERIFIED LEDGER
 (Natural Text)   (Validation)   (Budget & Roles)  (Version Lock)    (Server OAuth)      (Append-Only)
```

---

## 🏛️ System Architecture

```
┌────────────────────────────────────────────────────────┐
│            React 18 + TypeScript Client               │
│  (Vite · Dark Fintech UI · Recharts · Lucide Icons)   │
└───────────────────────────┬────────────────────────────┘
                            │ /api (HttpOnly JWT Cookies)
┌───────────────────────────▼────────────────────────────┐
│               Express + Node.js Backend                │
│                                                        │
│  ├─ Policy Engine (Finite State Machine & Budgets)     │
│  ├─ Versioned Approvals & Material Change Detection   │
│  ├─ PayPal Orders v2 (OAuth2 Token Caching & Webhooks) │
│  ├─ Gemini AI Multi-Model Resilient Fallback Chain     │
│  └─ Append-Only Immutable Audit Ledger                │
└──────────────┬──────────────────────────┬──────────────┘
               │                          │
┌──────────────▼─────────────┐   ┌────────▼──────────────┐
│       MongoDB Atlas        │   │    External Services  │
│  • Users & Profiles        │   │  • Google Gemini API  │
│  • Pacts & Members         │   │  • PayPal Sandbox     │
│  • Versioned Expenses      │   └───────────────────────┘
│  • Append-Only Audit Log   │
│  • Notifications           │
└────────────────────────────┘
```

---

## 🌟 Key Features

### 1. 🤖 Next-Gen AI Plan Generator
Describe any financial goal in plain language:
> *"Plan a 3-day hackathon event for 4 team members with a budget of $400"*

Gemini structures the plan into line items with categories, amounts, priorities, and assumptions. All outputs are strictly validated using Zod, converted to integer minor units (cents), and clearly flagged as estimates.

### 2. 🛡️ Deterministic ConsentFlow Engine
- **State Machine:** `DRAFT` ➔ `PENDING_APPROVAL` ➔ `APPROVED` ➔ `PAYMENT_PENDING` ➔ `COMPLETED`.
- **Versioned Approvals:** Approvals pin the exact amount, currency, purpose, and version.
- **"What Changed?" Protection:** Modifying an approved expense immediately invalidates the approval, increments the version, and flags `REAPPROVAL_REQUIRED`.

### 3. 💳 PayPal Orders v2 Sandbox Integration
- **Server-Authoritative:** The browser **never** sends or alters the payment amount.
- **4-Way Capture Verification:** Capture status, reference ID, currency, and exact minor units must match server records before marking complete.
- **Idempotency:** Unique `PayPal-Request-Id` headers prevent duplicate charges or double captures.
- **Reconciliation:** Fallback endpoint to check order status directly with PayPal if webhook delivery is pending.

### 4. 🛰️ Pact Agent Center (`/agent`)
A 9-stage transparent execution pipeline that visually reveals the full lifecycle of every expense from initial prompt to immutable ledger confirmation.

### 5. 👥 Smart Share (`/share`)
Group financial coordination calculating zero-loss exact penny distributions across members with individual contribution status tracking.

### 6. 🔮 What-If Simulator (`/simulator`)
An interactive financial sandbox allowing groups to adjust expenses, headcount, or total budget to see the exact impact on per-member shares and overrun warnings without mutating live pact records.

### 7. 📊 Financial Analytics & Reports (`/analytics`)
Interactive visual dashboards powered by Recharts:
- Spending by Category (Pie Chart)
- Budget vs. Actual Spend per Pact (Bar Chart)
- Status Distribution & Utilization Gauges
- One-Click CSV Audit Export

### 8. 🔔 In-App Notification Center (`/notifications`)
Persistent MongoDB-backed real-time notifications for approval requests, status transitions, budget revisions, and captured payments.

---

## 🚀 Quickstart Guide

### Prerequisites
- **Node.js** v20+
- **MongoDB Atlas** connection string
- **Google Gemini API Key** ([Google AI Studio](https://aistudio.google.com/))
- **PayPal Sandbox Credentials** ([PayPal Developer](https://developer.paypal.com/))

### 1. Clone & Configure
```bash
git clone https://github.com/nava-07/pact-ai.git
cd pact-ai
cp .env.example .env
```

Fill in your credentials in `.env` (this file is excluded from Git):
```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
SESSION_SECRET=your_jwt_secret_phrase
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-3.5-flash
PAYPAL_CLIENT_ID=your_paypal_sandbox_client_id
PAYPAL_CLIENT_SECRET=your_paypal_sandbox_secret
PAYPAL_BASE_URL=https://api-m.sandbox.paypal.com
CLIENT_URL=http://localhost:5173
SERVER_URL=http://localhost:5000
```

### 2. Install & Build
```bash
# Install all dependencies across client and server
npm run install:all

# Run full project test suites (19 server + 2 client tests)
npm test

# Build production bundles
npm run build
```

### 3. Launch Development Mode
```bash
# Terminal 1: Backend API (port 5000)
npm run dev:server

# Terminal 2: React Frontend (port 5173)
npm run dev:client
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🧪 Testing & Verification

Pact AI comes with comprehensive test coverage:
```bash
npm run test
```
- **Policy Engine Tests:** Validates state transitions, budget bounds, material change detection, and version invalidation.
- **PayPal Verification Tests:** Validates capture amount, currency match, tamper rejection, and idempotency.
- **Financial Minor Unit Tests:** Validates decimal parsing and zero-loss penny allocation across splits.

---

## 🔒 Security Architecture

- **Zero Floating-Point Drift:** Stored strictly in integer minor units (cents).
- **Session Security:** Cryptographic HttpOnly cookies (`SameSite=None; Secure` in production) signed with JWT.
- **Tamper-Proof Audit Trail:** Mongoose ODM interceptors enforce append-only constraints; update and delete operations throw fatal exceptions.
- **Role-Based Access Control:** Every API route verifies pact membership; foreign IDs return generic 404s to eliminate enumeration attacks.
- **AI Sandboxing:** AI outputs are treated as untrusted inputs and validated through strict Zod schemas before entering the state machine.

---

## 📄 License

MIT License. Built for international hackathon demonstration.  
**Pact AI — Delegate the Plan. Own the Payment.**
