import { Link, useParams } from 'react-router-dom';
import { useStore } from '../store';
import { Empty, Head } from '../components/ui';
import { KIND } from './Ledger';
import { fmt } from '../utils/money';
export default function LedgerDetail() {
  const { log, pacts } = useStore(); const l = log.find(x => x.id === useParams().id);
  if (!l) return <Empty title="Event not found" text="This ledger entry doesn’t exist." to="/ledger" cta="Back to ledger" />;
  const rel = log.filter(x => x.pid === l.pid && x.eid === l.eid), rows: [string, string][] = [['Event', l.e], ['Type', KIND[l.k]], ['Pact', pacts.find(p => p.id === l.pid)?.title ?? '—'], ['Expense', l.x], ['Amount', fmt(l.a) + ' USD'], ['Time', new Date(l.iso).toLocaleString()], ['PayPal reference', l.r === '—' ? 'None (no payment event)' : l.r + ' · simulated, not a PayPal transaction']];
  return <><Head title="Ledger entry" sub={<Link to="/ledger">← Back to ledger</Link>} />
    <div className="card">{rows.map(([k, v]) => <div className="ex" key={k} style={{ gridTemplateColumns: '160px 1fr', padding: '10px 0' }}><span className="mu">{k}</span><span>{v}</span></div>)}</div>
    <div className="card" style={{ marginTop: 18 }}><h3 style={{ fontSize: 24, marginBottom: 8 }}>Expense history</h3>{rel.map(x => <div className="ex" key={x.id} style={{ gridTemplateColumns: '1fr auto', padding: '8px 0' }}><Link to={'/ledger/' + x.id}>{x.e}</Link><span className="mono mu" style={{ fontSize: 12 }}>{new Date(x.iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>)}</div></>;
}
