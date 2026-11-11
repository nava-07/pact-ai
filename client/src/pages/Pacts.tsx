import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { Actions, Empty, Head, Modal } from '../components/ui';
import { fmt, toMinor } from '../utils/money';
export default function Pacts() {
  const s = useStore(); const nav = useNavigate(); const [open, setOpen] = useState(false); const [arch, setArch] = useState(false);
  const [t, setT] = useState(''); const [b, setB] = useState(''); const [err, setErr] = useState('');
  const list = s.pacts.filter(p => p.archived === arch);
  const create = async () => { const m = toMinor(b); if (!t.trim()) return setErr('Give the pact a title.'); if (!(m > 0)) return setErr('Budget must be greater than zero.'); try { const id = await s.addPact(t.trim(), m, s.profile?.currency); s.toast('Pact created'); nav('/pacts/' + id); } catch (e) { setErr((e as Error).message); } };
  return <>
    <Head title="Pacts" sub="Every shared budget you own or belong to.">
      <button className="btn sm" onClick={() => setArch(!arch)}>{arch ? 'Show active' : 'Show archived'}</button><button className="btn p sm" onClick={() => { setT(''); setB(''); setErr(''); setOpen(true); }}>New pact</button></Head>
    {list.length ? <div className="grid2">{list.map(p => { const pl = s.planned(p.id), wait = p.ex.filter(e => e.st === 'PENDING_APPROVAL' || e.st === 'REAPPROVAL_REQUIRED').length;
      return <Link to={'/pacts/' + p.id} className="card" key={p.id}><h3 style={{ fontSize: 24 }}>{p.title}</h3><span className="mu">{p.members.length} members · you are {s.roleIn(p.id).toLowerCase()}</span>
        <div className="prog"><i style={{ width: Math.min(100, (pl / p.budget) * 100) + '%' }} /></div><span className="mu num">{fmt(pl)} of {fmt(p.budget)} planned</span>{wait > 0 && <div style={{ marginTop: 8 }}><span className="badge b-PENDING_APPROVAL">{wait} awaiting approval</span></div>}</Link>; })}</div>
      : <Empty title={arch ? 'No archived pacts' : 'No pacts yet'} text="Draft one with the plan generator or start from scratch." to="/plan" cta="Draft a plan" />}
    {open && <Modal onClose={() => setOpen(false)}><h3>New pact</h3><label className="mu" htmlFor="t">Title</label><input id="t" value={t} onChange={e => setT(e.target.value)} style={{ margin: '6px 0 12px' }} /><label className="mu" htmlFor="b">Total budget (USD)</label><input id="b" className="num" inputMode="decimal" value={b} onChange={e => setB(e.target.value)} style={{ marginTop: 6 }} /><div className="err">{err}</div><Actions onCancel={() => setOpen(false)} onOk={create} ok="Create pact" /></Modal>}</>;
}
