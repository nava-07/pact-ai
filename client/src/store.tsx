import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { api } from './services/api';
import { fmt } from './utils/money';
import { sha } from './utils/pin';
export type Status = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'PAYMENT_PENDING' | 'COMPLETED' | 'REJECTED' | 'CANCELLED' | 'PAYMENT_FAILED' | 'REAPPROVAL_REQUIRED';
export type Role = 'OWNER' | 'APPROVER' | 'MEMBER' | 'VIEWER';
export type Kind = 'proposal' | 'approval' | 'payment' | 'edit';
export interface Expense { id: string; name: string; amt: number; st: Status; ver: number }
export interface Member { uid: string; name: string; role: Role; self?: boolean }
export interface Pact { id: string; title: string; budget: number; currency: string; archived: boolean; role: Role; members: Member[]; ex: Expense[] }
export interface Log { id: string; iso: string; pid: string; eid: string; e: string; x: string; a: number; r: string; k: Kind }
export interface Change { pid: string; name: string; p: number; n: number; rp: number; rn: number; re: boolean; text?: string; source?: string }
export interface Profile { name: string; phone: string; dob: string; country: string; currency: string; paypal: string; pinHash: string; notifyApprove: boolean; notifyPay: boolean }
type R = string | null;
interface Ctx {
  user: string | null; email: string; ready: boolean; profile: Profile | null; locked: boolean; pacts: Pact[]; log: Log[]; last: Change | null; toastMsg: string;
  toast(m: string): void; roleIn(pid: string): Role; planned(pid: string): number; saveProfile(p: Profile): void; unlock(pin: string): Promise<boolean>;
  login(email: string, pw: string): Promise<R>; register(name: string, email: string, pw: string): Promise<R>; logout(): void;
  addPact(title: string, budget: number, currency?: string): Promise<string>; editPact(pid: string, title: string, budget: number): Promise<R>; archive(pid: string, on: boolean): Promise<R>;
  addMember(pid: string, email: string, role: Role): Promise<R>; setRole(pid: string, uid: string, role: Role): Promise<R>; addExpense(pid: string, name: string, amt: number): Promise<R>;
  submit(pid: string, eid: string): Promise<R>; approve(pid: string, eid: string): Promise<R>; reject(pid: string, eid: string): Promise<R>; cancel(pid: string, eid: string): Promise<R>;
  edit(pid: string, eid: string, v: number): Promise<R>; checkout(pid: string, eid: string): Promise<R>; savePlan(title: string, b: number, l: { name: string; amt: number }[], currency: string): Promise<string>;
}
const C = createContext<Ctx>(null as unknown as Ctx);
export const useStore = () => useContext(C);
const OPEN: Status[] = ['CANCELLED', 'REJECTED'];
const kindOf = (t: string): Kind => (/PAYMENT/.test(t) ? 'payment' : /APPROVED|REJECTED/.test(t) ? 'approval' : /EDIT|CANCEL|ARCHIVED|UPDATED|MEMBER/.test(t) ? 'edit' : 'proposal');

export function StoreProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<string | null>(null); const [email, setEmail] = useState(''); const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null); const [locked, setLocked] = useState(false);
  const [pacts, setPacts] = useState<Pact[]>([]); const [log, setLog] = useState<Log[]>([]); const [last, setLast] = useState<Change | null>(null); const [toastMsg, setT] = useState('');
  const uidRef = useRef('');
  const toast = (m: string) => { setT(m); setTimeout(() => setT(''), 2800); };
  const X = (pid: string, eid: string) => { const e = pacts.find(p => p.id === pid)?.ex.find(e => e.id === eid); if (!e) throw new Error('Expense not found — please refresh'); return e; };

  async function reload(uid = uidRef.current) {
    const [a, b] = await Promise.all([api<{ items: any[] }>('/pacts?limit=50'), api<{ items: any[] }>('/pacts?limit=50&archived=true')]);
    const det = await Promise.all([...a.items, ...b.items].map(p => api<any>('/pacts/' + p._id)));
    const ps: Pact[] = det.map(d => ({ id: d.pact._id, title: d.pact.title, budget: d.pact.budgetMinor, currency: d.pact.currency, archived: d.pact.archived, role: d.role,
      members: d.pact.members.map((m: any) => ({ uid: m.user._id, name: m.user.name, role: m.role, self: m.user._id === uid })),
      ex: d.expenses.map((e: any) => ({ id: e._id, name: e.purpose, amt: e.amountMinor, st: e.status, ver: e.version })) }));
    setPacts(ps);
    const names = new Map(ps.flatMap(p => p.ex.map(e => [e.id, e.name] as const))), lg = await api<{ items: any[] }>('/ledger?limit=50');
    setLog(lg.items.map(x => ({ id: x._id, iso: x.createdAt, pid: x.pact, eid: x.expense ?? '', e: x.summary ?? x.type, x: names.get(x.expense) ?? '', a: x.amountMinor ?? 0, r: x.ref ?? '—', k: kindOf(x.type) })));
  }
  async function enter(u: { id: string; email: string; name: string }) {
    uidRef.current = u.id; setEmail(u.email); let pr: Profile | null = null;
    try { pr = JSON.parse(localStorage.getItem('pact:' + u.email) ?? 'null'); } catch { pr = null; }
    setProfile(pr); setLocked(!!pr); setUser((pr ? pr.name : u.name).split(' ')[0]);
    try { await reload(u.id); } catch { /* shown as empty lists; actions report errors */ }
  }
  useEffect(() => { (async () => { try { await enter(await api('/auth/me')); } catch { /* not signed in */ } setReady(true); })(); }, []); // eslint-disable-line
  const call = async (f: () => Promise<unknown>): Promise<R> => { try { await f(); await reload(); return null; } catch (e) { return (e as Error).message; } };

  const v: Ctx = {
    user, email, ready, profile, locked, pacts, log, last, toastMsg, toast,
    roleIn: pid => pacts.find(p => p.id === pid)?.role ?? 'VIEWER',
    planned: pid => pacts.find(p => p.id === pid)?.ex.filter(e => !OPEN.includes(e.st)).reduce((s, e) => s + e.amt, 0) ?? 0,
    saveProfile: p => { setProfile(p); setLocked(false); setUser(p.name.split(' ')[0]); try { localStorage.setItem('pact:' + email, JSON.stringify(p)); } catch { /* storage unavailable */ } },
    unlock: async pin => { if (profile && (await sha(pin)) === profile.pinHash) { setLocked(false); return true; } return false; },
    login: async (em, pw) => { try { await enter(await api('/auth/login', 'POST', { email: em, password: pw })); return null; } catch (e) { return (e as Error).message; } },
    register: async (name, em, pw) => { try { const u = await api<any>('/auth/register', 'POST', { name, email: em, password: pw }); await enter(u); setLocked(false); return null; } catch (e) { return (e as Error).message; } },
    logout: () => { api('/auth/logout', 'POST').catch(() => undefined); setUser(null); setProfile(null); setLocked(false); setPacts([]); setLog([]); setLast(null); },
    addPact: async (title, budget, currency = 'USD') => { const p = await api<any>('/pacts', 'POST', { title, budgetMinor: budget, currency }); await reload(); return p._id; },
    editPact: (pid, title, budget) => call(() => api('/pacts/' + pid, 'PATCH', { title, budgetMinor: budget })),
    archive: (pid, on) => call(() => api('/pacts/' + pid, 'PATCH', { archived: on })),
    addMember: (pid, em, role) => call(() => api('/pacts/' + pid + '/members', 'POST', { email: em, role })),
    setRole: (pid, uid, role) => call(() => api(`/pacts/${pid}/members/${uid}`, 'PATCH', { role })),
    addExpense: (pid, name, amt) => call(() => api('/pacts/' + pid + '/expenses', 'POST', { purpose: name, amountMinor: amt })),
    submit: (_p, eid) => call(() => api('/expenses/' + eid + '/submit', 'POST', {})),
    approve: (pid, eid) => call(() => api('/expenses/' + eid + '/approve', 'POST', { version: X(pid, eid).ver })),
    reject: (_p, eid) => call(() => api('/expenses/' + eid + '/reject', 'POST', {})),
    cancel: (_p, eid) => call(() => api('/expenses/' + eid + '/cancel', 'POST', {})),
    edit: async (pid, eid, val) => {
      if (isNaN(val) || val < 0) return 'Enter a valid, non-negative amount.';
      const x = X(pid, eid); if (val === x.amt) return null;
      try {
        const ex = await api<any>('/ai/explain-change', 'POST', { expenseId: eid, newAmountMinor: val }).catch(() => null); // wording only; may be unavailable
        const r = await api<any>('/expenses/' + eid, 'PATCH', { amountMinor: val }), d = r.diff;
        setLast({ pid, name: x.name, p: d.previous, n: d.next, rp: d.remainingBefore, rn: d.remainingAfter, re: d.reapprovalRequired, source: ex?.source ?? 'template',
          text: ex?.explanation ?? `${x.name} changes from ${fmt(d.previous)} to ${fmt(d.next)}. Remaining budget moves from ${fmt(d.remainingBefore)} to ${fmt(d.remainingAfter)}. ${d.reapprovalRequired ? 'Approve the revised amount before paying.' : ''}` });
        await reload(); return null;
      } catch (e) { return (e as Error).message; }
    },
    checkout: async (_p, eid) => { try { const r = await api<{ approveUrl: string }>('/paypal/create-order', 'POST', { expenseId: eid }); window.location.href = r.approveUrl; return null; } catch (e) { return (e as Error).message; } },
    savePlan: async (title, b, l, currency) => {
      const p = await api<any>('/pacts', 'POST', { title, budgetMinor: b, currency });
      for (const x of l) await api('/pacts/' + p._id + '/expenses', 'POST', { purpose: x.name, amountMinor: x.amt });
      await reload(); return p._id;
    },
  };
  return <C.Provider value={v}>{children}</C.Provider>;
}
