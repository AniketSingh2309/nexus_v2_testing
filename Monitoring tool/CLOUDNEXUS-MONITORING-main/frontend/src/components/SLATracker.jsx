import React from 'react';
import { PROVIDER_META } from '../utils/theme';

function getUsageColor(val) {
  if (val >= 99.9) return '#22c55e';
  if (val >= 99.5) return '#eab308';
  return '#ef4444';
}

function computeSLA(services) {
  if (!services.length) return 100;
  const healthy = services.filter(s => s.health === 'healthy').length;
  return (healthy / services.length) * 100;
}

function SLABar({ label, value, target = 99.9 }) {
  const color = getUsageColor(value);
  return (
    <div style={{ marginBottom:10 }}>
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:4 }}>
        <span style={{ color:'var(--text2)' }}>{label}</span>
        <span style={{ fontWeight:700, color }}>{value.toFixed(2)}%</span>
      </div>
      <div style={{ position:'relative', height:8, background:'var(--border)', borderRadius:4, overflow:'visible' }}>
        <div style={{ width:`${value}%`, height:'100%', background:color, borderRadius:4, transition:'width 1s' }} />
        <div style={{ position:'absolute', top:-2, bottom:-2, left:`${target}%`,
          width:2, background:'rgba(255,255,255,0.4)', borderRadius:1 }} title={`Target: ${target}%`} />
      </div>
    </div>
  );
}

export default function SLATracker({ awsServices, gcpServices, azureServices }) {
  const all = [...awsServices, ...gcpServices, ...azureServices];
  const overallSLA  = computeSLA(all);
  const awsSLA      = computeSLA(awsServices);
  const gcpSLA      = computeSLA(gcpServices);
  const azureSLA    = computeSLA(azureServices);
  const compute     = all.filter(s => s.family === 'Compute');
  const database    = all.filter(s => s.family === 'Database');
  const container   = all.filter(s => s.family === 'Container');

  return (
    <div className="section-card">
      <div className="section-title">📈 Service Level Overview</div>
      <div style={{ display:'flex', alignItems:'center', gap:24, marginBottom:20, flexWrap:'wrap' }}>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:42, fontWeight:800, color:getUsageColor(overallSLA),
            lineHeight:1, fontFamily:'monospace' }}>
            {overallSLA.toFixed(2)}%
          </div>
          <div style={{ fontSize:11, color:'var(--text3)', marginTop:4 }}>Overall Health</div>
        </div>
        <div style={{ flex:1, minWidth:200 }}>
          <SLABar label="Overall" value={overallSLA} />
          <SLABar label="AWS" value={awsSLA} />
          <SLABar label="GCP" value={gcpSLA} />
          <SLABar label="Azure" value={azureSLA} />
        </div>
      </div>
      <div style={{ borderTop:'1px solid var(--border)', paddingTop:14 }}>
        <div style={{ fontSize:11, fontWeight:700, color:'var(--text3)', textTransform:'uppercase',
          letterSpacing:'0.06em', marginBottom:10 }}>By Service Type</div>
        <SLABar label={`Compute (${compute.length})`} value={computeSLA(compute)} />
        <SLABar label={`Databases (${database.length})`} value={computeSLA(database)} />
        <SLABar label={`Containers (${container.length})`} value={computeSLA(container)} />
      </div>
      <div style={{ display:'flex', gap:12, marginTop:12, flexWrap:'wrap' }}>
        {[['#22c55e','≥99.9% Optimal'],['#eab308','99.5-99.9% Degraded'],['#ef4444','<99.5% Critical']].map(([c,l]) => (
          <div key={l} style={{ display:'flex',alignItems:'center',gap:5,fontSize:10 }}>
            <div style={{ width:8,height:8,borderRadius:'50%',background:c }} />
            <span style={{ color:'var(--text3)' }}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
