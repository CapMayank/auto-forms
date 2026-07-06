import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { FileText, Lock } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    const result = await login(username, password);
    if (result.success) {
      navigate('/');
    } else {
      setError(result.message);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-main)' }}>
      <div className="glass-panel" style={{ padding: '3rem', width: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '2rem' }}>
          <FileText size={32} color="var(--primary)" />
          <h1 className="text-gradient" style={{ fontSize: '2.5rem', fontWeight: 'bold', margin: 0 }}>BFMS</h1>
        </div>
        
        <h2 style={{ marginBottom: '1.5rem', fontWeight: '500', color: 'var(--text-muted)' }}>Sign in to your account</h2>
        
        {error && <div style={{ color: 'var(--danger)', marginBottom: '1rem', background: 'rgba(239, 68, 68, 0.1)', padding: '0.5rem 1rem', borderRadius: '8px', width: '100%', textAlign: 'center' }}>{error}</div>}

        <form onSubmit={handleLogin} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="form-group">
            <label>Username</label>
            <input 
              type="text" 
              value={username} 
              onChange={e => setUsername(e.target.value)} 
              required 
            />
          </div>
          
          <div className="form-group">
            <label>Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
            />
          </div>
          
          <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '1rem', fontSize: '1.1rem', marginTop: '1rem', boxShadow: '0 4px 14px 0 rgba(99, 102, 241, 0.5)' }}>
            <Lock size={18} /> Sign In
          </button>
        </form>
        
        <div style={{ marginTop: '2rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Tip: Admin (admin/admin), Staff (staff/staff)
        </div>
      </div>
    </div>
  );
}
