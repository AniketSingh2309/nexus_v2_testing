import React, { useMemo } from 'react';

const COLORS = { aws: '#FF9900', gcp: '#4285F4', azure: '#008AD7' };
const ACCENTS = { aws: '#FF9900', gcp: '#4285F4', azure: '#008AD7', combined: '#64748b' };

function Card({ title, subtitle, accent, children }) {
  return (
    <div className="section-card">
      <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ width: 10, height: 10, borderRadius: 999, background: accent, display: 'inline-block' }} />
        {title}
      </div>
      {subtitle && <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>{subtitle}</div>}
      <div style={{ marginTop: 10 }}>{children}</div>
    </div>
  );
}

function Money({ value }) {
  if (value === null || value === undefined) return <span>—</span>;
  const n = Number(value);
  if (!isFinite(n)) return <span>—</span>;
  return <span>${n.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 })}</span>;
}

function fmtConn(c) {
  if (c === 'connected')        return 'Connected';
  if (c === 'disconnected')     return 'Not connected';
  if (c === 'data_unavailable') return 'Data unavailable';
  return c || '—';
}

function tipsFor(cloud, service) {
  const s = (service || '').toLowerCase();
  const tips = [];
  if (s.includes('ec2') || s.includes('compute') || s.includes('vm') || s.includes('instance')) {
    tips.push('Enable autoscaling with sensible min/max bounds and cooldown periods.');
    tips.push('Right-size instance types based on actual CPU/memory utilisation.');
    tips.push('Use Savings Plans or Reserved Instances for steady-state workloads.');
  } else if (s.includes('s3') || s.includes('storage') || s.includes('blob') || s.includes('gcs')) {
    tips.push('Apply lifecycle policies (tier to IA/Archive after 30–90 days).');
    tips.push('Delete unattached volumes, old snapshots, and orphaned buckets.');
    tips.push('Enable compression and deduplication where supported.');
  } else if (s.includes('rds') || s.includes('database') || s.includes('sql') || s.includes('spanner')) {
    tips.push('Right-size DB instances and enable storage autoscaling.');
    tips.push('Use Multi-AZ only for production; single-AZ for dev/test.');
    tips.push('Enable auto-pause for Aurora Serverless in non-prod environments.');
  } else if (s.includes('network') || s.includes('nat') || s.includes('egress') || s.includes('transfer')) {
    tips.push('Use VPC endpoints to keep traffic off the public internet.');
    tips.push('Review inter-AZ traffic — co-locate services in the same AZ where latency allows.');
    tips.push('Cache static assets via CDN to reduce data-transfer charges.');
  } else if (s.includes('lambda') || s.includes('function') || s.includes('cloud run')) {
    tips.push('Tune memory and timeout settings — Lambda charges per GB-second.');
    tips.push('Use Provisioned Concurrency only for latency-critical paths.');
    tips.push('Review invocation patterns for batch consolidation opportunities.');
  } else {
    tips.push('Review top sub-services in the console and eliminate orphaned resources.');
    tips.push('Set budget alerts at 80 % and 100 % to catch spend drift early.');
    tips.push('Enforce cost-allocation tags for accurate chargeback.');
  }
  if (cloud === 'aws')   tips.push('Check Cost Explorer → RI/Savings Plans recommendations tab.');
  if (cloud === 'gcp')   tips.push('Evaluate Committed Use Discounts (CUDs) for predictable workloads.');
  if (cloud === 'azure') tips.push('Review Azure Advisor cost recommendations in the portal.');
  return tips.slice(0, 4);
}

function buildAnalysis(providers, mode) {
  const isReal = mode === 'real';
  const daysElapsed = Math.max(new Date().getDate(), 1);
  const recs = [];

  ['aws', 'gcp', 'azure'].forEach(cloud => {
    const p = providers[cloud];
    if (!p || p._not_connected) return;
    const services = p.services || [];
    const mtd = p.mtd || 0;

    services.slice(0, 5).forEach(svc => {
      // Use direct service cost if available, otherwise derive from MTD × pct
      const svcMtd = (svc.cost > 0 ? svc.cost : (mtd * (svc.pct || 0) / 100));
      const dailyCost  = svcMtd / daysElapsed;
      const monthlyCost = dailyCost * 30;

      recs.push({
        cloud,
        service_name:   svc.name || svc.service || '—',
        region:         cloud === 'aws' ? (svc.region || 'us-east-1') : 'global',
        connectivity:   isReal ? 'connected' : 'estimated',
        user_kept_name: `${cloud.toUpperCase()}: ${svc.name || svc.service || '—'}`,
        daily_cost:   Math.round(dailyCost  * 100) / 100,
        monthly_cost: Math.round(monthlyCost * 100) / 100,
        tips:           tipsFor(cloud, svc.name),
        affected_resources: [],
      });
    });
  });

  // Attach best-competitor reference (cheapest other cloud's top service)
  const cloudOrder = ['aws', 'gcp', 'azure'];
  recs.forEach(rec => {
    const others = cloudOrder.filter(c => c !== rec.cloud);
    let comp = null;
    for (const c of others) {
      const p = providers[c];
      if (!p || p._not_connected) continue;
      const svcs = p.services || [];
      if (!svcs.length) continue;
      const svc = svcs[0];
      const m = p.mtd || 0;
      const svcMtd = svc.cost > 0 ? svc.cost : (m * (svc.pct || 0) / 100);
      comp = {
        cloud: c,
        service_name: svc.name || svc.service || '—',
        monthly_cost: Math.round(svcMtd / daysElapsed * 30 * 100) / 100,
      };
      break;
    }
    rec.competitor = comp || { cloud: null, service_name: null, monthly_cost: null };
  });

  // Sort highest spend first
  recs.sort((a, b) => (b.monthly_cost || 0) - (a.monthly_cost || 0));

  // Build provider cards
  const cards = { combined: { services_running_count: 0, status: isReal ? 'live' : 'estimated' } };
  ['aws', 'gcp', 'azure'].forEach(cloud => {
    const p = providers[cloud];
    const notConn = !p || p._not_connected;
    const count   = notConn ? 0 : (p.services || []).length;
    cards[cloud] = {
      connected:             !notConn,
      services_running_count: count,
      primary_region: cloud === 'aws' ? 'us-east-1' : 'global',
      status: notConn ? 'not_connected' : (isReal ? 'live' : 'estimated'),
    };
    cards.combined.services_running_count += count;
  });

  return { cards, recs };
}

// ── Main component ────────────────────────────────────────────────────────
export default function CrossCloudAnalysis({ mode = 'real', providers = {} }) {
  const { cards, recs } = useMemo(
    () => buildAnalysis(providers, mode),
    [providers, mode]
  );

  const isReal = mode === 'real';
  const grouped = useMemo(() => {
    const out = { aws: [], gcp: [], azure: [] };
    recs.forEach(r => { if (out[r.cloud]) out[r.cloud].push(r); });
    return out;
  }, [recs]);

  function recRow(r, idx) {
    return (
      <div key={`${r.cloud}-${r.service_name}-${idx}`} className="recommendation-row">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 13 }}>
            {r.cloud?.toUpperCase()} · {r.service_name}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text3)' }}>
            {fmtConn(r.connectivity)} · {r.region}
          </div>
        </div>
        <div style={{ marginTop: 6, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 12 }}>Daily rate: <b><Money value={r.daily_cost} /></b></div>
          <div style={{ fontSize: 12 }}>30-day projected: <b><Money value={r.monthly_cost} /></b></div>
        </div>
        {r.tips?.length > 0 && (
          <div style={{ marginTop: 8, fontSize: 12, lineHeight: 1.5 }}>
            <div style={{ fontWeight: 650, marginBottom: 4 }}>Optimisation tips</div>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {r.tips.map((t, i) => <li key={i}>{t}</li>)}
            </ul>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* Source badge */}
      <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          background: isReal ? '#dcfce7' : '#f1f5f9',
          color:      isReal ? '#15803d' : '#64748b',
          padding: '2px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700,
        }}>
          {isReal ? 'LIVE DATA' : 'ESTIMATED'}
        </span>
        <span style={{ fontSize: 12, color: 'var(--text3)' }}>
          {isReal
            ? 'Computed from your real cloud spend data'
            : 'Connect cloud accounts in the top bar to see live analysis'}
        </span>
      </div>

      {/* Provider cards row */}
      <div className="three-col">
        <Card title="Combined" subtitle="All providers" accent={ACCENTS.combined}>
          <div style={{ fontSize: 28, fontWeight: 800 }}>{cards.combined?.services_running_count ?? 0}</div>
          <div style={{ fontSize: 12, color: 'var(--text3)' }}>services tracked</div>
        </Card>
        {['aws', 'gcp', 'azure'].slice(0, 2).map(cloud => (
          <Card key={cloud} title={cloud.toUpperCase()} subtitle="Services (top by spend)" accent={ACCENTS[cloud]}>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{cards[cloud]?.services_running_count ?? 0}</div>
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>
              {cards[cloud]?.primary_region} · {cards[cloud]?.status}
            </div>
          </Card>
        ))}
      </div>

      <div style={{ marginTop: 14 }} />

      <div className="three-col">
        <Card title="AZURE" subtitle="Services (top by spend)" accent={ACCENTS.azure}>
          <div style={{ fontSize: 28, fontWeight: 800 }}>{cards.azure?.services_running_count ?? 0}</div>
          <div style={{ fontSize: 12, color: 'var(--text3)' }}>
            {cards.azure?.primary_region} · {cards.azure?.status}
          </div>
        </Card>

        {/* Recommendations panel — spans 2 columns */}
        <div className="section-card" style={{ gridColumn: 'span 2' }}>
          <div className="section-title">Cost recommendations — per service, per cloud</div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>
            Daily rate = MTD spend ÷ days elapsed · 30-day projection = daily × 30
          </div>
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {recs.length === 0 ? (
              <div className="muted-text">
                {isReal
                  ? 'No service data found. Check that your connected accounts have Cost Explorer / billing permissions.'
                  : 'Connect at least one cloud account to see per-service recommendations.'}
              </div>
            ) : (
              ['aws', 'gcp', 'azure'].flatMap(cloud => {
                const arr = grouped[cloud] || [];
                if (!arr.length) return [];
                return [
                  <div key={cloud}>
                    <div style={{ fontWeight: 800, fontSize: 13, color: COLORS[cloud], marginBottom: 8 }}>
                      {cloud.toUpperCase()}
                    </div>
                    {arr.map((r, i) => recRow(r, i))}
                  </div>,
                ];
              })
            )}
          </div>
        </div>
      </div>

      {/* Comparison table */}
      <div style={{ marginTop: 14 }} className="section-card">
        <div className="section-title">Cross-cloud cost comparison</div>
        <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 6 }}>
          Projected 30-day costs with best competitor mapping per service.
        </div>
        <div style={{ marginTop: 10, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f8faff' }}>
                {['Cloud', 'Service', 'Daily Cost', '30-Day Projection', 'Competitor Cloud', 'Competitor 30-Day'].map(h => (
                  <th key={h} style={{
                    padding: '8px 10px', borderBottom: '1px solid #e2e8f5',
                    textAlign: h === 'Daily Cost' || h.includes('30-Day') ? 'right' : 'left',
                    fontSize: 10, fontWeight: 600, color: '#64748b',
                    textTransform: 'uppercase', letterSpacing: 0.7,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recs.length > 0 ? recs.map((r, i) => {
                const comp = r.competitor || {};
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #f0f4ff' }}>
                    <td style={{ padding: '8px 10px', fontWeight: 700, color: COLORS[r.cloud] || '#374151' }}>
                      {(r.cloud || '').toUpperCase()}
                    </td>
                    <td style={{ padding: '8px 10px', color: '#374151' }}>{r.service_name}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600 }}>
                      <Money value={r.daily_cost} />
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#1a1a2e' }}>
                      <Money value={r.monthly_cost} />
                    </td>
                    <td style={{ padding: '8px 10px', color: COLORS[comp.cloud] || '#94a3b8' }}>
                      {comp.cloud ? comp.cloud.toUpperCase() : '—'}
                      {comp.service_name && comp.cloud ? ` · ${comp.service_name}` : ''}
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', color: '#374151' }}>
                      {comp.monthly_cost != null
                        ? <Money value={comp.monthly_cost} />
                        : <span style={{ color: '#94a3b8' }}>—</span>}
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={6} style={{ padding: 12, color: 'var(--text3)' }}>No data</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
