import axios from 'axios';

// When served under /billing/ (single-tunnel mode), API calls must use /billing/api prefix
// so the main proxy can forward them correctly to the Node.js /billing/api/* routes.
// When served directly on port 3008, the billing Vite proxy rewrites /api/* → /billing/api/*.
function getApiBase() {
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/billing')) {
    return '/billing/api';
  }
  return '/api';
}

function getUid() {
  return localStorage.getItem('cn_tool_uid') || '';
}

function qs(params) {
  const uid = getUid();
  const full = uid ? { ...params, uid } : params;
  return new URLSearchParams(
    Object.entries(full).filter(([, v]) => v !== undefined && v !== null)
  ).toString();
}

function makeApi() {
  return axios.create({ baseURL: '' });
}

export const fetchOverview    = (mode) => makeApi().get(`${getApiBase()}/overview?${qs({ mode })}`).then(r => r.data);
export const fetchProvider    = (p, mode) => makeApi().get(`${getApiBase()}/provider/${p}?${qs({ mode })}`).then(r => r.data);
export const fetchTrend       = (mode, days=7) => makeApi().get(`${getApiBase()}/trend?${qs({ mode, days })}`).then(r => r.data);
export const fetchForecast    = (mode) => makeApi().get(`${getApiBase()}/forecast?${qs({ mode })}`).then(r => r.data);
export const fetchAlerts      = (mode) => makeApi().get(`${getApiBase()}/alerts?${qs({ mode })}`).then(r => r.data);
export const exportCSV        = (mode) => { window.open(`${getApiBase()}/export/csv?${qs({ mode })}`, '_blank'); };
export const exportJSON       = (mode) => { window.open(`${getApiBase()}/export/json?${qs({ mode })}`, '_blank'); };
export const fetchInvoices    = (provider, mode) => makeApi().get(`${getApiBase()}/invoices/${provider}?${qs({ mode })}`).then(r => r.data);
export const fetchMonthlyTrend = (mode) => makeApi().get(`${getApiBase()}/trend/monthly?${qs({ mode })}`).then(r => r.data);

export const fetchCostComparison = (mode) => makeApi().get(`${getApiBase()}/cost-comparison?${qs({ mode })}`).then(r => r.data);
export const fetchAnalysis       = (mode) => makeApi().get(`${getApiBase()}/analysis?${qs({ mode })}`).then(r => r.data);
export const fetchNamedResources = (mode) => makeApi().get(`${getApiBase()}/resources/named?${qs({ mode })}`).then(r => r.data);
