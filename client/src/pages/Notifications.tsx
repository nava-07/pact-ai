import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { Head, Skeleton, Empty } from '../components/ui';
import { useReady } from '../hooks/useReady';
import { Bell, Check, CheckCheck } from 'lucide-react';

interface Notif { _id: string; type: string; title: string; message?: string; read: boolean; link?: string; createdAt: string }

export default function Notifications() {
  const ok = useReady();
  const [items, setItems] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const r = await api<{ items: Notif[]; unread: number }>('/notifications?limit=50');
      setItems(r.items); setUnread(r.unread);
    } catch { /* empty */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const markRead = async (id: string) => {
    await api('/notifications/' + id + '/read', 'PATCH').catch(() => {});
    setItems(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
    setUnread(u => Math.max(0, u - 1));
  };

  const markAll = async () => {
    await api('/notifications/mark-all-read', 'POST').catch(() => {});
    setItems(prev => prev.map(n => ({ ...n, read: true })));
    setUnread(0);
  };

  const ago = (iso: string) => {
    const d = Date.now() - new Date(iso).getTime();
    if (d < 60_000) return 'just now';
    if (d < 3_600_000) return Math.floor(d / 60_000) + 'm ago';
    if (d < 86_400_000) return Math.floor(d / 3_600_000) + 'h ago';
    return Math.floor(d / 86_400_000) + 'd ago';
  };

  if (!ok || loading) return <div className="p-6"><Skeleton lines={6} /></div>;
  if (!items.length) return <Empty title="No Notifications" sub="You're all caught up!" to="/app" cta="Dashboard" />;

  return (
    <div className="p-6" style={{ maxWidth: 700 }}>
      <Head title="Notifications" sub={unread > 0 ? `${unread} unread` : 'All caught up'}>
        {unread > 0 && <button className="btn" onClick={markAll} style={{ fontSize: 12 }}><CheckCheck size={14} /> Mark all read</button>}
      </Head>
      <div className="card" style={{ padding: 0 }}>
        {items.map(n => (
          <div key={n._id} style={{ display: 'flex', gap: 12, padding: '14px 16px', borderBottom: '1px solid var(--line)', alignItems: 'flex-start', background: n.read ? 'transparent' : 'rgba(46,229,157,0.04)' }}>
            <Bell size={16} color={n.read ? 'var(--mu)' : 'var(--ac)'} style={{ marginTop: 2, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: n.read ? 400 : 600 }}>{n.title}</div>
              {n.message && <div style={{ fontSize: 13, color: 'var(--mu)', marginTop: 2 }}>{n.message}</div>}
              <div style={{ fontSize: 11, color: 'var(--mu)', marginTop: 4 }}>{ago(n.createdAt)}</div>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
              {n.link && <Link to={n.link} style={{ color: 'var(--cy)', fontSize: 12 }}>View</Link>}
              {!n.read && <button onClick={() => markRead(n._id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ac)', padding: 4 }} title="Mark read"><Check size={14} /></button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
