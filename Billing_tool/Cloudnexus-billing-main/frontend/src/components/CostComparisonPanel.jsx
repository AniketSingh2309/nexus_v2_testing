import React, { useMemo, useState } from 'react';
import AllServicesTable from './AllServicesTable';
import ProviderLogo from './ProviderLogo';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

// ─── colour / style helpers ───────────────────────────────────────────
const COLORS = { aws: '#FF9900', gcp: '#4285F4', azure: '#008AD7' };
const PRIORITY_COLOR = { critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#22c55e' };
const BUDGET_COLOR   = { danger: '#ef4444', warning: '#f97316', ok: '#22c55e' };

function fmt(n) {
  if (n === undefined || n === null) return '—';
  const num = Number(n);
  if (!isFinite(num)) return '—';
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(2)}M`;
  return `$${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function Badge({ label, color }) {
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 99,
      fontSize: 10, fontWeight: 700, background: color + '22', color,
      textTransform: 'uppercase', letterSpacing: 0.6,
    }}>{label}</span>
  );
}
function SectionTitle({ children }) {
  return <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a2e', marginBottom: 12 }}>{children}</div>;
}
function Card({ children, style }) {
  return <div className="section-card" style={{ padding: 18, ...style }}>{children}</div>;
}

// ─── Pure JS port of cost_comparison.py ──────────────────────────────

function buildMonthlyHistory(provider, months, currentMtd) {
  const today = new Date();
  const daysElapsed = Math.max(today.getDate(), 1);
  const fallbacks = { aws: 4200, gcp: 2000, azure: 1200 };
  const fullEst = currentMtd > 0 ? currentMtd * (30 / daysElapsed) : (fallbacks[provider] || 800);
  const result = [];
  for (let i = 0; i < months; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - (months - 1 - i) * 30);
    const label = d.toLocaleString('default', { month: 'short', year: 'numeric' });
    const ord   = Math.floor(d.getTime() / 86400000) + (provider === 'aws' ? 0 : provider === 'gcp' ? 111 : 222);
    const noise = (Math.sin(ord * 1.3) + 1) / 2;
    const age   = 1 - ((months - 1 - i) / Math.max(months - 1, 1)) * 0.12;
    result.push({ label, cost: Math.round(fullEst * age + noise * fullEst * 0.06) });
  }
  return result;
}

function buildMonthlyFromTrend(trend) {
  const months = {};
  (trend || []).forEach(day => {
    if (!day.date) return;
    const d = new Date(day.date);
    if (isNaN(d)) return;
    const label = d.toLocaleString('default', { month: 'short', year: 'numeric' });
    if (!months[label]) months[label] = { label, aws: 0, gcp: 0, azure: 0, total: 0, _order: d.getTime() };
    months[label].aws   += day.aws   || 0;
    months[label].gcp   += day.gcp   || 0;
    months[label].azure += day.azure || 0;
    months[label].total += day.total || 0;
  });
  return Object.values(months)
    .sort((a, b) => a._order - b._order)
    .map(m => ({ label: m.label, aws: m.aws, gcp: m.gcp, azure: m.azure, total: m.total }));
}

function buildRadar(info) {
  function score(p) {
    const d = info[p] || {};
    const mtd   = d.mtd || 0;
    const delta = d.delta_pct || 0;
    const svcs  = (d.services || []).length;
    return {
      efficiency:        Math.max(30, Math.min(90, Math.round(70 - delta))),
      savings:           Math.max(30, Math.min(90, Math.round(65 + (-delta * 1.5)))),
      cost_per_service:  Math.max(30, Math.min(90, Math.round(75 - (mtd / Math.max(svcs, 1) / 500)))),
      stability:         Math.max(30, Math.min(90, Math.round(80 - Math.abs(delta) * 2))),
      optimization:      Math.max(40, Math.min(85, Math.round(62 + svcs * 0.5))),
    };
  }
  const s = { aws: score('aws'), gcp: score('gcp'), azure: score('azure') };
  return [
    { metric: 'Efficiency',         aws: s.aws.efficiency,       gcp: s.gcp.efficiency,       azure: s.azure.efficiency },
    { metric: 'Savings Focus',      aws: s.aws.savings,          gcp: s.gcp.savings,          azure: s.azure.savings },
    { metric: 'Cost/Service',       aws: s.aws.cost_per_service, gcp: s.gcp.cost_per_service, azure: s.azure.cost_per_service },
    { metric: 'MoM Stability',      aws: s.aws.stability,        gcp: s.gcp.stability,        azure: s.azure.stability },
    { metric: 'Optimization Ready', aws: s.aws.optimization,     gcp: s.gcp.optimization,     azure: s.azure.optimization },
  ];
}

function buildSavingsRecs(info) {
  const recs = [];
  ['aws', 'gcp', 'azure'].forEach(p => {
    const d   = info[p] || {};
    const mtd = d.mtd || 0;
    const svcs  = d.services || [];
    const delta = d.delta_pct || 0;
    if (!mtd) return;

    if (p === 'aws' && delta > 8) {
      recs.push({ priority: 'critical', title: 'EC2 Reserved Instance Coverage',
        desc: 'On-demand coverage high. Upgrading to 80%+ 1-year RIs could save ~30-40%.',
        savings: Math.round(mtd * 0.082 * 100) / 100, effort: 'Easy', provider: p });
    }
    if (p === 'azure' && delta > 4) {
      recs.push({ priority: 'high', title: 'Azure Idle VMs detected',
        desc: 'VMs showing <5 % CPU pattern. Schedule auto-stop outside business hours.',
        savings: Math.round(mtd * 0.065 * 100) / 100, effort: 'Easy', provider: p });
    }
    const bq = svcs.find(s => (s.name || '').toLowerCase().includes('bigquery'));
    if (p === 'gcp' && bq) {
      recs.push({ priority: 'high', title: 'GCP BigQuery Slot Optimization',
        desc: 'Flat-rate slots often underutilised off-peak. Switch to on-demand billing.',
        savings: Math.round((bq.cost || 0) * 0.12 * 100) / 100, effort: 'Medium', provider: p });
    }
    const storageSvc = svcs.find(s => ['s3','storage','blob','gcs'].some(k => (s.name||'').toLowerCase().includes(k)));
    if (storageSvc) {
      recs.push({ priority: 'medium', title: `${p.toUpperCase()} Storage Intelligent-Tiering`,
        desc: 'Move infrequently accessed data to cheaper storage tiers.',
        savings: Math.round((storageSvc.cost || 0) * 0.22 * 100) / 100, effort: 'Easy', provider: p });
    }
    // General: always add a compute right-sizing tip if no specific rec was added
    if (!recs.find(r => r.provider === p) && mtd > 500) {
      recs.push({ priority: 'low', title: `${p.toUpperCase()} Compute Right-Sizing`,
        desc: 'Review instance/VM sizes against actual CPU/memory metrics and right-size.',
        savings: Math.round(mtd * 0.07 * 100) / 100, effort: 'Medium', provider: p });
    }
  });
  recs.sort((a, b) => b.savings - a.savings);
  recs.forEach((r, i) => { r.id = i + 1; });
  return recs;
}

function buildComparison(providers, overview, trend, mode) {
  const daysElapsed = Math.max(new Date().getDate(), 1);
  const totalMtd = ['aws', 'gcp', 'azure'].reduce((s, p) => s + (providers[p]?.mtd || 0), 0);

  // Build providers_info (same shape as Python)
  const info = {};
  ['aws', 'gcp', 'azure'].forEach(p => {
    const pd = providers[p] || {};
    const mtd = pd.mtd || 0;
    info[p] = {
      mtd,
      delta_pct:  pd.delta_pct || 0,
      share:      totalMtd > 0 ? Math.round(mtd / totalMtd * 100) : 0,
      services:   pd.services || [],
      connected:  mode === 'real' && !pd._not_connected,
      real_data:  mode === 'real' && !pd._not_connected,
    };
  });

  // Provider stats
  const providerStats = {};
  ['aws', 'gcp', 'azure'].forEach(p => {
    const d    = info[p];
    const mtd  = d.mtd;
    const svcs = d.services;
    const delta = d.delta_pct;
    const topSvc = svcs[0] || {};
    const savings = Math.round(mtd * 0.12 * 100) / 100;
    providerStats[p] = {
      mtd:               mtd,
      share_pct:         d.share,
      delta_pct:         Math.round(delta * 10) / 10,
      efficiency_score:  Math.max(40, Math.min(92, Math.round(72 - delta + (delta < 0 ? 3 : 0)))),
      savings_potential: savings,
      cost_per_service:  mtd / Math.max(svcs.length, 1),
      top_service:       topSvc.name || '—',
      top_service_cost:  topSvc.cost || 0,
      services_count:    svcs.length,
      connected:         d.connected,
      real_data:         d.real_data,
    };
  });

  // Summary
  const totalSavings = ['aws','gcp','azure'].reduce((s, p) => s + providerStats[p].savings_potential, 0);
  const mostEfficient = ['aws','gcp','azure'].reduce((best, p) =>
    providerStats[p].cost_per_service < providerStats[best].cost_per_service ? p : best, 'aws');
  const highestSavings = ['aws','gcp','azure'].reduce((best, p) =>
    providerStats[p].savings_potential > providerStats[best].savings_potential ? p : best, 'aws');

  const summary = {
    total_mtd: totalMtd,
    total_savings_potential: totalSavings,
    most_cost_efficient: mostEfficient,
    highest_savings_potential: highestSavings,
  };

  // Monthly comparison — prefer real trend data
  const trendMonths = buildMonthlyFromTrend(trend);
  let monthlyComparison;
  if (trendMonths.length >= 2) {
    monthlyComparison = trendMonths;
  } else {
    const months = 6;
    const hist = { aws: buildMonthlyHistory('aws', months, info.aws.mtd),
                   gcp: buildMonthlyHistory('gcp', months, info.gcp.mtd),
                   azure: buildMonthlyHistory('azure', months, info.azure.mtd) };
    monthlyComparison = Array.from({ length: months }, (_, i) => ({
      label: hist.aws[i].label,
      aws:   hist.aws[i].cost,
      gcp:   hist.gcp[i].cost,
      azure: hist.azure[i].cost,
      total: hist.aws[i].cost + hist.gcp[i].cost + hist.azure[i].cost,
    }));
  }

  // Budget analysis
  const DEFAULT_BUDGETS = { aws: 25000, gcp: 12000, azure: 8000 };
  const budgetAnalysis = {};
  ['aws', 'gcp', 'azure'].forEach(p => {
    const mtd   = info[p].mtd;
    const limit = DEFAULT_BUDGETS[p];
    const pct   = limit > 0 ? mtd / limit * 100 : 0;
    budgetAnalysis[p] = {
      limit,
      spend:     mtd,
      remaining: limit - mtd,
      pct:       Math.round(pct * 10) / 10,
      status:    pct >= 100 ? 'danger' : pct >= 80 ? 'warning' : 'ok',
    };
  });

  // Cross-service table
  const crossTable = [];
  ['aws', 'gcp', 'azure'].forEach(p => {
    (info[p].services || []).forEach(svc => {
      const cost = svc.cost || 0;
      crossTable.push({
        provider: p.toUpperCase(),
        service:  svc.name || '—',
        monthly:  cost,
        daily:    Math.round(cost / daysElapsed * 100) / 100,
        pct_of_provider: svc.pct || 0,
      });
    });
  });
  crossTable.sort((a, b) => b.monthly - a.monthly);

  return {
    providers:              providerStats,
    summary,
    radar:                  buildRadar(info),
    monthly_comparison:     monthlyComparison,
    budget_analysis:        budgetAnalysis,
    savings_recommendations: buildSavingsRecs(info),
    cross_service_table:    crossTable,
    source:                 mode,
  };
}

// ─── Sub-components ───────────────────────────────────────────────────

function SummaryBanner({ summary, mode }) {
  if (!summary) return null;
  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', gap: 12,
      padding: '14px 18px',
      background: 'linear-gradient(135deg, #f8faff 0%, #eef2ff 100%)',
      borderRadius: 10, border: '1px solid #e2e8f5', marginBottom: 18,
    }}>
      <div style={{ flex: 1, minWidth: 160 }}>
        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>TOTAL MTD (ALL CLOUDS)</div>
        <div style={{ fontSize: 26, fontWeight: 800, color: '#1a1a2e' }}>{fmt(summary.total_mtd)}</div>
      </div>
      <div style={{ flex: 1, minWidth: 160 }}>
        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>TOTAL SAVINGS POTENTIAL</div>
        <div style={{ fontSize: 26, fontWeight: 800, color: '#22c55e' }}>{fmt(summary.total_savings_potential)}<span style={{ fontSize: 13, fontWeight: 500 }}>/mo</span></div>
      </div>
      <div style={{ flex: 1, minWidth: 160 }}>
        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>MOST COST EFFICIENT</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: COLORS[summary.most_cost_efficient] || '#1a1a2e' }}>
          {(summary.most_cost_efficient || '—').toUpperCase()}
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 160 }}>
        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>HIGHEST SAVINGS OPP.</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: COLORS[summary.highest_savings_potential] || '#1a1a2e' }}>
          {(summary.highest_savings_potential || '—').toUpperCase()}
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 160, display: 'flex', alignItems: 'center' }}>
        <span style={{
          background: mode === 'real' ? '#dcfce7' : '#f1f5f9',
          color: mode === 'real' ? '#15803d' : '#64748b',
          padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700,
        }}>
          {mode === 'real' ? 'LIVE DATA' : 'ESTIMATED'}
        </span>
      </div>
    </div>
  );
}

function ProviderSummaryCards({ providers, summary }) {
  return (
    <div className="three-col" style={{ gap: 12 }}>
      {['aws', 'gcp', 'azure'].map(p => {
        const info = providers[p] || {};
        return (
          <Card key={p}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: COLORS[p], textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <ProviderLogo provider={p} size={14} /> {p.toUpperCase()}
                </div>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#1a1a2e', lineHeight: 1.1 }}>
                  {fmt(info.mtd)}
                </div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                  MTD · {info.share_pct ?? '—'}% of total
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: (info.delta_pct ?? 0) > 0 ? '#ef4444' : '#22c55e' }}>
                  {(info.delta_pct ?? 0) > 0 ? '▲' : '▼'} {Math.abs(info.delta_pct ?? 0)}%
                </div>
                <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>vs last month</div>
              </div>
            </div>
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: '#64748b' }}>Efficiency Score</span>
                <span style={{ fontWeight: 700 }}>{info.efficiency_score ?? '—'}/100</span>
              </div>
              <div style={{ height: 6, background: '#f0f4ff', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: `${info.efficiency_score ?? 0}%`, height: '100%', background: `linear-gradient(90deg, ${COLORS[p]}, ${COLORS[p]}99)`, borderRadius: 4 }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 4 }}>
                <span style={{ color: '#64748b' }}>Savings Potential</span>
                <span style={{ fontWeight: 700, color: '#22c55e' }}>{fmt(info.savings_potential)}/mo</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: '#64748b' }}>Top Service</span>
                <span style={{ fontWeight: 600, maxWidth: 140, textAlign: 'right', lineHeight: 1.3 }}>
                  {info.top_service ?? '—'} ({fmt(info.top_service_cost)})
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: '#64748b' }}>Services</span>
                <span style={{ fontWeight: 600 }}>{info.services_count ?? 0} tracked</span>
              </div>
            </div>
            <div style={{ marginTop: 12, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {summary?.most_cost_efficient === p && <Badge label="Most Efficient" color="#22c55e" />}
              {summary?.highest_savings_potential === p && <Badge label="Top Savings" color="#f97316" />}
              {info.real_data && <Badge label="Live Data" color="#4285F4" />}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function MonthlyComparisonChart({ data }) {
  if (!data?.length) return null;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 4 }}>
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} />
        <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => `$${(v/1000).toFixed(0)}K`} />
        <Tooltip formatter={(v, name) => [fmt(v), name.toUpperCase()]} />
        <Legend formatter={v => v.toUpperCase()} />
        <Bar dataKey="aws"   fill={COLORS.aws}   radius={[3,3,0,0]} name="aws"   />
        <Bar dataKey="gcp"   fill={COLORS.gcp}   radius={[3,3,0,0]} name="gcp"   />
        <Bar dataKey="azure" fill={COLORS.azure} radius={[3,3,0,0]} name="azure" />
      </BarChart>
    </ResponsiveContainer>
  );
}

function ProviderRadar({ data }) {
  if (!data?.length) return null;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <RadarChart data={data}>
        <PolarGrid stroke="#e2e8f5" />
        <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: '#64748b' }} />
        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9, fill: '#94a3b8' }} />
        <Radar name="AWS"   dataKey="aws"   stroke={COLORS.aws}   fill={COLORS.aws}   fillOpacity={0.18} strokeWidth={2} />
        <Radar name="GCP"   dataKey="gcp"   stroke={COLORS.gcp}   fill={COLORS.gcp}   fillOpacity={0.18} strokeWidth={2} />
        <Radar name="Azure" dataKey="azure" stroke={COLORS.azure} fill={COLORS.azure} fillOpacity={0.18} strokeWidth={2} />
        <Legend />
        <Tooltip />
      </RadarChart>
    </ResponsiveContainer>
  );
}

function BudgetAnalysis({ budgets }) {
  if (!budgets) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {['aws', 'gcp', 'azure'].map(p => {
        const b = budgets[p] || {};
        const statusColor = BUDGET_COLOR[b.status] || '#64748b';
        return (
          <div key={p}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: COLORS[p], textTransform: 'uppercase' }}>{p}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: statusColor }}>{b.pct ?? 0}% used</span>
            </div>
            <div style={{ height: 8, background: '#f0f4ff', borderRadius: 4, overflow: 'hidden', marginBottom: 4 }}>
              <div style={{ width: `${Math.min(b.pct ?? 0, 100)}%`, height: '100%', background: statusColor, borderRadius: 4, transition: 'width 0.4s ease' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b' }}>
              <span>{fmt(b.spend)} spent</span>
              <span>{fmt(b.remaining)} remaining of {fmt(b.limit)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SavingsRecommendations({ recs }) {
  if (!recs?.length) return <div style={{ color: '#94a3b8', fontSize: 12 }}>No recommendations found.</div>;
  const total = recs.reduce((s, r) => s + (r.savings || 0), 0);
  return (
    <div>
      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>
        Total potential savings: <strong style={{ color: '#22c55e' }}>{fmt(total)}/mo</strong>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {recs.map(r => (
          <div key={r.id} style={{
            padding: '12px 14px',
            border: `1px solid ${PRIORITY_COLOR[r.priority] || '#e2e8f5'}33`,
            borderLeft: `3px solid ${PRIORITY_COLOR[r.priority] || '#e2e8f5'}`,
            borderRadius: 8, background: '#fafbff',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <Badge label={r.priority} color={PRIORITY_COLOR[r.priority] || '#64748b'} />
                  <Badge label={(r.provider || '').toUpperCase()} color={COLORS[r.provider] || '#64748b'} />
                  <Badge label={r.effort} color="#64748b" />
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a2e', marginBottom: 3 }}>{r.title}</div>
                <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.4 }}>{r.desc}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#22c55e' }}>{fmt(r.savings)}</div>
                <div style={{ fontSize: 10, color: '#94a3b8' }}>/ month</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CrossServiceTable({ rows }) {
  if (!rows?.length) return <div style={{ color: '#94a3b8', fontSize: 12 }}>No service data available.</div>;
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ background: '#f8faff' }}>
            {['Provider', 'Service', 'MTD Cost', 'Daily Rate', '% of Provider'].map(h => (
              <th key={h} style={{
                padding: '8px 10px', borderBottom: '1px solid #e2e8f5',
                textAlign: h === 'Provider' || h === 'Service' ? 'left' : 'right',
                fontSize: 10, fontWeight: 600, color: '#64748b',
                textTransform: 'uppercase', letterSpacing: 0.8, whiteSpace: 'nowrap',
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #f0f4ff' }}>
              <td style={{ padding: '8px 10px', fontWeight: 700, color: COLORS[r.provider?.toLowerCase()] || '#374151' }}>{r.provider}</td>
              <td style={{ padding: '8px 10px', color: '#374151', fontFamily: 'monospace', fontSize: 11 }}>{r.service}</td>
              <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600 }}>{fmt(r.monthly)}</td>
              <td style={{ padding: '8px 10px', textAlign: 'right', color: '#64748b' }}>{r.daily ? `$${r.daily}` : '—'}</td>
              <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                <span style={{ background: '#f0f4ff', color: '#64748b', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>
                  {(r.pct_of_provider ?? 0).toFixed(0)}%
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────
export default function CostComparisonPanel({ mode = 'mock', providers = {}, overview = null, trend = [] }) {
  const [activeTab, setActiveTab] = useState('overview');

  const data = useMemo(
    () => buildComparison(providers, overview, trend, mode),
    [providers, overview, trend, mode]
  );

  const SUB_TABS = [
    { id: 'overview', label: 'Overview'    },
    { id: 'radar',    label: 'Performance' },
    { id: 'savings',  label: 'Savings'     },
    { id: 'services', label: 'All Services'},
  ];

  return (
    <div>
      <SummaryBanner summary={data.summary} mode={mode} />

      {/* Sub-tab bar */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 18, borderBottom: '2px solid #e2e8f5', paddingBottom: 0 }}>
        {SUB_TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            padding: '8px 16px', border: 'none',
            borderBottom: activeTab === t.id ? '2px solid #4285F4' : '2px solid transparent',
            background: 'transparent',
            color: activeTab === t.id ? '#4285F4' : '#64748b',
            fontWeight: activeTab === t.id ? 700 : 500,
            fontSize: 13, cursor: 'pointer', marginBottom: -2,
            borderRadius: '4px 4px 0 0', transition: 'all 0.15s',
          }}>{t.label}</button>
        ))}
      </div>

      {/* Overview */}
      {activeTab === 'overview' && (
        <div>
          <ProviderSummaryCards providers={data.providers} summary={data.summary} />
          <div style={{ marginTop: 18 }}>
            <Card>
              <SectionTitle>Monthly Cost Comparison — Side-by-Side</SectionTitle>
              <MonthlyComparisonChart data={data.monthly_comparison} />
            </Card>
          </div>
          <div style={{ marginTop: 14 }}>
            <Card>
              <SectionTitle>Budget Utilisation</SectionTitle>
              <BudgetAnalysis budgets={data.budget_analysis} />
            </Card>
          </div>
        </div>
      )}

      {/* Radar */}
      {activeTab === 'radar' && (
        <div className="two-col" style={{ gap: 14 }}>
          <Card>
            <SectionTitle>Provider Performance Radar</SectionTitle>
            <ProviderRadar data={data.radar} />
          </Card>
          <Card>
            <SectionTitle>Efficiency Scores</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginTop: 8 }}>
              {['aws', 'gcp', 'azure'].map(p => {
                const info = data.providers[p] || {};
                return (
                  <div key={p}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontWeight: 700, color: COLORS[p], textTransform: 'uppercase', fontSize: 12 }}>{p}</span>
                      <span style={{ fontWeight: 800, fontSize: 14 }}>{info.efficiency_score ?? '—'}<span style={{ fontSize: 11, fontWeight: 400, color: '#94a3b8' }}>/100</span></span>
                    </div>
                    <div style={{ height: 10, background: '#f0f4ff', borderRadius: 6, overflow: 'hidden' }}>
                      <div style={{ width: `${info.efficiency_score ?? 0}%`, height: '100%', background: `linear-gradient(90deg, ${COLORS[p]}, ${COLORS[p]}88)`, borderRadius: 6, transition: 'width 0.5s ease' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5, fontSize: 11, color: '#94a3b8' }}>
                      <span>Cost/Service: {fmt(info.cost_per_service)}</span>
                      <span>Savings: {fmt(info.savings_potential)}/mo</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* Savings */}
      {activeTab === 'savings' && (
        <Card>
          <SectionTitle>Cost Savings Recommendations</SectionTitle>
          <SavingsRecommendations recs={data.savings_recommendations} />
        </Card>
      )}

      {/* Services */}
      {activeTab === 'services' && (
        <div>
          <Card>
            <SectionTitle>All Services — Cost Breakdown by Provider</SectionTitle>
            <CrossServiceTable rows={data.cross_service_table} />
          </Card>
          <div style={{ marginTop: 14 }}>
            <Card>
              <SectionTitle>Live Resource Inventory</SectionTitle>
              <AllServicesTable mode={mode} />
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
