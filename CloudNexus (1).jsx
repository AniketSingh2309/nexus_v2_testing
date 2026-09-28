import { useState, useEffect, useRef } from "react";

/* ══════════════════════════════════════════
   🔧 EMAILJS CONFIG — replace these 3 values
   after completing EmailJS setup
══════════════════════════════════════════ */
const EMAILJS_SERVICE_ID  = "service_ifg3hyt";
const EMAILJS_TEMPLATE_ID = "template_433t53w";
const EMAILJS_PUBLIC_KEY  = "tCGK85U2zX8KDjUov";

const FONT_LINK = `https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Syne:wght@700;800&display=swap`;

const css = `
@import url('${FONT_LINK}');
*, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
:root {
  --bg:#f0f4ff; --surface:#fff; --border:#e1e9f5; --text:#0d1b3e; --muted:#6b7fa3;
  --blue:#2563eb; --blue-light:#dbeafe; --green:#16a34a; --green-light:#dcfce7;
  --red:#dc2626; --red-light:#fee2e2; --shadow:0 4px 24px rgba(37,99,235,.08);
  --shadow-lg:0 12px 48px rgba(37,99,235,.14);
}
body { font-family:'DM Sans',sans-serif; background:var(--bg); color:var(--text); min-height:100vh; }
.container { max-width:1200px; margin:auto; padding:0 28px; }
.navbar { background:rgba(255,255,255,.88); backdrop-filter:blur(12px); border-bottom:1px solid var(--border); position:sticky; top:0; z-index:100; }
.nav-inner { height:72px; display:flex; justify-content:space-between; align-items:center; }
.logo { font-family:'Syne',sans-serif; font-size:26px; font-weight:800; letter-spacing:-1px; cursor:pointer; }
.logo span { color:var(--blue); }
.nav-links { display:flex; gap:32px; color:var(--muted); font-size:15px; font-weight:500; }
.nav-links a { cursor:pointer; transition:color .2s; }
.nav-links a:hover { color:var(--text); }
.btn { border:none; cursor:pointer; font-family:'DM Sans',sans-serif; font-weight:600; border-radius:12px; transition:all .18s; display:inline-flex; align-items:center; gap:8px; }
.btn-primary { background:var(--blue); color:#fff; padding:12px 22px; font-size:15px; }
.btn-primary:hover { background:#1d4ed8; transform:translateY(-1px); box-shadow:0 6px 20px rgba(37,99,235,.35); }
.btn-primary:disabled { background:#93aef7; cursor:not-allowed; transform:none; box-shadow:none; }
.btn-outline { background:#fff; border:1.5px solid var(--border); color:var(--text); padding:12px 22px; font-size:15px; }
.btn-outline:hover { border-color:var(--blue); color:var(--blue); }
.btn-ghost { background:transparent; color:var(--muted); padding:10px 16px; font-size:14px; }
.btn-ghost:hover { background:var(--bg); color:var(--text); }
.hero { padding:100px 0 80px; text-align:center; position:relative; overflow:hidden; }
.hero::before { content:''; position:absolute; inset:0; background:radial-gradient(ellipse 80% 50% at 50% -10%,#bfdbfe,transparent); pointer-events:none; }
.hero-badge { display:inline-flex; align-items:center; gap:8px; background:var(--blue-light); color:var(--blue); padding:6px 16px; border-radius:999px; font-size:13px; font-weight:600; margin-bottom:28px; }
.hero-badge::before { content:'●'; font-size:8px; animation:pulse 1.5s infinite; }
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
.hero h1 { font-family:'Syne',sans-serif; font-size:68px; font-weight:800; line-height:1.04; max-width:820px; margin:auto auto 24px; letter-spacing:-2px; }
.hero h1 em { font-style:normal; color:var(--blue); }
.hero p { font-size:19px; color:var(--muted); max-width:640px; margin:auto auto 40px; line-height:1.75; }
.hero-btns { display:flex; justify-content:center; gap:14px; flex-wrap:wrap; }
.features { padding:80px 0; }
.section-label { font-size:13px; font-weight:700; letter-spacing:.1em; text-transform:uppercase; color:var(--blue); margin-bottom:12px; }
.section-title { font-family:'Syne',sans-serif; font-size:42px; font-weight:800; letter-spacing:-1.5px; margin-bottom:16px; }
.section-sub { color:var(--muted); font-size:17px; max-width:500px; line-height:1.7; }
.feature-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:20px; margin-top:52px; }
.feature-card { background:#fff; border:1px solid var(--border); border-radius:20px; padding:28px; transition:all .22s; }
.feature-card:hover { transform:translateY(-4px); box-shadow:var(--shadow-lg); border-color:var(--blue); }
.feature-icon { width:44px; height:44px; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:20px; margin-bottom:16px; }
.feature-card h3 { font-weight:700; font-size:17px; margin-bottom:8px; }
.feature-card p { color:var(--muted); font-size:14px; line-height:1.65; }
.stats-row { display:grid; grid-template-columns:repeat(4,1fr); gap:20px; margin-top:60px; }
.stat-card { background:#fff; border:1px solid var(--border); border-radius:18px; padding:28px; text-align:center; }
.stat-card .num { font-family:'Syne',sans-serif; font-size:38px; font-weight:800; color:var(--blue); letter-spacing:-1px; }
.stat-card .label { font-size:13px; color:var(--muted); margin-top:6px; font-weight:500; }
.auth-wrap { min-height:100vh; display:flex; align-items:center; justify-content:center; padding:40px 20px; }
.auth-card { background:#fff; border:1px solid var(--border); border-radius:24px; padding:44px; width:100%; max-width:440px; box-shadow:var(--shadow-lg); }
.auth-card h2 { font-family:'Syne',sans-serif; font-size:30px; font-weight:800; letter-spacing:-1px; margin-bottom:6px; }
.auth-card .sub { color:var(--muted); font-size:15px; margin-bottom:32px; line-height:1.55; }
.field { margin-bottom:18px; }
.field label { display:block; font-size:13px; font-weight:600; color:var(--text); margin-bottom:7px; }
.field input { width:100%; padding:13px 16px; border:1.5px solid var(--border); border-radius:12px; font-family:'DM Sans',sans-serif; font-size:15px; outline:none; transition:border .18s,box-shadow .18s; }
.field input:focus { border-color:var(--blue); box-shadow:0 0 0 3px rgba(37,99,235,.12); }
.field input::placeholder { color:#b0bed4; }
.auth-divider { text-align:center; margin:20px 0; color:var(--muted); font-size:13px; }
.alert { border-radius:12px; padding:12px 16px; font-size:14px; margin-top:16px; display:flex; align-items:flex-start; gap:10px; line-height:1.55; word-break:break-word; }
.alert-blue  { background:var(--blue-light); color:#1d4ed8; }
.alert-green { background:var(--green-light); color:var(--green); }
.alert-red   { background:var(--red-light);   color:var(--red); }
.otp-input { width:100%; text-align:center; font-size:28px; font-weight:700; letter-spacing:10px; padding:16px 8px; border:1.5px solid var(--border); border-radius:12px; font-family:'DM Sans',sans-serif; outline:none; transition:border .18s,box-shadow .18s; }
.otp-input:focus { border-color:var(--blue); box-shadow:0 0 0 3px rgba(37,99,235,.12); }
.otp-timer { font-size:13px; color:var(--muted); margin-top:10px; text-align:center; }
.otp-timer span { color:var(--blue); font-weight:600; }
.step-dots { display:flex; gap:8px; justify-content:center; margin-bottom:28px; }
.step-dot { width:8px; height:8px; border-radius:999px; background:var(--border); transition:all .3s; }
.step-dot.active { background:var(--blue); width:24px; }
.step-dot.done   { background:var(--green); width:24px; }
.loading-spin { width:18px; height:18px; border:2.5px solid rgba(255,255,255,.4); border-top-color:#fff; border-radius:50%; animation:spin .7s linear infinite; flex-shrink:0; }
@keyframes spin { to { transform:rotate(360deg); } }
.dash-layout { display:grid; grid-template-columns:260px 1fr; min-height:100vh; }
.dash-sidebar { background:#0d1b3e; color:#fff; padding:28px 20px; display:flex; flex-direction:column; gap:6px; position:sticky; top:0; height:100vh; overflow-y:auto; }
.sidebar-logo { font-family:'Syne',sans-serif; font-size:22px; font-weight:800; color:#fff; padding:8px 12px 24px; letter-spacing:-1px; border-bottom:1px solid rgba(255,255,255,.08); margin-bottom:12px; }
.sidebar-logo span { color:#60a5fa; }
.sidebar-section { font-size:11px; font-weight:700; letter-spacing:.1em; text-transform:uppercase; color:rgba(255,255,255,.3); padding:16px 12px 8px; }
.nav-item { display:flex; align-items:center; gap:12px; padding:11px 14px; border-radius:12px; cursor:pointer; font-size:14px; font-weight:500; color:rgba(255,255,255,.65); transition:all .18s; }
.nav-item:hover  { background:rgba(255,255,255,.08); color:#fff; }
.nav-item.active { background:rgba(96,165,250,.15); color:#60a5fa; }
.nav-item .icon  { font-size:17px; width:22px; text-align:center; }
.sidebar-footer  { margin-top:auto; }
.user-chip { display:flex; align-items:center; gap:12px; padding:12px; border-radius:14px; background:rgba(255,255,255,.06); }
.user-avatar { width:38px; height:38px; border-radius:10px; background:linear-gradient(135deg,#3b82f6,#6366f1); display:flex; align-items:center; justify-content:center; font-weight:700; font-size:15px; color:#fff; flex-shrink:0; }
.user-name  { font-size:14px; font-weight:600; color:#fff; }
.user-email { font-size:12px; color:rgba(255,255,255,.4); margin-top:1px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:130px; }
.dash-main { background:var(--bg); overflow-y:auto; }
.dash-header { background:#fff; border-bottom:1px solid var(--border); padding:0 32px; height:68px; display:flex; align-items:center; justify-content:space-between; position:sticky; top:0; z-index:10; }
.dash-header h1 { font-family:'Syne',sans-serif; font-size:22px; font-weight:800; letter-spacing:-0.5px; }
.header-right { display:flex; align-items:center; gap:14px; }
.notif-btn { width:40px; height:40px; border-radius:10px; background:var(--bg); border:1px solid var(--border); display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:16px; position:relative; }
.notif-dot { width:8px; height:8px; background:#ef4444; border-radius:50%; position:absolute; top:8px; right:8px; border:2px solid #fff; }
.dash-body { padding:32px; }
.welcome-banner { background:linear-gradient(120deg,#1d4ed8,#4f46e5); border-radius:22px; padding:32px 36px; color:#fff; margin-bottom:28px; position:relative; overflow:hidden; }
.welcome-banner::after  { content:''; position:absolute; right:-40px; top:-40px; width:220px; height:220px; background:rgba(255,255,255,.06); border-radius:50%; }
.welcome-banner::before { content:''; position:absolute; right:60px; bottom:-60px; width:160px; height:160px; background:rgba(255,255,255,.04); border-radius:50%; }
.welcome-banner h2 { font-family:'Syne',sans-serif; font-size:26px; font-weight:800; letter-spacing:-0.5px; margin-bottom:6px; }
.welcome-banner p  { font-size:15px; color:rgba(255,255,255,.75); max-width:480px; }
.welcome-pill { display:inline-flex; align-items:center; gap:6px; background:rgba(255,255,255,.15); border-radius:999px; padding:4px 12px; font-size:12px; font-weight:600; margin-bottom:16px; }
.kpi-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:18px; margin-bottom:28px; }
.kpi { background:#fff; border:1px solid var(--border); border-radius:18px; padding:22px 24px; transition:all .2s; }
.kpi:hover { transform:translateY(-2px); box-shadow:var(--shadow); }
.kpi-label { font-size:12px; font-weight:600; color:var(--muted); text-transform:uppercase; letter-spacing:.06em; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center; }
.kpi-value  { font-family:'Syne',sans-serif; font-size:32px; font-weight:800; letter-spacing:-1px; }
.kpi-change { font-size:13px; font-weight:600; margin-top:6px; }
.kpi-change.up   { color:var(--green); }
.kpi-change.down { color:var(--red); }
.kpi-icon { width:32px; height:32px; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:15px; }
.dash-2col { display:grid; grid-template-columns:1fr 360px; gap:20px; margin-bottom:24px; }
.panel { background:#fff; border:1px solid var(--border); border-radius:20px; padding:24px; }
.panel-head { display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; }
.panel-head h3 { font-weight:700; font-size:16px; }
.panel-head .see-all { font-size:13px; color:var(--blue); font-weight:600; cursor:pointer; }
.usage-bar-row { margin-bottom:18px; }
.usage-bar-label { display:flex; justify-content:space-between; font-size:13px; margin-bottom:6px; }
.usage-bar-label span:first-child { font-weight:600; }
.usage-bar-label span:last-child  { color:var(--muted); }
.bar-track { height:8px; background:var(--bg); border-radius:999px; overflow:hidden; }
.bar-fill  { height:100%; border-radius:999px; transition:width 1s ease; }
.activity-item { display:flex; align-items:flex-start; gap:12px; padding:12px 0; border-bottom:1px solid var(--bg); }
.activity-item:last-child { border-bottom:none; }
.activity-icon { width:36px; height:36px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:15px; flex-shrink:0; }
.activity-text { font-size:14px; font-weight:500; }
.activity-time { font-size:12px; color:var(--muted); margin-top:2px; }
.service-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; }
.service-card { border:1px solid var(--border); border-radius:14px; padding:16px; }
.service-status { display:inline-flex; align-items:center; gap:6px; font-size:12px; font-weight:600; }
.dot-green  { width:7px; height:7px; border-radius:50%; background:var(--green); }
.dot-yellow { width:7px; height:7px; border-radius:50%; background:#f59e0b; }
.service-name { font-weight:600; font-size:14px; margin:8px 0 4px; }
.service-meta { font-size:12px; color:var(--muted); }
@media(max-width:1024px){.dash-layout{grid-template-columns:1fr}.dash-sidebar{display:none}.kpi-grid{grid-template-columns:repeat(2,1fr)}.dash-2col{grid-template-columns:1fr}}
@media(max-width:768px){.hero h1{font-size:42px}.feature-grid,.stats-row{grid-template-columns:1fr 1fr}.nav-links{display:none}}
@media(max-width:520px){.feature-grid,.stats-row,.kpi-grid{grid-template-columns:1fr}}
`;

const features = [
  { icon:"📊", color:"#eff6ff", title:"Real-Time Insights",   desc:"Monitor infrastructure usage and performance with live telemetry across all regions." },
  { icon:"💸", color:"#f0fdf4", title:"Cost Optimization",    desc:"Identify waste automatically and surface actionable recommendations to reduce spend." },
  { icon:"☁️", color:"#f5f3ff", title:"Multi-Cloud Support",  desc:"Unified control plane for AWS, Azure, and GCP — one dashboard to rule them all." },
  { icon:"🔒", color:"#fff7ed", title:"Built-In Security",    desc:"Enterprise-grade encryption, access controls, and compliance reporting out of the box." },
  { icon:"🔮", color:"#fdf2f8", title:"Usage Forecasting",    desc:"ML-powered predictions let you provision for tomorrow's demand today." },
  { icon:"⚡", color:"#ecfeff", title:"Automatic Scaling",    desc:"Elastic infrastructure that responds to demand spikes within milliseconds." },
];
const kpis = [
  { label:"Monthly Spend",      value:"$12,480", change:"-8.2%",       dir:"down", icon:"💳", bg:"#eff6ff" },
  { label:"Resources Active",   value:"1,342",   change:"+5.1%",       dir:"up",   icon:"🖥️", bg:"#f0fdf4" },
  { label:"Savings This Month", value:"$2,104",  change:"+14%",        dir:"up",   icon:"🏦", bg:"#fff7ed" },
  { label:"Alerts",             value:"3",       change:"-2 resolved", dir:"up",   icon:"🔔", bg:"#fdf2f8" },
];
const usageBars = [
  { label:"Compute (EC2/VM)",        used:72, color:"#2563eb" },
  { label:"Storage (S3/Blob)",       used:45, color:"#7c3aed" },
  { label:"Networking",              used:58, color:"#ea580c" },
  { label:"Database (RDS/CosmosDB)", used:33, color:"#16a34a" },
];
const activities = [
  { icon:"🔄", bg:"#eff6ff", text:"Auto-scaled web tier — added 3 instances",            time:"2 min ago"  },
  { icon:"💡", bg:"#f0fdf4", text:"Cost insight: idle us-east-1 cluster detected",       time:"18 min ago" },
  { icon:"🔒", bg:"#fff7ed", text:"Security policy updated for prod environment",         time:"1 hr ago"   },
  { icon:"📉", bg:"#fdf2f8", text:"Rightsized 5 over-provisioned VMs, saving $310/mo",   time:"3 hrs ago"  },
  { icon:"✅", bg:"#f0fdf4", text:"Deployment successful: cloudnexus-api v2.4.1",        time:"5 hrs ago"  },
];
const services = [
  { name:"API Gateway",      status:"healthy",  region:"us-east-1",    uptime:"99.98%" },
  { name:"Database Cluster", status:"healthy",  region:"eu-west-1",    uptime:"100%"   },
  { name:"CDN Edge",         status:"degraded", region:"ap-southeast", uptime:"98.2%"  },
  { name:"Worker Queue",     status:"healthy",  region:"us-west-2",    uptime:"99.9%"  },
  { name:"ML Pipeline",      status:"healthy",  region:"us-east-1",    uptime:"99.7%"  },
  { name:"Auth Service",     status:"healthy",  region:"global",       uptime:"100%"   },
];
const navItems = [
  { icon:"🏠", label:"Overview",      id:"overview"  },
  { icon:"📊", label:"Analytics",     id:"analytics" },
  { icon:"💰", label:"Cost Explorer", id:"cost"      },
  { icon:"🖥️", label:"Resources",     id:"resources" },
  { icon:"⚠️", label:"Alerts",        id:"alerts",   badge:3 },
  { icon:"🔒", label:"Security",      id:"security"  },
  { icon:"⚙️", label:"Settings",      id:"settings"  },
];

function generateOTP() { return String(Math.floor(100000 + Math.random() * 900000)); }

async function sendOTPEmail({ toEmail, toName, otpCode }) {
  const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      service_id:  EMAILJS_SERVICE_ID,
      template_id: EMAILJS_TEMPLATE_ID,
      user_id:     EMAILJS_PUBLIC_KEY,
      template_params: { to_email: toEmail, to_name: toName, otp_code: otpCode },
    }),
  });
  if (!res.ok) { const e = await res.text(); throw new Error(e || "EmailJS failed"); }
}

export default function App() {
  const [page,      setPage]      = useState("home");
  const [authStep,  setAuthStep]  = useState("login"); // login | register | otp
  const [isLogin,   setIsLogin]   = useState(true);
  const [name,      setName]      = useState("");
  const [email,     setEmail]     = useState("");
  const [password,  setPassword]  = useState("");
  const [otp,       setOtp]       = useState("");
  const [genOtp,    setGenOtp]    = useState("");
  const [otpTimer,  setOtpTimer]  = useState(60);
  const [loading,   setLoading]   = useState(false);
  const [alert,     setAlert]     = useState(null);
  const [user,      setUser]      = useState(null);
  const [activeNav, setActiveNav] = useState("overview");
  const timerRef = useRef(null);

  useEffect(() => {
    try { const s = JSON.parse(localStorage.getItem("cn_user")); if (s) { setUser(s); setPage("dashboard"); } } catch {}
  }, []);

  function startTimer() {
    setOtpTimer(60);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setOtpTimer(t => { if (t <= 1) { clearInterval(timerRef.current); return 0; } return t - 1; });
    }, 1000);
  }
  useEffect(() => { if (authStep === "otp") startTimer(); return () => clearInterval(timerRef.current); }, [authStep]);

  function showAlert(type, msg, ms = 6000) {
    setAlert({ type, msg });
    if (ms > 0) setTimeout(() => setAlert(null), ms);
  }

  function handleRegister() {
    if (!name.trim() || !email.trim() || !password) { showAlert("red", "Please fill in all fields."); return; }
    const users = JSON.parse(localStorage.getItem("cn_users") || "[]");
    if (users.find(u => u.email === email)) { showAlert("red", "An account with this email already exists."); return; }
    users.push({ name, email, password });
    localStorage.setItem("cn_users", JSON.stringify(users));
    showAlert("green", "✅ Account created! You can now sign in.");
    setIsLogin(true); setAuthStep("login");
    setName(""); setEmail(""); setPassword("");
  }

  async function handleLogin() {
    if (!email || !password) { showAlert("red", "Enter your email and password."); return; }
    const users = JSON.parse(localStorage.getItem("cn_users") || "[]");
    const found = users.find(u => u.email === email && u.password === password);
    if (!found) { showAlert("red", "Invalid email or password."); return; }
    setLoading(true);
    showAlert("blue", "⏳ Sending OTP to your email…", 0);
    const code = generateOTP();
    setGenOtp(code);
    try {
      await sendOTPEmail({ toEmail: found.email, toName: found.name, otpCode: code });
      setUser(found); setAuthStep("otp"); setOtp(""); setAlert(null);
    } catch (err) {
      showAlert("red", `❌ Failed to send OTP: ${err.message}`);
      setGenOtp("");
    } finally { setLoading(false); }
  }

  function handleVerifyOtp() {
    if (otpTimer === 0) { showAlert("red", "OTP has expired. Please request a new one."); return; }
    if (otp.trim() !== genOtp) { showAlert("red", "Incorrect OTP. Please try again."); return; }
    localStorage.setItem("cn_user", JSON.stringify(user));
    clearInterval(timerRef.current);
    setPage("dashboard"); setAuthStep("login"); setAlert(null);
  }

  async function handleResend() {
    setLoading(true);
    showAlert("blue", "⏳ Sending new OTP…", 0);
    const code = generateOTP(); setGenOtp(code);
    try {
      await sendOTPEmail({ toEmail: user.email, toName: user.name, otpCode: code });
      setOtp(""); setAlert(null); startTimer();
    } catch (err) { showAlert("red", `Resend failed: ${err.message}`); }
    finally { setLoading(false); }
  }

  function logout() { localStorage.removeItem("cn_user"); setUser(null); setPage("home"); }

  /* ── DASHBOARD ── */
  if (page === "dashboard" && user) {
    const initials = user.name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
    return (
      <>
        <style>{css}</style>
        <div className="dash-layout">
          <aside className="dash-sidebar">
            <div className="sidebar-logo">Cloud<span>Nexus</span></div>
            <div className="sidebar-section">Main</div>
            {navItems.slice(0,5).map(n => (
              <div key={n.id} className={`nav-item ${activeNav===n.id?"active":""}`} onClick={()=>setActiveNav(n.id)}>
                <span className="icon">{n.icon}</span><span>{n.label}</span>
                {n.badge && <span style={{marginLeft:"auto",background:"#ef4444",color:"#fff",borderRadius:"999px",padding:"2px 7px",fontSize:"11px",fontWeight:700}}>{n.badge}</span>}
              </div>
            ))}
            <div className="sidebar-section">Config</div>
            {navItems.slice(5).map(n => (
              <div key={n.id} className={`nav-item ${activeNav===n.id?"active":""}`} onClick={()=>setActiveNav(n.id)}>
                <span className="icon">{n.icon}</span><span>{n.label}</span>
              </div>
            ))}
            <div className="sidebar-footer">
              <div className="user-chip">
                <div className="user-avatar">{initials}</div>
                <div><div className="user-name">{user.name}</div><div className="user-email">{user.email}</div></div>
              </div>
              <button className="btn btn-ghost" style={{width:"100%",marginTop:"10px",justifyContent:"center"}} onClick={logout}>🚪 Sign out</button>
            </div>
          </aside>
          <div className="dash-main">
            <header className="dash-header">
              <h1>Overview</h1>
              <div className="header-right">
                <div className="notif-btn">🔔<span className="notif-dot"/></div>
                <button className="btn btn-outline" style={{padding:"9px 16px",fontSize:"13px"}} onClick={logout}>Sign out</button>
              </div>
            </header>
            <div className="dash-body">
              <div className="welcome-banner">
                <div className="welcome-pill">✅ Verified via Email OTP</div>
                <h2>Welcome back, {user.name.split(" ")[0]}! 👋</h2>
                <p>Your infrastructure is running smoothly. You saved $2,104 this month — keep it up.</p>
              </div>
              <div className="kpi-grid">
                {kpis.map(k => (
                  <div className="kpi" key={k.label}>
                    <div className="kpi-label">{k.label}<div className="kpi-icon" style={{background:k.bg}}>{k.icon}</div></div>
                    <div className="kpi-value">{k.value}</div>
                    <div className={`kpi-change ${k.dir}`}>{k.change} vs last month</div>
                  </div>
                ))}
              </div>
              <div className="dash-2col">
                <div className="panel">
                  <div className="panel-head"><h3>Resource Utilisation</h3><span className="see-all">View all →</span></div>
                  {usageBars.map(b => (
                    <div className="usage-bar-row" key={b.label}>
                      <div className="usage-bar-label"><span>{b.label}</span><span>{b.used}%</span></div>
                      <div className="bar-track"><div className="bar-fill" style={{width:`${b.used}%`,background:b.color}}/></div>
                    </div>
                  ))}
                </div>
                <div className="panel">
                  <div className="panel-head"><h3>Recent Activity</h3><span className="see-all">All →</span></div>
                  {activities.map((a,i) => (
                    <div className="activity-item" key={i}>
                      <div className="activity-icon" style={{background:a.bg}}>{a.icon}</div>
                      <div><div className="activity-text">{a.text}</div><div className="activity-time">{a.time}</div></div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="panel">
                <div className="panel-head"><h3>Service Health</h3><span className="see-all">Status page →</span></div>
                <div className="service-grid">
                  {services.map(s => (
                    <div className="service-card" key={s.name}>
                      <div className="service-status"><span className={s.status==="healthy"?"dot-green":"dot-yellow"}/>{s.status==="healthy"?"Healthy":"Degraded"}</div>
                      <div className="service-name">{s.name}</div>
                      <div className="service-meta">{s.region} · {s.uptime} uptime</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  /* ── AUTH ── */
  if (page === "auth") {
    return (
      <>
        <style>{css}</style>
        <div className="auth-wrap">
          <div className="auth-card">
            <div className="step-dots">
              <div className={`step-dot ${authStep==="otp"?"done":"active"}`}/>
              <div className={`step-dot ${authStep==="otp"?"active":""}`}/>
            </div>

            {authStep === "otp" ? (<>
              <h2>Check your email</h2>
              <p className="sub">We sent a 6-digit code to <strong>{email}</strong>. Enter it below — it expires in {otpTimer}s.</p>
              <div className="field">
                <label>One-Time Passcode</label>
                <input className="otp-input" maxLength={6} value={otp} placeholder="——————"
                  onChange={e=>setOtp(e.target.value.replace(/\D/g,""))}
                  onKeyDown={e=>e.key==="Enter"&&handleVerifyOtp()} autoFocus />
                <div className="otp-timer">
                  {otpTimer > 0
                    ? <>Expires in <span>{otpTimer}s</span></>
                    : <><span style={{color:"var(--red)"}}>Code expired — </span>
                        <button className="btn btn-ghost" style={{padding:"2px 8px",fontSize:"13px",display:"inline-flex"}}
                          onClick={handleResend} disabled={loading}>
                          {loading ? "Sending…" : "Resend OTP"}
                        </button>
                      </>
                  }
                </div>
              </div>
              <button className="btn btn-primary" style={{width:"100%",justifyContent:"center"}}
                onClick={handleVerifyOtp} disabled={otp.length!==6||otpTimer===0}>
                Verify &amp; Sign In
              </button>
              <button className="btn btn-ghost" style={{width:"100%",justifyContent:"center",marginTop:8}}
                onClick={()=>{setAuthStep("login");setAlert(null);clearInterval(timerRef.current);}}>
                ← Back
              </button>
            </>) : isLogin ? (<>
              <h2>Sign in</h2>
              <p className="sub">Enter your credentials. We'll email you a one-time code to verify it's you.</p>
              <div className="field"><label>Email address</label>
                <input placeholder="you@company.com" value={email} onChange={e=>setEmail(e.target.value)} /></div>
              <div className="field"><label>Password</label>
                <input type="password" placeholder="••••••••" value={password}
                  onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleLogin()} /></div>
              <button className="btn btn-primary" style={{width:"100%",justifyContent:"center"}}
                onClick={handleLogin} disabled={loading}>
                {loading ? <><div className="loading-spin"/> Sending OTP…</> : "Continue →"}
              </button>
              <div className="auth-divider">— or —</div>
              <button className="btn btn-outline" style={{width:"100%",justifyContent:"center"}}
                onClick={()=>{setIsLogin(false);setAlert(null);}}>Create an account</button>
            </>) : (<>
              <h2>Create account</h2>
              <p className="sub">Set up your CloudNexus workspace in seconds.</p>
              <div className="field"><label>Full name</label>
                <input placeholder="Jane Smith" value={name} onChange={e=>setName(e.target.value)} /></div>
              <div className="field"><label>Email address</label>
                <input placeholder="you@company.com" value={email} onChange={e=>setEmail(e.target.value)} /></div>
              <div className="field"><label>Password</label>
                <input type="password" placeholder="••••••••" value={password}
                  onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleRegister()} /></div>
              <button className="btn btn-primary" style={{width:"100%",justifyContent:"center"}} onClick={handleRegister}>Create Account</button>
              <div className="auth-divider">— or —</div>
              <button className="btn btn-outline" style={{width:"100%",justifyContent:"center"}}
                onClick={()=>{setIsLogin(true);setAlert(null);}}>Back to sign in</button>
            </>)}

            {alert && <div className={`alert alert-${alert.type}`}>{alert.msg}</div>}
          </div>
        </div>
      </>
    );
  }

  /* ── HOME ── */
  return (
    <>
      <style>{css}</style>
      <nav className="navbar">
        <div className="container nav-inner">
          <div className="logo">Cloud<span>Nexus</span></div>
          <div className="nav-links"><a>Features</a><a>Pricing</a><a>Docs</a><a>Blog</a></div>
          <div style={{display:"flex",gap:10}}>
            <button className="btn btn-outline" onClick={()=>setPage("auth")}>Sign in</button>
            <button className="btn btn-primary" onClick={()=>setPage("auth")}>Start free →</button>
          </div>
        </div>
      </nav>
      <section className="hero">
        <div className="container">
          <div className="hero-badge">Now with multi-cloud AI forecasting</div>
          <h1>Reduce cloud costs<br/>without <em>sacrificing</em><br/>performance</h1>
          <p>CloudNexus helps engineering teams identify waste, monitor infrastructure usage, and optimise cloud spend — all from one beautiful dashboard.</p>
          <div className="hero-btns">
            <button className="btn btn-primary" style={{padding:"15px 28px",fontSize:"16px"}} onClick={()=>setPage("auth")}>Start Free Trial</button>
            <button className="btn btn-outline" style={{padding:"15px 28px",fontSize:"16px"}}>Book a Demo</button>
          </div>
        </div>
      </section>
      <section className="features">
        <div className="container">
          <div className="section-label">Platform capabilities</div>
          <div className="section-title">Everything you need,<br/>nothing you don't</div>
          <p className="section-sub">Built for modern engineering teams who need clarity without complexity.</p>
          <div className="feature-grid">
            {features.map(f => (
              <div className="feature-card" key={f.title}>
                <div className="feature-icon" style={{background:f.color}}>{f.icon}</div>
                <h3>{f.title}</h3><p>{f.desc}</p>
              </div>
            ))}
          </div>
          <div className="stats-row">
            {[["35%","Avg. Cost Reduction"],["99.9%","Service Availability"],["500K+","Resources Monitored"],["<100ms","Dashboard Latency"]].map(([n,l])=>(
              <div className="stat-card" key={l}><div className="num">{n}</div><div className="label">{l}</div></div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
