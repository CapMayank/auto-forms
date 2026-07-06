import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Search, Filter, MoreVertical, FileEdit, Trash2, CheckSquare, Download, Trash } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function StudentList() {
  const [forms, setForms] = useState([]);
  const [filterClass, setFilterClass] = useState('10th');
  const [portalStatus, setPortalStatus] = useState('Not Filled');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [exporting, setExporting] = useState(false);
  const { user } = useAuth();
  
  const navigate = useNavigate();

  useEffect(() => {
    fetchForms();
  }, [filterClass, portalStatus, searchTerm]);

  const fetchForms = async () => {
    try {
      const params = new URLSearchParams();
      if (filterClass) params.append('form_class', filterClass);
      if (portalStatus) params.append('portal_status', portalStatus);
      if (searchTerm) params.append('search', searchTerm);
      
      const res = await axios.get(`http://localhost:8000/api/forms?${params.toString()}`);
      setForms(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(new Set(forms.map(f => f.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkAction = async (action) => {
    if (selectedIds.size === 0) return;
    
    if (action === 'Export Assets') {
      setExporting(true);
      try {
        const res = await axios.post('http://localhost:8000/api/forms/export-assets', 
          { form_ids: Array.from(selectedIds) }, 
          { responseType: 'blob' }
        );
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'assets_export.zip');
        document.body.appendChild(link);
        link.click();
        link.parentNode.removeChild(link);
      } catch (err) {
        console.error(err);
        alert('Failed to export assets.');
      } finally {
        setExporting(false);
      }
      return;
    }

    try {
      await axios.post('http://localhost:8000/api/forms/bulk', {
        form_ids: Array.from(selectedIds),
        action: action
      });
      setSelectedIds(new Set());
      fetchForms();
    } catch (err) {
      console.error(err);
    }
  };

  const handleEmptyTrash = async () => {
    if (!window.confirm("Are you sure you want to permanently delete all forms in the Trash? This cannot be undone.")) return;
    try {
      await axios.delete('http://localhost:8000/api/forms/trash/empty');
      fetchForms();
    } catch (err) {
      console.error(err);
      alert("Failed to empty trash.");
    }
  };

  return (
    <div className="app-container">
      <div className="header">
        <h1 className="text-gradient">Student List</h1>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {selectedIds.size > 0 && (
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', background: 'rgba(99, 102, 241, 0.1)', padding: '0.5rem 1rem', borderRadius: '12px', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
              <span style={{ fontWeight: '600', color: 'var(--primary)' }}>{selectedIds.size} Selected</span>
              <button className="btn btn-outline" onClick={() => handleBulkAction('Export Assets')} disabled={exporting}>
                <Download size={16} /> {exporting ? 'Exporting...' : 'Export Assets'}
              </button>
              <button className="btn" onClick={() => handleBulkAction('Delete')} style={{ background: 'var(--danger)' }}>
                <Trash2 size={16} /> Delete Forever
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '1rem', marginBottom: '2rem' }}>
        
        {/* Class Tabs */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
          {['9th', '10th', '11th', '12th'].map(cls => (
            <button 
              key={cls}
              onClick={() => setFilterClass(cls)}
              style={{
                padding: '0.5rem 1.5rem',
                borderRadius: '8px',
                background: filterClass === cls ? 'var(--primary)' : 'rgba(0,0,0,0.2)',
                color: filterClass === cls ? 'white' : 'var(--text-muted)',
                border: '1px solid',
                borderColor: filterClass === cls ? 'var(--primary)' : 'var(--border)',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              Class {cls}
            </button>
          ))}
        </div>

        {/* Portal Status Tabs & Search */}
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            {['Not Filled', 'Filled', 'Issue'].map(status => (
              <button 
                key={status}
                onClick={() => setPortalStatus(status)}
                style={{
                  padding: '0.4rem 1rem',
                  borderRadius: '20px',
                  background: portalStatus === status ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                  color: portalStatus === status ? 'var(--primary)' : 'var(--text-muted)',
                  border: '1px solid',
                  borderColor: portalStatus === status ? 'var(--primary)' : 'transparent',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: '500'
                }}
              >
                {status}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', minWidth: '300px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', borderRadius: '12px', padding: '0.5rem 1rem' }}>
            <Search size={20} color="var(--text-muted)" style={{ marginRight: '10px' }} />
            <input 
              type="text" 
              placeholder="Search by Name, Father, Village, Mobile..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: 'white', width: '100%', outline: 'none', padding: '0' }}
            />
          </div>
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th style={{ width: '40px', textAlign: 'center' }}>
                <input type="checkbox" onChange={handleSelectAll} checked={forms.length > 0 && selectedIds.size === forms.length} />
              </th>
              <th>Name</th>
              <th>Father's Name</th>
              <th>Class</th>
              <th>Village</th>
              <th>Status</th>
              <th>Portal Status</th>
              <th>App. No.</th>
              <th>Last Updated</th>
              <th style={{ textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {forms.map(form => (
              <tr key={form.id} className={selectedIds.has(form.id) ? 'selected-row' : ''}>
                <td style={{ textAlign: 'center' }}>
                  <input type="checkbox" checked={selectedIds.has(form.id)} onChange={() => handleSelectOne(form.id)} />
                </td>
                <td style={{ fontWeight: '500' }}>{form.student_name || 'N/A'}</td>
                <td>{form.father_name || 'N/A'}</td>
                <td><span className="badge" style={{background: 'rgba(59, 130, 246, 0.1)', color: '#93c5fd'}}>{form.form_class}</span></td>
                <td>{form.village || 'N/A'}</td>
                <td>
                  <span className={`badge ${form.status.toLowerCase().replace(/\s+/g, '-')}`}>
                    {form.status}
                  </span>
                </td>
                <td>
                  <span className={`badge`} style={{
                    background: form.portal_status === 'Filled' ? 'rgba(34, 197, 94, 0.1)' : form.portal_status === 'Issue' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(107, 114, 128, 0.1)',
                    color: form.portal_status === 'Filled' ? '#4ade80' : form.portal_status === 'Issue' ? '#f87171' : '#9ca3af'
                  }}>
                    {form.portal_status}
                  </span>
                </td>
                <td style={{ fontSize: '0.9rem', fontFamily: 'monospace' }}>{form.application_number || '-'}</td>
                <td style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  {new Date(form.updated_at).toLocaleDateString()}
                </td>
                <td style={{ textAlign: 'center' }}>
                  <button className="btn btn-outline" onClick={() => navigate(`/form/${form.id}`)} style={{ padding: '0.4rem', borderRadius: '6px' }}>
                    <FileEdit size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {forms.length === 0 && (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  No students found matching your criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
