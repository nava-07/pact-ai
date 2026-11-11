import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { sha } from '../utils/pin';
const DIAL: Record<string, string> = { India: '+91', 'United States': '+1', 'United Kingdom': '+44', Canada: '+1', Australia: '+61', Germany: '+49', France: '+33' };
const CUR = ['USD', 'EUR', 'GBP', 'CAD', 'AUD'];
const STEPS = ['Phone', 'Verify', 'About you', 'PayPal', 'PIN', 'Finish'];
export default function Onboarding() {
  const { user, saveProfile, toast } = useStore(); const nav = useNavigate();
  const [i, setI] = useState(0); const [err, setErr] = useState('');
  const [f, setF] = useState({ country: 'India', phone: '', otp: '', name: user ?? '', dob: '', currency: 'USD', paypal: '', pin: '', pin2: '', notifyApprove: true, notifyPay: true, terms: false });
  const set = (k: string, v: string | boolean) => setF(x => ({ ...x, [k]: v }));
  if (!user) return <Navigate to="/login" replace />;
  const fail = (m: string) => setErr(m);
  const next = async () => {
    setErr('');
    if (i === 0 && !/^\d{7,12}$/.test(f.phone)) return fail('Enter 7–12 digits, without spaces.');
    if (i === 1 && f.otp !== '123456') return fail('That code doesn’t match. In demo mode the code is 123456.');
    if (i === 2) { const age = (Date.now() - new Date(f.dob).getTime()) / 31557600000; if (f.name.trim().length < 2) return fail('Enter your full name.'); if (!f.dob || isNaN(age)) return fail('Enter your date of birth.'); if (age < 18) return fail('You must be 18 or older.'); }
    if (i === 3 && f.paypal && !/^\S+@\S+\.\S+$/.test(f.paypal)) return fail('Enter a valid PayPal email, or skip this step.');
    if (i === 4) { if (!/^\d{4}$/.test(f.pin)) return fail('PIN must be exactly 4 digits.'); if (f.pin !== f.pin2) return fail('The two PINs don’t match.'); }
    if (i === 5) {
      if (!f.terms) return fail('Accept the Terms and Privacy notice to continue.');
      saveProfile({ name: f.name.trim(), phone: DIAL[f.country] + ' ' + f.phone, dob: f.dob, country: f.country, currency: f.currency, paypal: f.paypal, pinHash: await sha(f.pin), notifyApprove: f.notifyApprove, notifyPay: f.notifyPay });
      toast('Welcome to Pact AI'); return nav('/app');
    }
    setI(i + 1);
  };
  const L = (t: string, id: string) => <label className="mu" htmlFor={id} style={{ display: 'block', margin: '12px 0 6px' }}>{t}</label>;
  const body = [
    <>{L('Country', 'c')}<select id="c" value={f.country} onChange={e => set('country', e.target.value)} style={{ width: '100%' }}>{Object.keys(DIAL).map(c => <option key={c}>{c}</option>)}</select>{L('Mobile number', 'ph')}<div style={{ display: 'flex', gap: 8 }}><span className="card mono" style={{ padding: '10px 12px' }}>{DIAL[f.country]}</span><input id="ph" inputMode="numeric" autoComplete="tel-national" value={f.phone} onChange={e => set('phone', e.target.value)} /></div><p className="mu" style={{ fontSize: 13 }}>We use your number to recognise you and send approval alerts. Demo mode sends no SMS.</p></>,
    <><p className="mu">Enter the 6-digit code sent to {DIAL[f.country]} {f.phone}.</p><div className="note"><span className="mono">DEMO MODE</span>No SMS is sent. Use code <b className="mono">123456</b>.</div>{L('Verification code', 'otp')}<input id="otp" className="num" inputMode="numeric" maxLength={6} autoComplete="one-time-code" value={f.otp} onChange={e => set('otp', e.target.value)} /></>,
    <>{L('Full name (as on your PayPal account)', 'n')}<input id="n" autoComplete="name" value={f.name} onChange={e => set('name', e.target.value)} />{L('Date of birth', 'd')}<input id="d" type="date" autoComplete="bday" value={f.dob} onChange={e => set('dob', e.target.value)} />{L('Default currency', 'cu')}<select id="cu" value={f.currency} onChange={e => set('currency', e.target.value)} style={{ width: '100%' }}>{CUR.map(c => <option key={c}>{c}</option>)}</select></>,
    <><p className="mu">Add the email of your PayPal Sandbox buyer account so checkout can prefill it. This is optional.</p>{L('PayPal email', 'pp')}<input id="pp" type="email" value={f.paypal} onChange={e => set('paypal', e.target.value)} placeholder="buyer@example.com" /><p className="mu" style={{ fontSize: 13 }}>We never ask for or store your PayPal password. You approve every payment inside PayPal itself.</p></>,
    <><p className="mu">Pact AI asks for this PIN each time you open the app, like a payments app lock.</p>{L('Create a 4-digit PIN', 'p1')}<input id="p1" type="password" inputMode="numeric" maxLength={4} autoComplete="new-password" value={f.pin} onChange={e => set('pin', e.target.value)} />{L('Confirm PIN', 'p2')}<input id="p2" type="password" inputMode="numeric" maxLength={4} autoComplete="new-password" value={f.pin2} onChange={e => set('pin2', e.target.value)} /></>,
    <><label style={{ display: 'flex', gap: 10, margin: '8px 0' }}><input type="checkbox" style={{ width: 'auto' }} checked={f.notifyApprove} onChange={e => set('notifyApprove', e.target.checked)} />Alert me when an expense needs my approval</label>
      <label style={{ display: 'flex', gap: 10, margin: '8px 0' }}><input type="checkbox" style={{ width: 'auto' }} checked={f.notifyPay} onChange={e => set('notifyPay', e.target.checked)} />Alert me about payment updates</label>
      <label style={{ display: 'flex', gap: 10, margin: '14px 0 0' }}><input type="checkbox" style={{ width: 'auto' }} checked={f.terms} onChange={e => set('terms', e.target.checked)} />I accept the Terms and Privacy notice. I understand this build uses PayPal Sandbox and moves no real money.</label></>,
  ][i];
  return <div className="wrap" style={{ maxWidth: 460, padding: '8vh 24px' }}>
    <div className="mono mu" style={{ fontSize: 12, marginBottom: 8 }}>STEP {i + 1} OF {STEPS.length} · {STEPS[i].toUpperCase()}</div>
    <div className="steps" style={{ marginBottom: 24 }}>{STEPS.map((_, k) => <span key={k} className={k <= i ? 'on' : ''} />)}</div>
    <h1 style={{ fontSize: 36, marginBottom: 6 }}>{['What’s your number?', 'Verify it’s you', 'Tell us about you', 'Link PayPal', 'Lock the app', 'Almost done'][i]}</h1>
    <div className="card" style={{ marginTop: 16 }}>{body}<div className="err" role="alert">{err}</div>
      <p style={{ display: 'flex', gap: 8, justifyContent: 'space-between', margin: '18px 0 0' }}>{i > 0 ? <button className="btn" onClick={() => { setErr(''); setI(i - 1); }}>Back</button> : <span />}<span style={{ display: 'flex', gap: 8 }}>{i === 3 && <button className="btn" onClick={() => { set('paypal', ''); setI(4); }}>Skip</button>}<button className="btn p" onClick={next}>{i === 5 ? 'Finish setup' : 'Continue'}</button></span></p></div>
  </div>;
}
