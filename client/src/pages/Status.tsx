import { useEffect, useState } from 'react';
import { Head } from '../components/ui';
import { api } from '../services/api';
type H = { config: Record<string, boolean> } | 'down' | null;
const NAMES: Record<string, string> = { mongodb: 'MongoDB', gemini: 'Gemini API', paypal: 'PayPal Sandbox credentials', paypalWebhook: 'PayPal webhook ID' };
export default function Status() {
  const [h, setH] = useState<H>(null);
  useEffect(() => { api<{ config: Record<string, boolean> }>('/health').then(setH).catch(() => setH('down')); }, []);
  return <>
    <Head title="Status" sub="Configuration of connected services" />
    <div className="card">{h === null ? <p className="mu">Checking…</p> : h === 'down' ? <p className="err">Backend not reachable. Start it with <span className="mono">npm run dev:server</span>.</p> :
      Object.entries(h.config).map(([k, v]) => <div className="ex" key={k} style={{ gridTemplateColumns: '1fr auto' }}><span>{NAMES[k] ?? k}</span><span className={'badge ' + (v ? 'b-COMPLETED' : '')}>{v ? 'Configured' : 'Missing'}</span></div>)}</div>
    <div className="card" style={{ marginTop: 18 }}><h3 style={{ fontSize: 24, marginBottom: 6 }}>Payment health</h3>
      {[['Environment', 'PayPal Sandbox (no real money)'], ['Order creation', 'Server-side only, amount taken from the approved expense'], ['Capture', 'Server-side, after buyer approval in PayPal'], ['Confirmation', 'Signed webhook, handled once per event'], ['This build', 'Payments are simulated until the backend is connected']].map(([k, v]) => <div className="ex" key={k} style={{ gridTemplateColumns: '150px 1fr', padding: '8px 0' }}><span className="mu">{k}</span><span>{v}</span></div>)}</div></>;
}
