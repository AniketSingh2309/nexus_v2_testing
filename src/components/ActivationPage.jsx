import { useState, useEffect } from "react";
import * as OTPAuth from "otpauth";
import QRCode from "qrcode";

/* ── helpers ── */
function buildTOTP(email, secret) {
  return new OTPAuth.TOTP({
    issuer: "MyCloudNexus",
    label: email,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  });
}

function pwStrength(p) {
  let s = 0;
  if (p.length >= 8)  s++;
  if (p.length >= 12) s++;
  if (/[A-Z]/.test(p)) s++;
  if (/[0-9]/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  return s; // 0-5
}

const STRENGTH_LABEL = ["Too short", "Weak", "Fair", "Good", "Strong", "Very strong"];
const STRENGTH_COLOR = ["#ef4444","#f97316","#eab308","#22c55e","#16a34a","#15803d"];

/* ═══════════════════════════════════════════════════════════════
   404 Page — CloudNexus header + full-width image with button
   overlaid on the left side, looking like part of the design
═══════════════════════════════════════════════════════════════ */
function Page404({ onBackToSetup, showBack }) {
  return (
    <div style={{
      height: "100vh",
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
      background: "#fff",
      fontFamily: "Inter, system-ui, Arial, sans-serif",
    }}>

      {/* ── CloudNexus Header ── */}
      <header style={{
        flexShrink: 0,
        background: "rgba(255,255,255,0.92)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid #e2e8f0",
        padding: "0 40px",
        height: 68,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 34, height: 34,
            background: "linear-gradient(135deg,#2563eb,#1d4ed8)",
            borderRadius: 9,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>
            </svg>
          </div>
          <span style={{ fontSize: 21, fontWeight: 800, letterSpacing: "-0.5px", color: "#0f172a" }}>
            MyCloud<span style={{ color: "#2563eb" }}>Nexus</span>
          </span>
        </div>
        <div style={{ fontSize: 13, color: "#94a3b8", fontWeight: 500 }}>
          Account Activation
        </div>
      </header>

      {/* ── 404 Image — centered, transparent hit-area over image's own button ── */}
      <div style={{
        position: "relative",
        flex: 1,
        minHeight: 0,
        overflow: "hidden",
        background: "#fefefe",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <img
          src="/images/404.png"
          alt="404 Page Not Found"
          style={{
            maxWidth: "100%",
            maxHeight: "100%",
            width: "auto",
            height: "auto",
            display: "block",
          }}
        />

        {/* Invisible hit-area precisely over the button drawn inside the image */}
        {showBack && (
          <div
            onClick={onBackToSetup}
            title="Back to Setting Up Your Account"
            style={{
              position: "absolute",
              top: "88%",
              left: "31%",
              width: "27%",
              height: "8.5%",
              cursor: "pointer",
              borderRadius: 50,
            }}
          />
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Step 1 — Set Password
═══════════════════════════════════════════════════════════════ */
function StepPassword({ email, name, onNext, onSkip }) {
  const [pw,   setPw]   = useState("");
  const [pw2,  setPw2]  = useState("");
  const [show, setShow] = useState(false);
  const [err,  setErr]  = useState("");

  const strength = pwStrength(pw);

  function handleNext() {
    if (pw.length < 8) { setErr("Password must be at least 8 characters."); return; }
    if (pw !== pw2)    { setErr("Passwords do not match."); return; }
    setErr("");
    onNext(pw);
  }

  return (
    <div style={{display:"flex",flexDirection:"column",gap:0}}>
      <div style={{padding:"8px 0 20px"}}>
        <p style={{margin:0,fontSize:14,color:"#64748b",lineHeight:1.6}}>
          Welcome, <strong style={{color:"#0f172a"}}>{name}</strong>! Set a strong password for <strong style={{color:"#0f172a"}}>{email}</strong>.
        </p>
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div>
          <label style={{fontSize:12,fontWeight:700,color:"#374151",display:"block",marginBottom:6,textTransform:"uppercase",letterSpacing:"0.4px"}}>New Password</label>
          <div style={{position:"relative"}}>
            <input
              type={show ? "text" : "password"}
              value={pw}
              onChange={e => { setPw(e.target.value); setErr(""); }}
              placeholder="Min. 8 characters"
              autoFocus
              style={{width:"100%",padding:"10px 40px 10px 12px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:14,fontFamily:"inherit",boxSizing:"border-box",outline:"none"}}
              onFocus={e => e.target.style.borderColor="#2563eb"}
              onBlur={e  => e.target.style.borderColor="#e2e8f0"}
            />
            <button onClick={() => setShow(s => !s)} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"#94a3b8",padding:2}}>
              {show
                ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              }
            </button>
          </div>
          {pw && (
            <div style={{marginTop:7}}>
              <div style={{display:"flex",gap:3,marginBottom:4}}>
                {[1,2,3,4,5].map(i => (
                  <div key={i} style={{flex:1,height:3,borderRadius:2,background: strength >= i ? STRENGTH_COLOR[strength] : "#e2e8f0",transition:"background 0.2s"}} />
                ))}
              </div>
              <div style={{fontSize:11,color:STRENGTH_COLOR[strength],fontWeight:600}}>{STRENGTH_LABEL[strength]}</div>
            </div>
          )}
        </div>

        <div>
          <label style={{fontSize:12,fontWeight:700,color:"#374151",display:"block",marginBottom:6,textTransform:"uppercase",letterSpacing:"0.4px"}}>Confirm Password</label>
          <input
            type={show ? "text" : "password"}
            value={pw2}
            onChange={e => { setPw2(e.target.value); setErr(""); }}
            placeholder="Re-enter password"
            onKeyDown={e => e.key === "Enter" && handleNext()}
            style={{width:"100%",padding:"10px 12px",border:`1.5px solid ${pw2 && pw !== pw2 ? "#ef4444" : "#e2e8f0"}`,borderRadius:9,fontSize:14,fontFamily:"inherit",boxSizing:"border-box",outline:"none"}}
            onFocus={e => e.target.style.borderColor=pw2&&pw!==pw2?"#ef4444":"#2563eb"}
            onBlur={e  => e.target.style.borderColor=pw2&&pw!==pw2?"#ef4444":"#e2e8f0"}
          />
          {pw2 && pw !== pw2 && <div style={{fontSize:12,color:"#ef4444",marginTop:4}}>Passwords do not match</div>}
        </div>

        {err && (
          <div style={{fontSize:13,color:"#dc2626",background:"#fef2f2",border:"1px solid #fecaca",borderRadius:8,padding:"9px 12px"}}>{err}</div>
        )}
      </div>

      <div style={{display:"flex",gap:10,marginTop:24}}>
        <button
          onClick={onSkip}
          style={{flex:1,padding:"11px 0",border:"1.5px solid #e2e8f0",borderRadius:9,background:"#f8fafc",color:"#64748b",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}
        >
          Skip
        </button>
        <button
          onClick={handleNext}
          style={{flex:2,padding:"11px 0",background:"linear-gradient(135deg,#2563eb,#1d4ed8)",color:"#fff",border:"none",borderRadius:9,fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 2px 12px rgba(37,99,235,0.3)"}}
        >
          Continue →
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Step 2 — Set Up MFA
═══════════════════════════════════════════════════════════════ */
function StepMFA({ email, onComplete, onSkip, saving }) {
  const [secret,  setSecret]  = useState("");
  const [qrUrl,   setQrUrl]   = useState("");
  const [code,    setCode]    = useState("");
  const [err,     setErr]     = useState("");
  const [copied,  setCopied]  = useState(false);

  useEffect(() => {
    const totp = new OTPAuth.TOTP({
      issuer: "MyCloudNexus",
      label: email,
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: new OTPAuth.Secret({ size: 20 }),
    });
    const s = totp.secret.base32;
    setSecret(s);
    QRCode.toDataURL(totp.toString(), { width: 200, margin: 2, color: { dark: "#0f172a", light: "#ffffff" } })
      .then(setQrUrl).catch(() => {});
  }, [email]);

  function handleVerify() {
    if (!code || code.length !== 6) { setErr("Enter the 6-digit code from your authenticator app."); return; }
    const totp  = buildTOTP(email, secret);
    const delta = totp.validate({ token: code, window: 6 });
    if (delta === null) { setErr("Incorrect code — try again."); return; }
    setErr("");
    onComplete(secret);
  }

  function copySecret() {
    navigator.clipboard.writeText(secret).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div style={{display:"flex",flexDirection:"column",gap:0}}>
      <div style={{padding:"0 0 20px"}}>
        <p style={{margin:0,fontSize:14,color:"#64748b",lineHeight:1.6}}>
          Scan the QR code with <strong>Google Authenticator</strong>, <strong>Authy</strong>, or any TOTP app. Then enter the 6-digit code.
        </p>
      </div>

      <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:16}}>
        {qrUrl
          ? <img src={qrUrl} alt="MFA QR Code" style={{width:180,height:180,borderRadius:12,border:"1px solid #e2e8f0",padding:8,background:"#fff"}} />
          : <div style={{width:180,height:180,borderRadius:12,border:"1px solid #e2e8f0",background:"#f8fafc",display:"flex",alignItems:"center",justifyContent:"center",color:"#94a3b8",fontSize:13}}>Generating…</div>
        }

        <div style={{width:"100%",background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:9,padding:"10px 14px"}}>
          <div style={{fontSize:11,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:5}}>Manual entry key</div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <code style={{flex:1,fontSize:12,fontFamily:"monospace",color:"#0f172a",letterSpacing:1,wordBreak:"break-all"}}>{secret}</code>
            <button onClick={copySecret} style={{fontSize:11,fontWeight:600,padding:"3px 10px",background:copied?"#dcfce7":"#eff6ff",color:copied?"#16a34a":"#2563eb",border:`1px solid ${copied?"#bbf7d0":"#bfdbfe"}`,borderRadius:6,cursor:"pointer",whiteSpace:"nowrap",fontFamily:"inherit"}}>
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>
      </div>

      <div style={{marginTop:20}}>
        <label style={{fontSize:12,fontWeight:700,color:"#374151",display:"block",marginBottom:6,textTransform:"uppercase",letterSpacing:"0.4px"}}>Enter 6-digit code</label>
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={code}
          onChange={e => { setCode(e.target.value.replace(/\D/g,"")); setErr(""); }}
          onKeyDown={e => e.key === "Enter" && handleVerify()}
          placeholder="000000"
          autoFocus
          style={{width:"100%",padding:"12px 14px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:22,fontFamily:"monospace",fontWeight:700,letterSpacing:6,textAlign:"center",boxSizing:"border-box",outline:"none"}}
          onFocus={e => e.target.style.borderColor="#2563eb"}
          onBlur={e  => e.target.style.borderColor="#e2e8f0"}
        />
        {err && <div style={{fontSize:13,color:"#dc2626",background:"#fef2f2",border:"1px solid #fecaca",borderRadius:8,padding:"9px 12px",marginTop:10}}>{err}</div>}
      </div>

      <div style={{display:"flex",gap:10,marginTop:24}}>
        <button
          onClick={onSkip}
          style={{flex:1,padding:"11px 0",border:"1.5px solid #e2e8f0",borderRadius:9,background:"#f8fafc",color:"#64748b",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}
        >
          Skip
        </button>
        <button
          onClick={handleVerify}
          disabled={saving}
          style={{flex:2,padding:"11px 0",background:"linear-gradient(135deg,#2563eb,#1d4ed8)",color:"#fff",border:"none",borderRadius:9,fontSize:14,fontWeight:700,cursor:saving?"not-allowed":"pointer",fontFamily:"inherit",opacity:saving?0.7:1,boxShadow:"0 2px 12px rgba(37,99,235,0.3)"}}
        >
          {saving ? "Activating…" : "Complete Setup ✓"}
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Main ActivationPage component
═══════════════════════════════════════════════════════════════ */
export default function ActivationPage({ token, onDone }) {
  const [status,   setStatus]   = useState("loading"); // loading|invalid|step_password|step_mfa|done|skipped
  const [userInfo, setUserInfo] = useState(null);      // {email, name}
  const [password, setPassword] = useState("");
  const [saving,   setSaving]   = useState(false);
  const [saveErr,  setSaveErr]  = useState("");

  useEffect(() => {
    if (!token) { setStatus("invalid"); return; }
    fetch(`/activate/verify?token=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then(d => {
        if (d.valid) { setUserInfo({ email: d.email, name: d.name }); setStatus("step_password"); }
        else          setStatus("invalid");
      })
      .catch(() => setStatus("invalid"));
  }, [token]);

  async function handleComplete(totpSecret) {
    setSaving(true); setSaveErr("");
    try {
      const r = await fetch("/activate/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, totpSecret }),
      });
      const d = await r.json();
      if (!r.ok) { setSaveErr(d.error || "Failed to activate. Try again."); setSaving(false); return; }
      setStatus("done");
    } catch { setSaveErr("Network error. Try again."); }
    setSaving(false);
  }

  /* ── Loading ── */
  if (status === "loading") {
    return (
      <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#f0f4ff",fontFamily:"Inter,system-ui,Arial,sans-serif"}}>
        <div style={{textAlign:"center"}}>
          <div style={{width:40,height:40,border:"4px solid #e2e8f0",borderTopColor:"#2563eb",borderRadius:"50%",animation:"spin 0.75s linear infinite",margin:"0 auto 16px"}}/>
          <div style={{fontSize:14,color:"#64748b"}}>Verifying your activation link…</div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  /* ── Invalid token → permanent 404 (no back button) ── */
  if (status === "invalid") return <Page404 showBack={false} />;

  /* ── User skipped → 404 with back button ── */
  if (status === "skipped") return <Page404 showBack onBackToSetup={() => setStatus("step_password")} />;

  /* ── Done ── */
  if (status === "done") {
    return (
      <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"linear-gradient(135deg,#f0f7ff,#e8f5e9)",fontFamily:"Inter,system-ui,Arial,sans-serif",padding:24}}>
        <div style={{background:"#fff",borderRadius:20,padding:"40px 36px",maxWidth:420,width:"100%",textAlign:"center",boxShadow:"0 24px 64px rgba(0,0,0,0.1)"}}>
          <div style={{width:64,height:64,background:"#dcfce7",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 20px"}}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <h2 style={{fontSize:22,fontWeight:800,color:"#0f172a",margin:"0 0 10px"}}>Account Activated!</h2>
          <p style={{fontSize:14,color:"#64748b",lineHeight:1.6,margin:"0 0 28px"}}>
            Your MyCloudNexus admin account is ready. Sign in with your new password to get started.
          </p>
          <button
            onClick={onDone}
            style={{width:"100%",padding:"13px 0",background:"linear-gradient(135deg,#2563eb,#1d4ed8)",color:"#fff",border:"none",borderRadius:10,fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 4px 16px rgba(37,99,235,0.3)"}}
          >
            Go to Login →
          </button>
        </div>
      </div>
    );
  }

  /* ── Step wizard (password + MFA) — shown as overlay over blurred background ── */
  const step = status === "step_password" ? 1 : 2;

  return (
    <div style={{minHeight:"100vh",fontFamily:"Inter,system-ui,Arial,sans-serif",position:"relative",overflow:"hidden"}}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeInUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
      `}</style>

      {/* Background — clean white with subtle blue accents */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 0,
        background: "linear-gradient(135deg,#f0f7ff 0%,#ffffff 50%,#f0f4ff 100%)",
      }}>
        <div style={{position:"absolute",inset:0,opacity:0.5,backgroundImage:"radial-gradient(circle at 25px 25px, #bfdbfe 1px, transparent 0)",backgroundSize:"50px 50px"}}/>
        <div style={{position:"absolute",top:"20%",left:"10%",width:300,height:300,borderRadius:"50%",background:"radial-gradient(circle,rgba(37,99,235,0.07),transparent 70%)"}}/>
        <div style={{position:"absolute",bottom:"15%",right:"8%",width:400,height:400,borderRadius:"50%",background:"radial-gradient(circle,rgba(99,102,241,0.06),transparent 70%)"}}/>
      </div>

      {/* Light overlay */}
      <div style={{position:"fixed",inset:0,zIndex:1,background:"rgba(240,247,255,0.6)",backdropFilter:"blur(4px)"}}/>

      {/* Setup Card */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 2,
        display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
      }}>
        <div style={{
          background: "#fff",
          borderRadius: 20,
          width: "100%",
          maxWidth: 460,
          boxShadow: "0 24px 60px rgba(37,99,235,0.12), 0 0 0 1px rgba(37,99,235,0.08)",
          animation: "fadeInUp 0.35s ease-out",
          overflow: "hidden",
        }}>
          {/* Card header */}
          <div style={{background:"linear-gradient(135deg,#1e40af,#2563eb)",padding:"24px 28px"}}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
              <div style={{width:38,height:38,background:"rgba(255,255,255,0.15)",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center"}}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              </div>
              <div>
                <div style={{color:"#fff",fontWeight:800,fontSize:16,letterSpacing:"-0.2px"}}>Account Setup</div>
                <div style={{color:"rgba(255,255,255,0.7)",fontSize:12}}>Required before accessing the portal</div>
              </div>
            </div>
            {/* Progress */}
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              {["Set Password","Configure MFA"].map((label,i) => (
                <div key={i} style={{flex:1,display:"flex",flexDirection:"column",gap:4}}>
                  <div style={{display:"flex",alignItems:"center",gap:5}}>
                    <div style={{
                      width:20,height:20,borderRadius:"50%",
                      background: step > i+1 ? "#22c55e" : step === i+1 ? "#fff" : "rgba(255,255,255,0.2)",
                      display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,
                      fontSize:10,fontWeight:700,
                      color: step === i+1 ? "#2563eb" : step > i+1 ? "#fff" : "rgba(255,255,255,0.5)",
                    }}>
                      {step > i+1 ? "✓" : i+1}
                    </div>
                    <span style={{fontSize:11,fontWeight:600,color: step===i+1?"#fff":"rgba(255,255,255,0.5)"}}>{label}</span>
                  </div>
                  <div style={{height:3,borderRadius:2,background: step > i+1 ? "#22c55e" : step===i+1 ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.15)"}}/>
                </div>
              ))}
            </div>
          </div>

          {/* Card body */}
          <div style={{padding:"24px 28px"}}>
            {saveErr && (
              <div style={{marginBottom:16,fontSize:13,color:"#dc2626",background:"#fef2f2",border:"1px solid #fecaca",borderRadius:8,padding:"10px 14px"}}>{saveErr}</div>
            )}

            {status === "step_password" && (
              <StepPassword
                email={userInfo.email}
                name={userInfo.name}
                onNext={pw => { setPassword(pw); setStatus("step_mfa"); }}
                onSkip={() => setStatus("skipped")}
              />
            )}
            {status === "step_mfa" && (
              <StepMFA
                email={userInfo.email}
                onComplete={handleComplete}
                onSkip={() => setStatus("skipped")}
                saving={saving}
              />
            )}
          </div>

          {/* Security note */}
          <div style={{padding:"14px 28px",background:"#f8fafc",borderTop:"1px solid #f1f5f9",display:"flex",alignItems:"center",gap:8}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            <span style={{fontSize:11,color:"#94a3b8"}}>Setup is mandatory. Closing or skipping will block portal access.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
