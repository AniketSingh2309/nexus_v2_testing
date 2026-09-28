import React, { useState, useEffect, useCallback } from 'react';
import { fmt } from '../utils/theme';
import ProviderLogo from './ProviderLogo';
import { fetchInvoices, fetchMonthlyTrend } from '../services/api';

const PROVIDER_COLORS = { aws: '#FF9900', gcp: '#4285F4', azure: '#008AD7' };
const PROVIDER_LABELS = { aws: 'Amazon Web Services', gcp: 'Google Cloud Platform', azure: 'Microsoft Azure' };

const STATUS_STYLES = {
  paid:    { bg: 'rgba(34,197,94,0.1)',   color: '#16a34a', border: 'rgba(34,197,94,0.3)'  },
  pending: { bg: 'rgba(234,179,8,0.1)',   color: '#92400e', border: 'rgba(234,179,8,0.3)'  },
  overdue: { bg: 'rgba(239,68,68,0.1)',   color: '#dc2626', border: 'rgba(239,68,68,0.3)'  },
};

// ─── PDF Invoice Generator ─────────────────────────────────────────────
function generateInvoicePDF(inv, provider) {
  const color = PROVIDER_COLORS[provider];
  const providerLabel = PROVIDER_LABELS[provider];
  const today = new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' });
  const statusStyle = STATUS_STYLES[inv.status] || STATUS_STYLES.paid;
  const sourceLabel = inv.source === 'live' ? 'Live Data' : 'Mock Data';

  const itemRows = (inv.items || []).map(item => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #f0f4ff;">${item.service}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f0f4ff;text-align:center;">${item.qty}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f0f4ff;text-align:right;">$${Number(item.unit || 0).toFixed(2)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f0f4ff;text-align:right;font-weight:600;">$${Number(item.total || 0).toLocaleString(undefined,{minimumFractionDigits:2})}</td>
    </tr>
  `).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Invoice ${inv.id}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Sora:wght@600;700&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Inter',sans-serif;background:#f4f6fa;color:#1a1a2e;font-size:13px;}
    .page{max-width:800px;margin:40px auto;background:#fff;box-shadow:0 4px 40px rgba(0,0,0,0.12);border-radius:12px;overflow:hidden;}
    .header{background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 50%,#0f172a 100%);padding:40px 48px;position:relative;overflow:hidden;}
    .header::before{content:'';position:absolute;top:-60px;right:-60px;width:300px;height:300px;border-radius:50%;background:radial-gradient(circle,rgba(66,133,244,0.15) 0%,transparent 70%);}
    .logo{font-family:'Sora',sans-serif;font-size:24px;font-weight:700;color:#fff;position:relative;z-index:1;}
    .logo span{color:#4285F4;}
    .logo-sub{font-size:11px;color:rgba(255,255,255,0.4);letter-spacing:2px;text-transform:uppercase;margin-top:4px;position:relative;z-index:1;}
    .header-right{position:absolute;top:40px;right:48px;text-align:right;z-index:1;}
    .inv-label{font-family:'Sora',sans-serif;font-size:28px;font-weight:700;color:#fff;letter-spacing:-0.5px;}
    .inv-id{font-size:13px;color:rgba(255,255,255,0.5);margin-top:4px;}
    .provider-band{background:${color};padding:14px 48px;display:flex;align-items:center;justify-content:space-between;}
    .provider-name{font-size:14px;font-weight:600;color:#fff;}
    .provider-period{font-size:13px;color:rgba(255,255,255,0.8);}
    .body{padding:40px 48px;}
    .meta-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:0;margin-bottom:36px;border:1px solid #e2e8f5;border-radius:10px;overflow:hidden;}
    .meta-cell{padding:16px 20px;border-right:1px solid #e2e8f5;}
    .meta-cell:last-child{border-right:none;}
    .meta-label{font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:1.2px;margin-bottom:6px;}
    .meta-val{font-size:14px;font-weight:600;color:#1a1a2e;}
    .status-pill{display:inline-flex;align-items:center;gap:5px;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;background:${statusStyle.bg};color:${statusStyle.color};border:1px solid ${statusStyle.border};}
    .source-chip{font-size:10px;color:#64748b;background:#f8faff;border:1px solid #e2e8f5;padding:2px 8px;border-radius:10px;margin-left:8px;}
    .section-title{font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:1px;margin-bottom:14px;margin-top:28px;}
    .items-table{width:100%;border-collapse:collapse;font-size:13px;}
    .items-table thead th{background:#f8faff;padding:10px 12px;text-align:left;font-size:10px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;border-bottom:2px solid #e2e8f5;}
    .items-table thead th:not(:first-child){text-align:right;}
    .items-table tfoot td{padding:12px;background:#f8faff;font-weight:700;border-top:2px solid #e2e8f5;}
    .total-row{display:flex;justify-content:flex-end;margin-top:8px;}
    .total-box{background:${color}0f;border:1px solid ${color}30;border-radius:10px;padding:16px 24px;text-align:right;min-width:220px;}
    .total-label{font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:1px;}
    .total-amount{font-family:'Sora',sans-serif;font-size:32px;font-weight:700;color:${color};margin-top:4px;}
    .footer{background:#f8faff;border-top:1px solid #e2e8f5;padding:20px 48px;display:flex;align-items:center;justify-content:space-between;margin-top:40px;}
    .footer-note{font-size:11px;color:#94a3b8;line-height:1.6;}
    .footer-logo{font-family:'Sora',sans-serif;font-size:14px;font-weight:700;color:#94a3b8;}
    .footer-logo span{color:#4285F4;}
    @media print{body{background:#fff;}.page{box-shadow:none;margin:0;border-radius:0;max-width:none;}}
  </style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="logo">MyCloud<span>Nexus</span></div>
    <div class="logo-sub">Multi-Cloud Intelligence Platform</div>
    <div class="header-right">
      <div class="inv-label">INVOICE</div>
      <div class="inv-id">${inv.id}</div>
    </div>
  </div>

  <div class="provider-band">
    <div class="provider-name">${providerLabel}</div>
    <div class="provider-period">Billing Period: ${inv.period}</div>
  </div>

  <div class="body">
    <div class="meta-grid">
      <div class="meta-cell">
        <div class="meta-label">Invoice ID</div>
        <div class="meta-val">${inv.id}</div>
      </div>
      <div class="meta-cell">
        <div class="meta-label">Issued Date</div>
        <div class="meta-val">${inv.issued || '—'}</div>
      </div>
      <div class="meta-cell">
        <div class="meta-label">Due Date</div>
        <div class="meta-val">${inv.due || '—'}</div>
      </div>
      <div class="meta-cell">
        <div class="meta-label">Status</div>
        <div class="meta-val">
          <span class="status-pill">
            ${inv.status === 'paid' ? '✓' : inv.status === 'overdue' ? '!' : ''}
            ${inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
          </span>
          <span class="source-chip">${sourceLabel}</span>
        </div>
      </div>
    </div>

    ${inv.items && inv.items.length > 0 ? `
    <div class="section-title">Service Breakdown</div>
    <table class="items-table">
      <thead>
        <tr>
          <th style="text-align:left">Service / Resource</th>
          <th>Quantity</th>
          <th>Unit Price</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
      </tbody>
    </table>
    ` : `<div style="text-align:center;padding:32px;color:#94a3b8;font-size:13px;">
      Service-level breakdown not available for this invoice.<br/>
      <span style="font-size:11px;">Connect live cloud credentials for detailed line items.</span>
    </div>`}

    <div class="total-row">
      <div class="total-box">
        <div class="total-label">Total Amount Due</div>
        <div class="total-amount">$${Number(inv.amount || 0).toLocaleString(undefined,{minimumFractionDigits:2})}</div>
      </div>
    </div>

    ${inv.note ? `<div style="margin-top:16px;padding:12px 16px;background:#fffbeb;border:1px solid #fef3c7;border-radius:8px;font-size:11px;color:#92400e;">${inv.note}</div>` : ''}
  </div>

  <div class="footer">
    <div class="footer-note">
      Generated by MyCloudNexus on ${today}<br/>
      This is a ${inv.source === 'live' ? 'live billing document' : 'sample/mock invoice'} — verify against your cloud provider's official billing portal.
    </div>
    <div class="footer-logo">MyCloud<span>Nexus</span></div>
  </div>
</div>
</body>
</html>`;

  return html;
}

function downloadInvoicePDF(inv, provider) {
  const html = generateInvoicePDF(inv, provider);
  const printWindow = window.open('', '_blank', 'width=900,height=700');
  if (!printWindow) { alert('Please allow popups for PDF download.'); return; }
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.document.title = `${inv.id}`;
  printWindow.addEventListener('load', () => {
    setTimeout(() => printWindow.print(), 600);
  });
}

// ─── MonthlyTrend sub-panel ─────────────────────────────────────────────
function MonthlyTrendPanel({ mode, uid = '' }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchMonthlyTrend(mode)
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [mode]);

  if (loading) return <div style={{ textAlign:'center', padding:20, color:'#94a3b8', fontSize:13 }}>Loading monthly data…</div>;
  if (!data) return null;

  const months = data.months || [];
  const maxTotal = Math.max(...months.map(m => m.total || 0), 1);

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ fontSize:11, fontWeight:600, color:'#64748b', textTransform:'uppercase', letterSpacing:1, marginBottom:14 }}>
        Month-wise Spend — All Providers
        <span style={{ marginLeft:8, fontSize:9, background:'#f0f4ff', padding:'2px 8px', borderRadius:10, color:'#94a3b8', fontWeight:400, textTransform:'none' }}>
          {data.source === 'live' ? 'Live' : 'Mock'}
        </span>
      </div>
      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
        <thead>
          <tr style={{ background:'#f8faff' }}>
            <th style={{ padding:'8px 10px', textAlign:'left', fontSize:10, fontWeight:600, color:'#64748b', textTransform:'uppercase', letterSpacing:0.8, borderBottom:'1px solid #e2e8f5' }}>Month</th>
            <th style={{ padding:'8px 10px', textAlign:'right', fontSize:10, fontWeight:600, color:'#FF9900', textTransform:'uppercase', letterSpacing:0.8, borderBottom:'1px solid #e2e8f5' }}>AWS</th>
            <th style={{ padding:'8px 10px', textAlign:'right', fontSize:10, fontWeight:600, color:'#4285F4', textTransform:'uppercase', letterSpacing:0.8, borderBottom:'1px solid #e2e8f5' }}>GCP</th>
            <th style={{ padding:'8px 10px', textAlign:'right', fontSize:10, fontWeight:600, color:'#008AD7', textTransform:'uppercase', letterSpacing:0.8, borderBottom:'1px solid #e2e8f5' }}>Azure</th>
            <th style={{ padding:'8px 10px', textAlign:'right', fontSize:10, fontWeight:600, color:'#64748b', textTransform:'uppercase', letterSpacing:0.8, borderBottom:'1px solid #e2e8f5' }}>Total</th>
            <th style={{ padding:'8px 10px', borderBottom:'1px solid #e2e8f5', width:100 }}></th>
          </tr>
        </thead>
        <tbody>
          {months.map((m, i) => (
            <tr key={i} style={{ borderBottom:'1px solid #f0f4ff' }}>
              <td style={{ padding:'9px 10px', fontWeight:600, color:'#1a1a2e' }}>{m.month}</td>
              <td style={{ padding:'9px 10px', textAlign:'right', color:'#FF9900', fontWeight:500 }}>{fmt.usd(m.aws || 0)}</td>
              <td style={{ padding:'9px 10px', textAlign:'right', color:'#4285F4', fontWeight:500 }}>{fmt.usd(m.gcp || 0)}</td>
              <td style={{ padding:'9px 10px', textAlign:'right', color:'#008AD7', fontWeight:500 }}>{fmt.usd(m.azure || 0)}</td>
              <td style={{ padding:'9px 10px', textAlign:'right', fontWeight:700, color:'#1a1a2e' }}>{fmt.usd(m.total || 0)}</td>
              <td style={{ padding:'9px 10px' }}>
                <div style={{ height:8, background:'#f0f4ff', borderRadius:4, overflow:'hidden' }}>
                  <div style={{ width:`${(m.total / maxTotal) * 100}%`, height:'100%', background:'linear-gradient(90deg,#4285F4,#FF9900)', borderRadius:4 }} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


// ─── Main InvoicePanel ──────────────────────────────────────────────────
export default function InvoicePanel({ mode, uid = '' }) {
  const [activeProvider, setActiveProvider] = useState('aws');
  const [expandedInvoice, setExpandedInvoice] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [dataSource, setDataSource] = useState('mock');
  const [fetching, setFetching] = useState(false);
  const [view, setView] = useState('invoices'); // 'invoices' | 'monthly'

  const loadInvoices = useCallback(async () => {
    setFetching(true);
    setExpandedInvoice(null);
    try {
      const data = await fetchInvoices(activeProvider, mode);
      setInvoices(data.invoices || []);
      setDataSource(data.source || 'mock');
    } catch {
      setInvoices([]);
      setDataSource('error');
    } finally {
      setFetching(false);
    }
  }, [activeProvider, mode]);

  useEffect(() => { loadInvoices(); }, [loadInvoices]);

  const color = PROVIDER_COLORS[activeProvider];
  const totalYTD = invoices.reduce((s, i) => s + (i.amount || 0), 0);

  return (
    <div>
      {/* View toggle */}
      <div style={{ display:'flex', gap:8, marginBottom:16 }}>
        <button
          onClick={() => setView('invoices')}
          style={{ padding:'6px 16px', borderRadius:20, border:'1px solid', fontSize:12, fontWeight:600, cursor:'pointer',
            background: view==='invoices' ? '#1a1a2e' : 'transparent',
            color: view==='invoices' ? '#fff' : '#64748b',
            borderColor: view==='invoices' ? '#1a1a2e' : '#e2e8f5' }}
        >Invoices</button>
        <button
          onClick={() => setView('monthly')}
          style={{ padding:'6px 16px', borderRadius:20, border:'1px solid', fontSize:12, fontWeight:600, cursor:'pointer',
            background: view==='monthly' ? '#4285F4' : 'transparent',
            color: view==='monthly' ? '#fff' : '#64748b',
            borderColor: view==='monthly' ? '#4285F4' : '#e2e8f5' }}
        >Monthly Breakdown</button>
      </div>

      {view === 'monthly' ? (
        <MonthlyTrendPanel mode={mode} uid={uid} />
      ) : (
        <>
          {/* Provider tabs */}
          <div className="invoice-provider-tabs">
            {['aws','gcp','azure'].map(p => (
              <button
                key={p}
                className={`inv-prov-btn ${activeProvider === p ? 'active' : ''}`}
                style={activeProvider === p ? { borderColor: PROVIDER_COLORS[p], color: PROVIDER_COLORS[p], background: `${PROVIDER_COLORS[p]}10` } : {}}
                onClick={() => setActiveProvider(p)}
              >
                <ProviderLogo provider={p} size={14} />
                <span>{p.toUpperCase()}</span>
                {activeProvider === p && (
                  dataSource === 'live'
                    ? <span className="inv-fetch-badge" style={{ background: '#16a34a' }}>Live</span>
                    : mode === 'mock'
                      ? <span className="inv-fetch-badge" style={{ background: '#94a3b8' }}>Mock</span>
                      : null
                )}
              </button>
            ))}
          </div>

          {/* Provider header */}
          <div className="invoice-header">
            <div>
              <div className="invoice-provider-name">{PROVIDER_LABELS[activeProvider]}</div>
              <div className="invoice-sub">
                Billing history ·{' '}
                {dataSource === 'live'
                  ? 'Live data from cloud API'
                  : mode === 'mock'
                    ? 'Mock data — connect credentials for live'
                    : 'No billing data available for this account'}{' '}
                · {invoices.length} invoices
              </div>
            </div>
            <div className="invoice-ytd">
              <div className="invoice-ytd-label">Total (shown)</div>
              <div className="invoice-ytd-value" style={{ color }}>{fmt.usd(totalYTD)}</div>
            </div>
          </div>

          {fetching ? (
            <div className="invoice-loading">
              <div className="invoice-spinner" style={{ borderTopColor: color }} />
              <span>Fetching invoices from {activeProvider.toUpperCase()}…</span>
            </div>
          ) : invoices.length === 0 ? (
            <div style={{ textAlign:'center', padding:40, color:'#94a3b8', fontSize:13 }}>
              {mode === 'real'
                ? `No invoices found for ${activeProvider.toUpperCase()}. This provider may not have any billing activity yet.`
                : `No invoice data available. Connect your ${activeProvider.toUpperCase()} credentials to load live billing history.`}
            </div>
          ) : (
            <div className="invoice-list">
              {invoices.map((inv) => {
                const st = STATUS_STYLES[inv.status] || STATUS_STYLES.paid;
                const isOpen = expandedInvoice === inv.id;
                return (
                  <div key={inv.id} className={`invoice-card ${isOpen ? 'open' : ''}`}>
                    <div className="invoice-row" onClick={() => setExpandedInvoice(isOpen ? null : inv.id)}>
                      <div className="invoice-id-block">
                        <div className="invoice-id">{inv.id}</div>
                        <div className="invoice-period">{inv.period}</div>
                      </div>
                      <div className="invoice-dates">
                        <span className="inv-date-label">Issued</span>
                        <span className="inv-date-val">{inv.issued || '—'}</span>
                        <span className="inv-date-label" style={{ marginLeft: 12 }}>Due</span>
                        <span className="inv-date-val">{inv.due || '—'}</span>
                      </div>
                      <div className="invoice-amount">{fmt.usd(inv.amount)}</div>
                      <div className="inv-status-badge" style={{ background: st.bg, color: st.color, border: `0.5px solid ${st.border}` }}>
                        {inv.status === 'paid' ? '✓ ' : inv.status === 'overdue' ? '! ' : ''}
                        {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                      </div>
                      {inv.source && (
                        <div style={{ fontSize:9, color:'#94a3b8', background:'#f8faff', padding:'2px 6px', borderRadius:8, border:'1px solid #e2e8f5' }}>
                          {inv.source === 'live' ? 'Live' : 'Mock'}
                        </div>
                      )}
                      <div className="inv-expand">{isOpen ? '▲' : '▼'}</div>
                    </div>

                    {isOpen && (
                      <div className="invoice-detail">
                        {inv.items && inv.items.length > 0 ? (
                          <table className="inv-table">
                            <thead>
                              <tr>
                                <th>Service / Resource</th>
                                <th>Quantity</th>
                                <th>Unit Price</th>
                                <th>Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {inv.items.map((item, i) => (
                                <tr key={i}>
                                  <td>{item.service}</td>
                                  <td>{item.qty}</td>
                                  <td>${Number(item.unit || 0).toFixed(2)}</td>
                                  <td style={{ fontWeight: 500 }}>{fmt.usd(item.total)}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr>
                                <td colSpan={3} style={{ textAlign: 'right', fontWeight: 600 }}>Total Due</td>
                                <td style={{ fontWeight: 700, color }}>{fmt.usd(inv.amount)}</td>
                              </tr>
                            </tfoot>
                          </table>
                        ) : (
                          <div style={{ padding:'16px', color:'#94a3b8', fontSize:12, textAlign:'center' }}>
                            {inv.note || 'Service-level breakdown not available. Connect live credentials for detailed line items.'}
                          </div>
                        )}
                        <div className="inv-download-row">
                          <button
                            className="inv-dl-btn"
                            style={{ background: color }}
                            onClick={() => downloadInvoicePDF(inv, activeProvider)}
                          >
                            ↓ Download PDF Invoice
                          </button>
                          <button
                            className="inv-dl-btn inv-dl-csv"
                            onClick={() => {
                              const csv = ['Service,Quantity,Unit Price,Total',
                                ...(inv.items||[]).map(it => `"${it.service}","${it.qty}","${it.unit}","${it.total}"`)
                              ].join('\n');
                              const blob = new Blob([csv], { type:'text/csv' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url; a.download = `${inv.id}.csv`; a.click();
                              URL.revokeObjectURL(url);
                            }}
                          >
                            ↓ Export CSV
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
