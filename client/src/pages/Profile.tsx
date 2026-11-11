import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { Head } from '../components/ui';
import { sha } from '../utils/pin';
export default function Profile() {
  const { email, profile, pacts, saveProfile, unlock, logout, toast } = useStore(); const nav = useNavigate();
  const [f, setF] = useState(profile); const [cur, setCur] = useState(''); const [nw, setNw] = useState(''); const [err, setErr] = useState('');
  if (!profile || !f) return null;
  const set = (k: string, v: string | boolean) => setF(x => x && { ...x, [k]: v });
  const row = (k: string, v: string) => <div className="ex" key={k} style={{ gridTemplateColumns: '130px 1fr', padding: '8px 0' }}><span className="mu">{k}</span><span>{v}</span></div>;
  const save = () => { if (f.name.trim().length < 2) return toast('Enter your full name.'); if (f.paypal && !/^\S+@\S+\.\S+$/.test(f.paypal)) return toast('Enter a valid PayPal email.'); saveProfile({ ...f, name: f.name.trim() }); toast('Profile saved'); };
  const pin = async () => { setErr(''); if (!/^\d{4}$/.test(nw)) return setErr('New PIN must be 4 digits.'); if (!(await unlock(cur))) return setErr('Current PIN is wrong.'); saveProfile({ ...profile, pinHash: await sha(nw) }); setCur(''); setNw(''); toast('PIN changed'); };
  return <><Head title="Profile" sub="Your account in this demo" />
    <div className="card">{row('Email', email)}{row('Mobile', profile.phone + ' (verified in demo)')}{row('Date of birth', profile.dob)}{row('Roles', pacts.map(p => p.title.split(' ·')[0] + ': ' + p.members.find(m => m.self)?.role).join(' · '))}</div>
    <div className="card" style={{ marginTop: 18 }}><h3 style={{ fontSize: 24 }}>Details</h3>
      <label className="mu" htmlFor="pn" style={{ display: 'block', margin: '12px 0 6px' }}>Full name</label><input id="pn" value={f.name} onChange={e => set('name', e.target.value)} />
      <label className="mu" htmlFor="pc" style={{ display: 'block', margin: '12px 0 6px' }}>Default currency</label><select id="pc" value={f.currency} onChange={e => set('currency', e.target.value)} style={{ width: '100%' }}>{['USD', 'EUR', 'GBP', 'CAD', 'AUD'].map(c => <option key={c}>{c}</option>)}</select>
      <label className="mu" htmlFor="pp" style={{ display: 'block', margin: '12px 0 6px' }}>PayPal email (Sandbox)</label><input id="pp" type="email" value={f.paypal} onChange={e => set('paypal', e.target.value)} />
      <label style={{ display: 'flex', gap: 10, margin: '14px 0 6px' }}><input type="checkbox" style={{ width: 'auto' }} checked={f.notifyApprove} onChange={e => set('notifyApprove', e.target.checked)} />Approval alerts</label>
      <label style={{ display: 'flex', gap: 10 }}><input type="checkbox" style={{ width: 'auto' }} checked={f.notifyPay} onChange={e => set('notifyPay', e.target.checked)} />Payment alerts</label>
      <p style={{ margin: '16px 0 0' }}><button className="btn p" onClick={save}>Save changes</button></p></div>
    <div className="card" style={{ marginTop: 18 }}><h3 style={{ fontSize: 24 }}>Change PIN</h3><div style={{ display: 'flex', gap: 8, margin: '12px 0' }}><input type="password" inputMode="numeric" maxLength={4} placeholder="Current" aria-label="Current PIN" value={cur} onChange={e => setCur(e.target.value)} /><input type="password" inputMode="numeric" maxLength={4} placeholder="New" aria-label="New PIN" value={nw} onChange={e => setNw(e.target.value)} /></div><div className="err">{err}</div><button className="btn" onClick={pin}>Update PIN</button></div>
    <p style={{ display: 'flex', gap: 8, marginTop: 18 }}><button className="btn" onClick={() => { logout(); nav('/'); }}>Log out</button><Link className="btn" to="/status">Service status</Link></p></>;
}
