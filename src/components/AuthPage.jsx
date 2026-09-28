import { useState } from "react";
import * as OTPAuth from "otpauth";
import QRCode from "qrcode";

const BACKEND      = "";
const ADMIN_USERS  = "cn_admin_users";
const SETTINGS_KEY = "cn_settings";

function getMFAEnabled() {
  try { return !!JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}").mfaForUsers; } catch { return false; }
}
function saveTOTPSecret(email, secret) {
  try {
    const users = JSON.parse(localStorage.getItem(ADMIN_USERS) || "[]");
    const updated = users.map(u =>
      u.email.toLowerCase() === email.toLowerCase()
        ? { ...u, totpSecret: secret, mfaVerified: true }
        : u
    );
    localStorage.setItem(ADMIN_USERS, JSON.stringify(updated));
  } catch {}
}
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

export default function AuthPage({ onLogin, onBack, initialTab = "login" }) {
  const [tab,         setTab]         = useState(initialTab); // "login" | "register"
  const [email,       setEmail]       = useState("");
  const [password,    setPassword]    = useState("");
  const [showPass,    setShowPass]    = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [alert,       setAlert]       = useState(null);

  // Registration form
  const [regStep,       setRegStep]       = useState(1);
  const [regFirstName,  setRegFirstName]  = useState("");
  const [regLastName,   setRegLastName]   = useState("");
  const [regEmail,      setRegEmail]      = useState("");
  const [regPassword,   setRegPassword]   = useState("");
  const [regShowPass,   setRegShowPass]   = useState(false);
  const [regCompany,    setRegCompany]    = useState("");
  const [regSubdomain,  setRegSubdomain]  = useState("");
  const [regIndustry,   setRegIndustry]   = useState("");
  const [regCountry,    setRegCountry]    = useState("");
  const [regTimezone,   setRegTimezone]   = useState("");

  // Domain OTP verification
  const [otpSent,       setOtpSent]       = useState(false);
  const [otpCode,       setOtpCode]       = useState("");
  const [otpVerified,   setOtpVerified]   = useState(false);
  const [otpLoading,    setOtpLoading]    = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [regFullEmail,  setRegFullEmail]  = useState("");

  // MFA flow
  const [step,        setStep]        = useState("login"); // "login" | "setup-mfa" | "verify-mfa"
  const [pendingUser, setPendingUser] = useState(null);
  const [totpSecret,  setTotpSecret]  = useState("");
  const [qrDataUrl,   setQrDataUrl]   = useState("");
  const [code,        setCode]        = useState("");
  const [codeLoading, setCodeLoading] = useState(false);
  const [showTotpKey, setShowTotpKey] = useState(false);

  function showAlert(type, msg, ms = 6000) {
    setAlert({ type, msg });
    if (ms > 0) setTimeout(() => setAlert(null), ms);
  }

  /* After password is verified, decide MFA path */
  async function proceedWithUser(userData) {
    const requireMFA = userData.isAdmin || userData.mfaEnabled || getMFAEnabled();
    if (!requireMFA) {
      onLogin(userData);
      return;
    }

    setPendingUser(userData);

    // Check backend for existing TOTP secret (authoritative source)
    try {
      const res = await fetch(`${BACKEND}/auth/user/${encodeURIComponent(userData.email)}`);
      if (res.ok) {
        const dbUser = await res.json();
        if (dbUser.totpSecret && dbUser.mfaEnabled) {
          setTotpSecret(dbUser.totpSecret);
          setCode("");
          setStep("verify-mfa");
          return;
        }
      }
    } catch {}

    // Fallback: check localStorage for legacy users
    const adminUsers = JSON.parse(localStorage.getItem(ADMIN_USERS) || "[]");
    const record = adminUsers.find(u => u.email.toLowerCase() === userData.email.toLowerCase());
    if (record?.totpSecret && record?.mfaVerified) {
      setTotpSecret(record.totpSecret);
      setCode("");
      setStep("verify-mfa");
      return;
    }

    // No TOTP set up yet → show QR code for first-time setup
    const totp = new OTPAuth.TOTP({
      issuer: "MyCloudNexus",
      label: userData.email,
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: new OTPAuth.Secret({ size: 20 }),
    });
    const secret  = totp.secret.base32;
    const dataUrl = await QRCode.toDataURL(totp.toString(), {
      width: 220, margin: 2,
      color: { dark: "#0f172a", light: "#ffffff" },
    });
    setTotpSecret(secret);
    setQrDataUrl(dataUrl);
    setCode("");
    setStep("setup-mfa");
  }

  /* Login — password check */
  async function handleLogin() {
    if (!email || !password) { showAlert("red", "Enter your email and password."); return; }
    setAlert(null);

    // Always try the backend first — it has the authoritative role, isAdmin, and orgAdmin values.
    // This ensures co-admins and promoted users are routed correctly.
    setLoading(true);
    let success = false;
    try {
      const res = await fetch(`${BACKEND}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        const data = await res.json();
        setLoading(false);
        await proceedWithUser(data.user);
        success = true;
      } else {
        // Backend returned an error (wrong password, deleted user, etc.)
        const err = await res.json().catch(() => ({}));
        setLoading(false);
        showAlert("red", err.error || "Invalid email or password.");
        return;
      }
    } catch {
      // Backend unreachable — fall back to localStorage (legacy users only)
      try {
        const adminUsers = JSON.parse(localStorage.getItem(ADMIN_USERS) || "[]");
        const match = adminUsers.find(
          u => u.email.toLowerCase() === email.toLowerCase() && u.password === password
        );
        if (match) {
          setLoading(false);
          await proceedWithUser({ name: match.name, email: match.email, tools: match.tools });
          return;
        }
      } catch {}
      setLoading(false);
      showAlert("red", "Cannot reach the server. Please try again.");
    }
  }

  /* Domain OTP — send verification code */
  async function handleSendOtp() {
    const fullEmail = regFullEmail.trim();
    if (!fullEmail || !fullEmail.includes('@')) { showAlert("red", "Enter a valid email."); return; }
    const emailDomain = fullEmail.split('@')[1]?.toLowerCase();
    if (emailDomain !== regSubdomain.toLowerCase().trim()) {
      showAlert("red", `Email must be from @${regSubdomain}`);
      return;
    }
    setOtpLoading(true);
    try {
      const res = await fetch(`${BACKEND}/auth/send-domain-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: fullEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setOtpSent(true);
      showAlert("green", `Verification code sent to ${fullEmail}`);
    } catch (e) { showAlert("red", e.message); }
    setOtpLoading(false);
  }

  /* Domain OTP — verify code */
  async function handleVerifyOtp() {
    if (!otpCode || otpCode.length !== 6) { showAlert("red", "Enter the 6-digit code."); return; }
    setVerifyLoading(true);
    try {
      const res = await fetch(`${BACKEND}/auth/verify-domain-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: regFullEmail.trim(), otp: otpCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setOtpVerified(true);
      setRegEmail(regFullEmail.trim());
      showAlert("green", "Domain verified successfully!");
    } catch (e) { showAlert("red", e.message); }
    setVerifyLoading(false);
  }

  /* Registration — create demo trial account */
  async function handleRegister() {
    if (!regFirstName || !regLastName || !regFullEmail || !regPassword) {
      showAlert("red", "Please fill in all fields.");
      return;
    }
    if (!otpVerified) {
      showAlert("red", "Please verify your domain email first.");
      return;
    }
    const emailName = (regFullEmail.split('@')[0] || '').toLowerCase();
    const domainName = (regSubdomain || '').toLowerCase().split('.')[0];
    const pwdLower = regPassword.toLowerCase();
    if (regPassword.length < 12) { showAlert("red", "Password must be at least 12 characters."); return; }
    if (!/[A-Z]/.test(regPassword)) { showAlert("red", "Password must include an uppercase letter."); return; }
    if (!/[0-9]/.test(regPassword)) { showAlert("red", "Password must include a number."); return; }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(regPassword)) { showAlert("red", "Password must include a special character."); return; }
    if (emailName && emailName.length > 2 && pwdLower.includes(emailName)) { showAlert("red", "Password must not contain your email name."); return; }
    if (domainName && domainName.length > 2 && pwdLower.includes(domainName)) { showAlert("red", "Password must not contain your domain name."); return; }
    setAlert(null);
    setLoading(true);
    try {
      const emailForReg = regFullEmail.trim();
      const totp = new OTPAuth.TOTP({
        issuer: "MyCloudNexus",
        label: emailForReg,
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        secret: new OTPAuth.Secret({ size: 20 }),
      });
      const secret  = totp.secret.base32;
      const dataUrl = await QRCode.toDataURL(totp.toString(), {
        width: 220, margin: 2,
        color: { dark: "#0f172a", light: "#ffffff" },
      });
      setPendingUser({ firstName: regFirstName, lastName: regLastName, email: emailForReg, password: regPassword, companyName: regCompany, domain: regSubdomain, industry: regIndustry, country: regCountry, timezone: regTimezone });
      setTotpSecret(secret);
      setQrDataUrl(dataUrl);
      setCode("");
      setStep("setup-mfa");
    } catch {
      showAlert("red", "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  /* MFA — first-time setup: verify the code, then save secret */
  async function handleSetupMFA() {
    if (!code || code.length !== 6) { showAlert("red", "Enter the 6-digit code from your authenticator app."); return; }
    setCodeLoading(true);
    try {
      const totp  = buildTOTP(pendingUser.email, totpSecret);
      const delta = totp.validate({ token: code, window: 6 });
      if (delta === null) {
        showAlert("red", "Invalid code. Make sure you scanned the QR code correctly and that your phone clock is synced.");
        return;
      }

      // Registration flow — pendingUser has firstName
      if (pendingUser.firstName) {
        try {
          const regRes = await fetch(`${BACKEND}/auth/register-demo`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              firstName: pendingUser.firstName,
              lastName:  pendingUser.lastName,
              email:     pendingUser.email,
              password:  pendingUser.password,
              totpSecret,
              companyName: pendingUser.companyName,
              domain:     pendingUser.domain,
              industry:   pendingUser.industry,
              country:    pendingUser.country,
              timezone:   pendingUser.timezone,
            }),
          });
          if (!regRes.ok) {
            const err = await regRes.json().catch(() => ({}));
            showAlert("red", err.error || "Registration failed. Please try again.");
            return;
          }
          backToLogin("Account created successfully! Please sign in with your credentials.");
        } catch {
          showAlert("red", "Cannot reach the server. Please try again.");
        }
        return;
      }

      // Normal login MFA flow
      saveTOTPSecret(pendingUser.email, totpSecret);
      // Persist secret to backend so server can verify on future logins
      fetch(`${BACKEND}/auth/verify-mfa`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: pendingUser.email, totpSecret }),
      }).catch(() => {});
      onLogin(pendingUser);
    } finally {
      setCodeLoading(false);
    }
  }

  /* MFA — returning user: just verify the code */
  function handleVerifyMFA() {
    if (!code || code.length !== 6) { showAlert("red", "Enter the 6-digit code from your authenticator app."); return; }
    setCodeLoading(true);
    try {
      const totp  = buildTOTP(pendingUser.email, totpSecret);
      const delta = totp.validate({ token: code, window: 6 });
      if (delta === null) {
        showAlert("red", "Invalid code. The code refreshes every 30 seconds — try the current one.");
        return;
      }
      onLogin(pendingUser);
    } finally {
      setCodeLoading(false);
    }
  }

  function backToLogin(successMsg = null) {
    setStep("login");
    setTab("login");
    setRegStep(1);
    setCode("");
    setAlert(successMsg ? { type: "green", msg: successMsg } : null);
    setPendingUser(null);
    setTotpSecret("");
    setQrDataUrl("");
    setOtpSent(false);
    setOtpCode("");
    setOtpVerified(false);
    setOtpLoading(false);
    setVerifyLoading(false);
    setRegFullEmail("");
    setShowTotpKey(false);
  }

  /* ── Render ── */
  return (
    <div className="auth-page">

      {/* Left — cover image */}
      <div className="auth-left">
        <div className="auth-left-content">
          <img
            src={`${import.meta.env.BASE_URL}images/login-photo.png`}
            alt="MyCloudNexus Platform"
            style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }}
          />
        </div>
      </div>

      {/* Right — form area */}
      <div className="auth-right">
        <div className="auth-form-wrap">

          {/* ── STEP: login / register ── */}
          {step === "login" && (
            <>
              {/* Tab switcher — hidden; each entry point (Login / Start Free Trial) opens its own dedicated page */}
              <div style={{ display: "none", gap:4, padding:4, background:"var(--bg-muted, rgba(255,255,255,0.06))", borderRadius:10, marginBottom:24 }}>
                <button
                  type="button"
                  onClick={() => { setTab("login"); setAlert(null); }}
                  style={{
                    flex:1, padding:"9px 0", borderRadius:8, border:"none", cursor:"pointer",
                    fontWeight:600, fontSize:14, transition:"all 0.2s",
                    background: tab === "login" ? "var(--primary, #2563eb)" : "transparent",
                    color:      tab === "login" ? "#fff" : "var(--text-muted, #94a3b8)",
                  }}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => { setTab("register"); setRegStep(1); setAlert(null); setOtpSent(false); setOtpCode(""); setOtpVerified(false); setRegFullEmail(""); }}
                  style={{
                    flex:1, padding:"9px 0", borderRadius:8, border:"none", cursor:"pointer",
                    fontWeight:600, fontSize:14, transition:"all 0.2s",
                    background: tab === "register" ? "var(--primary, #2563eb)" : "transparent",
                    color:      tab === "register" ? "#fff" : "var(--text-muted, #94a3b8)",
                  }}
                >
                  Create Account
                </button>
              </div>

              {/* ── LOGIN TAB ── */}
              {tab === "login" && (
                <>
                  <div className="auth-form-header">
                    <h2>Welcome back</h2>
                    <p>Sign in to your MyCloudNexus account.</p>
                  </div>

                  <div className="field">
                    <label className="field-label">Email address</label>
                    <input
                      className="field-input"
                      type="email"
                      placeholder="you@company.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      autoFocus
                    />
                  </div>

                  <div className="field">
                    <label className="field-label">Password</label>
                    <div style={{ position: "relative" }}>
                      <input
                        className="field-input"
                        type={showPass ? "text" : "password"}
                        placeholder="Enter your password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && handleLogin()}
                        style={{ paddingRight: 42 }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(p => !p)}
                        style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:"var(--text-muted)", padding:2, display:"flex", alignItems:"center" }}
                      >
                        {showPass ? (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                        ) : (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    className="btn btn-primary btn-lg"
                    style={{ width: "100%", marginTop: 4 }}
                    onClick={handleLogin}
                    disabled={loading}
                  >
                    {loading ? "Signing in..." : "Sign In"}
                  </button>

                  <div className="auth-switch">
                    <button className="btn btn-text btn-sm" onClick={onBack}>← Back to home</button>
                  </div>
                </>
              )}

              {/* ── REGISTER TAB ── */}
              {tab === "register" && (
                <>
                  <div className="auth-form-header">
                    <h2>Create your account</h2>
                    <p>Start your free demo trial of MyCloudNexus.</p>
                  </div>

                  {/* Step 1: Company Information */}
                  {regStep === 1 && (
                    <>
                      <div style={{ fontSize:15, fontWeight:700, color:"var(--text, #0f172a)", marginBottom:14 }}>Company Information</div>

                      <div className="field">
                        <label className="field-label">Company Name *</label>
                        <input
                          className="field-input"
                          type="text"
                          placeholder="Your company name"
                          value={regCompany}
                          onChange={e => setRegCompany(e.target.value)}
                          autoFocus
                        />
                      </div>

                      <div className="field">
                        <label className="field-label">Domain *</label>
                        <input
                          className="field-input"
                          type="text"
                          placeholder="e.g. example.com"
                          value={regSubdomain}
                          onChange={e => setRegSubdomain(e.target.value)}
                        />
                      </div>

                      <div className="field">
                        <label className="field-label">Industry</label>
                        <select
                          className="field-input"
                          value={regIndustry}
                          onChange={e => setRegIndustry(e.target.value)}
                          style={{ appearance:"auto" }}
                        >
                          <option value="">Select industry</option>
                          <option value="Technology">Technology</option>
                          <option value="Healthcare">Healthcare</option>
                          <option value="Finance">Finance</option>
                          <option value="E-commerce">E-commerce</option>
                          <option value="Education">Education</option>
                          <option value="Manufacturing">Manufacturing</option>
                          <option value="Media">Media</option>
                          <option value="Government">Government</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      <div className="field">
                        <label className="field-label">Country</label>
                        <input
                          className="field-input"
                          type="text"
                          placeholder="e.g. India"
                          value={regCountry}
                          onChange={e => setRegCountry(e.target.value)}
                        />
                      </div>

                      <div className="field">
                        <label className="field-label">Timezone</label>
                        <select
                          className="field-input"
                          value={regTimezone}
                          onChange={e => setRegTimezone(e.target.value)}
                          style={{ appearance:"auto" }}
                        >
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

                      <button
                        className="btn btn-primary btn-lg"
                        style={{ width:"100%", marginTop:4 }}
                        onClick={() => {
                          if (!regCompany.trim()) { showAlert("red", "Company name is required."); return; }
                          if (!regSubdomain.trim()) { showAlert("red", "Domain is required."); return; }
                          setAlert(null);
                          setRegStep(2);
                        }}
                      >
                        Next
                      </button>

                      {/* Step indicator */}
                      <div style={{ display:"flex", justifyContent:"center", gap:8, marginTop:18 }}>
                        <div style={{ width:8, height:8, borderRadius:"50%", background:"var(--primary, #2563eb)" }} />
                        <div style={{ width:8, height:8, borderRadius:"50%", background:"var(--bg-muted, #334155)" }} />
                        <div style={{ width:8, height:8, borderRadius:"50%", background:"var(--bg-muted, #334155)" }} />
                      </div>
                    </>
                  )}

                  {/* Step 2: Domain & Email Verification */}
                  {regStep === 2 && (
                    <>
                      <div style={{ fontSize:15, fontWeight:700, color:"var(--text, #0f172a)", marginBottom:14 }}>Domain & Email Verification</div>

                      {/* Display domain from step 1 */}
                      <div className="field">
                        <label className="field-label">Domain</label>
                        <div
                          style={{
                            padding:"10px 14px", borderRadius:8, fontSize:14, fontWeight:600,
                            background:"var(--bg-muted, rgba(255,255,255,0.06))",
                            border:"1.5px solid var(--border, #334155)",
                            color:"var(--text, #e2e8f0)",
                          }}
                        >
                          {regSubdomain}
                        </div>
                      </div>

                      {/* Email input with domain suffix */}
                      <div className="field">
                        <label className="field-label">Email</label>
                        <input
                          className="field-input"
                          type="email"
                          placeholder={`you@${regSubdomain}`}
                          value={regFullEmail}
                          onChange={e => setRegFullEmail(e.target.value)}
                          disabled={otpVerified}
                          autoFocus
                        />
                        {!otpVerified && (
                          <div style={{ fontSize:12, color:"var(--text-muted)", marginTop:4 }}>
                            Enter your full email address with @{regSubdomain}
                          </div>
                        )}
                      </div>

                      {/* Send OTP button */}
                      {!otpSent && !otpVerified && (
                        <button
                          className="btn btn-primary btn-lg"
                          style={{ width:"100%", marginTop:4 }}
                          onClick={handleSendOtp}
                          disabled={otpLoading}
                        >
                          {otpLoading ? "Sending..." : "Send Verification Code"}
                        </button>
                      )}

                      {/* OTP input after code sent */}
                      {otpSent && !otpVerified && (
                        <>
                          <div className="field">
                            <label className="field-label">Verification Code</label>
                            <input
                              className="field-input"
                              maxLength={6}
                              placeholder="000000"
                              value={otpCode}
                              onChange={e => setOtpCode(e.target.value.replace(/\D/g, ""))}
                              onKeyDown={e => e.key === "Enter" && otpCode.length === 6 && handleVerifyOtp()}
                              style={{ textAlign:"center", fontSize:20, fontWeight:700, letterSpacing:6 }}
                            />
                          </div>
                          <button
                            className="btn btn-primary btn-lg"
                            style={{ width:"100%", marginTop:4 }}
                            onClick={handleVerifyOtp}
                            disabled={verifyLoading || otpCode.length !== 6}
                          >
                            {verifyLoading ? "Verifying..." : "Verify"}
                          </button>
                          <button
                            className="btn btn-text btn-sm"
                            style={{ width:"100%", marginTop:4, textAlign:"center" }}
                            onClick={handleSendOtp}
                            disabled={otpLoading}
                          >
                            {otpLoading ? "Resending..." : "Resend code"}
                          </button>
                        </>
                      )}

                      {/* Domain Verified badge + admin fields */}
                      {otpVerified && (
                        <>
                          <div style={{
                            display:"flex", alignItems:"center", gap:8, padding:"10px 14px",
                            background:"rgba(34,197,94,0.1)", border:"1.5px solid rgba(34,197,94,0.3)",
                            borderRadius:8, marginBottom:12, marginTop:4,
                          }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M20 6L9 17l-5-5"/>
                            </svg>
                            <span style={{ fontSize:14, fontWeight:600, color:"#22c55e" }}>Domain Verified</span>
                          </div>

                          <div style={{ display:"flex", gap:12 }}>
                            <div className="field" style={{ flex:1 }}>
                              <label className="field-label">First name</label>
                              <input
                                className="field-input"
                                type="text"
                                placeholder="Jane"
                                value={regFirstName}
                                onChange={e => setRegFirstName(e.target.value)}
                              />
                            </div>
                            <div className="field" style={{ flex:1 }}>
                              <label className="field-label">Last name</label>
                              <input
                                className="field-input"
                                type="text"
                                placeholder="Doe"
                                value={regLastName}
                                onChange={e => setRegLastName(e.target.value)}
                              />
                            </div>
                          </div>

                          <div className="field">
                            <label className="field-label">Password</label>
                            <div style={{ position: "relative" }}>
                              <input
                                className="field-input"
                                type={regShowPass ? "text" : "password"}
                                placeholder=""
                                value={regPassword}
                                onChange={e => setRegPassword(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && handleRegister()}
                                style={{ paddingRight: 42 }}
                              />
                              <button
                                type="button"
                                onClick={() => setRegShowPass(p => !p)}
                                style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:"var(--text-muted)", padding:2, display:"flex", alignItems:"center" }}
                              >
                                {regShowPass ? (
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                                ) : (
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                )}
                              </button>
                            </div>
                            <div style={{ marginTop: 8, fontSize: 11, color: "var(--text-muted, #94a3b8)", lineHeight: 1.7 }}>
                              {[
                                { ok: regPassword.length >= 12, text: "Minimum 12 characters" },
                                { ok: /[A-Z]/.test(regPassword), text: "One uppercase letter" },
                                { ok: /[0-9]/.test(regPassword), text: "One number" },
                                { ok: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(regPassword), text: "One special character" },
                                { ok: !(regFullEmail.split('@')[0]?.toLowerCase().length > 2 && regPassword.toLowerCase().includes(regFullEmail.split('@')[0]?.toLowerCase())), text: "Must not contain your email name" },
                                { ok: !(regSubdomain?.toLowerCase().split('.')[0]?.length > 2 && regPassword.toLowerCase().includes(regSubdomain?.toLowerCase().split('.')[0])), text: "Must not contain your domain name" },
                              ].map((r, i) => (
                                <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, color: !regPassword ? "var(--text-muted, #94a3b8)" : r.ok ? "#22c55e" : "#ef4444" }}>
                                  <span style={{ fontSize: 10 }}>{!regPassword ? "—" : r.ok ? "+" : "x"}</span>
                                  <span>{r.text}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      )}

                      {/* Back / Next buttons */}
                      <div style={{ display:"flex", gap:12, marginTop:4 }}>
                        <button
                          className="btn btn-lg"
                          style={{ flex:1, background:"transparent", border:"1.5px solid var(--border, #334155)", color:"var(--text, #e2e8f0)" }}
                          onClick={() => { setAlert(null); setRegStep(1); }}
                        >
                          Back
                        </button>
                        {otpVerified && (
                          <button
                            className="btn btn-primary btn-lg"
                            style={{ flex:1 }}
                            onClick={handleRegister}
                            disabled={loading}
                          >
                            {loading ? "Setting up..." : "Next"}
                          </button>
                        )}
                      </div>

                      {/* Step indicator */}
                      <div style={{ display:"flex", justifyContent:"center", gap:8, marginTop:18 }}>
                        <div style={{ width:8, height:8, borderRadius:"50%", background:"var(--bg-muted, #334155)" }} />
                        <div style={{ width:8, height:8, borderRadius:"50%", background:"var(--primary, #2563eb)" }} />
                        <div style={{ width:8, height:8, borderRadius:"50%", background:"var(--bg-muted, #334155)" }} />
                      </div>
                    </>
                  )}

                </>
              )}
            </>
          )}

          {/* ── STEP: setup-mfa (first login) ── */}
          {step === "setup-mfa" && (
            <>
              <div className="auth-form-header">
                <h2>Set up authenticator</h2>
                <p>Your organisation requires two-factor authentication. Scan the QR code below with <strong>Google Authenticator</strong>, <strong>Authy</strong>, or any TOTP app, then enter the 6-digit code to continue.</p>
              </div>

              {qrDataUrl && (
                <div style={{ textAlign:"center", marginBottom:20 }}>
                  <div style={{ display:"inline-block", padding:14, background:"#fff", border:"1.5px solid var(--border)", borderRadius:14, boxShadow:"0 2px 12px rgba(0,0,0,0.07)" }}>
                    <img src={qrDataUrl} alt="Scan this QR code" style={{ display:"block", width:200, height:200 }} />
                  </div>
                  <div style={{ marginTop:12, display:"flex", alignItems:"center", justifyContent:"center", gap:6, fontSize:12, color:"var(--text-muted)" }}>
                    Can't scan?
                    <button
                      type="button"
                      onClick={() => setShowTotpKey(v => !v)}
                      title={showTotpKey ? "Hide manual key" : "Show manual entry key"}
                      style={{
                        width:18, height:18, borderRadius:"50%",
                        border:"1.5px solid var(--text-muted, #94a3b8)",
                        background: showTotpKey ? "var(--primary, #2563eb)" : "transparent",
                        color: showTotpKey ? "#fff" : "var(--text-muted, #94a3b8)",
                        cursor:"pointer", fontSize:11, fontWeight:800,
                        display:"inline-flex", alignItems:"center", justifyContent:"center",
                        lineHeight:1, padding:0, flexShrink:0,
                      }}
                    >i</button>
                  </div>
                  {showTotpKey && (
                    <div style={{ marginTop:8, fontFamily:"monospace", fontSize:12, fontWeight:700, color:"var(--text)", letterSpacing:1.5, background:"var(--bg)", padding:"6px 12px", borderRadius:7, display:"inline-block", wordBreak:"break-all", userSelect:"all", border:"1px solid var(--border)" }}>
                      {totpSecret}
                    </div>
                  )}
                </div>
              )}

              <div className="field">
                <label className="field-label">Verification code</label>
                <input
                  className="field-input"
                  maxLength={6}
                  placeholder="000000"
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, ""))}
                  onKeyDown={e => e.key === "Enter" && code.length === 6 && handleSetupMFA()}
                  autoFocus
                  style={{ textAlign:"center", fontSize:22, fontWeight:700, letterSpacing:8 }}
                />
                <div style={{ marginTop:6, fontSize:12, color:"var(--text-muted)", textAlign:"center" }}>
                  Code refreshes every 30 seconds — enter it promptly after scanning
                </div>
              </div>

              <button
                className="btn btn-primary btn-lg"
                style={{ width:"100%" }}
                onClick={handleSetupMFA}
                disabled={code.length !== 6 || codeLoading}
              >
                {codeLoading ? "Verifying…" : "Verify & Continue"}
              </button>
              <button className="btn btn-ghost btn-md" style={{ width:"100%", marginTop:8 }} onClick={backToLogin}>
                ← Back to sign in
              </button>
            </>
          )}

          {/* ── STEP: verify-mfa (returning user) ── */}
          {step === "verify-mfa" && (
            <>
              <div className="auth-form-header">
                <h2>Two-factor authentication</h2>
                <p>Open your authenticator app and enter the 6-digit code for <strong>MyCloudNexus</strong>.</p>
              </div>

              <div style={{ display:"flex", alignItems:"center", justifyContent:"center", marginBottom:20 }}>
                <div style={{ width:56, height:56, borderRadius:14, background:"linear-gradient(135deg,#eff6ff,#dbeafe)", border:"1.5px solid #bfdbfe", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/><circle cx="12" cy="16" r="1" fill="#2563eb"/>
                  </svg>
                </div>
              </div>

              <div className="field">
                <label className="field-label">Authentication code</label>
                <input
                  className="field-input"
                  maxLength={6}
                  placeholder="000000"
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, ""))}
                  onKeyDown={e => e.key === "Enter" && code.length === 6 && handleVerifyMFA()}
                  autoFocus
                  style={{ textAlign:"center", fontSize:22, fontWeight:700, letterSpacing:8 }}
                />
                <div style={{ marginTop:6, fontSize:12, color:"var(--text-muted)", textAlign:"center" }}>
                  The code refreshes every 30 seconds
                </div>
              </div>

              <button
                className="btn btn-primary btn-lg"
                style={{ width:"100%" }}
                onClick={handleVerifyMFA}
                disabled={code.length !== 6 || codeLoading}
              >
                {codeLoading ? "Verifying…" : "Verify & Sign In"}
              </button>
              <button className="btn btn-ghost btn-md" style={{ width:"100%", marginTop:8 }} onClick={backToLogin}>
                ← Back to sign in
              </button>
            </>
          )}

          {alert && <div className={`alert alert-${alert.type}`} style={{ marginTop:16 }}>{alert.msg}</div>}

        </div>
      </div>
    </div>
  );
}
