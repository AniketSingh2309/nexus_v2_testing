import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { fmt, COLORS } from '../utils/theme';
import { api } from '../utils/api';

const PROVIDER_LABELS = {
  openai: 'OpenAI', anthropic: 'Anthropic', gemini: 'Gemini',
  azure_openai: 'Azure OpenAI', bedrock: 'AWS Bedrock', vertex_ai: 'Vertex AI',
};

function providerLabel(p) { return PROVIDER_LABELS[p] || p; }

function budgetStatusColor(pct) {
  if (pct >= 100) return 'var(--danger)';
  if (pct >= 70) return 'var(--warning)';
  return 'var(--success)';
}

function groupSum(events, keyFn) {
  const totals = {};
  for (const e of events) {
    const k = keyFn(e) || 'unknown';
    totals[k] = (totals[k] || 0) + (e.costUsd || 0);
  }
  return Object.entries(totals)
    .filter(([, cost]) => cost > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([name, cost], i) => ({ name, cost: Math.round(cost * 100) / 100, fill: COLORS[i % COLORS.length] }));
}

export default function AIBillingPanel() {
  const [events, setEvents] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [groupBy, setGroupBy] = useState('provider');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([api.getAiUsage(), api.getAiBudgets(), api.getAiAlerts()])
      .then(([usageRes, budgetsRes, alertsRes]) => {
        if (cancelled) return;
        setEvents(usageRes.events || []);
        setBudgets(budgetsRes.budgets || []);
        setAlerts(alertsRes.alerts || []);
        setError(null);
      })
      .catch(e => { if (!cancelled) setError(e.message || 'Failed to load AI billing data'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const now = new Date();
  const monthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const prevMonthDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const prevMonthKey = `${prevMonthDate.getUTCFullYear()}-${String(prevMonthDate.getUTCMonth() + 1).padStart(2, '0')}`;

  const { thisMonthTotal, prevMonthTotal } = useMemo(() => {
    let cur = 0, prev = 0;
    for (const e of events) {
      const bucket = (e.periodStart || '').slice(0, 7);
      if (bucket === monthKey) cur += e.costUsd || 0;
      else if (bucket === prevMonthKey) prev += e.costUsd || 0;
    }
    return { thisMonthTotal: cur, prevMonthTotal: prev };
  }, [events, monthKey, prevMonthKey]);

  const deltaPct = prevMonthTotal > 0 ? Math.round(((thisMonthTotal - prevMonthTotal) / prevMonthTotal) * 100) : null;

  const chartData = useMemo(() => {
    const keyFn = groupBy === 'provider' ? e => providerLabel(e.provider)
      : groupBy === 'team' ? e => e.teamOrUser
      : e => e.model;
    return groupSum(events, keyFn).slice(0, 12);
  }, [events, groupBy]);

  if (loading) {
    return <div className="section-card"><div className="section-title">🤖 AI Billing &amp; Usage</div><div style={{ color: 'var(--text3)', fontSize: 13 }}>Loading…</div></div>;
  }

  return (
    <>
      <div className="section-card">
        <div className="section-title">🤖 AI Billing &amp; Usage</div>
        {error && <div style={{ color: 'var(--danger)', fontSize: 12, marginBottom: 10 }}>{error}</div>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 16 }}>
          <div className="metric">
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>Spend this month</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{fmt.usd2(thisMonthTotal)}</div>
            {deltaPct !== null && (
              <div style={{ fontSize: 11, color: deltaPct > 0 ? 'var(--danger)' : 'var(--success)', marginTop: 2 }}>
                {deltaPct > 0 ? '▲' : '▼'} {Math.abs(deltaPct)}% vs last month
              </div>
            )}
          </div>
          <div className="metric">
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>Active budgets</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{budgets.filter(b => b.status === 'active').length}</div>
          </div>
          <div className="metric">
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>Alerts this month</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{alerts.filter(a => (a.sentAt || '').slice(0, 7) === monthKey).length}</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 600 }}>Spend breakdown</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {[['provider', 'Provider'], ['team', 'Team'], ['model', 'Model']].map(([k, l]) => (
              <button key={k} onClick={() => setGroupBy(k)}
                className={`region-btn ${groupBy === k ? 'active' : ''}`}
                style={groupBy === k ? { borderColor: '#7c3aed', color: '#7c3aed', background: 'rgba(124,58,237,0.1)' } : {}}>
                {l}
              </button>
            ))}
          </div>
        </div>
        {chartData.length === 0 ? (
          <div style={{ color: 'var(--text3)', fontSize: 12, padding: '20px 0', textAlign: 'center' }}>
            No AI usage data yet — connect a provider key from the Admin Portal to start collecting spend data.
          </div>
        ) : (
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 40, bottom: 4, left: 90 }}>
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `$${v}`} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={86} />
                <Tooltip formatter={v => [`$${v}`, 'Cost']} contentStyle={{ fontSize: 12, borderRadius: 6 }} />
                <Bar dataKey="cost" radius={[0, 4, 4, 0]}>
                  {chartData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="section-card">
        <div className="section-title">Budget status</div>
        {budgets.length === 0 ? (
          <div style={{ color: 'var(--text3)', fontSize: 12 }}>
            No budgets configured yet. Set spend thresholds per key, team, or org-wide from the Admin Portal.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
            {budgets.map(b => <BudgetCard key={b.id} budget={b} />)}
          </div>
        )}
      </div>

      <div className="section-card">
        <div className="section-title">Alert history</div>
        {alerts.length === 0 ? (
          <div style={{ color: 'var(--text3)', fontSize: 12 }}>No AI budget alerts have fired yet.</div>
        ) : (
          alerts.slice(0, 25).map(a => (
            <div key={a.id} className="alert-row">
              <div style={{
                width: 8, height: 8, borderRadius: '50%', marginTop: 5, flexShrink: 0,
                background: a.level === 'exceeded' ? 'var(--danger)' : 'var(--warning)',
              }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>
                  {a.level === 'exceeded' ? 'Budget exceeded' : 'Budget warning'} — {a.scope === 'org' ? 'organization' : a.scope === 'team' ? `team "${a.scopeId}"` : `key #${a.scopeId}`}
                </div>
                <div className="a-sub">Threshold ${Number(a.thresholdUsd).toFixed(2)} · {a.periodKey} · via {a.channel}</div>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text3)', whiteSpace: 'nowrap' }}>{a.sentAt}</div>
            </div>
          ))
        )}
      </div>
    </>
  );
}

function BudgetCard({ budget }) {
  const [spend, setSpend] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api.getAiUsage({
      team: budget.scope === 'team' ? budget.scopeId : undefined,
    }).then(res => {
      if (cancelled) return;
      const events = res.events || [];
      const relevant = budget.scope === 'key'
        ? events.filter(e => String(e.credentialId) === String(budget.scopeId))
        : events;
      const total = relevant.reduce((sum, e) => sum + (e.costUsd || 0), 0);
      setSpend(total);
    }).catch(() => { if (!cancelled) setSpend(0); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [budget.id]);

  const pct = spend != null && budget.thresholdUsd ? Math.min(999, Math.round((spend / budget.thresholdUsd) * 100)) : 0;
  const color = budgetStatusColor(pct);
  const label = budget.scope === 'org' ? 'Organization' : budget.scope === 'team' ? `Team: ${budget.scopeId}` : `Key #${budget.scopeId}`;

  return (
    <div className="metric">
      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 8, textTransform: 'capitalize' }}>{budget.period} budget</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 6 }}>
        <span style={{ fontSize: 16, fontWeight: 700 }}>{spend == null ? '…' : fmt.usd2(spend)}</span>
        <span style={{ fontSize: 11, color: 'var(--text3)' }}>/ {fmt.usd2(budget.thresholdUsd)}</span>
      </div>
      <div className="usage-bar-bg" style={{ width: '100%', height: 6 }}>
        <div style={{ width: `${Math.min(100, pct)}%`, height: '100%', background: color, borderRadius: 3 }} />
      </div>
      <div style={{ fontSize: 11, color, marginTop: 4, fontWeight: 600 }}>{pct}% used</div>
    </div>
  );
}
