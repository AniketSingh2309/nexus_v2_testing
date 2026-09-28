import React, { useState } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, AreaChart, Area } from 'recharts';
import { PROVIDER_META, fmt, COLORS } from '../utils/theme';

export default function CostAnalysis({ awsServices, gcpServices, azureServices }) {
  const [view, setView] = useState('breakdown');
  const all = [...awsServices, ...gcpServices, ...azureServices];

  // Family breakdown
  const familyCosts = {};
  for (const s of all) {
    familyCosts[s.family] = (familyCosts[s.family] || 0) + (s.cost || 0);
  }
  const familyData = Object.entries(familyCosts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, cost], i) => ({ name, cost: Math.round(cost), fill: COLORS[i % COLORS.length] }));

  // Monthly trend (simulated 6-month)
  const months = ['Jan','Feb','Mar','Apr','May','Jun'];
  const totalNow = all.reduce((a, s) => a + (s.cost || 0), 0);
  const trendData = months.map((m, i) => ({
    month: m,
    aws: Math.round(awsServices.reduce((a, s) => a + (s.cost || 0), 0) * (0.7 + i * 0.06)),
    gcp: Math.round(gcpServices.reduce((a, s) => a + (s.cost || 0), 0) * (0.75 + i * 0.05)),
    azure: Math.round(azureServices.reduce((a, s) => a + (s.cost || 0), 0) * (0.65 + i * 0.07)),
  }));

  // Top 10 most expensive services
  const topCostServices = all.sort((a, b) => (b.cost || 0) - (a.cost || 0)).slice(0, 10);

  return (
    <div className="section-card">
      <div className="section-title" style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <span>💰 Cost Analysis</span>
        <div style={{ display:'flex', gap:6 }}>
          {[['breakdown','Breakdown'],['trend','Trend'],['top','Top Services']].map(([k,l]) => (
            <button key={k} onClick={() => setView(k)}
              className={`region-btn ${view===k?'active':''}`}
              style={view===k ? { borderColor:'#FF9900',color:'#FF9900',background:'rgba(255,153,0,0.1)' } : {}}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {view === 'breakdown' && (
        <div style={{ height:220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={familyData} layout="vertical" margin={{ top:4, right:60, bottom:4, left:80 }}>
              <XAxis type="number" tick={{ fontSize:10 }} tickFormatter={v => `$${v}`} />
              <YAxis dataKey="name" type="category" tick={{ fontSize:10 }} width={76} />
              <Tooltip formatter={v => [`$${v}/mo`, 'Cost']} contentStyle={{ fontSize:12, borderRadius:6 }} />
              <Bar dataKey="cost" radius={[0,4,4,0]}>
                {familyData.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {view === 'trend' && (
        <div style={{ height:220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData} margin={{ top:4, right:8, bottom:4, left:0 }}>
              <XAxis dataKey="month" tick={{ fontSize:11 }} />
              <YAxis tick={{ fontSize:10 }} tickFormatter={v => `$${v}`} />
              <Tooltip formatter={v => [`$${v}`, '']} contentStyle={{ fontSize:12, borderRadius:6 }} />
              <Area type="monotone" dataKey="aws" stackId="1" stroke="#FF9900" fill="rgba(255,153,0,0.2)" name="AWS" />
              <Area type="monotone" dataKey="gcp" stackId="1" stroke="#4285F4" fill="rgba(66,133,244,0.2)" name="GCP" />
              <Area type="monotone" dataKey="azure" stackId="1" stroke="#008AD7" fill="rgba(0,138,215,0.2)" name="Azure" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {view === 'top' && (
        <div>
          {topCostServices.map((s, i) => {
            const meta = PROVIDER_META[s.provider] || PROVIDER_META.aws;
            const maxCost = topCostServices[0].cost || 1;
            return (
              <div key={s.id} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:7 }}>
                <span style={{ fontSize:10, color:'var(--text3)', width:16, textAlign:'right' }}>{i+1}</span>
                <span style={{ fontSize:11, color:meta.color, width:36 }}>{meta.label}</span>
                <span style={{ fontSize:12, flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}
                  title={s.name}>{s.name}</span>
                <div style={{ width:100, height:6, background:'var(--border)', borderRadius:3, overflow:'hidden' }}>
                  <div style={{ width:`${((s.cost||0)/maxCost)*100}%`, height:'100%',
                    background:meta.color, borderRadius:3 }} />
                </div>
                <span style={{ fontSize:12, fontWeight:600, color:meta.color, width:60, textAlign:'right' }}>
                  {fmt.usd(s.cost || 0)}/mo
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
