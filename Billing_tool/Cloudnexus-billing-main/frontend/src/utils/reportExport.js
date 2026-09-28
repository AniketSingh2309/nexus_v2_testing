// Professional MyCloudNexus Report Exporter
// HTML export + PDF export via print dialog

const PROVIDER_LOGO_SVGS = {
  aws: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 44"><text x="3" y="30" font-family="'Arial Black','Helvetica Neue',Arial,sans-serif" font-size="28" font-weight="900" fill="#232F3E" letter-spacing="-2">aws</text><path d="M12,38 C28,47 52,47 68,38" fill="none" stroke="#FF9900" stroke-width="3.2" stroke-linecap="round"/><polygon points="64.5,34.5 72,38 64.5,41.5" fill="#FF9900"/></svg>`,
  gcp: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 86 64"><defs><clipPath id="gc"><path d="M69.5 28.8c-.1-.8-.1-1.6-.1-2.4 0-9.9-8-17.9-17.9-17.9-2.9 0-5.6.7-8 1.9C40.9 6.6 35.6 4 29.7 4 18.7 4 9.8 12.9 9.8 23.9c0 .5 0 1 .1 1.5C4.3 27.2 0 32.7 0 39.2 0 47.8 7 55 15.6 55H71c8 0 14.5-6.5 14.5-14.5 0-7-5-12.9-11.5-13.8z"/></clipPath></defs><rect clip-path="url(#gc)" x="0" y="0" width="86" height="64" fill="#4285F4"/><circle clip-path="url(#gc)" cx="28" cy="20" r="20" fill="#EA4335"/><circle clip-path="url(#gc)" cx="56" cy="14" r="16" fill="#FBBC05"/><circle clip-path="url(#gc)" cx="68" cy="36" r="20" fill="#34A853"/></svg>`,
  azure: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 62 52"><defs><linearGradient id="al" x1="50%" y1="0%" x2="50%" y2="100%"><stop offset="0%" stop-color="#0078D4"/><stop offset="100%" stop-color="#114A8B"/></linearGradient><linearGradient id="ar" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#0090E0"/><stop offset="100%" stop-color="#0078D4"/></linearGradient></defs><path d="M4 48L20 4H32L16 38L4 48Z" fill="url(#al)"/><path d="M20 4H32L58 48H36L28 32L20 4Z" fill="url(#ar)"/></svg>`,
};

function providerLogoImg(provider, size = 40) {
  const svg = PROVIDER_LOGO_SVGS[provider];
  if (!svg) return '';
  const encoded = encodeURIComponent(svg);
  return `<img src="data:image/svg+xml;charset=utf-8,${encoded}" width="${size}" height="${Math.round(size * 0.6)}" style="object-fit:contain;display:inline-block;vertical-align:middle;" alt="${provider.toUpperCase()} logo">`;
}

export function generateReport({ overview, providers, trend, forecast, filter = 'combined' }) {
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const reportId = `CNX-${Date.now().toString(36).toUpperCase()}`;

  const providerList = filter === 'combined'
    ? ['aws', 'gcp', 'azure']
    : [filter];

  const providerMeta = {
    aws:   { label: 'Amazon Web Services', color: '#FF9900', bg: '#FFF4E0', short: 'AWS' },
    gcp:   { label: 'Google Cloud Platform', color: '#4285F4', bg: '#E8F0FE', short: 'GCP' },
    azure: { label: 'Microsoft Azure', color: '#008AD7', bg: '#E0F2FF', short: 'Azure' },
  };

  function usd(v) { return '$' + Number(v || 0).toLocaleString(); }
  function pct(v)  { return (v > 0 ? '+' : '') + Number(v || 0).toFixed(1) + '%'; }

  function miniSparkline(data, color, width = 80, height = 30) {
    if (!data || !data.length) return '';
    const vals = data.map(d => d.total || 0);
    const min = Math.min(...vals), max = Math.max(...vals);
    const range = max - min || 1;
    const points = vals.map((v, i) => {
      const x = (i / (vals.length - 1)) * width;
      const y = height - ((v - min) / range) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
    return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><polyline points="${points}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round"/></svg>`;
  }

  function barChartSVG(services, color, width = 340, height = 160) {
    if (!services || !services.length) return '';
    const maxCost = Math.max(...services.map(s => s.cost));
    const barH = Math.floor((height - 20) / services.length) - 4;
    const bars = services.map((s, i) => {
      const barWidth = Math.round((s.cost / maxCost) * (width - 140));
      const y = i * (barH + 4) + 10;
      return `
        <text x="0" y="${y + barH / 2 + 4}" font-size="10" fill="#555">${s.name}</text>
        <rect x="120" y="${y}" width="${barWidth}" height="${barH}" fill="${color}" rx="2"/>
        <text x="${120 + barWidth + 6}" y="${y + barH / 2 + 4}" font-size="10" fill="#333">$${Number(s.cost).toLocaleString()}</text>
      `;
    }).join('');
    return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${bars}</svg>`;
  }

  function trendSVG(trendData, width = 500, height = 100) {
    if (!trendData || !trendData.length) return '';
    const slice = trendData.slice(-30);
    const providers_keys = ['aws','gcp','azure'];
    const pColors = { aws:'#FF9900', gcp:'#4285F4', azure:'#008AD7' };
    const allVals = slice.flatMap(d => providers_keys.map(p => d[p] || 0));
    const min = 0, max = Math.max(...allVals);
    const range = max - min || 1;
    const lines = providers_keys.map(p => {
      const points = slice.map((d, i) => {
        const x = (i / (slice.length - 1)) * width;
        const y = height - ((d[p] - min) / range) * (height - 10);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      }).join(' ');
      return `<polyline points="${points}" fill="none" stroke="${pColors[p]}" stroke-width="2" stroke-linejoin="round"/>`;
    }).join('');
    return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="overflow:visible">${lines}</svg>`;
  }

  // Month-wise trend table
  function monthlyTrendTable(trendData) {
    if (!trendData || !trendData.length) return '';
    // Group by month label (first 3 chars)
    const months = {};
    trendData.forEach(d => {
      const m = d.date ? d.date.substring(0, 3) : 'Unknown';
      if (!months[m]) months[m] = { aws: 0, gcp: 0, azure: 0, total: 0, days: 0 };
      months[m].aws += d.aws || 0;
      months[m].gcp += d.gcp || 0;
      months[m].azure += d.azure || 0;
      months[m].total += d.total || 0;
      months[m].days += 1;
    });
    const rows = Object.entries(months).map(([m, v]) => `
      <tr>
        <td style="font-weight:600">${m}</td>
        <td style="color:#FF9900;font-weight:600">${usd(Math.round(v.aws))}</td>
        <td style="color:#4285F4;font-weight:600">${usd(Math.round(v.gcp))}</td>
        <td style="color:#008AD7;font-weight:600">${usd(Math.round(v.azure))}</td>
        <td style="font-weight:700">${usd(Math.round(v.total))}</td>
      </tr>
    `).join('');
    return `
      <table class="report-table" style="margin-top:12px">
        <thead><tr>
          <th>Month</th>
          <th style="color:#FF9900">AWS</th>
          <th style="color:#4285F4">GCP</th>
          <th style="color:#008AD7">Azure</th>
          <th>Combined Total</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  const totalMTD = overview?.total_mtd || 0;
  const totalForecast = forecast?.total_30d || overview?.forecast_30d || 0;

  const providerSections = providerList.map(p => {
    const pm = providerMeta[p];
    const pd = providers?.[p];
    if (!pd) return '';
    const services = pd.services || [];
    return `
      <div class="section provider-section" style="border-top: 4px solid ${pm.color};">
        <div class="prov-header" style="background:${pm.bg};">
          <div class="prov-title-block">
            <div style="width:52px;height:32px;display:flex;align-items:center;justify-content:center;background:#fff;border-radius:6px;padding:4px;flex-shrink:0;">
              ${providerLogoImg(p, 44)}
            </div>
            <div>
              <div class="prov-name">${pm.label}</div>
              <div class="prov-sub">${pm.short} Cloud Services</div>
            </div>
          </div>
          <div class="prov-stats">
            <div class="prov-stat">
              <div class="prov-stat-label">Month-to-Date</div>
              <div class="prov-stat-val" style="color:${pm.color}">${usd(pd.mtd)}</div>
            </div>
            <div class="prov-stat">
              <div class="prov-stat-label">vs Last Month</div>
              <div class="prov-stat-val">${pct(pd.delta_pct)}</div>
            </div>
            <div class="prov-stat">
              <div class="prov-stat-label">Share of Spend</div>
              <div class="prov-stat-val">${overview?.providers?.[p]?.share || 0}%</div>
            </div>
          </div>
        </div>

        <div class="section-body">
          <div class="two-col-report">
            <div>
              <div class="sub-heading">Service Breakdown</div>
              ${barChartSVG(services, pm.color)}
              <table class="report-table" style="margin-top:12px">
                <thead><tr><th>Service</th><th>Monthly Cost</th><th>Share</th><th>Status</th></tr></thead>
                <tbody>
                  ${services.map(s => `
                    <tr>
                      <td>${s.name}</td>
                      <td style="font-weight:600">${usd(s.cost)}</td>
                      <td>${s.pct}%</td>
                      <td><span class="status-badge ${s.status}">${s.status}</span></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
            <div>
              <div class="sub-heading">Resource Utilization</div>
              ${Object.entries(pd.utilization || {}).map(([k, v]) => `
                <div class="util-row">
                  <div class="util-label">${k.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</div>
                  <div class="util-bar-wrap">
                    <div class="util-bar" style="width:${v}%;background:${pm.color}"></div>
                  </div>
                  <div class="util-pct">${v}%</div>
                </div>
              `).join('')}

              <div class="sub-heading" style="margin-top:20px">Key Metrics</div>
              ${pd.metrics ? Object.entries(pd.metrics).map(([k, v]) => `
                <div class="kv-row">
                  <span class="kv-key">${k.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</span>
                  <span class="kv-val">${typeof v === 'number' && v > 999 ? v.toLocaleString() : v}</span>
                </div>
              `).join('') : ''}
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  const combinedSection = filter === 'combined' ? `
    <div class="section">
      <div class="sub-heading">30-Day Spend Trend — All Providers</div>
      <div style="margin:12px 0">${trendSVG(trend)}</div>
      <div class="legend-row">
        <span class="legend-item"><span class="legend-dot" style="background:#FF9900"></span>${providerLogoImg('aws', 28)} Amazon Web Services</span>
        <span class="legend-item"><span class="legend-dot" style="background:#4285F4"></span>${providerLogoImg('gcp', 28)} Google Cloud</span>
        <span class="legend-item"><span class="legend-dot" style="background:#008AD7"></span>${providerLogoImg('azure', 28)} Microsoft Azure</span>
      </div>
      <div class="sub-heading" style="margin-top:24px">Month-wise Spend Breakdown</div>
      ${monthlyTrendTable(trend)}
    </div>
  ` : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>MyCloudNexus Report — ${today}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Sora:wght@600;700&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Inter', sans-serif;
      background: #f4f6fa;
      color: #1a1a2e;
      font-size: 13px;
      line-height: 1.6;
      padding: 0;
    }

    .page {
      max-width: 900px;
      margin: 0 auto;
      background: #fff;
      box-shadow: 0 4px 40px rgba(0,0,0,0.12);
    }

    .cover {
      background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%);
      padding: 60px 56px 50px;
      position: relative;
      overflow: hidden;
    }
    .cover::before {
      content: '';
      position: absolute;
      top: -80px; right: -80px;
      width: 400px; height: 400px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(66,133,244,0.18) 0%, transparent 70%);
    }
    .cover::after {
      content: '';
      position: absolute;
      bottom: -60px; left: -60px;
      width: 300px; height: 300px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(255,153,0,0.12) 0%, transparent 70%);
    }
    .cover-logo { font-family: 'Sora', sans-serif; font-size: 28px; font-weight: 700; color: #fff; letter-spacing: -0.5px; margin-bottom: 6px; position: relative; z-index: 1; }
    .cover-logo span { color: #4285F4; }
    .cover-tagline { font-size: 12px; color: rgba(255,255,255,0.5); letter-spacing: 2px; text-transform: uppercase; margin-bottom: 48px; position: relative; z-index: 1; }
    .cover-title { font-family: 'Sora', sans-serif; font-size: 36px; font-weight: 700; color: #fff; line-height: 1.2; margin-bottom: 8px; position: relative; z-index: 1; }
    .cover-subtitle { font-size: 14px; color: rgba(255,255,255,0.6); margin-bottom: 48px; position: relative; z-index: 1; }
    .cover-meta { display: flex; gap: 40px; position: relative; z-index: 1; }
    .cover-meta-label { font-size: 10px; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 1.5px; }
    .cover-meta-val { font-size: 14px; color: rgba(255,255,255,0.85); font-weight: 500; margin-top: 2px; }
    .cover-provider-pills { display: flex; gap: 10px; margin-top: 32px; position: relative; z-index: 1; }
    .cover-pill { padding: 5px 14px; border-radius: 20px; font-size: 11px; font-weight: 600; border: 1px solid; }
    .pill-aws   { color: #FF9900; border-color: rgba(255,153,0,0.4);   background: rgba(255,153,0,0.1);   }
    .pill-gcp   { color: #7BAFF8; border-color: rgba(66,133,244,0.4); background: rgba(66,133,244,0.1); }
    .pill-azure { color: #40AAEE; border-color: rgba(0,138,215,0.4);  background: rgba(0,138,215,0.1);  }

    .exec-bar { background: #f8faff; border-bottom: 1px solid #e2e8f5; padding: 24px 56px; display: flex; gap: 0; }
    .exec-kpi { flex: 1; padding-right: 24px; border-right: 1px solid #e2e8f5; margin-right: 24px; }
    .exec-kpi:last-child { border-right: none; margin-right: 0; padding-right: 0; }
    .exec-kpi-label { font-size: 10px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 4px; }
    .exec-kpi-val { font-size: 26px; font-weight: 700; color: #1a1a2e; font-family: 'Sora', sans-serif; }
    .exec-kpi-sub { font-size: 11px; color: #94a3b8; margin-top: 2px; }

    .section { padding: 32px 56px; border-bottom: 1px solid #f0f4ff; }
    .section-heading { font-family: 'Sora', sans-serif; font-size: 18px; font-weight: 700; color: #1a1a2e; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; }
    .section-heading::after { content: ''; flex: 1; height: 1px; background: linear-gradient(to right, #e2e8f5, transparent); margin-left: 12px; }
    .sub-heading { font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; margin-top: 4px; }

    .provider-section { padding: 0 56px 32px; }
    .prov-header { margin: 0 -56px 24px; padding: 20px 56px; display: flex; align-items: center; justify-content: space-between; }
    .prov-title-block { display: flex; align-items: center; gap: 14px; }
    .prov-dot { width: 14px; height: 14px; border-radius: 50%; flex-shrink: 0; }
    .prov-name { font-family: 'Sora', sans-serif; font-size: 18px; font-weight: 700; color: #1a1a2e; }
    .prov-sub { font-size: 11px; color: #94a3b8; margin-top: 2px; }
    .prov-stats { display: flex; gap: 32px; }
    .prov-stat-label { font-size: 10px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; }
    .prov-stat-val { font-size: 20px; font-weight: 700; font-family: 'Sora', sans-serif; color: #1a1a2e; margin-top: 2px; }

    .report-table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .report-table th { background: #f8faff; padding: 8px 10px; text-align: left; font-size: 10px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.8px; border-bottom: 1px solid #e2e8f5; }
    .report-table td { padding: 8px 10px; border-bottom: 1px solid #f0f4ff; color: #374151; }
    .report-table tr:last-child td { border-bottom: none; }

    .status-badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 600; text-transform: capitalize; }
    .status-badge.healthy { background: rgba(34,197,94,0.12); color: #16a34a; }
    .status-badge.warning { background: rgba(234,179,8,0.12);  color: #92400e; }
    .status-badge.danger  { background: rgba(239,68,68,0.12);  color: #dc2626; }

    .util-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
    .util-label { font-size: 11px; color: #64748b; width: 120px; flex-shrink: 0; }
    .util-bar-wrap { flex: 1; height: 6px; background: #f0f4ff; border-radius: 3px; overflow: hidden; }
    .util-bar { height: 100%; border-radius: 3px; }
    .util-pct { font-size: 11px; font-weight: 600; color: #374151; width: 32px; text-align: right; }

    .kv-row { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #f0f4ff; font-size: 12px; }
    .kv-key { color: #64748b; }
    .kv-val { font-weight: 600; color: #1a1a2e; }

    .two-col-report { display: grid; grid-template-columns: 1.4fr 1fr; gap: 32px; }

    .forecast-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #f0f4ff; }
    .forecast-row:last-child { border-bottom: none; }
    .forecast-prov { font-size: 13px; font-weight: 500; color: #374151; }
    .forecast-val { font-size: 16px; font-weight: 700; font-family: 'Sora', sans-serif; }
    .forecast-delta { font-size: 11px; color: #94a3b8; margin-top: 1px; }

    .legend-row { display: flex; gap: 20px; font-size: 11px; color: #64748b; }
    .legend-item { display: flex; align-items: center; gap: 5px; }
    .legend-dot { display: inline-block; width: 12px; height: 3px; border-radius: 2px; }

    .report-footer { background: #0f172a; padding: 24px 56px; display: flex; align-items: center; justify-content: space-between; }
    .footer-logo { font-family: 'Sora', sans-serif; font-size: 16px; font-weight: 700; color: rgba(255,255,255,0.7); }
    .footer-logo span { color: #4285F4; }
    .footer-meta { font-size: 11px; color: rgba(255,255,255,0.35); text-align: right; }

    .disclaimer { background: #fffbeb; border-top: 2px solid #fef3c7; padding: 16px 56px; font-size: 11px; color: #92400e; line-height: 1.6; }

    @media print {
      body { background: #fff; }
      .page { box-shadow: none; max-width: none; }
      .section { page-break-inside: avoid; }
      .provider-section { page-break-before: always; }
    }
  </style>
</head>
<body>
<div class="page">

  <div class="cover">
    <div class="cover-logo">MyCloud<span>Nexus</span></div>
    <div class="cover-tagline">Multi-Cloud Intelligence Platform</div>
    <div class="cover-title">Cloud Cost &amp;<br/>Spend Analysis Report</div>
    <div class="cover-subtitle">
      ${filter === 'combined' ? 'Comprehensive multi-cloud financial overview and AI-driven cost forecast' : `${providerMeta[filter]?.label} — detailed cost breakdown and resource utilization`}
    </div>
    <div class="cover-meta">
      <div class="cover-meta-item">
        <div class="cover-meta-label">Report Date</div>
        <div class="cover-meta-val">${today}</div>
      </div>
      <div class="cover-meta-item">
        <div class="cover-meta-label">Report ID</div>
        <div class="cover-meta-val">${reportId}</div>
      </div>
      <div class="cover-meta-item">
        <div class="cover-meta-label">Coverage</div>
        <div class="cover-meta-val">${filter === 'combined' ? 'All Providers' : providerMeta[filter]?.label}</div>
      </div>
      <div class="cover-meta-item">
        <div class="cover-meta-label">Period</div>
        <div class="cover-meta-val">Month-to-Date</div>
      </div>
    </div>
    <div class="cover-provider-pills">
      ${providerList.includes('aws')   ? `<span class="cover-pill pill-aws" style="display:inline-flex;align-items:center;gap:6px;">${providerLogoImg('aws', 22)} Amazon Web Services</span>` : ''}
      ${providerList.includes('gcp')   ? `<span class="cover-pill pill-gcp" style="display:inline-flex;align-items:center;gap:6px;">${providerLogoImg('gcp', 22)} Google Cloud</span>` : ''}
      ${providerList.includes('azure') ? `<span class="cover-pill pill-azure" style="display:inline-flex;align-items:center;gap:6px;">${providerLogoImg('azure', 22)} Microsoft Azure</span>` : ''}
    </div>
  </div>

  <div class="exec-bar">
    <div class="exec-kpi">
      <div class="exec-kpi-label">Total MTD Spend</div>
      <div class="exec-kpi-val">${usd(filter === 'combined' ? totalMTD : providers?.[filter]?.mtd)}</div>
      <div class="exec-kpi-sub">Across ${providerList.length} provider${providerList.length > 1 ? 's' : ''}</div>
    </div>
    <div class="exec-kpi">
      <div class="exec-kpi-label">30-Day Forecast</div>
      <div class="exec-kpi-val">${usd(totalForecast)}</div>
      <div class="exec-kpi-sub">AI confidence: ${forecast?.confidence || 89}%</div>
    </div>
    <div class="exec-kpi">
      <div class="exec-kpi-label">Active Services</div>
      <div class="exec-kpi-val">${overview?.active_services || 147}</div>
      <div class="exec-kpi-sub">Across all regions</div>
    </div>
    <div class="exec-kpi">
      <div class="exec-kpi-label">Savings Found</div>
      <div class="exec-kpi-val" style="color:#16a34a">${usd(overview?.savings_found)}</div>
      <div class="exec-kpi-sub">By AI optimizer</div>
    </div>
  </div>

  ${combinedSection}

  <div class="section">
    <div class="section-heading">AI Cost Forecast — 30-Day Outlook</div>
    <div class="sub-heading">Provider-Level Forecast</div>
    ${[
      { key: 'aws',   val: forecast ? Math.round((forecast.total_30d || 58204) * 0.443) : 25810, delta: '+7.6%' },
      { key: 'gcp',   val: forecast ? Math.round((forecast.total_30d || 58204) * 0.328) : 14780, delta: '-1.2%' },
      { key: 'azure', val: forecast ? Math.round((forecast.total_30d || 58204) * 0.229) : 10620, delta: '+9.1%' },
    ].filter(p => providerList.includes(p.key)).map(p => `
      <div class="forecast-row">
        <div class="forecast-prov" style="display:flex;align-items:center;gap:8px;">
          ${providerLogoImg(p.key, 32)}
          ${providerMeta[p.key].label}
        </div>
        <div>
          <div class="forecast-val" style="color:${providerMeta[p.key].color}">${usd(p.val)}</div>
          <div class="forecast-delta">${p.delta} vs last month</div>
        </div>
      </div>
    `).join('')}
  </div>

  ${providerSections}

  <div class="disclaimer">
    <strong>Important Notice:</strong> This report is generated by MyCloudNexus AI and is based on ${filter !== 'combined' ? providerMeta[filter]?.label + ' billing data' : 'multi-cloud billing data'} available at the time of export. Forecast figures are AI-generated estimates and may differ from actual invoices. Always verify figures against official cloud provider billing dashboards. This document is confidential and intended for internal use only.
  </div>

  <div class="report-footer">
    <div class="footer-logo">MyCloud<span>Nexus</span></div>
    <div class="footer-meta">
      <div>Report ID: ${reportId}</div>
      <div>Generated: ${today}</div>
      <div>© ${new Date().getFullYear()} MyCloudNexus — Multi-Cloud Intelligence</div>
    </div>
  </div>

</div>
</body>
</html>`;

  return html;
}

export function exportReport({ overview, providers, trend, forecast, filter = 'combined' }) {
  const html = generateReport({ overview, providers, trend, forecast, filter });
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const filterLabel = filter === 'combined' ? 'All-Providers' : filter.toUpperCase();
  a.download = `MyCloudNexus-Billing-Report-${filterLabel}-${new Date().toISOString().split('T')[0]}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportReportAsPDF({ overview, providers, trend, forecast, filter = 'combined' }) {
  const html = generateReport({ overview, providers, trend, forecast, filter });
  const filterLabel = filter === 'combined' ? 'All-Providers' : filter.toUpperCase();
  const filename = `MyCloudNexus-Billing-Report-${filterLabel}-${new Date().toISOString().split('T')[0]}`;

  const printWindow = window.open('', '_blank', 'width=1000,height=800');
  if (!printWindow) {
    alert('Please allow popups for PDF export.');
    return;
  }
  printWindow.document.write(html);
  printWindow.document.close();

  // Add print-trigger script and auto-download hint
  printWindow.document.title = filename;
  printWindow.addEventListener('load', () => {
    setTimeout(() => {
      printWindow.print();
    }, 800);
  });
}

export function exportAllProvidersPDF({ overview, providers, trend, forecast }) {
  // Combined PDF
  exportReportAsPDF({ overview, providers, trend, forecast, filter: 'combined' });
}

export function exportSeparatePDFs({ overview, providers, trend, forecast }) {
  // Export each provider separately with a small delay between them
  const filters = ['aws', 'gcp', 'azure'];
  filters.forEach((f, i) => {
    setTimeout(() => {
      exportReportAsPDF({ overview, providers, trend, forecast, filter: f });
    }, i * 1500);
  });
}
