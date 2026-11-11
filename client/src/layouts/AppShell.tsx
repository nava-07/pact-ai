import { NavLink, Outlet, Navigate, Link } from 'react-router-dom';
import { Home, Sparkles, FileText, List, MessageSquare, Activity, User, Users, Calculator, BarChart3, Bell } from 'lucide-react';
import { useStore } from '../store';
import { Skeleton } from '../components/ui';
const items = [
  ['/app', 'Dashboard', Home],
  ['/pacts', 'Pacts', FileText],
  ['/plan', 'Plan', Sparkles],
  ['/agent', 'Agent Center', Activity],
  ['/share', 'Smart Share', Users],
  ['/simulator', 'Simulator', Calculator],
  ['/analytics', 'Analytics', BarChart3],
  ['/notifications', 'Notifications', Bell],
  ['/ledger', 'Ledger', List],
  ['/copilot', 'Copilot', MessageSquare],
  ['/profile', 'Profile', User],
  ['/status', 'Status', Activity],
] as const;
export default function AppShell() {
  const { user, logout, profile, locked, ready } = useStore();
  if (!ready) return <div className="wrap" style={{ paddingTop: 80 }}><Skeleton n={3} /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!profile) return <Navigate to="/onboarding" replace />;
  if (locked) return <Navigate to="/unlock" replace />;
  const cls = ({ isActive }: { isActive: boolean }) => (isActive ? 'on' : '');
  return <>
    <div className="shell">
      <aside className="side" style={{ overflowY: 'auto' }}><Link className="logo" to="/"><i />Pact AI</Link>
        {items.map(([to, l, I]) => <NavLink key={to} to={to} className={cls}><I size={17} />{l}</NavLink>)}
        <div className="who">Signed in as {user}<br /><span className="mono" style={{ fontSize: 12 }}>owner · local demo mode</span><br /><button className="btn sm" style={{ marginTop: 8 }} onClick={logout}>Log out</button></div>
      </aside>
      <main className="main"><Outlet /></main>
    </div>
    <nav className="tabs" style={{ overflowX: 'auto' }}>{items.filter(i => i[1] !== 'Status').map(([to, l, I]) => <NavLink key={to} to={to} className={cls} style={{ minWidth: 64, flexShrink: 0 }}><I size={17} /><br />{l}</NavLink>)}</nav>
  </>;
}
