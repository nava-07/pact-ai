import { useState } from 'react';
import { useStore } from '../store';
import { useReady } from '../hooks/useReady';
import { Head, Skeleton, Empty, Badge } from '../components/ui';
import { fmt } from '../utils/money';
import { Users, DollarSign, CheckCircle, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function SmartShare() {
  const s = useStore();
  const ok = useReady();
  const [pid, setPid] = useState('');
  const active = s.pacts.filter(p => !p.archived && p.members.length > 1);
  const pact = active.find(p => p.id === pid);

  if (!ok) return <div className="p-6"><Skeleton lines={6} /></div>;
  if (!active.length) return <Empty title="No Group Pacts" sub="Create a pact with multiple members to use Smart Share" to="/pacts" cta="View Pacts" />;

  const liveEx = pact?.ex.filter(e => !['CANCELLED', 'REJECTED'].includes(e.st)) ?? [];
  const totalPlanned = liveEx.reduce((sum, e) => sum + e.amt, 0);
  const totalPaid = liveEx.filter(e => e.st === 'COMPLETED').reduce((sum, e) => sum + e.amt, 0);
  const memberCount = pact?.members.length ?? 0;
  const equalShare = memberCount > 0 ? Math.round(totalPlanned / memberCount) : 0;
  const remainder = memberCount > 0 ? totalPlanned - (equalShare * memberCount) : 0;

  return (
    <div className="p-6" style={{ maxWidth: 800 }}>
      <Head title="Smart Share" sub="Group expense coordination and contribution tracking" />
      <div className="card" style={{ marginBottom: 20 }}>
        <label style={{ fontSize: 13, color: 'var(--mu)', marginBottom: 8, display: 'block' }}>Select a group pact</label>
        <select value={pid} onChange={e => setPid(e.target.value)} style={{ width: '100%', padding: '10px 12px', background: 'var(--s1)', border: '1px solid var(--line)', borderRadius: 8, color: 'var(--tx)', fontSize: 14 }}>
          <option value="">Choose a pact…</option>
          {active.map(p => <option key={p.id} value={p.id}>{p.title} — {p.members.length} members</option>)}
        </select>
      </div>

      {pact && <>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
          <div className="card" style={{ textAlign: 'center' }}>
            <Users size={20} color="var(--cy)" style={{ margin: '0 auto 4px' }} />
            <div style={{ fontSize: 12, color: 'var(--mu)' }}>Members</div>
            <div style={{ fontSize: 22, fontFamily: 'var(--mono)', fontWeight: 600 }}>{memberCount}</div>
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <DollarSign size={20} color="var(--ac)" style={{ margin: '0 auto 4px' }} />
            <div style={{ fontSize: 12, color: 'var(--mu)' }}>Total Planned</div>
            <div style={{ fontSize: 22, fontFamily: 'var(--mono)', fontWeight: 600 }}>{fmt(totalPlanned)}</div>
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <CheckCircle size={20} color="var(--ac)" style={{ margin: '0 auto 4px' }} />
            <div style={{ fontSize: 12, color: 'var(--mu)' }}>Total Paid</div>
            <div style={{ fontSize: 22, fontFamily: 'var(--mono)', fontWeight: 600 }}>{fmt(totalPaid)}</div>
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <Clock size={20} color="var(--wa)" style={{ margin: '0 auto 4px' }} />
            <div style={{ fontSize: 12, color: 'var(--mu)' }}>Equal Share</div>
            <div style={{ fontSize: 22, fontFamily: 'var(--mono)', fontWeight: 600 }}>{fmt(equalShare)}</div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 500 }}>Member Contributions</h4>
          <div style={{ overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--line)' }}>
                  <th style={{ textAlign: 'left', padding: 8, fontSize: 12, color: 'var(--mu)' }}>Member</th>
                  <th style={{ textAlign: 'left', padding: 8, fontSize: 12, color: 'var(--mu)' }}>Role</th>
                  <th style={{ textAlign: 'right', padding: 8, fontSize: 12, color: 'var(--mu)' }}>Equal Share</th>
                  <th style={{ textAlign: 'right', padding: 8, fontSize: 12, color: 'var(--mu)' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {pact.members.map((m, i) => (
                  <tr key={m.uid} style={{ borderBottom: '1px solid var(--line)' }}>
                    <td style={{ padding: 8, fontSize: 14 }}>
                      {m.name} {m.self && <span style={{ color: 'var(--ac)', fontSize: 11 }}>(you)</span>}
                    </td>
                    <td style={{ padding: 8 }}><span className={`badge b-${m.role === 'OWNER' ? 'COMPLETED' : m.role === 'APPROVER' ? 'APPROVED' : 'DRAFT'}`} style={{ fontSize: 11 }}>{m.role}</span></td>
                    <td style={{ padding: 8, textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 13 }}>
                      {fmt(equalShare + (i < Math.abs(remainder) ? (remainder > 0 ? 1 : -1) : 0))}
                    </td>
                    <td style={{ padding: 8, textAlign: 'right' }}>
                      <span style={{ fontSize: 12, color: 'var(--wa)' }}>
                        <Clock size={12} style={{ display: 'inline', verticalAlign: -2 }} /> Outstanding
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {remainder !== 0 && <p style={{ marginTop: 8, fontSize: 11, color: 'var(--mu)' }}>Note: {Math.abs(remainder)} cent{Math.abs(remainder) !== 1 ? 's' : ''} distributed to first member{Math.abs(remainder) !== 1 ? 's' : ''} for exact split.</p>}
        </div>

        <div className="card">
          <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 500 }}>Expenses</h4>
          {liveEx.map(e => (
            <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
              <span style={{ fontSize: 14 }}>{e.name}</span>
              <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 13 }}>{fmt(e.amt)}</span>
                <Badge st={e.st} />
              </span>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Link to={`/pacts/${pact.id}`} className="btn" style={{ display: 'inline-flex' }}>Open Pact Details</Link>
        </div>
      </>
      }
    </div>
  );
}
