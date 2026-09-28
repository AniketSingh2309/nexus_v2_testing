// src/utils/theme.js

const _base = import.meta.env.BASE_URL || '/';
export const PROVIDER_META = {
  aws: {
    label: 'AWS', full: 'Amazon Web Services', emoji: '🟠',
    logo: `${_base}logos/aws.svg`,
    color: '#FF9900', bg: 'rgba(255,153,0,0.12)',
  },
  gcp: {
    label: 'GCP', full: 'Google Cloud Platform', emoji: '🔵',
    logo: `${_base}logos/gcp.svg`,
    color: '#4285F4', bg: 'rgba(66,133,244,0.12)',
  },
  azure: {
    label: 'Azure', full: 'Microsoft Azure', emoji: '🔷',
    logo: `${_base}logos/azure.svg`,
    color: '#008AD7', bg: 'rgba(0,138,215,0.12)',
  },
};

export const FAMILY_ICONS = {
  Compute: 'VM', Database: 'DB', Storage: 'ST', Serverless: 'FN',
  Container: 'K8S', Networking: 'NET', CDN: 'CDN', Cache: 'CAC',
  Analytics: 'ANL', Messaging: 'MSG', Security: 'SEC', DevOps: 'OPS',
  Other: 'SVC', default: 'SVC',
};

export const SEVERITY_COLORS = { critical: '#ef4444', warning: '#eab308', info: '#4285F4' };
export const STATUS_COLORS = { healthy: '#22c55e', warning: '#eab308', critical: '#ef4444' };
export const COLORS = ['#4285F4', '#FF9900', '#008AD7', '#22c55e', '#eab308', '#ef4444', '#7c3aed', '#0891b2'];

export const fmt = {
  usd: v => `$${Number(v).toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
  usd2: v => `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
  num: v => Number(v).toLocaleString('en-US'),
  abbr: v => {
    if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
    if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
    if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
    return String(v);
  },
  pct: v => `${Math.round(v)}%`,
  bytes: v => {
    if (v >= 1e12) return `${(v / 1e12).toFixed(1)} TB`;
    if (v >= 1e9) return `${(v / 1e9).toFixed(1)} GB`;
    if (v >= 1e6) return `${(v / 1e6).toFixed(1)} MB`;
    return `${(v / 1e3).toFixed(1)} KB`;
  },
};
