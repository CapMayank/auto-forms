import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { LayoutDashboard, CheckCircle2, Clock, PlayCircle, Send, XCircle } from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await axios.get('http://localhost:8000/api/dashboard/stats');
      setStats(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  if (!stats) return <div style={{ padding: '2rem' }}>Loading Dashboard...</div>;

  const cards = [
    { label: 'Total', value: stats.overview.Total, icon: <LayoutDashboard />, color: '#3b82f6' },
    { label: 'Completed', value: stats.overview.Completed, icon: <CheckCircle2 />, color: '#10b981' },
    { label: 'Pending Verification', value: stats.overview['Pending Verification'], icon: <Clock />, color: '#f59e0b' },
    { label: 'Ready for Entry', value: stats.overview['Ready for Entry'], icon: <PlayCircle />, color: '#8b5cf6' },
    { label: 'Submitted', value: stats.overview.Submitted, icon: <Send />, color: '#06b6d4' },
    { label: 'Rejected', value: stats.overview.Rejected, icon: <XCircle />, color: '#ef4444' },
  ];

  return (
    <div className="app-container" style={{ maxWidth: '1400px', margin: '0 auto' }}>
      <div className="header">
        <h1 className="text-gradient">Dashboard Overview</h1>
        <p style={{ color: 'var(--text-muted)', fontWeight: '500' }}>Academic Year 2026-2027</p>
      </div>
      
      {stats.pending_rescan > 0 && (
        <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid var(--warning)', padding: '1rem 1.5rem', borderRadius: '8px', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ background: 'var(--warning)', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000' }}>
            <span style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>{stats.pending_rescan}</span>
          </div>
          <div>
            <div style={{ fontWeight: 'bold', color: '#fcd34d' }}>Forms Pending Rescan</div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>There are forms flagged for rescan. Please upload the replacement documents.</div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '3.5rem' }}>
        {cards.map((c, i) => (
          <div key={i} className="glass-panel" style={{ 
            padding: '1.5rem', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '1.5rem', 
            background: `linear-gradient(145deg, var(--bg-card) 60%, ${c.color}22)`,
            borderTop: `1px solid ${c.color}44`,
            cursor: 'default'
          }}>
            <div style={{ 
              background: `linear-gradient(135deg, ${c.color}44, ${c.color}11)`, 
              color: c.color, 
              padding: '1.2rem', 
              borderRadius: '16px',
              boxShadow: `0 8px 24px ${c.color}33`
            }}>
              {c.icon}
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '500', marginBottom: '0.3rem' }}>{c.label}</div>
              <div style={{ fontSize: '2.5rem', fontWeight: '700', lineHeight: 1 }}>{c.value}</div>
            </div>
          </div>
        ))}
      </div>

      <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem', fontWeight: 'bold' }}>Class Progress</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
        {Object.entries(stats.class_stats).map(([cls, data]) => (
          <div key={cls} className="glass-panel" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Class {cls}</div>
              <div style={{ color: 'var(--text-muted)' }}>{data.completed} / {data.total} Forms</div>
            </div>
            
            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '10px', height: '12px', overflow: 'hidden', marginBottom: '0.5rem' }}>
              <div style={{ 
                background: 'linear-gradient(90deg, var(--primary), #8b5cf6)', 
                height: '100%', 
                width: `${data.percent}%`,
                transition: 'width 1s ease-in-out'
              }}></div>
            </div>
            <div style={{ textAlign: 'right', fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--primary)' }}>
              {data.percent}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
