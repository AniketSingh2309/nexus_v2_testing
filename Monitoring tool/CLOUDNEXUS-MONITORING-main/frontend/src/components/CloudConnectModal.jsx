import React, { useState, useEffect } from 'react';
import ProviderLogo from './ProviderLogo';

const PROVIDER_LABELS = { aws: 'Amazon Web Services', gcp: 'Google Cloud', azure: 'Microsoft Azure' };
const PROVIDER_COLORS = { aws: '#FF9900', gcp: '#4285F4', azure: '#008AD7' };

export default function CloudConnectModal({ open, uid, onClose, initialConnections, fetchingProviders }) {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  useEffect(() => {
    if (!open || !uid) return;
    setLoading(true);
    setError('');
    fetch(`/api/accounts/mine?uid=${encodeURIComponent(uid)}`)
      .then(r => r.json())
      .then(d => { setAccounts(Array.isArray(d.accounts) ? d.accounts : []); setLoading(false); })
      .catch(() => { setError('Could not load account assignments.'); setLoading(false); });
  }, [open, uid]);

  if (!open) return null;

  const byProvider = { aws: [], gcp: [], azure: [] };
  accounts.forEach(a => { if (byProvider[a.provider]) byProvider[a.provider].push(a); });

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-header">
          <div>
            <div className="modal-title">☁️ Connected Cloud Accounts</div>
            <div className="modal-subtitle">Cloud accounts are managed by your admin. Assigned accounts connect automatically.</div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text3)' }}>
              <div style={{ width: 32, height: 32, border: '3px solid var(--border)', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.75s linear infinite', margin: '0 auto 12px' }} />
              Loading your accounts…
            </div>
          ) : error ? (
            <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.08)', borderRadius: 8, color: '#ef4444', fontSize: 13 }}>{error}</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {['aws', 'gcp', 'azure'].map(p => {
                const provAccounts = byProvider[p];
                const isFetching   = fetchingProviders?.[p];
                const isConnected  = initialConnections?.[p]?.connected || provAccounts.length > 0;
                const color        = PROVIDER_COLORS[p];

                return (
                  <div key={p} style={{ border: `1px solid ${isConnected ? color + '44' : 'var(--border)'}`, borderRadius: 10, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: isConnected ? color + '0d' : 'var(--bg)' }}>
                      <ProviderLogo provider={p} size={18} />
                      <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text1)' }}>{PROVIDER_LABELS[p]}</span>
                      {isConnected && (
                        <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: '#16a34a', background: 'rgba(34,197,94,0.12)', padding: '2px 8px', borderRadius: 10 }}>
                          ● Connected
                        </span>
                      )}
                      {isFetching && <span style={{ marginLeft: isConnected ? 6 : 'auto', fontSize: 11, color: color }}>⏳ Fetching…</span>}
                    </div>

                    <div style={{ padding: '12px 16px', background: 'var(--bg2)' }}>
                      {provAccounts.length === 0 ? (
                        <div style={{ fontSize: 12, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 16 }}>🔒</span>
                          No {p.toUpperCase()} account assigned yet — contact your admin.
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {provAccounts.map(a => {
                            const m = a.accountMeta || {};
                            const identity = p === 'aws' && m.awsAccountId ? `Account ID: ${m.awsAccountId}`
                              : p === 'gcp' && m.projectId ? `Project: ${m.projectId}`
                              : p === 'azure' && m.subscriptionId ? `Subscription: ${String(m.subscriptionId).slice(0, 8)}…` : '';
                            return (
                              <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--bg)', borderRadius: 8, border: '0.5px solid var(--border)' }}>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', flexShrink: 0 }} />
                                <div>
                                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text1)' }}>{a.label}</div>
                                  {identity && <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'monospace' }}>{identity}</div>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ marginTop: 18, padding: '12px 16px', background: 'rgba(34,197,94,0.06)', borderRadius: 8, border: '0.5px solid rgba(34,197,94,0.2)' }}>
            <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 12, color: '#16a34a' }}>🛡️ Admin-Managed Security</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6 }}>
              Cloud credentials are managed exclusively by your administrator via the Admin Portal. Assigned accounts are connected automatically — no action required from you.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
