import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { useStore } from '../store';
// PayPal sends the buyer back here after approval. The server captures and verifies; this page never decides success itself.
const Shell = ({ children }: { children: React.ReactNode }) => <div className="wrap" style={{ maxWidth: 480, paddingTop: '14vh' }}><Link className="logo" to="/"><i />Pact AI</Link><div className="card" style={{ marginTop: 28 }}>{children}</div></div>;
export default function PayReturn() {
  const orderId = useSearchParams()[0].get('token'); const ran = useRef(false);
  const [st, setSt] = useState<'busy' | 'ok' | 'err'>('busy'); const [msg, setMsg] = useState(''); const [ref, setRef] = useState('');
  const { reload } = useStore() as any;
  useEffect(() => {
    if (ran.current) return; ran.current = true;
    if (!orderId) { setMsg('No PayPal order was found in this link.'); setSt('err'); return; }
    api<any>('/paypal/capture-order', 'POST', { orderId }).then(r => { setRef(r.payment?.captureId ?? ''); setSt('ok'); try { reload?.(); } catch {} }).catch(e => { setMsg(e.message); setSt('err'); });
  }, [orderId]);
  const check = () => { setSt('busy'); api<any>('/paypal/reconcile', 'POST', { orderId }).then(r => { if (r.payment?.status === 'CAPTURED') { setRef(r.payment.captureId ?? ''); setSt('ok'); } else { setMsg('PayPal reports the order as ' + r.paypalStatus + '.'); setSt('err'); } }).catch(e => { setMsg(e.message); setSt('err'); }); };
  return <Shell>
    {st === 'busy' && <><h3 style={{ fontSize: 26 }}>Confirming your payment…</h3><p className="mu">Please don’t close this page.</p></>}
    {st === 'ok' && <><h3 style={{ fontSize: 26 }}>Payment confirmed</h3><p className="mu">PayPal Sandbox captured the approved amount and the server verified it.</p>{ref && <p className="mono">Capture reference: {ref}</p>}<p><Link className="btn p" to="/ledger">View in ledger</Link></p></>}
    {st === 'err' && <><h3 style={{ fontSize: 26 }}>Payment not confirmed</h3><p className="err">{msg}</p><p className="mu">If you approved the payment in PayPal, check its real status.</p><p style={{ display: 'flex', gap: 8 }}><button className="btn" onClick={check}>Check status</button><Link className="btn" to="/pacts">Back to pacts</Link></p></>}
  </Shell>;
}
export const PayCancel = () => <Shell><h3 style={{ fontSize: 26 }}>Payment cancelled</h3><p className="mu">You left PayPal without paying. Nothing was charged. You can resume it from the pact page.</p><p><Link className="btn p" to="/pacts">Back to pacts</Link></p></Shell>;
