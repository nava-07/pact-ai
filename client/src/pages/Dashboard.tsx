import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useStore } from '../store';
import { Badge, Empty, Head, Skeleton } from '../components/ui';
import { useReady } from '../hooks/useReady';
import { fmt } from '../utils/money';
export default function Dashboard() {
  const s = useStore(); const ready = useReady(); const act = s.pacts.filter(p => !p.archived);
  if (!ready) return <><Head title="Dashboard" sub="Across all active pacts" /><Skeleton n={4} /></>;
  if (!act.length) return <><Head title="Dashboard" sub="Across all active pacts" /><Empty title="Nothing here yet" text="Create a pact to see budgets and approvals." to="/pacts" cta="Go to pacts" /></>;
  const all = act.flatMap(p => p.ex.map(e => ({ ...e, p }))).filter(e => e.st !== 'CANCELLED' && e.st !== 'REJECTED');
  const sum = (f: (st: string) => boolean) => all.filter(e => f(e.st)).reduce((a, e) => a + e.amt, 0);
  const budget = act.reduce((a, p) => a + p.budget, 0), planned = sum(() => true), paid = sum(x => x === 'COMPLETED'), appr = sum(x => x === 'APPROVED' || x === 'PAYMENT_PENDING'), rest = planned - paid - appr;
  const seg = (v: number, c: string) => <span style={{ flex: v, background: c }} />;
  const cat: Record<string, number> = {}; all.forEach(e => { cat[e.name] = (cat[e.name] ?? 0) + e.amt / 100; });
  const tasks = all.flatMap(e => { const ok = ['OWNER', 'APPROVER'].includes(s.roleIn(e.p.id)); return e.st === 'PENDING_APPROVAL' || e.st === 'REAPPROVAL_REQUIRED' ? (ok ? [{ k: 'Approve', e }] : []) : e.st === 'APPROVED' || e.st === 'PAYMENT_FAILED' ? (ok ? [{ k: 'Pay', e }] : []) : e.st === 'DRAFT' ? [{ k: 'Submit', e }] : []; });
  const pay = all.reduce<Record<string, number>>((m, e) => { m[e.st] = (m[e.st] ?? 0) + 1; return m; }, {});
  return <>
    <Head title="Dashboard" sub="Across all active pacts" />
    <div className="stats">{[['Budgets', budget], ['Planned', planned], ['Paid (captured)', paid], ['Remaining', budget - planned]].map(([l, v]) => <div className="card stat" key={l as string}><small>{l}</small><span className="num">{fmt(v as number)}</span></div>)}</div>
    <div className="card" style={{ marginBottom: 18 }}><small className="mu">Where the money stands</small><div className="bar">{seg(paid, 'var(--ac)')}{seg(appr, 'var(--cy)')}{seg(rest, '#34476a')}{seg(Math.max(budget - planned, 0), 'transparent')}</div>
      <div className="legend"><span><i style={{ background: 'var(--ac)' }} />Paid {fmt(paid)}</span><span><i style={{ background: 'var(--cy)' }} />Approved, unpaid {fmt(appr)}</span><span><i style={{ background: '#34476a' }} />Not yet approved {fmt(rest)}</span></div>
      <div className="legend" style={{ marginTop: 10 }}>{Object.entries(pay).map(([k, n]) => <span key={k}>{n} × {k.replace(/_/g, ' ').toLowerCase()}</span>)}</div></div>
    <div className="card" style={{ marginBottom: 18 }}><small className="mu">Spending by category</small><ResponsiveContainer width="100%" height={200}><BarChart data={Object.entries(cat).map(([name, v]) => ({ name, v }))}><XAxis dataKey="name" stroke="#8393aa" fontSize={12} tickLine={false} />
      <Tooltip cursor={{ fill: '#111b2c' }} contentStyle={{ background: '#111b2c', border: '1px solid #1c2a3f' }} formatter={(v: number) => '$' + v.toFixed(2)} /><Bar dataKey="v" fill="#2ee59d" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>
    <div className="two"><div className="card"><h3 style={{ fontSize: 24, marginBottom: 10 }}>Upcoming tasks</h3>
      {tasks.length ? tasks.slice(0, 6).map(({ k, e }) => <div className="ex" key={e.id}><div><b>{k}: {e.name}</b><div className="mu" style={{ fontSize: 13 }}>{e.p.title.split(' ·')[0]} · <span className="num">{fmt(e.amt)}</span></div></div><Badge s={e.st} /><Link className="btn sm" to={'/pacts/' + e.p.id}>Open</Link></div>) : <p className="mu">Nothing waiting. Quiet is good.</p>}</div>
      <div className="card"><h3 style={{ fontSize: 24, marginBottom: 10 }}>Recent pacts</h3>{act.slice(-3).reverse().map(p => <div className="ex" key={p.id} style={{ gridTemplateColumns: '1fr auto', padding: '10px 0' }}><Link to={'/pacts/' + p.id}>{p.title}</Link><span className="num mu">{fmt(s.planned(p.id))}</span></div>)}
        <h3 style={{ fontSize: 24, margin: '16px 0 6px' }}>Recent activity</h3>{s.log.slice(-3).reverse().map(l => <div className="ex" key={l.id} style={{ gridTemplateColumns: '1fr auto', padding: '8px 0' }}><span>{l.e}<div className="mu" style={{ fontSize: 13 }}>{l.x}</div></span><Link to={'/ledger/' + l.id} className="mono mu" style={{ fontSize: 12 }}>{new Date(l.iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Link></div>)}</div></div></>;
}
