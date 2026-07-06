import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Save, Settings as SettingsIcon } from 'lucide-react';

export default function Settings() {
  const [settings, setSettings] = useState({
    watch_directory: '',
    processed_directory: '',
    ocr_api_key: '',
    confidence_threshold: 80
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await axios.get('http://localhost:8000/api/settings');
      setSettings(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      await axios.put('http://localhost:8000/api/settings', settings);
      setMessage('Settings saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error(err);
      setMessage('Failed to save settings.');
    }
  };

  if (loading) return <div>Loading settings...</div>;

  return (
    <div className="app-container" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="header" style={{ borderBottom: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <SettingsIcon size={32} color="var(--primary)" />
          <h1 className="text-gradient" style={{ margin: 0 }}>System Settings</h1>
        </div>
      </div>

      {message && (
        <div style={{ background: message.includes('Failed') ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', color: message.includes('Failed') ? 'var(--danger)' : 'var(--success)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', border: message.includes('Failed') ? '1px solid var(--danger)' : '1px solid var(--success)' }}>
          {message}
        </div>
      )}

      <div className="glass-panel" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="form-group">
            <label>Scanner Watch Folder Directory</label>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '5px' }}>The absolute path on the Ubuntu server where the scanner drops PDFs.</p>
            <input 
              type="text" 
              value={settings.watch_directory}
              onChange={e => setSettings({...settings, watch_directory: e.target.value})}
            />
          </div>

          <div className="form-group">
            <label>Processed Data Directory</label>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '5px' }}>Where processed images and crops are saved.</p>
            <input 
              type="text" 
              value={settings.processed_directory}
              onChange={e => setSettings({...settings, processed_directory: e.target.value})}
            />
          </div>

          <div className="form-group">
            <label>OCR API Key</label>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '5px' }}>Key for Google Cloud Vision API.</p>
            <input 
              type="password" 
              value={settings.ocr_api_key}
              onChange={e => setSettings({...settings, ocr_api_key: e.target.value})}
            />
          </div>

          <div className="form-group">
            <label>Confidence Threshold (%)</label>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '5px' }}>Fields below this threshold will be flagged for review.</p>
            <input 
              type="number" 
              min="1"
              max="100"
              value={settings.confidence_threshold}
              onChange={e => setSettings({...settings, confidence_threshold: parseInt(e.target.value)})}
            />
          </div>

          <button className="btn btn-primary" onClick={saveSettings} style={{ alignSelf: 'flex-start', padding: '1rem 2rem', marginTop: '1rem' }}>
            <Save size={18} /> Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
}
