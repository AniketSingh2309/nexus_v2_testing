import React from 'react';
import { PROVIDER_META, fmt } from '../utils/theme';
import ProviderLogo from './ProviderLogo';

export default function ProviderCard({ provider, data, selected, onClick, notConnected }) {
  const meta = PROVIDER_META[provider];
  if (!data) return <div className="p-card skeleton" />;

  const deltaUp = data.delta_pct > 0;
  const barWidth = Math.min(100, data.share + 10);

  if (notConnected) {
    return (
      <div
        className={`p-card ${provider} ${selected ? 'selected' : ''}`}
        onClick={onClick}
        style={{ borderColor: '#e2e8f5', opacity: 0.7 }}
        role="button" tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && onClick()}
      >
        <div className="p-header">
          <div className="p-logo">
            <div className="p-icon" style={{ background: meta.bg }}><ProviderLogo provider={provider} size={18} /></div>
            <span>{meta.label}</span>
          </div>
          <span style={{ fontSize: 10, background: '#f0f4ff', color: '#94a3b8', padding: '2px 8px', borderRadius: 99, fontWeight: 600 }}>
            Not Connected
          </span>
        </div>
        <div className="p-cost-label">Month-to-date spend</div>
        <div className="p-cost" style={{ color: '#94a3b8' }}>—</div>
        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
          Connect to see real spend
        </div>
        <div className="p-mini-bar" style={{ width: '0%', background: meta.color }} />
        <div className="p-footer">
          <span>{provider === 'aws' ? 'EC2 · S3 · RDS · Lambda' : provider === 'gcp' ? 'GCE · BigQuery · GKE' : 'VMs · Blob · AKS · SQL'}</span>
          <span>—</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`p-card ${provider} ${selected ? 'selected' : ''}`}
      onClick={onClick}
      style={{ borderColor: selected ? meta.color : undefined }}
      role="button" tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick()}
    >
      <div className="p-header">
        <div className="p-logo">
          <div className="p-icon" style={{ background: meta.bg }}><ProviderLogo provider={provider} size={18} /></div>
          <span>{meta.label}</span>
        </div>
        <span
          className="health-dot"
          style={{ background: data._is_live ? '#22c55e' : data.health === 'healthy' ? '#22c55e' : '#eab308' }}
          title={data._is_live ? 'live' : data.health}
        />
      </div>
      <div className="p-cost-label">Month-to-date spend</div>
      <div className="p-cost">{fmt.usd(data.mtd)}</div>
      <div className={`p-delta ${deltaUp ? 'up' : 'down'}`}>
        {deltaUp ? '↑' : '↓'} {fmt.pct(data.delta_pct)} vs last month
      </div>
      <div className="p-mini-bar" style={{ width: `${barWidth}%`, background: meta.color }} />
      <div className="p-footer">
        <span>{provider === 'aws' ? 'EC2 · S3 · RDS · Lambda' : provider === 'gcp' ? 'GCE · BigQuery · GKE' : 'VMs · Blob · AKS · SQL'}</span>
        <span>{data.share}%</span>
      </div>
    </div>
  );
}
