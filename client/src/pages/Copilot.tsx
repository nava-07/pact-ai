import { useState } from 'react';
import { Head } from '../components/ui';
import { api } from '../services/api';
export default function Copilot() {
  const [q, setQ] = useState(''); const [busy, setBusy] = useState(false);
  const [m, setM] = useState<{ u: boolean; t: string }[]>([{ u: false, t: 'Ask about your pacts. I answer from your saved figures and can’t move money.' }]);
  const send = async () => {
    const text = q.trim(); if (!text || busy) return; setQ(''); setBusy(true); setM(a => [...a, { u: true, t: text }]);
    try { const r = await api<{ answer: string }>('/ai/copilot', 'POST', { message: text }); setM(a => [...a, { u: false, t: r.answer }]); }
    catch (e) { setM(a => [...a, { u: false, t: (e as Error).message }]); } finally { setBusy(false); }
  };
  return <><Head title="Copilot" sub="Answers are calculated from your own pacts, never invented." />
    <div className="card"><div className="chat">{m.map((x, i) => <div key={i} className={'msg ' + (x.u ? 'u' : 'a')}>{x.t}</div>)}{busy && <div className="msg a mu">Checking your pacts…</div>}</div>
      <div style={{ display: 'flex', gap: 8 }}><input value={q} placeholder="How much budget remains?" aria-label="Message" onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} /><button className="btn p" disabled={busy} onClick={send}>Ask</button></div></div></>;
}
