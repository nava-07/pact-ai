import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useStore, Expense, Role } from '../store';
import { Actions, Badge, Empty, Head, Modal } from '../components/ui';
import { fmt, toMinor } from '../utils/money';
type K = 'edit' | 'add' | 'approve' | 'reject' | 'cancel' | 'pay' | 'hist' | 'pact' | 'invite';
const ROLES: Role[] = ['OWNER', 'APPROVER', 'MEMBER', 'VIEWER'];
export default function Pact() {
  const s = useStore(); const nav = useNavigate(); const p = s.pacts.find(x => x.id === useParams().id);
  const [d, setD] = useState<{ k: K; e?: Expense } | null>(null); const [err, setErr] = useState(''); const [v, setV] = useState(''); const [v2, setV2] = useState(''); const [rl, setRl] = useState<Role>('MEMBER');
  if (!p) return <Empty title="Pact not found" text="It may not exist, or you don’t have access to it." to="/pacts" cta="Back to pacts" />;
  const role = s.roleIn(p.id), ok = role === 'OWNER' || role === 'APPROVER', canEdit = role !== 'VIEWER', owner = role === 'OWNER', pl = s.planned(p.id);
  const L = s.last && s.last.pid === p.id ? s.last : null;
  const open = (k: K, e?: Expense, a = '', b = '') => { setD({ k, e }); setV(a); setV2(b); setErr(''); };
  const close = () => { setD(null); setErr(''); };
  const run = async (rp: Promise<string | null>, m: string) => { const r = await rp; if (r) setErr(r); else { s.toast(m); close(); } };
  const act = async (rp: Promise<string | null>, m: string) => s.toast((await rp) ?? m);
  const eid = d?.e?.id ?? '', hist = s.log.filter(l => l.pid === p.id && l.eid === eid).reverse();
  const confirm = (t: string, body: string, f: () => Promise<string | null>, m: string, label: string) => <><h3>{t}</h3><p className="mu">{body}</p><div className="err">{err}</div><Actions onCancel={close} onOk={() => run(f(), m)} ok={label} /></>;
  return <>
    <Head title={p.title} sub={<>You are {role.toLowerCase()} · Budget {fmt(p.budget)} · Remaining <span className="num">{fmt(p.budget - pl)}</span>{p.archived && ' · Archived'}</>}>
      <Link className="btn sm" to="/pacts">All pacts</Link>
      {owner && <><button className="btn sm" onClick={() => open('pact', undefined, String(p.budget / 100), p.title)}>Edit pact</button><button className="btn sm" onClick={async () => { await s.archive(p.id, !p.archived); s.toast(p.archived ? 'Pact restored' : 'Pact archived'); if (!p.archived) nav('/pacts'); }}>{p.archived ? 'Restore' : 'Archive'}</button></>}</Head>
    {L && <div className="note"><span className="mono">WHAT CHANGED?</span>{L.text} <span className="mu">({L.source === 'gemini' ? 'Worded by Gemini' : 'Standard wording'}; figures are computed exactly.)</span></div>}
    {!ok && <div className="note"><span className="mono">ROLE</span>As {role.toLowerCase()} you can propose and edit expenses, but only an owner or approver can approve and pay.</div>}
    <div className="card"><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><h3 style={{ fontSize: 24 }}>Expenses</h3>{canEdit && !p.archived && <button className="btn sm" onClick={() => open('add')}>Add expense</button>}</div>
      {p.ex.length ? p.ex.map(e => <div className="ex" key={e.id}>
        <div><h3>{e.name}</h3><span className="mu">Estimate, not a supplier quote</span></div><div style={{ textAlign: 'right' }}><div className="num" style={{ fontSize: 18 }}>{fmt(e.amt)}</div><Badge s={e.st} /></div>
        <div className="acts"><button className="btn sm" onClick={() => open('hist', e)}>History</button>
          {canEdit && !['COMPLETED', 'CANCELLED'].includes(e.st) && <button className="btn sm" onClick={() => open('edit', e, String(e.amt / 100))}>Edit amount</button>}
          {canEdit && (e.st === 'DRAFT' || e.st === 'REJECTED') && <button className="btn sm" onClick={() => act(s.submit(p.id, e.id), 'Submitted for approval')}>Submit</button>}
          {ok && (e.st === 'PENDING_APPROVAL' || e.st === 'REAPPROVAL_REQUIRED') && <><button className="btn sm p" onClick={() => open('approve', e)}>Approve {fmt(e.amt)}</button><button className="btn sm" onClick={() => open('reject', e)}>Reject</button></>}
          {ok && (e.st === 'APPROVED' || e.st === 'PAYMENT_FAILED' || e.st === 'PAYMENT_PENDING') && <button className="btn sm p" onClick={() => open('pay', e)}>{e.st === 'PAYMENT_FAILED' ? 'Retry payment' : e.st === 'PAYMENT_PENDING' ? 'Resume payment' : 'Pay with PayPal'}</button>}
          {owner && !['COMPLETED', 'CANCELLED'].includes(e.st) && <button className="btn sm" onClick={() => open('cancel', e)}>Cancel</button>}</div></div>)
        : <p className="mu" style={{ marginTop: 12 }}>No expenses yet. Add one to start.</p>}</div>
    <div className="card" style={{ marginTop: 18 }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><h3 style={{ fontSize: 24 }}>Members and roles</h3>{owner && <button className="btn sm" onClick={() => open('invite')}>Invite</button>}</div>
      <p className="mu" style={{ margin: '4px 0 10px' }}>Each member pays their own share through their own PayPal checkout. Pact AI doesn’t split one payment between recipients.</p>
      {p.members.map(m => <div className="ex" key={m.name} style={{ gridTemplateColumns: '1fr auto auto', padding: '10px 0' }}><span>{m.self ? 'You' : m.name}</span><span className="num">{fmt(Math.round(p.budget / p.members.length))}</span>
        {owner && !m.self ? <select aria-label={'Role for ' + m.name} value={m.role} onChange={e => { s.setRole(p.id, m.uid, e.target.value as Role); s.toast('Role updated'); }}>{ROLES.map(r => <option key={r}>{r}</option>)}</select> : <span className="badge">{m.role}</span>}</div>)}</div>
    {d && <Modal onClose={close}>
      {d.k === 'edit' && <><h3>Edit {d.e!.name}</h3><p className="mu">Changing an approved amount cancels the approval.</p><input className="num" value={v} onChange={x => setV(x.target.value)} inputMode="decimal" aria-label="New amount" /><div className="err">{err}</div><Actions onCancel={close} onOk={() => run(s.edit(p.id, eid, toMinor(v)), 'Amount updated')} ok="Save change" /></>}
      {d.k === 'add' && <><h3>Add expense</h3><input value={v2} onChange={x => setV2(x.target.value)} placeholder="Name" aria-label="Name" style={{ margin: '8px 0' }} /><input className="num" value={v} onChange={x => setV(x.target.value)} placeholder="Amount (USD)" inputMode="decimal" aria-label="Amount" /><div className="err">{err}</div><Actions onCancel={close} onOk={() => run(s.addExpense(p.id, v2.trim(), toMinor(v)), 'Expense added')} ok="Add" /></>}
      {d.k === 'approve' && confirm(`Approve ${fmt(d.e!.amt)}?`, `You’re approving ${d.e!.name} for exactly ${fmt(d.e!.amt)} USD. Any later change will need approval again.`, () => s.approve(p.id, eid), 'Approved', 'Approve')}
      {d.k === 'reject' && confirm('Reject this expense?', `${d.e!.name} returns to the proposer. They can revise and resubmit.`, () => s.reject(p.id, eid), 'Rejected', 'Reject')}
      {d.k === 'cancel' && confirm('Cancel this expense?', `${d.e!.name} will no longer count toward planned spend. This can’t be undone.`, () => s.cancel(p.id, eid), 'Cancelled', 'Cancel expense')}
      {d.k === 'pay' && <><h3>Pay with PayPal</h3><p className="mu">You’ll be sent to PayPal Sandbox to approve {fmt(d.e!.amt)}. The server charges only the approved amount and confirms the payment before marking it paid. Sandbox uses test money.</p><div className="err">{err}</div><Actions onCancel={close} onOk={async () => { const r = await s.checkout(p.id, eid); if (r) setErr(r); }} ok="Continue to PayPal" /></>}
      {d.k === 'hist' && <><h3>{d.e!.name} history</h3>{hist.length ? hist.map(l => <div className="ex" key={l.id} style={{ gridTemplateColumns: '1fr auto', padding: '8px 0' }}><span>{l.e}<div className="mu num" style={{ fontSize: 13 }}>{fmt(l.a)}</div></span><Link to={'/ledger/' + l.id} className="mono mu" style={{ fontSize: 12 }}>{new Date(l.iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Link></div>) : <p className="mu">No recorded events.</p>}<Actions onCancel={close} onOk={close} ok="Done" /></>}
      {d.k === 'pact' && <><h3>Edit pact</h3><input value={v2} onChange={x => setV2(x.target.value)} aria-label="Title" style={{ margin: '8px 0' }} /><input className="num" value={v} onChange={x => setV(x.target.value)} inputMode="decimal" aria-label="Budget" /><div className="err">{err}</div><Actions onCancel={close} onOk={() => run(s.editPact(p.id, v2.trim(), toMinor(v)), 'Pact updated')} ok="Save" /></>}
      {d.k === 'invite' && <><h3>Invite a member</h3><p className="mu">Demo mode adds them immediately. With the backend, an emailed invite link is sent.</p><input value={v2} onChange={x => setV2(x.target.value)} placeholder="email@example.com" aria-label="Email" style={{ margin: '8px 0' }} /><select value={rl} onChange={x => setRl(x.target.value as Role)} aria-label="Role">{ROLES.filter(r => r !== 'OWNER').map(r => <option key={r}>{r}</option>)}</select><div className="err">{err}</div><Actions onCancel={close} onOk={() => run(s.addMember(p.id, v2.trim(), rl), 'Member added')} ok="Add member" /></>}
    </Modal>}</>;
}
