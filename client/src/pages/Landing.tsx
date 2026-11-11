import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Badge } from '../components/ui';
import { Status } from '../store';
const SEQ: Status[] = ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'PAYMENT_PENDING', 'COMPLETED'];
const FLOW = [['AI', 'Drafts the plan from your words'], ['Policy check', 'Budget and role rules run on the server'], ['Approval', 'The owner signs the exact amount'], ['PayPal', 'Server-created order, buyer approves'], ['Ledger', 'Append-only record of every step']];
const CARDS: [string, string][] = [['Versioned approvals', 'An approval covers one amount, one currency, one purpose. Edit any of them and the expense returns for re-approval.'], ['What changed?', 'Every revision shows old and new amounts and the effect on what’s left, calculated exactly, then explained in plain language.'], ['AI stays advisory', 'The model can propose and explain. It can’t approve, raise a limit, or move money.']];
const TRUST: [string, string][] = [['Amounts in minor units', 'No floating-point money. Totals add up to the cent.'], ['Verified payments only', 'A redirect isn’t proof. Orders complete after a server capture and signed webhook.'], ['Append-only history', 'Events can be added, never rewritten, and are visible to every participant.']];
export default function Landing() {
  const [i, setI] = useState(0);
  useEffect(() => { const t = setInterval(() => setI(x => (x + 1) % 5), 1700); return () => clearInterval(t); }, []);
  const grid = (a: [string, string][]) => <div className="cols">{a.map(([h, p]) => <div className="card" key={h}><h3>{h}</h3><p>{p}</p></div>)}</div>;
  return <>
    <div className="wrap">
      <div className="nav"><Link className="logo" to="/"><i />Pact AI</Link><nav><a href="#how">How it works</a><a href="#consent">Consent</a><a href="#trust">Security</a></nav><Link className="btn sm" to="/login">Sign in</Link></div>
      <div className="hero"><div><div className="eyebrow">Consent-aware agentic payments</div><h1>Your Goals. Your Rules. <em>Your Payments.</em></h1>
        <p className="lede">Describe a trip or a shared purchase in plain words. Pact AI drafts the budget; your rules decide what can be paid, and only people you authorise can release money.</p>
        <Link className="btn p" to="/login">Get started <ArrowRight size={16} /></Link></div>
        <div className="card demo"><div className="mu mono" style={{ fontSize: 12 }}>Goa weekend · 5 people</div>
          <div className="row"><span>Transport</span><span className="num">$200.00</span></div>
          <div className="row"><span>Status</span><Badge s={SEQ[i]} /></div>
          <div className="row" style={{ border: 0 }}><span className="mu">Remaining</span><span className="num mu">$300.00</span></div>
          <div className="steps">{SEQ.map((_, k) => <span key={k} className={k <= i ? 'on' : ''} />)}</div></div></div>
    </div>
    <section className="blk" id="how"><div className="wrap"><h2>The plan is a suggestion. The payment is a decision.</h2>
      <div className="flow">{FLOW.map((s, k) => <div key={s[0]}><span className="mono">0{k + 1}</span><b>{s[0]}</b><small>{s[1]}</small></div>)}</div></div></section>
    <section className="blk" id="consent"><div className="wrap"><h2>Change the number, and the consent resets.</h2>{grid(CARDS)}</div></section>
    <section className="blk" id="trust"><div className="wrap"><h2>Built so the audit trail can be trusted.</h2>{grid(TRUST)}</div></section>
    <footer><div className="wrap"><span className="logo" style={{ fontSize: 20 }}><i />Delegate the Plan. Own the Payment.</span>
      <nav><Link to="/info/docs">Documentation</Link><Link to="/info/privacy">Privacy</Link><Link to="/info/terms">Terms</Link></nav></div></footer>
  </>;
}
