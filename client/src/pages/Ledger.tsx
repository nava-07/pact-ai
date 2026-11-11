import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore, Kind } from '../store';
import { Empty, Head, Skeleton } from '../components/ui';
import { useReady } from '../hooks/useReady';
import { fmt } from '../utils/money';
export const KIND: Record<Kind, string> = { proposal: 'Proposed', approval: 'Approval', payment: 'Payment attempt', edit: 'Change' };
export default function Ledger() {
  const { log, pacts } = useStore(); const ready = useReady();
  const [n, setN] = useState(10); const [f, setF] = useState({ q: '', pid: '', kind: '', from: '', to: '', min: '', max: '' }); const set = (k: string, v: string) => setF(x => ({ ...x, [k]: v }));
  const rows = log.slice().reverse().filter(l => (l.e + l.x + l.r).toLowerCase().includes(f.q.toLowerCase()) && (!f.pid || l.pid === f.pid) && (!f.kind || l.k === f.kind)
    && (!f.from || l.iso.slice(0, 10) >= f.from) && (!f.to || l.iso.slice(0, 10) <= f.to) && (!f.min || l.a >= +f.min * 100) && (!f.max || l.a <= +f.max * 100));
  const name = (id: string) => pacts.find(p => p.id === id)?.title.split(' ·')[0] ?? '—';
  const exportCsv = () => {
    const q = (v: string | number) => '"' + String(v).replace(/"/g, '""') + '"';
    const csv = ['time,pact,event,expense,amount_usd,type,paypal_ref', ...rows.map(l => [l.iso, name(l.pid), l.e, l.x, (l.a / 100).toFixed(2), l.k, l.r].map(q).join(','))].join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'pact-ledger.csv'; a.click(); URL.revokeObjectURL(a.href);
  };
  return <>
    <Head title="Ledger" sub="Append-only. Every action is recorded. Currency: USD."><button className="btn sm" onClick={exportCsv}>Export CSV</button></Head>
    <div className="filters"><input placeholder="Search event, expense or reference" aria-label="Search" value={f.q} onChange={e => set('q', e.target.value)} />
      <select aria-label="Pact" value={f.pid} onChange={e => set('pid', e.target.value)}><option value="">All pacts</option>{pacts.map(p => <option key={p.id} value={p.id}>{p.title.split(' ·')[0]}</option>)}</select>
      <select aria-label="Type" value={f.kind} onChange={e => set('kind', e.target.value)}><option value="">All types</option>{(Object.keys(KIND) as Kind[]).map(k => <option key={k} value={k}>{KIND[k]}</option>)}</select>
      <input type="date" aria-label="From" value={f.from} onChange={e => set('from', e.target.value)} style={{ maxWidth: 150 }} /><input type="date" aria-label="To" value={f.to} onChange={e => set('to', e.target.value)} style={{ maxWidth: 150 }} />
      <input className="num" placeholder="Min $" aria-label="Min amount" value={f.min} onChange={e => set('min', e.target.value)} style={{ maxWidth: 90 }} /><input className="num" placeholder="Max $" aria-label="Max amount" value={f.max} onChange={e => set('max', e.target.value)} style={{ maxWidth: 90 }} /></div>
    {!ready ? <Skeleton /> : rows.length ? <div className="card scroll"><table><thead><tr><th>Time</th><th>Pact</th><th>Event</th><th>Expense</th><th>Amount</th><th>Type</th><th>PayPal ref</th></tr></thead><tbody>
      {rows.slice(0, n).map(l => <tr key={l.id}><td className="mono"><Link to={'/ledger/' + l.id}>{new Date(l.iso).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</Link></td><td>{name(l.pid)}</td><td>{l.e}</td><td>{l.x}</td><td className="num">{fmt(l.a)}</td><td><span className="badge">{KIND[l.k]}</span></td><td className="mono mu">{l.r}</td></tr>)}</tbody></table>{rows.length > n && <p style={{ padding: 12 }}><button className="btn sm" onClick={() => setN(n + 10)}>Show more</button></p>}</div>
      : <Empty title="No events match" text="Clear a filter, or make a change on a pact." to="/pacts" cta="Go to pacts" />}</>;
}
