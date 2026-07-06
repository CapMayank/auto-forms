import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Copy, Save, CheckCircle, ArrowLeft, Download, AlertTriangle, Upload, RefreshCcw, Trash2, Crop } from 'lucide-react';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

const SelectableImage = ({ src, words }) => {
  const [imgSize, setImgSize] = useState({ width: 0, height: 0 });
  const [toast, setToast] = useState('');
  const [toastPos, setToastPos] = useState({ x: 0, y: 0 });

  const handleWordClick = (text, e) => {
    const selection = window.getSelection().toString();
    if (!selection) {
      navigator.clipboard.writeText(text);
      setToast(`Copied: ${text}`);
      setToastPos({ x: e.clientX, y: e.clientY });
      setTimeout(() => setToast(''), 1500);
    }
  };

  const groupWordsIntoLines = (wordsList) => {
    if (!wordsList || !wordsList.length) return [];
    
    const words = wordsList
      .filter(w => w.bbox && w.bbox.length >= 4)
      .map(w => ({
        text: w.text,
        minX: Math.min(...w.bbox.map(v => v.x)),
        maxX: Math.max(...w.bbox.map(v => v.x)),
        minY: Math.min(...w.bbox.map(v => v.y)),
        maxY: Math.max(...w.bbox.map(v => v.y)),
      }));

    words.sort((a, b) => {
      if (Math.abs(a.minY - b.minY) > 20) {
        return a.minY - b.minY;
      }
      return a.minX - b.minX;
    });

    const lines = [];
    let currentLine = null;

    words.forEach(word => {
      if (!currentLine) {
        currentLine = { ...word };
        lines.push(currentLine);
      } else {
        const yDiff = Math.abs(currentLine.minY - word.minY);
        const xGap = word.minX - currentLine.maxX;
        
        if (yDiff < 20 && xGap > -20 && xGap < 100) { 
          currentLine.text += ' ' + word.text;
          currentLine.maxX = Math.max(currentLine.maxX, word.maxX);
          currentLine.minY = Math.min(currentLine.minY, word.minY);
          currentLine.maxY = Math.max(currentLine.maxY, word.maxY);
        } else {
          currentLine = { ...word };
          lines.push(currentLine);
        }
      }
    });

    return lines;
  };

  const groupedWords = imgSize.width > 0 ? groupWordsIntoLines(words) : [];

  return (
    <div style={{ position: 'relative', width: '100%', marginBottom: '1rem', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
      
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          left: toastPos.x + 15,
          top: toastPos.y - 30,
          background: 'var(--success)',
          color: 'white',
          padding: '4px 10px',
          borderRadius: '4px',
          fontSize: '0.8rem',
          fontWeight: 'bold',
          pointerEvents: 'none',
          zIndex: 1000,
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          {toast}
        </div>
      )}

      <img 
        src={src} 
        alt="Form Page"
        style={{ width: '100%', display: 'block' }} 
        onLoad={(e) => setImgSize({ width: e.target.naturalWidth, height: e.target.naturalHeight })} 
      />
      {groupedWords.map((line, i) => {
        const left = (line.minX / imgSize.width) * 100;
        const top = (line.minY / imgSize.height) * 100;
        const width = ((line.maxX - line.minX) / imgSize.width) * 100;
        const height = ((line.maxY - line.minY) / imgSize.height) * 100;

        return (
          <span
            key={i}
            title="Click to copy, or drag to select"
            className="selectable-word"
            onClick={(e) => handleWordClick(line.text, e)}
            style={{
              position: 'absolute',
              left: `${left}%`,
              top: `${top}%`,
              width: `${width}%`,
              height: `${height}%`,
            }}
          >
            {line.text}{' '}
          </span>
        );
      })}
    </div>
  );
};

export default function Editor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  
  // Crop state
  const [isCropping, setIsCropping] = useState(false);
  const [crop, setCrop] = useState({ unit: '%', width: 30, height: 20, x: 70, y: 10 });
  const [completedCrop, setCompletedCrop] = useState(null);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const imgRef = useRef(null);

  const getImageUrl = (absolutePath) => {
    if (!absolutePath) return '';
    const normalizedPath = absolutePath.replace(/\\/g, '/');
    const dataIndex = normalizedPath.indexOf('/data/');
    if (dataIndex !== -1) {
      return `http://localhost:8000${normalizedPath.substring(dataIndex)}`;
    }
    // Fallback if path doesn't contain /data/
    return `http://localhost:8000/data/processed/${normalizedPath.split('/').pop()}`;
  };

  useEffect(() => {
    fetchForm();
  }, [id]);

  const fetchForm = async () => {
    try {
      const res = await axios.get(`http://localhost:8000/api/forms/${id}`);
      setForm(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const saveChanges = async () => {
    try {
      const payload = {
        student_name: form.student_name,
        father_name: form.father_name,
        mother_name: form.mother_name,
        dob: form.dob,
        portal_status: form.portal_status,
        application_number: form.application_number,
        portal_issue_description: form.portal_issue_description
      };
      
      const res = await axios.put(`http://localhost:8000/api/forms/${id}`, payload);
      setForm(res.data);
      alert("Metadata saved successfully.");
    } catch (err) {
      console.error(err);
    }
  };

  const handleCompleteAndNext = async () => {
    try {
      // 1. Save and complete current form
      const payload = {
        student_name: form.student_name,
        father_name: form.father_name,
        mother_name: form.mother_name,
        dob: form.dob,
        status: 'Completed',
        portal_status: form.portal_status,
        application_number: form.application_number,
        portal_issue_description: form.portal_issue_description
      };
      
      await axios.put(`http://localhost:8000/api/forms/${id}`, payload);
      
      // 2. Fetch next form
      const res = await axios.get(`http://localhost:8000/api/forms?form_class=${form.form_class}&portal_status=Not Filled`);
      const formsList = res.data;
      
      const nextForm = formsList.find(f => f.id !== parseInt(id));
      
      setShowCompleteModal(false);
      
      if (nextForm) {
        navigate(`/form/${nextForm.id}`);
      } else {
        alert("All forms for this class are processed!");
        navigate('/students');
      }
    } catch (err) {
      console.error(err);
      alert("Error completing form");
    }
  };

  const handleDownloadImage = async (url, filename) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (e) {
      console.error("Download failed", e);
    }
  };

  const applyCrop = async () => {
    if (!completedCrop || !imgRef.current) return;

    const canvas = document.createElement('canvas');
    const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
    const scaleY = imgRef.current.naturalHeight / imgRef.current.height;
    
    canvas.width = completedCrop.width * scaleX;
    canvas.height = completedCrop.height * scaleY;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(
      imgRef.current,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      canvas.width,
      canvas.height
    );

    // Convert canvas to blob and upload (use 0.65 quality to keep under 50kb)
    canvas.toBlob(async (blob) => {
      const formData = new FormData();
      formData.append('file', blob, 'manual_crop.jpg');
      formData.append('x', Math.round(completedCrop.x * scaleX));
      formData.append('y', Math.round(completedCrop.y * scaleY));
      formData.append('w', Math.round(completedCrop.width * scaleX));
      formData.append('h', Math.round(completedCrop.height * scaleY));
      
      try {
        await axios.post(`http://localhost:8000/api/forms/${id}/update-photo`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        setIsCropping(false);
        fetchForm();
      } catch (err) {
        console.error("Failed to upload manual crop", err);
        alert("Failed to upload manual crop.");
      }
    }, 'image/jpeg', 0.65);
  };

  if (!form) return <div style={{ textAlign: 'center', marginTop: '2rem' }}>Loading...</div>;

  const page1Words = form.extracted_data?.page1 || [];
  const page2Words = form.extracted_data?.page2 || [];

  return (
    <div className="app-container">
      <div className="header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button className="btn-icon" onClick={() => navigate('/students')} title="Back to list">
            <ArrowLeft size={20} />
          </button>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>{form.form_type}</h1>
          <span className={`badge ${form.status.toLowerCase().replace(/\s+/g, '-')}`} style={{ alignSelf: 'center' }}>
            {form.status}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn btn-outline" onClick={() => saveChanges()}>
            <Save size={18} /> Save Metadata
          </button>
        </div>
      </div>

      <div className="editor-layout" style={{ marginTop: '1rem' }}>
        
        {/* Left Side: Selectable Pages View */}
        <div className="glass-panel" style={{ padding: '1.5rem', overflowY: 'auto', background: 'var(--bg-main)' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Form Document</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
            Text is selectable! Highlight any text on the images below to copy it.
          </p>

          {isCropping ? (
             <div>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '1rem' }}>
                  <button className="btn btn-primary" onClick={applyCrop}>Save Crop</button>
                  <button className="btn" onClick={() => setIsCropping(false)}>Cancel</button>
                </div>
                <ReactCrop crop={crop} onChange={c => setCrop(c)} onComplete={c => setCompletedCrop(c)}>
                  <img 
                    ref={imgRef}
                    crossOrigin="anonymous"
                    src={getImageUrl(form.scan_image_path)} 
                    alt="Crop Source" 
                    style={{ maxWidth: '100%' }}
                  />
                </ReactCrop>
             </div>
          ) : (
            <>
              {form.scan_image_path && (
                <SelectableImage 
                  src={getImageUrl(form.scan_image_path)} 
                  words={page1Words} 
                />
              )}
              
              {form.scan_image_back_path && (
                <SelectableImage 
                  src={getImageUrl(form.scan_image_back_path)} 
                  words={page2Words} 
                />
              )}
            </>
          )}
        </div>

        {/* Right Side: Extraction & Metadata */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', padding: '1.5rem', overflowY: 'auto' }}>
          
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Photo & Signature</h2>
              <button 
                className="btn btn-sm" 
                style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                onClick={() => setIsCropping(true)}
              >
                <Crop size={14} style={{ marginRight: '5px' }} /> Manual Crop
              </button>
            </div>
            
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {form.photo_path ? (
                <>
                  <img 
                    src={`${getImageUrl(form.photo_path)}?t=${new Date().getTime()}`} 
                    alt="Photo and Signature" 
                    style={{ width: '100%', maxWidth: '300px', borderRadius: '4px', marginBottom: '1rem' }} 
                  />
                  <button 
                    className="btn btn-primary" 
                    style={{ width: '100%' }}
                    onClick={() => handleDownloadImage(
                      getImageUrl(form.photo_path), 
                      `${form.student_name || 'student'}_photo_sig.jpg`
                    )}
                  >
                    <Download size={18} /> Download for Portal
                  </button>
                </>
              ) : (
                <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>No extraction found</div>
              )}
            </div>
          </div>

          <div>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Basic Search Metadata</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>
              These fields are used just to help you search for this form in the dashboard later. You do not need to correct them for the Board Portal.
            </p>
            
            <div className="form-group">
              <label>Student Name</label>
              <input type="text" value={form.student_name || ''} onChange={e => setForm({...form, student_name: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Father Name</label>
              <input type="text" value={form.father_name || ''} onChange={e => setForm({...form, father_name: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Mother Name</label>
              <input type="text" value={form.mother_name || ''} onChange={e => setForm({...form, mother_name: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Date of Birth</label>
              <input type="text" value={form.dob || ''} onChange={e => setForm({...form, dob: e.target.value})} />
            </div>
          </div>

          <div style={{ marginTop: 'auto', paddingTop: '2rem' }}>
            <button 
              className="btn" 
              style={{ width: '100%', background: 'var(--success)', color: 'white', padding: '1rem', fontSize: '1.1rem', fontWeight: 'bold' }} 
              onClick={() => setShowCompleteModal(true)}
            >
              <CheckCircle size={20} /> Complete Form & Next
            </button>
          </div>
          
        </div>
      </div>

      {showCompleteModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
          <div className="glass-panel" style={{ padding: '2rem', width: '450px', maxWidth: '90%', background: 'var(--bg-card)' }}>
            <h2 style={{ fontSize: '1.4rem', marginBottom: '1.5rem', textAlign: 'center' }}>Complete Form</h2>
            
            <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', textAlign: 'center' }}>Was the form successfully filled in the Board Portal?</p>
            
            <div style={{ display: 'flex', gap: '10px', marginBottom: '1.5rem' }}>
              <button
                className="btn"
                style={{
                  flex: 1,
                  padding: '0.8rem',
                  background: form.portal_status === 'Filled' ? 'var(--success)' : 'rgba(0,0,0,0.2)',
                  color: form.portal_status === 'Filled' ? 'white' : 'var(--text-muted)',
                  border: '1px solid',
                  borderColor: form.portal_status === 'Filled' ? 'var(--success)' : 'var(--border)'
                }}
                onClick={() => setForm({...form, portal_status: 'Filled'})}
              >
                Yes, Successfully Filled
              </button>
              <button
                className="btn"
                style={{
                  flex: 1,
                  padding: '0.8rem',
                  background: form.portal_status === 'Issue' ? 'var(--danger)' : 'rgba(0,0,0,0.2)',
                  color: form.portal_status === 'Issue' ? 'white' : 'var(--text-muted)',
                  border: '1px solid',
                  borderColor: form.portal_status === 'Issue' ? 'var(--danger)' : 'var(--border)'
                }}
                onClick={() => setForm({...form, portal_status: 'Issue'})}
              >
                No, There's an Issue
              </button>
            </div>

            {form.portal_status === 'Filled' && (
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label>Application Number (from Portal)</label>
                <input 
                  type="text" 
                  value={form.application_number || ''} 
                  onChange={e => setForm({...form, application_number: e.target.value})} 
                  placeholder="e.g. APP-12345"
                  style={{ borderColor: 'var(--success)', padding: '0.8rem' }}
                />
              </div>
            )}

            {form.portal_status === 'Issue' && (
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label>Issue Reason</label>
                <textarea 
                  value={form.portal_issue_description || ''} 
                  onChange={e => setForm({...form, portal_issue_description: e.target.value})} 
                  placeholder="Describe why the form could not be filled..."
                  style={{ width: '100%', minHeight: '100px', background: 'rgba(0,0,0,0.2)', color: 'white', border: '1px solid var(--danger)', padding: '0.8rem', borderRadius: '8px' }}
                />
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: '2rem' }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowCompleteModal(false)}>Cancel</button>
              <button 
                className="btn btn-primary" 
                style={{ flex: 2 }} 
                onClick={handleCompleteAndNext}
                disabled={form.portal_status === 'Not Filled'}
              >
                Submit & Proceed to Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
