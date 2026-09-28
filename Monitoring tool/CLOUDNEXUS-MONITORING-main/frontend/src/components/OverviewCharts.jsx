import React from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList,
} from 'recharts';
import { COLORS } from '../utils/theme';

const HEALTH_COLORS = { Healthy: '#22c55e', Warning: '#eab308', Critical: '#ef4444' };

function HealthTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 12px', fontSize: 12 }}>
      <span style={{ color: d.fill, fontWeight: 700 }}>{d.name}: </span>{d.value}
    </div>
  );
}

function BarTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 12px', fontSize: 12 }}>
      <span style={{ fontWeight: 600 }}>{label}: </span>{payload[0].value} services
    </div>
  );
}

export default function OverviewCharts({ awsServices, gcpServices, azureServices }) {
  const all = [...awsServices, ...gcpServices, ...azureServices];

  const healthData = [
    { name: 'Healthy',  value: all.filter(s => s.health === 'healthy').length,  fill: '#22c55e' },
    { name: 'Warning',  value: all.filter(s => s.health === 'warning').length,  fill: '#eab308' },
    { name: 'Critical', value: all.filter(s => s.health === 'critical').length, fill: '#ef4444' },
  ].filter(d => d.value > 0);

  const familyMap = {};
  for (const s of all) familyMap[s.family] = (familyMap[s.family] || 0) + 1;
  const familyData = Object.entries(familyMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count], i) => ({ name, count, fill: COLORS[i % COLORS.length] }));

  const total = all.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 16 }}>

      {/* ── Health Distribution ─────────────────────────────────────────── */}
      <div className="section-card" style={{ margin: 0 }}>
        <div className="section-title">Health Distribution</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 32, padding: '8px 0' }}>

          {/* Donut */}
          <div style={{ width: 200, height: 200, flexShrink: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={healthData}
                  cx="50%" cy="50%"
                  innerRadius={58} outerRadius={88}
                  paddingAngle={4}
                  dataKey="value"
                  startAngle={90} endAngle={-270}
                  strokeWidth={0}
                >
                  {healthData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Pie>
                <Tooltip content={<HealthTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Center stat overlay + legend */}
          <div style={{ flex: 1 }}>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 36, fontWeight: 700, color: 'var(--text)', lineHeight: 1 }}>{total}</div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>Total Services</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {healthData.map(d => {
                const pct = total > 0 ? ((d.value / total) * 100).toFixed(1) : 0;
                return (
                  <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: d.fill, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: 'var(--text2)', minWidth: 60 }}>{d.name}</span>
                    <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: d.fill, borderRadius: 3 }} />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: d.fill, minWidth: 28, textAlign: 'right' }}>{d.value}</span>
                    <span style={{ fontSize: 11, color: 'var(--text3)', minWidth: 40 }}>{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Services by Type ────────────────────────────────────────────── */}
      <div className="section-card" style={{ margin: 0 }}>
        <div className="section-title">Services by Type</div>
        <div style={{ height: Math.max(240, familyData.length * 38) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={familyData}
              layout="vertical"
              margin={{ top: 4, right: 64, bottom: 4, left: 72 }}
            >
              <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text3)' }} axisLine={false} tickLine={false} />
              <YAxis
                dataKey="name" type="category"
                tick={{ fontSize: 12, fill: 'var(--text2)' }}
                width={68} axisLine={false} tickLine={false}
              />
              <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
              <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={28}>
                {familyData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                <LabelList dataKey="count" position="right"
                  style={{ fontSize: 12, fontWeight: 700, fill: 'var(--text)' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}
