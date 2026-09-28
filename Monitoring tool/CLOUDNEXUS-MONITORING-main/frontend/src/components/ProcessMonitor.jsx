import React, { useState, useEffect } from 'react';
import { PROVIDER_META } from '../utils/theme';
import ServiceLogo from './ServiceLogo';

function getUsageColor(val) {
  if (val >= 85) return '#ef4444';
  if (val >= 70) return '#eab308';
  return '#22c55e';
}

// Zabbix-inspired "running processes" panel — shows top resource consumers
export default function ProcessMonitor({ allServices }) {
  const [sortBy, setSortBy] = useState('cpu');
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setPulse(p => !p), 3000);
    return () => clearInterval(interval);
  }, []);

  const runningServices = allServices
    .filter(s => s.cpu !== undefined || s.memUsage !== undefined)
    .map(s => ({
      ...s,
      cpuVal: s.cpu || 0,
      memVal: s.memUsage || 0,
    }))
    .sort((a, b) => sortBy === 'cpu' ? b.cpuVal - a.cpuVal : b.memVal - a.memVal)
    .slice(0, 12);

  return (
    <div className="section-card">
      <div className="section-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>Live Process Monitor</span>
        <div style={{ display: 'flex', gap: 6 }}>
          {['cpu','memory'].map(k => (
            <button key={k} onClick={() => setSortBy(k)}
              className={`region-btn ${sortBy===k?'active':''}`}
              style={sortBy===k ? { borderColor:'#6366f1',color:'#6366f1',background:'rgba(99,102,241,0.1)' } : {}}>
              Sort: {k.toUpperCase()}
            </button>
          ))}
          <span style={{ display:'flex',alignItems:'center',gap:4,fontSize:11,color:'#22c55e',marginLeft:8 }}>
            <span style={{ width:6,height:6,borderRadius:'50%',background:'#22c55e',display:'inline-block',
              animation: pulse ? 'none' : 'none', opacity: pulse ? 0.5 : 1, transition:'opacity 0.5s' }} />
            LIVE
          </span>
        </div>
      </div>

      {/* Header row */}
      <div style={{ display:'grid', gridTemplateColumns:'200px 90px 1fr 1fr 80px', gap:8, padding:'6px 12px',
        fontSize:10, fontWeight:700, letterSpacing:'0.06em', color:'var(--text3)', borderBottom:'1px solid var(--border)',
        textTransform:'uppercase' }}>
        <span>Service</span>
        <span>Provider</span>
        <span>CPU</span>
        <span>Memory</span>
        <span>Status</span>
      </div>

      {runningServices.map((s, i) => {
        const provider = s.provider || (s.id?.startsWith('aws') ? 'aws' : s.id?.startsWith('gcp') ? 'gcp' : 'azure');
        const meta = PROVIDER_META[provider] || PROVIDER_META.aws;
        return (
          <div key={s.id} style={{
            display:'grid', gridTemplateColumns:'200px 90px 1fr 1fr 80px', gap:8,
            padding:'8px 12px', borderBottom:'1px solid var(--border)',
            background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
            transition:'background 0.2s',
            cursor:'default',
          }}>
            <div style={{ display:'flex',alignItems:'center',gap:6,overflow:'hidden' }}>
              <ServiceLogo type={s.type} family={s.family} size={22} />
              <span style={{ fontSize:12,fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}
                title={s.name}>{s.name}</span>
            </div>
            <span style={{ fontSize:11,color:meta.color,fontWeight:600 }}>{meta.label}</span>

            {/* CPU bar */}
            <div style={{ display:'flex',alignItems:'center',gap:6 }}>
              <div style={{ flex:1,height:6,background:'var(--border)',borderRadius:3,overflow:'hidden' }}>
                <div style={{ width:`${s.cpuVal}%`,height:'100%',background:getUsageColor(s.cpuVal),
                  borderRadius:3,transition:'width 0.8s ease' }} />
              </div>
              <span style={{ fontSize:11,width:32,textAlign:'right',color:getUsageColor(s.cpuVal),fontWeight:600 }}>
                {s.cpuVal}%
              </span>
            </div>

            {/* Mem bar */}
            <div style={{ display:'flex',alignItems:'center',gap:6 }}>
              <div style={{ flex:1,height:6,background:'var(--border)',borderRadius:3,overflow:'hidden' }}>
                <div style={{ width:`${s.memVal}%`,height:'100%',background:getUsageColor(s.memVal),
                  borderRadius:3,transition:'width 0.8s ease' }} />
              </div>
              <span style={{ fontSize:11,width:32,textAlign:'right',color:getUsageColor(s.memVal),fontWeight:600 }}>
                {s.memVal}%
              </span>
            </div>

            <span className={`badge badge-${s.health}`} style={{ fontSize:10,padding:'1px 6px' }}>
              {s.health === 'healthy' ? '✓ OK' : s.health === 'warning' ? '⚠ Warn' : '✗ Crit'}
            </span>
          </div>
        );
      })}

      {runningServices.length === 0 && (
        <div style={{ textAlign:'center', padding:'24px 0', color:'var(--text3)', fontSize:13 }}>
          No running services with metrics available.
        </div>
      )}
    </div>
  );
}
