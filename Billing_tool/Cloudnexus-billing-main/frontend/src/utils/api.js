function getApiBase() {
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/billing')) {
    return '/billing/api';
  }
  return '/api';
}

function getUid() { return localStorage.getItem('cn_tool_uid') || ''; }

async function request(method, path, body) {
  const uid = getUid();
  const base = getApiBase();
  let finalPath = `${base}${path}`;
  let finalBody = body;

  if (method === 'GET' || method === 'DELETE') {
    if (uid) {
      const sep = finalPath.includes('?') ? '&' : '?';
      finalPath = `${finalPath}${sep}uid=${encodeURIComponent(uid)}`;
    }
  } else {
    if (uid) finalBody = body ? { ...body, uid } : { uid };
  }

  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (finalBody) opts.body = JSON.stringify(finalBody);
  const res = await fetch(finalPath, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || data.message || `HTTP ${res.status}`);
  return data;
}

export const api = {
  getReportSchedule: (email) =>
    request('GET', `/report/schedule?email=${encodeURIComponent(email)}`),

  saveReportSchedule: (email, time) =>
    request('POST', '/report/schedule', { email, time }),

  deleteReportSchedule: (email) =>
    request('DELETE', `/report/schedule/${encodeURIComponent(email)}`),

  sendReportNow: (email) =>
    request('POST', '/report/send-now', { email }),
};
