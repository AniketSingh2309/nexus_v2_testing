import { useState, useEffect, useCallback, useRef } from "react";
import { io as socketIO } from "socket.io-client";

function genPassword() {
  const up  = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lo  = "abcdefghjkmnpqrstuvwxyz";
  const dig = "23456789";
  const sp  = "!@#$";
  const all = up + lo + dig + sp;
  let p = up[~~(Math.random()*up.length)] + lo[~~(Math.random()*lo.length)]
         + dig[~~(Math.random()*dig.length)] + sp[~~(Math.random()*sp.length)];
  for (let i = 4; i < 14; i++) p += all[~~(Math.random()*all.length)];
  return p.split("").sort(() => Math.random()-0.5).join("");
}

function planColor(plan) {
  if (!plan) return { bg:"#f1f5f9", color:"#64748b", label:"No Plan" };
  const p = plan.toLowerCase();
  if (p.includes("scale") || p.includes("enterprise")) return { bg:"#fef3c7", color:"#92400e", label: plan };
  if (p.includes("growth") || p.includes("pro"))       return { bg:"#dbeafe", color:"#1d4ed8", label: plan };
  if (p.includes("billing"))                            return { bg:"#fce7f3", color:"#9d174d", label: plan };
  if (p.includes("starter") || p.includes("basic"))    return { bg:"#dcfce7", color:"#166534", label: plan };
  return { bg:"#ede9fe", color:"#5b21b6", label: plan };
}

function copyText(text) {
  navigator.clipboard?.writeText(text).catch(() => {
    const el = document.createElement("textarea");
    el.value = text; document.body.appendChild(el); el.select();
    document.execCommand("copy"); document.body.removeChild(el);
  });
}

export default function SuperAdminPortal({ onBack }) {
  /* ── Auth ── */
  const [authed,      setAuthed]     = useState(() => !!sessionStorage.getItem("cn_sa_token"));
  const [loginEmail,  setLE]         = useState("");
  const [loginPass,   setLP]         = useState("");
  const [loginErr,    setLErr]       = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Helper: include SA token on every backend call; auto-logout if session expires
  async function saFetch(url, opts = {}) {
    const token = sessionStorage.getItem("cn_sa_token") || "";
    const headers = { ...(opts.headers || {}), "x-sa-token": token };
    const res = await fetch(url, { ...opts, headers });
    if (res.status === 401) {
      sessionStorage.removeItem("cn_sa_token");
      setAuthed(false);
    }
    return res;
  }

  async function handleLogin() {
    const emailVal = loginEmail.trim();
    const passVal  = loginPass;
    if (!emailVal || !passVal) { setLErr("Enter email and password."); return; }
    setLoginLoading(true); setLErr("");
    try {
      const res  = await fetch("/superadmin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailVal, password: passVal }),
      });
      const data = await res.json();
      if (!res.ok) { setLErr(data.error || "Invalid credentials."); }
      else {
        sessionStorage.setItem("cn_sa_token", data.token);
        setAuthed(true);
      }
    } catch { setLErr("Cannot reach the server. Is the backend running?"); }
    setLoginLoading(false);
  }

  function logout() { sessionStorage.removeItem("cn_sa_token"); setAuthed(false); }

  /* ── Settings ── */
  const [settings,     setSettings]     = useState({ uniqueDomains: true });
  const [showSettings, setShowSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  const fetchSettings = useCallback(() => {
    saFetch("/superadmin/settings")
      .then(r => r.json())
      .then(d => { if (d && !d.error) setSettings(d); })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function toggleUniqueDomains() {
    const next = { ...settings, uniqueDomains: !settings.uniqueDomains };
    setSettings(next);
    setSavingSettings(true);
    try {
      await saFetch("/superadmin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
    } catch {}
    setSavingSettings(false);
  }

  useEffect(() => { if (authed) fetchSettings(); }, [authed, fetchSettings]);

  /* ── Data ── */
  const [admins,  setAdmins]  = useState([]);
  const [loading, setLoading] = useState(false);
  const [expanded,  setExpanded]  = useState(null);
  const [deleting,      setDeleting]      = useState(null);
  const [confirmDel,    setConfirmDel]    = useState(null);
  const [confirmCancel, setConfirmCancel] = useState(null);
  const [cancelling,    setCancelling]    = useState(null);

  async function handleCancelPlan(email) {
    setCancelling(email);
    await saFetch(`/superadmin/admins/${encodeURIComponent(email)}/plan`, { method: 'DELETE' });
    setConfirmCancel(null); setCancelling(null); fetchAdmins();
  }

  async function handleDelete(email) {
    setDeleting(email);
    try {
      await saFetch(`/superadmin/admins/${encodeURIComponent(email)}`, { method: "DELETE" });
      setConfirmDel(null);
      setExpanded(e => e === email ? null : e);
      fetchAdmins();
    } catch {}
    setDeleting(null);
  }

  const fetchAdmins = useCallback(() => {
    setLoading(true);
    saFetch("/superadmin/admins")
      .then(r => r.json())
      .then(d => { setAdmins(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!authed) return;
    fetchAdmins();
    const id = setInterval(fetchAdmins, 30000);
    return () => clearInterval(id);
  }, [authed, fetchAdmins]);

  /* ── Create Admin ── */
  const [showModal, setShowModal] = useState(false);
  const [formStep, setFormStep]   = useState(1);
  const [form, setForm]           = useState({ name:"", email:"", passType:"auto", password: genPassword(), companyName:"", subdomain:"", industry:"", country:"", timezone:"" });
  const [creating, setCreating]   = useState(false);
  const [result,   setResult]     = useState(null);
  const [createErr, setCreateErr] = useState("");
  const [copied, setCopied]       = useState("");

  /* ── Activation Link ── */
  const [sendTo,       setSendTo]       = useState("");
  const [sendingLink,  setSendingLink]  = useState(false);
  const [linkSent,     setLinkSent]     = useState(false);
  const [linkErr,      setLinkErr]      = useState("");

  async function handleSendActivation() {
    if (!sendTo.trim()) { setLinkErr("Enter an email address."); return; }
    setSendingLink(true); setLinkErr(""); setLinkSent(false);
    try {
      const r = await saFetch("/superadmin/send-activation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminEmail: result.email, sendTo: sendTo.trim() }),
      });
      const d = await r.json();
      if (!r.ok) { setLinkErr(d.error || "Failed to send."); }
      else { setLinkSent(true); }
    } catch { setLinkErr("Network error."); }
    setSendingLink(false);
  }

  function openModal() {
    setForm({ name:"", email:"", passType:"auto", password: genPassword(), companyName:"", subdomain:"", industry:"", country:"", timezone:"" });
    setFormStep(1);
    setResult(null); setCreateErr(""); setSendTo(""); setLinkSent(false); setLinkErr(""); setShowModal(true);
  }

  async function handleCreate() {
    const { name, email, passType, password } = form;
    if (!name.trim() || !email.trim()) { setCreateErr("Name and email are required."); return; }
    if (passType === "manual" && !password.trim()) { setCreateErr("Enter a password."); return; }
    const finalPwd = passType === "auto" ? form.password : password;
    setCreating(true); setCreateErr("");
    try {
      const res = await saFetch("/superadmin/create-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim().toLowerCase(), password: finalPwd, companyName: form.companyName.trim(), subdomain: form.subdomain.trim(), domain: form.subdomain.trim(), industry: form.industry, country: form.country.trim(), timezone: form.timezone }),
      });
      const data = await res.json();
      if (!res.ok) { setCreateErr(data.error || "Failed to create admin."); }
      else {
        const finalEmail = email.trim().toLowerCase();
        setResult({ email: finalEmail, password: finalPwd });
        setSendTo(finalEmail);
        setLinkSent(false); setLinkErr("");
        fetchAdmins();
      }
    } catch { setCreateErr("Network error — is the backend running?"); }
    setCreating(false);
  }

  function doCopy(text, key) {
    copyText(text); setCopied(key);
    setTimeout(() => setCopied(""), 2000);
  }

  /* ── WebSocket ── */
  const socketRef    = useRef(null);
  const [wsLive, setWsLive] = useState(false);

  useEffect(() => {
    if (!authed) return;
    const socket = socketIO(window.location.origin, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;
    socket.on('connect',       () => setWsLive(true));
    socket.on('disconnect',    () => setWsLive(false));
    socket.on('admin:created', () => fetchAdmins());
    socket.on('admin:deleted', () => fetchAdmins());
    socket.on('admin:updated', () => fetchAdmins());
    socket.on('plan:cancelled',() => fetchAdmins());
    socket.on('plan:updated',  () => fetchAdmins());
    return () => { socket.disconnect(); socketRef.current = null; };
  }, [authed, fetchAdmins]);

  /* ── Live per-second tick for countdowns ── */
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!authed) return;
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, [authed]);

  function planCountdown(planPurchasedAt) {
    if (!planPurchasedAt) return null;
    const msLeft = Math.max(0, Number(planPurchasedAt) + 365 * 86400000 - Date.now());
    if (msLeft === 0) return { label: "Expired", urgent: true, days: 0 };
    const days = Math.floor(msLeft / 86400000);
    const hrs  = Math.floor((msLeft % 86400000) / 3600000);
    const mins = Math.floor((msLeft % 3600000)  / 60000);
    const secs = Math.floor((msLeft % 60000)    / 1000);
    const pad  = n => String(n).padStart(2, "0");
    return {
      label:   `${days}d  ${pad(hrs)}:${pad(mins)}:${pad(secs)}`,
      urgent:  days <= 7,
      warning: days <= 30,
      days,
    };
  }

  /* ── Totals ── */
  const totalUsers = admins.reduce((s, a) => s + (a.users?.length || 0), 0);
  const withPlan   = admins.filter(a => a.plan).length;

  /* ══════════════════════════════════════════════════════════════════════════
     LOGIN
  ══════════════════════════════════════════════════════════════════════════ */
  if (!authed) {
    return (
      <div style={styles.loginPage}>
        <div style={styles.loginCard}>
          <div style={styles.loginLogo}>
            <div style={styles.loginLogoIcon}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
              </svg>
            </div>
            <span style={{fontSize:20,fontWeight:800,color:"#0f172a",letterSpacing:"-0.4px"}}>Core5 Portal</span>
          </div>
          <h2 style={{fontSize:22,fontWeight:800,margin:"0 0 4px",color:"#0f172a"}}>Admin access</h2>
          <p style={{color:"#64748b",fontSize:14,margin:"0 0 28px"}}>Sign in to manage all MyCloudNexus accounts.</p>

          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input style={styles.input} type="email" placeholder="core5@core5.co.in"
              value={loginEmail} onChange={e=>setLE(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&handleLogin()} autoFocus />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input style={styles.input} type="password" placeholder="••••••••"
              value={loginPass} onChange={e=>setLP(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&handleLogin()} />
          </div>
          {loginErr && <div style={styles.errBox}>{loginErr}</div>}
          <button style={styles.btnPrimary} onClick={handleLogin} disabled={loginLoading}>
            {loginLoading ? "Signing in…" : "Sign In"}
          </button>
          <button style={styles.btnBack} onClick={onBack}>← Back to home</button>
        </div>
      </div>
    );
  }

  /* ══════════════════════════════════════════════════════════════════════════
     DASHBOARD
  ══════════════════════════════════════════════════════════════════════════ */
  return (
    <div style={styles.page}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={styles.loginLogoIcon}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
              </svg>
            </div>
            <span style={{fontWeight:800,fontSize:17,color:"#0f172a",letterSpacing:"-0.3px"}}>Core5 Super Admin</span>
          </div>
          <div style={{display:"flex",gap:10,alignItems:"center"}}>
            {wsLive && (
              <span style={{fontSize:12,fontWeight:700,color:"#22c55e",letterSpacing:1,display:"flex",alignItems:"center",gap:4}}>
                <span style={{width:7,height:7,borderRadius:"50%",background:"#22c55e",display:"inline-block"}}/>
                LIVE
              </span>
            )}
            <button style={styles.btnOutline} onClick={fetchAdmins}>
              {loading ? "Refreshing…" : "↺ Refresh"}
            </button>
            <button style={styles.btnOutline} onClick={() => setShowSettings(true)} title="Settings">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{verticalAlign:"middle",marginRight:5}}>
                <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
              Settings
            </button>
            <button style={styles.btnPrimary} onClick={openModal}>+ Create Admin</button>
            <button style={styles.btnBack} onClick={logout}>Sign out</button>
          </div>
        </div>
      </header>

      <main style={styles.main}>
        {/* Stats */}
        <div style={styles.statsRow}>
          {[
            { label:"Total Admins",   value: admins.length },
            { label:"Total Users",    value: totalUsers    },
            { label:"On a Plan",      value: withPlan      },
            { label:"Demo / Trial",   value: admins.filter(a => a.demoExpiresAt || a.coldPeriodEndsAt).length },
          ].map(s => (
            <div key={s.label} style={styles.statCard}>
              <div style={styles.statVal}>{s.value}</div>
              <div style={styles.statLabel}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Admin cards */}
        <div style={styles.sectionTitle}>
          All Admin Accounts
          <span style={{fontSize:12,color:"#94a3b8",fontWeight:500,marginLeft:8}}>auto-refreshes every 30 s</span>
        </div>

        {admins.length === 0 && !loading && (
          <div style={styles.emptyState}>No admins found. Create one to get started.</div>
        )}

        <div style={styles.cardGrid}>
          {admins.map(adm => {
            const pc    = planColor(adm.plan);
            const isExp    = expanded === adm.adminEmail;
            const init     = (adm.adminName || adm.adminEmail).charAt(0).toUpperCase();
            const countdown = adm.plan ? planCountdown(adm.planPurchasedAt) : null;
            return (
              <div key={adm.adminEmail} style={styles.card}>
                {/* Card header */}
                <div style={styles.cardHeader}>
                  {adm.adminPhoto
                    ? <img src={adm.adminPhoto} alt="" style={{width:42,height:42,borderRadius:10,objectFit:"cover",flexShrink:0,display:"block"}} />
                    : <div style={styles.avatar}>{init}</div>
                  }
                  <div style={{flex:1,minWidth:0}}>
                    <div style={styles.adminName}>{adm.adminName}</div>
                    <div style={styles.adminEmail}>{adm.adminEmail}</div>
                    {adm.companyName && (
                      <div style={{fontSize:11,color:"#94a3b8",marginTop:2}}>
                        {[adm.companyName, adm.industry, adm.country].filter(Boolean).join(" · ")}
                      </div>
                    )}
                    {adm.domain && (
                      <span style={{fontSize:10,fontFamily:"monospace",background:"#f1f5f9",borderRadius:4,padding:"1px 6px",display:"inline-block",marginTop:3,color:"#64748b"}}>
                        {adm.domain}
                      </span>
                    )}
                  </div>
                  <span style={{...styles.planBadge, background:pc.bg, color:pc.color}}>{pc.label}</span>
                  <button
                    style={styles.deleteBtn}
                    title="Delete admin and all their users"
                    onClick={() => setConfirmDel(adm.adminEmail)}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                    </svg>
                  </button>
                </div>

                {/* Sub-admins row */}
                {adm.subAdmins?.length > 0 && (
                  <div style={{display:"flex",flexWrap:"wrap",gap:6,padding:"8px 0 4px",borderBottom:"1px solid #1e293b",marginBottom:4}}>
                    <span style={{fontSize:11,fontWeight:700,color:"#64748b",letterSpacing:.5,alignSelf:"center"}}>CO-ADMINS</span>
                    {adm.subAdmins.map(sa => (
                      <span key={sa.email} style={{fontSize:11,fontWeight:600,color:"#a78bfa",background:"#1e1b4b",border:"1px solid #4c1d95",borderRadius:20,padding:"2px 10px",display:"flex",alignItems:"center",gap:4}}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                        {sa.name || sa.email}
                      </span>
                    ))}
                  </div>
                )}

                {/* Card meta */}
                <div style={styles.cardMeta}>
                  <span style={styles.metaItem}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                    {adm.users?.length || 0} user{adm.users?.length !== 1 ? "s" : ""}
                    {adm.subAdmins?.length > 0 && <span style={{color:"#a78bfa",marginLeft:4}}>+{adm.subAdmins.length} co-admin{adm.subAdmins.length !== 1 ? "s" : ""}</span>}
                  </span>
                  <span style={styles.metaItem}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    {adm.createdAt ? new Date(adm.createdAt).toLocaleDateString() : "—"}
                  </span>
                  <span style={styles.metaItem}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                    {adm.logCount || 0} logs
                  </span>
                </div>

                {/* Plan countdown + cancel */}
                {adm.plan && (
                  <div style={{...styles.countdownRow, gap:10}}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}>
                      <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
                    </svg>
                    <span style={{fontSize:12,color:"#64748b",flexShrink:0}}>Time left:</span>
                    {countdown ? (
                      <span style={{
                        fontFamily:"monospace", fontWeight:700, fontSize:13,
                        letterSpacing:"0.5px", fontVariantNumeric:"tabular-nums",
                        color: countdown.urgent ? "#dc2626" : countdown.warning ? "#d97706" : "#16a34a",
                      }}>
                        {countdown.label}
                      </span>
                    ) : (
                      <span style={{fontSize:12,color:"#94a3b8",fontStyle:"italic"}}>syncing… (ask admin to open their portal)</span>
                    )}
                    <button
                      style={{...styles.planActionBtn("#dc2626","#fef2f2","#fecaca"), marginLeft:"auto"}}
                      onClick={() => setConfirmCancel(adm.adminEmail)}
                    >
                      ✕ Cancel Plan
                    </button>
                  </div>
                )}

                {/* Demo / Cold period countdown */}
                {adm.demoExpiresAt && adm.demoExpiresAt > Date.now() && (() => {
                  const msLeft = Math.max(0, adm.demoExpiresAt - Date.now());
                  const mins = Math.floor(msLeft / 60000);
                  const secs = Math.floor((msLeft % 60000) / 1000);
                  return (
                    <div style={{...styles.countdownRow, background:"#eff6ff", borderTop:"1px solid #bfdbfe"}}>
                      <span style={{fontSize:10,fontWeight:700,background:"#2563eb",color:"#fff",padding:"2px 8px",borderRadius:20,flexShrink:0}}>DEMO</span>
                      <span style={{fontFamily:"monospace",fontWeight:700,fontSize:13,fontVariantNumeric:"tabular-nums",color:"#1d4ed8"}}>
                        {mins}:{String(secs).padStart(2,"0")} remaining
                      </span>
                    </div>
                  );
                })()}
                {adm.coldPeriodEndsAt && adm.coldPeriodEndsAt > Date.now() && (() => {
                  const msLeft = Math.max(0, adm.coldPeriodEndsAt - Date.now());
                  const hrs  = Math.floor(msLeft / 3600000);
                  const mins = Math.floor((msLeft % 3600000) / 60000);
                  const secs = Math.floor((msLeft % 60000)   / 1000);
                  return (
                    <div style={{...styles.countdownRow, background:"#fffbeb", borderTop:"1px solid #fde68a"}}>
                      <span style={{fontSize:10,fontWeight:700,background:"#d97706",color:"#fff",padding:"2px 8px",borderRadius:20,flexShrink:0}}>COLD PERIOD</span>
                      <span style={{fontFamily:"monospace",fontWeight:700,fontSize:13,fontVariantNumeric:"tabular-nums",color:"#92400e"}}>
                        {hrs}h {String(mins).padStart(2,"0")}:{String(secs).padStart(2,"0")} until deletion
                      </span>
                    </div>
                  );
                })()}
                {adm.coldPeriodEndsAt && adm.coldPeriodEndsAt <= Date.now() && (
                  <div style={{...styles.countdownRow, background:"#fef2f2", borderTop:"1px solid #fecaca"}}>
                    <span style={{fontSize:10,fontWeight:700,background:"#dc2626",color:"#fff",padding:"2px 8px",borderRadius:20,flexShrink:0}}>EXPIRED</span>
                    <span style={{fontFamily:"monospace",fontWeight:700,fontSize:13,color:"#dc2626"}}>Pending deletion</span>
                  </div>
                )}

                {/* Expand users */}
                <button
                  style={styles.expandBtn}
                  onClick={() => setExpanded(isExp ? null : adm.adminEmail)}
                >
                  {isExp ? "▲ Hide users" : `▼ Show users (${adm.users?.length || 0})`}
                </button>

                {isExp && (
                  <div style={styles.userTable}>
                    {(!adm.users || adm.users.length === 0) ? (
                      <div style={{padding:"16px",color:"#94a3b8",fontSize:13,textAlign:"center"}}>No users yet</div>
                    ) : (
                      <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                        <thead>
                          <tr style={{background:"#f8fafc"}}>
                            {["Name","Email","Tools","Created"].map(h => (
                              <th key={h} style={styles.th}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {adm.users.map((u, i) => {
                            const uInit = (u.name || u.email || "?").charAt(0).toUpperCase();
                            return (
                              <tr key={u.email} style={{background: i%2?"#f8fafc":"#fff"}}>
                                <td style={styles.td}>
                                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                                    {u.photo
                                      ? <img src={u.photo} alt="" style={{width:26,height:26,borderRadius:7,objectFit:"cover",flexShrink:0,display:"block"}} />
                                      : <div style={{width:26,height:26,borderRadius:7,background:"linear-gradient(135deg,#6366f1,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700,fontSize:11,flexShrink:0}}>{uInit}</div>
                                    }
                                    {u.name}
                                  </div>
                                </td>
                                <td style={{...styles.td, color:"#2563eb"}}>{u.email}</td>
                                <td style={styles.td}>
                                  {(Array.isArray(u.tools) ? u.tools : ["monitoring","billing"]).map(t => (
                                    <span key={t} style={styles.toolBadge}>{t}</span>
                                  ))}
                                </td>
                                <td style={styles.td}>
                                  {u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>

      {/* ── Confirm Cancel Plan Modal ── */}
      {confirmCancel && (
        <div style={styles.overlay} onClick={e => e.target === e.currentTarget && setConfirmCancel(null)}>
          <div style={{...styles.modal, maxWidth:380}}>
            <div style={styles.modalHeader}>
              <span style={{fontWeight:800,fontSize:16,color:"#d97706"}}>Cancel Plan</span>
              <button style={styles.closeBtn} onClick={() => setConfirmCancel(null)}>✕</button>
            </div>
            <div style={{padding:"16px 24px 24px"}}>
              <div style={{background:"#fffbeb",border:"1.5px solid #fde68a",borderRadius:10,padding:"14px 16px",marginBottom:18,fontSize:13,color:"#78350f",lineHeight:1.6}}>
                Cancelling the plan for <strong>{confirmCancel}</strong> will:<br />
                • Remove their active plan immediately<br />
                • Reset the countdown timer to zero<br />
                • The admin will lose tool access based on plan<br /><br />
                They can re-purchase a plan at any time.
              </div>
              <div style={{display:"flex",gap:10}}>
                <button style={{...styles.btnOutline,flex:1}} onClick={() => setConfirmCancel(null)}>Keep Plan</button>
                <button
                  style={{...styles.btnPrimary,flex:1,background:"#d97706"}}
                  onClick={() => handleCancelPlan(confirmCancel)}
                  disabled={cancelling === confirmCancel}
                >
                  {cancelling === confirmCancel ? "Cancelling…" : "Yes, Cancel Plan"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm Delete Modal ── */}
      {confirmDel && (
        <div style={styles.overlay} onClick={e => e.target === e.currentTarget && setConfirmDel(null)}>
          <div style={{...styles.modal, maxWidth:380}}>
            <div style={styles.modalHeader}>
              <span style={{fontWeight:800,fontSize:16,color:"#dc2626"}}>Delete Admin</span>
              <button style={styles.closeBtn} onClick={() => setConfirmDel(null)}>✕</button>
            </div>
            <div style={{padding:"16px 24px 24px"}}>
              <div style={{background:"#fef2f2",border:"1.5px solid #fecaca",borderRadius:10,padding:"14px 16px",marginBottom:18,fontSize:13,color:"#7f1d1d",lineHeight:1.6}}>
                <strong>This will permanently delete:</strong><br />
                • Admin account <strong>{confirmDel}</strong><br />
                • All users under this admin<br />
                • All logs for this org<br /><br />
                This action cannot be undone.
              </div>
              <div style={{display:"flex",gap:10}}>
                <button style={{...styles.btnOutline,flex:1}} onClick={() => setConfirmDel(null)}>Cancel</button>
                <button
                  style={{...styles.btnPrimary,flex:1,background:"#dc2626"}}
                  onClick={() => handleDelete(confirmDel)}
                  disabled={deleting === confirmDel}
                >
                  {deleting === confirmDel ? "Deleting…" : "Yes, Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Create Admin Modal ── */}
      {showModal && (
        <div style={styles.overlay} onClick={e => e.target === e.currentTarget && !result && setShowModal(false)}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <span style={{fontWeight:800,fontSize:17,color:"#0f172a"}}>
                {result ? "Admin Created" : `Create Admin Account`}
              </span>
              <button style={styles.closeBtn} onClick={() => setShowModal(false)}>✕</button>
            </div>

            {result ? (
              /* Success state */
              <div style={{padding:"0 24px 24px"}}>
                <div style={styles.successBox}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{marginBottom:8}}>
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                  <div style={{fontWeight:700,color:"#15803d",marginBottom:4}}>Account ready!</div>
                  <div style={{color:"#166534",fontSize:13}}>Share these credentials with your client.</div>
                </div>

                <div style={styles.credRow}>
                  <span style={styles.credLabel}>Email</span>
                  <span style={styles.credVal}>{result.email}</span>
                  <button style={styles.copyBtn} onClick={() => doCopy(result.email, "email")}>
                    {copied === "email" ? "Copied!" : "Copy"}
                  </button>
                </div>
                <div style={styles.credRow}>
                  <span style={styles.credLabel}>Password</span>
                  <span style={{...styles.credVal, fontFamily:"monospace"}}>{result.password}</span>
                  <button style={styles.copyBtn} onClick={() => doCopy(result.password, "pwd")}>
                    {copied === "pwd" ? "Copied!" : "Copy"}
                  </button>
                </div>

                {/* ── Send Activation Link ── */}
                <div style={{marginTop:20,background:"#f0f7ff",border:"1px solid #bfdbfe",borderRadius:12,padding:"16px 18px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                    </svg>
                    <span style={{fontWeight:700,fontSize:13,color:"#1d4ed8"}}>Send Activation Link</span>
                  </div>
                  <p style={{margin:"0 0 12px",fontSize:12,color:"#3b82f6",lineHeight:1.5}}>
                    Send the admin an email link to set their own password and configure MFA. The link expires in 7 days.
                  </p>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    <input
                      type="email"
                      placeholder="Send link to email…"
                      value={sendTo}
                      onChange={e => { setSendTo(e.target.value); setLinkSent(false); setLinkErr(""); }}
                      style={{...styles.input,margin:0,flex:1,fontSize:13,padding:"8px 10px"}}
                    />
                    <button
                      onClick={handleSendActivation}
                      disabled={sendingLink || linkSent}
                      style={{padding:"8px 16px",background: linkSent ? "#16a34a" : "linear-gradient(135deg,#2563eb,#1d4ed8)",color:"#fff",border:"none",borderRadius:8,fontWeight:700,fontSize:13,cursor:sendingLink||linkSent?"default":"pointer",whiteSpace:"nowrap",fontFamily:"inherit",opacity:sendingLink?0.7:1}}
                    >
                      {sendingLink ? "Sending…" : linkSent ? "✓ Sent!" : "Send Link"}
                    </button>
                  </div>
                  {linkErr && <div style={{marginTop:8,fontSize:12,color:"#dc2626"}}>{linkErr}</div>}
                  {linkSent && <div style={{marginTop:8,fontSize:12,color:"#16a34a",fontWeight:600}}>✓ Activation link sent to {sendTo}</div>}
                </div>

                <button style={{...styles.btnPrimary, width:"100%", marginTop:16}}
                  onClick={() => { setResult(null); openModal(); }}>
                  Create Another
                </button>
              </div>
            ) : (
              /* Multi-step Form */
              <div style={{padding:"0 24px 24px"}}>
                {formStep === 1 && (
                  <>
                    {/* Section header */}
                    <div style={{fontSize:14,fontWeight:700,color:"#0f172a",paddingBottom:8,marginBottom:16,borderBottom:"1px solid #e2e8f0"}}>Company Information</div>

                    <div style={styles.field}>
                      <label style={styles.label}>Company Name <span style={{color:"#dc2626"}}>*</span></label>
                      <input style={styles.input} placeholder="e.g. Acme Corp"
                        value={form.companyName} onChange={e => setForm(f => ({...f, companyName: e.target.value}))} autoFocus />
                    </div>
                    <div style={styles.field}>
                      <label style={styles.label}>Domain</label>
                      <input style={styles.input} placeholder="e.g. example.com"
                        value={form.subdomain} onChange={e => setForm(f => ({...f, subdomain: e.target.value}))} />
                    </div>
                    <div style={styles.field}>
                      <label style={styles.label}>Industry</label>
                      <select style={styles.input} value={form.industry} onChange={e => setForm(f => ({...f, industry: e.target.value}))}>
                        <option value="">Select industry...</option>
                        {["Technology","Healthcare","Finance","E-commerce","Education","Manufacturing","Media","Government","Other"].map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                    <div style={styles.field}>
                      <label style={styles.label}>Country</label>
                      <input style={styles.input} placeholder="e.g. India"
                        value={form.country} onChange={e => setForm(f => ({...f, country: e.target.value}))} />
                    </div>
                    <div style={styles.field}>
                      <label style={styles.label}>Timezone</label>
                      <select style={styles.input} value={form.timezone} onChange={e => setForm(f => ({...f, timezone: e.target.value}))}>
                        <option value="">Select timezone</option>
                        <option value="Asia/Kolkata">Asia/Kolkata (GMT+5:30)</option>
                        <option value="America/New_York">America/New_York (GMT-5:00)</option>
                        <option value="America/Los_Angeles">America/Los_Angeles (GMT-8:00)</option>
                        <option value="Europe/London">Europe/London (GMT+0:00)</option>
                        <option value="Europe/Berlin">Europe/Berlin (GMT+1:00)</option>
                        <option value="Asia/Tokyo">Asia/Tokyo (GMT+9:00)</option>
                        <option value="Asia/Singapore">Asia/Singapore (GMT+8:00)</option>
                        <option value="Australia/Sydney">Australia/Sydney (GMT+11:00)</option>
                        <option value="Asia/Dubai">Asia/Dubai (GMT+4:00)</option>
                        <option value="Pacific/Auckland">Pacific/Auckland (GMT+12:00)</option>
                        <option value="UTC">UTC (GMT+0:00)</option>
                      </select>
                    </div>

                    {createErr && <div style={styles.errBox}>{createErr}</div>}

                    <button style={{...styles.btnPrimary, width:"100%", marginTop:8}} onClick={() => {
                      if (!form.companyName.trim()) { setCreateErr("Company name is required."); return; }
                      setCreateErr(""); setFormStep(2);
                    }}>
                      Next
                    </button>

                    {/* Step indicator */}
                    <div style={{display:"flex",justifyContent:"center",gap:8,marginTop:16}}>
                      <span style={{width:8,height:8,borderRadius:"50%",background:"#2563eb"}} />
                      <span style={{width:8,height:8,borderRadius:"50%",background:"#e2e8f0"}} />
                    </div>
                  </>
                )}

                {formStep === 2 && (
                  <>
                    {/* Section header */}
                    <div style={{fontSize:14,fontWeight:700,color:"#0f172a",paddingBottom:8,marginBottom:16,borderBottom:"1px solid #e2e8f0"}}>Admin Information</div>

                    <div style={styles.field}>
                      <label style={styles.label}>Admin Name <span style={{color:"#dc2626"}}>*</span></label>
                      <input style={styles.input} placeholder="Client Name"
                        value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} autoFocus />
                    </div>
                    <div style={styles.field}>
                      <label style={styles.label}>Admin Email <span style={{color:"#dc2626"}}>*</span></label>
                      <input style={styles.input} type="email" placeholder="client@company.com"
                        value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} />
                    </div>

                    <div style={styles.field}>
                      <label style={styles.label}>Password</label>
                      <div style={{display:"flex",gap:16,marginBottom:10}}>
                        {["auto","manual"].map(t => (
                          <label key={t} style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",fontSize:14,fontWeight:500,color: form.passType===t?"#2563eb":"#64748b"}}>
                            <input type="radio" checked={form.passType===t}
                              onChange={() => setForm(f => ({...f, passType:t, password: t==="auto" ? genPassword() : ""}))}
                              style={{accentColor:"#2563eb"}} />
                            {t === "auto" ? "Auto-generate" : "Set manually"}
                          </label>
                        ))}
                      </div>

                      {form.passType === "auto" ? (
                        <div style={styles.autoPassBox}>
                          <span style={{fontFamily:"monospace",fontSize:15,fontWeight:600,color:"#0f172a",letterSpacing:1}}>{form.password}</span>
                          <button style={styles.regenBtn} onClick={() => setForm(f => ({...f, password: genPassword()}))} title="Regenerate">
                            ↻
                          </button>
                        </div>
                      ) : (
                        <input style={styles.input} type="text" placeholder="Enter password"
                          value={form.password} onChange={e => setForm(f => ({...f, password: e.target.value}))} />
                      )}
                    </div>

                    {createErr && <div style={styles.errBox}>{createErr}</div>}

                    <div style={{display:"flex",gap:10,marginTop:8}}>
                      <button style={{...styles.btnOutline, flex:1}} onClick={() => { setCreateErr(""); setFormStep(1); }}>Back</button>
                      <button style={{...styles.btnPrimary, flex:2}} onClick={handleCreate} disabled={creating}>
                        {creating ? "Creating…" : "Create Admin Account"}
                      </button>
                    </div>

                    {/* Step indicator */}
                    <div style={{display:"flex",justifyContent:"center",gap:8,marginTop:16}}>
                      <span style={{width:8,height:8,borderRadius:"50%",background:"#e2e8f0"}} />
                      <span style={{width:8,height:8,borderRadius:"50%",background:"#2563eb"}} />
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Settings Modal ── */}
      {showSettings && (
        <div style={styles.overlay} onClick={e => e.target === e.currentTarget && setShowSettings(false)}>
          <div style={{...styles.modal, maxWidth:440}}>
            <div style={styles.modalHeader}>
              <span style={{fontWeight:800,fontSize:17,color:"#0f172a"}}>Portal Settings</span>
              <button style={styles.closeBtn} onClick={() => setShowSettings(false)}>✕</button>
            </div>
            <div style={{padding:"16px 24px 28px"}}>
              {/* Unique Domains toggle */}
              <div style={{
                display:"flex", alignItems:"center", justifyContent:"space-between",
                background: settings.uniqueDomains ? "#f0fdf4" : "#f8fafc",
                border:`1.5px solid ${settings.uniqueDomains ? "#bbf7d0" : "#e2e8f0"}`,
                borderRadius:12, padding:"16px 18px",
                transition:"all 0.2s",
              }}>
                <div style={{flex:1,paddingRight:16}}>
                  <div style={{fontSize:14,fontWeight:700,color:"#0f172a",marginBottom:3,display:"flex",alignItems:"center",gap:8}}>
                    Unique Domains
                    {settings.uniqueDomains && (
                      <span style={{fontSize:10,fontWeight:700,background:"#16a34a",color:"#fff",padding:"1px 7px",borderRadius:999}}>ON</span>
                    )}
                  </div>
                  <div style={{fontSize:12,color:"#64748b",lineHeight:1.6}}>
                    {settings.uniqueDomains
                      ? "Only one admin per email domain is allowed. Turn off to create multiple admins from the same domain."
                      : "Multiple admins with the same email domain are allowed. Turn on to enforce one admin per domain."}
                  </div>
                </div>
                <button
                  onClick={toggleUniqueDomains}
                  disabled={savingSettings}
                  style={{
                    width:48, height:27, borderRadius:14, border:"none", cursor:"pointer",
                    background: settings.uniqueDomains ? "#16a34a" : "#cbd5e1",
                    position:"relative", transition:"background 0.2s", flexShrink:0,
                    opacity: savingSettings ? 0.6 : 1,
                  }}
                >
                  <span style={{
                    position:"absolute", top:3, left: settings.uniqueDomains ? 24 : 3,
                    width:21, height:21, borderRadius:"50%", background:"#fff",
                    transition:"left 0.2s", boxShadow:"0 1px 4px rgba(0,0,0,0.2)",
                  }} />
                </button>
              </div>
              <div style={{marginTop:10,fontSize:12,color:"#94a3b8",paddingLeft:2}}>
                This setting is saved permanently and applies to all future admin creations.
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Styles ── */
const styles = {
  page:         { minHeight:"100vh", background:"#f8fafc", fontFamily:"inherit" },
  header:       { background:"#fff", borderBottom:"1px solid #e2e8f0", position:"sticky", top:0, zIndex:100 },
  headerInner:  { maxWidth:1100, margin:"0 auto", padding:"0 24px", height:60, display:"flex", alignItems:"center", justifyContent:"space-between" },
  main:         { maxWidth:1100, margin:"0 auto", padding:"32px 24px" },
  statsRow:     { display:"flex", gap:16, marginBottom:32 },
  statCard:     { flex:1, background:"#fff", borderRadius:12, border:"1px solid #e2e8f0", padding:"18px 22px" },
  statVal:      { fontSize:32, fontWeight:800, color:"#0f172a", letterSpacing:"-1px" },
  statLabel:    { fontSize:13, color:"#64748b", marginTop:2 },
  sectionTitle: { fontSize:15, fontWeight:700, color:"#0f172a", marginBottom:16 },
  emptyState:   { textAlign:"center", color:"#94a3b8", padding:"48px 0", fontSize:14 },
  cardGrid:     { display:"flex", flexDirection:"column", gap:16 },
  card:         { background:"#fff", borderRadius:14, border:"1px solid #e2e8f0", overflow:"hidden", boxShadow:"0 1px 4px rgba(0,0,0,0.05)" },
  cardHeader:   { display:"flex", alignItems:"center", gap:14, padding:"18px 20px 12px" },
  avatar:       { width:42, height:42, borderRadius:10, background:"linear-gradient(135deg,#2563eb,#6366f1)", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:800, fontSize:17, flexShrink:0 },
  adminName:    { fontSize:15, fontWeight:700, color:"#0f172a", marginBottom:2 },
  adminEmail:   { fontSize:12, color:"#64748b" },
  planBadge:    { fontSize:11, fontWeight:700, padding:"4px 10px", borderRadius:20, whiteSpace:"nowrap", flexShrink:0 },
  cardMeta:     { display:"flex", gap:18, padding:"0 20px 14px", borderBottom:"1px solid #f1f5f9" },
  metaItem:     { display:"flex", alignItems:"center", gap:5, fontSize:12, color:"#64748b" },
  countdownRow: { display:"flex", alignItems:"center", gap:8, padding:"6px 20px 10px", borderTop:"1px solid #f1f5f9" },
  expandBtn:    { width:"100%", background:"none", border:"none", padding:"10px 20px", fontSize:12, color:"#2563eb", fontWeight:600, cursor:"pointer", textAlign:"left" },
  userTable:    { borderTop:"1px solid #f1f5f9", overflow:"auto" },
  th:           { padding:"8px 12px", textAlign:"left", fontWeight:600, color:"#64748b", fontSize:11, textTransform:"uppercase", letterSpacing:"0.4px", whiteSpace:"nowrap" },
  td:           { padding:"8px 12px", color:"#334155", whiteSpace:"nowrap", borderTop:"1px solid #f1f5f9" },
  toolBadge:    { fontSize:10, fontWeight:600, padding:"2px 7px", borderRadius:6, background:"#eff6ff", color:"#2563eb", marginRight:4, display:"inline-block" },
  loginPage:    { minHeight:"100vh", background:"linear-gradient(135deg,#f0f4ff 0%,#fff 60%)", display:"flex", alignItems:"center", justifyContent:"center" },
  loginCard:    { background:"#fff", borderRadius:20, padding:"40px 36px", width:"100%", maxWidth:400, boxShadow:"0 8px 40px rgba(0,0,0,0.10)", border:"1px solid #e2e8f0" },
  loginLogo:    { display:"flex", alignItems:"center", gap:10, marginBottom:28 },
  loginLogoIcon:{ width:38, height:38, borderRadius:10, background:"linear-gradient(135deg,#2563eb,#6366f1)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 },
  field:        { marginBottom:16 },
  label:        { display:"block", fontSize:13, fontWeight:600, color:"#374151", marginBottom:6 },
  input:        { width:"100%", boxSizing:"border-box", padding:"10px 12px", border:"1.5px solid #e2e8f0", borderRadius:9, fontSize:14, outline:"none", fontFamily:"inherit", background:"#fff" },
  errBox:       { background:"#fee2e2", color:"#dc2626", borderRadius:8, padding:"10px 14px", fontSize:13, marginBottom:12 },
  btnPrimary:   { background:"#2563eb", color:"#fff", border:"none", borderRadius:9, padding:"11px 22px", fontWeight:700, fontSize:14, cursor:"pointer", fontFamily:"inherit" },
  btnOutline:   { background:"#fff", color:"#374151", border:"1.5px solid #e2e8f0", borderRadius:9, padding:"9px 18px", fontWeight:600, fontSize:13, cursor:"pointer", fontFamily:"inherit" },
  btnBack:      { background:"none", color:"#64748b", border:"none", padding:"8px 0", fontSize:13, cursor:"pointer", fontFamily:"inherit", marginTop:4 },
  overlay:      { position:"fixed", inset:0, background:"rgba(15,23,42,0.5)", backdropFilter:"blur(4px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:9999, padding:16 },
  modal:        { background:"#fff", borderRadius:18, width:"100%", maxWidth:480, boxShadow:"0 24px 64px rgba(0,0,0,0.2)", overflow:"hidden" },
  modalHeader:  { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"20px 24px 16px", borderBottom:"1px solid #f1f5f9" },
  closeBtn:     { background:"none", border:"none", fontSize:18, color:"#94a3b8", cursor:"pointer", lineHeight:1 },
  successBox:   { background:"#f0fdf4", border:"1.5px solid #bbf7d0", borderRadius:12, padding:"20px", textAlign:"center", marginBottom:20, marginTop:4 },
  credRow:      { display:"flex", alignItems:"center", gap:10, background:"#f8fafc", borderRadius:9, padding:"10px 14px", marginBottom:10 },
  credLabel:    { fontSize:12, fontWeight:600, color:"#64748b", width:64, flexShrink:0 },
  credVal:      { flex:1, fontSize:13, color:"#0f172a", fontWeight:500, wordBreak:"break-all" },
  copyBtn:      { background:"#eff6ff", color:"#2563eb", border:"none", borderRadius:6, padding:"4px 10px", fontSize:12, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" },
  autoPassBox:  { display:"flex", alignItems:"center", justifyContent:"space-between", background:"#f8fafc", border:"1.5px solid #e2e8f0", borderRadius:9, padding:"10px 14px" },
  regenBtn:     { background:"#eff6ff", color:"#2563eb", border:"none", borderRadius:6, width:30, height:30, fontSize:16, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" },
  deleteBtn:     { background:"#fff1f2", color:"#dc2626", border:"1.5px solid #fecaca", borderRadius:7, width:32, height:32, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", flexShrink:0, marginLeft:6 },
  planActionBtn: (color, bg, border) => ({ background: bg, color, border: `1.5px solid ${border}`, borderRadius:7, padding:"4px 11px", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap" }),
};
