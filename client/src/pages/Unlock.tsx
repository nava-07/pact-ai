import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useStore } from '../store';
export default function Unlock() {
  const { user, profile, locked, unlock, logout } = useStore(); const nav = useNavigate();
  const [pin, setPin] = useState(''); const [err, setErr] = useState(''); const [tries, setTries] = useState(0);
  if (!user) return <Navigate to="/login" replace />; if (!locked) return <Navigate to="/app" replace />;
  const change = async (v: string) => {
    setPin(v); if (v.length < 4 || tries >= 5) return;
    if (await unlock(v)) nav('/app'); else { const t = tries + 1; setTries(t); setPin(''); setErr(t >= 5 ? 'Too many attempts. Log out and sign in again.' : `Wrong PIN. ${5 - t} attempts left.`); }
  };
  return <div className="wrap" style={{ maxWidth: 380, paddingTop: '16vh', textAlign: 'center' }}>
    <div className="logo" style={{ justifyContent: 'center' }}><i />Pact AI</div>
    <h1 style={{ fontSize: 36, margin: '28px 0 6px' }}>Hi, {profile?.name.split(' ')[0] ?? user}</h1><p className="mu">Enter your 4-digit PIN to open the app.</p>
    <input className="num" type="password" inputMode="numeric" maxLength={4} autoFocus aria-label="PIN" value={pin} disabled={tries >= 5} onChange={e => change(e.target.value)} style={{ textAlign: 'center', fontSize: 28, letterSpacing: '.5em', margin: '18px 0 8px' }} />
    <div className="err" role="alert">{err}</div><p><button className="btn sm" onClick={() => { logout(); nav('/login'); }}>Forgot PIN? Log out</button></p>
  </div>;
}
