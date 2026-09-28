import React, { useState, useEffect } from 'react';
import { PROVIDER_META, SEVERITY_COLORS } from '../utils/theme';
import { api } from '../utils/api';
import ProviderLogo from './ProviderLogo';

const SEVERITY_DOT_COLORS = { critical: '#dc2626', warning: '#d97706', info: '#2563eb' };

// ── Daily Email Report Panel ─────────────────────────────────────────────────
function DailyReportPanel() {
  const [expanded,   setExpanded]   = useState(false);
  const [email,      setEmail]      = useState('');
  const [time,       setTime]       = useState('08:00');
  const [scheduled,  setScheduled]  = useState(false);
  const [savedEmail, setSavedEmail] = useState('');
  const [savedTime,  setSavedTime]  = useState('');
  const [saving,     setSaving]     = useState(false);
  const [sending,    setSending]    = useState(false);
  const [status,     setStatus]     = useState(null);

  // Load saved schedule on mount; pre-fill email with uid so lookups always match
  useEffect(() => {
    const uid = new URLSearchParams(window.location.search).get('uid') || '';
    if (!uid) return;
    setEmail(uid);
    api.getReportSchedule(uid).then(data => {
      if (data.schedule) {
        setEmail(data.schedule.email);
        setTime(data.schedule.time);
        setSavedEmail(data.schedule.email);
        setSavedTime(data.schedule.time);
        setScheduled(true);
      }
    }).catch(() => {});
  }, []);

  function showStatus(type, msg) {
    setStatus({ type, msg });
    setTimeout(() => setStatus(null), 5000);
  }

  async function handleSave() {
    if (!email || !email.includes('@')) return showStatus('error', 'Please enter a valid email address.');
    setSaving(true);
    try {
      await api.saveReportSchedule(email, time);
      setSavedEmail(email);
      setSavedTime(time);
      setScheduled(true);
      showStatus('success', `Daily report scheduled at ${time} for ${email}`);
    } catch (e) {
      showStatus('error', e.message || 'Failed to save schedule. Check backend connection.');
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove() {
    if (!savedEmail) return;
    try {
      await api.deleteReportSchedule(savedEmail);
      setScheduled(false);
      setSavedEmail('');
      setSavedTime('');
      setEmail('');
      showStatus('success', 'Daily report schedule removed.');
    } catch (e) {
      showStatus('error', e.message || 'Failed to remove schedule.');
    }
  }

  async function handleSendNow() {
    const target = email || savedEmail;
    if (!target || !target.includes('@')) return showStatus('error', 'Enter a valid email address first.');
    setSending(true);
    setStatus(null);
    try {
      await api.sendReportNow(target);
      showStatus('success', `Report sent to ${target} — check your inbox!`);
    } catch (e) {
      if (e.message === 'ZOHO_AUTH_FAILED') {
        setStatus({ type: 'zoho_fix' });
      } else {
        showStatus('error', e.message || 'Failed to send report.');
      }
    } finally {
      setSending(false);
    }
  }

  const slots = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      const hStr = h.toString().padStart(2, '0');
      const mStr = m.toString().padStart(2, '0');
      const period = h < 12 ? 'AM' : 'PM';
      const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
      slots.push({ value: `${hStr}:${mStr}`, label: `${h12}:${mStr} ${period}` });
    }
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(59,130,246,0.06) 0%, rgba(139,92,246,0.06) 100%)',
      border: '1px solid rgba(59,130,246,0.2)',
      borderRadius: 12,
      marginBottom: 18,
      overflow: 'hidden',
    }}>
      <button
        onClick={() => setExpanded(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 18px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 8,
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0,
          }}>RPT</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>Daily Email Reports</div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>
              {scheduled
                ? `Active — sent daily at ${savedTime} to ${savedEmail}`
                : 'Schedule automated daily infrastructure summaries'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {scheduled && (
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20,
              background: 'rgba(22,163,74,0.12)', color: '#16a34a', letterSpacing: 0.5,
            }}>ACTIVE</span>
          )}
          <span style={{ color: 'var(--text3)', fontSize: 14, transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▾</span>
        </div>
      </button>

      {expanded && (
        <div style={{ padding: '0 18px 18px', borderTop: '1px solid rgba(59,130,246,0.12)' }}>
          <div style={{ paddingTop: 16, display: 'grid', gridTemplateColumns: '1fr auto', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}>
                Recipient Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com"
                style={{
                  width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13,
                  border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text1)',
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}>
                Daily Send Time
              </label>
              <select
                value={time}
                onChange={e => setTime(e.target.value)}
                style={{
                  padding: '9px 12px', borderRadius: 8, fontSize: 13,
                  border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text1)',
                  outline: 'none', cursor: 'pointer', minWidth: 130,
                }}
              >
                {slots.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>

          <div style={{
            marginTop: 12, padding: '10px 14px', borderRadius: 8,
            background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.12)',
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#3b82f6', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>
              Report Includes
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 16px' }}>
              {['Daily alert summary', 'Services health status', 'Per-provider breakdown', 'Critical issues list', 'Resource health table', 'Infrastructure overview'].map(item => (
                <div key={item} style={{ fontSize: 11, color: 'var(--text2)', display:'flex', alignItems:'center', gap:5 }}>
                  <span style={{ width:4, height:4, borderRadius:'50%', background:'#3b82f6', display:'inline-block', flexShrink:0 }} />
                  {item}
                </div>
              ))}
            </div>
          </div>

          {status && status.type !== 'zoho_fix' && (
            <div style={{
              marginTop: 10, padding: '9px 12px', borderRadius: 8, fontSize: 12, fontWeight: 500,
              background: status.type === 'success' ? 'rgba(22,163,74,0.1)' : 'rgba(220,38,38,0.1)',
              border: `1px solid ${status.type === 'success' ? 'rgba(22,163,74,0.25)' : 'rgba(220,38,38,0.25)'}`,
              color: status.type === 'success' ? '#16a34a' : '#dc2626',
            }}>
              {status.msg}
            </div>
          )}

          {status && status.type === 'zoho_fix' && (
            <div style={{ marginTop: 10, borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(220,38,38,0.3)' }}>
              <div style={{
                padding: '10px 14px', background: 'rgba(220,38,38,0.08)',
                borderBottom: '1px solid rgba(220,38,38,0.15)',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: '#dc2626' }}>!</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#dc2626' }}>Zoho SMTP Authentication Failed</div>
                  <div style={{ fontSize: 11, color: '#991b1b', marginTop: 1 }}>SMTP access must be enabled in your Zoho account before sending emails.</div>
                </div>
              </div>
              <div style={{ padding: '12px 14px', background: 'rgba(254,242,242,0.5)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#7f1d1d', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>Fix in 2 steps:</div>
                {[
                  { num: '1', title: 'Enable SMTP in Zoho Mail', steps: ['Login to mail.zoho.in', 'Go to Settings → Mail Accounts → SMTP', 'Enable SMTP Access & save'] },
                  { num: '2', title: 'Use an App Password (if 2FA is on)', steps: ['Go to accounts.zoho.com → Security', 'Click "App Passwords" → Generate new', 'Update SMTP_PASS in backend/.env with the new password'] },
                ].map(({ num, title, steps }) => (
                  <div key={num} style={{ marginBottom: 12, paddingLeft: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                      <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#dc2626', color: '#fff', fontSize: 10, fontWeight: 700, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{num}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#7f1d1d' }}>{title}</span>
                    </div>
                    <div style={{ paddingLeft: 28 }}>
                      {steps.map((s, i) => <div key={i} style={{ fontSize: 11, color: '#991b1b', marginBottom: 3 }}>→ {s}</div>)}
                    </div>
                  </div>
                ))}
                <div style={{ padding: '7px 10px', borderRadius: 7, marginTop: 4, background: 'rgba(220,38,38,0.08)', border: '1px dashed rgba(220,38,38,0.3)', fontSize: 11, color: '#991b1b' }}>
                  After updating credentials, restart the backend — then try <strong>Send Test Report Now</strong> again.
                </div>
              </div>
            </div>
          )}

          <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={handleSave}
              disabled={saving || !email}
              style={{
                padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                cursor: saving || !email ? 'not-allowed' : 'pointer',
                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: '#fff', border: 'none',
                opacity: saving || !email ? 0.6 : 1, transition: 'opacity 0.2s',
              }}
            >
              {saving ? 'Saving...' : scheduled ? 'Update Schedule' : 'Schedule Daily Report'}
            </button>
            <button
              onClick={handleSendNow}
              disabled={sending || (!email && !savedEmail)}
              style={{
                padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                cursor: sending || (!email && !savedEmail) ? 'not-allowed' : 'pointer',
                background: 'transparent', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.4)',
                opacity: sending || (!email && !savedEmail) ? 0.6 : 1, transition: 'opacity 0.2s',
              }}
            >
              {sending ? 'Sending...' : 'Send Test Report Now'}
            </button>
            {scheduled && (
              <button
                onClick={handleRemove}
                style={{
                  padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  background: 'transparent', color: '#dc2626', border: '1px solid rgba(220,38,38,0.3)', marginLeft: 'auto',
                }}
              >
                Remove Schedule
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Alerts Panel ────────────────────────────────────────────────────────
export default function AlertList({ alerts = [], onAcknowledge, compact }) {

  if (compact) {
    return (
      <div>
        {alerts.map(a => (
          <div key={a.id} className={`alert-row ${a.acknowledged ? 'acknowledged' : ''}`}>
            <div className={`a-icon a-${a.severity === 'critical' ? 'danger' : a.severity === 'warning' ? 'warning' : 'info'}`}>
              <span style={{ display:'block', width:8, height:8, borderRadius:'50%', background: SEVERITY_DOT_COLORS[a.severity] || '#2563eb', margin:'auto' }} />
            </div>
            <div className="a-content">
              <div className="a-title">{a.title}</div>
              <div className="a-sub">{a.message || a.detail}</div>
            </div>
            <div className="a-time">{a.time}</div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      <DailyReportPanel />

      {alerts.map(a => {
        const provMeta = PROVIDER_META[a.provider] || { color: '#94a3b8', label: a.provider || 'Cloud' };
        return (
          <div key={a.id} className={`alert-row ${a.acknowledged ? 'acknowledged' : ''}`}>
            <div className={`a-icon a-${a.severity === 'critical' ? 'danger' : a.severity === 'warning' ? 'warning' : 'info'}`}>
              <span style={{ display:'block', width:8, height:8, borderRadius:'50%', background: SEVERITY_DOT_COLORS[a.severity] || '#2563eb', margin:'auto' }} />
            </div>
            <div className="a-content">
              <div className="a-title">{a.title}</div>
              <div className="a-sub">{a.message || a.detail}</div>
              <div className="a-meta">
                <span className="a-provider-badge" style={{ background: `${provMeta.color}15`, color: provMeta.color, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <ProviderLogo provider={a.provider} size={11} /> {provMeta.label}
                </span>
                <span style={{ fontSize: 10, color: 'var(--text3)' }}>{a.service || a.title}</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
              <span className="a-time">{a.time}</span>
              {!a.acknowledged ? (
                <button className="ack-btn" onClick={() => onAcknowledge && onAcknowledge(a.id)}>✓ Ack</button>
              ) : (
                <span style={{ fontSize: 10, color: 'var(--text3)' }}>Acknowledged</span>
              )}
            </div>
          </div>
        );
      })}

      {alerts.length === 0 && (
        <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text3)', fontSize: 13 }}>
          No alerts match the current filter.
        </div>
      )}

    </div>
  );
}
