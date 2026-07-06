import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, FileText, MonitorDot, PieChart, Activity, Settings, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const navStyle = ({ isActive }) => {
    return {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '12px 20px',
      margin: '4px 12px',
      borderRadius: '8px',
      color: isActive ? 'white' : 'var(--text-muted)',
      background: isActive ? 'linear-gradient(90deg, var(--primary) 0%, rgba(99,102,241,0.5) 100%)' : 'transparent',
      textDecoration: 'none',
      transition: 'all 0.3s ease',
      fontWeight: isActive ? '600' : '500',
      boxShadow: isActive ? '0 4px 12px rgba(99,102,241,0.3)' : 'none',
    };
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <div className="sidebar">
      <div style={{ padding: '2rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FileText size={24} color="var(--primary)" />
          <span className="sidebar-text">BFMS</span>
        </h1>
        <p className="sidebar-subtitle" style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '5px' }}>Board Form Management</p>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', padding: '1.5rem 0', gap: '5px', overflowY: 'auto' }}>
        <NavLink to="/" style={navStyle}>
          <LayoutDashboard size={20} />
          <span className="sidebar-text">Dashboard</span>
        </NavLink>
        <NavLink to="/students" style={navStyle}>
          <Users size={20} />
          <span className="sidebar-text">Student List</span>
        </NavLink>

        
        <NavLink to="/activity" style={navStyle}>
          <Activity size={20} />
          <span className="sidebar-text">Activity Log</span>
        </NavLink>

        {user.role === 'Admin' && (
          <>
            <div className="admin-tools-title" style={{ margin: '1rem 0 0.5rem 20px', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 'bold' }}>Admin Tools</div>
            <NavLink to="/reports" style={navStyle}>
              <PieChart size={20} />
              <span className="sidebar-text">Reports</span>
            </NavLink>
            <NavLink to="/settings" style={navStyle}>
              <Settings size={20} />
              <span className="sidebar-text">Settings</span>
            </NavLink>
          </>
        )}
      </nav>
      
      <div style={{ marginTop: 'auto', padding: '1.5rem', borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '35px', height: '35px', minWidth: '35px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>
              {user.username.substring(0, 2).toUpperCase()}
            </div>
            <div className="user-info">
              <div style={{ fontSize: '0.9rem', fontWeight: 'bold', textTransform: 'capitalize' }}>{user.username}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user.role}</div>
            </div>
          </div>
          <button onClick={handleLogout} className="btn-icon" title="Logout" style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>
            <LogOut size={18} color="var(--danger)" />
          </button>
        </div>
      </div>
    </div>
  );
}
