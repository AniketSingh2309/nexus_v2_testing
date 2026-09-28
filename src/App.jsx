import { useState, useEffect, useRef } from "react";
import { io as socketIO } from "socket.io-client";
import Landing from "./components/Landing.jsx";
import AuthPage from "./components/AuthPage.jsx";
import AdminPortal from "./components/AdminPortal.jsx";
import SuperAdminPortal from "./components/SuperAdminPortal.jsx";
import PricingPage from "./components/PricingPage.jsx";
import ActivationPage from "./components/ActivationPage.jsx";

/* ── Tunnel URL support (Cloudflare share mode) ────────────────────
   When share.ps1 is used, the main tunnel URL includes ?_murl=...
   &_burl=... params. We read them once on load and store in
   sessionStorage so they survive in-app navigation. Falls back to
   localhost for normal local development. */
{
  const _p = new URLSearchParams(window.location.search);
  const _m = _p.get('_murl');
  const _b = _p.get('_burl');
  if (_m) sessionStorage.setItem('cn_murl', _m);
  if (_b) sessionStorage.setItem('cn_burl', _b);
}
const _origin = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? `http://${window.location.hostname}`
  : `http://${window.location.hostname}`;
const MONITORING_BASE = sessionStorage.getItem('cn_murl') || `${_origin}:3007/monitor/`;
const BILLING_BASE    = sessionStorage.getItem('cn_burl') || `${_origin}:3008/billing/`;

/* ── Activity tracking (shared localStorage key with AdminPortal) ── */
const ACTIVITY_KEY = "cn_user_activity";

function _readActivity() {
  try { return JSON.parse(localStorage.getItem(ACTIVITY_KEY) || "{}"); } catch { return {}; }
}
function _writeActivity(data) {
  try { localStorage.setItem(ACTIVITY_KEY, JSON.stringify(data)); } catch {}
}
function recordLogin(email) {
  const data = _readActivity();
  data[email] = {
    ...(data[email] || {}),
    lastLogin:    Date.now(),
    sessionStart: Date.now(),
    lastSeen:     Date.now(),
    lastLogout:   null,
    lastSessionDuration: null,
    totalSessions: ((data[email]?.totalSessions) || 0) + 1,
  };
  _writeActivity(data);
}
function recordLogout(email, sessionStart) {
  const data     = _readActivity();
  const duration = sessionStart ? Date.now() - sessionStart : 0;
  data[email] = {
    ...(data[email] || {}),
    lastLogout:          Date.now(),
    lastSeen:            Date.now(),
    lastSessionDuration: duration,
  };
  _writeActivity(data);
}
function updateLastSeen(email) {
  const data = _readActivity();
  if (data[email]) { data[email].lastSeen = Date.now(); _writeActivity(data); }
}

const CLOUD_COLORS = { aws: '#FF9900', gcp: '#4285F4', azure: '#0078D4' };

function AccountSwitchToast({ toast, onClose, baseUrl }) {
  if (!toast) return null;
  const color = CLOUD_COLORS[toast.provider] || '#2563eb';
  return (
    <div style={{
      position: 'fixed', top: 20, right: 24, zIndex: 99999,
      background: '#0f172a', borderRadius: 14, padding: '14px 16px 14px 14px',
      display: 'flex', alignItems: 'flex-start', gap: 12,
      boxShadow: '0 8px 40px rgba(0,0,0,0.45), 0 2px 8px rgba(0,0,0,0.2)',
      border: '1px solid #1e293b',
      animation: 'cn-toast-in 0.4s cubic-bezier(0.34,1.56,0.64,1)',
      minWidth: 280, maxWidth: 340,
    }}>
      <style>{`@keyframes cn-toast-in{from{transform:translateX(calc(100% + 32px));opacity:0}to{transform:translateX(0);opacity:1}}`}</style>
      <div style={{ width: 36, height: 36, borderRadius: 9, background: color + '20', border: `1.5px solid ${color}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
        <img src={`${baseUrl}logos/${toast.provider}.svg`} alt={toast.provider} style={{ width: 20, height: 20, objectFit: 'contain' }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
          Account Switched
        </div>
        <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.5 }}>
          Admin switched your{' '}
          <span style={{ color, fontWeight: 700 }}>{toast.provider.toUpperCase()}</span>
          {' '}account to{' '}
          <span style={{ color: '#e2e8f0', fontWeight: 600 }}>"{toast.label}"</span>
        </div>
      </div>
      <button
        onClick={onClose}
        style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', padding: '2px 4px', fontSize: 18, lineHeight: 1, flexShrink: 0, marginLeft: 4 }}
      >×</button>
    </div>
  );
}

function RevokedOverlay({ onBack, reason }) {
  const kicked = reason === 'kicked';
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(7,17,31,0.93)',backdropFilter:'blur(6px)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
      <div style={{background:'#fff',borderRadius:20,padding:'40px 36px',maxWidth:420,width:'100%',textAlign:'center',boxShadow:'0 24px 64px rgba(0,0,0,0.3)'}}>
        <div style={{width:60,height:60,background:'#fee2e2',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px'}}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </div>
        <div style={{fontSize:20,fontWeight:800,color:'#0f172a',marginBottom:10,letterSpacing:'-0.4px'}}>{kicked ? 'Signed In Elsewhere' : 'Account Removed'}</div>
        <div style={{fontSize:14,color:'#64748b',lineHeight:1.6,marginBottom:28}}>
          {kicked
            ? <>Your account was just signed in on another device.<br />For security, only one device can be active at a time.</>
            : <>Your account has been removed by the administrator.<br />You no longer have access to MyCloudNexus.</>}
        </div>
        <button onClick={onBack} style={{display:'inline-block',background:'#2563eb',color:'#fff',fontSize:14,fontWeight:700,padding:'12px 32px',borderRadius:10,border:'none',cursor:'pointer',fontFamily:'inherit'}}>
          Back to Login
        </button>
      </div>
    </div>
  );
}

const CloudIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>
  </svg>
);

const ArrowRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
  </svg>
);

const AccountIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4"/>
    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
  </svg>
);

const LockIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);

const hubCss = `
.hub-page { min-height: 100vh; background: var(--bg); display: flex; flex-direction: column; }
.hub-header { background: var(--white); border-bottom: 1px solid var(--border); }
.hub-header-inner { max-width: 1200px; margin: 0 auto; padding: 0 32px; height: 68px; display: flex; align-items: center; justify-content: space-between; }
.hub-logo { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; color: var(--text); display: flex; align-items: center; gap: 3px; }
.hub-logo-icon { width: 32px; height: 32px; background: var(--blue-600); border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-right: 10px; }
.hub-logo span { color: var(--blue-600); }
.hub-user-row { display: flex; align-items: center; gap: 16px; }
.hub-avatar { width: 38px; height: 38px; border-radius: 10px; background: linear-gradient(135deg, #2563eb, #6366f1); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 15px; color: #fff; flex-shrink: 0; overflow: hidden; }
.hub-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
.hub-avatar-wrap { position: relative; width: 38px; height: 38px; flex-shrink: 0; cursor: pointer; }
.hub-avatar-wrap:hover .hub-avatar-overlay { opacity: 1; }
.hub-avatar-overlay { position: absolute; inset: 0; border-radius: 10px; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.18s; pointer-events: none; }
.hub-avatar-input { position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; height: 100%; }
.hub-user-info { display: flex; flex-direction: column; }
.hub-user-name { font-size: 14px; font-weight: 600; color: var(--text); line-height: 1.3; }
.hub-user-email { font-size: 12px; color: var(--text-muted); }
.hub-main { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 64px 32px; }
.hub-welcome { text-align: center; margin-bottom: 52px; }
.hub-welcome h1 { font-size: 38px; font-weight: 800; letter-spacing: -1.2px; color: var(--text); margin-bottom: 10px; }
.hub-welcome p { font-size: 16px; color: var(--text-secondary); }
.hub-cards { display: grid; gap: 24px; width: 100%; max-width: 860px; }
.hub-cards.two-col { grid-template-columns: 1fr 1fr; }
.hub-cards.one-col { grid-template-columns: 1fr; max-width: 440px; }
.hub-img-card { position: relative; border-radius: 18px; overflow: hidden; cursor: pointer; animation: solFloat 5s ease-in-out infinite; box-shadow: 0 16px 48px rgba(37,99,235,0.14), 0 4px 12px rgba(0,0,0,0.08); background: #f0f4ff; }
.hub-img-card:nth-child(2) { animation-delay: 1.2s; }
.hub-img-card img { width: 100%; height: auto; display: block; transition: transform 0.4s ease; object-fit: contain; }
.hub-img-card:hover img { transform: scale(1.025); }
.hub-img-fade { position: absolute; bottom: 0; left: 0; right: 0; height: 50%; background: linear-gradient(to bottom, transparent 0%, rgba(255,255,255,0.97) 80%, #fff 100%); pointer-events: none; }
.hub-img-cta { position: absolute; bottom: 20px; left: 24px; display: inline-flex; align-items: center; gap: 10px; background: #2563eb; color: #fff; font-size: 14px; font-weight: 700; font-family: inherit; padding: 12px 22px; border-radius: 10px; border: none; cursor: pointer; z-index: 3; box-shadow: 0 4px 16px rgba(37,99,235,0.35); transition: background 0.2s, transform 0.2s; }
.hub-img-cta:hover { background: #1d4ed8; transform: translateY(-2px); }
.hub-no-access { text-align: center; padding: 48px 32px; }
.hub-no-access-icon { margin-bottom: 16px; }
.hub-no-access h3 { font-size: 18px; font-weight: 700; color: #334155; margin-bottom: 8px; }
.hub-no-access p { font-size: 14px; color: #64748b; }
.hub-revoked-overlay { position:fixed; inset:0; background:rgba(7,17,31,0.92); backdrop-filter:blur(6px); z-index:9999; display:flex; align-items:center; justify-content:center; padding:24px; }
.hub-revoked-card { background:#fff; border-radius:20px; padding:40px 36px; max-width:420px; width:100%; text-align:center; box-shadow:0 24px 64px rgba(0,0,0,0.3); }
.hub-revoked-icon { width:60px; height:60px; background:#fee2e2; border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 20px; }
.hub-revoked-title { font-size:20px; font-weight:800; color:#0f172a; margin-bottom:10px; letter-spacing:-0.4px; }
.hub-revoked-sub { font-size:14px; color:#64748b; line-height:1.6; margin-bottom:28px; }
.hub-revoked-btn { display:inline-block; background:#2563eb; color:#fff; font-size:14px; font-weight:700; padding:12px 32px; border-radius:10px; border:none; cursor:pointer; font-family:inherit; transition:background 0.2s; }
.hub-revoked-btn:hover { background:#1d4ed8; }
@media (max-width: 640px) {
  .hub-cards.two-col { grid-template-columns: 1fr; max-width: 420px; }
  .hub-header-inner { padding: 0 20px; }
  .hub-user-info { display: none; }
  .hub-main { padding: 40px 20px; }
  .hub-welcome h1 { font-size: 28px; }
}
@keyframes cn-toast-in {
  from { transform: translateX(calc(100% + 32px)); opacity: 0; }
  to   { transform: translateX(0); opacity: 1; }
}
`;

const USER_PHOTO_KEY = (email) => `cn_user_photo_${email}`;

const PAGE_PATHS = {
  home:              "/",
  auth:              "/login",
  pricing:           "/pricing",
  hub:               "/hub",
  admin:             "/admin",
  monitoring:        "/monitoring",
  billing:           "/billing",
  "admin-monitoring": "/admin/monitoring",
  "admin-billing":    "/admin/billing",
  superadmin:        "/superadmin",
  activate:          "/activate",
};
const PATH_PAGES = Object.fromEntries(Object.entries(PAGE_PATHS).map(([k,v]) => [v, k]));

function navigate(setPage) {
  return (pg) => {
    window.scrollTo({ top: 0, behavior: "instant" });
    const path = PAGE_PATHS[pg] ?? `/${pg}`;
    window.history.pushState({ page: pg }, "", path);
    setPage(pg);
  };
}

export default function App() {
  const [_page, _setPage] = useState(() => {
    // Activation links take priority over any saved session
    if (window.location.pathname.endsWith("/activate")) return "activate";
    return PATH_PAGES[window.location.pathname] ?? "home";
  });
  const setPage = navigate(_setPage);
  const page = _page;
  const [user, setUser] = useState(null);
  const [userPhoto, setUserPhoto] = useState(null);
  const [sessionRevoked, setSessionRevoked] = useState(false);
  const [revokeReason, setRevokeReason] = useState(null);
  const [accountSwitchToast, setAccountSwitchToast] = useState(null); // {provider, label}
  const [iframeReloadKey, setIframeReloadKey] = useState(0);
  const [authTab, setAuthTab] = useState("login");

  const socketRef = useRef(null);

  // Connect socket once on mount
  useEffect(() => {
    const socket = socketIO(window.location.origin, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;
    return () => { socket.disconnect(); socketRef.current = null; };
  }, []);

  // Listen for session revocation via WebSocket (instant — replaces most of the polling)
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !user?.email) return;
    const myEmail = user.email.toLowerCase();
    const mySessionId = user.sessionId;
    function onRevoked({ email: revokedEmail, sessionId: winningSessionId, reason }) {
      if (!revokedEmail || revokedEmail.toLowerCase() !== myEmail) return;
      // A "kicked" event carries the sessionId of the device that just logged
      // in — if that's us, ignore it; otherwise we're the device being kicked.
      if (reason === 'kicked' && winningSessionId && winningSessionId === mySessionId) return;
      setRevokeReason(reason === 'kicked' ? 'kicked' : 'deleted');
      setSessionRevoked(true);
    }
    socket.on('session:revoked', onRevoked);
    return () => socket.off('session:revoked', onRevoked);
  }, [user?.email, user?.sessionId]); // eslint-disable-line

  // Real-time tool access updates — when admin changes plan, hub cards update instantly
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !user?.email) return;
    const myEmail = user.email.toLowerCase();
    function onToolsUpdated({ email: updatedEmail, tools }) {
      if (updatedEmail?.toLowerCase() === myEmail && Array.isArray(tools)) {
        setUser(prev => {
          if (!prev) return prev;
          const updated = { ...prev, tools };
          localStorage.setItem('cn_user', JSON.stringify(updated));
          return updated;
        });
      }
    }
    socket.on('tools:updated', onToolsUpdated);
    return () => socket.off('tools:updated', onToolsUpdated);
  }, [user?.email]); // eslint-disable-line

  // Admin switched a cloud account for this user → show toast + reload tool iframe
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !user?.email) return;
    const myEmail = user.email.toLowerCase();
    function onAccountSwitched({ email, provider, label }) {
      if (!email || email.toLowerCase() !== myEmail) return;
      setAccountSwitchToast({ provider, label });
      setIframeReloadKey(k => k + 1);
      setTimeout(() => setAccountSwitchToast(null), 4500);
    }
    socket.on('account:switched', onAccountSwitched);
    return () => socket.off('account:switched', onAccountSwitched);
  }, [user?.email]); // eslint-disable-line

  const SESSION_TTL = 2 * 24 * 60 * 60 * 1000;

  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem("cn_user"));
      if (s && s.loginTime && (Date.now() - s.loginTime) < SESSION_TTL) {
        setUser(s);
        const savedPhoto = localStorage.getItem(USER_PHOTO_KEY(s.email)) || null;
        setUserPhoto(savedPhoto);
        fetch(`/auth/photo/${encodeURIComponent(s.email)}`).then(r=>r.json()).then(d=>{ if(d.photo){ localStorage.setItem(USER_PHOTO_KEY(s.email), d.photo); setUserPhoto(d.photo); } }).catch(()=>{});
        // Don't hijack a deep-linked super-admin portal refresh — that portal
        // has its own independent login and isn't part of the regular user session.
        if (PATH_PAGES[window.location.pathname] !== 'superadmin') {
          setPage(s.isAdmin ? "admin" : "hub");
        }
      } else {
        localStorage.removeItem("cn_user");
      }
    } catch {}
  }, []);

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

  function handlePhotoUpload(e) {
    const file = e.target.files[0];
    if (!file || !user?.email) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const compressed = await _compressPhoto(ev.target.result);
      try { localStorage.setItem(USER_PHOTO_KEY(user.email), compressed); } catch {}
      setUserPhoto(compressed);
      fetch('/auth/photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, photo: compressed }),
      }).catch(() => {});
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  // Sync page state with browser back/forward
  useEffect(() => {
    function onPop(e) {
      const pg = e.state?.page ?? PATH_PAGES[window.location.pathname] ?? "home";
      _setPage(pg);
    }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // Ctrl+Shift+K → Core5 super admin portal
  useEffect(() => {
    function onKey(e) {
      if (e.ctrlKey && e.shiftKey && e.key === "K") { e.preventDefault(); setPage("superadmin"); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Bottom-left path indicator (browser-style status bar)
  useEffect(() => {
    let bar = document.getElementById("__cn_statusbar");
    if (!bar) {
      bar = document.createElement("div");
      bar.id = "__cn_statusbar";
      bar.style.cssText = [
        "position:fixed", "bottom:0", "left:0", "z-index:2147483647",
        "background:rgba(15,23,42,0.88)", "backdrop-filter:blur(6px)",
        "color:#e2e8f0", "font-size:12px", "font-family:ui-monospace,monospace",
        "padding:3px 12px 4px 10px", "border-top-right-radius:7px",
        "pointer-events:none", "max-width:50vw",
        "overflow:hidden", "text-overflow:ellipsis", "white-space:nowrap",
        "opacity:0", "transition:opacity 0.15s ease",
        "border-top:1px solid rgba(148,163,184,0.15)",
        "border-right:1px solid rgba(148,163,184,0.15)",
      ].join(";");
      document.body.appendChild(bar);
    }

    // Always show the real browser URL (updated by pushState above)
    bar.textContent = "mycloudnexus.com" + window.location.pathname;

    // Appear on move, disappear when cursor stops
    let idleTimer = null;
    function onMove() {
      bar.textContent = "mycloudnexus.com" + window.location.pathname;
      bar.style.opacity = "1";
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => { bar.style.opacity = "0"; }, 300);
    }

    window.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      clearTimeout(idleTimer);
    };
  }, [page]);

  // Heartbeat: update lastSeen every 30 s while user is in the hub
  useEffect(() => {
    if (page !== "hub" || !user?.email) return;
    updateLastSeen(user.email);
    const id = setInterval(() => updateLastSeen(user.email), 30000);
    return () => clearInterval(id);
  }, [page, user?.email]);

  // Poll for session revocation every 3 s while user is in the hub or using a tool
  useEffect(() => {
    if (!["hub", "monitoring", "billing", "admin-monitoring", "admin-billing"].includes(page) || !user?.email) return;
    const email = user.email.toLowerCase();
    const sessionId = user?.sessionId || '';

    const loginTime = user?.loginTime || 0;

    function checkLocal() {
      // Only honour a revocation that happened AFTER the user's current login.
      // This prevents stale revocations (from prior deletions) from blocking
      // a re-created user who has since logged in successfully.
      try {
        const revoked = JSON.parse(localStorage.getItem("cn_revoked_sessions") || "{}");
        const revokedAt = revoked[email];
        if (revokedAt && revokedAt > loginTime) { setRevokeReason('deleted'); setSessionRevoked(true); }
      } catch {}
    }

    async function checkBackend() {
      try {
        const res = await fetch(`/api/session-check?email=${encodeURIComponent(email)}&sessionId=${encodeURIComponent(sessionId)}`);
        const data = await res.json();
        // Only treat as revoked if the backend says invalid AND we have no loginTime
        // override — the DB-aware endpoint handles re-created users correctly.
        if (!data.valid) { setRevokeReason(data.reason === 'logged_in_elsewhere' ? 'kicked' : 'deleted'); setSessionRevoked(true); }
      } catch {}
    }

    function check() { checkLocal(); checkBackend(); }
    check();
    const id = setInterval(check, 3000);
    // React instantly when another tab changes either key
    function onStorage(e) {
      if (e.key === "cn_revoked_sessions") checkLocal();
    }
    window.addEventListener("storage", onStorage);
    return () => { clearInterval(id); window.removeEventListener("storage", onStorage); };
  }, [page, user?.email, user?.sessionId]); // eslint-disable-line

  function handleNavigate(pg) {
    if (pg === "auth:register") { setAuthTab("register"); setPage("auth"); return; }
    if (pg === "auth:login")    { setAuthTab("login");    setPage("auth"); return; }
    setPage(pg);
  }

  function handleRevokedRelogin() {
    try {
      const revoked = JSON.parse(localStorage.getItem("cn_revoked_sessions") || "{}");
      delete revoked[user?.email?.toLowerCase()];
      localStorage.setItem("cn_revoked_sessions", JSON.stringify(revoked));
    } catch {}
    localStorage.removeItem("cn_user");
    setSessionRevoked(false);
    setRevokeReason(null);
    setUser(null);
    setAuthTab("login");
    setPage("auth");
  }

  function handleLogin(userData) {
    // Clear any stale revocation for this email so a re-created user isn't locked out
    try {
      const revoked = JSON.parse(localStorage.getItem("cn_revoked_sessions") || "{}");
      delete revoked[userData.email.toLowerCase()];
      localStorage.setItem("cn_revoked_sessions", JSON.stringify(revoked));
    } catch {}
    setSessionRevoked(false);
    setRevokeReason(null);
    const sessionData = { ...userData, loginTime: Date.now() };
    localStorage.setItem("cn_user", JSON.stringify(sessionData));
    setUser(sessionData);
    const cachedPhoto = localStorage.getItem(USER_PHOTO_KEY(userData.email)) || null;
    setUserPhoto(cachedPhoto);
    fetch(`/auth/photo/${encodeURIComponent(userData.email)}`).then(r=>r.json()).then(d=>{ if(d.photo){ localStorage.setItem(USER_PHOTO_KEY(userData.email), d.photo); setUserPhoto(d.photo); } }).catch(()=>{});
    if (!userData.isAdmin) recordLogin(userData.email);
    setPage(userData.isAdmin ? "admin" : "hub");
    socketRef.current?.emit('user:online', { email: userData.email, name: userData.name });
  }

  function logout() {
    socketRef.current?.emit('user:offline', { email: user?.email });
    if (user && !user.isAdmin) recordLogout(user.email, user.loginTime);
    localStorage.removeItem("cn_user");
    setUser(null);
    setPage("home");
  }

  /* ── ACCOUNT ACTIVATION ── */
  if (page === "activate") {
    const token = new URLSearchParams(window.location.search).get("token") || "";
    return <ActivationPage token={token} onDone={() => { setAuthTab("login"); setPage("auth"); }} />;
  }

  /* ── SUPER ADMIN (Core5) ── */
  if (page === "superadmin") {
    return <SuperAdminPortal onBack={() => setPage("home")} />;
  }

  /* ── ADMIN PORTAL ── */
  if (page === "admin" && user?.isAdmin) {
    return <AdminPortal admin={user} onLogout={logout} onOpenTool={(tool) => setPage(`admin-${tool}`)} onPhotoChange={setUserPhoto} />;
  }

  /* ── ADMIN TOOL PAGES ── */
  if ((page === "admin-monitoring" || page === "admin-billing") && user?.isAdmin) {
    const tool       = page === "admin-monitoring" ? "monitoring" : "billing";
    const toolLabel  = tool === "monitoring" ? "Monitoring" : "Billing";
    const toolUrl    = tool === "monitoring"
      ? `${MONITORING_BASE}?uid=${encodeURIComponent(user.email)}&name=${encodeURIComponent(user.name || '')}&sid=${encodeURIComponent(user.sessionId || '')}`
      : `${BILLING_BASE}?uid=${encodeURIComponent(user.email)}&name=${encodeURIComponent(user.name || '')}&sid=${encodeURIComponent(user.sessionId || '')}`;
    return (
      <div style={{ position: "fixed", inset: 0, display: "flex", flexDirection: "column" }}>
        <div style={{ height: 52, background: "#0f172a", display: "flex", alignItems: "center", padding: "0 20px", gap: 16, flexShrink: 0, borderBottom: "1px solid #1e293b" }}>
          <button
            onClick={() => setPage("admin")}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "1px solid #334155", color: "#94a3b8", padding: "6px 14px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", fontFamily: "inherit" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            Back to Admin Portal
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 28, height: 28, background: "#2563eb", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>
            </div>
            <span style={{ color: "#fff", fontWeight: 700, fontSize: 15, letterSpacing: "-0.01em" }}>MyCloud<span style={{ color: "#60a5fa" }}>Nexus</span></span>
          </div>
          <span style={{ color: "#334155", fontSize: 16 }}>|</span>
          <span style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 500 }}>{toolLabel}</span>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", overflow: "hidden", background: "#1e293b", border: "2px solid #334155", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {userPhoto
                ? <img src={userPhoto} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              }
            </div>
            <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
              <span style={{ color: "#f1f5f9", fontSize: 13, fontWeight: 600 }}>{user.name}</span>
              <span style={{ color: "#64748b", fontSize: 11 }}>{user.email}</span>
            </div>
            <button
              onClick={logout}
              style={{ marginLeft: 4, background: "none", border: "1px solid #334155", color: "#94a3b8", padding: "5px 12px", borderRadius: 7, cursor: "pointer", fontSize: 12, fontWeight: 500, fontFamily: "inherit" }}
            >
              Sign out
            </button>
          </div>
        </div>
        <iframe
          src={toolUrl}
          style={{ flex: 1, border: "none", width: "100%" }}
          title={toolLabel}
          allow="clipboard-read; clipboard-write"
        />
      </div>
    );
  }

  /* ── HUB ── */
  if (page === "hub" && user) {
    const firstName = user.name?.split(" ")[0] || "there";
    // Default: both tools if no tools array (e.g. legacy backend users)
    const tools = Array.isArray(user.tools) ? user.tools : ["monitoring", "billing"];
    const hasMonitoring = tools.includes("monitoring");
    const hasBilling    = tools.includes("billing");
    const cardCount     = (hasMonitoring ? 1 : 0) + (hasBilling ? 1 : 0);

    return (
      <>
        <style>{hubCss}</style>
        <AccountSwitchToast toast={accountSwitchToast} onClose={() => setAccountSwitchToast(null)} baseUrl={import.meta.env.BASE_URL} />

        {/* Session revoked overlay — blocks all interaction */}
        {sessionRevoked && <RevokedOverlay onBack={handleRevokedRelogin} reason={revokeReason} />}

        <div className="hub-page" style={sessionRevoked ? {pointerEvents:"none",userSelect:"none"} : {}}>

          <header className="hub-header">
            <div className="hub-header-inner">
              <div className="hub-logo">
                <div className="hub-logo-icon"><CloudIcon /></div>
                MyCloud<span>Nexus</span>
              </div>
              <div className="hub-user-row">
                <label className="hub-avatar-wrap" title="Click to change profile photo">
                  <div className="hub-avatar">
                    {userPhoto
                      ? <img src={userPhoto} alt="profile" />
                      : <AccountIcon />}
                  </div>
                  <div className="hub-avatar-overlay">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                  </div>
                  <input type="file" accept="image/*" className="hub-avatar-input" onChange={handlePhotoUpload} />
                </label>
                <div className="hub-user-info">
                  <span className="hub-user-name">{user.name}</span>
                  <span className="hub-user-email">{user.email}</span>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={logout}>Sign out</button>
              </div>
            </div>
          </header>

          <main className="hub-main">
            <div className="hub-welcome">
              <h1>Welcome back, {firstName}</h1>
              <p>{cardCount > 0 ? "Select a product to continue" : "Contact your administrator to request tool access"}</p>
            </div>

            {cardCount === 0 ? (
              <div className="hub-no-access">
                <div className="hub-no-access-icon"><LockIcon /></div>
                <h3>No tools assigned</h3>
                <p>Your account has not been granted access to any tools yet.<br />Please contact your administrator.</p>
              </div>
            ) : (
              <div className={`hub-cards ${cardCount === 2 ? "two-col" : "one-col"}`}>
                {hasMonitoring && (
                  <div className="hub-img-card" onClick={() => setPage("monitoring")}>
                    <img src={`${import.meta.env.BASE_URL}images/card-monitoring.png`} alt="Monitoring" />
                    <div className="hub-img-fade" />
                    <button className="hub-img-cta">Go to Monitoring <ArrowRight /></button>
                  </div>
                )}
                {hasBilling && (
                  <div className="hub-img-card" onClick={() => setPage("billing")}>
                    <img src={`${import.meta.env.BASE_URL}images/card-billing.png`} alt="Billing" />
                    <div className="hub-img-fade" />
                    <button className="hub-img-cta">Go to Billing <ArrowRight /></button>
                  </div>
                )}
              </div>
            )}
          </main>

        </div>{/* hub-page */}
      </>
    );
  }

  /* ── TOOL IFRAME PAGES ── */
  if (page === "monitoring" || page === "billing") {
    const toolUrl = page === "monitoring"
      ? `${MONITORING_BASE}?uid=${encodeURIComponent(user.email)}&name=${encodeURIComponent(user.name || '')}&sid=${encodeURIComponent(user.sessionId || '')}`
      : `${BILLING_BASE}?uid=${encodeURIComponent(user.email)}&name=${encodeURIComponent(user.name || '')}&sid=${encodeURIComponent(user.sessionId || '')}`;
    const toolLabel = page === "monitoring" ? "Monitoring" : "Billing";
    return (
      <div style={{ position: "fixed", inset: 0, display: "flex", flexDirection: "column" }}>
        <AccountSwitchToast toast={accountSwitchToast} onClose={() => setAccountSwitchToast(null)} baseUrl={import.meta.env.BASE_URL} />
        {sessionRevoked && <RevokedOverlay onBack={handleRevokedRelogin} reason={revokeReason} />}
        <div style={{ height: 52, background: "#0f172a", display: "flex", alignItems: "center", padding: "0 20px", gap: 16, flexShrink: 0, borderBottom: "1px solid #1e293b" }}>
          <button
            onClick={() => setPage("hub")}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "1px solid #334155", color: "#94a3b8", padding: "6px 14px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 500, whiteSpace: "nowrap" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            Back to Hub
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 28, height: 28, background: "#2563eb", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>
            </div>
            <span style={{ color: "#fff", fontWeight: 700, fontSize: 15, letterSpacing: "-0.01em" }}>MyCloud<span style={{ color: "#60a5fa" }}>Nexus</span></span>
          </div>
          <span style={{ color: "#334155", fontSize: 16 }}>|</span>
          <span style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 500 }}>{toolLabel}</span>

          {/* User profile — pushed to the right */}
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", overflow: "hidden", background: "#1e293b", border: "2px solid #334155", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {userPhoto
                ? <img src={userPhoto} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              }
            </div>
            <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
              <span style={{ color: "#f1f5f9", fontSize: 13, fontWeight: 600 }}>{user.name}</span>
              <span style={{ color: "#64748b", fontSize: 11 }}>{user.email}</span>
            </div>
            <button
              onClick={logout}
              style={{ marginLeft: 4, background: "none", border: "1px solid #334155", color: "#94a3b8", padding: "5px 12px", borderRadius: 7, cursor: "pointer", fontSize: 12, fontWeight: 500 }}
            >
              Sign out
            </button>
          </div>
        </div>
        <iframe
          key={iframeReloadKey}
          src={toolUrl}
          style={{ flex: 1, border: "none", width: "100%" }}
          title={toolLabel}
          allow="clipboard-read; clipboard-write"
        />
      </div>
    );
  }

  /* ── AUTH ── */
  if (page === "auth") {
    return <AuthPage initialTab={authTab} onLogin={handleLogin} onBack={() => setPage("home")} />;
  }

  /* ── MARKETING PAGES ── */
  if (page === "pricing")  return <PricingPage  onNavigate={handleNavigate} />;

  /* ── HOME ── */
  return <Landing onNavigate={handleNavigate} />;
}
