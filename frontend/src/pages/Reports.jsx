import React, { useState } from 'react';
import axios from 'axios';
import { Download, FileSpreadsheet, PieChart as PieChartIcon } from 'lucide-react';

export default function Reports() {
  const [reportType, setReportType] = useState('status');
  const [reportClass, setReportClass] = useState('');
  const [loading, setLoading] = useState(false);

  const downloadCSV = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (reportClass) params.append('form_class', reportClass);
      
      const res = await axios.get(`http://localhost:8000/api/forms?${params.toString()}`);
      const forms = res.data;
      
      if (forms.length === 0) {
        alert("No data found for these filters.");
        setLoading(false);
        return;
      }

      // Prepare CSV data
      const headers = ['ID', 'Student Name', 'Father Name', 'Class', 'Village', 'Mobile', 'Status', 'Verification Status', 'Submission Status', 'Created At'];
      const rows = forms.map(f => [
        f.id,
        `"${f.student_name || ''}"`,
        `"${f.father_name || ''}"`,
        f.form_class,
        `"${f.village || ''}"`,
        f.mobile || '',
        f.status,
        f.verification_status,
        f.submission_status,
        new Date(f.created_at).toLocaleDateString()
      ]);

      const csvContent = "data:text/csv;charset=utf-8," 
        + headers.join(",") + "\n" 
        + rows.map(e => e.join(",")).join("\n");

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `BFMS_Report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link); // Required for FF
      
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error(err);
      alert("Failed to generate report.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div className="header" style={{ borderBottom: 'none' }}>
        <h1 className="text-gradient">Generate Reports</h1>
      </div>
      
      <div className="glass-panel" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
          
          <div style={{ flex: 1, minWidth: '300px' }}>
            <label style={{ display: 'block', marginBottom: '10px', color: 'var(--text-muted)' }}>Report Type</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.02)', padding: '1.2rem', borderRadius: '12px', cursor: 'pointer', border: reportType === 'status' ? '1px solid var(--primary)' : '1px solid var(--border-light)', transition: 'all 0.2s' }}>
                <input type="radio" name="reportType" checked={reportType === 'status'} onChange={() => setReportType('status')} />
                <PieChartIcon size={20} color="var(--primary)" />
                <span style={{ fontWeight: reportType === 'status' ? 'bold' : 'normal' }}>Status Overview</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.02)', padding: '1.2rem', borderRadius: '12px', cursor: 'pointer', border: reportType === 'missing' ? '1px solid var(--warning)' : '1px solid var(--border-light)', transition: 'all 0.2s' }}>
                <input type="radio" name="reportType" checked={reportType === 'missing'} onChange={() => setReportType('missing')} />
                <FileSpreadsheet size={20} color="var(--warning)" />
                <span style={{ fontWeight: reportType === 'missing' ? 'bold' : 'normal' }}>Missing Documents / Issues</span>
              </label>
            </div>
          </div>

          <div style={{ flex: 1, minWidth: '300px' }}>
            <label style={{ display: 'block', marginBottom: '10px', color: 'var(--text-muted)' }}>Filter by Class</label>
            <select 
              value={reportClass} 
              onChange={e => setReportClass(e.target.value)}
              style={{ width: '100%', background: 'rgba(0,0,0,0.2)', color: 'white', border: '1px solid var(--border)', padding: '1rem', borderRadius: '8px', outline: 'none' }}
            >
              <option value="">All Classes</option>
              <option value="9th">Class 9th</option>
              <option value="10th">Class 10th</option>
              <option value="11th">Class 11th</option>
              <option value="12th">Class 12th</option>
            </select>
            
            <button 
              className="btn btn-primary" 
              style={{ width: '100%', padding: '1rem', marginTop: '2rem', fontSize: '1.1rem', display: 'flex', justifyContent: 'center', gap: '10px', boxShadow: '0 4px 14px 0 rgba(99, 102, 241, 0.4)' }}
              onClick={downloadCSV}
              disabled={loading}
            >
              <Download size={20} />
              {loading ? 'Generating...' : 'Download CSV Report'}
            </button>
          </div>
          
        </div>
      </div>
    </div>
  );
}
