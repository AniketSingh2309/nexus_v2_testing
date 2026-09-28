// src/utils/api.js
const BASE = '/api';

function getUid() { return localStorage.getItem('cn_tool_uid') || ''; }

async function request(method, path, body) {
  const uid = getUid();
  let finalPath = path;
  let finalBody = body;

  if (method === 'GET' || method === 'DELETE') {
    // Append uid as query param
    if (uid) {
      const sep = path.includes('?') ? '&' : '?';
      finalPath = `${path}${sep}uid=${encodeURIComponent(uid)}`;
    }
  } else {
    // POST / PUT: merge uid into body
    if (uid) {
      finalBody = body ? { ...body, uid } : { uid };
    }
  }

  const res = await fetch(`${BASE}${finalPath}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(finalBody ? { body: JSON.stringify(finalBody) } : {}),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Connections
  connect: (provider, creds) => request('POST', `/connect/${provider}`, creds),
  disconnect: (provider) => request('DELETE', `/connect/${provider}`),
  getConnections: () => request('GET', '/connections'),

  // Resources
  getResources: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
    return request('GET', `/resources${qs ? `?${qs}` : ''}`);
  },
  getProviderResources: (provider) => request('GET', `/resources/${provider}`),
  refreshResources: (provider) => request('POST', '/resources/refresh', provider ? { provider } : {}),

  // Stats
  getStats: () => request('GET', '/stats'),

  // Alerts
  getAlerts: () => request('GET', '/alerts'),
  acknowledgeAlert: (id) => request('POST', `/alerts/${id}/acknowledge`),
  acknowledgeAll: () => request('POST', '/alerts/acknowledge-all'),

  // Daily Reports
  getReportSchedule: (email) => request('GET', `/reports/schedule?email=${encodeURIComponent(email)}`),
  saveReportSchedule: (email, time) => request('POST', '/reports/schedule', { email, time }),
  deleteReportSchedule: (email) => request('DELETE', '/reports/schedule', { email }),
  sendReportNow: (email) => request('POST', '/reports/send-now', { email }),

  // S3 on-demand details (objects + policy)
  getS3Details: (bucket, accountId) => request('GET', `/aws/s3-details/${encodeURIComponent(bucket)}${accountId ? `?accountId=${accountId}` : ''}`),

  // Topology
  getTopology: () => request('GET', '/topology'),

  // Metrics
  getResourceMetrics: (id) => request('GET', `/metrics/resource/${encodeURIComponent(id)}`),

  // AI Billing & Usage (read-only here — credential/budget management lives in the Admin Portal)
  getAiUsage: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
    return request('GET', `/ai-billing/usage${qs ? `?${qs}` : ''}`);
  },
  getAiBudgets: () => request('GET', '/ai-billing/budgets'),
  getAiAlerts: () => request('GET', '/ai-billing/alerts'),
};
