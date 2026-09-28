import React, { useState, useMemo } from 'react';
import { generatePDF, generateCSV, generateJSON } from '../utils/exportReport';
import ProviderLogo from './ProviderLogo';

const PROVIDERS = [
  { key: 'all',   label: 'All Clouds', desc: 'AWS + GCP + Azure combined' },
  { key: 'aws',   label: 'AWS',        desc: 'Amazon Web Services'         },
  { key: 'gcp',   label: 'GCP',        desc: 'Google Cloud Platform'       },
  { key: 'azure', label: 'Azure',      desc: 'Microsoft Azure'             },
];

const FORMATS = [
  { key: 'pdf',  label: 'PDF Report',      desc: 'Professional PDF with MyCloudNexus branding, summary & tables', badge: 'Recommended' },
  { key: 'csv',  label: 'CSV Spreadsheet', desc: 'Excel / Google Sheets compatible flat table',                  badge: null           },
  { key: 'json', label: 'JSON Data',       desc: 'Structured JSON with full metadata for programmatic use',      badge: null           },
];

const PROVIDER_COLORS = { all: '#3b82f6', aws: '#FF9900', gcp: '#4285F4', azure: '#008AD7' };

// Family → display label mapping
const FAMILY_LABEL = {
  Compute: 'Compute', Database: 'Database', Storage: 'Storage',
  Serverless: 'Serverless', Container: 'Containers', Networking: 'Networking',
  Messaging: 'Messaging', Cache: 'Cache', Analytics: 'Analytics',
  Monitoring: 'Monitoring', DNS: 'DNS', Security: 'Security',
};

export default function ExportModal({ open, onClose, awsServices, gcpServices, azureServices, alerts }) {
  const [selectedProvider,    setSelectedProvider]    = useState('all');
  const [selectedServiceType, setSelectedServiceType] = useState('all'); // 'all' or a family string
  const [selectedFormat,      setSelectedFormat]      = useState('pdf');
  const [loading, setLoading] = useState(false);
  const [done,    setDone]    = useState(false);

  // Base services for the selected provider — defined before any early return
  function getProviderServices(key) {
    if (key === 'all')   return [...awsServices, ...gcpServices, ...azureServices];
    if (key === 'aws')   return awsServices;
    if (key === 'gcp')   return gcpServices;
    if (key === 'azure') return azureServices;
    return [];
  }

  const providerServices = getProviderServices(selectedProvider);

  // Unique families — useMemo must be before any early return (Rules of Hooks)
  const availableFamilies = useMemo(() => {
    const fams = [...new Set(providerServices.map(s => s.family).filter(Boolean))].sort();
    return fams;
  }, [selectedProvider, awsServices, gcpServices, azureServices]);

  if (!open) return null;

  // Final filtered services
  const filteredServices = selectedServiceType === 'all'
    ? providerServices
    : providerServices.filter(s => s.family === selectedServiceType);

  const pColor = PROVIDER_COLORS[selectedProvider];

  function handleProviderChange(key) {
    setSelectedProvider(key);
    setSelectedServiceType('all'); // reset service filter when provider changes
  }

  async function handleDownload() {
    setLoading(true);
    setDone(false);
    await new Promise(r => setTimeout(r, 80));
    const exportLabel = selectedProvider + (selectedServiceType !== 'all' ? `_${selectedServiceType}` : '');
    try {
      if (selectedFormat === 'pdf')  generatePDF(filteredServices, alerts, exportLabel);
      if (selectedFormat === 'csv')  generateCSV(filteredServices, exportLabel);
      if (selectedFormat === 'json') generateJSON(filteredServices, alerts, exportLabel);
      setDone(true);
      setTimeout(() => setDone(false), 3000);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)', zIndex: 1000,
      }} />

      {/* Modal */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%,-50%)',
        width: 660, maxHeight: '92vh', overflowY: 'auto',
        background: 'var(--card)', borderRadius: 16,
        border: '1px solid var(--border)',
        boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
        zIndex: 1001,
      }}>

        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg,#0a1628 0%,#0f2044 100%)',
          borderRadius: '16px 16px 0 0',
          padding: '22px 28px 18px',
          borderBottom: '1px solid rgba(59,130,246,0.2)',
          position: 'relative',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 9,
              background: 'linear-gradient(135deg,#1d4ed8,#3b82f6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 800, color: '#fff',
            }}>RPT</div>
            <div>
              <div style={{ fontSize: 19, fontWeight: 800, color: 'white', letterSpacing: '-0.3px' }}>
                MyCloud<span style={{ color: '#60a5fa' }}>Nexus</span>
              </div>
              <div style={{ fontSize: 10, color: '#64748b', fontWeight: 500 }}>EXPORT INFRASTRUCTURE REPORT</div>
            </div>
          </div>
          <div style={{ fontSize: 12, color: '#94a3b8' }}>
            Select a cloud, filter by service, choose a format and download.
          </div>
          <button onClick={onClose} style={{
            position: 'absolute', top: 16, right: 16,
            background: 'rgba(255,255,255,0.08)', border: 'none', color: '#94a3b8',
            width: 28, height: 28, borderRadius: 7, cursor: 'pointer',
            fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>✕</button>
        </div>

        <div style={{ padding: '22px 28px' }}>

          {/* ── Step 1: Provider ── */}
          <StepLabel step="1" text="Select Cloud Provider" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 22 }}>
            {PROVIDERS.map(p => {
              const active = selectedProvider === p.key;
              const cnt = getProviderServices(p.key).length;
              return (
                <div key={p.key} onClick={() => handleProviderChange(p.key)} style={{
                  padding: '11px 14px', borderRadius: 10, cursor: 'pointer',
                  border: `1.5px solid ${active ? PROVIDER_COLORS[p.key] : 'var(--border)'}`,
                  background: active ? `${PROVIDER_COLORS[p.key]}12` : 'var(--bg)',
                  display: 'flex', alignItems: 'center', gap: 10, transition: 'all 0.15s',
                }}>
                  {['aws','gcp','azure'].includes(p.key)
                    ? <ProviderLogo provider={p.key} size={18} />
                    : <span style={{ fontSize: 18, lineHeight: 1, color: PROVIDER_COLORS[p.key] }}>☁</span>}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: active ? PROVIDER_COLORS[p.key] : 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      {p.label}
                      <span style={{
                        fontSize: 10, background: active ? PROVIDER_COLORS[p.key] : 'var(--border)',
                        color: active ? 'white' : 'var(--text3)',
                        borderRadius: 8, padding: '1px 6px', fontWeight: 700,
                      }}>{cnt}</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>{p.desc}</div>
                  </div>
                  {active && <CheckMark color={pColor} />}
                </div>
              );
            })}
          </div>

          {/* ── Step 2: Service Type filter ── */}
          <StepLabel step="2" text="Filter by Service Type" />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 22 }}>
            {/* All */}
            <Chip
              label="All Services"
              count={providerServices.length}
              active={selectedServiceType === 'all'}
              color={pColor}
              onClick={() => setSelectedServiceType('all')}
            />
            {availableFamilies.map(fam => {
              const cnt = providerServices.filter(s => s.family === fam).length;
              return (
                <Chip
                  key={fam}
                  label={FAMILY_LABEL[fam] || fam}
                  count={cnt}
                  active={selectedServiceType === fam}
                  color={pColor}
                  onClick={() => setSelectedServiceType(fam)}
                />
              );
            })}
          </div>

          {/* ── Step 3: Format ── */}
          <StepLabel step="3" text="Select Format" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 22 }}>
            {FORMATS.map(f => {
              const active = selectedFormat === f.key;
              return (
                <div key={f.key} onClick={() => setSelectedFormat(f.key)} style={{
                  padding: '11px 16px', borderRadius: 10, cursor: 'pointer',
                  border: `1.5px solid ${active ? pColor : 'var(--border)'}`,
                  background: active ? `${pColor}0d` : 'var(--bg)',
                  display: 'flex', alignItems: 'center', gap: 12, transition: 'all 0.15s',
                }}>
                  <span style={{
                    fontSize: 11, fontWeight: 800, color: active ? pColor : 'var(--text3)',
                    background: active ? `${pColor}15` : 'var(--border)',
                    padding: '3px 6px', borderRadius: 5, minWidth: 36, textAlign: 'center',
                  }}>
                    {f.key.toUpperCase()}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span style={{ fontWeight: 600, fontSize: 13, color: active ? pColor : 'var(--text)' }}>{f.label}</span>
                      {f.badge && (
                        <span style={{
                          fontSize: 9, background: '#22c55e', color: 'white',
                          borderRadius: 4, padding: '1px 6px', fontWeight: 700,
                        }}>{f.badge}</span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{f.desc}</div>
                  </div>
                  <div style={{
                    width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                    border: `2px solid ${active ? pColor : 'var(--border)'}`,
                    background: active ? pColor : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, color: 'white',
                  }}>{active ? '✓' : ''}</div>
                </div>
              );
            })}
          </div>

          {/* ── Summary bar ── */}
          <div style={{
            background: `${pColor}0d`, border: `1px solid ${pColor}30`,
            borderRadius: 10, padding: '11px 16px', marginBottom: 18,
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', marginBottom: 3 }}>
                Report summary
              </div>
              <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                <strong style={{ color: pColor }}>{filteredServices.length} services</strong>
                {selectedServiceType !== 'all' && (
                  <> · <span style={{ color: 'var(--text)' }}>{FAMILY_LABEL[selectedServiceType] || selectedServiceType} only</span></>
                )}
                {' · '}
                {PROVIDERS.find(p => p.key === selectedProvider)?.label}
                {' · '}
                {FORMATS.find(f => f.key === selectedFormat)?.label}
              </div>
            </div>
          </div>

          {/* ── Download button ── */}
          <button onClick={handleDownload} disabled={loading || filteredServices.length === 0} style={{
            width: '100%', padding: '14px 0', borderRadius: 10,
            background: done
              ? 'linear-gradient(135deg,#16a34a,#22c55e)'
              : loading
                ? 'linear-gradient(135deg,#374151,#4b5563)'
                : `linear-gradient(135deg,${pColor}cc,${pColor})`,
            border: 'none', color: 'white', fontWeight: 700, fontSize: 15,
            cursor: loading || filteredServices.length === 0 ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            transition: 'all 0.2s',
            boxShadow: loading || done ? 'none' : `0 4px 20px ${pColor}50`,
          }}>
            {loading  ? 'Generating report…'
             : done   ? 'Report downloaded!'
             : `Download ${FORMATS.find(f => f.key === selectedFormat)?.label}`}
          </button>

          {filteredServices.length === 0 && (
            <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text3)', marginTop: 8 }}>
              No services match the selected filters
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function StepLabel({ step, text }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
      <div style={{
        width: 20, height: 20, borderRadius: '50%', background: '#3b82f6',
        color: 'white', fontSize: 11, fontWeight: 800,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>{step}</div>
      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
        {text}
      </span>
    </div>
  );
}

function Chip({ label, count, active, color, onClick }) {
  return (
    <div onClick={onClick} style={{
      padding: '5px 12px', borderRadius: 20, cursor: 'pointer',
      border: `1.5px solid ${active ? color : 'var(--border)'}`,
      background: active ? `${color}15` : 'var(--bg)',
      display: 'flex', alignItems: 'center', gap: 6,
      transition: 'all 0.12s', userSelect: 'none',
    }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: active ? color : 'var(--text2)' }}>{label}</span>
      <span style={{
        fontSize: 10, fontWeight: 700, padding: '0 5px', borderRadius: 8,
        background: active ? color : 'var(--border)',
        color: active ? 'white' : 'var(--text3)',
      }}>{count}</span>
    </div>
  );
}

function CheckMark({ color }) {
  return (
    <div style={{
      width: 18, height: 18, borderRadius: '50%', background: color, flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 10, color: 'white', fontWeight: 700,
    }}>✓</div>
  );
}
