import { useStore } from '../store';
import { useReady } from '../hooks/useReady';
import { Head, Skeleton, Badge, Empty } from '../components/ui';
import { fmt } from '../utils/money';
import { Link } from 'react-router-dom';
import { Activity, CheckCircle, Clock, XCircle, AlertTriangle, ArrowRight } from 'lucide-react';

const STEPS = [
  { key: 'DRAFT', label: 'Goal Submitted', icon: Clock },
  { key: 'AI_PLAN', label: 'AI Plan Generated', icon: Activity },
  { key: 'BUDGET_CHECK', label: 'Budget Validated', icon: CheckCircle },
  { key: 'PENDING_APPROVAL', label: 'Approval Requested', icon: Clock },
  { key: 'APPROVED', label: 'Human Approved', icon: CheckCircle },
  { key: 'PAYMENT_PENDING', label: 'PayPal Checkout', icon: Clock },
  { key: 'COMPLETED', label: 'Payment Captured', icon: CheckCircle },
  { key: 'LEDGER', label: 'Ledger Recorded', icon: CheckCircle },
];

const STATUS_ORDER: Record<string, number> = { DRAFT: 0, PENDING_APPROVAL: 3, APPROVED: 4, REAPPROVAL_REQUIRED: 3, PAYMENT_PENDING: 5, COMPLETED: 7, REJECTED: -1, CANCELLED: -2, PAYMENT_FAILED: -3 };

function stepStatus(expStatus: string, stepIdx: number): 'done' | 'active' | 'pending' | 'failed' {
  const pos = STATUS_ORDER[expStatus] ?? 0;
  if (expStatus === 'REJECTED') return stepIdx <= 3 ? 'failed' : 'pending';
  if (expStatus === 'CANCELLED') return 'failed';
  if (expStatus === 'PAYMENT_FAILED') return stepIdx <= 5 ? (stepIdx === 5 ? 'failed' : 'done') : 'pending';
  if (stepIdx < pos) return 'done';
  if (stepIdx === pos) return 'active';
  return 'pending';
}

export default function AgentCenter() {
  const s = useStore();
  const ok = useReady();
  const active = s.pacts.filter(p => !p.archived);

  if (!ok) return <div className="p-6"><Skeleton lines={8} /></div>;
  if (!active.length) return <Empty title="No Active Pacts" sub="Create a pact to see agent activity" to="/plan" cta="Create Plan" />;

  return (
    <div className="p-6" style={{ maxWidth: 900 }}>
      <Head title="Pact Agent Center" sub="Transparent AI activity timeline — every step from intent to ledger" />
      {active.map(p => (
        <div key={p.id} className="card" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{p.title}</h3>
              <span style={{ color: 'var(--mu)', fontSize: 13 }}>Budget: {fmt(p.budget)} · {p.ex.length} expense{p.ex.length !== 1 ? 's' : ''}</span>
            </div>
            <Link to={`/pacts/${p.id}`} style={{ color: 'var(--ac)', fontSize: 13 }}>View Pact →</Link>
          </div>
          {p.ex.map(e => (
            <div key={e.id} style={{ marginBottom: 20, padding: '12px 16px', background: 'var(--s1)', borderRadius: 10, border: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontWeight: 500 }}>{e.name}</span>
                <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 13 }}>{fmt(e.amt)}</span>
                  <Badge st={e.st} />
                </span>
              </div>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
                {STEPS.map((step, i) => {
                  const st = stepStatus(e.st, i);
                  const Icon = st === 'done' ? CheckCircle : st === 'failed' ? XCircle : st === 'active' ? AlertTriangle : Clock;
                  const color = st === 'done' ? 'var(--ac)' : st === 'failed' ? 'var(--bd)' : st === 'active' ? 'var(--wa)' : 'var(--mu)';
                  return (
                    <span key={step.key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span title={step.label + ' — ' + st} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4px 8px', borderRadius: 8, background: st === 'active' ? 'rgba(244,185,66,0.1)' : 'transparent', minWidth: 64 }}>
                        <Icon size={16} color={color} />
                        <span style={{ fontSize: 10, color, marginTop: 2, textAlign: 'center', lineHeight: 1.2 }}>{step.label}</span>
                      </span>
                      {i < STEPS.length - 1 && <ArrowRight size={12} color="var(--mu)" />}
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
