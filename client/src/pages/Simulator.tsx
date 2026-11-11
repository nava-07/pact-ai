import { useState } from 'react';
import { useStore } from '../store';
import { useReady } from '../hooks/useReady';
import { Head, Skeleton, Empty } from '../components/ui';
import { fmt, toMinor } from '../utils/money';
import { TrendingUp, TrendingDown, AlertTriangle, RefreshCw } from 'lucide-react';

interface Scenario { idx: number; name: string; original: number; modified: number }

export default function Simulator() {
  const s = useStore();
  const ok = useReady();
  const [pid, setPid] = useState('');
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [members, setMembers] = useState(0);

  const active = s.pacts.filter(p => !p.archived);
  const pact = active.find(p => p.id === pid);

  function initPact(id: string) {
    setPid(id);
    const p = active.find(x => x.id === id);
    if (p) {
      setScenarios(p.ex.filter(e => e.st !== 'CANCELLED' && e.st !== 'REJECTED').map((e, i) => ({ idx: i, name: e.name, original: e.amt, modified: e.amt })));
      setMembers(p.members.length);
    }
  }

  function updateAmount(idx: number, val: string) {
    const v = toMinor(val || '0');
    setScenarios(prev => prev.map(s => s.idx === idx ? { ...s, modified: v } : s));
  }

  function reset() {
    if (pact) setScenarios(pact.ex.filter(e => e.st !== 'CANCELLED' && e.st !== 'REJECTED').map((e, i) => ({ idx: i, name: e.name, original: e.amt, modified: e.amt })));
    setMembers(pact?.members.length ?? 0);
  }

  if (!ok) return <div className="p-6"><Skeleton lines={6} /></div>;
  if (!active.length) return <Empty title="No Pacts" sub="Create a pact to use the simulator" to="/plan" cta="Create Plan" />;

  const origTotal = scenarios.reduce((s, x) => s + x.original, 0);
  const modTotal = scenarios.reduce((s, x) => s + x.modified, 0);
  const budget = pact?.budget ?? 0;
  const origRemain = budget - origTotal;
  const modRemain = budget - modTotal;
  const diff = modTotal - origTotal;
  const perMember = members > 0 ? Math.round(modTotal / members) : 0;
  const overBudget = modTotal > budget;

  return (
    <div className="p-6" style={{ maxWidth: 900 }}>
      <Head title="What-If Simulator" sub="Model budget scenarios without changing your actual pacts" />
      <div className="card" style={{ marginBottom: 20 }}>
        <label style={{ fontSize: 13, color: 'var(--mu)', marginBottom: 8, display: 'block' }}>Select a pact to simulate</label>
        <select value={pid} onChange={e => initPact(e.target.value)} style={{ width: '100%', padding: '10px 12px', background: 'var(--s1)', border: '1px solid var(--line)', borderRadius: 8, color: 'var(--tx)', fontSize: 14 }}>
          <option value="">Choose a pact…</option>
          {active.map(p => <option key={p.id} value={p.id}>{p.title} ({fmt(p.budget)})</option>)}
        </select>
      </div>

      {pact && scenarios.length > 0 && <>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: 'var(--mu)' }}>Budget</div>
            <div style={{ fontSize: 20, fontFamily: 'var(--mono)', fontWeight: 600 }}>{fmt(budget)}</div>
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: 'var(--mu)' }}>Simulated Total</div>
            <div style={{ fontSize: 20, fontFamily: 'var(--mono)', fontWeight: 600, color: overBudget ? 'var(--bd)' : 'var(--ac)' }}>{fmt(modTotal)}</div>
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: 'var(--mu)' }}>Remaining</div>
            <div style={{ fontSize: 20, fontFamily: 'var(--mono)', fontWeight: 600, color: modRemain < 0 ? 'var(--bd)' : 'var(--ac)' }}>{fmt(modRemain)}</div>
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: 'var(--mu)' }}>Per Member ({members})</div>
            <div style={{ fontSize: 20, fontFamily: 'var(--mono)', fontWeight: 600 }}>{fmt(perMember)}</div>
          </div>
        </div>

        {overBudget && <div style={{ padding: '12px 16px', background: 'rgba(255,107,107,0.1)', border: '1px solid var(--bd)', borderRadius: 10, marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
          <AlertTriangle size={18} color="var(--bd)" />
          <span style={{ color: 'var(--bd)', fontSize: 14 }}>Simulated spending exceeds budget by {fmt(modTotal - budget)}</span>
        </div>}

        {diff !== 0 && <div style={{ padding: '12px 16px', background: diff > 0 ? 'rgba(244,185,66,0.1)' : 'rgba(46,229,157,0.1)', border: `1px solid ${diff > 0 ? 'var(--wa)' : 'var(--ac)'}`, borderRadius: 10, marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
          {diff > 0 ? <TrendingUp size={18} color="var(--wa)" /> : <TrendingDown size={18} color="var(--ac)" />}
          <span style={{ fontSize: 14 }}>Net change: {diff > 0 ? '+' : ''}{fmt(diff)} from original plan</span>
        </div>}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <label style={{ fontSize: 14, fontWeight: 500 }}>Adjust expenses</label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <label style={{ fontSize: 12, color: 'var(--mu)' }}>Members:</label>
            <input type="number" min={1} max={100} value={members} onChange={e => setMembers(Math.max(1, parseInt(e.target.value) || 1))} style={{ width: 60, padding: '4px 8px', background: 'var(--s1)', border: '1px solid var(--line)', borderRadius: 6, color: 'var(--tx)', fontSize: 13, fontFamily: 'var(--mono)' }} />
            <button onClick={reset} className="btn" style={{ fontSize: 12, padding: '4px 10px' }}><RefreshCw size={12} /> Reset</button>
          </div>
        </div>

        <div className="card">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--line)' }}>
                <th style={{ textAlign: 'left', padding: 8, fontSize: 12, color: 'var(--mu)' }}>Expense</th>
                <th style={{ textAlign: 'right', padding: 8, fontSize: 12, color: 'var(--mu)' }}>Original</th>
                <th style={{ textAlign: 'right', padding: 8, fontSize: 12, color: 'var(--mu)' }}>Simulated</th>
                <th style={{ textAlign: 'right', padding: 8, fontSize: 12, color: 'var(--mu)' }}>Difference</th>
              </tr>
            </thead>
            <tbody>
              {scenarios.map(sc => {
                const d = sc.modified - sc.original;
                return (
                  <tr key={sc.idx} style={{ borderBottom: '1px solid var(--line)' }}>
                    <td style={{ padding: 8, fontSize: 14 }}>{sc.name}</td>
                    <td style={{ padding: 8, textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--mu)' }}>{fmt(sc.original)}</td>
                    <td style={{ padding: 8, textAlign: 'right' }}>
                      <input type="number" step="0.01" min="0" defaultValue={(sc.modified / 100).toFixed(2)} onBlur={e => updateAmount(sc.idx, e.target.value)} style={{ width: 100, padding: '4px 8px', background: 'var(--s1)', border: '1px solid var(--line)', borderRadius: 6, color: 'var(--tx)', fontSize: 13, fontFamily: 'var(--mono)', textAlign: 'right' }} />
                    </td>
                    <td style={{ padding: 8, textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 13, color: d === 0 ? 'var(--mu)' : d > 0 ? 'var(--wa)' : 'var(--ac)' }}>
                      {d === 0 ? '—' : `${d > 0 ? '+' : ''}${fmt(d)}`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p style={{ marginTop: 16, fontSize: 12, color: 'var(--mu)', textAlign: 'center' }}>⚠ Simulation only — no changes are saved to your pact. Approve and save through the pact page.</p>
      </>
      }
    </div>
  );
}
