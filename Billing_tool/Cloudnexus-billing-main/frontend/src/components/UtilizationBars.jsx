import React from 'react';
import { PROVIDER_META } from '../utils/theme';

export default function UtilizationBars({ provider, utilization }) {
  if (!utilization) return null;
  const color = PROVIDER_META[provider]?.color || '#888';
  const bars = Object.entries(utilization).map(([k, v]) => ({
    name: k.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase()),
    val: v,
  }));

  const hasValues = bars.some(b => typeof b.val === 'number' && b.val !== 0);
  if (!hasValues) {
    return (
      <div style={{ padding: '16px 0', color: '#64748b', fontSize: 13 }}>
        No live utilization metrics available yet.
      </div>
    );
  }

  return (
    <div>
      {bars.map(b => (
        <div key={b.name} style={{marginBottom:10}}>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'#666',marginBottom:4}}>
            <span>{b.name}</span>
            <span style={{fontWeight:500,color:'#222'}}>{b.val}%</span>
          </div>
          <div style={{height:6,background:'rgba(0,0,0,0.08)',borderRadius:3,overflow:'hidden'}}>
            <div style={{height:'100%',width:`${b.val}%`,background:color,borderRadius:3,transition:'width 0.6s ease'}} />
          </div>
        </div>
      ))}
    </div>
  );
}
