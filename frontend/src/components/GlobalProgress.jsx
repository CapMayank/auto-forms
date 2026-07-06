import React, { useState, useEffect } from 'react';

const GlobalProgress = () => {
  const [progressData, setProgressData] = useState(null);

  useEffect(() => {
    // When running locally, backend is on port 8000
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//localhost:8000/api/ws/progress`;
    
    let ws = null;
    let timeoutId = null;

    const connect = () => {
      ws = new WebSocket(wsUrl);
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setProgressData(data);
          
          // Clear it after 5 seconds of 100% completion
          if (data.progress >= 100) {
            if (timeoutId) clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
              setProgressData(null);
            }, 5000);
          }
        } catch (e) {
          console.error("Error parsing progress data", e);
        }
      };

      ws.onclose = () => {
        // Reconnect after 3 seconds
        setTimeout(connect, 3000);
      };
    };

    connect();

    return () => {
      if (ws) ws.close();
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  if (!progressData) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      width: '350px',
      zIndex: 9999,
      background: 'var(--bg-card)',
      border: '1px solid var(--primary)',
      borderRadius: '12px',
      padding: '16px',
      boxShadow: '0 8px 32px rgba(99, 102, 241, 0.2)',
      animation: 'fadeIn 0.3s ease-out forwards'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '250px' }}>
          Batch: {progressData.filename}
        </span>
        <span style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 'bold' }}>
          {progressData.progress}%
        </span>
      </div>
      
      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
        {progressData.status} <br/>(Form {progressData.current_page} of {progressData.total_pages})
      </div>
      
      <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{ 
          width: `${progressData.progress}%`, 
          height: '100%', 
          background: 'linear-gradient(90deg, var(--primary), #c084fc)',
          transition: 'width 0.3s ease'
        }}></div>
      </div>
    </div>
  );
};

export default GlobalProgress;
