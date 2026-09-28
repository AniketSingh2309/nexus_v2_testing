export const SEVERITY_COLORS = {
  critical: { bg: 'rgba(239,68,68,0.1)',   color: '#dc2626', border: 'rgba(239,68,68,0.3)'   },
  warning:  { bg: 'rgba(234,179,8,0.1)',   color: '#92400e', border: 'rgba(234,179,8,0.3)'   },
  info:     { bg: 'rgba(59,130,246,0.1)',  color: '#1d4ed8', border: 'rgba(59,130,246,0.3)'  },
};

export const COLORS = {
  aws:   '#FF9900',
  awsBg: '#FFF4E0',
  gcp:   '#4285F4',
  gcpBg: '#E8F0FE',
  azure: '#008AD7',
  azureBg: '#E0F2FF',
  success: '#22c55e',
  warning: '#eab308',
  danger:  '#ef4444',
  info:    '#4285F4',
  muted:   'rgba(0,0,0,0.45)',
};

export const PROVIDER_META = {
  aws:   { label: 'AWS',   color: COLORS.aws,   bg: COLORS.awsBg   },
  gcp:   { label: 'GCP',   color: COLORS.gcp,   bg: COLORS.gcpBg   },
  azure: { label: 'Azure', color: COLORS.azure, bg: COLORS.azureBg },
};

export const fmt = {
  usd:  (v) => '$' + Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  pct:  (v) => (v > 0 ? '+' : '') + Number(v).toFixed(1) + '%',
  num:  (v) => Number(v).toLocaleString(),
  abbr: (v) => v >= 1e6 ? (v/1e6).toFixed(1)+'M' : v >= 1e3 ? (v/1e3).toFixed(1)+'K' : String(v),
};

export const chartDefaults = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
};

export function gridY(hex = 'rgba(0,0,0,0.05)') {
  return { grid: { color: hex }, ticks: { font: { size: 10 } } };
}
export function noGridX() {
  return { grid: { display: false }, ticks: { font: { size: 10 } } };
}
