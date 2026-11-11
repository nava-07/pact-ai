import { useStore } from '../store';
import { useReady } from '../hooks/useReady';
import { Head, Skeleton, Empty } from '../components/ui';
import { fmt } from '../utils/money';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend } from 'recharts';
import { Download } from 'lucide-react';

const COLORS = ['#2ee59d', '#5cc8ff', '#f4b942', '#ff6b6b', '#a78bfa', '#ec4899', '#14b8a6', '#f97316'];

export default function Analytics() {
  const s = useStore();
  const ok = useReady();
  const active = s.pacts.filter(p => !p.archived);

  if (!ok) return <div className="p-6"><Skeleton lines={8} /></div>;
  if (!active.length) return <Empty title="No Data" sub="Create pacts to see analytics" to="/plan" cta="Create Plan" />;

  const totalBudget = active.reduce((sum, p) => sum + p.budget, 0);
  const totalPlanned = active.reduce((sum, p) => sum + p.ex.filter(e => !['CANCELLED', 'REJECTED'].includes(e.st)).reduce((a, e) => a + e.amt, 0), 0);
  const totalPaid = active.reduce((sum, p) => sum + p.ex.filter(e => e.st === 'COMPLETED').reduce((a, e) => a + e.amt, 0), 0);
  const totalPending = active.reduce((sum, p) => sum + p.ex.filter(e => e.st === 'PENDING_APPROVAL' || e.st === 'REAPPROVAL_REQUIRED' || e.st === 'APPROVED').reduce((a, e) => a + e.amt, 0), 0);
  const utilization = totalBudget > 0 ? Math.round((totalPlanned / totalBudget) * 100) : 0;

  // Category data from expense names
  const catMap = new Map<string, number>();
  active.forEach(p => p.ex.filter(e => !['CANCELLED', 'REJECTED'].includes(e.st)).forEach(e => {
    const cat = e.name.split(' ')[0] || 'Other';
    catMap.set(cat, (catMap.get(cat) ?? 0) + e.amt);
  }));
  const catData = [...catMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name, value: Math.round(value / 100) }));

  // Pact comparison data
  const pactData = active.map(p => {
    const planned = p.ex.filter(e => !['CANCELLED', 'REJECTED'].includes(e.st)).reduce((a, e) => a + e.amt, 0);
    return { name: p.title.length > 15 ? p.title.slice(0, 15) + '…' : p.title, budget: Math.round(p.budget / 100), planned: Math.round(planned / 100) };
  });

  // Status distribution
  const statusMap = new Map<string, number>();
  active.forEach(p => p.ex.forEach(e => statusMap.set(e.st, (statusMap.get(e.st) ?? 0) + 1)));
  const statusData = [...statusMap.entries()].map(([name, value]) => ({ name: name.replace(/_/g, ' '), value }));

  const exportCSV = () => {
    const rows = [['Pact', 'Expense', 'Amount', 'Status'].join(',')];
    active.forEach(p => p.ex.forEach(e => rows.push([`"${p.title}"`, `"${e.name}"`, (e.amt / 100).toFixed(2), e.st].join(','))));
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'pact-analytics.csv'; a.click();
  };

  return (
    <div className="p-6" style={{ maxWidth: 1000 }}>
      <Head title="Financial Analytics" sub="Insights across all your active pacts">
        <button className="btn" onClick={exportCSV} style={{ fontSize: 12 }}><Download size={14} /> Export CSV</button>
      </Head>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total Budget', val: fmt(totalBudget), color: 'var(--tx)' },
          { label: 'Planned', val: fmt(totalPlanned), color: 'var(--cy)' },
          { label: 'Paid', val: fmt(totalPaid), color: 'var(--ac)' },
          { label: 'Pending', val: fmt(totalPending), color: 'var(--wa)' },
          { label: 'Utilization', val: utilization + '%', color: utilization > 90 ? 'var(--bd)' : 'var(--ac)' },
        ].map(c => (
          <div key={c.label} className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: 'var(--mu)' }}>{c.label}</div>
            <div style={{ fontSize: 22, fontFamily: 'var(--mono)', fontWeight: 600, color: c.color }}>{c.val}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div className="card">
          <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 500 }}>Spending by Category</h4>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={catData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }: any) => `${name} $${value}`}>
                {catData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v: any) => `$${v}`} contentStyle={{ background: 'var(--s2)', border: '1px solid var(--line)', borderRadius: 8, color: 'var(--tx)' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 500 }}>Budget vs Planned by Pact</h4>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={pactData}>
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--mu)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--mu)' }} />
              <Tooltip contentStyle={{ background: 'var(--s2)', border: '1px solid var(--line)', borderRadius: 8, color: 'var(--tx)' }} />
              <Bar dataKey="budget" fill="#5cc8ff" radius={[4, 4, 0, 0]} name="Budget" />
              <Bar dataKey="planned" fill="#2ee59d" radius={[4, 4, 0, 0]} name="Planned" />
              <Legend />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 500 }}>Status Distribution</h4>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={statusData} layout="vertical">
            <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--mu)' }} />
            <YAxis dataKey="name" type="category" width={130} tick={{ fontSize: 11, fill: 'var(--mu)' }} />
            <Tooltip contentStyle={{ background: 'var(--s2)', border: '1px solid var(--line)', borderRadius: 8, color: 'var(--tx)' }} />
            <Bar dataKey="value" fill="#2ee59d" radius={[0, 4, 4, 0]} name="Count" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
