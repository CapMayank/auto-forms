import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Activity as ActivityIcon, History } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Activity() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivity();
  }, []);

  const fetchActivity = async () => {
    try {
      const res = await axios.get('http://localhost:8000/api/activity?limit=100');
      setEvents(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading activity...</div>;

  return (
    <div className="app-container" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div className="header" style={{ borderBottom: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <ActivityIcon size={32} color="var(--primary)" />
          <h1 className="text-gradient" style={{ margin: 0 }}>System Activity Log</h1>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '2rem' }}>
        {events.length === 0 ? (
          <div style={{ color: 'var(--text-muted)' }}>No activity found.</div>
        ) : (
          <div>
            {events.map((event, i) => (
              <div key={event.id} style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', position: 'relative' }}>
                {i !== events.length - 1 && <div style={{ position: 'absolute', left: '11px', top: '25px', bottom: '-15px', width: '2px', background: 'rgba(255,255,255,0.1)' }}></div>}
                
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--primary)', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '2px', boxShadow: '0 0 10px var(--accent-glow)' }}>
                  <History size={12} color="white" />
                </div>
                
                <div style={{ flex: 1, background: 'rgba(255,255,255,0.02)', padding: '1.2rem', borderRadius: '12px', border: '1px solid var(--border-light)', transition: 'background 0.2s' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <div style={{ fontWeight: 'bold' }}>{event.action}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      {new Date(event.timestamp).toLocaleString()}
                    </div>
                  </div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', display: 'flex', gap: '1rem' }}>
                    <span>By: <span style={{ color: 'var(--text-main)' }}>{event.user}</span></span>
                    <span>Form ID: <Link to={`/form/${event.form_id}`} style={{ color: 'var(--primary)', textDecoration: 'none' }}>#{event.form_id}</Link></span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
