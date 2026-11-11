import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useStore } from '../store';
const schema = z.object({ name: z.string().optional(), email: z.string().email('Enter a valid email address.'), password: z.string().min(8, 'Password must be at least 8 characters.') });
type F = z.infer<typeof schema>;
export default function Login() {
  const [up, setUp] = useState(false); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const { login, register: reg } = useStore(); const nav = useNavigate();
  const { register, handleSubmit, setError, formState: { errors } } = useForm<F>({ resolver: zodResolver(schema) });
  const go = async (d: F) => {
    if (up && (d.name ?? '').trim().length < 2) return setError('name', { message: 'Enter your name.' });
    setBusy(true); setErr('');
    const r = up ? await reg(d.name!.trim(), d.email, d.password) : await login(d.email, d.password);
    setBusy(false); if (r) setErr(r); else nav(up ? '/onboarding' : '/app');
  };
  return <div className="wrap" style={{ maxWidth: 420, paddingTop: '12vh' }}>
    <Link className="logo" to="/"><i />Pact AI</Link>
    <h1 style={{ fontSize: 40, margin: '28px 0 6px' }}>{up ? 'Create your account' : 'Welcome back'}</h1>
    <p className="mu" style={{ marginBottom: 20 }}>{up ? 'Start a pact in a minute.' : 'Sign in to your pacts.'}</p>
    <form className="card" onSubmit={handleSubmit(go)} noValidate>
      {up && <><label className="mu" htmlFor="n">Name</label><input id="n" autoComplete="name" style={{ margin: '6px 0 6px' }} {...register('name')} /><div className="err">{errors.name?.message}</div></>}
      <label className="mu" htmlFor="e" style={{ display: 'block', marginTop: up ? 12 : 0 }}>Email</label><input id="e" type="email" autoComplete="email" style={{ margin: '6px 0 6px' }} {...register('email')} /><div className="err">{errors.email?.message}</div>
      <label className="mu" htmlFor="p" style={{ display: 'block', marginTop: 12 }}>Password</label><input id="p" type="password" autoComplete={up ? 'new-password' : 'current-password'} style={{ margin: '6px 0 6px' }} {...register('password')} /><div className="err">{errors.password?.message}</div>
      <div className="err" role="alert">{err}</div>
      <p style={{ margin: '16px 0 0' }}><button className="btn p" disabled={busy} style={{ width: '100%', justifyContent: 'center' }}>{busy ? 'Please wait…' : up ? 'Create account' : 'Sign in'}</button></p>
    </form>
    <p className="mu" style={{ marginTop: 16, fontSize: 13 }}>{up ? 'Have an account? ' : 'New here? '}<button style={{ background: 'none', border: 0, color: 'var(--ac)', padding: 0 }} onClick={() => { setUp(!up); setErr(''); }}>{up ? 'Sign in' : 'Create an account'}</button></p>
  </div>;
}
