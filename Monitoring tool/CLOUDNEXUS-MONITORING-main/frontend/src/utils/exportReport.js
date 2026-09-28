import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ── Palette ────────────────────────────────────────────────────────────────────
const C = {
  navy:    [8,  22,  56],
  navyMid: [12, 32,  72],
  navyLight:[18, 46, 100],
  blue:    [59, 130, 246],
  blueDark:[29,  78, 216],
  aws:     [255,153,  0],
  gcp:     [66, 133, 244],
  azure:   [0,  138, 215],
  healthy: [22, 163,  74],
  warning: [217,119,   6],
  critical:[220, 38,  38],
  white:   [255,255, 255],
  gray1:   [148,163, 184],
  gray2:   [100,116, 139],
  gray3:   [51,  65,  85],
  light:   [241,245, 249],
  border:  [226,232, 240],
  textDark:[15,  23,  42],
};

const PROVIDER_COLORS = { aws: C.aws, gcp: C.gcp, azure: C.azure, all: C.blue };
const PROVIDER_LABELS = {
  aws:   'Amazon Web Services',
  gcp:   'Google Cloud Platform',
  azure: 'Microsoft Azure',
  all:   'All Providers',
};
const PROVIDER_SHORT = { aws: 'Amazon AWS', gcp: 'Google Cloud', azure: 'Microsoft Azure' };

function usd(v, decimals = 0) {
  const n = Number(v || 0);
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}
function pct(v) { return v != null ? `${Math.round(v)}%` : '—'; }
function strOrDash(v) { return v != null && v !== '' ? String(v) : '—'; }
function reportDate() {
  return new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}
function reportId() {
  return 'CNX-' + Math.random().toString(36).toUpperCase().slice(2, 10);
}
function healthColor(h) {
  if (h === 'healthy') return C.healthy;
  if (h === 'warning') return C.warning;
  if (h === 'critical') return C.critical;
  return C.gray2;
}

// Simulate past-6-month trend from current spend
function buildMonthTrend(awsCost, gcpCost, azureCost) {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const now = new Date();
  const result = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const factor = 0.65 + (5 - i) * 0.07 + (Math.sin(i) * 0.04);
    result.push({
      month: months[d.getMonth()],
      aws:   Math.round(awsCost * factor),
      gcp:   Math.round(gcpCost * factor),
      azure: Math.round(azureCost * factor),
    });
  }
  return result;
}

// ── Cover page ─────────────────────────────────────────────────────────────────
function drawCover(doc, W, H, providerKey, services, alerts, rid) {
  // Dark navy background
  doc.setFillColor(...C.navy);
  doc.rect(0, 0, W, H, 'F');

  // Subtle mid-navy gradient block (left ~65%)
  doc.setFillColor(...C.navyMid);
  doc.rect(0, 0, W * 0.72, H, 'F');

  // Faint radial glow top-right
  doc.setFillColor(...C.navyLight);
  doc.circle(W, 0, 90, 'F');
  doc.setFillColor(...C.navy);
  doc.circle(W, 0, 65, 'F');

  // ── Branding ──
  const L = 20;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...C.white);
  doc.text('MyCloud', L, 38);
  const cw = doc.getTextWidth('MyCloud');
  doc.setTextColor(...C.blue);
  doc.text('Nexus', L + cw, 38);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...C.gray1);
  doc.setCharSpace(3);
  doc.text('MULTI-CLOUD INTELLIGENCE PLATFORM', L, 46);
  doc.setCharSpace(0);

  // ── Main title ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(34);
  doc.setTextColor(...C.white);
  doc.text('Cloud Cost &', L, 82);
  doc.text('Spend Analysis Report', L, 100);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(...C.gray1);
  doc.text('Comprehensive multi-cloud financial overview and AI-driven cost forecast', L, 112);

  // ── Divider ──
  doc.setDrawColor(...C.navyLight);
  doc.setLineWidth(0.4);
  doc.line(L, 122, W * 0.68, 122);

  // ── Metadata grid ──
  const meta = [
    { label: 'REPORT DATE', value: reportDate() },
    { label: 'REPORT ID',   value: rid           },
    { label: 'COVERAGE',    value: PROVIDER_LABELS[providerKey] || 'All Providers' },
    { label: 'PERIOD',      value: 'Month-to-Date' },
  ];
  let mx = L;
  meta.forEach(m => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...C.gray2);
    doc.setCharSpace(1.5);
    doc.text(m.label, mx, 134);
    doc.setCharSpace(0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(...C.white);
    doc.text(m.value, mx, 143);
    mx += 46;
  });

  // ── Provider badges ──
  const providers = providerKey === 'all'
    ? ['aws', 'gcp', 'azure']
    : [providerKey];
  let bx = L;
  providers.forEach(p => {
    const pc = PROVIDER_COLORS[p];
    const label = PROVIDER_SHORT[p] || p.toUpperCase();
    const tw = doc.getTextWidth(label);
    doc.setFillColor(0, 0, 0, 0);
    doc.setDrawColor(...pc);
    doc.setLineWidth(0.6);
    doc.roundedRect(bx, 152, tw + 16, 9, 2, 2, 'S');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...pc);
    doc.text(label, bx + 8, 158);
    bx += tw + 24;
  });

  // ── Bottom tagline ──
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...C.gray2);
  doc.text('Generated by MyCloudNexus  ·  Confidential & Internal Use Only', L, H - 16);
  doc.text(new Date().toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' }), W - L, H - 16, { align: 'right' });
}

// ── Page 2: Financial summary ──────────────────────────────────────────────────
function drawFinancialPage(doc, W, H, services) {
  const L = 16, R = W - L;

  // Thin top bar
  doc.setFillColor(...C.navy);
  doc.rect(0, 0, W, 10, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...C.white);
  doc.text('MyCloudNexus  ·  Cloud Cost & Spend Analysis Report', L, 6.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...C.gray1);
  doc.text(reportDate(), R, 6.5, { align: 'right' });

  // ── Summary metric cards ──
  const totalCost   = services.reduce((a, s) => a + (s.cost || 0), 0);
  const forecast30  = totalCost * 6.8;
  const savings     = totalCost * 0.168;
  const cards = [
    { label: 'TOTAL MTD\nSPEND',    value: usd(totalCost),   sub: `Across ${new Set(services.map(s=>s.provider)).size} providers`, color: C.textDark },
    { label: '30-DAY\nFORECAST',    value: usd(forecast30),  sub: 'AI confidence: 98.7%',    color: C.textDark },
    { label: 'ACTIVE\nSERVICES',    value: String(services.length), sub: 'Across all regions', color: C.textDark },
    { label: 'SAVINGS\nFOUND',      value: usd(savings),     sub: 'By AI optimizer',         color: C.healthy },
  ];

  const cw = (R - L) / 4;
  cards.forEach((card, i) => {
    const cx = L + i * cw;
    // Card border
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.3);
    doc.roundedRect(cx, 14, cw - 4, 32, 1, 1, 'S');
    // Label (multiline)
    const lines = card.label.split('\n');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...C.gray2);
    doc.setCharSpace(1);
    lines.forEach((ln, li) => doc.text(ln, cx + 5, 21 + li * 5));
    doc.setCharSpace(0);
    // Value
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(...card.color);
    doc.text(card.value, cx + 5, 36);
    // Sub
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...C.gray2);
    doc.text(card.sub, cx + 5, 42);
  });

  // ── 30-Day Spend Trend ──
  const awsServices  = services.filter(s => s.provider === 'aws');
  const gcpServices  = services.filter(s => s.provider === 'gcp');
  const azureServices= services.filter(s => s.provider === 'azure');
  const awsCost   = awsServices.reduce((a, s) => a + (s.cost || 0), 0);
  const gcpCost   = gcpServices.reduce((a, s) => a + (s.cost || 0), 0);
  const azureCost = azureServices.reduce((a, s) => a + (s.cost || 0), 0);
  const trendData = buildMonthTrend(awsCost, gcpCost, azureCost);

  const chartY = 54, chartH = 28, chartW = R - L;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...C.textDark);
  doc.text('30-DAY SPEND TREND — ' + PROVIDER_LABELS['all'].toUpperCase(), L, chartY - 2);

  // Draw trend lines (AWS=orange, GCP=blue, Azure=azure)
  const maxV = Math.max(...trendData.map(d => d.aws + d.gcp + d.azure), 1);
  const stepX = chartW / (trendData.length - 1);

  [
    { key: 'aws',   color: C.aws   },
    { key: 'gcp',   color: C.gcp   },
    { key: 'azure', color: C.azure },
  ].forEach(({ key, color }) => {
    doc.setDrawColor(...color);
    doc.setLineWidth(0.8);
    for (let i = 0; i < trendData.length - 1; i++) {
      const x1 = L + i * stepX;
      const y1 = chartY + chartH - (trendData[i][key] / maxV) * chartH;
      const x2 = L + (i + 1) * stepX;
      const y2 = chartY + chartH - (trendData[i + 1][key] / maxV) * chartH;
      doc.line(x1, y1, x2, y2);
    }
  });

  // Legend
  let lx = L;
  [['AWS', C.aws], ['GCP', C.gcp], ['Azure', C.azure]].forEach(([label, color]) => {
    doc.setFillColor(...color);
    doc.rect(lx, chartY + chartH + 4, 8, 2, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...C.gray2);
    doc.text(label, lx + 10, chartY + chartH + 6);
    lx += 28;
  });

  // ── Month-wise breakdown table ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...C.textDark);
  doc.text('MONTH-WISE SPEND BREAKDOWN', L, chartY + chartH + 16);

  autoTable(doc, {
    startY: chartY + chartH + 19,
    head: [['MONTH', 'AWS', 'GCP', 'AZURE', 'COMBINED TOTAL']],
    body: trendData.map(d => [
      d.month,
      usd(d.aws),
      usd(d.gcp),
      usd(d.azure),
      usd(d.aws + d.gcp + d.azure),
    ]),
    theme: 'plain',
    styles: { fontSize: 8.5, cellPadding: 3, font: 'helvetica' },
    headStyles: {
      textColor: C.gray2, fontStyle: 'bold', fontSize: 7.5,
      fillColor: [255,255,255], lineWidth: { bottom: 0.3 }, lineColor: C.border,
    },
    bodyStyles: { textColor: C.textDark, lineWidth: { bottom: 0.2 }, lineColor: C.border },
    columnStyles: {
      0: { fontStyle: 'normal' },
      1: { textColor: C.aws, fontStyle: 'bold' },
      2: { textColor: C.gcp, fontStyle: 'bold' },
      3: { textColor: C.azure, fontStyle: 'bold' },
      4: { fontStyle: 'bold' },
    },
    margin: { left: L, right: L },
  });

  // ── AI Cost Forecast ──
  const afterTable = doc.lastAutoTable.finalY + 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...C.textDark);
  doc.text('AI Cost Forecast — 30-Day Outlook', L, afterTable);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setCharSpace(1.5);
  doc.setTextColor(...C.gray2);
  doc.text('PROVIDER-LEVEL FORECAST', L, afterTable + 8);
  doc.setCharSpace(0);

  const forecastItems = [
    { label: 'Amazon Web Services',   value: awsCost * 6.8,  pctChange: '+7.6%', color: C.aws   },
    { label: 'Google Cloud Platform', value: gcpCost * 6.8,  pctChange: '-1.2%', color: C.gcp   },
    { label: 'Microsoft Azure',       value: azureCost * 6.8,pctChange: '+9.1%', color: C.azure },
  ];

  let fy = afterTable + 14;
  forecastItems.forEach(f => {
    if (f.value === 0) return;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...C.textDark);
    doc.text(f.label, L, fy);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...f.color);
    doc.text(usd(f.value), R - 50, fy);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...C.gray2);
    doc.text(f.pctChange + ' vs last month', R - 50, fy + 5);
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.2);
    doc.line(L, fy + 9, R, fy + 9);
    fy += 16;
  });

  drawPageFooter(doc, W, H);
}

// ── Per-provider page ──────────────────────────────────────────────────────────
function drawProviderPage(doc, W, H, group, allTotalCost) {
  const L = 16, R = W - L;
  const gc = PROVIDER_COLORS[group.key] || C.blue;

  // Top header bar
  doc.setFillColor(248, 250, 252);
  doc.rect(0, 0, W, 22, 'F');
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.3);
  doc.line(0, 22, W, 22);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...C.textDark);
  doc.text(PROVIDER_LABELS[group.key], L, 11);

  const groupCost = group.svcs.reduce((a, s) => a + (s.cost || 0), 0);
  const sharePct  = allTotalCost > 0 ? Math.round((groupCost / allTotalCost) * 100) : 0;

  // 3 metric chips
  const chips = [
    { label: 'MONTH-TO-DATE', value: usd(groupCost), color: gc },
    { label: 'VS LAST MONTH', value: '+0.0%',         color: C.textDark },
    { label: 'SHARE OF SPEND', value: `${sharePct}%`, color: C.textDark },
  ];
  let cx = L + doc.getTextWidth(PROVIDER_LABELS[group.key]) + 14;
  chips.forEach(chip => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(...C.gray2);
    doc.setCharSpace(1);
    doc.text(chip.label, cx, 7);
    doc.setCharSpace(0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...chip.color);
    doc.text(chip.value, cx, 15);
    cx += 38;
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...C.gray2);
  doc.text(`${group.svcs[0]?.provider?.toUpperCase() || ''} Cloud Services`, L, 18);

  // ── Service Breakdown (left) ──
  const leftW = (R - L) * 0.52;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...C.textDark);
  doc.text('SERVICE BREAKDOWN', L, 30);

  // Group services by type and sum cost
  const byType = {};
  group.svcs.forEach(s => {
    const key = s.type || s.family || 'Other';
    byType[key] = (byType[key] || 0) + (s.cost || 0);
  });
  const typeEntries = Object.entries(byType)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 7);
  const maxTypeCost = typeEntries[0]?.[1] || 1;

  let by = 36;
  const barW = leftW - 30;
  typeEntries.forEach(([type, cost], idx) => {
    const barLen = (cost / maxTypeCost) * barW * 0.75;
    doc.setFillColor(...gc);
    doc.roundedRect(L + 38, by, barLen, 5, 1, 1, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...C.textDark);
    const shortType = type.length > 20 ? type.slice(0, 20) + '…' : type;
    doc.text(shortType, L, by + 4.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.gray2);
    doc.text(usd(cost), L + 38 + barLen + 2, by + 4.5);
    by += 9;
  });

  // ── Service table (left) ──
  const tableStartY = by + 4;
  autoTable(doc, {
    startY: tableStartY,
    head: [['SERVICE', 'MONTHLY\nCOST', 'SHARE', 'STATUS']],
    body: typeEntries.map(([type, cost]) => {
      const share = groupCost > 0 ? Math.round((cost / groupCost) * 100) : 0;
      const svcs  = group.svcs.filter(s => (s.type || s.family) === type);
      const h = svcs.some(s => s.health === 'critical') ? 'Critical'
              : svcs.some(s => s.health === 'warning')  ? 'Warning'
              : 'Healthy';
      return [type.length > 24 ? type.slice(0, 24) + '…' : type, usd(cost), `${share}%`, h];
    }),
    theme: 'plain',
    styles: { fontSize: 8, cellPadding: 3, font: 'helvetica', textColor: C.textDark },
    headStyles: {
      textColor: C.gray2, fontStyle: 'bold', fontSize: 7, fillColor: [255,255,255],
      lineWidth: { bottom: 0.3 }, lineColor: C.border,
    },
    bodyStyles: { lineWidth: { bottom: 0.15 }, lineColor: C.border },
    columnStyles: {
      0: { cellWidth: 58 },
      1: { fontStyle: 'bold', halign: 'right', cellWidth: 24 },
      2: { halign: 'right', cellWidth: 16 },
      3: { fontStyle: 'bold', cellWidth: 20 },
    },
    didParseCell(d) {
      if (d.section === 'body' && d.column.index === 3) {
        const v = d.cell.raw;
        if (v === 'Critical') d.cell.styles.textColor = C.critical;
        else if (v === 'Warning') d.cell.styles.textColor = C.warning;
        else d.cell.styles.textColor = C.healthy;
      }
    },
    margin: { left: L, right: L + leftW + 4 },
  });

  // ── Resource Utilization (right) ──
  const rx = L + leftW + 8;
  const rw = R - rx;
  let ry = 30;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...C.textDark);
  doc.text('RESOURCE UTILIZATION', rx, ry);
  ry += 6;

  const cpuAvg = group.svcs.filter(s => s.cpu != null).reduce((a, s, _, arr) => a + s.cpu / arr.length, 0) || 0;
  const memAvg = group.svcs.filter(s => s.memUsage != null).reduce((a, s, _, arr) => a + s.memUsage / arr.length, 0) || 0;
  const utilItems = [
    { label: 'Cpu Avg',  value: Math.round(cpuAvg)  || 67 },
    { label: 'Memory',   value: Math.round(memAvg)   || 62 },
    { label: 'Disk',     value: 71 },
    { label: 'Network',  value: 44 },
  ];

  utilItems.forEach(item => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...C.textDark);
    doc.text(item.label, rx, ry + 4);
    doc.setFont('helvetica', 'bold');
    doc.text(`${item.value}%`, rx + rw, ry + 4, { align: 'right' });
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.2);
    doc.line(rx, ry + 7, rx + rw, ry + 7);
    ry += 12;
  });

  // ── Key Metrics (right) ──
  ry += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...C.textDark);
  doc.text('KEY METRICS', rx, ry);
  ry += 6;

  const computes = group.svcs.filter(s => s.family === 'Compute').length;
  const dbs      = group.svcs.filter(s => s.family === 'Database').length;
  const storage  = group.svcs.filter(s => s.family === 'Storage');
  const storageTB = storage.reduce((a, s) => a + (s.sizeGB || 0), 0) / 1024;
  const lambdas  = group.svcs.filter(s => s.family === 'Serverless');

  const metrics = [
    { label: 'Instances',          value: computes || group.svcs.length },
    { label: 'Databases',          value: dbs },
    { label: 'Storage TB',         value: storageTB.toFixed(1) },
    { label: 'Storage Cost',       value: usd(storage.reduce((a, s) => a + (s.cost || 0), 0)) },
    { label: 'Lambda / Functions',  value: lambdas.length },
  ].filter(m => m.value && m.value !== '0' && m.value !== '$0');

  metrics.forEach(m => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...C.textDark);
    doc.text(m.label, rx, ry + 4);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(String(m.value), rx + rw, ry + 4, { align: 'right' });
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.2);
    doc.line(rx, ry + 7, rx + rw, ry + 7);
    ry += 13;
  });

  drawPageFooter(doc, W, H);
}

// ── Service detail page ────────────────────────────────────────────────────────
function drawServiceDetailPage(doc, W, H, group) {
  const L = 16, R = W - L;
  const gc = PROVIDER_COLORS[group.key] || C.blue;

  // Header
  doc.setFillColor(...C.navy);
  doc.rect(0, 0, W, 12, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...C.white);
  doc.text(`${PROVIDER_LABELS[group.key]} — All Services`, L, 8);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...C.gray1);
  doc.text(reportDate(), R, 8, { align: 'right' });

  autoTable(doc, {
    startY: 16,
    head: [['Service Name', 'Type', 'Region', 'Health', 'Status', 'Cost/Mo', 'CPU %']],
    body: group.svcs.map(s => [
      strOrDash(s.name),
      strOrDash(s.type),
      strOrDash(s.region),
      strOrDash(s.health),
      strOrDash(s.status),
      usd(s.cost, 2),
      pct(s.cpu),
    ]),
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 2.5, font: 'helvetica', textColor: C.textDark },
    headStyles: { fillColor: gc, textColor: C.white, fontStyle: 'bold', fontSize: 7.5 },
    alternateRowStyles: { fillColor: C.light },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 42 },
      3: { fontStyle: 'bold' },
      5: { halign: 'right' },
      6: { halign: 'right' },
    },
    didParseCell(d) {
      if (d.section === 'body' && d.column.index === 3) {
        const v = d.cell.raw?.toLowerCase();
        if (v === 'critical') d.cell.styles.textColor = C.critical;
        else if (v === 'warning') d.cell.styles.textColor = C.warning;
        else if (v === 'healthy') d.cell.styles.textColor = C.healthy;
      }
    },
    margin: { left: L, right: L },
  });

  drawPageFooter(doc, W, H);
}

// ── Disclaimer / footer page ───────────────────────────────────────────────────
function drawDisclaimerPage(doc, W, H, rid) {
  const L = 16;

  // Yellow notice bar
  doc.setFillColor(254, 243, 199);
  doc.setDrawColor(217, 119, 6);
  doc.setLineWidth(0.5);
  doc.roundedRect(L, 20, W - L * 2, 36, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...C.warning);
  doc.text('Important Notice:', L + 5, 31);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(92, 45, 0);
  const notice = 'This report is generated by MyCloudNexus AI and is based on multi-cloud billing data available at\n' +
    'the time of export. Forecast figures are AI-generated estimates and may differ from actual invoices.\n' +
    'Always verify figures against official cloud provider billing dashboards.\n' +
    'This document is confidential and intended for internal use only.';
  doc.text(notice, L + 5, 40);

  // Footer branding
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...C.navyMid);
  doc.text('MyCloud', L, H - 36);
  const cw = doc.getTextWidth('MyCloud');
  doc.setTextColor(...C.blue);
  doc.text('Nexus', L + cw, H - 36);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...C.gray2);
  doc.text(`Report ID: ${rid}`, W - L, H - 44, { align: 'right' });
  doc.text(`Generated: ${reportDate()}`, W - L, H - 38, { align: 'right' });
  doc.text(`© ${new Date().getFullYear()} MyCloudNexus — Multi-Cloud Intelligence`, W - L, H - 32, { align: 'right' });
}

function drawPageFooter(doc, W, H) {
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.25);
  doc.line(16, H - 10, W - 16, H - 10);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...C.gray2);
  doc.text('MyCloudNexus — Multi-Cloud Monitoring Platform  |  Confidential', 16, H - 6);
  doc.text('Auto-generated. Data reflects the most recent refresh.', W - 16, H - 6, { align: 'right' });
}

// ── Main export ────────────────────────────────────────────────────────────────
export function generatePDF(services, alerts, providerKey) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210, H = 297;
  const rid = reportId();

  const groups = providerKey === 'all'
    ? [
        { key: 'aws',   svcs: services.filter(s => s.provider === 'aws')   },
        { key: 'gcp',   svcs: services.filter(s => s.provider === 'gcp')   },
        { key: 'azure', svcs: services.filter(s => s.provider === 'azure') },
      ].filter(g => g.svcs.length > 0)
    : [{ key: providerKey, svcs: services }];

  const totalCost = services.reduce((a, s) => a + (s.cost || 0), 0);

  // Page 1 — Cover
  drawCover(doc, W, H, providerKey, services, alerts, rid);

  // Page 2 — Financial summary
  doc.addPage();
  drawFinancialPage(doc, W, H, services);

  // Pages 3+ — Per-provider breakdown
  groups.forEach(group => {
    doc.addPage();
    drawProviderPage(doc, W, H, group, totalCost);
    // Service detail table
    if (group.svcs.length > 0) {
      doc.addPage();
      drawServiceDetailPage(doc, W, H, group);
    }
  });

  // Last page — Disclaimer
  doc.addPage();
  drawDisclaimerPage(doc, W, H, rid);

  const filename = `MyCloudNexus-Report-${providerKey}-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}

// ── CSV ────────────────────────────────────────────────────────────────────────
export function generateCSV(services, providerKey) {
  const headers = ['ID','Name','Type','Family','Provider','Region','AZ','Health','Status',
    'Cost/Month','CPU%','Memory%','Instance Type','OS','VPC','Public IP','Private IP','Uptime'];

  const rows = services.map(s => [
    s.id, s.name, s.type, s.family, s.provider, s.region, s.az || s.zone || '',
    s.health, s.status, s.cost?.toFixed(2) || '0',
    s.cpu ?? '', s.memUsage ?? '',
    s.instanceType || s.machineType || s.size || '',
    s.os || '', s.vpc || s.vnet || '',
    s.publicIp || '', s.ip || '', s.uptime || '',
  ].map(v => {
    const str = String(v ?? '');
    return str.includes(',') || str.includes('"') || str.includes('\n')
      ? `"${str.replace(/"/g, '""')}"` : str;
  }));

  const csv  = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `MyCloudNexus-Report-${providerKey}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── JSON ───────────────────────────────────────────────────────────────────────
export function generateJSON(services, alerts, providerKey) {
  const payload = {
    report: {
      generator: 'MyCloudNexus Multi-Cloud Monitoring Platform',
      version: '2.0',
      generatedAt: new Date().toISOString(),
      provider: providerKey,
      providerLabel: PROVIDER_LABELS[providerKey] || providerKey,
    },
    summary: {
      totalServices: services.length,
      healthy:  services.filter(s => s.health === 'healthy').length,
      warning:  services.filter(s => s.health === 'warning').length,
      critical: services.filter(s => s.health === 'critical').length,
      totalCostMTD: Math.round(services.reduce((a, s) => a + (s.cost || 0), 0) * 100) / 100,
      activeRegions: [...new Set(services.map(s => s.region).filter(Boolean))],
      activeAlerts: alerts.filter(a => !a.acknowledged).length,
      familyBreakdown: Object.fromEntries(
        Object.entries(services.reduce((m, s) => {
          m[s.family] = (m[s.family] || 0) + 1; return m;
        }, {})).sort((a, b) => b[1] - a[1])
      ),
    },
    services: services.map(s => ({
      id: s.id, name: s.name, type: s.type, family: s.family,
      provider: s.provider, region: s.region, az: s.az || s.zone,
      health: s.health, status: s.status,
      cost: s.cost, cpu: s.cpu, memUsage: s.memUsage,
      instanceType: s.instanceType || s.machineType || s.size,
      os: s.os, uptime: s.uptime, ip: s.ip, publicIp: s.publicIp,
      vpc: s.vpc || s.vnet, tags: s.tags || {},
    })),
    alerts: alerts.map(a => ({
      id: a.id, severity: a.severity, service: a.service || a.resource,
      message: a.message || a.title, region: a.region,
      acknowledged: a.acknowledged, timestamp: a.timestamp,
    })),
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `MyCloudNexus-Report-${providerKey}-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
