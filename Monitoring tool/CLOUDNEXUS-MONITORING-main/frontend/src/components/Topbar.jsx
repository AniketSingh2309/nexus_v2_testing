import React, { useState } from 'react';
import { PROVIDER_META } from '../utils/theme';

const PROVIDER_COLORS = { aws: '#FF9900', gcp: '#4285F4', azure: '#008AD7' };

export default function Topbar({ mode, onModeChange, onRefresh, lastRefresh, connections, onOpenConnect, onExport, searchQuery, onSearchChange, filterStatus, onFilterChange, alertCount, userName, userPhoto, onBack }) {
  const [spinning, setSpinning] = useState(false);

  function handleRefresh() {
    setSpinning(true);
    onRefresh();
    setTimeout(() => setSpinning(false), 800);
  }

  function timeAgo() {
    if (!lastRefresh) return 'never';
    const s = Math.floor((Date.now() - new Date(lastRefresh)) / 1000);
    if (s < 5) return 'just now';
    if (s < 60) return `${s}s ago`;
    return `${Math.floor(s / 60)}m ago`;
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
        <span className="logo">Cloud<span>Nexus</span></span>
        <span className="live-badge"><span className="dot" />Live</span>
        <span className="muted-text">Refreshed {timeAgo()}</span>
      </div>

      <div className="topbar-right">
        {mode === 'real' && (
          <div className="conn-pills">
            {['aws','gcp','azure'].map(p => (
              <div key={p} className={`conn-pill ${connections?.[p]?.connected ? 'connected' : ''}`} onClick={onOpenConnect} title={`${p.toUpperCase()} — ${connections?.[p]?.connected ? 'Connected' : 'Click to connect'}`}>
                <span style={{ width:6, height:6, borderRadius:'50%', background: connections?.[p]?.connected ? PROVIDER_COLORS[p] : 'rgba(0,0,0,0.2)', display:'inline-block' }} />
                {p.toUpperCase()}
              </div>
            ))}
          </div>
        )}

        <div className="mode-toggle">
          <button className={`mode-btn ${mode === 'mock' ? 'active' : ''}`} onClick={() => onModeChange('mock')}>Mock</button>
          <button className={`mode-btn ${mode === 'real' ? 'active' : ''}`} onClick={() => { onModeChange('real'); onOpenConnect(); }}>
            Real {mode === 'real' && connectedCount > 0 && <span style={{fontSize:10,marginLeft:3,opacity:0.8}}>{connectedCount}/3</span>}
          </button>
        </div>

        <button className="icon-btn" onClick={onOpenConnect}>🔌 Connect</button>
        <button className="icon-btn" onClick={onExport} title="Export Report"
          style={{ background: 'linear-gradient(135deg,#1d4ed8,#3b82f6)', color:'white', border:'none', fontWeight:600 }}>
          ⬇ Report
        </button>
        <button className={`icon-btn ${spinning ? 'spin' : ''}`} onClick={handleRefresh} title="Refresh">↻</button>

        {(userName || userPhoto) && (
          <div style={{display:'flex',alignItems:'center',gap:8,marginLeft:6,paddingLeft:10,borderLeft:'1px solid rgba(255,255,255,0.12)'}}>
            <div style={{width:30,height:30,borderRadius:'50%',overflow:'hidden',background:'linear-gradient(135deg,#2563eb,#6366f1)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,border:'2px solid rgba(255,255,255,0.18)'}}>
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
