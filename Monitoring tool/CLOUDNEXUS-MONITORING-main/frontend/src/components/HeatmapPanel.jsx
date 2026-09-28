import React, { useState } from 'react';

// Zabbix-style heatmap: each cell = one service, color = health/cpu level
const CELL_SIZE = 32;

function getHeatColor(service, mode) {
  if (mode === 'health') {
    if (service.health === 'critical') return '#ef4444';
    if (service.health === 'warning') return '#eab308';
    return '#22c55e';
  }
  if (mode === 'cpu') {
    const v = service.cpu || 0;
    if (v >= 85) return '#ef4444';
    if (v >= 70) return '#f97316';
    if (v >= 50) return '#eab308';
    if (v >= 20) return '#22c55e';
    return '#166534';
  }
  if (mode === 'cost') {
    const v = service.cost || 0;
    if (v >= 500) return '#7c3aed';
    if (v >= 200) return '#4f46e5';
    if (v >= 100) return '#2563eb';
    if (v >= 50) return '#0891b2';
    return '#0e7490';
  }
  return '#22c55e';
}

const PROVIDER_COLORS = { aws: '#FF9900', gcp: '#4285F4', azure: '#008AD7' };

export default function HeatmapPanel({ allServices }) {
  const [mode, setMode] = useState('health');
  const [hoveredService, setHoveredService] = useState(null);

  const grouped = { aws: [], gcp: [], azure: [] };
  for (const s of allServices) {
    if (grouped[s.provider]) grouped[s.provider].push(s);
  }

  return (
    <div className="section-card">
      <div className="section-title" style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <span>🗺️ Infrastructure Heatmap</span>
        <div style={{ display:'flex', gap:6 }}>
          {[['health','Health'],['cpu','CPU'],['cost','Cost']].map(([k,l]) => (
            <button key={k} onClick={() => setMode(k)}
              className={`region-btn ${mode===k?'active':''}`}
              style={mode===k ? { borderColor:'#4285F4',color:'#4285F4',background:'rgba(66,133,244,0.1)' } : {}}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div style={{ display:'flex', gap:16, marginBottom:14, flexWrap:'wrap' }}>
        {mode === 'health' && (
          <>
            {[['#22c55e','Healthy'],['#eab308','Warning'],['#ef4444','Critical']].map(([c,l]) => (
              <div key={l} style={{ display:'flex',alignItems:'center',gap:5,fontSize:11 }}>
                <div style={{ width:12,height:12,borderRadius:2,background:c }} />
                <span style={{ color:'var(--text2)' }}>{l}</span>
              </div>
            ))}
          </>
        )}
        {mode === 'cpu' && (
          <>
            {[['#166534','<20%'],['#22c55e','20-50%'],['#eab308','50-70%'],['#f97316','70-85%'],['#ef4444','>85%']].map(([c,l]) => (
              <div key={l} style={{ display:'flex',alignItems:'center',gap:5,fontSize:11 }}>
                <div style={{ width:12,height:12,borderRadius:2,background:c }} />
                <span style={{ color:'var(--text2)' }}>{l}</span>
              </div>
            ))}
          </>
        )}
        {mode === 'cost' && (
          <>
            {[['#0e7490','<$50'],['#0891b2','$50-100'],['#2563eb','$100-200'],['#4f46e5','$200-500'],['#7c3aed','>$500']].map(([c,l]) => (
              <div key={l} style={{ display:'flex',alignItems:'center',gap:5,fontSize:11 }}>
                <div style={{ width:12,height:12,borderRadius:2,background:c }} />
                <span style={{ color:'var(--text2)' }}>{l}</span>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Heatmap grid by provider */}
      {Object.entries(grouped).map(([provider, services]) => {
        if (!services.length) return null;
        return (
          <div key={provider} style={{ marginBottom:16 }}>
            <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.06em', color:PROVIDER_COLORS[provider],
              textTransform:'uppercase', marginBottom:8, display:'flex', alignItems:'center', gap:6 }}>
              {provider.toUpperCase()} <span style={{ color:'var(--text3)', fontWeight:400 }}>({services.length} services)</span>
            </div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:3 }}>
              {services.map(s => (
                <div key={s.id}
                  onMouseEnter={() => setHoveredService(s)}
                  onMouseLeave={() => setHoveredService(null)}
                  style={{
                    width: CELL_SIZE, height: CELL_SIZE, borderRadius:4,
                    background: getHeatColor(s, mode),
                    cursor:'pointer', position:'relative',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:10, color:'rgba(255,255,255,0.8)', fontWeight:600,
                    transition:'transform 0.15s, opacity 0.15s',
                    transform: hoveredService?.id === s.id ? 'scale(1.15)' : 'scale(1)',
                    opacity: hoveredService && hoveredService.id !== s.id ? 0.6 : 1,
                    border: hoveredService?.id === s.id ? '2px solid white' : '2px solid transparent',
                  }}
                  title={`${s.name}\n${mode === 'cpu' ? `CPU: ${s.cpu || 'N/A'}%` : mode === 'cost' ? `Cost: $${s.cost || 0}/mo` : `Health: ${s.health}`}`}
                >
                  {mode === 'cpu' && s.cpu !== undefined ? `${s.cpu}` : ''}
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Tooltip / detail */}
      {hoveredService && (
        <div style={{
          marginTop:12, padding:'10px 14px', background:'var(--card2)', borderRadius:8,
          border:'1px solid var(--border)', fontSize:12,
          display:'flex', gap:20, flexWrap:'wrap',
        }}>
          <span style={{ fontWeight:700 }}>{hoveredService.name}</span>
          <span style={{ color:'var(--text2)' }}>{hoveredService.type}</span>
          <span style={{ color:'var(--text2)' }}>{hoveredService.region}</span>
          {hoveredService.cpu !== undefined && <span style={{ color:getHeatColor(hoveredService,'cpu') }}>CPU: {hoveredService.cpu}%</span>}
          {hoveredService.memUsage !== undefined && <span>Mem: {hoveredService.memUsage}%</span>}
          <span>Cost: ${hoveredService.cost || 0}/mo</span>
          <span className={`badge badge-${hoveredService.health}`}>{hoveredService.health}</span>
        </div>
      )}
    </div>
  );
}
