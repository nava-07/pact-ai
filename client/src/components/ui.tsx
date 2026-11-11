import { Component, ReactNode, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Status, useStore } from '../store';
export const LABEL: Record<Status, string> = { DRAFT: 'Draft', PENDING_APPROVAL: 'Pending approval', APPROVED: 'Approved', PAYMENT_PENDING: 'Payment pending', COMPLETED: 'Completed', REJECTED: 'Rejected', CANCELLED: 'Cancelled', PAYMENT_FAILED: 'Payment failed', REAPPROVAL_REQUIRED: 'Re-approval required' };
export const Badge = ({ s, st }: { s?: Status; st?: Status }) => { const v = s ?? st ?? 'DRAFT'; return <span className={'badge b-' + v}>{LABEL[v]}</span>; };
export const Flag = () => <span className="demoflag">DEMO DATA · no real payments</span>;
export const Head = ({ title, sub, children }: { title: string; sub: ReactNode; children?: ReactNode }) => <div className="head"><div><h1>{title}</h1><span className="mu">{sub}</span></div><div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>{children}<Flag /></div></div>;
export function Modal({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  useEffect(() => { const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, [onClose]);
  return <div className="mdl" onClick={e => { if (e.target === e.currentTarget) onClose(); }}><div className="card" role="dialog" aria-modal="true">{children}</div></div>;
}
export const Empty = ({ title, text, sub, to, cta }: { title: string; text?: string; sub?: string; to: string; cta: string }) => <div className="card" style={{ textAlign: 'center', padding: 40 }}><h3 style={{ fontSize: 26, marginBottom: 6 }}>{title}</h3><p className="mu" style={{ marginBottom: 16 }}>{text ?? sub}</p><Link className="btn p" to={to}>{cta}</Link></div>;
export const Skeleton = ({ n, lines }: { n?: number; lines?: number }) => <div style={{ display: 'grid', gap: 12 }}>{Array.from({ length: n ?? lines ?? 3 }, (_, i) => <div key={i} className="sk" />)}</div>;
export const Toast = () => { const { toastMsg } = useStore(); return toastMsg ? <div className="toast" role="status">{toastMsg}</div> : null; };
export const Actions = ({ onCancel, onOk, ok }: { onCancel: () => void; onOk: () => void; ok: string }) => <p style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', margin: '16px 0 0' }}><button className="btn" onClick={onCancel}>Cancel</button><button className="btn p" onClick={onOk}>{ok}</button></p>;
export class ErrorBoundary extends Component<{ children: ReactNode }, { err: Error | null }> {
  constructor(p: { children: ReactNode }) { super(p); this.state = { err: null }; }
  static getDerivedStateFromError(err: Error) { return { err }; }
  render() { if (this.state.err) return <div style={{ padding: 40, textAlign: 'center' }}><h2 style={{ color: 'var(--bd)' }}>Something went wrong</h2><p className="mu">{this.state.err.message}</p><button className="btn p" onClick={() => { this.setState({ err: null }); window.location.href = '/app'; }}>Return to dashboard</button></div>; return this.props.children; }
}

