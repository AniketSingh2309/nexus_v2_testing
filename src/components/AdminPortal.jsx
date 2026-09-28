import { Fragment, useState, useEffect, useRef } from "react";
import { io as socketIO } from "socket.io-client";

/* ── Icons ── */
const CloudIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>
);
const UsersIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);
const AccessIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);
const PlanIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>
  </svg>
);
const AccountIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
  </svg>
);
const SettingsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
);
const LogoutIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);
const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
);
const CopyIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
);
const TrashIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
);
const DownloadIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
);
const EyeIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
);
const EyeOffIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
);
const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
);
const MonitoringNavIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
);
const BillingNavIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
  </svg>
);
const ArrowRightIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
);
const RestoreIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
    <path d="M3 3v5h5"/>
  </svg>
);
const CloudAccountNavIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>
    <path d="M12 15v3"/><path d="M10 17h4"/>
  </svg>
);
const ConnectorsNavIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="6" cy="12" r="3"/><circle cx="18" cy="6" r="3"/><circle cx="18" cy="18" r="3"/>
    <line x1="8.6" y1="10.7" x2="15.4" y2="7.3"/><line x1="8.6" y1="13.3" x2="15.4" y2="16.7"/>
  </svg>
);
const AiBillingNavIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="4" width="16" height="16" rx="3"/>
    <path d="M9 9h.01M15 9h.01M9 15c.7.8 1.8 1.3 3 1.3s2.3-.5 3-1.3"/>
  </svg>
);
const ProviderLogo = ({ provider, size = 20 }) => (
  <img
    src={`${import.meta.env.BASE_URL}logos/${provider}.svg`}
    alt={provider}
    style={{ width: size, height: size, objectFit: "contain", verticalAlign: "middle" }}
    onError={e => { e.currentTarget.style.display = "none"; }}
  />
);

/* ── Helpers ── */
const USERS_KEY    = "cn_admin_users";
const ACTIVITY_KEY = "cn_user_activity";
const SETTINGS_KEY = "cn_settings";

function getUserPhoto(email) {
  try { return localStorage.getItem(`cn_user_photo_${email}`) || null; } catch { return null; }
}

function getGlobalSettings() {
  try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}"); } catch { return {}; }
}
function saveGlobalSettings(s) {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch {}
}
const ONLINE_MS    = 90 * 1000; // 90 s — two missed 30-s heartbeats → offline

// Profile is keyed per-user so each admin/co-admin keeps their own photo/name
function getAdminProfile(email) {
  try { return JSON.parse(localStorage.getItem(`cn_admin_profile_${email}`)); } catch { return null; }
}
function saveAdminProfile(email, p) {
  try { localStorage.setItem(`cn_admin_profile_${email}`, JSON.stringify(p)); } catch {}
}

function getUsers() {
  try { return JSON.parse(localStorage.getItem(USERS_KEY) || "[]"); } catch { return []; }
}
function saveUsers(list) {
  localStorage.setItem(USERS_KEY, JSON.stringify(list));
}
function getActivity() {
  try { return JSON.parse(localStorage.getItem(ACTIVITY_KEY) || "{}"); } catch { return {}; }
}
function isOnline(act) {
  return !!(act?.lastSeen && (Date.now() - act.lastSeen) < ONLINE_MS);
}
function fmtDuration(ms) {
  if (!ms || ms < 0) return "—";
  const m = Math.floor(ms / 60000);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m`;
  return "<1m";
}
function fmtDateTime(ts) {
  if (!ts) return "Never";
  // SQLite datetime('now') stores UTC without "Z", so browsers parse it as local — wrong.
  // Append "Z" to force UTC interpretation for old-format strings like "2026-06-15 04:10:23".
  // ISO strings already have "Z" or "+" so they parse correctly as-is.
  let d;
  if (typeof ts === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(ts)) {
    d = new Date(ts.replace(' ', 'T') + 'Z');
  } else {
    d = new Date(ts);
  }
  const now  = new Date();
  const yest = new Date(now); yest.setDate(yest.getDate() - 1);
  const time = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  if (d.toDateString() === now.toDateString())  return `Today, ${time}`;
  if (d.toDateString() === yest.toDateString()) return `Yesterday, ${time}`;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) + `, ${time}`;
}
function genPassword() {
  const u = "ABCDEFGHJKMNPQRSTUVWXYZ", l = "abcdefghjkmnpqrstuvwxyz", d = "23456789", s = "@#$!";
  const all = u + l + d + s;
  let p = [u[~~(Math.random()*u.length)], l[~~(Math.random()*l.length)], d[~~(Math.random()*d.length)], s[~~(Math.random()*s.length)]];
  for (let i = 4; i < 12; i++) p.push(all[~~(Math.random()*all.length)]);
  return p.sort(() => Math.random() - 0.5).join("");
}
function fmtDate(ts) {
  if (!ts) return "—";
  const d = typeof ts === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(ts)
    ? new Date(ts.replace(' ', 'T') + 'Z')
    : new Date(ts);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

/* ── CSS ── */
const css = `
.ap-wrap { min-height:100vh; display:flex; font-family:'Inter',-apple-system,sans-serif; background:#f1f5f9; }

/* Sidebar */
.ap-sidebar {
  width:64px; background:#07111f; display:flex; flex-direction:column; align-items:center;
  padding:18px 0 16px; position:fixed; top:0; left:0; bottom:0; z-index:200;
  border-right:1px solid rgba(255,255,255,0.06);
}
.ap-logo-btn {
  width:38px; height:38px; background:#2563eb; border-radius:9px; border:none; cursor:pointer;
  display:flex; align-items:center; justify-content:center; margin-bottom:28px; flex-shrink:0;
}
.ap-nav { display:flex; flex-direction:column; gap:4px; align-items:center; flex:1; }
.ap-nav-btn {
  width:44px; height:44px; border-radius:11px; border:none; background:transparent; cursor:pointer;
  display:flex; align-items:center; justify-content:center; color:rgba(255,255,255,0.45);
  transition:all 0.18s; position:relative;
}
.ap-nav-btn:hover { background:rgba(255,255,255,0.08); color:#fff; }
.ap-nav-btn.ap-active { background:rgba(37,99,235,0.3); color:#60a5fa; }
.ap-nav-tip {
  position:absolute; left:calc(100% + 10px); background:#1e293b; color:#f1f5f9;
  font-size:12px; font-weight:600; padding:5px 11px; border-radius:7px; white-space:nowrap;
  opacity:0; pointer-events:none; transition:opacity 0.15s; z-index:300;
  border:1px solid rgba(255,255,255,0.08);
}
.ap-nav-btn:hover .ap-nav-tip { opacity:1; }
.ap-nav-divider { width:32px; height:1px; background:rgba(255,255,255,0.1); margin:8px 0; flex-shrink:0; }
.ap-nav-btn.tool-monitoring.ap-active { background:rgba(37,99,235,0.3); color:#60a5fa; }
.ap-nav-btn.tool-billing.ap-active   { background:rgba(22,163,74,0.25); color:#4ade80; }
.ap-logout { margin-top:auto; }

/* Tool section */
.ap-tool-launch-card {
  position:relative; border-radius:18px; overflow:hidden; cursor:pointer;
  box-shadow:0 16px 48px rgba(37,99,235,0.14),0 4px 12px rgba(0,0,0,0.08);
  background:#f0f4ff; max-width:620px;
  transition:transform 0.3s ease, box-shadow 0.3s ease;
}
.ap-tool-launch-card:hover { transform:translateY(-4px); box-shadow:0 24px 64px rgba(37,99,235,0.2),0 8px 24px rgba(0,0,0,0.1); }
.ap-tool-launch-card img { width:100%; height:auto; display:block; transition:transform 0.4s ease; }
.ap-tool-launch-card:hover img { transform:scale(1.025); }
.ap-tool-launch-fade { position:absolute; bottom:0; left:0; right:0; height:50%; background:linear-gradient(to bottom,transparent 0%,rgba(255,255,255,0.97) 80%,#fff 100%); pointer-events:none; }
.ap-tool-launch-cta {
  position:absolute; bottom:22px; left:26px; display:inline-flex; align-items:center; gap:10px;
  background:#2563eb; color:#fff; font-size:14px; font-weight:700; font-family:inherit;
  padding:12px 22px; border-radius:10px; border:none; cursor:pointer; z-index:3;
  box-shadow:0 4px 16px rgba(37,99,235,0.35); transition:background 0.2s,transform 0.2s;
}
.ap-tool-launch-cta:hover { background:#1d4ed8; transform:translateY(-2px); }
.ap-tool-launch-cta.billing { background:#16a34a; box-shadow:0 4px 16px rgba(22,163,74,0.35); }
.ap-tool-launch-cta.billing:hover { background:#15803d; }

/* Main */
.ap-main { margin-left:64px; flex:1; min-height:100vh; display:flex; flex-direction:column; }
.ap-topbar {
  background:#fff; border-bottom:1px solid #e2e8f0; height:60px;
  display:flex; align-items:center; justify-content:space-between; padding:0 32px;
  position:sticky; top:0; z-index:100;
}
.ap-topbar-title { font-size:18px; font-weight:800; color:#0f172a; letter-spacing:-0.4px; }
.ap-admin-chip {
  display:flex; align-items:center; gap:10px;
}
.ap-admin-avatar {
  width:34px; height:34px; background:linear-gradient(135deg,#2563eb,#6366f1);
  border-radius:9px; display:flex; align-items:center; justify-content:center;
  font-size:13px; font-weight:800; color:#fff;
}
.ap-admin-info { display:flex; flex-direction:column; }
.ap-admin-name { font-size:13px; font-weight:700; color:#0f172a; line-height:1.3; }
.ap-admin-role { font-size:11px; color:#64748b; font-weight:500; }
.ap-content { padding:32px; flex:1; }

/* Section header */
.ap-section-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:24px; }
.ap-section-title { font-size:22px; font-weight:800; color:#0f172a; letter-spacing:-0.5px; }
.ap-section-sub { font-size:13px; color:#64748b; margin-top:3px; }

/* Card */
.ap-card {
  background:#fff; border:1px solid #e2e8f0; border-radius:16px;
  overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,0.05);
}

/* Table */
.ap-table { width:100%; border-collapse:collapse; }
.ap-table th {
  text-align:left; font-size:11px; font-weight:700; color:#64748b;
  text-transform:uppercase; letter-spacing:0.8px; padding:12px 20px;
  background:#f8fafc; border-bottom:1px solid #e2e8f0;
}
.ap-table td { padding:14px 20px; border-bottom:1px solid #f1f5f9; font-size:13px; color:#334155; vertical-align:middle; }
.ap-table tr:last-child td { border-bottom:none; }
.ap-table tr:hover td { background:#fafbfc; }
.ap-empty { text-align:center; padding:56px 20px; }
.ap-empty-icon { font-size:40px; margin-bottom:12px; }
.ap-empty-text { font-size:14px; color:#64748b; }

/* User name cell */
.ap-user-cell { display:flex; align-items:center; gap:10px; }
.ap-user-avatar {
  width:32px; height:32px; border-radius:8px; display:flex; align-items:center; justify-content:center;
  font-size:12px; font-weight:800; color:#fff; flex-shrink:0;
  background:linear-gradient(135deg,#2563eb,#6366f1);
}

/* Tool badges */
.ap-tool-badge {
  display:inline-flex; align-items:center; gap:4px; font-size:11px; font-weight:700;
  padding:3px 10px; border-radius:999px;
}
.ap-tool-badge.monitoring { background:#eff6ff; color:#2563eb; }
.ap-tool-badge.billing    { background:#f0fdf4; color:#16a34a; }
.ap-badge-row { display:flex; gap:5px; flex-wrap:wrap; }

/* Access toggles */
.ap-toggle-row { display:flex; gap:8px; }
.ap-toggle-btn {
  display:inline-flex; align-items:center; gap:6px; padding:6px 14px; border-radius:8px;
  font-size:12px; font-weight:700; border:1.5px solid; cursor:pointer; transition:all 0.18s;
  font-family:inherit;
}
.ap-toggle-btn.on.monitoring  { background:#eff6ff; color:#2563eb; border-color:#bfdbfe; }
.ap-toggle-btn.off.monitoring { background:#f8fafc; color:#94a3b8; border-color:#e2e8f0; }
.ap-toggle-btn.on.billing     { background:#f0fdf4; color:#16a34a; border-color:#bbf7d0; }
.ap-toggle-btn.off.billing    { background:#f8fafc; color:#94a3b8; border-color:#e2e8f0; }
.ap-toggle-btn:hover          { transform:translateY(-1px); }

/* Buttons */
.ap-btn-primary {
  display:inline-flex; align-items:center; gap:7px; background:#2563eb; color:#fff;
  border:none; border-radius:9px; padding:9px 18px; font-size:13px; font-weight:700;
  cursor:pointer; font-family:inherit; transition:all 0.18s;
}
.ap-btn-primary:hover { background:#1d4ed8; transform:translateY(-1px); box-shadow:0 4px 12px rgba(37,99,235,0.3); }
.ap-btn-ghost {
  display:inline-flex; align-items:center; gap:6px; background:transparent; color:#64748b;
  border:1.5px solid #e2e8f0; border-radius:9px; padding:8px 16px; font-size:13px; font-weight:600;
  cursor:pointer; font-family:inherit; transition:all 0.18s;
}
.ap-btn-ghost:hover { border-color:#94a3b8; color:#334155; }
.ap-btn-danger {
  background:transparent; border:none; color:#94a3b8; cursor:pointer; padding:6px; border-radius:6px;
  display:flex; align-items:center; transition:all 0.18s;
}
.ap-btn-danger:hover { color:#dc2626; background:#fee2e2; }

/* Modal */
.ap-modal-overlay {
  position:fixed; inset:0; background:rgba(15,23,42,0.55); backdrop-filter:blur(4px);
  z-index:1000; display:flex; align-items:center; justify-content:center; padding:24px;
}
.ap-modal {
  background:#fff; border-radius:20px; width:100%; max-width:480px;
  box-shadow:0 24px 64px rgba(0,0,0,0.18); animation:apModalIn 0.22s ease;
}
@keyframes apModalIn { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
@keyframes spin { to{transform:rotate(360deg)} }

/* Restore Users section */
.ap-restore-card {
  background:#fff; border:1px solid #e2e8f0; border-radius:14px;
  padding:20px 22px; display:flex; align-items:center; gap:16px;
  box-shadow:0 1px 3px rgba(0,0,0,0.05); transition:box-shadow 0.18s;
}
.ap-restore-card:hover { box-shadow:0 4px 12px rgba(0,0,0,0.08); }
.ap-restore-avatar {
  width:38px; height:38px; border-radius:10px; background:linear-gradient(135deg,#dc2626,#f97316);
  display:flex; align-items:center; justify-content:center;
  font-size:14px; font-weight:800; color:#fff; flex-shrink:0;
}
.ap-restore-info { flex:1; min-width:0; }
.ap-restore-name { font-size:14px; font-weight:700; color:#0f172a; }
.ap-restore-meta { font-size:12px; color:#64748b; margin-top:2px; }
.ap-restore-countdown { margin-top:8px; }
.ap-restore-bar-bg { height:5px; border-radius:3px; background:#e2e8f0; overflow:hidden; }
.ap-restore-bar-fill { height:100%; border-radius:3px; transition:width 0.3s; }
.ap-restore-days { font-size:11px; font-weight:700; margin-top:4px; }
.ap-restore-btn {
  padding:8px 16px; border-radius:8px; border:none; cursor:pointer;
  font-size:12px; font-weight:700; font-family:inherit;
  background:#eff6ff; color:#2563eb; transition:all 0.18s; flex-shrink:0;
}
.ap-restore-btn:hover { background:#dbeafe; transform:translateY(-1px); }
.ap-modal-header {
  padding:24px 28px 0; display:flex; align-items:center; justify-content:space-between;
}
.ap-modal-title { font-size:18px; font-weight:800; color:#0f172a; letter-spacing:-0.3px; }
.ap-modal-close {
  width:32px; height:32px; border-radius:8px; border:1px solid #e2e8f0; background:#fff;
  cursor:pointer; display:flex; align-items:center; justify-content:center; color:#64748b;
  transition:all 0.15s;
}
.ap-modal-close:hover { background:#f1f5f9; color:#0f172a; }
.ap-modal-body { padding:24px 28px 28px; }

/* Form */
.ap-field { margin-bottom:16px; }
.ap-field label { display:block; font-size:12px; font-weight:700; color:#374151; margin-bottom:6px; letter-spacing:0.2px; }
.ap-input {
  width:100%; padding:10px 13px; border:1.5px solid #e2e8f0; border-radius:9px;
  font-family:inherit; font-size:13px; color:#0f172a; outline:none; transition:border-color 0.18s, box-shadow 0.18s;
  background:#fff;
}
.ap-input:focus { border-color:#2563eb; box-shadow:0 0 0 3px rgba(37,99,235,0.1); }
.ap-input::placeholder { color:#94a3b8; }
.ap-input-wrap { position:relative; }
.ap-input-wrap .ap-input { padding-right:38px; }
.ap-input-eye {
  position:absolute; right:10px; top:50%; transform:translateY(-50%);
  background:none; border:none; cursor:pointer; color:#94a3b8; padding:2px;
  display:flex; align-items:center;
}
.ap-input-eye:hover { color:#334155; }

/* Password type tabs */
.ap-pass-tabs { display:flex; background:#f1f5f9; border-radius:9px; padding:3px; gap:2px; margin-bottom:14px; }
.ap-pass-tab {
  flex:1; padding:7px; border:none; border-radius:7px; font-size:12px; font-weight:600;
  cursor:pointer; font-family:inherit; transition:all 0.18s; color:#64748b; background:transparent;
}
.ap-pass-tab.active { background:#fff; color:#2563eb; box-shadow:0 1px 3px rgba(0,0,0,0.08); }

/* Auto-gen info */
.ap-autogen-info {
  background:#f8fafc; border:1px solid #e2e8f0; border-radius:9px; padding:12px 14px;
  font-size:13px; color:#475569; line-height:1.6;
}
.ap-autogen-info strong { color:#0f172a; }

/* One-time password reveal */
.ap-otp-box {
  background:#f0fdf4; border:1.5px solid #bbf7d0; border-radius:12px; padding:18px 20px; margin-bottom:20px;
}
.ap-otp-label { font-size:11px; font-weight:700; color:#15803d; text-transform:uppercase; letter-spacing:0.8px; margin-bottom:8px; }
.ap-otp-warning { font-size:12px; color:#16a34a; margin-bottom:12px; }
.ap-otp-pass {
  font-family:monospace; font-size:18px; font-weight:800; color:#0f172a; letter-spacing:2px;
  background:#fff; border:1px solid #bbf7d0; border-radius:8px; padding:10px 14px;
  display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:0;
}
.ap-copy-btn {
  display:inline-flex; align-items:center; gap:6px; background:#2563eb; color:#fff;
  border:none; border-radius:7px; padding:7px 13px; font-size:12px; font-weight:700;
  cursor:pointer; font-family:inherit; transition:all 0.15s; white-space:nowrap;
}
.ap-copy-btn:hover { background:#1d4ed8; }
.ap-copy-btn.copied { background:#16a34a; }

/* Form error */
.ap-form-err { font-size:12px; color:#dc2626; background:#fee2e2; border:1px solid #fecaca; border-radius:7px; padding:9px 12px; margin-bottom:12px; }

/* Plan section */
.ap-plan-card {
  background:linear-gradient(135deg,#07111f 0%,#0d2053 60%,#1a3a7a 100%);
  border-radius:16px; padding:32px; color:#fff; margin-bottom:20px; position:relative; overflow:hidden;
}
.ap-plan-card::before {
  content:''; position:absolute; inset:0; pointer-events:none; opacity:0.2;
  background-image:linear-gradient(rgba(59,130,246,0.15) 1px,transparent 1px),linear-gradient(90deg,rgba(59,130,246,0.15) 1px,transparent 1px);
  background-size:32px 32px;
}
.ap-plan-badge { display:inline-flex; align-items:center; background:rgba(37,99,235,0.3); color:#93c5fd; border:1px solid rgba(59,130,246,0.4); padding:4px 12px; border-radius:999px; font-size:11px; font-weight:700; margin-bottom:14px; letter-spacing:0.3px; position:relative; z-index:1; }
.ap-plan-name { font-size:28px; font-weight:800; letter-spacing:-1px; margin-bottom:6px; position:relative; z-index:1; }
.ap-plan-sub { font-size:14px; color:rgba(255,255,255,0.6); position:relative; z-index:1; }
.ap-plan-stats { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-top:24px; position:relative; z-index:1; }
@media(max-width:700px){ .ap-plan-stats { grid-template-columns:repeat(2,1fr); } }
.ap-plan-stat { background:rgba(255,255,255,0.07); border:1px solid rgba(255,255,255,0.1); border-radius:10px; padding:14px 16px; }
.ap-plan-stat-val { font-size:22px; font-weight:800; color:#fff; margin-bottom:3px; }
.ap-plan-stat-label { font-size:11px; color:rgba(255,255,255,0.55); }

/* Account section */
.ap-account-card { background:#fff; border:1px solid #e2e8f0; border-radius:16px; padding:32px; }
.ap-account-avatar { width:64px; height:64px; background:linear-gradient(135deg,#2563eb,#6366f1); border-radius:16px; display:flex; align-items:center; justify-content:center; font-size:24px; font-weight:800; color:#fff; margin-bottom:16px; }
.ap-account-name { font-size:22px; font-weight:800; color:#0f172a; letter-spacing:-0.5px; margin-bottom:4px; }
.ap-account-role { display:inline-flex; align-items:center; background:#eff6ff; color:#2563eb; border:1px solid #bfdbfe; padding:3px 12px; border-radius:999px; font-size:12px; font-weight:700; margin-bottom:20px; }
.ap-account-info { display:flex; flex-direction:column; gap:12px; }
.ap-account-row { display:flex; align-items:center; gap:12px; padding:12px 16px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; }
.ap-account-row-label { font-size:12px; color:#64748b; font-weight:600; width:100px; flex-shrink:0; }
.ap-account-row-val { font-size:13px; color:#0f172a; font-weight:600; }

/* Account edit */
.ap-account-header { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:24px; }
.ap-account-profile { display:flex; align-items:center; gap:18px; }
.ap-photo-wrap { position:relative; width:72px; height:72px; flex-shrink:0; }
.ap-photo-circle {
  width:72px; height:72px; border-radius:18px; overflow:hidden;
  background:linear-gradient(135deg,#2563eb,#6366f1);
  display:flex; align-items:center; justify-content:center;
  font-size:26px; font-weight:800; color:#fff;
  border:2px solid #e2e8f0;
}
.ap-photo-circle img { width:100%; height:100%; object-fit:cover; display:block; }
.ap-photo-edit-btn {
  position:absolute; bottom:-5px; right:-5px; width:24px; height:24px;
  background:#2563eb; border-radius:50%; border:2px solid #fff;
  display:flex; align-items:center; justify-content:center; cursor:pointer;
  box-shadow:0 1px 4px rgba(0,0,0,0.2);
}
.ap-photo-input { position:absolute; inset:0; opacity:0; cursor:pointer; width:100%; height:100%; }
.ap-edit-name-row { display:flex; gap:8px; align-items:center; margin-bottom:8px; }
.ap-edit-save-row { display:flex; gap:8px; margin-top:16px; }

/* Topbar avatar — photo only, no text */
.ap-topbar-avatar {
  width:38px; height:38px; border-radius:10px; overflow:hidden;
  background:linear-gradient(135deg,#2563eb,#6366f1);
  display:flex; align-items:center; justify-content:center;
  font-size:15px; font-weight:800; color:#fff; flex-shrink:0;
  border:2px solid #e2e8f0; cursor:default;
}
.ap-topbar-avatar img { width:100%; height:100%; object-fit:cover; display:block; }

/* Settings section */
.ap-settings-row { display:flex; align-items:center; justify-content:space-between; padding:16px 20px; border-bottom:1px solid #f1f5f9; }
.ap-settings-row:last-child { border-bottom:none; }
.ap-settings-label { font-size:14px; font-weight:600; color:#0f172a; margin-bottom:2px; }
.ap-settings-sub { font-size:12px; color:#64748b; }
.ap-toggle-switch { position:relative; width:42px; height:24px; }
.ap-toggle-switch input { opacity:0; width:0; height:0; }
.ap-toggle-slider {
  position:absolute; inset:0; background:#cbd5e1; border-radius:999px; cursor:pointer; transition:0.25s;
}
.ap-toggle-slider::before { content:''; position:absolute; width:18px; height:18px; left:3px; top:3px; background:#fff; border-radius:50%; transition:0.25s; }
.ap-toggle-switch input:checked + .ap-toggle-slider { background:#2563eb; }
.ap-toggle-switch input:checked + .ap-toggle-slider::before { transform:translateX(18px); }

/* Stats row at top */
.ap-stats-row { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-bottom:28px; }
.ap-stat-card { background:#fff; border:1px solid #e2e8f0; border-radius:14px; padding:18px 20px; }
.ap-stat-val { font-size:26px; font-weight:800; color:#0f172a; letter-spacing:-1px; line-height:1; margin-bottom:5px; }
.ap-stat-label { font-size:12px; color:#64748b; font-weight:500; }
.ap-stat-card.blue .ap-stat-val { color:#2563eb; }
.ap-stat-card.green .ap-stat-val { color:#16a34a; }
.ap-stat-card.purple .ap-stat-val { color:#7c3aed; }
.ap-stat-card.orange .ap-stat-val { color:#ea580c; }

/* Payment success / error */
.ap-pay-success {
  background:#f0fdf4; border:1.5px solid #86efac; border-radius:14px; padding:20px 24px;
  display:flex; align-items:flex-start; gap:14px; margin-top:20px; animation:apModalIn 0.25s ease;
}
.ap-pay-success-icon { width:36px; height:36px; background:#16a34a; border-radius:9px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.ap-pay-success-title { font-size:14px; font-weight:800; color:#15803d; margin-bottom:4px; }
.ap-pay-success-sub   { font-size:12px; color:#16a34a; }
.ap-pay-success-id    { font-family:monospace; font-size:11px; color:#64748b; margin-top:5px; }
.ap-pay-error {
  background:#fef2f2; border:1.5px solid #fca5a5; border-radius:14px; padding:14px 18px;
  font-size:13px; color:#dc2626; margin-top:16px; font-weight:600;
}

/* Online/Offline status */
.ap-status { display:flex; align-items:center; gap:7px; }
.ap-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
.ap-dot.online  { background:#22c55e; box-shadow:0 0 0 3px #dcfce7; animation:apPulse 2s ease-in-out infinite; }
.ap-dot.offline { background:#cbd5e1; }
@keyframes apPulse { 0%,100%{box-shadow:0 0 0 3px #dcfce7} 50%{box-shadow:0 0 0 5px #bbf7d0} }
.ap-status-label { font-size:12px; font-weight:700; }
.ap-status-label.online  { color:#16a34a; }
.ap-status-label.offline { color:#94a3b8; }

/* Session chip */
.ap-chip { display:inline-flex; align-items:center; gap:5px; font-size:11px; font-weight:700; padding:3px 9px; border-radius:999px; }
.ap-chip.active   { background:#dcfce7; color:#15803d; }
.ap-chip.inactive { background:#f1f5f9; color:#64748b; }
.ap-chip.never    { color:#cbd5e1; font-size:12px; }

/* Time cell */
.ap-dt { font-size:12px; color:#334155; font-weight:500; }
.ap-dt-sub { font-size:11px; color:#94a3b8; margin-top:1px; }
`;

/* ── Main Component ── */
export default function AdminPortal({ admin, onLogout, onOpenTool, onPhotoChange }) {
  const [section, setSection] = useState("tool-monitoring");

  // ── WebSocket presence & live activity ──────────────────────────────────
  const socketRef = useRef(null);
  const [onlineUsers, setOnlineUsers] = useState([]); // [{email, name, loginTime}]
  const [wsConnected, setWsConnected] = useState(false);
  const [planCancelledBanner, setPlanCancelledBanner] = useState(false);

  // ── Demo trial / cold-period state ────────────────────────────────────
  const [demoExpiresAt, setDemoExpiresAt] = useState(admin?.demoExpiresAt || null);
  const [coldPeriodEndsAt, setColdPeriodEndsAt] = useState(admin?.coldPeriodEndsAt || null);

  // Poll demo status every 3 s while a demo/cold-period is active
  const isDemoAccount = !!(admin?.demoExpiresAt || admin?.coldPeriodEndsAt || demoExpiresAt || coldPeriodEndsAt);
  useEffect(() => {
    if (!admin?.email || !isDemoAccount) return;
    function fetchStatus() {
      fetch(`/auth/demo-status/${encodeURIComponent(admin.email)}`)
        .then(r => r.json())
        .then(d => {
          setDemoExpiresAt(d.demoExpiresAt || null);
          setColdPeriodEndsAt(d.coldPeriodEndsAt || null);
        }).catch(() => {});
    }
    fetchStatus();
    const id = setInterval(fetchStatus, 3000);
    return () => clearInterval(id);
  }, [admin?.email, isDemoAccount]); // eslint-disable-line

  useEffect(() => {
    const socket = socketIO(window.location.origin, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      setWsConnected(true);
      // Announce presence so the admin portal itself shows up as online
      if (admin?.email) socket.emit('user:online', { email: admin.email, name: admin.name || admin.email });
    });
    socket.on('disconnect', () => setWsConnected(false));

    socket.on('users:online', (list) => {
      setOnlineUsers(list || []);
      // Refresh users from DB so lastLogin reflects any recent logins
      loadUsersFromDB(orgScope);
    });

    // Instant lastLogin update when any user logs in — no full reload needed
    socket.on('user:login', ({ email, loginTime }) => {
      setUsers(prev => prev.map(u =>
        u.email?.toLowerCase() === email?.toLowerCase()
          ? { ...u, lastLogin: loginTime }
          : u
      ));
    });

    socket.on('plan:cancelled', ({ email }) => {
      if (email?.toLowerCase() === admin?.email?.toLowerCase()) {
        setPlanCancelledBanner(true);
      }
    });

    socket.on('activity:new', ({ email, type, details, ts }) => {
      setUserActivity(prev => {
        const key = email?.toLowerCase();
        if (!key) return prev;
        const existing = prev[key];
        if (!existing || existing.loading) return prev;
        const newEvent = { type, details: details || {}, ts: ts ? new Date(ts).toISOString() : new Date().toISOString() };
        return { ...prev, [key]: { ...existing, events: [newEvent, ...(existing.events || [])] } };
      });
    });

    return () => {
      if (admin?.email) socket.emit('user:offline', { email: admin.email });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [admin?.email]);

  // Keep browser URL in sync with current admin section
  useEffect(() => {
    const slugMap = {
      "users":           "/admin/users",
      "restore":         "/admin/restore",
      "access":          "/admin/access",
      "plan":            "/admin/plan",
      "account":         "/admin/account",
      "settings":        "/admin/settings",
      "tool-monitoring": "/admin/monitoring",
      "tool-billing":    "/admin/billing",
    };
    const path = slugMap[section] ?? "/admin";
    window.history.pushState({ page: "admin", section }, "", path);
  }, [section]);

  // Promoted sub-admins use their orgAdmin as the org scope; primary admins use their own email
  const orgScope = admin?.orgAdmin || admin?.email;

  // Attach session credentials to every protected backend call.
  // x-caller-email identifies the actual logged-in user (needed for co-admin support).
  // x-session-id is verified server-side against activeSessions.
  const apiFetch = (url, opts = {}) => {
    const headers = {
      ...(opts.headers || {}),
      'x-session-id':    admin?.sessionId   || '',
      'x-caller-email':  admin?.email        || '',
    };
    return fetch(url, { ...opts, headers });
  };

  // Always start empty — populated exclusively from DB, never from shared localStorage
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [promoting, setPromoting] = useState(null);
  const [promoteErr, setPromoteErr] = useState('');

  // ── Load org users from DB with auto-retry ───────────────────────────────
  const fetchUsersRef = useRef(null);

  function loadUsersFromDB(scope) {
    if (!scope) { setUsersLoading(false); return; }
    setUsersLoading(true);
    let attempts = 0;

    function attempt() {
      apiFetch(`/auth/users?admin=${encodeURIComponent(scope)}`)
        .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
        .then(dbUsers => {
          if (!Array.isArray(dbUsers)) throw new Error('unexpected response');
          setUsers(dbUsers.map(u => ({
            id:         u.id,
            name:       u.name,
            email:      u.email,
            role:       u.role || 'user',
            mfaEnabled: u.mfaEnabled,
            createdAt:  u.createdAt,
            lastLogin:  u.lastLogin,
            tools:      Array.isArray(u.tools) ? u.tools : ['monitoring', 'billing'],
            photo:      u.photo || null,
          })));
          setUsersLoading(false);
        })
        .catch(() => {
          attempts += 1;
          if (attempts < 5) {
            fetchUsersRef.current = setTimeout(attempt, Math.min(1000 * attempts, 4000));
          } else {
            setUsersLoading(false);
          }
        });
    }
    attempt();
  }

  useEffect(() => {
    loadUsersFromDB(orgScope);
    return () => { if (fetchUsersRef.current) clearTimeout(fetchUsersRef.current); };
  }, [orgScope]); // eslint-disable-line

  // ── Cloud accounts ────────────────────────────────────────────────────────
  const [cloudAccounts, setCloudAccounts]               = useState([]);
  const [cloudAccountsLoading, setCloudAccountsLoading] = useState(false);
  const [orgUserCloudAccess, setOrgUserCloudAccess]     = useState({}); // email → [{id, provider, label}]
  const [cloudAccountModal, setCloudAccountModal]       = useState(null); // {userEmail, userName, provider, accounts, primaryId}
  const [switchingAccount, setSwitchingAccount]         = useState(null); // {accountId, done}
  const [addCloudAccountModal, setAddCloudAccountModal] = useState(false);
  const [assignCloudAccountModal, setAssignCloudAccountModal] = useState(null); // account object
  const [cloudAccountForm, setCloudAccountForm] = useState({ provider: 'aws', label: '', creds: { region: 'us-east-1' } });
  const [cloudAccountSaving, setCloudAccountSaving] = useState(false);
  const [cloudAccountErr, setCloudAccountErr]       = useState('');
  const [cloudAccountsAuthErr, setCloudAccountsAuthErr] = useState('');
  const [editCloudAccountModal, setEditCloudAccountModal] = useState(null); // account object
  const [editCloudAccountCreds, setEditCloudAccountCreds] = useState({});
  const [editCloudAccountSaving, setEditCloudAccountSaving] = useState(false);
  const [editCloudAccountErr, setEditCloudAccountErr]       = useState('');
  const [assignSelection, setAssignSelection]       = useState({}); // email → bool
  const [assignSaving, setAssignSaving]             = useState(false);
  const [credViewModal, setCredViewModal]           = useState(null); // {id, label, provider}
  const [credViewData, setCredViewData]             = useState(null); // {credentials, provider, label}
  const [credViewLoading, setCredViewLoading]       = useState(false);
  const [credShowFields, setCredShowFields]         = useState({});

  function loadCloudAccounts(scope) {
    if (!scope) return;
    setCloudAccountsLoading(true);
    setCloudAccountsAuthErr('');
    apiFetch(`/api/admin/cloud-accounts?uid=${encodeURIComponent(scope)}`)
      .then(r => { if (r.status === 401) throw new Error('session_expired'); return r.json(); })
      .then(d => { setCloudAccounts(Array.isArray(d.accounts) ? d.accounts : []); setCloudAccountsLoading(false); })
      .catch(err => { if (err?.message === 'session_expired') setCloudAccountsAuthErr('Session expired — please log out and log back in to manage cloud accounts.'); setCloudAccountsLoading(false); });
  }

  function loadOrgUserCloudAccess(scope) {
    if (!scope) return;
    apiFetch(`/api/admin/users/account-access?uid=${encodeURIComponent(scope)}`)
      .then(r => r.json())
      .then(d => { setOrgUserCloudAccess(d.access || {}); })
      .catch(() => {});
  }

  async function handleSwitchAccount(account) {
    setSwitchingAccount({ accountId: account.id, done: false });
    try {
      await apiFetch(`/api/admin/cloud-accounts/${account.id}/set-primary?uid=${encodeURIComponent(orgScope)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: orgScope, userEmail: cloudAccountModal.userEmail }),
      });
    } catch {}
    setSwitchingAccount({ accountId: account.id, done: true });
    setCloudAccountModal(prev => prev ? { ...prev, primaryId: account.id } : prev);
    setTimeout(() => setSwitchingAccount(null), 1800);
  }

  async function openCredViewFromUserModal(account) {
    setCredViewModal(account);
    setCredViewData(null);
    setCredViewLoading(true);
    setCredShowFields({});
    try {
      const r = await apiFetch(`/api/admin/cloud-accounts/${account.id}/credentials?uid=${encodeURIComponent(orgScope)}`);
      const d = await r.json();
      setCredViewData(d);
    } catch { setCredViewData({ error: 'Failed to load credentials.' }); }
    setCredViewLoading(false);
  }

  useEffect(() => {
    if (section === 'cloud-accounts') loadCloudAccounts(orgScope);
    if (section === 'cloud-accounts' || section === 'users') loadOrgUserCloudAccess(orgScope);
  }, [section, orgScope]); // eslint-disable-line

  // ── Generic API connectors ───────────────────────────────────────────────
  const [connectors, setConnectors]               = useState([]);
  const [connectorsLoading, setConnectorsLoading] = useState(false);
  const [connectorTemplates, setConnectorTemplates] = useState([]);
  const [addConnectorModal, setAddConnectorModal] = useState(false);
  const [editConnectorModal, setEditConnectorModal] = useState(null); // connector object
  const [connectorForm, setConnectorForm] = useState(null); // shared shape for add/edit
  const [connectorSaving, setConnectorSaving] = useState(false);
  const [connectorErr, setConnectorErr]       = useState('');
  const [connectorUsageModal, setConnectorUsageModal] = useState(null); // connector object
  const [connectorUsageRows, setConnectorUsageRows]   = useState([]);
  const [connectorUsageLoading, setConnectorUsageLoading] = useState(false);
  const [connectorPolling, setConnectorPolling] = useState(null); // connector id currently being polled

  const blankConnectorForm = () => ({
    name: '', baseUrl: '', usagePath: '', authType: 'bearer',
    authValue: '', authHeaderName: 'X-API-Key', authUsername: '', extraHeadersText: '',
    fieldMapping: { provider: '', total_cost: '', usage_amount: '', unit: '', timestamp: '' },
    pollFrequencyMinutes: 60, thresholdCost: '', thresholdUsage: '', alertEmails: '',
    templateId: null,
  });

  function loadConnectors(scope) {
    if (!scope) return;
    setConnectorsLoading(true);
    apiFetch(`/api/admin/connectors?uid=${encodeURIComponent(scope)}`)
      .then(r => r.json())
      .then(d => { setConnectors(Array.isArray(d.connectors) ? d.connectors : []); setConnectorsLoading(false); })
      .catch(() => setConnectorsLoading(false));
  }

  function loadConnectorTemplates(scope) {
    if (!scope) return;
    apiFetch(`/api/admin/connector-templates?uid=${encodeURIComponent(scope)}`)
      .then(r => r.json())
      .then(d => setConnectorTemplates(Array.isArray(d.templates) ? d.templates : []))
      .catch(() => {});
  }

  useEffect(() => {
    if (section === 'connectors') { loadConnectors(orgScope); loadConnectorTemplates(orgScope); }
  }, [section, orgScope]); // eslint-disable-line

  // ── AI Provider Billing & Usage ───────────────────────────────────────────
  // Every provider is ONE paste field. OpenAI/Anthropic take the key directly.
  // Bedrock/Azure/GCP don't have a single-key billing API (AWS Cost Explorer,
  // Azure Cost Management and GCP Cloud Billing are all IAM/service-account
  // based — no cloud offers a bearer-token billing API), so instead of making
  // the admin fill out separate ID/secret fields, we accept whatever blob
  // they already have lying around (an AWS credentials-file block or the
  // `aws sts` JSON, the `az ad sp create-for-rbac --sdk-auth` JSON, or the
  // downloaded GCP service-account JSON) and parse the pieces out of it —
  // see parseAiCredentialBlob below.
  const AI_PROVIDER_FIELDS = {
    openai:    [{ key: 'admin_api_key', label: 'Admin API Key', type: 'password', required: true }],
    anthropic: [{ key: 'admin_api_key', label: 'Admin API Key', type: 'password', required: true }],
    azure_openai: [{
      key: 'blob', label: 'Service Principal JSON', type: 'textarea', required: true,
      placeholder: 'Paste the output of:\naz ad sp create-for-rbac --role "Cost Management Reader" --scopes /subscriptions/<id> --sdk-auth',
    }],
    bedrock: [{
      key: 'blob', label: 'AWS Credentials', type: 'textarea', required: true,
      placeholder: 'Paste ACCESS_KEY_ID:SECRET_ACCESS_KEY\nor an AWS credentials-file block\nor the JSON from `aws sts get-session-token`',
    }],
    gemini:    [{ key: 'blob', label: 'Service Account JSON', type: 'textarea', required: true, placeholder: '{"type":"service_account","project_id":"...",...} — downloaded from IAM & Admin > Service Accounts > Keys' }],
    vertex_ai: [{ key: 'blob', label: 'Service Account JSON', type: 'textarea', required: true, placeholder: '{"type":"service_account","project_id":"...",...} — downloaded from IAM & Admin > Service Accounts > Keys' }],
  };
  const AI_PROVIDER_LABELS = {
    openai: 'OpenAI', anthropic: 'Anthropic', azure_openai: 'Azure OpenAI',
    bedrock: 'AWS Bedrock', gemini: 'Gemini', vertex_ai: 'Vertex AI',
  };

  // Turns whatever the admin pasted into the {field: value} shape the Python
  // collectors expect. Returns { credentials } on success or { error } on failure.
  function parseAiCredentialBlob(provider, creds) {
    if (provider === 'openai' || provider === 'anthropic') {
      return { credentials: creds }; // already just { admin_api_key }
    }
    const text = (creds.blob || '').trim();
    if (!text) return { error: 'Paste your credentials first' };

    if (provider === 'bedrock') {
      // JSON (aws sts get-session-token / create-access-key output)
      try {
        const j = JSON.parse(text);
        const c = j.Credentials || j.AccessKey || j;
        const id = c.AccessKeyId || c.access_key_id;
        const secret = c.SecretAccessKey || c.secret_access_key;
        if (id && secret) return { credentials: { access_key_id: id, secret_access_key: secret, session_token: c.SessionToken || c.session_token || undefined, region: 'us-east-1' } };
      } catch { /* not JSON, fall through */ }
      // AWS credentials-file block: aws_access_key_id = ... / aws_secret_access_key = ...
      const idM = text.match(/aws_access_key_id\s*=\s*(\S+)/i);
      const secM = text.match(/aws_secret_access_key\s*=\s*(\S+)/i);
      if (idM && secM) return { credentials: { access_key_id: idM[1], secret_access_key: secM[1], region: 'us-east-1' } };
      // Plain "ID:SECRET" or "ID SECRET"
      const parts = text.split(/[\s:,]+/).filter(Boolean);
      if (parts.length >= 2 && /^[A-Z0-9]{16,}$/.test(parts[0])) {
        return { credentials: { access_key_id: parts[0], secret_access_key: parts[1], region: 'us-east-1' } };
      }
      return { error: 'Could not read AWS credentials — paste ACCESS_KEY_ID:SECRET_ACCESS_KEY, an AWS credentials-file block, or `aws sts get-session-token` JSON' };
    }

    if (provider === 'azure_openai') {
      try {
        const j = JSON.parse(text);
        const clientId = j.clientId || j.appId || j.client_id;
        const clientSecret = j.clientSecret || j.password || j.client_secret;
        const tenantId = j.tenantId || j.tenant || j.tenant_id;
        const subscriptionId = j.subscriptionId || j.subscription_id;
        if (!clientId || !clientSecret || !tenantId) {
          return { error: 'JSON is missing clientId/clientSecret/tenantId — paste the output of `az ad sp create-for-rbac --sdk-auth`' };
        }
        if (!subscriptionId) {
          return { error: 'JSON is missing subscriptionId — use the --sdk-auth flag (it includes it automatically), or add "subscriptionId": "<id>" yourself' };
        }
        return { credentials: { client_id: clientId, client_secret: clientSecret, tenant_id: tenantId, subscription_id: subscriptionId } };
      } catch {
        return { error: 'Could not parse — paste the JSON output of `az ad sp create-for-rbac --sdk-auth`' };
      }
    }

    if (provider === 'gemini' || provider === 'vertex_ai') {
      try {
        const j = JSON.parse(text);
        if (j.type !== 'service_account' || !j.private_key) {
          return { error: 'That doesn\'t look like a service-account key file — download one from IAM & Admin > Service Accounts > Keys > Add Key > JSON' };
        }
        return { credentials: { service_account_json: text } }; // project_id is read out of this JSON server-side
      } catch {
        return { error: 'Could not parse — paste the full contents of the downloaded service-account JSON key file' };
      }
    }

    return { error: `No parser for provider "${provider}"` };
  }

  const [aiCredentials, setAiCredentials] = useState([]);
  const [aiCredentialsLoading, setAiCredentialsLoading] = useState(false);
  const [addAiCredentialModal, setAddAiCredentialModal] = useState(false);
  const [aiCredentialForm, setAiCredentialForm] = useState({ provider: 'openai', label: '', creds: {} });
  const [aiCredentialSaving, setAiCredentialSaving] = useState(false);
  const [aiCredentialErr, setAiCredentialErr] = useState('');
  const [rotateAiCredentialModal, setRotateAiCredentialModal] = useState(null); // credential object
  const [pollingAiCredentialId, setPollingAiCredentialId] = useState(null);
  const [pollAiCredentialResult, setPollAiCredentialResult] = useState(null); // { credId, type: 'success'|'error', msg }

  const [aiBudgets, setAiBudgets] = useState([]);
  const [addAiBudgetModal, setAddAiBudgetModal] = useState(false);
  const [aiBudgetForm, setAiBudgetForm] = useState({ scope: 'org', scopeId: '', thresholdUsd: '', period: 'monthly', warnPct: 0.7 });
  const [aiBudgetSaving, setAiBudgetSaving] = useState(false);
  const [aiBudgetErr, setAiBudgetErr] = useState('');

  function loadAiCredentials(scope) {
    if (!scope) return;
    setAiCredentialsLoading(true);
    apiFetch(`/api/admin/ai-credentials?uid=${encodeURIComponent(scope)}`)
      .then(r => r.json())
      .then(d => { setAiCredentials(Array.isArray(d.credentials) ? d.credentials : []); setAiCredentialsLoading(false); })
      .catch(() => setAiCredentialsLoading(false));
  }

  function loadAiBudgets(scope) {
    if (!scope) return;
    apiFetch(`/api/ai-billing/budgets?uid=${encodeURIComponent(scope)}`)
      .then(r => r.json())
      .then(d => setAiBudgets(Array.isArray(d.budgets) ? d.budgets : []))
      .catch(() => {});
  }

  useEffect(() => {
    if (section === 'ai-billing') { loadAiCredentials(orgScope); loadAiBudgets(orgScope); }
  }, [section, orgScope]); // eslint-disable-line

  async function handleAddAiCredential(e) {
    e.preventDefault();
    setAiCredentialErr('');
    setAiCredentialSaving(true);
    const { provider, label, creds } = aiCredentialForm;
    if (!label.trim()) { setAiCredentialErr('Label is required'); setAiCredentialSaving(false); return; }
    const parsed = parseAiCredentialBlob(provider, creds);
    if (parsed.error) { setAiCredentialErr(parsed.error); setAiCredentialSaving(false); return; }
    try {
      const r = await apiFetch(`/api/admin/ai-credentials?uid=${encodeURIComponent(orgScope)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: orgScope, provider, label, credentials: parsed.credentials }),
      });
      const d = await r.json();
      if (!r.ok || !d.success) { setAiCredentialErr(d.message || d.error || 'Failed to add credential'); setAiCredentialSaving(false); return; }
      setAddAiCredentialModal(false);
      setAiCredentialForm({ provider: 'openai', label: '', creds: {} });
      loadAiCredentials(orgScope);
    } catch { setAiCredentialErr('Network error'); }
    setAiCredentialSaving(false);
  }

  async function handleRotateAiCredential(e) {
    e.preventDefault();
    if (!rotateAiCredentialModal) return;
    setAiCredentialErr('');
    setAiCredentialSaving(true);
    const parsed = parseAiCredentialBlob(rotateAiCredentialModal.provider, rotateAiCredentialModal.newCreds || {});
    if (parsed.error) { setAiCredentialErr(parsed.error); setAiCredentialSaving(false); return; }
    try {
      const r = await apiFetch(`/api/admin/ai-credentials/${rotateAiCredentialModal.id}?uid=${encodeURIComponent(orgScope)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: orgScope, credentials: parsed.credentials }),
      });
      const d = await r.json();
      if (!r.ok || !d.success) { setAiCredentialErr(d.message || d.error || 'Failed to rotate key'); setAiCredentialSaving(false); return; }
      setRotateAiCredentialModal(null);
      loadAiCredentials(orgScope);
    } catch { setAiCredentialErr('Network error'); }
    setAiCredentialSaving(false);
  }

  async function handlePollAiCredentialNow(cred) {
    setPollingAiCredentialId(cred.id);
    setPollAiCredentialResult(null);
    try {
      const r = await apiFetch(`/api/admin/ai-credentials/${cred.id}/poll-now?uid=${encodeURIComponent(orgScope)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: orgScope }),
      });
      const d = await r.json();
      if (r.ok && d.success) {
        setPollAiCredentialResult({ credId: cred.id, type: 'success', msg: `Polled OK — ${d.ingested ?? 0} usage event(s) ingested.` });
      } else {
        setPollAiCredentialResult({ credId: cred.id, type: 'error', msg: d.error || 'Poll failed' });
      }
    } catch (e) {
      setPollAiCredentialResult({ credId: cred.id, type: 'error', msg: e.message || 'Network error' });
    }
    loadAiCredentials(orgScope);
    setPollingAiCredentialId(null);
    setTimeout(() => setPollAiCredentialResult(null), 8000);
  }

  async function handleToggleAiCredentialStatus(cred) {
    const nextStatus = cred.status === 'active' ? 'inactive' : 'active';
    await apiFetch(`/api/admin/ai-credentials/${cred.id}?uid=${encodeURIComponent(orgScope)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: orgScope, status: nextStatus }),
    }).catch(() => {});
    loadAiCredentials(orgScope);
  }

  async function handleAddAiBudget(e) {
    e.preventDefault();
    setAiBudgetErr('');
    setAiBudgetSaving(true);
    const { scope, scopeId, thresholdUsd, period, warnPct } = aiBudgetForm;
    if (scope !== 'org' && !scopeId) { setAiBudgetErr('scopeId is required for key/team budgets'); setAiBudgetSaving(false); return; }
    if (!thresholdUsd || Number(thresholdUsd) <= 0) { setAiBudgetErr('Enter a positive threshold amount'); setAiBudgetSaving(false); return; }
    try {
      const r = await apiFetch(`/api/ai-billing/budgets?uid=${encodeURIComponent(orgScope)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: orgScope, scope, scopeId: scope === 'org' ? null : scopeId, thresholdUsd: Number(thresholdUsd), period, warnPct: Number(warnPct) }),
      });
      const d = await r.json();
      if (!r.ok || !d.success) { setAiBudgetErr(d.message || d.error || 'Failed to create budget'); setAiBudgetSaving(false); return; }
      setAddAiBudgetModal(false);
      setAiBudgetForm({ scope: 'org', scopeId: '', thresholdUsd: '', period: 'monthly', warnPct: 0.7 });
      loadAiBudgets(orgScope);
    } catch { setAiBudgetErr('Network error'); }
    setAiBudgetSaving(false);
  }

  async function handleToggleAiBudgetStatus(budget) {
    const nextStatus = budget.status === 'active' ? 'paused' : 'active';
    await apiFetch(`/api/ai-billing/budgets/${budget.id}?uid=${encodeURIComponent(orgScope)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: orgScope, status: nextStatus }),
    }).catch(() => {});
    loadAiBudgets(orgScope);
  }

  function applyConnectorTemplate(templateId) {
    const t = connectorTemplates.find(t => t.id === templateId);
    if (!t) { setConnectorForm(f => ({ ...f, templateId: null })); return; }
    setConnectorForm(f => ({
      ...f,
      name: f.name || t.displayName,
      baseUrl: t.baseUrl,
      usagePath: t.usagePath,
      authType: t.authType,
      authHeaderName: t.authConfigHint?.headerName || f.authHeaderName,
      authUsername: t.authConfigHint?.username || '',
      extraHeadersText: t.authConfigHint?.extraHeaders ? JSON.stringify(t.authConfigHint.extraHeaders, null, 2) : '',
      fieldMapping: { ...f.fieldMapping, ...t.fieldMapping },
      templateId: t.id,
    }));
  }

  function buildAuthConfigFromForm(f) {
    let extraHeaders;
    if (f.extraHeadersText && f.extraHeadersText.trim()) {
      extraHeaders = JSON.parse(f.extraHeadersText); // caller catches
    }
    if (f.authType === 'basic') return { username: f.authUsername, value: f.authValue, ...(extraHeaders ? { extraHeaders } : {}) };
    if (f.authType === 'bearer') return { value: f.authValue, ...(extraHeaders ? { extraHeaders } : {}) };
    return { headerName: f.authHeaderName || 'X-API-Key', value: f.authValue, ...(extraHeaders ? { extraHeaders } : {}) };
  }

  async function handleSaveConnector(e) {
    e.preventDefault();
    if (!connectorForm) return;
    setConnectorErr('');
    setConnectorSaving(true);
    let authConfig;
    try { authConfig = buildAuthConfigFromForm(connectorForm); }
    catch { setConnectorErr('Extra headers must be valid JSON'); setConnectorSaving(false); return; }

    const payload = {
      uid: orgScope,
      name: connectorForm.name,
      baseUrl: connectorForm.baseUrl,
      usagePath: connectorForm.usagePath,
      authType: connectorForm.authType,
      authConfig,
      fieldMapping: connectorForm.fieldMapping,
      pollFrequencyMinutes: Number(connectorForm.pollFrequencyMinutes) || 60,
      thresholdCost: connectorForm.thresholdCost === '' ? null : Number(connectorForm.thresholdCost),
      thresholdUsage: connectorForm.thresholdUsage === '' ? null : Number(connectorForm.thresholdUsage),
      alertEmails: connectorForm.alertEmails.split(',').map(s => s.trim()).filter(Boolean),
      templateId: connectorForm.templateId,
    };

    try {
      const isEdit = !!editConnectorModal;
      const url    = isEdit ? `/api/admin/connectors/${editConnectorModal.id}?uid=${encodeURIComponent(orgScope)}` : `/api/admin/connectors?uid=${encodeURIComponent(orgScope)}`;
      const r = await apiFetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (!r.ok || !d.success) { setConnectorErr(d.message || d.error || 'Failed to save connector'); setConnectorSaving(false); return; }
      setAddConnectorModal(false);
      setEditConnectorModal(null);
      setConnectorForm(null);
      loadConnectors(orgScope);
    } catch { setConnectorErr('Network error'); }
    setConnectorSaving(false);
  }

  async function handleDeleteConnector(connectorId) {
    if (!window.confirm('Delete this connector and its usage history?')) return;
    await apiFetch(`/api/admin/connectors/${connectorId}?uid=${encodeURIComponent(orgScope)}`, { method: 'DELETE' }).catch(() => {});
    loadConnectors(orgScope);
  }

  async function handlePollNow(connectorId) {
    setConnectorPolling(connectorId);
    try {
      await apiFetch(`/api/admin/connectors/${connectorId}/poll-now?uid=${encodeURIComponent(orgScope)}`, { method: 'POST' });
    } catch {}
    setConnectorPolling(null);
    loadConnectors(orgScope);
  }

  async function openConnectorUsage(connector) {
    setConnectorUsageModal(connector);
    setConnectorUsageLoading(true);
    try {
      const r = await apiFetch(`/api/admin/connectors/${connector.id}/usage?uid=${encodeURIComponent(orgScope)}`);
      const d = await r.json();
      setConnectorUsageRows(Array.isArray(d.usage) ? d.usage : []);
    } catch { setConnectorUsageRows([]); }
    setConnectorUsageLoading(false);
  }

  function openEditConnectorModal(connector) {
    setEditConnectorModal(connector);
    setConnectorForm({
      ...blankConnectorForm(),
      name: connector.name,
      baseUrl: connector.baseUrl,
      usagePath: connector.usagePath,
      authType: connector.authType,
      fieldMapping: { ...blankConnectorForm().fieldMapping, ...connector.fieldMapping },
      pollFrequencyMinutes: connector.pollFrequencyMinutes,
      thresholdCost: connector.thresholdCost ?? '',
      thresholdUsage: connector.thresholdUsage ?? '',
      alertEmails: (connector.alertEmails || []).join(', '),
      templateId: connector.templateId,
    });
    setConnectorErr('');
  }

  // ── Deleted users (soft-delete restore window) ────────────────────────────
  const [deletedUsers, setDeletedUsers]   = useState([]);
  const [deletedLoading, setDeletedLoading] = useState(false);

  function loadDeletedUsers(scope) {
    if (!scope) return;
    setDeletedLoading(true);
    apiFetch(`/auth/deleted-users?admin=${encodeURIComponent(scope)}`)
      .then(r => r.json())
      .then(list => { setDeletedUsers(Array.isArray(list) ? list : []); setDeletedLoading(false); })
      .catch(() => setDeletedLoading(false));
  }

  useEffect(() => { loadDeletedUsers(orgScope); }, [orgScope]); // eslint-disable-line

  function handleRestoreUser(u) {
    if (!window.confirm(`Restore ${u.name || u.email}? They will be able to log in again.`)) return;
    apiFetch('/auth/restore-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: u.email, adminEmail: orgScope }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setDeletedUsers(prev => prev.filter(d => d.email !== u.email));
          loadUsersFromDB(orgScope);
        }
      })
      .catch(() => {});
  }

  // ── Admin profile — load from DB then fall back to localStorage ────────────
  const [adminProfile, setAdminProfile] = useState(() => getAdminProfile(admin?.email) || { name: admin?.name || 'Administrator', photo: null });
  const [editMode, setEditMode]   = useState(false);
  const [editName, setEditName]   = useState('');
  const [editPhoto, setEditPhoto] = useState(null);

  function syncAdminDataFromDB() {
    if (!orgScope) return;
    const isCoAdmin = !!admin?.orgAdmin;
    apiFetch(`/auth/admin-data/${encodeURIComponent(orgScope)}`)
      .then(r => r.json())
      .then(data => {
        if (!data || data.error) return;
        if (isCoAdmin) {
          // Co-admins: only take plan data from org admin record; use own name/photo
          fetch(`/auth/photo/${encodeURIComponent(admin.email)}`)
            .then(r => r.json())
            .then(pd => {
              const ownPhoto = pd?.photo || getUserPhoto(admin.email) || null;
              const updated  = { name: admin.name || adminProfile.name, photo: ownPhoto };
              saveAdminProfile(admin.email, updated);
              if (ownPhoto && admin?.email) {
                try { localStorage.setItem(`cn_user_photo_${admin.email}`, ownPhoto); } catch {}
              }
              setAdminProfile(updated);
            })
            .catch(() => {
              const updated = { name: admin.name || adminProfile.name, photo: getUserPhoto(admin.email) || adminProfile.photo };
              saveAdminProfile(admin.email, updated);
              setAdminProfile(updated);
            });
        } else {
          const photo = data.photo || adminProfile.photo;
          const updated = { name: data.name || adminProfile.name, photo };
          saveAdminProfile(admin.email, updated);
          if (photo && admin?.email) {
            try { localStorage.setItem(`cn_user_photo_${admin.email}`, photo); } catch {}
          }
          setAdminProfile(updated);
        }

        if (data.plan) {
          const s = getGlobalSettings();
          const patch = { ...s, currentPlan: data.plan };
          if (data.planPurchasedAt && !s.planPurchasedAt) patch.planPurchasedAt = data.planPurchasedAt;
          if (data.planPausedAt) patch.planPausedAt = data.planPausedAt;
          else delete patch.planPausedAt;
          saveGlobalSettings(patch);
          setSettings(prev => ({
            ...prev,
            currentPlan: data.plan,
            planPurchasedAt: patch.planPurchasedAt || prev.planPurchasedAt,
            planPausedAt: data.planPausedAt || null,
          }));
          setShowPlans(true);
          // Push purchasedAt to DB if DB is missing it but localStorage has it
          const localPurchasedAt = patch.planPurchasedAt || s.planPurchasedAt;
          if (!data.planPurchasedAt && localPurchasedAt && orgScope) {
            apiFetch('/auth/plan', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: orgScope, plan: data.plan, purchasedAt: localPurchasedAt }),
            }).catch(() => {});
          }
        } else {
          // Plan was cancelled by super admin — clear it locally too
          const s = getGlobalSettings();
          const cleared = { ...s };
          delete cleared.currentPlan; delete cleared.planPurchasedAt;
          delete cleared.planPaymentId; delete cleared.planPausedAt;
          saveGlobalSettings(cleared);
          setSettings(prev => ({ ...prev, currentPlan: null, planPurchasedAt: null, planPausedAt: null, planPaymentId: null }));
        }
      })
      .catch(() => {});
  }

  // Load on mount + re-poll every 30 s to catch super-admin plan changes
  useEffect(() => {
    syncAdminDataFromDB();
    const id = setInterval(syncAdminDataFromDB, 30000);
    return () => clearInterval(id);
  }, [admin?.email]); // eslint-disable-line

  function openEdit() {
    setEditName(adminProfile.name);
    setEditPhoto(adminProfile.photo);
    setEditMode(true);
  }
  function _compressPhoto(dataUrl) {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        const MAX = 256;
        const scale = Math.min(MAX / Math.max(img.width, img.height), 1);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = Object.assign(document.createElement('canvas'), { width: w, height: h });
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  }

  function saveProfile() {
    const updated = { name: editName.trim() || 'Administrator', photo: editPhoto };
    saveAdminProfile(admin?.email, updated);
    setAdminProfile(updated);
    // Mirror to the hub photo key so it persists across portal/hub switches
    if (admin?.email && editPhoto) {
      try { localStorage.setItem(`cn_user_photo_${admin.email}`, editPhoto); } catch {}
      onPhotoChange?.(editPhoto);
    }
    setEditMode(false);
    if (admin?.email) {
      apiFetch('/auth/photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: admin.email, photo: editPhoto }),
      }).catch(() => {});
    }
  }
  function handlePhotoChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async ev => {
      const compressed = await _compressPhoto(ev.target.result);
      setEditPhoto(compressed);
    };
    reader.readAsDataURL(file);
  }

  // User activity log — expandable rows
  const [expandedUsers,  setExpandedUsers]  = useState(new Set());
  const [userActivity,   setUserActivity]   = useState({}); // email -> { loading, events }
  const [exportModal,    setExportModal]    = useState(null); // null | { target:'all'|user, events:[], dateFrom:'', dateTo:'' }

  function filterByDate(events, from, to) {
    if (!from && !to) return events;
    return events.filter(ev => {
      if (!ev.ts) return true;
      const d = new Date(ev.ts);
      const p = n => String(n).padStart(2, '0');
      const localDate = `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`;
      if (from && localDate < from) return false;
      if (to   && localDate > to)   return false;
      return true;
    });
  }

  function formatEventLine(ev) {
    const d = ev.ts ? new Date(ev.ts) : new Date();
    const pad = n => String(n).padStart(2, '0');
    const ts = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

    const tagMap = {
      session_start: 'SESSION', tab_viewed: 'VIEW', cloud_connected: 'CONNECT',
      cloud_disconnected: 'DISCONNECT', report_exported: 'EXPORT',
      alert_acknowledged: 'ACK', invoice_viewed: 'INVOICE',
      login: 'LOGIN', register: 'REGISTER',
      service_clicked: 'CLICK', service_right_clicked: 'RIGHT CLICK',
    };
    const tag = tagMap[ev.type] || ev.type.toUpperCase().replace(/_/g, ' ');

    const det = ev.details || {};
    const toolLower    = (det.tool     || '').toLowerCase();
    const tabLower     = (det.tab      || '').toLowerCase().replace(/\s+/g, '-');
    const providerLow  = (det.provider || '').toLowerCase();

    // ── Derive path ──────────────────────────────────────────────────────────
    let path = det.path || ''; // prefer stored path from newer events
    if (!path) {
      if      (ev.type === 'session_start')                     path = `mycloudnexus.com/${toolLower || 'monitoring'}`;
      else if (ev.type === 'tab_viewed')                        path = `mycloudnexus.com/${toolLower || 'monitoring'}/${tabLower || 'overview'}`;
      else if (ev.type === 'cloud_connected'  && providerLow)   path = `mycloudnexus.com/monitoring/connections/${providerLow}`;
      else if (ev.type === 'cloud_disconnected' && providerLow) path = `mycloudnexus.com/monitoring/connections/${providerLow}`;
      else if (ev.type === 'report_exported')                   path = `mycloudnexus.com/${toolLower || 'monitoring'}/export`;
      else if (ev.type === 'alert_acknowledged')                path = `mycloudnexus.com/monitoring/alerts`;
      else if (ev.type === 'invoice_viewed')                    path = `mycloudnexus.com/billing/invoices`;
      else if (ev.type === 'login' || ev.type === 'register')   path = `mycloudnexus.com/login`;
      else                                                       path = `mycloudnexus.com`;
    }

    // ── Derive action ────────────────────────────────────────────────────────
    let action = '';
    if      (ev.type === 'session_start')       action = `opened ${toolLower || 'tool'}`;
    else if (ev.type === 'tab_viewed')           action = `visited ${det.tab || tabLower} tab`;
    else if (ev.type === 'cloud_connected') {
      const creds = det.credentials || {};
      let extra = '';
      if (creds.region)        extra += `  region:${creds.region}`;
      if (creds.projectId)     extra += `  project:${creds.projectId}`;
      if (creds.subscriptionId)extra += `  sub:${creds.subscriptionId}`;
      action = `connected ${(det.provider||'').toUpperCase()} account${extra}`;
    }
    else if (ev.type === 'cloud_disconnected')   action = `disconnected ${(det.provider||'').toUpperCase()} account`;
    else if (ev.type === 'report_exported')      action = `exported ${toolLower || 'monitoring'} report`;
    else if (ev.type === 'alert_acknowledged')   action = `acknowledged alert${det.name ? ': '+det.name : ''}`;
    else if (ev.type === 'invoice_viewed')       action = `viewed invoice${det.invoice ? ' '+det.invoice : ''}`;
    else if (ev.type === 'login')                action = 'signed in';
    else if (ev.type === 'register')             action = 'created account';
    else if (ev.type === 'service_clicked' || ev.type === 'service_right_clicked') {
      const verb = det.action || (ev.type === 'service_right_clicked' ? 'Right Click' : 'Left Click');
      const svc  = det.serviceName || '';
      const res  = det.resourceName || '';
      const cloud= det.cloud || '';
      const tabN = det.tab ? `${det.tab.toUpperCase()} tab` : '';
      const reg  = det.region ? ` · ${det.region}` : '';
      action = `${verb} — ${cloud} ${svc}${res ? ` "${res}"` : ''}${reg}${tabN ? ` · ${tabN}` : ''}`;
    }
    else                                         action = ev.type.replace(/_/g, ' ');

    return { ts, tag, path, action };
  }

  function triggerDownload(filename, html) {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function dateLabel(from, to) {
    if (from && to) return `${from}  →  ${to}`;
    if (from) return `From ${from}`;
    if (to)   return `Up to ${to}`;
    return 'All time';
  }

  const LOG_CSS = `
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Segoe UI',system-ui,sans-serif;background:#f1f5f9;color:#1e293b;padding:32px}
    .report{max-width:980px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 32px rgba(0,0,0,0.10)}
    .rh{background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);padding:28px 40px;display:flex;align-items:center;justify-content:space-between}
    .brand{display:flex;align-items:center;gap:14px}
    .bicon{width:42px;height:42px;background:linear-gradient(135deg,#38bdf8,#818cf8);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:800;color:#fff;letter-spacing:-1px}
    .bname{font-size:20px;font-weight:800;color:#f8fafc;letter-spacing:-0.3px}
    .bsub{font-size:10px;color:#475569;margin-top:2px;letter-spacing:1px;text-transform:uppercase}
    .rmeta{text-align:right}
    .rmeta .rl{font-size:10px;color:#475569;letter-spacing:1px;text-transform:uppercase;margin-bottom:2px}
    .rmeta .rv{font-size:12px;color:#94a3b8}
    .ucard{background:#f8fafc;border-bottom:1px solid #e2e8f0;padding:22px 40px;display:flex;align-items:center;gap:20px}
    .uav{width:50px;height:50px;background:linear-gradient(135deg,#38bdf8,#818cf8);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;color:#fff;flex-shrink:0}
    .uname{font-size:16px;font-weight:700;color:#0f172a}
    .uemail{font-size:12px;color:#64748b;margin-top:2px}
    .stats{margin-left:auto;display:flex;gap:28px}
    .st{text-align:center}
    .sv{font-size:24px;font-weight:800;color:#0f172a}
    .sl{font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-top:2px}
    .dbar{background:#fff;border-bottom:1px solid #e2e8f0;padding:10px 40px;display:flex;align-items:center;gap:10px;font-size:12px;color:#64748b;flex-wrap:wrap}
    .dbar strong{color:#0f172a}
    .pill{display:inline-flex;align-items:center;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:600}
    table{width:100%;border-collapse:collapse;font-size:13px}
    thead tr{background:#f8fafc}
    th{padding:11px 16px;text-align:left;font-size:10px;font-weight:700;color:#94a3b8;letter-spacing:1px;text-transform:uppercase;border-bottom:2px solid #e2e8f0}
    td{padding:10px 16px;border-bottom:1px solid #f1f5f9;vertical-align:middle}
    tr:last-child td{border-bottom:none}
    tr:nth-child(even) td{background:#fafbfc}
    .tc{font-family:'Courier New',monospace;font-size:11px;color:#64748b;white-space:nowrap}
    .tg{white-space:nowrap}
    .tp{display:inline-flex;align-items:center;padding:3px 11px;border-radius:20px;font-size:11px;font-weight:700;letter-spacing:0.3px}
    .tSESSION{background:#e0f2fe;color:#0369a1}
    .tVIEW{background:#ede9fe;color:#6d28d9}
    .tCONNECT{background:#dcfce7;color:#15803d}
    .tDISCONNECT{background:#fee2e2;color:#dc2626}
    .tEXPORT{background:#fef9c3;color:#a16207}
    .tACK{background:#d1fae5;color:#065f46}
    .tINVOICE{background:#cffafe;color:#0e7490}
    .tDEFAULT{background:#f1f5f9;color:#475569}
    .mc{color:#334155;font-size:13px}
    .rf{background:#f8fafc;border-top:1px solid #e2e8f0;padding:14px 40px;display:flex;align-items:center;justify-content:space-between;font-size:11px;color:#94a3b8}
    .ush{background:#f8fafc;border-top:3px solid #e2e8f0;border-left:4px solid #38bdf8;padding:18px 40px;display:flex;align-items:center;justify-content:space-between;page-break-before:always}
    .ush:first-child{border-top:none;page-break-before:auto}
    .ushn{font-size:14px;font-weight:700;color:#0f172a}
    .ushe{font-size:12px;color:#64748b;margin-top:2px}
    .empty{padding:20px 40px;font-size:12px;color:#94a3b8;font-style:italic}
    @media print{
      body{background:#fff;padding:0;margin:0}
      .report{box-shadow:none;border-radius:0;margin:0;max-width:100%}
      .rh{padding:14px 24px}
      .ucard{padding:10px 24px}
      .dbar{padding:6px 24px}
      .ush{padding:10px 24px}
      td{padding:6px 12px}
      th{padding:7px 12px}
      .rf{padding:10px 24px}
    }
  `;

  function tagPill(tag) {
    const cls = ['SESSION','VIEW','CONNECT','DISCONNECT','EXPORT','ACK','INVOICE'].includes(tag) ? tag : 'DEFAULT';
    return `<span class="tp t${cls}">${tag}</span>`;
  }

  function logRows(events) {
    if (!events.length) return `<tr><td colspan="4" class="empty">No events in this range.</td></tr>`;
    return events.map(ev => {
      const { ts, tag, path, action } = formatEventLine(ev);
      return `<tr><td class="tc">${ts}</td><td class="tg">${tagPill(tag)}</td><td class="mc" style="font-family:monospace;color:#2563eb">${path}</td><td class="mc">${action}</td></tr>`;
    }).join('');
  }

  function countByType(events) {
    const counts = {};
    events.forEach(ev => { counts[ev.type] = (counts[ev.type] || 0) + 1; });
    return counts;
  }

  function generateUserLogHTML(user, events) {
    const now = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
    const safe = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const c = countByType(events);
    const initial = (user.name || user.email)[0].toUpperCase();
    return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<title>MyCloudNexus Audit Log — ${safe(user.email)}</title>
<style>${LOG_CSS}</style></head><body>
<div class="report">
  <div class="rh">
    <div class="brand">
      <div class="bicon">CN</div>
      <div><div class="bname">MyCloudNexus</div><div class="bsub">Audit Log Report</div></div>
    </div>
    <div class="rmeta">
      <div class="rl">Exported</div><div class="rv">${now}</div>
      <div class="rl" style="margin-top:8px">Date Range</div><div class="rv">All events</div>
    </div>
  </div>
  <div class="ucard">
    <div class="uav">${safe(initial)}</div>
    <div>
      <div class="uname">${safe(user.name || user.email)}</div>
      <div class="uemail">${safe(user.email)}</div>
    </div>
    <div class="stats">
      <div class="st"><div class="sv">${events.length}</div><div class="sl">Events</div></div>
      ${c.cloud_connected   ? `<div class="st"><div class="sv" style="color:#15803d">${c.cloud_connected}</div><div class="sl">Connected</div></div>` : ''}
      ${c.tab_viewed        ? `<div class="st"><div class="sv" style="color:#6d28d9">${c.tab_viewed}</div><div class="sl">Tabs viewed</div></div>` : ''}
      ${c.report_exported   ? `<div class="st"><div class="sv" style="color:#a16207">${c.report_exported}</div><div class="sl">Exports</div></div>` : ''}
    </div>
  </div>
  <div class="dbar">
    <strong>Period:</strong> All events
    &nbsp;·&nbsp; <strong>${events.length}</strong> event${events.length!==1?'s':''}
    &nbsp;·&nbsp; User: ${safe(user.email)}
  </div>
  <div class="log-table-wrap">
    <table>
      <thead><tr><th>Timestamp</th><th>Event</th><th>Details</th></tr></thead>
      <tbody>${logRows(events)}</tbody>
    </table>
  </div>
  <div class="rf">
    <span>MyCloudNexus Admin Portal &mdash; Confidential</span>
    <span>Generated ${now}</span>
  </div>
</div>
</body></html>`;
  }

  function generateAllLogsHTML(loadedUsers, dateFrom, dateTo) {
    const now = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
    const safe = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const dateRangeLabel = dateFrom && dateTo ? `${dateFrom} → ${dateTo}` : dateFrom ? `From ${dateFrom}` : dateTo ? `Up to ${dateTo}` : 'All events';
    const totalEvents = loadedUsers.reduce((sum, u) => sum + filterByDate(userActivity[u.email]?.events || [], dateFrom, dateTo).length, 0);
    const sections = loadedUsers.map((u, idx) => {
      const filtered = filterByDate(userActivity[u.email]?.events || [], dateFrom, dateTo);
      const initial = (u.name || u.email)[0].toUpperCase();
      const c = countByType(filtered);
      return `
  <div class="ush" style="${idx === 0 ? 'page-break-before:auto;border-top:none' : ''}">
    <div>
      <div class="ushn">${safe(u.name || u.email)}</div>
      <div class="ushe">${safe(u.email)}</div>
    </div>
    <div style="display:flex;gap:24px;align-items:center">
      <div class="st"><div class="sv">${filtered.length}</div><div class="sl">Events</div></div>
      ${c.cloud_connected ? `<div class="st"><div class="sv" style="color:#15803d">${c.cloud_connected}</div><div class="sl">Connected</div></div>` : ''}
      ${c.tab_viewed      ? `<div class="st"><div class="sv" style="color:#6d28d9">${c.tab_viewed}</div><div class="sl">Views</div></div>` : ''}
    </div>
  </div>
  <table>
    <thead><tr><th>Timestamp</th><th>Event</th><th>Details</th></tr></thead>
    <tbody>${logRows(filtered)}</tbody>
  </table>`;
    }).join('');
    return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<title>MyCloudNexus Audit Logs — All Users</title>
<style>${LOG_CSS}</style></head><body>
<div class="report">
  <div class="rh">
    <div class="brand">
      <div class="bicon">CN</div>
      <div><div class="bname">MyCloudNexus</div><div class="bsub">Combined Audit Log</div></div>
    </div>
    <div class="rmeta">
      <div class="rl">Exported</div><div class="rv">${now}</div>
      <div class="rl" style="margin-top:8px">Date Range</div><div class="rv">${dateRangeLabel}</div>
    </div>
  </div>
  <div class="dbar">
    <strong>Period:</strong> ${dateRangeLabel}
    &nbsp;·&nbsp; <strong>${loadedUsers.length}</strong> user${loadedUsers.length!==1?'s':''}
    &nbsp;·&nbsp; <strong>${totalEvents}</strong> total event${totalEvents!==1?'s':''}
  </div>
  ${sections}
  <div class="rf">
    <span>MyCloudNexus Admin Portal &mdash; Confidential</span>
    <span>Generated ${now}</span>
  </div>
</div>
</body></html>`;
  }

  function printAsPDF(html) {
    // Inject auto-print script into the HTML before opening
    const printHtml = html.replace('</body>', `<script>window.onload=function(){setTimeout(function(){window.print();},400);};<\/script></body>`);
    const blob = new Blob([printHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 120000);
  }

  function filenameDateStr(from, to) {
    if (from && to && from === to) return from;
    if (from && to) return `${from}_to_${to}`;
    if (from) return `from_${from}`;
    if (to)   return `to_${to}`;
    return new Date().toISOString().slice(0, 10);
  }

  function csvMeta(userLabel) {
    const now = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
    const period = 'All events';
    const lines = [
      `# MyCloudNexus Audit Log`,
      userLabel ? `# User: ${userLabel}` : `# Report: All Users`,
      `# Period: ${period}`,
      `# Exported: ${now}`,
      `#`,
    ];
    return lines.join('\r\n') + '\r\n';
  }

  function generateCSV(events, userLabel) {
    const esc = v => '"' + String(v || '').replace(/"/g, '""') + '"';
    const header = ['Timestamp','Tag','Path','Action'].map(esc).join(',');
    const rows = events.map(ev => {
      const { ts, tag, path, action } = formatEventLine(ev);
      return [ts, tag, path, action].map(esc).join(',');
    });
    return '﻿' + csvMeta(userLabel) + [header, ...rows].join('\r\n');
  }

  function generateAllCSV(loadedUsers, dateFrom, dateTo) {
    const esc = v => '"' + String(v || '').replace(/"/g, '""') + '"';
    const header = ['User Name','Email','Timestamp','Tag','Path','Action'].map(esc).join(',');
    const rows = [];
    loadedUsers.forEach(u => {
      filterByDate(userActivity[u.email]?.events || [], dateFrom, dateTo).forEach(ev => {
        const { ts, tag, path, action } = formatEventLine(ev);
        rows.push([u.name || u.email, u.email, ts, tag, path, action].map(esc).join(','));
      });
    });
    return '﻿' + csvMeta(null) + [header, ...rows].join('\r\n');
  }

  function blobDownload(filename, content, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.style.display = 'none';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function downloadUserLog(user, events, fmt, dateFrom, dateTo) {
    const safeEmail = user.email.replace(/[^a-z0-9._-]/gi, '_');
    const datePart = filenameDateStr(dateFrom, dateTo);
    if (fmt === 'pdf') {
      printAsPDF(generateUserLogHTML(user, events));
    } else if (fmt === 'csv') {
      blobDownload(
        `mycloudnexus-log-${safeEmail}-${datePart}.csv`,
        generateCSV(events, user.email),
        'text/csv;charset=utf-8'
      );
    }
  }

  function downloadAllLogs(fmt, dateFrom, dateTo) {
    const loaded = users.filter(u => userActivity[u.email] && !userActivity[u.email].loading);
    if (!loaded.length) { alert('Expand at least one user row to load their activity first.'); return; }
    const datePart = filenameDateStr(dateFrom, dateTo);
    if (fmt === 'pdf') {
      printAsPDF(generateAllLogsHTML(loaded, dateFrom, dateTo));
    } else if (fmt === 'csv') {
      blobDownload(
        `mycloudnexus-logs-all-${datePart}.csv`,
        generateAllCSV(loaded, dateFrom, dateTo),
        'text/csv;charset=utf-8'
      );
    }
  }

  function doExportFromModal(fmt) {
    const { target, events, dateFrom, dateTo } = exportModal;
    if (target === 'all') {
      downloadAllLogs(fmt, dateFrom, dateTo);
    } else {
      downloadUserLog(target, filterByDate(events, dateFrom, dateTo), fmt, dateFrom, dateTo);
    }
    setExportModal(null);
  }

  function toggleActivityRow(email) {
    setExpandedUsers(prev => {
      const next = new Set(prev);
      if (next.has(email)) { next.delete(email); return next; }
      next.add(email);
      return next;
    });
    setUserActivity(prev => {
      if (prev[email]) return prev; // already loaded
      const updated = { ...prev, [email]: { loading: true, events: [] } };
      fetch(`/api/activity/${encodeURIComponent(email)}`)
        .then(r => r.json())
        .then(data => setUserActivity(p => ({ ...p, [email]: { loading: false, events: data.events || [] } })))
        .catch(() => setUserActivity(p => ({ ...p, [email]: { loading: false, events: [] } })));
      return updated;
    });
  }

  function openDownloadModal(u) {
    const existing = userActivity[u.email];
    if (existing && !existing.loading) {
      setExportModal({ target: u, events: existing.events, dateFrom: '', dateTo: '' });
    } else {
      // Fetch activity first, then open modal
      setUserActivity(prev => ({ ...prev, [u.email]: { loading: true, events: [] } }));
      fetch(`/api/activity/${encodeURIComponent(u.email)}`)
        .then(r => r.json())
        .then(data => {
          const events = data.events || [];
          setUserActivity(p => ({ ...p, [u.email]: { loading: false, events } }));
          setExportModal({ target: u, events, dateFrom: '', dateTo: '' });
        })
        .catch(() => {
          setUserActivity(p => ({ ...p, [u.email]: { loading: false, events: [] } }));
          setExportModal({ target: u, events: [], dateFrom: '', dateTo: '' });
        });
    }
  }

  // Manage Plan — plan cards visibility + bundle toggle (must be at component level)
  const [showPlans,     setShowPlans]     = useState(() => !!getGlobalSettings().currentPlan);
  const [bundleTab,     setBundleTab]     = useState(() => {
    const p = getGlobalSettings().currentPlan;
    return p === "Billing Bundle" ? "billing" : "monitoring";
  });
  const [payState,      setPayState]      = useState({ loading: false, planName: "", error: "", success: "" });
  const [overLimitSecs, setOverLimitSecs] = useState(null); // null = OK, number = countdown
  const [, setRenewalTick] = useState(0); // forces re-render every second for live countdown
  useEffect(() => {
    const id = setInterval(() => setRenewalTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Load Razorpay checkout.js once
  useEffect(() => {
    if (document.getElementById("razorpay-checkout-js")) return;
    const s  = document.createElement("script");
    s.id     = "razorpay-checkout-js";
    s.src    = "https://checkout.razorpay.com/v1/checkout.js";
    s.async  = true;
    document.body.appendChild(s);
  }, []);

  async function handleBuyNow(planLabel, amountPaise) {
    setPayState({ loading: true, planName: planLabel, error: "", success: "" });
    try {
      const res = await fetch("/api/create-order", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ amount: amountPaise, currency: "INR", plan_name: planLabel }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create order");

      const options = {
        key:         import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount:      data.amount,
        currency:    data.currency,
        name:        "MyCloudNexus",
        description: planLabel,
        order_id:    data.order_id,
        handler:     async (response) => {
          try {
            const vRes  = await fetch("/api/verify-payment", {
              method:  "POST",
              headers: { "Content-Type": "application/json" },
              body:    JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id:   response.razorpay_order_id,
                razorpay_signature:  response.razorpay_signature,
              }),
            });
            const vData = await vRes.json();
            if (vData.ok) {
              setPayState({ loading: false, planName: planLabel, error: "", success: response.razorpay_payment_id });
              // Persist purchased plan
              const s = JSON.parse(localStorage.getItem("cn_settings") || "{}");
              const purchasedAt = Date.now();
              const updated = { ...s, currentPlan: planLabel, planPaymentId: response.razorpay_payment_id, planPurchasedAt: purchasedAt };
              localStorage.setItem("cn_settings", JSON.stringify(updated));
              setSettings(prev => ({ ...prev, currentPlan: planLabel, planPaymentId: response.razorpay_payment_id, planPurchasedAt: purchasedAt }));
              // Persist plan to DB under the org primary admin's email
              if (orgScope) {
                apiFetch('/auth/plan', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: orgScope, plan: planLabel, purchasedAt }) }).catch(() => {});
              }
              // Auto-strip tools no longer included in the new plan and persist to DB
              const newAllowed = (PLAN_RESTRICTIONS[planLabel] || { allowedTools: ["monitoring","billing"] }).allowedTools;
              setUsers(prev => prev.map(u => ({ ...u, tools: (u.tools || []).filter(t => newAllowed.includes(t)) })));
              if (orgScope) {
                users.forEach(u => {
                  const strippedTools = (u.tools || []).filter(t => newAllowed.includes(t));
                  if (strippedTools.length < (u.tools || []).length) {
                    apiFetch(`/auth/users/${encodeURIComponent(u.email)}/tools`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ tools: strippedTools, admin: orgScope }),
                    }).catch(() => {});
                  }
                });
              }
            } else {
              setPayState({ loading: false, planName: planLabel, error: "Payment verification failed. Please contact support.", success: "" });
            }
          } catch {
            setPayState({ loading: false, planName: planLabel, error: "Verification error — please contact support.", success: "" });
          }
        },
        prefill: { name: adminProfile?.name || "Admin", email: admin?.email || "" },
        theme:   { color: "#2563eb" },
        modal:   { ondismiss: () => setPayState(p => ({ ...p, loading: false })) },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (r) => {
        setPayState({ loading: false, planName: planLabel, error: `Payment failed: ${r.error.description}`, success: "" });
      });
      rzp.open();
    } catch (err) {
      setPayState({ loading: false, planName: planLabel, error: err.message, success: "" });
    }
  }

  // Settings toggles — persisted to cn_settings localStorage
  const [settings, setSettings] = useState(() => ({
    emailNotifs:  true,
    activityLogs: true,
    autoExpiry:   true,
    darkMode:     false,
    mfaForUsers:  false,
    ...getGlobalSettings(),
  }));
  function updateSetting(key, val) {
    const next = { ...settings, [key]: val };
    setSettings(next);
    saveGlobalSettings(next);
  }

  // Auto-expand plan grid and sync bundle tab when navigating to plan section
  useEffect(() => {
    if (section === "plan" && settings.currentPlan) {
      setShowPlans(true);
      if (settings.currentPlan === "Billing Bundle") setBundleTab("billing");
      else if (settings.currentPlan === "Monitoring Bundle") setBundleTab("monitoring");
    }
  }, [section, settings.currentPlan]); // eslint-disable-line

  function handleCancelPlan() {
    const planName = settings.currentPlan;
    if (!window.confirm(`Cancel your "${planName}" subscription?\n\nYour account will immediately switch to Developer mode with no usage limits.`)) return;
    const next = { ...settings };
    delete next.currentPlan;
    delete next.planPaymentId;
    delete next.planPurchasedAt;
    saveGlobalSettings(next);
    setSettings(next);
    setUsers(prev => prev.map(u => ({ ...u, tools: ["monitoring", "billing"] })));
    // Restore full tool access in DB for all users when plan is cancelled
    if (orgScope) {
      users.forEach(u => {
        if (!(u.tools || []).includes("monitoring") || !(u.tools || []).includes("billing")) {
          apiFetch(`/auth/users/${encodeURIComponent(u.email)}/tools`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tools: ["monitoring", "billing"], admin: orgScope }),
          }).catch(() => {});
        }
      });
    }
    setPayState({ loading: false, planName: "", error: "", success: "" });
    // Persist cancellation to DB so plan is not restored on page refresh
    if (orgScope) {
      apiFetch('/auth/plan', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: orgScope, plan: null, purchasedAt: null }),
      }).catch(() => {});
    }
  }

  // Plan-based restrictions
  const PLAN_RESTRICTIONS = {
    "Monitoring Bundle": { allowedTools: ["monitoring"], maxUsers: 1 },
    "Billing Bundle":    { allowedTools: ["billing"],    maxUsers: 1 },
    "Standard Pro":      { allowedTools: ["monitoring", "billing"], maxUsers: 3 },
    "Professional":      { allowedTools: ["monitoring", "billing"], maxUsers: 8, maxToolUsers: { monitoring: 3, billing: 3 } },
    "Enterprise":        { allowedTools: ["monitoring", "billing"], maxUsers: Infinity },
  };
  const planRestrictions = settings.currentPlan
    ? (PLAN_RESTRICTIONS[settings.currentPlan] || { allowedTools: ["monitoring", "billing"], maxUsers: Infinity })
    : { allowedTools: ["monitoring", "billing"], maxUsers: Infinity };

  // Correct default section if monitoring is not on this plan
  useEffect(() => {
    const allowed = planRestrictions.allowedTools;
    setSection(prev => {
      if (prev === "tool-monitoring" && !allowed.includes("monitoring")) {
        return allowed.includes("billing") ? "tool-billing" : "users";
      }
      return prev;
    });
  }, []); // eslint-disable-line

  // Backfill planPurchasedAt + auto-strip disallowed tools on mount
  useEffect(() => {
    if (settings.currentPlan && !settings.planPurchasedAt) {
      const purchasedAt = Date.now();
      const persisted = { ...getGlobalSettings(), planPurchasedAt: purchasedAt };
      saveGlobalSettings(persisted);
      setSettings(prev => ({ ...prev, planPurchasedAt: purchasedAt }));
    }
    // Strip tools that the current plan does not include
    const allowed = planRestrictions.allowedTools;
    setUsers(prev => {
      const needsFix = prev.some(u => (u.tools || []).some(t => !allowed.includes(t)));
      return needsFix ? prev.map(u => ({ ...u, tools: (u.tools || []).filter(t => allowed.includes(t)) })) : prev;
    });
  }, []); // eslint-disable-line

  // Auto-refresh every 30 s so online status and session timers stay current
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

  // Start / cancel over-limit countdown whenever user count or plan changes
  useEffect(() => {
    if (!orgScope) return;
    const { maxUsers } = planRestrictions;
    const storageKey = `cn_overlimit_start_${orgScope}`;
    if (maxUsers !== Infinity && users.length > maxUsers) {
      setOverLimitSecs(prev => {
        if (prev !== null) return prev; // timer already running — don't restart
        // Check if a countdown was already in progress before the last page refresh
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const elapsed = Math.floor((Date.now() - Number(stored)) / 1000);
          return Math.max(0, 60 - elapsed); // resume from where it left off
        }
        // Fresh over-limit situation — record start time so refresh can resume it
        localStorage.setItem(storageKey, String(Date.now()));
        return 60;
      });
    } else if (users.length > 0) {
      // Users are definitely loaded and within limits — cancel any running timer
      setOverLimitSecs(null);
      localStorage.removeItem(storageKey);
    }
    // If users.length === 0 the fetch hasn't returned yet — don't touch the timer
  }, [users.length, settings.currentPlan, orgScope]); // eslint-disable-line

  // Countdown ticker + auto-remove at 0
  useEffect(() => {
    if (overLimitSecs === null || overLimitSecs < 0) return;
    if (overLimitSecs === 0) {
      // Time's up — keep the oldest N users, permanently delete the rest
      const { maxUsers } = planRestrictions;
      if (maxUsers !== Infinity && users.length > maxUsers) {
        const sorted  = [...users].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
        const kept    = sorted.slice(0, maxUsers);
        const removed = sorted.slice(maxUsers);
        removed.forEach(u => {
          const adminParam = encodeURIComponent(orgScope || '');
          apiFetch(`/auth/users/${encodeURIComponent(u.email)}?admin=${adminParam}&deletedBy=${adminParam}`, { method: 'DELETE' })
            .then(() => loadDeletedUsers(orgScope))
            .catch(() => {});
          try {
            const revoked = JSON.parse(localStorage.getItem('cn_revoked_sessions') || '{}');
            revoked[u.email.toLowerCase()] = Date.now();
            localStorage.setItem('cn_revoked_sessions', JSON.stringify(revoked));
          } catch {}
        });
        setUsers(kept);
      }
      if (orgScope) localStorage.removeItem(`cn_overlimit_start_${orgScope}`);
      setOverLimitSecs(null);
      return;
    }
    const id = setTimeout(() => setOverLimitSecs(s => (s !== null ? s - 1 : null)), 1000);
    return () => clearTimeout(id);
  }, [overLimitSecs]); // eslint-disable-line

  // Create user modal state
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", passType: "auto", password: "", showPass: false });
  const [formErr, setFormErr] = useState("");
  const [oneTimePass, setOneTimePass] = useState("");
  const [copied, setCopied] = useState(false);

  const updateUsers = (list) => { setUsers(list); };

  /* ── Create user ── */
  async function handleCreate() {
    if (!form.name.trim() || !form.email.trim()) { setFormErr("Name and email are required."); return; }
    if (!/\S+@\S+\.\S+/.test(form.email)) { setFormErr("Enter a valid email address."); return; }

    // Domain must match the admin's own email domain
    const adminDomain = admin?.email?.split("@")[1]?.toLowerCase();
    const userDomain  = form.email.split("@")[1]?.toLowerCase();
    if (adminDomain && userDomain !== adminDomain) {
      setFormErr(`Only @${adminDomain} email addresses are allowed in this organisation.`);
      return;
    }

    // Enforce plan user limit
    const { maxUsers } = planRestrictions;
    if (users.length >= maxUsers) {
      const planName = settings.currentPlan || "your current plan";
      setFormErr(`User limit reached. ${planName} allows a maximum of ${maxUsers} user${maxUsers === 1 ? "" : "s"}. Upgrade your plan to add more.`);
      return;
    }

    if (form.passType === "manual" && !form.password) { setFormErr("Please enter a password."); return; }
    if (users.find(u => u.email.toLowerCase() === form.email.toLowerCase())) { setFormErr("A user with this email already exists."); return; }

    const pwd = form.passType === "auto" ? genPassword() : form.password;

    // Clear any prior revocation for this email so a re-created user isn't locked out
    try {
      const revoked = JSON.parse(localStorage.getItem('cn_revoked_sessions') || '{}');
      delete revoked[form.email.trim().toLowerCase()];
      localStorage.setItem('cn_revoked_sessions', JSON.stringify(revoked));
    } catch {}

    setFormErr("Creating…");

    // Register in backend DB under this admin's org — wait for DB confirmation
    try {
      const res = await apiFetch('/auth/register-org-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name.trim(), email: form.email.trim(), password: pwd, orgAdmin: orgScope, tools: planRestrictions.allowedTools }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormErr(data?.error || `Server error (${res.status}). Please try again.`);
        return;
      }
    } catch (err) {
      setFormErr("Network error. Please check your connection and try again.");
      return;
    }

    // Reload user list from DB so we get the real persisted record (not a fake local ID)
    loadUsersFromDB(orgScope);
    setFormErr("");

    if (form.passType === "auto") {
      setOneTimePass(pwd);
    } else {
      closeModal();
    }
  }

  function closeModal() {
    setShowModal(false);
    setForm({ name: "", email: "", passType: "auto", password: "", showPass: false });
    setFormErr("");
    setOneTimePass("");
    setCopied(false);
  }

  function copyPass() {
    navigator.clipboard.writeText(oneTimePass).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  function deleteUser(id) {
    const target = users.find(u => u.id === id);
    if (!target) return;
    if (window.confirm(`Delete ${target.name}? They will be blocked from logging in. You can restore them within 7 days from the Restore Users section.`)) {
      const adminParam   = encodeURIComponent(orgScope || '');
      const deletedByParam = encodeURIComponent(orgScope || '');
      apiFetch(`/auth/users/${encodeURIComponent(target.email)}?admin=${adminParam}&deletedBy=${deletedByParam}`, { method: 'DELETE' })
        .then(() => loadDeletedUsers(orgScope))
        .catch(() => {});
      fetch('/api/revoke-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: target.email }),
      }).catch(() => {});
      try {
        const revoked = JSON.parse(localStorage.getItem('cn_revoked_sessions') || '{}');
        revoked[target.email.toLowerCase()] = Date.now();
        localStorage.setItem('cn_revoked_sessions', JSON.stringify(revoked));
      } catch {}
      updateUsers(users.filter(u => u.id !== id));
    }
  }

  const PROMOTE_PLANS = ['Standard Pro', 'Professional', 'Enterprise'];
  const maxSubAdmins = settings.currentPlan === 'Enterprise' ? -1 : 1; // -1 = unlimited

  async function handlePromote(user) {
    setPromoting(user.id); setPromoteErr('');
    try {
      const r = await apiFetch('/auth/promote-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, orgAdmin: orgScope, maxSubAdmins }),
      });
      const d = await r.json();
      if (!r.ok) {
        setPromoteErr(d.error || 'Failed to promote');
      } else {
        // Optimistic update immediately, then re-sync from DB to confirm it persisted
        setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: 'admin' } : u));
        apiFetch(`/auth/users?admin=${encodeURIComponent(orgScope)}`)
          .then(res => res.json())
          .then(dbUsers => {
            if (Array.isArray(dbUsers)) {
              setUsers(dbUsers.map(u => ({
                id: u.id, name: u.name, email: u.email, role: u.role || 'user',
                mfaEnabled: u.mfaEnabled, createdAt: u.createdAt, lastLogin: u.lastLogin,
                tools: Array.isArray(u.tools) ? u.tools : ['monitoring','billing'], photo: u.photo || null,
              })));
            }
          }).catch(() => {});
      }
    } catch { setPromoteErr('Network error'); }
    setPromoting(null);
  }

  async function handleDemote(user) {
    setPromoting(user.id); setPromoteErr('');
    try {
      const r = await apiFetch('/auth/demote-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, orgAdmin: orgScope }),
      });
      const d = await r.json();
      if (!r.ok) {
        setPromoteErr(d.error || 'Failed to demote');
      } else {
        // Optimistic update immediately, then re-sync from DB to confirm it persisted
        setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: 'user' } : u));
        apiFetch(`/auth/users?admin=${encodeURIComponent(orgScope)}`)
          .then(res => res.json())
          .then(dbUsers => {
            if (Array.isArray(dbUsers)) {
              setUsers(dbUsers.map(u => ({
                id: u.id, name: u.name, email: u.email, role: u.role || 'user',
                mfaEnabled: u.mfaEnabled, createdAt: u.createdAt, lastLogin: u.lastLogin,
                tools: Array.isArray(u.tools) ? u.tools : ['monitoring','billing'], photo: u.photo || null,
              })));
            }
          }).catch(() => {});
      }
    } catch { setPromoteErr('Network error'); }
    setPromoting(null);
  }

  function toggleTool(userId, tool) {
    if (!planRestrictions.allowedTools.includes(tool)) return; // blocked by plan
    const target = users.find(u => u.id === userId);
    if (!target) return;
    const isEnabling = !target.tools.includes(tool);
    if (isEnabling && planRestrictions.maxToolUsers) {
      const limit = planRestrictions.maxToolUsers[tool];
      if (limit != null && users.filter(u => u.tools.includes(tool)).length >= limit) return;
    }
    const newUsers = users.map(u => {
      if (u.id !== userId) return u;
      const tools = u.tools.includes(tool) ? u.tools.filter(t => t !== tool) : [...u.tools, tool];
      return { ...u, tools };
    });
    updateUsers(newUsers);
    const updated = newUsers.find(u => u.id === userId);
    if (updated && orgScope) {
      apiFetch(`/auth/users/${encodeURIComponent(updated.email)}/tools`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tools: updated.tools, admin: orgScope }),
      }).catch(() => {});
    }
  }

  /* ── Nav items ── */
  const navItems = [
    { id: "users",          label: "Users",          Icon: UsersIcon },
    { id: "restore",        label: "Restore Users",  Icon: RestoreIcon, badge: deletedUsers.length || null },
    { id: "access",         label: "Manage Access",  Icon: AccessIcon },
    { id: "cloud-accounts", label: "Account Access", Icon: CloudAccountNavIcon },
    { id: "connectors",     label: "Connectors",     Icon: ConnectorsNavIcon },
    { id: "ai-billing",     label: "AI Billing",     Icon: AiBillingNavIcon },
    { id: "plan",           label: "Manage Plan",    Icon: PlanIcon },
    { id: "account",        label: "Account",        Icon: AccountIcon },
    { id: "settings",       label: "Settings",       Icon: SettingsIcon },
  ];

  const sectionTitles = {
    "tool-monitoring": "Monitoring",
    "tool-billing":    "Billing",
    users:              "Users",
    restore:            "Restore Users",
    access:             "Manage Access",
    "cloud-accounts":   "Account Access",
    connectors:         "Connectors",
    "ai-billing":       "AI Billing",
    plan:               "Manage Plan",
    account:            "Account",
    settings:           "Settings",
  };

  /* ── Section renderers ── */
  function renderToolSection(toolKey) {
    const isMonitoring = toolKey === "monitoring";
    const toolName    = isMonitoring ? "Monitoring" : "Billing";
    const toolImg     = isMonitoring ? `${import.meta.env.BASE_URL}images/card-monitoring.png` : `${import.meta.env.BASE_URL}images/card-billing.png`;
    const toolDesc    = isMonitoring
      ? "Real-time infrastructure monitoring, live alerts, server health dashboards, and network analytics."
      : "Cloud cost analytics, invoice management, budget forecasting, and spend optimisation.";
    const accentColor = isMonitoring ? "#2563eb" : "#16a34a";
    const bgColor     = isMonitoring ? "#eff6ff" : "#f0fdf4";
    const borderColor = isMonitoring ? "#bfdbfe" : "#bbf7d0";

    return (
      <>
        {/* Info row */}
        <div className="ap-card" style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 18, padding: "20px 26px" }}>
          <div style={{ width: 46, height: 46, borderRadius: 12, background: bgColor, border: `1.5px solid ${borderColor}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {isMonitoring ? <MonitoringNavIcon /> : <BillingNavIcon />}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 3 }}>{toolName}</div>
            <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6 }}>{toolDesc}</div>
          </div>
          <button
            className="ap-btn-primary"
            style={{ background: accentColor, flexShrink: 0, border: "none", cursor: "pointer", fontFamily: "inherit" }}
            onClick={() => onOpenTool?.(toolKey)}
          >
            Open {toolName} <ArrowRightIcon />
          </button>
        </div>

        {/* Card preview — click to open tool fullscreen */}
        <div
          className="ap-tool-launch-card"
          onClick={() => onOpenTool?.(toolKey)}
          title={`Open ${toolName}`}
          style={{ display: "block", cursor: "pointer" }}
        >
          <img src={toolImg} alt={toolName} />
          <div className="ap-tool-launch-fade" />
          <button className={`ap-tool-launch-cta${isMonitoring ? "" : " billing"}`}>
            Go to {toolName} <ArrowRightIcon />
          </button>
        </div>
      </>
    );
  }

  function renderUsers() {
    const activity   = getActivity(); // fresh read every render (tick forces re-render every 30s)
    const monitoring = users.filter(u => u.tools.includes("monitoring")).length;
    const billing    = users.filter(u => u.tools.includes("billing")).length;
    const onlineNow  = onlineUsers.filter(o => users.some(u => u.email?.toLowerCase() === o.email?.toLowerCase())).length;

    return (
      <>
        <div className="ap-stats-row">
          <div className="ap-stat-card blue"><div className="ap-stat-val">{users.length}</div><div className="ap-stat-label">Total Users</div></div>
          <div className="ap-stat-card" style={{borderLeft:"3px solid #22c55e"}}>
            <div className="ap-stat-val" style={{color:"#16a34a"}}>{onlineNow}</div>
            <div className="ap-stat-label">Online Now</div>
          </div>
          <div className="ap-stat-card green"><div className="ap-stat-val">{monitoring}</div><div className="ap-stat-label">Monitoring Access</div></div>
          <div className="ap-stat-card purple"><div className="ap-stat-val">{billing}</div><div className="ap-stat-label">Billing Access</div></div>
        </div>

        {/* Export bar */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"flex-end",marginBottom:12}}>
          <button
            onClick={() => setExportModal({ target: 'all', dateFrom: '', dateTo: '' })}
            style={{fontSize:12,fontWeight:600,color:"#fff",background:"linear-gradient(135deg,#1e293b,#334155)",border:"none",cursor:"pointer",padding:"6px 14px",borderRadius:6,fontFamily:"inherit",display:"flex",alignItems:"center",gap:6}}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export All Logs
          </button>
        </div>

        <div className="ap-card">
          {usersLoading ? (
            <div className="ap-empty">
              <div style={{width:36,height:36,border:"3px solid #e2e8f0",borderTopColor:"#2563eb",borderRadius:"50%",animation:"spin 0.75s linear infinite",margin:"0 auto 14px"}} />
              <div className="ap-empty-text" style={{color:"#64748b"}}>Loading users…</div>
            </div>
          ) : users.length === 0 ? (
            <div className="ap-empty">
              <div className="ap-empty-icon">👥</div>
              <div className="ap-empty-text">No users yet. Create your first user to get started.</div>
              <button
                onClick={() => loadUsersFromDB(orgScope)}
                style={{marginTop:14,padding:"7px 16px",borderRadius:8,border:"1px solid #e2e8f0",background:"#f8fafc",cursor:"pointer",fontSize:12,fontWeight:600,color:"#475569",fontFamily:"inherit"}}
              >
                Retry
              </button>
            </div>
          ) : (
            <table className="ap-table">
              <thead><tr>
                <th>User</th><th>Status</th><th>Last Login</th><th>Session</th><th>Access</th><th>Actions</th>
              </tr></thead>
              <tbody>
                {users.map(u => {
                  const act        = activity[u.email];
                  const serverUser = onlineUsers.find(o => o.email?.toLowerCase() === u.email?.toLowerCase());
                  const online     = !!serverUser;
                  const activeDuration = online && serverUser?.loginTime
                    ? Date.now() - serverUser.loginTime : null;
                  const lastDuration = act?.lastSessionDuration || null;
                  const photo   = u.photo || getUserPhoto(u.email);
                  const isExpanded = expandedUsers.has(u.email);
                  const actData = userActivity[u.email];

                  return (
                    <Fragment key={u.id}>
                    <tr style={{background: isExpanded ? "#f8faff" : undefined}}>
                      {/* User */}
                      <td>
                        <div className="ap-user-cell">
                          <div className="ap-user-avatar" style={{
                            background: photo ? "transparent" : online
                              ? "linear-gradient(135deg,#16a34a,#22c55e)"
                              : "linear-gradient(135deg,#94a3b8,#64748b)",
                            overflow: "hidden", padding: 0,
                          }}>
                            {photo
                              ? <img src={photo} alt={u.name} style={{width:"100%",height:"100%",objectFit:"cover",display:"block",borderRadius:8}} />
                              : u.name[0].toUpperCase()}
                          </div>
                          <div>
                            <div style={{fontWeight:700,color:"#0f172a",fontSize:13,display:"flex",alignItems:"center",gap:4}}>
                              {u.name}
                              {onlineUsers.some(o => o.email?.toLowerCase() === u.email?.toLowerCase()) && (
                                <span style={{display:"inline-block",width:7,height:7,borderRadius:"50%",background:"#22c55e",flexShrink:0}} title="Online now (WebSocket)" />
                              )}
                            </div>
                            <div style={{fontSize:11,color:"#94a3b8"}}>{u.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td>
                        <div className="ap-status">
                          <span className={`ap-dot ${online ? "online" : "offline"}`} />
                          <span className={`ap-status-label ${online ? "online" : "offline"}`}>
                            {online ? "Online" : "Offline"}
                          </span>
                        </div>
                      </td>

                      {/* Last Login */}
                      <td>
                        {u.lastLogin ? (
                          <div className="ap-dt">{fmtDateTime(u.lastLogin)}</div>
                        ) : (
                          <span style={{fontSize:12,color:"#cbd5e1"}}>Never logged in</span>
                        )}
                      </td>

                      {/* Session duration */}
                      <td>
                        {activeDuration ? (
                          <span className="ap-chip active">● Active {fmtDuration(activeDuration)}</span>
                        ) : lastDuration ? (
                          <span className="ap-chip inactive">Last: {fmtDuration(lastDuration)}</span>
                        ) : (
                          <span className="ap-chip never">—</span>
                        )}
                      </td>

                      {/* Access */}
                      <td>
                        <div className="ap-badge-row">
                          {u.role === 'admin' && (
                            <span style={{fontSize:11,fontWeight:700,color:"#a78bfa",background:"#1e1b4b",border:"1px solid #4c1d95",borderRadius:6,padding:"2px 8px",letterSpacing:.5}}>Co-Admin</span>
                          )}
                          {u.tools.includes("monitoring") && <span className="ap-tool-badge monitoring">Monitoring</span>}
                          {u.tools.includes("billing")    && <span className="ap-tool-badge billing">Billing</span>}
                          {u.tools.length === 0 && u.role !== 'admin' && <span style={{fontSize:12,color:"#94a3b8"}}>No access</span>}
                          {/* Cloud account provider badges */}
                          {(() => {
                            const userAccounts = orgUserCloudAccess[(u.email || '').toLowerCase()] || [];
                            const providers = [...new Set(userAccounts.map(a => a.provider))];
                            return providers.map(p => (
                              <button
                                key={p}
                                title={`View ${p.toUpperCase()} accounts for ${u.name}`}
                                onClick={() => {
                                  const provAccounts = userAccounts.filter(a => a.provider === p);
                                  setCloudAccountModal({ userEmail: u.email, userName: u.name, provider: p, accounts: provAccounts, primaryId: null });
                                  apiFetch(`/api/admin/cloud-accounts/primary?uid=${encodeURIComponent(orgScope)}&userEmail=${encodeURIComponent(u.email)}&provider=${p}`)
                                    .then(r => r.json())
                                    .then(d => { if (d.accountId) setCloudAccountModal(prev => prev ? { ...prev, primaryId: d.accountId } : prev); })
                                    .catch(() => {});
                                }}
                                style={{background:"none",border:"1px solid #e2e8f0",borderRadius:6,padding:"2px 5px",cursor:"pointer",display:"inline-flex",alignItems:"center",gap:3,fontSize:11,color:"#475569"}}
                              >
                                <ProviderLogo provider={p} size={14} />
                              </button>
                            ));
                          })()}
                        </div>
                      </td>

                      {/* Actions */}
                      <td>
                        <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
                          {u.role === 'admin' ? (
                            <button
                              onClick={() => handleDemote(u)}
                              disabled={promoting === u.id}
                              title="Demote back to regular user"
                              style={{fontSize:11,fontWeight:600,color:"#f59e0b",background:"#1c1005",border:"1px solid #78350f",borderRadius:6,padding:"4px 10px",cursor:"pointer",whiteSpace:"nowrap",opacity:promoting===u.id?0.5:1}}
                            >
                              {promoting === u.id ? '…' : 'Demote'}
                            </button>
                          ) : PROMOTE_PLANS.includes(settings.currentPlan) && (() => {
                            const coAdminCount        = users.filter(x => x.role === 'admin').length;
                            const coAdminLimitReached = maxSubAdmins !== -1 && coAdminCount >= maxSubAdmins;
                            if (coAdminLimitReached) return null;
                            return (
                              <button
                                onClick={() => handlePromote(u)}
                                disabled={promoting === u.id}
                                title="Promote this user to co-admin"
                                style={{fontSize:11,fontWeight:600,color:"#a78bfa",background:"#13001f",border:"1px solid #4c1d95",borderRadius:6,padding:"4px 10px",cursor:"pointer",whiteSpace:"nowrap",opacity:promoting===u.id?0.5:1}}
                              >
                                {promoting === u.id ? '…' : 'Promote as Admin'}
                              </button>
                            );
                          })()}
                          <button
                            className="ap-btn-icon"
                            onClick={() => openDownloadModal(u)}
                            title="Download activity log"
                            style={{background:"none",border:"1px solid #e2e8f0",borderRadius:6,padding:"5px 7px",cursor:"pointer",color:"#38bdf8",display:"flex",alignItems:"center",justifyContent:"center",transition:"background 0.15s"}}
                            onMouseEnter={e=>e.currentTarget.style.background="#f0f9ff"}
                            onMouseLeave={e=>e.currentTarget.style.background="none"}
                          >
                            <DownloadIcon />
                          </button>
                          <button
                            className="ap-btn-icon"
                            onClick={() => toggleActivityRow(u.email)}
                            title={isExpanded ? "Close activity log" : "View activity log"}
                            style={{background: isExpanded ? "#eff6ff" : "none",border:`1px solid ${isExpanded ? "#93c5fd" : "#e2e8f0"}`,borderRadius:6,padding:"5px 7px",cursor:"pointer",color: isExpanded ? "#2563eb" : "#64748b",display:"flex",alignItems:"center",justifyContent:"center",transition:"background 0.15s"}}
                            onMouseEnter={e=>{if(!isExpanded){e.currentTarget.style.background="#f8fafc";e.currentTarget.style.borderColor="#94a3b8";}}}
                            onMouseLeave={e=>{if(!isExpanded){e.currentTarget.style.background="none";e.currentTarget.style.borderColor="#e2e8f0";}}}
                          >
                            <EyeIcon />
                          </button>
                          <button className="ap-btn-danger" onClick={() => deleteUser(u.id)} title="Delete user">
                            <TrashIcon />
                          </button>
                        </div>
                        {promoteErr && promoting === null && (
                          <div style={{fontSize:11,color:"#f87171",marginTop:3}}>{promoteErr}</div>
                        )}
                      </td>
                    </tr>

                    {/* ── Activity log expansion ── */}
                    {isExpanded && (
                      <tr key={`${u.id}-activity`} style={{background:"#0f172a"}}>
                        <td colSpan={6} style={{padding:"0", borderBottom:"2px solid #1e293b"}}>
                          <div style={{fontFamily:"'Courier New',Courier,monospace"}}>
                            {/* Log header bar */}
                            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 20px 10px 52px",background:"#1e293b",borderBottom:"1px solid #334155"}}>
                              <span style={{fontSize:11,fontWeight:700,color:"#64748b",letterSpacing:"1px",textTransform:"uppercase",display:"flex",alignItems:"center"}}>
                                activity log &mdash; {u.email}
                                {wsConnected && <span style={{fontSize:11,color:"#22c55e",fontWeight:600,marginLeft:8}}>&#9679; LIVE</span>}
                              </span>
                              <div style={{display:"flex",gap:10,alignItems:"center"}}>
                                {actData && !actData.loading && (
                                  <span style={{fontSize:11,color:"#475569"}}>{actData.events.length} events</span>
                                )}
                                <button
                                  onClick={() => { setUserActivity(p => { const n={...p}; delete n[u.email]; return n; }); setTimeout(() => toggleActivityRow(u.email), 10); }}
                                  style={{fontSize:11,color:"#64748b",background:"none",border:"1px solid #334155",cursor:"pointer",padding:"2px 10px",borderRadius:4,fontFamily:"inherit"}}
                                >refresh</button>
                              </div>
                            </div>

                            {/* Log body */}
                            <div style={{maxHeight:360,overflowY:"auto",padding:"8px 0",background:"#0f172a"}}>
                              {!actData || actData.loading ? (
                                <div style={{color:"#475569",fontSize:12,padding:"12px 52px",fontFamily:"inherit"}}>loading...</div>
                              ) : actData.events.length === 0 ? (
                                <div style={{color:"#475569",fontSize:12,padding:"12px 52px",fontFamily:"inherit"}}>no events recorded — activity appears once the user opens a tool</div>
                              ) : (() => {
                                const tagColors = {
                                  session_start: "#38bdf8", tab_viewed: "#a78bfa", cloud_connected: "#34d399",
                                  cloud_disconnected: "#f87171", report_exported: "#fbbf24",
                                  alert_acknowledged: "#4ade80", invoice_viewed: "#67e8f9",
                                  service_clicked: "#f59e0b", service_right_clicked: "#fb923c",
                                };
                                return actData.events.map((ev, i) => {
                                  const { ts, tag, path, action } = formatEventLine(ev);
                                  const color = tagColors[ev.type] || "#94a3b8";
                                  return (
                                    <div key={i} style={{display:"flex",alignItems:"baseline",flexWrap:"wrap",gap:0,padding:"4px 20px 4px 52px",fontSize:12,lineHeight:1.6,background: i%2===0 ? "transparent" : "rgba(255,255,255,0.02)"}}>
                                      <span style={{color:"#475569",flexShrink:0,marginRight:14,letterSpacing:"0.3px",fontVariantNumeric:"tabular-nums"}}>{ts}</span>
                                      <span style={{color,fontWeight:700,minWidth:80,flexShrink:0,letterSpacing:"0.5px",marginRight:14}}>{tag}</span>
                                      <span style={{color:"#60a5fa",fontFamily:"ui-monospace,monospace",fontSize:11,marginRight:8,letterSpacing:"0.2px"}}>{path}</span>
                                      <span style={{color:"#64748b"}}>— {action}</span>
                                    </div>
                                  );
                                });
                              })()}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </>
    );
  }

  function renderCloudAccounts() {
    const AWS_REGIONS = [
      { value: 'us-east-1',      label: 'US East (N. Virginia)       — us-east-1' },
      { value: 'us-east-2',      label: 'US East (Ohio)              — us-east-2' },
      { value: 'us-west-1',      label: 'US West (N. California)     — us-west-1' },
      { value: 'us-west-2',      label: 'US West (Oregon)            — us-west-2' },
      { value: 'ca-central-1',   label: 'Canada (Central)            — ca-central-1' },
      { value: 'eu-west-1',      label: 'Europe (Ireland)            — eu-west-1' },
      { value: 'eu-west-2',      label: 'Europe (London)             — eu-west-2' },
      { value: 'eu-west-3',      label: 'Europe (Paris)              — eu-west-3' },
      { value: 'eu-central-1',   label: 'Europe (Frankfurt)          — eu-central-1' },
      { value: 'eu-central-2',   label: 'Europe (Zurich)             — eu-central-2' },
      { value: 'eu-north-1',     label: 'Europe (Stockholm)          — eu-north-1' },
      { value: 'eu-south-1',     label: 'Europe (Milan)              — eu-south-1' },
      { value: 'ap-south-1',     label: 'Asia Pacific (Mumbai)       — ap-south-1' },
      { value: 'ap-south-2',     label: 'Asia Pacific (Hyderabad)    — ap-south-2' },
      { value: 'ap-southeast-1', label: 'Asia Pacific (Singapore)    — ap-southeast-1' },
      { value: 'ap-southeast-2', label: 'Asia Pacific (Sydney)       — ap-southeast-2' },
      { value: 'ap-southeast-3', label: 'Asia Pacific (Jakarta)      — ap-southeast-3' },
      { value: 'ap-southeast-4', label: 'Asia Pacific (Melbourne)    — ap-southeast-4' },
      { value: 'ap-northeast-1', label: 'Asia Pacific (Tokyo)        — ap-northeast-1' },
      { value: 'ap-northeast-2', label: 'Asia Pacific (Seoul)        — ap-northeast-2' },
      { value: 'ap-northeast-3', label: 'Asia Pacific (Osaka)        — ap-northeast-3' },
      { value: 'ap-east-1',      label: 'Asia Pacific (Hong Kong)    — ap-east-1' },
      { value: 'me-south-1',     label: 'Middle East (Bahrain)       — me-south-1' },
      { value: 'me-central-1',   label: 'Middle East (UAE)           — me-central-1' },
      { value: 'af-south-1',     label: 'Africa (Cape Town)          — af-south-1' },
      { value: 'il-central-1',   label: 'Israel (Tel Aviv)           — il-central-1' },
      { value: 'sa-east-1',      label: 'South America (São Paulo)   — sa-east-1' },
    ];

    const PROVIDER_FIELDS = {
      aws:   [
        { key: 'accessKeyId',     label: 'Access Key ID',     type: 'text',     required: true },
        { key: 'secretAccessKey', label: 'Secret Access Key', type: 'password', required: true },
        { key: 'region',          label: 'Default Region',    type: 'select',   options: AWS_REGIONS, defaultValue: 'us-east-1' },
      ],
      gcp:   [
        { key: 'projectId',         label: 'Project ID',           type: 'text',     required: true },
        { key: 'serviceAccountJson',label: 'Service Account JSON',  type: 'textarea', required: true, placeholder: '{"type":"service_account",...}' },
      ],
      azure: [
        { key: 'subscriptionId', label: 'Subscription ID', type: 'text',     required: true },
        { key: 'tenantId',       label: 'Tenant ID',       type: 'text',     required: true },
        { key: 'clientId',       label: 'Client ID',       type: 'text',     required: true },
        { key: 'clientSecret',   label: 'Client Secret',   type: 'password', required: true },
      ],
    };

    function maskIdentity(account) {
      const m = account.accountMeta || {};
      if (account.provider === 'aws'   && m.awsAccountId)   return `ID: ${m.awsAccountId}`;
      if (account.provider === 'gcp'   && m.projectId)      return `Project: ${m.projectId}`;
      if (account.provider === 'azure' && m.subscriptionId) return `Sub: ${m.subscriptionId.toString().slice(0, 8)}…`;
      return '—';
    }

    async function handleAddAccount(e) {
      e.preventDefault();
      setCloudAccountErr('');
      setCloudAccountSaving(true);
      const { provider, label, creds } = cloudAccountForm;
      let credentials = { ...creds };
      if (provider === 'gcp' && typeof credentials.serviceAccountJson === 'string') {
        try { credentials = { ...JSON.parse(credentials.serviceAccountJson), projectId: credentials.projectId }; }
        catch { setCloudAccountErr('Service account JSON is not valid JSON'); setCloudAccountSaving(false); return; }
      }
      try {
        const r = await apiFetch(`/api/admin/cloud-accounts?uid=${encodeURIComponent(orgScope)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid: orgScope, provider, label, credentials }),
        });
        const d = await r.json();
        if (!r.ok || !d.success) { setCloudAccountErr(d.message || d.error || 'Failed — check credentials'); setCloudAccountSaving(false); return; }
        setAddCloudAccountModal(false);
        setCloudAccountForm({ provider: 'aws', label: '', creds: { region: 'us-east-1' } });
        loadCloudAccounts(orgScope);
        loadOrgUserCloudAccess(orgScope);
      } catch { setCloudAccountErr('Network error'); }
      setCloudAccountSaving(false);
    }

    async function handleDeleteAccount(accountId) {
      if (!window.confirm('Delete this cloud account and all its user assignments?')) return;
      await apiFetch(`/api/admin/cloud-accounts/${accountId}?uid=${encodeURIComponent(orgScope)}`, { method: 'DELETE' }).catch(() => {});
      loadCloudAccounts(orgScope);
      loadOrgUserCloudAccess(orgScope);
    }

    async function handleUpdateAccount(e) {
      e.preventDefault();
      if (!editCloudAccountModal) return;
      setEditCloudAccountErr('');
      setEditCloudAccountSaving(true);
      let credentials = { ...editCloudAccountCreds };
      if (editCloudAccountModal.provider === 'gcp' && typeof credentials.serviceAccountJson === 'string') {
        try { credentials = { ...JSON.parse(credentials.serviceAccountJson), projectId: credentials.projectId }; }
        catch { setEditCloudAccountErr('Service account JSON is not valid JSON'); setEditCloudAccountSaving(false); return; }
      }
      try {
        const r = await apiFetch(`/api/admin/cloud-accounts/${editCloudAccountModal.id}?uid=${encodeURIComponent(orgScope)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid: orgScope, credentials }),
        });
        const d = await r.json();
        if (!r.ok || !d.success) { setEditCloudAccountErr(d.message || d.error || 'Failed — check credentials'); setEditCloudAccountSaving(false); return; }
        setEditCloudAccountModal(null);
        setEditCloudAccountCreds({});
        loadCloudAccounts(orgScope);
      } catch { setEditCloudAccountErr('Network error'); }
      setEditCloudAccountSaving(false);
    }

    function openAssignModal(account) {
      const assigned = new Set((account.assignedUsers || []).map(a => (a.email || '').toLowerCase()));
      const sel = {};
      users.forEach(u => { sel[u.email] = assigned.has(u.email.toLowerCase()); });
      setAssignSelection(sel);
      setAssignCloudAccountModal(account);
    }

    async function handleSaveAssignments() {
      if (!assignCloudAccountModal) return;
      setAssignSaving(true);
      const account = assignCloudAccountModal;
      const currentlyAssigned = new Set((account.assignedUsers || []).map(a => (a.email || '').toLowerCase()));
      const toAssign   = users.filter(u => assignSelection[u.email]  && !currentlyAssigned.has(u.email.toLowerCase()));
      const toUnassign = users.filter(u => !assignSelection[u.email] &&  currentlyAssigned.has(u.email.toLowerCase()));
      await Promise.all([
        ...toAssign.map(u => apiFetch(`/api/admin/cloud-accounts/${account.id}/assign`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid: orgScope, userEmail: u.email }),
        })),
        ...toUnassign.map(u => apiFetch(`/api/admin/cloud-accounts/${account.id}/unassign`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid: orgScope, userEmail: u.email }),
        })),
      ]).catch(() => {});
      setAssignCloudAccountModal(null);
      setAssignSaving(false);
      loadCloudAccounts(orgScope);
      loadOrgUserCloudAccess(orgScope);
    }

    async function openCredView(account) {
      setCredViewModal(account);
      setCredViewData(null);
      setCredViewLoading(true);
      setCredShowFields({});
      try {
        const r = await apiFetch(`/api/admin/cloud-accounts/${account.id}/credentials?uid=${encodeURIComponent(orgScope)}`);
        const d = await r.json();
        setCredViewData(d);
      } catch { setCredViewData({ error: 'Failed to load credentials.' }); }
      setCredViewLoading(false);
    }

    const fields = PROVIDER_FIELDS[cloudAccountForm.provider] || [];

    return (
      <>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{ fontSize: 13, color: '#64748b' }}>
            Centrally manage cloud credentials and assign accounts to users.
          </div>
          <button
            onClick={() => { setCloudAccountForm({ provider: 'aws', label: '', creds: {} }); setCloudAccountErr(''); setAddCloudAccountModal(true); }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            <PlusIcon /> Add Cloud Account
          </button>
        </div>

        <div className="ap-card">
          {cloudAccountsAuthErr && (
            <div style={{ margin: '12px 0', padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 7, fontSize: 13, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>⚠️</span> {cloudAccountsAuthErr}
            </div>
          )}
          {cloudAccountsLoading ? (
            <div className="ap-empty">
              <div style={{ width: 32, height: 32, border: '3px solid #e2e8f0', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.75s linear infinite', margin: '0 auto 12px' }} />
              <div className="ap-empty-text" style={{ color: '#64748b' }}>Loading accounts…</div>
            </div>
          ) : cloudAccountsAuthErr ? null : cloudAccounts.length === 0 ? (
            <div className="ap-empty">
              <div className="ap-empty-icon">☁️</div>
              <div className="ap-empty-text">No cloud accounts yet. Add one to get started.</div>
            </div>
          ) : (
            <table className="ap-table">
              <thead><tr>
                <th>Account</th><th>Identity</th><th>Assigned Users</th><th>Status</th><th>Actions</th>
              </tr></thead>
              <tbody>
                {cloudAccounts.map(account => {
                  const assigned = account.assignedUsers || [];
                  return (
                    <tr
                      key={account.id}
                      onClick={() => openCredView(account)}
                      style={{ cursor: 'pointer' }}
                      title="Click to view credentials"
                    >
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <ProviderLogo provider={account.provider} size={22} />
                          <div>
                            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 13 }}>{account.label}</div>
                            <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>{account.provider}</div>
                          </div>
                        </div>
                      </td>
                      <td><span style={{ fontSize: 12, color: '#64748b', fontFamily: 'monospace' }}>{maskIdentity(account)}</span></td>
                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {assigned.length === 0
                            ? <span style={{ fontSize: 12, color: '#94a3b8' }}>None assigned</span>
                            : assigned.slice(0, 4).map(a => (
                                <span key={a.email} style={{ fontSize: 11, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: 5, padding: '2px 7px', fontWeight: 600 }}>
                                  {a.name || a.email}
                                </span>
                              ))
                          }
                          {assigned.length > 4 && <span style={{ fontSize: 11, color: '#94a3b8' }}>+{assigned.length - 4} more</span>}
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 5, background: account.status === 'active' ? '#dcfce7' : '#fee2e2', color: account.status === 'active' ? '#15803d' : '#dc2626' }}>
                          {account.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => openAssignModal(account)}
                            style={{ fontSize: 11, fontWeight: 600, padding: '4px 10px', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit' }}
                          >
                            Assign Users
                          </button>
                          <button
                            onClick={() => { setEditCloudAccountModal(account); setEditCloudAccountCreds(account.provider === 'aws' ? { region: 'us-east-1' } : {}); setEditCloudAccountErr(''); }}
                            style={{ fontSize: 11, fontWeight: 600, padding: '4px 10px', background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit' }}
                            title="Update credentials"
                          >
                            Update Keys
                          </button>
                          <button
                            onClick={() => handleDeleteAccount(account.id)}
                            className="ap-btn-danger"
                            title="Delete account"
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Add Cloud Account Modal ── */}
        {addCloudAccountModal && (
          <div className="ap-modal-overlay" onClick={() => setAddCloudAccountModal(false)}>
            <div className="ap-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
              <div className="ap-modal-header">
                <span>Add Cloud Account</span>
                <button className="ap-modal-close" onClick={() => setAddCloudAccountModal(false)}>×</button>
              </div>
              <form onSubmit={handleAddAccount}>
                <div className="ap-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Provider</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {['aws', 'gcp', 'azure'].map(p => (
                        <button
                          key={p} type="button"
                          onClick={() => setCloudAccountForm(f => ({ ...f, provider: p, creds: p === 'aws' ? { region: 'us-east-1' } : {} }))}
                          style={{ flex: 1, padding: '8px 0', border: `2px solid ${cloudAccountForm.provider === p ? '#2563eb' : '#e2e8f0'}`, borderRadius: 8, background: cloudAccountForm.provider === p ? '#eff6ff' : '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontWeight: 600, fontSize: 12, color: cloudAccountForm.provider === p ? '#2563eb' : '#374151' }}
                        >
                          <ProviderLogo provider={p} size={16} /> {p.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Label <span style={{ color: '#dc2626' }}>*</span></label>
                    <input
                      value={cloudAccountForm.label}
                      onChange={e => setCloudAccountForm(f => ({ ...f, label: e.target.value }))}
                      placeholder={`e.g. ${cloudAccountForm.provider === 'aws' ? 'AWS Production' : cloudAccountForm.provider === 'gcp' ? 'GCP Prod Project' : 'Azure Main Sub'}`}
                      required
                      style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }}
                    />
                  </div>
                  {fields.map(f => (
                    <div key={f.key}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>
                        {f.label} {f.required && <span style={{ color: '#dc2626' }}>*</span>}
                      </label>
                      {f.type === 'textarea' ? (
                        <textarea
                          rows={4}
                          value={cloudAccountForm.creds[f.key] || ''}
                          onChange={e => setCloudAccountForm(cf => ({ ...cf, creds: { ...cf.creds, [f.key]: e.target.value } }))}
                          placeholder={f.placeholder || ''}
                          required={!!f.required}
                          style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 12, fontFamily: 'monospace', resize: 'vertical', boxSizing: 'border-box' }}
                        />
                      ) : f.type === 'select' ? (
                        <select
                          value={cloudAccountForm.creds[f.key] || f.defaultValue || ''}
                          onChange={e => setCloudAccountForm(cf => ({ ...cf, creds: { ...cf.creds, [f.key]: e.target.value } }))}
                          required={!!f.required}
                          style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', background: '#fff', cursor: 'pointer' }}
                        >
                          {!f.required && <option value="">— Select region —</option>}
                          {(f.options || []).map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={f.type}
                          value={cloudAccountForm.creds[f.key] || ''}
                          onChange={e => setCloudAccountForm(cf => ({ ...cf, creds: { ...cf.creds, [f.key]: e.target.value } }))}
                          placeholder={f.placeholder || ''}
                          required={!!f.required}
                          style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }}
                        />
                      )}
                    </div>
                  ))}
                  {cloudAccountErr && (
                    <div style={{ fontSize: 12, color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, padding: '8px 12px' }}>{cloudAccountErr}</div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', padding: '16px 24px', borderTop: '1px solid #f1f5f9' }}>
                  <button type="button" onClick={() => setAddCloudAccountModal(false)} style={{ padding: '8px 18px', border: '1px solid #e2e8f0', borderRadius: 7, background: '#f8fafc', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>Cancel</button>
                  <button type="submit" disabled={cloudAccountSaving} style={{ padding: '8px 18px', background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', color: '#fff', border: 'none', borderRadius: 7, fontWeight: 600, fontSize: 13, cursor: cloudAccountSaving ? 'not-allowed' : 'pointer', opacity: cloudAccountSaving ? 0.6 : 1, fontFamily: 'inherit' }}>
                    {cloudAccountSaving ? 'Verifying…' : 'Add Account'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── Update Credentials Modal ── */}
        {editCloudAccountModal && (() => {
          const editFields = PROVIDER_FIELDS[editCloudAccountModal.provider] || [];
          return (
            <div className="ap-modal-overlay" onClick={() => setEditCloudAccountModal(null)}>
              <div className="ap-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
                <div className="ap-modal-header">
                  <span>Update Credentials — {editCloudAccountModal.label}</span>
                  <button className="ap-modal-close" onClick={() => setEditCloudAccountModal(null)}>×</button>
                </div>
                <form onSubmit={handleUpdateAccount}>
                  <div className="ap-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ padding: '10px 12px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 7, fontSize: 12, color: '#92400e' }}>
                      Enter new credentials below. They will be verified with {editCloudAccountModal.provider.toUpperCase()} before saving.
                    </div>
                    {editFields.map(f => (
                      <div key={f.key}>
                        <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>
                          {f.label} {f.required && <span style={{ color: '#dc2626' }}>*</span>}
                        </label>
                        {f.type === 'select' ? (
                          <select
                            value={editCloudAccountCreds[f.key] || f.defaultValue || ''}
                            onChange={e => setEditCloudAccountCreds(c => ({ ...c, [f.key]: e.target.value }))}
                            required={!!f.required}
                            style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', background: '#fff' }}
                          >
                            {(f.options || []).map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                          </select>
                        ) : f.type === 'textarea' ? (
                          <textarea rows={4} value={editCloudAccountCreds[f.key] || ''} onChange={e => setEditCloudAccountCreds(c => ({ ...c, [f.key]: e.target.value }))} placeholder={f.placeholder || ''} required={!!f.required} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 12, fontFamily: 'monospace', resize: 'vertical', boxSizing: 'border-box' }} />
                        ) : (
                          <input type={f.type} value={editCloudAccountCreds[f.key] || ''} onChange={e => setEditCloudAccountCreds(c => ({ ...c, [f.key]: e.target.value }))} placeholder={f.placeholder || ''} required={!!f.required} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }} />
                        )}
                      </div>
                    ))}
                    {editCloudAccountErr && (
                      <div style={{ fontSize: 12, color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, padding: '8px 12px' }}>{editCloudAccountErr}</div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', padding: '16px 24px', borderTop: '1px solid #f1f5f9' }}>
                    <button type="button" onClick={() => setEditCloudAccountModal(null)} style={{ padding: '8px 18px', border: '1px solid #e2e8f0', borderRadius: 7, background: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                    <button type="submit" disabled={editCloudAccountSaving} style={{ padding: '8px 18px', background: editCloudAccountSaving ? '#93c5fd' : 'linear-gradient(135deg,#2563eb,#1d4ed8)', color: '#fff', border: 'none', borderRadius: 7, fontWeight: 600, fontSize: 13, cursor: editCloudAccountSaving ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                      {editCloudAccountSaving ? 'Verifying…' : 'Save Credentials'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          );
        })()}

        {/* ── Assign Users Modal ── */}
        {assignCloudAccountModal && (
          <div className="ap-modal-overlay" onClick={() => setAssignCloudAccountModal(null)}>
            <div className="ap-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
              <div className="ap-modal-header">
                <span>Assign Users — {assignCloudAccountModal.label}</span>
                <button className="ap-modal-close" onClick={() => setAssignCloudAccountModal(null)}>×</button>
              </div>
              <div className="ap-modal-body">
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>
                  Select users who should have access to this {assignCloudAccountModal.provider.toUpperCase()} account. Assigned users are auto-connected.
                </div>
                {users.length === 0 ? (
                  <div style={{ fontSize: 13, color: '#94a3b8', padding: '12px 0' }}>No users in your org yet.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto' }}>
                    {users.map(u => (
                      <label key={u.email} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', background: assignSelection[u.email] ? '#eff6ff' : '#fff', borderColor: assignSelection[u.email] ? '#bfdbfe' : '#e2e8f0' }}>
                        <input
                          type="checkbox"
                          checked={!!assignSelection[u.email]}
                          onChange={e => setAssignSelection(s => ({ ...s, [u.email]: e.target.checked }))}
                          style={{ width: 15, height: 15, accentColor: '#2563eb' }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{u.name}</div>
                          <div style={{ fontSize: 11, color: '#94a3b8' }}>{u.email}</div>
                        </div>
                        {assignSelection[u.email] && <CheckIcon />}
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', padding: '14px 24px', borderTop: '1px solid #f1f5f9' }}>
                <button onClick={() => setAssignCloudAccountModal(null)} style={{ padding: '8px 18px', border: '1px solid #e2e8f0', borderRadius: 7, background: '#f8fafc', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>Cancel</button>
                <button onClick={handleSaveAssignments} disabled={assignSaving} style={{ padding: '8px 18px', background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', color: '#fff', border: 'none', borderRadius: 7, fontWeight: 600, fontSize: 13, cursor: assignSaving ? 'not-allowed' : 'pointer', opacity: assignSaving ? 0.6 : 1, fontFamily: 'inherit' }}>
                  {assignSaving ? 'Saving…' : 'Save Assignments'}
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  function renderConnectorsSection() {
    const MAPPING_FIELDS = [
      { key: 'provider',     label: 'Provider name path',   hint: 'e.g. org.name' },
      { key: 'total_cost',   label: 'Total cost path',      hint: 'e.g. data[0].amount.value' },
      { key: 'usage_amount', label: 'Usage amount path',    hint: 'e.g. data[0].quantity' },
      { key: 'unit',         label: 'Unit path',             hint: 'e.g. data[0].amount.currency' },
      { key: 'timestamp',    label: 'Timestamp path',        hint: 'e.g. data[0].end_time' },
    ];

    function fmtUsageValue(v, unit) {
      if (v === null || v === undefined) return '—';
      return unit ? `${v} ${unit}` : String(v);
    }

    const modalOpen = addConnectorModal || !!editConnectorModal;
    const isEdit    = !!editConnectorModal;

    function closeModal() {
      setAddConnectorModal(false);
      setEditConnectorModal(null);
      setConnectorForm(null);
      setConnectorErr('');
    }

    return (
      <>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{ fontSize: 13, color: '#64748b', maxWidth: 520 }}>
            Monitor usage & billing from any third-party API that exposes its own usage/cost endpoint — OpenAI, Stripe, Twilio, or a custom internal service. Proxying APIs that have no usage endpoint of their own is not supported.
          </div>
          <button
            onClick={() => { setConnectorForm(blankConnectorForm()); setAddConnectorModal(true); }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
          >
            <PlusIcon /> Add Connector
          </button>
        </div>

        <div className="ap-card">
          {connectorsLoading ? (
            <div className="ap-empty">
              <div style={{ width: 32, height: 32, border: '3px solid #e2e8f0', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.75s linear infinite', margin: '0 auto 12px' }} />
              <div className="ap-empty-text" style={{ color: '#64748b' }}>Loading connectors…</div>
            </div>
          ) : connectors.length === 0 ? (
            <div className="ap-empty">
              <div className="ap-empty-icon">🔌</div>
              <div className="ap-empty-text">No connectors yet. Add one — pick a template to start from OpenAI, Anthropic, Gemini, Stripe or Twilio, or configure a fully custom API.</div>
            </div>
          ) : (
            <table className="ap-table">
              <thead><tr>
                <th>Connector</th><th>Poll every</th><th>Thresholds</th><th>Status</th><th>Last polled</th><th>Actions</th>
              </tr></thead>
              <tbody>
                {connectors.map(c => (
                  <tr key={c.id} onClick={() => openConnectorUsage(c)} style={{ cursor: 'pointer' }} title="Click to view usage history">
                    <td>
                      <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 13 }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>{c.baseUrl}</div>
                    </td>
                    <td style={{ fontSize: 12, color: '#64748b' }}>{c.pollFrequencyMinutes}m</td>
                    <td style={{ fontSize: 12, color: '#64748b' }}>
                      {c.thresholdCost == null && c.thresholdUsage == null
                        ? <span style={{ color: '#94a3b8' }}>None set</span>
                        : <>
                            {c.thresholdCost  != null && <div>Cost ≥ {c.thresholdCost}</div>}
                            {c.thresholdUsage != null && <div>Usage ≥ {c.thresholdUsage}</div>}
                          </>
                      }
                    </td>
                    <td>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 5, background: c.lastError ? '#fee2e2' : c.lastBreachState ? '#fef3c7' : c.status === 'active' ? '#dcfce7' : '#f1f5f9', color: c.lastError ? '#dc2626' : c.lastBreachState ? '#92400e' : c.status === 'active' ? '#15803d' : '#64748b' }}
                        title={c.lastError || ''}
                      >
                        {c.lastError ? 'Error' : c.lastBreachState ? 'Threshold breached' : c.status}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: '#64748b' }}>{fmtDateTime(c.lastPolledAt)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => handlePollNow(c.id)}
                          disabled={connectorPolling === c.id}
                          style={{ fontSize: 11, fontWeight: 600, padding: '4px 10px', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: 6, cursor: connectorPolling === c.id ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: connectorPolling === c.id ? 0.6 : 1 }}
                        >
                          {connectorPolling === c.id ? 'Polling…' : 'Poll Now'}
                        </button>
                        <button
                          onClick={() => openEditConnectorModal(c)}
                          style={{ fontSize: 11, fontWeight: 600, padding: '4px 10px', background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit' }}
                        >
                          Edit
                        </button>
                        <button onClick={() => handleDeleteConnector(c.id)} className="ap-btn-danger" title="Delete connector">
                          <TrashIcon />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Add / Edit Connector Modal ── */}
        {modalOpen && connectorForm && (
          <div className="ap-modal-overlay" onClick={closeModal}>
            <div className="ap-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 580, maxHeight: '86vh', overflowY: 'auto' }}>
              <div className="ap-modal-header">
                <span>{isEdit ? `Edit Connector — ${editConnectorModal.name}` : 'Add Connector'}</span>
                <button className="ap-modal-close" onClick={closeModal}>×</button>
              </div>
              <form onSubmit={handleSaveConnector}>
                <div className="ap-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {!isEdit && (
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Start from a template (optional)</label>
                      <select
                        value={connectorForm.templateId || ''}
                        onChange={e => applyConnectorTemplate(e.target.value)}
                        style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', background: '#fff', cursor: 'pointer' }}
                      >
                        <option value="">— Custom API (no template) —</option>
                        {connectorTemplates.map(t => <option key={t.id} value={t.id}>{t.displayName}</option>)}
                      </select>
                      {connectorForm.templateId && (() => {
                        const t = connectorTemplates.find(x => x.id === connectorForm.templateId);
                        return t?.notes ? (
                          <div style={{ marginTop: 6, fontSize: 11.5, color: '#92400e', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6, padding: '8px 10px' }}>{t.notes}</div>
                        ) : null;
                      })()}
                    </div>
                  )}

                  {isEdit && (
                    <div style={{ padding: '10px 12px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 7, fontSize: 12, color: '#92400e' }}>
                      Re-enter the credential value below — it will replace the stored one. Leaving it blank will not keep the old value.
                    </div>
                  )}

                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Name <span style={{ color: '#dc2626' }}>*</span></label>
                    <input value={connectorForm.name} onChange={e => setConnectorForm(f => ({ ...f, name: e.target.value }))} required placeholder="e.g. OpenAI - Prod"
                      style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }} />
                  </div>

                  <div style={{ display: 'flex', gap: 10 }}>
                    <div style={{ flex: 2 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Base URL <span style={{ color: '#dc2626' }}>*</span></label>
                      <input value={connectorForm.baseUrl} onChange={e => setConnectorForm(f => ({ ...f, baseUrl: e.target.value }))} required placeholder="https://api.example.com/v1"
                        style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Poll every (min)</label>
                      <input type="number" min="5" value={connectorForm.pollFrequencyMinutes} onChange={e => setConnectorForm(f => ({ ...f, pollFrequencyMinutes: e.target.value }))}
                        style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }} />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Usage/billing path <span style={{ color: '#dc2626' }}>*</span></label>
                    <input value={connectorForm.usagePath} onChange={e => setConnectorForm(f => ({ ...f, usagePath: e.target.value }))} required placeholder="/usage?start_date=2026-01-01"
                      style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 13, fontFamily: 'monospace', boxSizing: 'border-box' }} />
                  </div>

                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Auth type</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {[['api_key_header', 'API Key Header'], ['bearer', 'Bearer Token'], ['basic', 'Basic Auth']].map(([val, label]) => (
                        <button key={val} type="button" onClick={() => setConnectorForm(f => ({ ...f, authType: val }))}
                          style={{ flex: 1, padding: '8px 4px', border: `2px solid ${connectorForm.authType === val ? '#2563eb' : '#e2e8f0'}`, borderRadius: 8, background: connectorForm.authType === val ? '#eff6ff' : '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 12, color: connectorForm.authType === val ? '#2563eb' : '#374151' }}
                        >{label}</button>
                      ))}
                    </div>
                  </div>

                  {connectorForm.authType === 'api_key_header' && (
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Header name</label>
                      <input value={connectorForm.authHeaderName} onChange={e => setConnectorForm(f => ({ ...f, authHeaderName: e.target.value }))} placeholder="X-API-Key"
                        style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }} />
                    </div>
                  )}
                  {connectorForm.authType === 'basic' && (
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Username <span style={{ color: '#dc2626' }}>*</span></label>
                      <input value={connectorForm.authUsername} onChange={e => setConnectorForm(f => ({ ...f, authUsername: e.target.value }))} required
                        style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }} />
                    </div>
                  )}
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>
                      {connectorForm.authType === 'basic' ? 'Password' : connectorForm.authType === 'bearer' ? 'Bearer token' : 'API key value'}
                      {connectorForm.authType !== 'basic' && <span style={{ color: '#dc2626' }}> *</span>}
                    </label>
                    <input type="password" value={connectorForm.authValue} onChange={e => setConnectorForm(f => ({ ...f, authValue: e.target.value }))} required={connectorForm.authType !== 'basic'}
                      style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }} />
                    {connectorForm.authType === 'basic' && (
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                        Some APIs (e.g. Stripe) put the key in the username and leave this blank — that's fine, leave it empty.
                      </div>
                    )}
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Extra static headers (optional JSON)</label>
                    <textarea rows={2} value={connectorForm.extraHeadersText} onChange={e => setConnectorForm(f => ({ ...f, extraHeadersText: e.target.value }))} placeholder='{"anthropic-version": "2023-06-01"}'
                      style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 12, fontFamily: 'monospace', resize: 'vertical', boxSizing: 'border-box' }} />
                  </div>

                  <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>Response field mapping</div>
                    <div style={{ fontSize: 11.5, color: '#94a3b8', marginBottom: 10 }}>Dot-notation paths into the JSON response, e.g. <code>data[0].amount.value</code>. Leave a field blank if the API doesn't provide it.</div>
                    {MAPPING_FIELDS.map(mf => (
                      <div key={mf.key} style={{ marginBottom: 8 }}>
                        <label style={{ fontSize: 11.5, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 3 }}>{mf.label}</label>
                        <input value={connectorForm.fieldMapping[mf.key] || ''} onChange={e => setConnectorForm(f => ({ ...f, fieldMapping: { ...f.fieldMapping, [mf.key]: e.target.value } }))} placeholder={mf.hint}
                          style={{ width: '100%', padding: '7px 10px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 12, fontFamily: 'monospace', boxSizing: 'border-box' }} />
                      </div>
                    ))}
                  </div>

                  <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>Alert thresholds (optional)</div>
                    <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: 11.5, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 3 }}>Cost ≥</label>
                        <input type="number" step="any" value={connectorForm.thresholdCost} onChange={e => setConnectorForm(f => ({ ...f, thresholdCost: e.target.value }))}
                          style={{ width: '100%', padding: '7px 10px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 12, fontFamily: 'inherit', boxSizing: 'border-box' }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: 11.5, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 3 }}>Usage ≥</label>
                        <input type="number" step="any" value={connectorForm.thresholdUsage} onChange={e => setConnectorForm(f => ({ ...f, thresholdUsage: e.target.value }))}
                          style={{ width: '100%', padding: '7px 10px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 12, fontFamily: 'inherit', boxSizing: 'border-box' }} />
                      </div>
                    </div>
                    <label style={{ fontSize: 11.5, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 3 }}>Alert emails (comma-separated, defaults to your admin email)</label>
                    <input value={connectorForm.alertEmails} onChange={e => setConnectorForm(f => ({ ...f, alertEmails: e.target.value }))} placeholder="ops@company.com, finance@company.com"
                      style={{ width: '100%', padding: '7px 10px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 12, fontFamily: 'inherit', boxSizing: 'border-box' }} />
                  </div>

                  {connectorErr && (
                    <div style={{ fontSize: 12, color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, padding: '8px 12px' }}>{connectorErr}</div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', padding: '16px 24px', borderTop: '1px solid #f1f5f9' }}>
                  <button type="button" onClick={closeModal} style={{ padding: '8px 18px', border: '1px solid #e2e8f0', borderRadius: 7, background: '#f8fafc', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>Cancel</button>
                  <button type="submit" disabled={connectorSaving} style={{ padding: '8px 18px', background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', color: '#fff', border: 'none', borderRadius: 7, fontWeight: 600, fontSize: 13, cursor: connectorSaving ? 'not-allowed' : 'pointer', opacity: connectorSaving ? 0.6 : 1, fontFamily: 'inherit' }}>
                    {connectorSaving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Connector'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── Usage History Modal ── */}
        {connectorUsageModal && (
          <div className="ap-modal-overlay" onClick={() => setConnectorUsageModal(null)}>
            <div className="ap-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 560, maxHeight: '80vh', overflowY: 'auto' }}>
              <div className="ap-modal-header">
                <span>Usage History — {connectorUsageModal.name}</span>
                <button className="ap-modal-close" onClick={() => setConnectorUsageModal(null)}>×</button>
              </div>
              <div className="ap-modal-body">
                {connectorUsageLoading ? (
                  <div className="ap-empty"><div className="ap-empty-text" style={{ color: '#64748b' }}>Loading…</div></div>
                ) : connectorUsageRows.length === 0 ? (
                  <div className="ap-empty"><div className="ap-empty-text">No usage data yet — try "Poll Now" from the connector list.</div></div>
                ) : (
                  <table className="ap-table">
                    <thead><tr><th>Fetched</th><th>Provider</th><th>Cost</th><th>Usage</th><th>Reported at</th></tr></thead>
                    <tbody>
                      {connectorUsageRows.map(u => (
                        <tr key={u.id}>
                          <td style={{ fontSize: 12 }}>{fmtDateTime(u.fetchedAt)}</td>
                          <td style={{ fontSize: 12 }}>{u.provider || '—'}</td>
                          <td style={{ fontSize: 12 }}>{fmtUsageValue(u.totalCost, u.unit)}</td>
                          <td style={{ fontSize: 12 }}>{fmtUsageValue(u.usageAmount, u.unit)}</td>
                          <td style={{ fontSize: 12, color: '#94a3b8' }}>{u.ts || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  function renderAccess() {
    const { allowedTools } = planRestrictions;
    const monAllowed  = allowedTools.includes("monitoring");
    const billAllowed = allowedTools.includes("billing");

    const monLimit   = planRestrictions.maxToolUsers?.monitoring ?? null;
    const billLimit  = planRestrictions.maxToolUsers?.billing    ?? null;
    const monCount   = users.filter(u => u.tools.includes("monitoring")).length;
    const billCount  = users.filter(u => u.tools.includes("billing")).length;
    const monAtLimit = monLimit !== null && monCount >= monLimit;
    const billAtLimit = billLimit !== null && billCount >= billLimit;

    const lockedSpan = (
      <span style={{fontSize:12,color:"#94a3b8",display:"inline-flex",alignItems:"center",gap:5,padding:"5px 10px",border:"1.5px solid #e2e8f0",borderRadius:8,background:"#f8fafc"}}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        Not in Plan
      </span>
    );

    return (
      <div className="ap-card">
        {/* Plan restriction banner */}
        {(!monAllowed || !billAllowed) && (
          <div style={{background:"#fffbeb",border:"1px solid #fde68a",borderRadius:10,padding:"10px 16px",marginBottom:18,display:"flex",alignItems:"center",gap:10,fontSize:13,color:"#92400e"}}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <span>
              Your <strong>{settings.currentPlan}</strong> plan only includes access to the&nbsp;
              <strong>{monAllowed ? "Monitoring" : "Billing"}</strong> module.
              The <strong>{monAllowed ? "Billing" : "Monitoring"}</strong> column is locked — upgrade your plan to unlock it.
            </span>
          </div>
        )}

        {/* Per-tool limit banner for Professional plan */}
        {(monLimit !== null || billLimit !== null) && (
          <div style={{background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:10,padding:"10px 16px",marginBottom:18,display:"flex",alignItems:"center",gap:10,fontSize:13,color:"#1e40af"}}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <span>
              <strong>{settings.currentPlan}</strong> limits tool access:&nbsp;
              {monLimit !== null && <><strong>{monLimit}</strong> Monitoring user{monLimit !== 1 ? "s" : ""}</>}
              {monLimit !== null && billLimit !== null && " · "}
              {billLimit !== null && <><strong>{billLimit}</strong> Billing user{billLimit !== 1 ? "s" : ""}</>}.
              &nbsp;Toggle buttons are disabled once a limit is reached.
            </span>
          </div>
        )}

        {users.length === 0 ? (
          <div className="ap-empty">
            <div className="ap-empty-icon">🔐</div>
            <div className="ap-empty-text">No users yet. Create users first to manage their access.</div>
          </div>
        ) : (
          <table className="ap-table">
            <thead><tr>
              <th>User</th><th>Email</th>
              <th>
                <span style={{display:"inline-flex",alignItems:"center",gap:6}}>
                  Monitoring
                  {!monAllowed
                    ? <span style={{fontSize:10,color:"#ef4444",background:"#fee2e2",padding:"1px 6px",borderRadius:4,fontWeight:700}}>LOCKED</span>
                    : monLimit !== null && (
                      <span style={{fontSize:10,fontWeight:700,padding:"1px 7px",borderRadius:4,
                        background: monAtLimit ? "#fee2e2" : "#dcfce7",
                        color:      monAtLimit ? "#dc2626"  : "#15803d"}}>
                        {monCount}/{monLimit}
                      </span>
                    )
                  }
                </span>
              </th>
              <th>
                <span style={{display:"inline-flex",alignItems:"center",gap:6}}>
                  Billing
                  {!billAllowed
                    ? <span style={{fontSize:10,color:"#ef4444",background:"#fee2e2",padding:"1px 6px",borderRadius:4,fontWeight:700}}>LOCKED</span>
                    : billLimit !== null && (
                      <span style={{fontSize:10,fontWeight:700,padding:"1px 7px",borderRadius:4,
                        background: billAtLimit ? "#fee2e2" : "#dcfce7",
                        color:      billAtLimit ? "#dc2626"  : "#15803d"}}>
                        {billCount}/{billLimit}
                      </span>
                    )
                  }
                </span>
              </th>
            </tr></thead>
            <tbody>
              {users.map(u => {
                const photo = u.photo || getUserPhoto(u.email);
                const monEnabled  = u.tools.includes("monitoring");
                const billEnabled = u.tools.includes("billing");
                const monDisabled  = monAllowed && !monEnabled  && monAtLimit;
                const billDisabled = billAllowed && !billEnabled && billAtLimit;

                return (
                <tr key={u.id}>
                  <td><div className="ap-user-cell">
                    <div className="ap-user-avatar" style={{overflow:"hidden",padding:0,background:photo?"transparent":undefined}}>
                      {photo
                        ? <img src={photo} alt={u.name} style={{width:"100%",height:"100%",objectFit:"cover",display:"block",borderRadius:8}} />
                        : u.name[0].toUpperCase()}
                    </div>
                    <span style={{fontWeight:600,color:"#0f172a"}}>{u.name}</span>
                  </div></td>
                  <td style={{color:"#64748b"}}>{u.email}</td>
                  <td>
                    {monAllowed ? (
                      <button
                        className={`ap-toggle-btn ${monEnabled ? "on" : "off"} monitoring`}
                        onClick={() => toggleTool(u.id, "monitoring")}
                        disabled={monDisabled}
                        title={monDisabled ? `Monitoring limit reached (${monLimit}/${monLimit} users)` : undefined}
                        style={monDisabled ? {opacity:0.4,cursor:"not-allowed",pointerEvents:"none"} : undefined}
                      >
                        {monEnabled ? <><CheckIcon /> Enabled</> : "Disabled"}
                      </button>
                    ) : lockedSpan}
                  </td>
                  <td>
                    {billAllowed ? (
                      <button
                        className={`ap-toggle-btn ${billEnabled ? "on" : "off"} billing`}
                        onClick={() => toggleTool(u.id, "billing")}
                        disabled={billDisabled}
                        title={billDisabled ? `Billing limit reached (${billLimit}/${billLimit} users)` : undefined}
                        style={billDisabled ? {opacity:0.4,cursor:"not-allowed",pointerEvents:"none"} : undefined}
                      >
                        {billEnabled ? <><CheckIcon /> Enabled</> : "Disabled"}
                      </button>
                    ) : lockedSpan}
                  </td>
                </tr>
              );
              })}
            </tbody>
          </table>
        )}
      </div>
    );
  }

  function renderPlan() {
    const PLAN_META = {
      "Monitoring Bundle": { userLimit: "2",         modules: 1, desc: "Monitoring module for 1 Admin + 1 User — billed annually per user." },
      "Billing Bundle":    { userLimit: "2",         modules: 1, desc: "Billing module for 1 Admin + 1 User — billed annually per user." },
      "Standard Pro":      { userLimit: "4",         modules: 2, desc: "Full platform access with monitoring & billing for growing teams." },
      "Professional":      { userLimit: "8",         modules: 2, desc: "Up to 8 users — 3 with Monitoring access · 3 with Billing access." },
      "Enterprise":        { userLimit: "Unlimited", modules: 2, desc: "Unlimited scale, custom integrations, and 24/7 priority support." },
    };
    const DEFAULT_META = { userLimit: "∞", modules: 2, desc: "Full platform access with no user cap — ideal for testing and internal rollout." };

    const activePlan = settings.currentPlan || null;
    const meta       = activePlan ? (PLAN_META[activePlan] || DEFAULT_META) : DEFAULT_META;
    const planName   = activePlan || "Developer / No Limit";

    let daysLeft = null;
    let renewalCountdown = null;
    if (settings.planPurchasedAt) {
      const msLeft = Math.max(0, settings.planPurchasedAt + 365 * 86400000 - Date.now());
      daysLeft = Math.floor(msLeft / 86400000);
      const hrs  = Math.floor((msLeft % 86400000) / 3600000);
      const mins = Math.floor((msLeft % 3600000)  / 60000);
      const secs = Math.floor((msLeft % 60000)    / 1000);
      const pad  = n => String(n).padStart(2, "0");
      renewalCountdown = msLeft === 0 ? "Expired" : `${daysLeft}d  ${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
    }

    const planFeatures = {
      mon:        ["1 Admin + 1 User", "Monitoring Module Access", "Real-time Alerts & Dashboards", "Server & Network Health", "Email Support"],
      bill:       ["1 Admin + 1 User", "Billing Module Access", "Cost Analytics & Forecasting", "Invoice & Budget Management", "Email Support"],
      standard:   ["2 Admins Included", "Monitoring & Billing Access", "Full Dashboard Suite", "Custom Alert Policies", "Priority Email Support"],
      pro:        ["Up to 8 Users Total", "3 Monitoring + 3 Billing Users", "Full Platform Access", "Advanced Analytics & Reports", "API Access & Integrations"],
      enterprise: ["Unlimited Users", "Full Platform Access", "Custom Integrations & SSO", "24/7 Priority Support", "SLA Guarantee"],
    };

    return (
      <>
        {/* Current active plan */}
        <div className="ap-plan-card">
          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",position:"relative",zIndex:1}}>
            <div>
              <div className="ap-plan-badge" style={!activePlan ? {background:"rgba(100,116,139,0.3)",color:"#94a3b8",borderColor:"rgba(100,116,139,0.3)"} : {}}>
                {activePlan ? "Current Plan" : "Developer Mode"}
              </div>
              <div className="ap-plan-name">{planName}</div>
              <div className="ap-plan-sub">{meta.desc}</div>
              {activePlan && settings.planPaymentId && (
                <div style={{marginTop:8,fontSize:11,color:"rgba(255,255,255,0.4)",fontFamily:"monospace"}}>
                  Payment ID: {settings.planPaymentId}
                </div>
              )}
            </div>
            {activePlan && (
              <button
                onClick={handleCancelPlan}
                style={{
                  flexShrink:0,marginLeft:16,padding:"8px 16px",
                  background:"rgba(239,68,68,0.15)",color:"#fca5a5",
                  border:"1.5px solid rgba(239,68,68,0.35)",borderRadius:9,
                  fontSize:13,fontWeight:700,cursor:"pointer",
                  fontFamily:"inherit",transition:"all 0.18s",whiteSpace:"nowrap"
                }}
                onMouseEnter={e=>{e.currentTarget.style.background="rgba(239,68,68,0.28)";e.currentTarget.style.color="#f87171";}}
                onMouseLeave={e=>{e.currentTarget.style.background="rgba(239,68,68,0.15)";e.currentTarget.style.color="#fca5a5";}}
              >
                Cancel Plan
              </button>
            )}
          </div>
          <div className="ap-plan-stats">
            <div className="ap-plan-stat">
              <div className="ap-plan-stat-val">{meta.userLimit}</div>
              <div className="ap-plan-stat-label">User Limit</div>
            </div>
            <div className="ap-plan-stat">
              <div className="ap-plan-stat-val">{meta.modules}</div>
              <div className="ap-plan-stat-label">Modules Active</div>
            </div>
            <div className="ap-plan-stat">
              <div className="ap-plan-stat-val" style={{
                fontSize: renewalCountdown ? 18 : undefined,
                fontVariantNumeric: "tabular-nums",
                letterSpacing: "0.02em",
                ...(daysLeft !== null && daysLeft <= 30 ? {color:"#fbbf24"} : {}),
              }}>
                {renewalCountdown ?? "—"}
              </div>
              <div className="ap-plan-stat-label">Time to Renewal</div>
            </div>
            <div className="ap-plan-stat">
              <div className="ap-plan-stat-val" style={{color: daysLeft === 0 ? "#f87171" : activePlan ? "#4ade80" : "#94a3b8"}}>
                {daysLeft === 0 ? "Expired" : activePlan ? "Active" : "Dev Mode"}
              </div>
              <div className="ap-plan-stat-label">Status</div>
            </div>
          </div>
        </div>

        {/* Toggle row */}
        <div className="ap-card" style={{padding:"22px 28px"}}>
          <div style={{fontSize:15,fontWeight:700,color:"#0f172a",marginBottom:6}}>Available Plans</div>
          <div style={{fontSize:13,color:"#64748b",lineHeight:1.6}}>
            {showPlans
              ? "Select a plan below and click Buy Now to upgrade."
              : "View all subscription plans and upgrade directly from here."}
          </div>
          <div style={{marginTop:14}}>
            <button className="ap-btn-primary" onClick={() => setShowPlans(p => !p)}>
              {showPlans ? "Hide Plans" : "View Plans"}
            </button>
          </div>
        </div>

        {/* Pricing cards — same cards as landing page */}
        {showPlans && (() => {
          const isBundleActive = activePlan === (bundleTab === "monitoring" ? "Monitoring Bundle" : "Billing Bundle");
          const activeCardStyle = { outline:"2.5px solid #16a34a", outlineOffset:"0px", boxShadow:"0 0 0 4px rgba(22,163,74,0.12), 0 8px 32px rgba(22,163,74,0.12)" };
          const activeBadge = (
            <div style={{display:"inline-flex",alignItems:"center",gap:6,background:"#dcfce7",color:"#15803d",border:"1.5px solid #86efac",padding:"4px 12px",borderRadius:999,fontSize:12,fontWeight:800,marginBottom:10}}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              Current Plan
            </div>
          );
          const cancelBtn = (
            <button
              className="btn btn-lg pc-btn"
              onClick={handleCancelPlan}
              style={{background:"#fef2f2",color:"#dc2626",border:"1.5px solid #fecaca",fontWeight:700,cursor:"pointer"}}
            >
              Cancel Plan
            </button>
          );
          return (
            <div className="pricing-grid" style={{marginTop:4}}>

              {/* Bundle — Monitoring / Billing toggle */}
              <div className="pricing-card bundle-card" style={isBundleActive ? activeCardStyle : {}}>
                <div className="bundle-toggle">
                  <button className={`bundle-tab ${bundleTab === "monitoring" ? "active" : ""}`} onClick={() => setBundleTab("monitoring")}>Monitoring</button>
                  <button className={`bundle-tab ${bundleTab === "billing"    ? "active" : ""}`} onClick={() => setBundleTab("billing")}>Billing</button>
                </div>
                <div key={bundleTab} className="bundle-plan-content">
                  {isBundleActive && activeBadge}
                  <div className="pc-name">{bundleTab === "monitoring" ? "Monitoring Bundle" : "Billing Bundle"}</div>
                  <div className="pc-price-wrap">
                    <span className="pc-price">₹1</span>
                    <span className="pc-period">per user / year</span>
                  </div>
                  <p className="pc-desc">
                    {bundleTab === "monitoring"
                      ? "Perfect for teams focused on infrastructure health, real-time alerting, and server analytics."
                      : "Ideal for teams tracking cloud costs, managing invoices, and optimizing spend."}
                  </p>
                  <ul className="pc-features">
                    {planFeatures[bundleTab === "monitoring" ? "mon" : "bill"].map(f => (
                      <li key={f}><CheckIcon />{f}</li>
                    ))}
                  </ul>
                  {isBundleActive ? cancelBtn : payState.success && payState.planName.includes("Bundle") ? (
                    <div style={{marginTop:"auto",background:"#f0fdf4",border:"1px solid #86efac",borderRadius:10,padding:"12px 14px",fontSize:13,color:"#15803d",fontWeight:700}}>
                      ✓ Payment confirmed!
                      <div style={{fontSize:11,color:"#16a34a",fontWeight:500,marginTop:3}}>ID: {payState.success}</div>
                    </div>
                  ) : (
                    <button
                      className="btn btn-secondary btn-lg pc-btn"
                      onClick={() => handleBuyNow(`${bundleTab === "monitoring" ? "Monitoring" : "Billing"} Bundle`, 1000000)}
                      disabled={payState.loading}
                      style={{opacity: payState.loading ? 0.7 : 1}}
                    >
                      {payState.loading && payState.planName.includes("Bundle") ? "Opening…" : "Buy Now  ₹1"}
                    </button>
                  )}
                </div>
              </div>

              {/* Standard Pro */}
              <div className="pricing-card" style={activePlan === "Standard Pro" ? activeCardStyle : {}}>
                {activePlan === "Standard Pro" && activeBadge}
                <div className="pc-name">Standard Pro</div>
                <div className="pc-price-wrap">
                  <span className="pc-price">₹1</span>
                  <span className="pc-period">per user / year</span>
                </div>
                <p className="pc-desc">For growing teams that need full access to both monitoring and billing in one plan.</p>
                <ul className="pc-features">
                  {planFeatures.standard.map(f => <li key={f}><CheckIcon />{f}</li>)}
                </ul>
                {activePlan === "Standard Pro" ? cancelBtn : payState.success && payState.planName === "Standard Pro" ? (
                  <div style={{marginTop:"auto",background:"#f0fdf4",border:"1px solid #86efac",borderRadius:10,padding:"12px 14px",fontSize:13,color:"#15803d",fontWeight:700}}>
                    ✓ Payment confirmed!
                    <div style={{fontSize:11,color:"#16a34a",fontWeight:500,marginTop:3}}>ID: {payState.success}</div>
                  </div>
                ) : (
                  <button
                    className="btn btn-secondary btn-lg pc-btn"
                    onClick={() => handleBuyNow("Standard Pro", 1000000)}
                    disabled={payState.loading}
                    style={{opacity: payState.loading ? 0.7 : 1}}
                  >
                    {payState.loading && payState.planName === "Standard Pro" ? "Opening…" : "Buy Now  ₹1"}
                  </button>
                )}
              </div>

              {/* Professional — highlighted */}
              <div className="pricing-card pricing-highlight" style={activePlan === "Professional" ? activeCardStyle : {}}>
                {activePlan === "Professional" ? activeBadge : <div className="pc-badge">Most Popular</div>}
                <div className="pc-name">Professional</div>
                <div className="pc-price-wrap">
                  <span className="pc-price">₹1</span>
                  <span className="pc-period">per user / year</span>
                </div>
                <p className="pc-desc">Scale your team with multi-user access and advanced analytics across all modules.</p>
                <ul className="pc-features">
                  {planFeatures.pro.map(f => <li key={f}><CheckIcon />{f}</li>)}
                </ul>
                {activePlan === "Professional" ? cancelBtn : payState.success && payState.planName === "Professional" ? (
                  <div style={{marginTop:"auto",background:"#f0fdf4",border:"1px solid #86efac",borderRadius:10,padding:"12px 14px",fontSize:13,color:"#15803d",fontWeight:700}}>
                    ✓ Payment confirmed!
                    <div style={{fontSize:11,color:"#16a34a",fontWeight:500,marginTop:3}}>ID: {payState.success}</div>
                  </div>
                ) : (
                  <button
                    className="btn btn-primary btn-lg pc-btn"
                    onClick={() => handleBuyNow("Professional", 1000000)}
                    disabled={payState.loading}
                    style={{opacity: payState.loading ? 0.7 : 1}}
                  >
                    {payState.loading && payState.planName === "Professional" ? "Opening…" : "Buy Now  ₹1"}
                  </button>
                )}
              </div>

              {/* Enterprise */}
              <div className="pricing-card" style={activePlan === "Enterprise" ? activeCardStyle : {}}>
                {activePlan === "Enterprise" && activeBadge}
                <div className="pc-name">Enterprise</div>
                <div className="pc-price-wrap">
                  <span className="pc-price">₹1</span>
                  <span className="pc-period">per user / year</span>
                </div>
                <p className="pc-desc">Unlimited scale, custom integrations, and white-glove support for large organizations.</p>
                <ul className="pc-features">
                  {planFeatures.enterprise.map(f => <li key={f}><CheckIcon />{f}</li>)}
                </ul>
                {activePlan === "Enterprise" ? cancelBtn : payState.success && payState.planName === "Enterprise" ? (
                  <div style={{marginTop:"auto",background:"#f0fdf4",border:"1px solid #86efac",borderRadius:10,padding:"12px 14px",fontSize:13,color:"#15803d",fontWeight:700}}>
                    ✓ Payment confirmed!
                    <div style={{fontSize:11,color:"#16a34a",fontWeight:500,marginTop:3}}>ID: {payState.success}</div>
                  </div>
                ) : (
                  <button
                    className="btn btn-secondary btn-lg pc-btn"
                    onClick={() => handleBuyNow("Enterprise", 1000000)}
                    disabled={payState.loading}
                    style={{opacity: payState.loading ? 0.7 : 1}}
                  >
                    {payState.loading && payState.planName === "Enterprise" ? "Opening…" : "Buy Now  ₹1"}
                  </button>
                )}
              </div>

            </div>
          );
        })()}

        {/* Payment error banner */}
        {payState.error && (
          <div className="ap-pay-error">⚠ {payState.error}</div>
        )}

        {/* Payment success banner (bundle) */}
        {payState.success && (
          <div className="ap-pay-success">
            <div className="ap-pay-success-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <div>
              <div className="ap-pay-success-title">Payment Successful — {payState.planName} Activated</div>
              <div className="ap-pay-success-sub">Your subscription is now active. The team will reach out to set up your account.</div>
              <div className="ap-pay-success-id">Payment ID: {payState.success}</div>
            </div>
          </div>
        )}
      </>
    );
  }

  function renderAccount() {
    const emailDomain = admin?.email?.split("@")[1] || "core5.co.in";
    const orgName     = emailDomain.split(".")[0].charAt(0).toUpperCase() + emailDomain.split(".")[0].slice(1);

    return (
      <div className="ap-account-card">
        <div className="ap-account-header">
          <div className="ap-account-profile">
            {/* Avatar / photo */}
            <div className="ap-photo-wrap">
              <div className="ap-photo-circle">
                {(editMode ? editPhoto : adminProfile.photo)
                  ? <img src={editMode ? editPhoto : adminProfile.photo} alt="profile" />
                  : (editMode ? editName[0]?.toUpperCase() : adminProfile.name[0]?.toUpperCase()) || "A"
                }
              </div>
              {editMode && (
                <label className="ap-photo-edit-btn" title="Change photo">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg>
                  <input type="file" accept="image/*" className="ap-photo-input" onChange={handlePhotoChange} />
                </label>
              )}
            </div>

            {/* Name + role */}
            <div>
              {editMode ? (
                <input
                  className="ap-input"
                  style={{fontSize:16,fontWeight:700,marginBottom:4,width:220}}
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  placeholder="Display name"
                  autoFocus
                />
              ) : (
                <div className="ap-account-name" style={{marginBottom:0}}>{adminProfile.name}</div>
              )}
              <div className="ap-account-role" style={{marginTop:6}}>{admin?.orgAdmin ? 'Co-Admin' : 'Super Admin'}</div>
            </div>
          </div>

          {/* Edit / Save / Cancel buttons */}
          {editMode ? (
            <div style={{display:"flex",gap:8,alignSelf:"flex-start"}}>
              <button className="ap-btn-primary" style={{padding:"7px 16px"}} onClick={saveProfile}>Save</button>
              <button className="ap-btn-ghost"   style={{padding:"7px 14px"}} onClick={() => setEditMode(false)}>Cancel</button>
            </div>
          ) : (
            <button className="ap-btn-ghost" style={{padding:"7px 16px",alignSelf:"flex-start"}} onClick={openEdit}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight:5}}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg>
              Edit Profile
            </button>
          )}
        </div>

        <div className="ap-account-info">
          {[
            ["Full Name",     adminProfile.name],
            ["Email",         admin?.email || "admin@core5.co.in"],
            ["Role",          "Super Admin"],
            ["Access",        "Full Platform"],
            ["Organisation",  orgName],
          ].map(([l, v]) => (
            <div key={l} className="ap-account-row">
              <span className="ap-account-row-label">{l}</span>
              <span className="ap-account-row-val">{v}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function renderSettings() {
    const items = [
      { key: "emailNotifs",  label: "Email Notifications",  sub: "Receive alerts and reports via email" },
      { key: "activityLogs", label: "User Activity Logs",    sub: "Track all user logins and actions" },
      { key: "autoExpiry",   label: "Auto Session Expiry",   sub: "Sessions expire after 2 days of inactivity" },
      { key: "darkMode",     label: "Dark Mode",             sub: "Switch the admin portal to dark theme" },
    ];
    return (
      <div className="ap-card">
        {items.map(({ key, label, sub }) => (
          <div key={key} className="ap-settings-row">
            <div>
              <div className="ap-settings-label">{label}</div>
              <div className="ap-settings-sub">{sub}</div>
            </div>
            <label className="ap-toggle-switch">
              <input type="checkbox" checked={!!settings[key]} onChange={e => updateSetting(key, e.target.checked)} />
              <span className="ap-toggle-slider" />
            </label>
          </div>
        ))}

        {/* MFA row — special styling */}
        <div className="ap-settings-row" style={{background: settings.mfaForUsers ? "#f0fdf4" : "transparent", borderRadius: settings.mfaForUsers ? "0 0 16px 16px" : 0, transition:"background 0.3s"}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:36,height:36,borderRadius:9,background: settings.mfaForUsers ? "#dcfce7" : "#f1f5f9", display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"background 0.3s"}}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={settings.mfaForUsers ? "#16a34a" : "#94a3b8"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>
                <circle cx="12" cy="16" r="1" fill={settings.mfaForUsers ? "#16a34a" : "#94a3b8"}/>
              </svg>
            </div>
            <div>
              <div className="ap-settings-label" style={{color: settings.mfaForUsers ? "#15803d" : "#0f172a"}}>
                MFA for All Users
                {settings.mfaForUsers && <span style={{marginLeft:8,fontSize:11,fontWeight:700,background:"#16a34a",color:"#fff",padding:"1px 7px",borderRadius:999}}>ACTIVE</span>}
              </div>
              <div className="ap-settings-sub">
                {settings.mfaForUsers
                  ? "All users must scan a QR code on first login and enter a 6-digit code on every login."
                  : "Require users to verify identity with an authenticator app on every login."}
              </div>
            </div>
          </div>
          <label className="ap-toggle-switch">
            <input type="checkbox" checked={!!settings.mfaForUsers} onChange={e => updateSetting("mfaForUsers", e.target.checked)} />
            <span className="ap-toggle-slider" />
          </label>
        </div>
      </div>
    );
  }

  function renderRestoreUsers() {
    if (deletedLoading) {
      return (
        <div className="ap-empty">
          <div style={{width:36,height:36,border:"3px solid #e2e8f0",borderTopColor:"#2563eb",borderRadius:"50%",animation:"spin 0.75s linear infinite",margin:"0 auto 14px"}} />
          <div className="ap-empty-text" style={{color:"#64748b"}}>Loading deleted users…</div>
        </div>
      );
    }
    if (deletedUsers.length === 0) {
      return (
        <div className="ap-empty">
          <div className="ap-empty-icon">🗑️</div>
          <div className="ap-empty-text">No recently deleted users. Deleted users appear here for 7 days.</div>
          <button onClick={() => loadDeletedUsers(orgScope)}
            style={{marginTop:14,padding:"7px 16px",borderRadius:8,border:"1px solid #e2e8f0",background:"#f8fafc",cursor:"pointer",fontSize:12,fontWeight:600,color:"#475569",fontFamily:"inherit"}}>
            Refresh
          </button>
        </div>
      );
    }

    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

    return (
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        {deletedUsers.map(u => {
          const deletedAt = new Date(u.deleted_at).getTime();
          const expiresAt = deletedAt + SEVEN_DAYS_MS;
          const remaining = expiresAt - Date.now();
          const daysLeft  = Math.max(0, Math.ceil(remaining / (24 * 60 * 60 * 1000)));
          const pct       = Math.max(0, Math.min(100, (remaining / SEVEN_DAYS_MS) * 100));
          const barColor  = pct > 50 ? "#22c55e" : pct > 25 ? "#f59e0b" : "#dc2626";
          const initials  = (u.name || u.email || "?").slice(0, 2).toUpperCase();
          return (
            <div key={u.email} className="ap-restore-card">
              <div className="ap-restore-avatar">{initials}</div>
              <div className="ap-restore-info">
                <div className="ap-restore-name">{u.name || u.email}</div>
                <div className="ap-restore-meta">{u.email} · Deleted by {u.deleted_by || "admin"} on {new Date(u.deleted_at).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})}</div>
                <div className="ap-restore-countdown">
                  <div className="ap-restore-bar-bg">
                    <div className="ap-restore-bar-fill" style={{width:`${pct}%`,background:barColor}} />
                  </div>
                  <div className="ap-restore-days" style={{color:barColor}}>
                    {daysLeft} day{daysLeft !== 1 ? "s" : ""} left to restore
                  </div>
                </div>
              </div>
              <button className="ap-restore-btn" onClick={() => handleRestoreUser(u)}>
                Restore
              </button>
            </div>
          );
        })}
      </div>
    );
  }

  function renderAiBilling() {
    const fields = AI_PROVIDER_FIELDS[aiCredentialForm.provider] || [];

    function budgetLabel(b) {
      if (b.scope === 'org') return 'Organization-wide';
      if (b.scope === 'team') return `Team: ${b.scopeId}`;
      const cred = aiCredentials.find(c => String(c.id) === String(b.scopeId));
      return `Key: ${cred ? cred.label : `#${b.scopeId}`}`;
    }

    return (
      <>
        <div className="ap-section-sub">
          Connect AI provider keys (OpenAI, Anthropic, Gemini, Azure OpenAI, AWS Bedrock, Vertex AI) so CloudNexus can poll
          each provider's own usage/cost API on a schedule, then set spend budgets with warning and exceeded thresholds.
          Keys are encrypted at rest and never shown again after saving.
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, margin: '12px 0' }}>
          <button className="ap-btn-primary" onClick={() => { setAiCredentialErr(''); setAiCredentialForm({ provider: 'openai', label: '', creds: {} }); setAddAiCredentialModal(true); }}>
            + Add Provider Key
          </button>
          <button className="ap-btn-primary" onClick={() => { setAiBudgetErr(''); setAiBudgetForm({ scope: 'org', scopeId: '', thresholdUsd: '', period: 'monthly', warnPct: 0.7 }); setAddAiBudgetModal(true); }}>
            + Add Budget
          </button>
        </div>

        <div className="ap-card">
          <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a', marginBottom: 10 }}>Provider Keys</div>
          {pollAiCredentialResult && (
            <div style={{
              marginBottom: 10, padding: '8px 12px', borderRadius: 7, fontSize: 12,
              background: pollAiCredentialResult.type === 'success' ? '#f0fdf4' : '#fef2f2',
              border: `1px solid ${pollAiCredentialResult.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
              color: pollAiCredentialResult.type === 'success' ? '#15803d' : '#dc2626',
            }}>
              {pollAiCredentialResult.msg}
            </div>
          )}
          {aiCredentialsLoading ? (
            <div className="ap-empty">
              <div style={{ width: 32, height: 32, border: '3px solid #e2e8f0', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.75s linear infinite', margin: '0 auto 12px' }} />
              <div className="ap-empty-text" style={{ color: '#64748b' }}>Loading keys…</div>
            </div>
          ) : aiCredentials.length === 0 ? (
            <div className="ap-empty">
              <div className="ap-empty-icon">🤖</div>
              <div className="ap-empty-text">No AI provider keys yet. Add one to start collecting usage &amp; cost data.</div>
            </div>
          ) : (
            <table className="ap-table">
              <thead><tr><th>Label</th><th>Provider</th><th>Status</th><th>Last Polled</th><th>Last Error</th><th>Actions</th></tr></thead>
              <tbody>
                {aiCredentials.map(cred => (
                  <tr key={cred.id}>
                    <td style={{ fontWeight: 700, color: '#0f172a', fontSize: 13 }}>{cred.label}</td>
                    <td><span style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>{AI_PROVIDER_LABELS[cred.provider] || cred.provider}</span></td>
                    <td>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 5, background: cred.status === 'active' ? '#dcfce7' : '#fee2e2', color: cred.status === 'active' ? '#15803d' : '#dc2626' }}>
                        {cred.status}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: '#64748b' }}>{cred.lastPolledAt || 'never'}</td>
                    <td style={{ fontSize: 12, color: cred.lastError ? '#dc2626' : '#94a3b8', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={cred.lastError || ''}>
                      {cred.lastError || '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={() => handlePollAiCredentialNow(cred)}
                          disabled={pollingAiCredentialId === cred.id}
                          style={{ fontSize: 11, fontWeight: 600, padding: '4px 10px', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: 6, cursor: pollingAiCredentialId === cred.id ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: pollingAiCredentialId === cred.id ? 0.6 : 1 }}
                        >
                          {pollingAiCredentialId === cred.id ? 'Polling…' : 'Poll Now'}
                        </button>
                        <button
                          onClick={() => setRotateAiCredentialModal({ ...cred, newCreds: {} })}
                          style={{ fontSize: 11, fontWeight: 600, padding: '4px 10px', background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit' }}
                        >
                          Rotate Key
                        </button>
                        <button
                          onClick={() => handleToggleAiCredentialStatus(cred)}
                          style={{ fontSize: 11, fontWeight: 600, padding: '4px 10px', background: cred.status === 'active' ? '#fef2f2' : '#eff6ff', color: cred.status === 'active' ? '#dc2626' : '#2563eb', border: `1px solid ${cred.status === 'active' ? '#fecaca' : '#bfdbfe'}`, borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit' }}
                        >
                          {cred.status === 'active' ? 'Deactivate' : 'Reactivate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="ap-card" style={{ marginTop: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a', marginBottom: 10 }}>Budgets</div>
          {aiBudgets.length === 0 ? (
            <div className="ap-empty">
              <div className="ap-empty-icon">💰</div>
              <div className="ap-empty-text">No budgets configured yet.</div>
            </div>
          ) : (
            <table className="ap-table">
              <thead><tr><th>Scope</th><th>Threshold</th><th>Period</th><th>Warn at</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {aiBudgets.map(b => (
                  <tr key={b.id}>
                    <td style={{ fontWeight: 600, color: '#0f172a', fontSize: 13 }}>{budgetLabel(b)}</td>
                    <td style={{ fontSize: 13 }}>${Number(b.thresholdUsd).toFixed(2)}</td>
                    <td style={{ fontSize: 12, color: '#64748b', textTransform: 'capitalize' }}>{b.period}</td>
                    <td style={{ fontSize: 12, color: '#64748b' }}>{Math.round((b.warnPct || 0.7) * 100)}%</td>
                    <td>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 5, background: b.status === 'active' ? '#dcfce7' : '#f1f5f9', color: b.status === 'active' ? '#15803d' : '#64748b' }}>
                        {b.status}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => handleToggleAiBudgetStatus(b)}
                        style={{ fontSize: 11, fontWeight: 600, padding: '4px 10px', background: b.status === 'active' ? '#fef2f2' : '#eff6ff', color: b.status === 'active' ? '#dc2626' : '#2563eb', border: `1px solid ${b.status === 'active' ? '#fecaca' : '#bfdbfe'}`, borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit' }}
                      >
                        {b.status === 'active' ? 'Pause' : 'Resume'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Add Provider Key Modal ── */}
        {addAiCredentialModal && (
          <div className="ap-modal-overlay" onClick={() => setAddAiCredentialModal(false)}>
            <div className="ap-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
              <div className="ap-modal-header">
                <span>Add AI Provider Key</span>
                <button className="ap-modal-close" onClick={() => setAddAiCredentialModal(false)}>×</button>
              </div>
              <form onSubmit={handleAddAiCredential}>
                <div className="ap-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Provider</label>
                    <select
                      value={aiCredentialForm.provider}
                      onChange={e => setAiCredentialForm(f => ({ ...f, provider: e.target.value, creds: {} }))}
                      style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', background: '#fff', cursor: 'pointer' }}
                    >
                      {Object.keys(AI_PROVIDER_FIELDS).map(p => <option key={p} value={p}>{AI_PROVIDER_LABELS[p]}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Label <span style={{ color: '#dc2626' }}>*</span></label>
                    <input
                      value={aiCredentialForm.label}
                      onChange={e => setAiCredentialForm(f => ({ ...f, label: e.target.value }))}
                      placeholder="e.g. Production OpenAI Org"
                      required
                      style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }}
                    />
                  </div>
                  {fields.map(f => (
                    <div key={f.key}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>
                        {f.label} {f.required && <span style={{ color: '#dc2626' }}>*</span>}
                      </label>
                      {f.type === 'textarea' ? (
                        <textarea
                          rows={4}
                          value={aiCredentialForm.creds[f.key] || ''}
                          onChange={e => setAiCredentialForm(cf => ({ ...cf, creds: { ...cf.creds, [f.key]: e.target.value } }))}
                          placeholder={f.placeholder || ''}
                          required={!!f.required}
                          style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 12, fontFamily: 'monospace', resize: 'vertical', boxSizing: 'border-box' }}
                        />
                      ) : (
                        <input
                          type={f.type}
                          value={aiCredentialForm.creds[f.key] || f.defaultValue || ''}
                          onChange={e => setAiCredentialForm(cf => ({ ...cf, creds: { ...cf.creds, [f.key]: e.target.value } }))}
                          placeholder={f.placeholder || ''}
                          required={!!f.required}
                          style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }}
                        />
                      )}
                    </div>
                  ))}
                  {aiCredentialErr && (
                    <div style={{ fontSize: 12, color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, padding: '8px 12px' }}>{aiCredentialErr}</div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', padding: '16px 24px', borderTop: '1px solid #f1f5f9' }}>
                  <button type="button" onClick={() => setAddAiCredentialModal(false)} style={{ padding: '8px 18px', border: '1px solid #e2e8f0', borderRadius: 7, background: '#f8fafc', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>Cancel</button>
                  <button type="submit" disabled={aiCredentialSaving} style={{ padding: '8px 18px', background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', color: '#fff', border: 'none', borderRadius: 7, fontWeight: 600, fontSize: 13, cursor: aiCredentialSaving ? 'not-allowed' : 'pointer', opacity: aiCredentialSaving ? 0.6 : 1, fontFamily: 'inherit' }}>
                    {aiCredentialSaving ? 'Saving…' : 'Add Key'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── Rotate Key Modal ── */}
        {rotateAiCredentialModal && (() => {
          const rotateFields = AI_PROVIDER_FIELDS[rotateAiCredentialModal.provider] || [];
          return (
            <div className="ap-modal-overlay" onClick={() => setRotateAiCredentialModal(null)}>
              <div className="ap-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
                <div className="ap-modal-header">
                  <span>Rotate Key — {rotateAiCredentialModal.label}</span>
                  <button className="ap-modal-close" onClick={() => setRotateAiCredentialModal(null)}>×</button>
                </div>
                <form onSubmit={handleRotateAiCredential}>
                  <div className="ap-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ padding: '10px 12px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 7, fontSize: 12, color: '#92400e' }}>
                      Enter the new key below — the old one will stop being used immediately after saving.
                    </div>
                    {rotateFields.map(f => (
                      <div key={f.key}>
                        <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>
                          {f.label} {f.required && <span style={{ color: '#dc2626' }}>*</span>}
                        </label>
                        {f.type === 'textarea' ? (
                          <textarea rows={4} value={rotateAiCredentialModal.newCreds[f.key] || ''} onChange={e => setRotateAiCredentialModal(m => ({ ...m, newCreds: { ...m.newCreds, [f.key]: e.target.value } }))} placeholder={f.placeholder || ''} required={!!f.required} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 12, fontFamily: 'monospace', resize: 'vertical', boxSizing: 'border-box' }} />
                        ) : (
                          <input type={f.type} value={rotateAiCredentialModal.newCreds[f.key] || ''} onChange={e => setRotateAiCredentialModal(m => ({ ...m, newCreds: { ...m.newCreds, [f.key]: e.target.value } }))} placeholder={f.placeholder || ''} required={!!f.required} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }} />
                        )}
                      </div>
                    ))}
                    {aiCredentialErr && (
                      <div style={{ fontSize: 12, color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, padding: '8px 12px' }}>{aiCredentialErr}</div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', padding: '16px 24px', borderTop: '1px solid #f1f5f9' }}>
                    <button type="button" onClick={() => setRotateAiCredentialModal(null)} style={{ padding: '8px 18px', border: '1px solid #e2e8f0', borderRadius: 7, background: '#f8fafc', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>Cancel</button>
                    <button type="submit" disabled={aiCredentialSaving} style={{ padding: '8px 18px', background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', color: '#fff', border: 'none', borderRadius: 7, fontWeight: 600, fontSize: 13, cursor: aiCredentialSaving ? 'not-allowed' : 'pointer', opacity: aiCredentialSaving ? 0.6 : 1, fontFamily: 'inherit' }}>
                      {aiCredentialSaving ? 'Saving…' : 'Rotate Key'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          );
        })()}

        {/* ── Add Budget Modal ── */}
        {addAiBudgetModal && (
          <div className="ap-modal-overlay" onClick={() => setAddAiBudgetModal(false)}>
            <div className="ap-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
              <div className="ap-modal-header">
                <span>Add AI Budget</span>
                <button className="ap-modal-close" onClick={() => setAddAiBudgetModal(false)}>×</button>
              </div>
              <form onSubmit={handleAddAiBudget}>
                <div className="ap-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Scope</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {[['org', 'Org-wide'], ['team', 'Team'], ['key', 'Provider Key']].map(([v, l]) => (
                        <button key={v} type="button"
                          onClick={() => setAiBudgetForm(f => ({ ...f, scope: v, scopeId: '' }))}
                          style={{ flex: 1, padding: '8px 0', border: `2px solid ${aiBudgetForm.scope === v ? '#2563eb' : '#e2e8f0'}`, borderRadius: 8, background: aiBudgetForm.scope === v ? '#eff6ff' : '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 12, color: aiBudgetForm.scope === v ? '#2563eb' : '#374151' }}
                        >{l}</button>
                      ))}
                    </div>
                  </div>
                  {aiBudgetForm.scope === 'team' && (
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Team / project identifier <span style={{ color: '#dc2626' }}>*</span></label>
                      <input value={aiBudgetForm.scopeId} onChange={e => setAiBudgetForm(f => ({ ...f, scopeId: e.target.value }))} placeholder="e.g. project_abc123" required style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }} />
                    </div>
                  )}
                  {aiBudgetForm.scope === 'key' && (
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Provider key <span style={{ color: '#dc2626' }}>*</span></label>
                      <select value={aiBudgetForm.scopeId} onChange={e => setAiBudgetForm(f => ({ ...f, scopeId: e.target.value }))} required style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', background: '#fff' }}>
                        <option value="">— Select key —</option>
                        {aiCredentials.map(c => <option key={c.id} value={c.id}>{c.label} ({AI_PROVIDER_LABELS[c.provider] || c.provider})</option>)}
                      </select>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Threshold (USD) <span style={{ color: '#dc2626' }}>*</span></label>
                      <input type="number" min="0.01" step="0.01" value={aiBudgetForm.thresholdUsd} onChange={e => setAiBudgetForm(f => ({ ...f, thresholdUsd: e.target.value }))} required style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Period</label>
                      <select value={aiBudgetForm.period} onChange={e => setAiBudgetForm(f => ({ ...f, period: e.target.value }))} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', background: '#fff' }}>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Warn at (% of threshold)</label>
                    <input type="number" min="1" max="100" value={Math.round((aiBudgetForm.warnPct || 0.7) * 100)} onChange={e => setAiBudgetForm(f => ({ ...f, warnPct: Math.max(1, Math.min(100, Number(e.target.value) || 70)) / 100 }))} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }} />
                  </div>
                  {aiBudgetErr && (
                    <div style={{ fontSize: 12, color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, padding: '8px 12px' }}>{aiBudgetErr}</div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', padding: '16px 24px', borderTop: '1px solid #f1f5f9' }}>
                  <button type="button" onClick={() => setAddAiBudgetModal(false)} style={{ padding: '8px 18px', border: '1px solid #e2e8f0', borderRadius: 7, background: '#f8fafc', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>Cancel</button>
                  <button type="submit" disabled={aiBudgetSaving} style={{ padding: '8px 18px', background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', color: '#fff', border: 'none', borderRadius: 7, fontWeight: 600, fontSize: 13, cursor: aiBudgetSaving ? 'not-allowed' : 'pointer', opacity: aiBudgetSaving ? 0.6 : 1, fontFamily: 'inherit' }}>
                    {aiBudgetSaving ? 'Saving…' : 'Add Budget'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </>
    );
  }

  const sectionMap = {
    "tool-monitoring":  () => renderToolSection("monitoring"),
    "tool-billing":     () => renderToolSection("billing"),
    users:              renderUsers,
    restore:            renderRestoreUsers,
    access:             renderAccess,
    "cloud-accounts":   renderCloudAccounts,
    connectors:         renderConnectorsSection,
    "ai-billing":       renderAiBilling,
    plan:               renderPlan,
    account:            renderAccount,
    settings:           renderSettings,
  };

  return (
    <>
      <style>{css}</style>

      {/* ── Subscription Lock Overlay (demo expired / cold period) ──── */}
      {((coldPeriodEndsAt && !settings.currentPlan) || (demoExpiresAt && demoExpiresAt <= Date.now() && !settings.currentPlan)) && (() => {
        const hasCold = !!coldPeriodEndsAt;
        const coldExpired = hasCold && coldPeriodEndsAt <= Date.now();
        const diff = hasCold ? Math.max(0, Math.floor((coldPeriodEndsAt - Date.now()) / 1000)) : 0;
        const dd = Math.floor(diff / 86400);
        const hh = Math.floor((diff % 86400) / 3600);
        const mm = Math.floor((diff % 3600) / 60);

        const isBundleActiveOv = settings.currentPlan === (bundleTab === "monitoring" ? "Monitoring Bundle" : "Billing Bundle");
        return (
          <div style={{
            position:"fixed", inset:0, zIndex:99999,
            background:"rgba(7,17,31,0.97)",
            overflowY:"auto"
          }}>
            {/* Top bar with timer + sign out */}
            <div style={{
              position:"sticky", top:0, zIndex:1,
              background:"linear-gradient(90deg,#0f172a,#1e293b)",
              borderBottom:"1px solid rgba(255,255,255,.08)",
              padding:"12px 32px",
              display:"flex", alignItems:"center", justifyContent:"space-between"
            }}>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <span style={{color:"#fff",fontWeight:700,fontSize:15}}>
                  {coldExpired ? "Account being deleted…" : "Demo Expired — Choose a plan to continue"}
                </span>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:16}}>
                {hasCold && !coldExpired && (
                  <div style={{
                    display:"flex",alignItems:"center",gap:8,
                    background:"rgba(220,38,38,.15)",border:"1px solid rgba(220,38,38,.3)",
                    borderRadius:8,padding:"6px 14px"
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                    <span style={{color:"#ef4444",fontSize:14,fontWeight:700,fontFamily:"monospace",fontVariantNumeric:"tabular-nums"}}>
                      {dd}d {String(hh).padStart(2,'0')}h {String(mm).padStart(2,'0')}m remaining
                    </span>
                  </div>
                )}
                <button onClick={onLogout} style={{
                  background:"none",border:"1px solid rgba(255,255,255,.2)",color:"#94a3b8",
                  borderRadius:8,padding:"6px 16px",fontSize:13,fontWeight:600,cursor:"pointer"
                }}>Sign Out</button>
              </div>
            </div>

            {coldExpired ? (
              <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"60vh"}}>
                <div style={{textAlign:"center",color:"#94a3b8",fontSize:16}}>
                  Your account data is being removed. You will be logged out shortly.
                </div>
              </div>
            ) : (
              <div style={{maxWidth:1100,margin:"0 auto",padding:"40px 24px 60px"}}>
                <div style={{textAlign:"center",marginBottom:36}}>
                  <h2 style={{color:"#fff",fontSize:28,fontWeight:800,margin:"0 0 8px",letterSpacing:"-0.5px"}}>
                    Choose Your Plan
                  </h2>
                  <p style={{color:"#94a3b8",fontSize:15,margin:0}}>
                    Subscribe to keep your account, users, cloud connections, and all data
                  </p>
                </div>

                {/* Plan cards grid — same as the plan section */}
                <div className="pricing-grid">
                  {/* Bundle */}
                  <div className="pricing-card bundle-card">
                    <div className="bundle-toggle">
                      <button className={`bundle-tab ${bundleTab === "monitoring" ? "active" : ""}`} onClick={() => setBundleTab("monitoring")}>Monitoring</button>
                      <button className={`bundle-tab ${bundleTab === "billing"    ? "active" : ""}`} onClick={() => setBundleTab("billing")}>Billing</button>
                    </div>
                    <div key={bundleTab} className="bundle-plan-content">
                      <div className="pc-name">{bundleTab === "monitoring" ? "Monitoring Bundle" : "Billing Bundle"}</div>
                      <div className="pc-price-wrap"><span className="pc-price">₹1</span><span className="pc-period">per user / year</span></div>
                      <p className="pc-desc">{bundleTab === "monitoring" ? "Infrastructure health, real-time alerting, and server analytics." : "Cloud cost tracking, invoice management, and spend optimization."}</p>
                      <button className="btn btn-secondary btn-lg pc-btn" onClick={() => handleBuyNow(`${bundleTab === "monitoring" ? "Monitoring" : "Billing"} Bundle`, 1000000)} disabled={payState.loading}>
                        {payState.loading && payState.planName.includes("Bundle") ? "Opening…" : "Buy Now  ₹1"}
                      </button>
                    </div>
                  </div>
                  {/* Standard Pro */}
                  <div className="pricing-card">
                    <div className="pc-name">Standard Pro</div>
                    <div className="pc-price-wrap"><span className="pc-price">₹1</span><span className="pc-period">per user / year</span></div>
                    <p className="pc-desc">Full access to both monitoring and billing in one plan.</p>
                    <button className="btn btn-secondary btn-lg pc-btn" onClick={() => handleBuyNow("Standard Pro", 1000000)} disabled={payState.loading}>
                      {payState.loading && payState.planName === "Standard Pro" ? "Opening…" : "Buy Now  ₹1"}
                    </button>
                  </div>
                  {/* Professional */}
                  <div className="pricing-card pricing-highlight">
                    <div className="pc-badge">Most Popular</div>
                    <div className="pc-name">Professional</div>
                    <div className="pc-price-wrap"><span className="pc-price">₹1</span><span className="pc-period">per user / year</span></div>
                    <p className="pc-desc">Multi-user access and advanced analytics across all modules.</p>
                    <button className="btn btn-primary btn-lg pc-btn" onClick={() => handleBuyNow("Professional", 1000000)} disabled={payState.loading}>
                      {payState.loading && payState.planName === "Professional" ? "Opening…" : "Buy Now  ₹1"}
                    </button>
                  </div>
                  {/* Enterprise */}
                  <div className="pricing-card">
                    <div className="pc-name">Enterprise</div>
                    <div className="pc-price-wrap"><span className="pc-price">₹1</span><span className="pc-period">per user / year</span></div>
                    <p className="pc-desc">Unlimited scale, custom integrations, and white-glove support.</p>
                    <button className="btn btn-secondary btn-lg pc-btn" onClick={() => handleBuyNow("Enterprise", 1000000)} disabled={payState.loading}>
                      {payState.loading && payState.planName === "Enterprise" ? "Opening…" : "Buy Now  ₹1"}
                    </button>
                  </div>
                </div>

                {payState.error && <div className="ap-pay-error" style={{marginTop:16}}>⚠ {payState.error}</div>}

                <p style={{textAlign:"center",color:"#475569",fontSize:12,marginTop:24,lineHeight:1.6}}>
                  All data including users, cloud accounts, and configurations will be permanently deleted when the timer reaches zero.
                </p>
              </div>
            )}
          </div>
        );
      })()}

      {planCancelledBanner && (
        <div style={{
          position:"fixed", top:0, left:0, right:0, zIndex:9999,
          background:"linear-gradient(90deg,#dc2626,#b91c1c)",
          color:"#fff", padding:"14px 20px",
          display:"flex", alignItems:"center", justifyContent:"space-between",
          fontWeight:600, fontSize:14, boxShadow:"0 2px 12px rgba(0,0,0,.4)"
        }}>
          <span>Your plan has been cancelled by the super admin. Some features may be restricted.</span>
          <button onClick={() => setPlanCancelledBanner(false)}
            style={{background:"none",border:"none",color:"#fff",fontSize:18,cursor:"pointer",padding:"0 4px",lineHeight:1}}>
            ×
          </button>
        </div>
      )}
      <div className="ap-wrap">

        {/* Sidebar */}
        <aside className="ap-sidebar">
          <button className="ap-logo-btn" title="MyCloudNexus"><CloudIcon /></button>
          <nav className="ap-nav">
            {/* ── Tool shortcuts (plan-gated) ── */}
            {planRestrictions.allowedTools.includes("monitoring") && (
              <button
                className={`ap-nav-btn tool-monitoring ${section === "tool-monitoring" ? "ap-active" : ""}`}
                onClick={() => setSection("tool-monitoring")}
                title="Monitoring"
              >
                <MonitoringNavIcon />
                <span className="ap-nav-tip">Monitoring</span>
              </button>
            )}
            {planRestrictions.allowedTools.includes("billing") && (
              <button
                className={`ap-nav-btn tool-billing ${section === "tool-billing" ? "ap-active" : ""}`}
                onClick={() => setSection("tool-billing")}
                title="Billing"
              >
                <BillingNavIcon />
                <span className="ap-nav-tip">Billing</span>
              </button>
            )}
            {/* Divider between tools and admin nav */}
            {planRestrictions.allowedTools.length > 0 && (
              <div className="ap-nav-divider" />
            )}

            {/* ── Admin nav items ── */}
            {navItems.map(({ id, label, Icon, badge }) => (
              <button key={id} className={`ap-nav-btn ${section === id ? "ap-active" : ""}`} onClick={() => setSection(id)} style={{position:"relative"}}>
                <Icon />
                {badge ? (
                  <span style={{position:"absolute",top:6,right:6,width:14,height:14,borderRadius:"50%",background:"#dc2626",color:"#fff",fontSize:9,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1}}>
                    {badge > 9 ? "9+" : badge}
                  </span>
                ) : null}
                <span className="ap-nav-tip">{label}</span>
              </button>
            ))}
          </nav>
          <div className="ap-logout">
            <button className="ap-nav-btn" onClick={onLogout}>
              <LogoutIcon />
              <span className="ap-nav-tip">Sign Out</span>
            </button>
          </div>
        </aside>

        {/* Main */}
        <div className="ap-main">
          <div className="ap-topbar">
            <div>
              <div className="ap-topbar-title">{sectionTitles[section]}</div>
            </div>
            {demoExpiresAt && demoExpiresAt > Date.now() && (() => {
              const diff = Math.max(0, Math.floor((demoExpiresAt - Date.now()) / 1000));
              const mm = Math.floor(diff / 60);
              const ss = diff % 60;
              return (
                <div style={{
                  display:"flex", alignItems:"center", gap:8,
                  background:"#eff6ff", border:"1px solid #bfdbfe",
                  borderRadius:8, padding:"4px 12px", marginRight:8
                }}>
                  <span style={{fontSize:11, fontWeight:700, color:"#2563eb", letterSpacing:.5}}>DEMO</span>
                  <span style={{fontSize:14, fontWeight:700, color:"#1d4ed8", fontFamily:"monospace", fontVariantNumeric:"tabular-nums"}}>
                    {mm}:{String(ss).padStart(2,'0')}
                  </span>
                </div>
              );
            })()}
            <div className="ap-topbar-avatar" title={adminProfile.name}>
              {adminProfile.photo
                ? <img src={adminProfile.photo} alt="profile" />
                : adminProfile.name[0]?.toUpperCase() || "A"
              }
            </div>
          </div>

          <div className="ap-content">
            {<div className="ap-section-head">
              <div>
                <div className="ap-section-title">{sectionTitles[section]}</div>
                {section === "users"  && (
                  <div className="ap-section-sub">
                    {usersLoading
                      ? "Loading…"
                      : `${users.length} / ${planRestrictions.maxUsers === Infinity ? "∞" : planRestrictions.maxUsers} users`
                    }
                    {!usersLoading && ` — ${settings.currentPlan || "Developer plan"}`}
                  </div>
                )}
                {section === "restore" && (
                  <div className="ap-section-sub">
                    {deletedUsers.length === 0 ? "No recently deleted users" : `${deletedUsers.length} user${deletedUsers.length !== 1 ? "s" : ""} awaiting restore — permanent deletion after 7 days`}
                  </div>
                )}
                {section === "access" && <div className="ap-section-sub">Toggle tool access per user. Changes apply instantly on next login.</div>}
              </div>
              {section === "users" && (
                <button
                  className="ap-btn-primary"
                  onClick={() => setShowModal(true)}
                  disabled={planRestrictions.maxUsers !== Infinity && users.length >= planRestrictions.maxUsers}
                  title={planRestrictions.maxUsers !== Infinity && users.length >= planRestrictions.maxUsers
                    ? `User limit reached (${planRestrictions.maxUsers}/${planRestrictions.maxUsers}). Upgrade your plan to add more.`
                    : "Add a new user"}
                  style={planRestrictions.maxUsers !== Infinity && users.length >= planRestrictions.maxUsers
                    ? {opacity:0.5, cursor:"not-allowed"} : {}}
                >
                  <PlusIcon /> Add User
                </button>
              )}
            </div>}
            {/* ── Over-limit warning banner ── */}
            {overLimitSecs !== null && planRestrictions.maxUsers !== Infinity && (
              <div style={{
                background:"linear-gradient(135deg,#7f1d1d,#991b1b)",
                border:"1px solid #ef4444",
                borderRadius:14,
                padding:"18px 22px",
                marginBottom:24,
                display:"flex",
                alignItems:"center",
                justifyContent:"space-between",
                gap:16,
                boxShadow:"0 4px 24px rgba(239,68,68,0.25)",
                animation:"apModalIn 0.3s ease",
              }}>
                <div style={{display:"flex",alignItems:"center",gap:14}}>
                  {/* Countdown ring */}
                  <div style={{
                    width:52, height:52, borderRadius:"50%", flexShrink:0,
                    background:"rgba(0,0,0,0.3)", border:"3px solid #ef4444",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    flexDirection:"column",
                  }}>
                    <div style={{fontSize:18,fontWeight:900,color:"#fca5a5",lineHeight:1}}>{overLimitSecs}</div>
                    <div style={{fontSize:9,color:"rgba(255,255,255,0.6)",fontWeight:600,letterSpacing:0.5}}>SEC</div>
                  </div>
                  <div>
                    <div style={{fontSize:14,fontWeight:800,color:"#fff",marginBottom:3}}>
                      User Limit Exceeded — Action Required
                    </div>
                    <div style={{fontSize:12,color:"rgba(255,255,255,0.75)",lineHeight:1.6}}>
                      Your <strong style={{color:"#fca5a5"}}>{settings.currentPlan}</strong> plan allows&nbsp;
                      <strong style={{color:"#fca5a5"}}>{planRestrictions.maxUsers}</strong> user{planRestrictions.maxUsers !== 1 ? "s" : ""}.
                      You currently have <strong style={{color:"#fca5a5"}}>{users.length}</strong> users —&nbsp;
                      <strong style={{color:"#fca5a5"}}>{users.length - planRestrictions.maxUsers}</strong> over the limit.
                      Remove the excess user{users.length - planRestrictions.maxUsers !== 1 ? "s" : ""} manually or the system will auto-remove them when the timer reaches zero.
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSection("users")}
                  style={{
                    flexShrink:0, background:"#ef4444", color:"#fff", border:"none",
                    borderRadius:9, padding:"9px 18px", fontSize:13, fontWeight:700,
                    cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap",
                  }}
                >
                  Manage Users
                </button>
              </div>
            )}

            {sectionMap[section]?.()}
          </div>
        </div>

        {/* Cloud Account Detail Modal (provider badge click in Users tab) */}
        {cloudAccountModal && (
          <div className="ap-modal-overlay" onClick={() => { setCloudAccountModal(null); setSwitchingAccount(null); }}>
            <div className="ap-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
              <div className="ap-modal-header">
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ProviderLogo provider={cloudAccountModal.provider} size={18} />
                  {cloudAccountModal.provider.toUpperCase()} Accounts — {cloudAccountModal.userName}
                </span>
                <button className="ap-modal-close" onClick={() => { setCloudAccountModal(null); setSwitchingAccount(null); }}>×</button>
              </div>
              <div className="ap-modal-body">
                {cloudAccountModal.accounts.length === 0 ? (
                  <div style={{ fontSize: 13, color: '#94a3b8' }}>No accounts assigned.</div>
                ) : (
                  <>
                    {cloudAccountModal.accounts.length > 1 && (
                      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 12, padding: '8px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight:5,verticalAlign:'middle'}}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                        Click <strong>Switch</strong> to change which {cloudAccountModal.provider.toUpperCase()} account this user sees in their portal.
                      </div>
                    )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {cloudAccountModal.accounts.map(a => {
                      const isSwitching = switchingAccount?.accountId === a.id && !switchingAccount?.done;
                      const isDone      = switchingAccount?.accountId === a.id && switchingAccount?.done;
                      const isActive    = cloudAccountModal.primaryId
                        ? cloudAccountModal.primaryId === a.id
                        : cloudAccountModal.accounts[0]?.id === a.id;
                      return (
                      <div key={a.id} style={{ padding: '12px 14px', border: `1.5px solid ${isDone ? '#22c55e' : isActive ? '#22c55e' : '#e2e8f0'}`, borderRadius: 10, background: isDone ? '#f0fdf4' : isActive ? '#f0fdf4' : '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, transition: 'border-color 0.2s, background 0.2s' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <ProviderLogo provider={a.provider} size={14} />
                            {a.label}
                            {isActive && !isDone && (
                              <span style={{ fontSize: 10, fontWeight: 700, color: '#16a34a', background: '#dcfce7', borderRadius: 4, padding: '1px 6px', letterSpacing: 0.3 }}>ACTIVE</span>
                            )}
                            {isDone && (
                              <span style={{ fontSize: 10, fontWeight: 700, color: '#16a34a', background: '#dcfce7', borderRadius: 4, padding: '1px 6px', letterSpacing: 0.3 }}>SWITCHED ✓</span>
                            )}
                          </div>
                          <div style={{ fontSize: 11, color: '#22c55e', fontWeight: 600, marginTop: 3 }}>● Connected</div>
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                          {cloudAccountModal.accounts.length > 1 && !isActive && (
                            <button
                              onClick={() => !switchingAccount && handleSwitchAccount(a)}
                              disabled={!!switchingAccount}
                              style={{
                                fontSize: 11, fontWeight: 700, padding: '5px 12px',
                                background: isDone ? '#16a34a' : isSwitching ? '#1d4ed8' : '#2563eb',
                                color: '#fff', border: 'none', borderRadius: 7, cursor: switchingAccount ? 'not-allowed' : 'pointer',
                                fontFamily: 'inherit', opacity: switchingAccount && !isSwitching && !isDone ? 0.4 : 1,
                                display: 'flex', alignItems: 'center', gap: 5, transition: 'all 0.2s',
                              }}
                            >
                              {isSwitching ? (
                                <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" style={{animation:'spin 0.7s linear infinite'}} strokeLinecap="round"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg> Switching…</>
                              ) : (
                                <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg> Set Active</>
                              )}
                            </button>
                          )}
                          <button
                            onClick={() => { setCloudAccountModal(null); setSwitchingAccount(null); openCredViewFromUserModal(a); }}
                            style={{ fontSize: 11, fontWeight: 600, padding: '5px 10px', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: 7, cursor: 'pointer', fontFamily: 'inherit' }}
                          >
                            View Credentials
                          </button>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                  </>
                )}
              </div>
              <div style={{ padding: '12px 24px', borderTop: '1px solid #f1f5f9', textAlign: 'right' }}>
                <button onClick={() => { setCloudAccountModal(null); setSwitchingAccount(null); }} style={{ padding: '7px 18px', border: '1px solid #e2e8f0', borderRadius: 7, background: '#f8fafc', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>Close</button>
              </div>
            </div>
          </div>
        )}

        {/* Credential View Modal */}
        {credViewModal && (
          <div className="ap-modal-overlay" onClick={() => { setCredViewModal(null); setCredViewData(null); }}>
            <div className="ap-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
              <div className="ap-modal-header">
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ProviderLogo provider={credViewModal.provider} size={18} />
                  {credViewModal.label} — Credentials
                </span>
                <button className="ap-modal-close" onClick={() => { setCredViewModal(null); setCredViewData(null); }}>×</button>
              </div>
              <div className="ap-modal-body">
                {credViewLoading ? (
                  <div style={{ textAlign: 'center', padding: '28px 0', color: '#64748b' }}>
                    <div style={{ width: 28, height: 28, border: '3px solid #e2e8f0', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.75s linear infinite', margin: '0 auto 10px' }} />
                    Loading credentials…
                  </div>
                ) : credViewData?.error ? (
                  <div style={{ color: '#dc2626', fontSize: 13 }}>{credViewData.error}</div>
                ) : credViewData ? (() => {
                  const creds = credViewData.credentials || {};
                  const provider = credViewModal.provider;

                  const SENSITIVE = new Set(['secretAccessKey', 'sessionToken', 'clientSecret', 'private_key', 'private_key_id']);
                  const GCP_META = new Set(['type', 'auth_uri', 'token_uri', 'auth_provider_x509_cert_url', 'client_x509_cert_url', 'universe_domain']);

                  const renderField = (key, value) => {
                    const isSecret = SENSITIVE.has(key);
                    const show = credShowFields[key];
                    const displayVal = isSecret && !show ? '••••••••••••••••••••' : (typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value ?? ''));
                    return (
                      <div key={key} style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span>{key.replace(/_/g, ' ')}</span>
                          {isSecret && (
                            <button
                              onClick={() => setCredShowFields(s => ({ ...s, [key]: !s[key] }))}
                              style={{ fontSize: 10, fontWeight: 600, padding: '1px 7px', background: show ? '#fef3c7' : '#f1f5f9', color: show ? '#92400e' : '#475569', border: `1px solid ${show ? '#fde68a' : '#e2e8f0'}`, borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit' }}
                            >
                              {show ? 'Hide' : 'Reveal'}
                            </button>
                          )}
                        </div>
                        <div
                          style={{ fontFamily: 'monospace', fontSize: 12, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: '7px 10px', wordBreak: 'break-all', whiteSpace: typeof value === 'object' ? 'pre-wrap' : 'normal', color: '#0f172a', maxHeight: 120, overflowY: 'auto', userSelect: show || !isSecret ? 'text' : 'none' }}
                        >
                          {displayVal}
                        </div>
                      </div>
                    );
                  };

                  if (provider === 'aws') {
                    return (
                      <div>
                        {renderField('accessKeyId', creds.accessKeyId)}
                        {renderField('secretAccessKey', creds.secretAccessKey)}
                        {creds.region && renderField('region', creds.region)}
                        {creds.sessionToken && renderField('sessionToken', creds.sessionToken)}
                      </div>
                    );
                  }
                  if (provider === 'gcp') {
                    const projectId = creds.projectId || creds.project_id;
                    return (
                      <div>
                        {projectId && renderField('projectId', projectId)}
                        {renderField('client_email', creds.client_email)}
                        {renderField('private_key', creds.private_key)}
                        {Object.entries(creds).filter(([k]) => !['projectId','project_id','private_key','client_email','auth_type'].includes(k) && !GCP_META.has(k)).map(([k,v]) => renderField(k, v))}
                      </div>
                    );
                  }
                  if (provider === 'azure') {
                    return (
                      <div>
                        {renderField('subscriptionId', creds.subscriptionId)}
                        {renderField('tenantId', creds.tenantId)}
                        {renderField('clientId', creds.clientId)}
                        {renderField('clientSecret', creds.clientSecret)}
                      </div>
                    );
                  }
                  return <div>{Object.entries(creds).map(([k, v]) => renderField(k, v))}</div>;
                })() : null}

                <div style={{ marginTop: 12, padding: '10px 14px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 7, fontSize: 11, color: '#92400e', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  Credentials are encrypted with AES-256-GCM and only visible to org admins.
                </div>
              </div>
              <div style={{ padding: '12px 24px', borderTop: '1px solid #f1f5f9', textAlign: 'right' }}>
                <button onClick={() => { setCredViewModal(null); setCredViewData(null); }} style={{ padding: '7px 18px', border: '1px solid #e2e8f0', borderRadius: 7, background: '#f8fafc', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>Close</button>
              </div>
            </div>
          </div>
        )}

        {/* Export Date Range Modal */}
        {exportModal && (
          <div className="ap-modal-overlay" onClick={e => e.target === e.currentTarget && setExportModal(null)}>
            <div className="ap-modal" style={{maxWidth:420}}>
              <div className="ap-modal-header">
                <div className="ap-modal-title">
                  {exportModal.target === 'all' ? 'Export All Logs' : `Export — ${exportModal.target.name || exportModal.target.email}`}
                </div>
                <button className="ap-modal-close" onClick={() => setExportModal(null)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </button>
              </div>
              <div className="ap-modal-body">
                <p style={{fontSize:13,color:"#64748b",marginBottom:20}}>Select a date range to filter exported logs. Leave blank to export all events.</p>
                <div style={{display:"flex",gap:14,marginBottom:24}}>
                  <div style={{flex:1}}>
                    <label style={{fontSize:11,fontWeight:700,color:"#64748b",letterSpacing:"0.5px",textTransform:"uppercase",display:"block",marginBottom:6}}>From</label>
                    <input
                      type="date"
                      value={exportModal.dateFrom}
                      onChange={e => setExportModal(p => ({ ...p, dateFrom: e.target.value, dateTo: p.dateTo && p.dateTo < e.target.value ? e.target.value : p.dateTo }))}
                      style={{width:"100%",fontSize:13,padding:"8px 10px",borderRadius:8,border:"1px solid #e2e8f0",color:"#0f172a",background:"#fff",outline:"none",boxSizing:"border-box"}}
                    />
                  </div>
                  <div style={{flex:1}}>
                    <label style={{fontSize:11,fontWeight:700,color:"#64748b",letterSpacing:"0.5px",textTransform:"uppercase",display:"block",marginBottom:6}}>To</label>
                    <input
                      type="date"
                      value={exportModal.dateTo}
                      min={exportModal.dateFrom}
                      onChange={e => setExportModal(p => ({ ...p, dateTo: e.target.value }))}
                      style={{width:"100%",fontSize:13,padding:"8px 10px",borderRadius:8,border:"1px solid #e2e8f0",color:"#0f172a",background:"#fff",outline:"none",boxSizing:"border-box"}}
                    />
                  </div>
                </div>
                <div style={{display:"flex",gap:12}}>
                  <button
                    onClick={() => doExportFromModal('pdf')}
                    style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:8,padding:"11px 0",borderRadius:9,border:"1px solid #e2e8f0",background:"#f8fafc",cursor:"pointer",fontFamily:"inherit",fontWeight:600,fontSize:13,color:"#0f172a",transition:"background 0.15s"}}
                    onMouseEnter={e=>e.currentTarget.style.background="#f1f5f9"} onMouseLeave={e=>e.currentTarget.style.background="#f8fafc"}
                  >
                    <span style={{fontSize:18}}>📄</span>
                    <div style={{textAlign:"left"}}><div>Download PDF</div><div style={{fontSize:11,fontWeight:400,color:"#94a3b8"}}>Print-ready report</div></div>
                  </button>
                  <button
                    onClick={() => doExportFromModal('csv')}
                    style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:8,padding:"11px 0",borderRadius:9,border:"1px solid #e2e8f0",background:"#f8fafc",cursor:"pointer",fontFamily:"inherit",fontWeight:600,fontSize:13,color:"#0f172a",transition:"background 0.15s"}}
                    onMouseEnter={e=>e.currentTarget.style.background="#f1f5f9"} onMouseLeave={e=>e.currentTarget.style.background="#f8fafc"}
                  >
                    <span style={{fontSize:18}}>📊</span>
                    <div style={{textAlign:"left"}}><div>Download CSV</div><div style={{fontSize:11,fontWeight:400,color:"#94a3b8"}}>Spreadsheet / Excel</div></div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Create User Modal */}
        {showModal && (
          <div className="ap-modal-overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
            <div className="ap-modal">
              <div className="ap-modal-header">
                <div className="ap-modal-title">{oneTimePass ? "User Created!" : "Create New User"}</div>
                <button className="ap-modal-close" onClick={closeModal}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </button>
              </div>
              <div className="ap-modal-body">
                {oneTimePass ? (
                  <>
                    <div style={{fontSize:13,color:"#475569",marginBottom:20}}>
                      The user <strong>{form.name || "User"}</strong> has been created. Share the password below — <strong>it will only be shown once.</strong>
                    </div>
                    <div className="ap-otp-box">
                      <div className="ap-otp-label">Auto-Generated Password</div>
                      <div className="ap-otp-warning">⚠ Copy this password now. It cannot be retrieved later.</div>
                      <div className="ap-otp-pass">
                        <span style={{letterSpacing:3}}>{oneTimePass}</span>
                        <button className={`ap-copy-btn ${copied ? "copied" : ""}`} onClick={copyPass}>
                          {copied ? <><CheckIcon /> Copied!</> : <><CopyIcon /> Copy</>}
                        </button>
                      </div>
                    </div>
                    <button className="ap-btn-primary" style={{width:"100%",justifyContent:"center"}} onClick={closeModal}>Done</button>
                  </>
                ) : (
                  <>
                    {formErr && <div className="ap-form-err">{formErr}</div>}
                    <div className="ap-field">
                      <label>Full Name</label>
                      <input className="ap-input" placeholder="e.g. John Smith" value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} />
                    </div>
                    <div className="ap-field">
                      <label>Email Address</label>
                      <input className="ap-input" type="email" placeholder="user@company.com" value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))} />
                    </div>
                    <div className="ap-field">
                      <label>Password</label>
                      <div className="ap-pass-tabs">
                        <button className={`ap-pass-tab ${form.passType === "auto" ? "active" : ""}`} onClick={() => setForm(p => ({...p, passType:"auto", password:"", showPass:false}))}>Auto Generate</button>
                        <button className={`ap-pass-tab ${form.passType === "manual" ? "active" : ""}`} onClick={() => setForm(p => ({...p, passType:"manual", password:"", showPass:false}))}>Set Password</button>
                      </div>
                      {form.passType === "auto" ? (
                        <div className="ap-autogen-info">A <strong>strong random password</strong> will be generated and shown <strong>once</strong> after creation. Make sure to copy it immediately.</div>
                      ) : (() => {
                        const pw = form.password || "";
                        let s = 0;
                        if (pw.length >= 8)  s++;
                        if (pw.length >= 12) s++;
                        if (/[A-Z]/.test(pw)) s++;
                        if (/[0-9]/.test(pw)) s++;
                        if (/[^A-Za-z0-9]/.test(pw)) s++;
                        const sColor = ["#ef4444","#f97316","#eab308","#22c55e","#16a34a","#15803d"][s];
                        const sLabel = ["Too short","Weak","Fair","Good","Strong","Very strong"][s];
                        return (
                          <>
                            <div className="ap-input-wrap">
                              <input
                                className="ap-input"
                                type={form.showPass ? "text" : "password"}
                                placeholder="Enter password"
                                value={form.password}
                                autoComplete="new-password"
                                onChange={e => setForm(p => ({...p, password: e.target.value}))}
                              />
                              <button className="ap-input-eye" type="button" onClick={() => setForm(p => ({...p, showPass: !p.showPass}))}>
                                {form.showPass ? <EyeOffIcon /> : <EyeIcon />}
                              </button>
                            </div>
                            {pw.length > 0 && (
                              <div style={{marginTop:8}}>
                                {/* Strength bars */}
                                <div style={{display:"flex",gap:4,marginBottom:5}}>
                                  {[0,1,2,3,4].map(i => (
                                    <div key={i} style={{flex:1,height:4,borderRadius:3,background: i < s ? sColor : "#e2e8f0",transition:"background 0.2s"}}/>
                                  ))}
                                </div>
                                <div style={{fontSize:11,fontWeight:700,color:sColor,marginBottom:8}}>{sLabel}</div>
                                {/* Criteria checklist */}
                                <div style={{display:"flex",flexDirection:"column",gap:3}}>
                                  {[
                                    [pw.length >= 8,  "At least 8 characters"],
                                    [pw.length >= 12, "12+ characters (recommended)"],
                                    [/[A-Z]/.test(pw),"Uppercase letter"],
                                    [/[0-9]/.test(pw),"Number"],
                                    [/[^A-Za-z0-9]/.test(pw),"Special character (@#$!…)"],
                                  ].map(([met, label]) => (
                                    <div key={label} style={{display:"flex",alignItems:"center",gap:6,fontSize:11,color: met ? "#16a34a" : "#94a3b8"}}>
                                      <span style={{fontSize:13,lineHeight:1}}>{met ? "✓" : "○"}</span>
                                      {label}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                    {/* Plan-based tool assignment info */}
                    <div style={{background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:9,padding:"10px 14px",marginBottom:14,fontSize:12,color:"#475569"}}>
                      <div style={{fontWeight:700,color:"#0f172a",marginBottom:5}}>Tools assigned on creation:</div>
                      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                        {planRestrictions.allowedTools.includes("monitoring") && (
                          <span style={{background:"#eff6ff",color:"#2563eb",border:"1px solid #bfdbfe",borderRadius:6,padding:"2px 10px",fontWeight:700,fontSize:11}}>Monitoring</span>
                        )}
                        {planRestrictions.allowedTools.includes("billing") && (
                          <span style={{background:"#f0fdf4",color:"#16a34a",border:"1px solid #bbf7d0",borderRadius:6,padding:"2px 10px",fontWeight:700,fontSize:11}}>Billing</span>
                        )}
                      </div>
                      {planRestrictions.maxUsers !== Infinity && (
                        <div style={{marginTop:6,color: users.length >= planRestrictions.maxUsers - 1 ? "#dc2626" : "#64748b"}}>
                          {planRestrictions.maxUsers - users.length} slot{planRestrictions.maxUsers - users.length !== 1 ? "s" : ""} remaining on {settings.currentPlan || "your plan"}
                        </div>
                      )}
                    </div>
                    <div style={{display:"flex",gap:10,marginTop:4}}>
                      <button className="ap-btn-primary" style={{flex:1,justifyContent:"center"}} onClick={handleCreate}>Create User</button>
                      <button className="ap-btn-ghost" onClick={closeModal}>Cancel</button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
}
