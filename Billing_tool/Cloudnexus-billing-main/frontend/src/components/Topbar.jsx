import React, { useState, useRef, useEffect } from 'react';
import { exportCSV, exportJSON } from '../services/api';
import { exportReport, exportReportAsPDF, exportSeparatePDFs } from '../utils/reportExport';
import ProviderLogo from './ProviderLogo';

const PROVIDER_COLORS = { aws: '#FF9900', gcp: '#4285F4', azure: '#008AD7' };

export default function Topbar({ mode, onModeChange, onRefresh, lastRefresh, connections, onOpenConnect, reportData, userName, userPhoto, onBack }) {
  const [dlOpen, setDlOpen] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [pdfSub, setPdfSub] = useState(false);
  const ref = useRef();

  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) { setDlOpen(false); setPdfSub(false); } }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function handleRefresh() {
    setSpinning(true);
    onRefresh();
    setTimeout(() => setSpinning(false), 800);
  }

  function timeAgo() {
    if (!lastRefresh) return 'never';
    const s = Math.floor((Date.now() - lastRefresh) / 1000);
    if (s < 5) return 'just now';
    if (s < 60) return `${s}s ago`;
    return `${Math.floor(s / 60)}m ago`;
  }

  function handleModeToggle(m) {
    if (m === 'real') {
      onOpenConnect();
    } else {
      onModeChange('mock');
    }
  }

  function handleExportHTML(filter) {
    if (reportData) exportReport({ ...reportData, filter });
    setDlOpen(false); setPdfSub(false);
  }

  function handleExportPDF(filter) {
    if (reportData) exportReportAsPDF({ ...reportData, filter });
    setDlOpen(false); setPdfSub(false);
  }

  function handleExportAllPDFs() {
    if (reportData) exportSeparatePDFs({ ...reportData });
    setDlOpen(false); setPdfSub(false);
  }

  const connectedCount = ['aws','gcp','azure'].filter(p => connections?.[p]?.connected).length;

  return (
    <div className="topbar">
      <div className="topbar-left">
        {onBack && (
          <button onClick={onBack} style={{display:'flex',alignItems:'center',gap:5,background:'none',border:'1px solid rgba(255,255,255,0.15)',color:'rgba(255,255,255,0.7)',padding:'4px 11px',borderRadius:7,cursor:'pointer',fontSize:12,fontWeight:500,marginRight:6,transition:'all 0.15s'}}
            onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,0.1)';e.currentTarget.style.color='#fff';}}
            onMouseLeave={e=>{e.currentTarget.style.background='none';e.currentTarget.style.color='rgba(255,255,255,0.7)';}}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            Back
          </button>
        )}
        <span className="logo">
          <span className="brand-icon">
            <span className="brand-dot aws" />
            <span className="brand-dot gcp" />
            <span className="brand-dot azure" />
          </span><span>Cloud<span style={{ color: '#4285F4' }}>Nexus</span></span>
        </span>
        <span className="live-badge"><span className="dot" />Live</span>
        <span className="muted-text">Last refresh: {timeAgo()}</span>
      </div>

      <div className="topbar-right">
        {mode === 'real' && (
          <div className="conn-pills">
            {['aws','gcp','azure'].map(p => (
              <div
                key={p}
                className={`conn-pill ${connections?.[p]?.connected ? 'connected' : 'disconnected'}`}
                onClick={onOpenConnect}
                style={{ cursor:'pointer', display:'inline-flex', alignItems:'center', gap:4 }}
                title={connections?.[p]?.connected ? `${p.toUpperCase()} connected` : `${p.toUpperCase()} — click to connect`}
              >
                <ProviderLogo provider={p} size={14} />
                <span>{p.toUpperCase()}</span>
              </div>
            ))}
          </div>
        )}

        <div className="mode-toggle">
          <button className={`mode-btn ${mode === 'mock' ? 'active' : ''}`} onClick={() => handleModeToggle('mock')}>Mock</button>
          <button className={`mode-btn ${mode === 'real' ? 'active' : ''}`} onClick={() => handleModeToggle('real')}>
            Real {mode === 'real' && connectedCount > 0 && <span style={{fontSize:10,marginLeft:3,opacity:0.8}}>{connectedCount}/3</span>}
          </button>
        </div>


        <div className="dl-wrapper" ref={ref}>
          <button
            className="icon-btn dl-report-btn"
            onClick={() => { setDlOpen(v => !v); setPdfSub(false); }}
            title="Export Cost Report"
          >
            ↓ Export Report
          </button>
          {dlOpen && (
            <div className="dl-panel" style={{ minWidth: 260 }}>

              {/* ── HTML Reports ── */}
              <div className="dl-section-label">HTML Reports</div>
              <div className="dl-option" onClick={() => handleExportHTML('combined')}>
                <span style={{ fontSize:10, fontWeight:700, color:'#64748b', letterSpacing:0.5 }}>ALL</span>
                <div><div>Full Report (All Providers)</div><div className="dl-sub">AWS + GCP + Azure · HTML</div></div>
              </div>
              <div className="dl-option" onClick={() => handleExportHTML('aws')}>
                <ProviderLogo provider="aws" size={18} />
                <div><div>AWS Report</div><div className="dl-sub">Amazon Web Services · HTML</div></div>
              </div>
              <div className="dl-option" onClick={() => handleExportHTML('gcp')}>
                <ProviderLogo provider="gcp" size={18} />
                <div><div>GCP Report</div><div className="dl-sub">Google Cloud · HTML</div></div>
              </div>
              <div className="dl-option" onClick={() => handleExportHTML('azure')}>
                <ProviderLogo provider="azure" size={18} />
                <div><div>Azure Report</div><div className="dl-sub">Microsoft Azure · HTML</div></div>
              </div>

              <div className="dl-divider" />

              {/* ── PDF Reports ── */}
              <div className="dl-section-label" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span>PDF Reports</span>
                <span style={{ fontSize:9, color:'#94a3b8', fontWeight:400 }}>via Print dialog</span>
              </div>
              <div className="dl-option" onClick={() => handleExportPDF('combined')}>
                <span style={{ fontSize:10, fontWeight:700, color:'#64748b', letterSpacing:0.5 }}>ALL</span>
                <div><div style={{fontWeight:600}}>Combined PDF — All Providers</div><div className="dl-sub">AWS + GCP + Azure · month-wise + charts</div></div>
              </div>
              <div className="dl-option" onClick={() => handleExportPDF('aws')}>
                <ProviderLogo provider="aws" size={18} />
                <div><div>AWS PDF Report</div><div className="dl-sub">Amazon Web Services only</div></div>
              </div>
              <div className="dl-option" onClick={() => handleExportPDF('gcp')}>
                <ProviderLogo provider="gcp" size={18} />
                <div><div>GCP PDF Report</div><div className="dl-sub">Google Cloud only</div></div>
              </div>
              <div className="dl-option" onClick={() => handleExportPDF('azure')}>
                <ProviderLogo provider="azure" size={18} />
                <div><div>Azure PDF Report</div><div className="dl-sub">Microsoft Azure only</div></div>
              </div>
              <div className="dl-option" onClick={handleExportAllPDFs} style={{ background:'rgba(66,133,244,0.05)', borderRadius:6 }}>
                <span style={{ fontSize:10, fontWeight:700, color:'#4285F4', letterSpacing:0.5 }}>3×</span>
                <div><div style={{fontWeight:600, color:'#4285F4'}}>Export All 3 Separate PDFs</div><div className="dl-sub">One PDF per provider</div></div>
              </div>

              <div className="dl-divider" />

              {/* ── Raw Data ── */}
              <div className="dl-section-label">Raw Data</div>
              <div className="dl-option" onClick={() => { exportCSV(mode); setDlOpen(false); }}>Export CSV</div>
              <div className="dl-option" onClick={() => { exportJSON(mode); setDlOpen(false); }}>Export JSON</div>
            </div>
          )}
        </div>
        <button className={`icon-btn ${spinning ? 'spin' : ''}`} onClick={handleRefresh} title="Refresh">↻</button>

        {(userName || userPhoto) && (
          <div style={{display:'flex',alignItems:'center',gap:8,marginLeft:6,paddingLeft:10,borderLeft:'1px solid rgba(255,255,255,0.12)'}}>
            <div style={{width:30,height:30,borderRadius:'50%',overflow:'hidden',background:'linear-gradient(135deg,#16a34a,#22c55e)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,border:'2px solid rgba(255,255,255,0.18)'}}>
              {userPhoto
                ? <img src={userPhoto} alt="avatar" style={{width:'100%',height:'100%',objectFit:'cover'}} />
                : <span style={{fontSize:12,fontWeight:700,color:'#fff'}}>{(userName||'?')[0].toUpperCase()}</span>}
            </div>
            {userName && <span style={{fontSize:12,fontWeight:600,color:'rgba(255,255,255,0.85)',maxWidth:120,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{userName}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
