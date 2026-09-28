import React from 'react';
import { PROVIDER_META, fmt } from '../utils/theme';
import ProviderLogo from './ProviderLogo';

export default function ProviderCard({ provider, services, onClick }) {
  const meta = PROVIDER_META[provider];
  if (!services) return <div className="p-card skeleton" style={{ minHeight: 140 }} />;

  const totalCost = services.reduce((acc, s) => acc + (s.cost || s.costMonth || 0), 0);
  const healthy = services.filter(s => s.health === 'healthy').length;
  const warnings = services.filter(s => s.health === 'warning').length;

  return (
    <div className="p-card" onClick={onClick} style={{ borderTop: `3px solid ${meta.color}` }}>
      <div className="p-header">
        <div className="p-logo">
          <div className="p-icon" style={{ background: meta.bg, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <ProviderLogo provider={provider} size={22} />
          </div>
          <div>
            <div className="p-name">{meta.label}</div>
            <div className="p-full">{meta.full}</div>
          </div>
        </div>
        <div className="health-dot" style={{ background: warnings > 0 ? '#eab308' : '#22c55e' }} title={warnings > 0 ? 'Has warnings' : 'All healthy'} />
      </div>

      <div className="p-stats">
        <div className="p-stat">
          <div className="p-stat-label">MTD Spend</div>
          <div className="p-stat-value" style={{ color: meta.color }}>{fmt.usd(Math.round(totalCost))}</div>
        </div>
        <div className="p-stat">
          <div className="p-stat-label">Services</div>
          <div className="p-stat-value">{services.length}</div>
        </div>
        <div className="p-stat">
          <div className="p-stat-label">Healthy</div>
          <div className="p-stat-value" style={{ color: '#22c55e' }}>{healthy}</div>
        </div>
        <div className="p-stat">
          <div className="p-stat-label">Warnings</div>
          <div className="p-stat-value" style={{ color: warnings > 0 ? '#eab308' : 'var(--text3)' }}>{warnings}</div>
        </div>
      </div>

      <div className="p-mini-bar" style={{ width: '100%', background: `${meta.color}22`, position: 'relative', height: 4, borderRadius: 2 }}>
        <div style={{ width: `${(healthy / services.length) * 100}%`, height: '100%', background: meta.color, borderRadius: 2, transition: 'width 0.6s ease' }} />
      </div>
      <div className="p-footer">
        <span>Click to view all {meta.label} resources →</span>
        <span style={{ color: meta.color }}>{Math.round((healthy / services.length) * 100)}% healthy</span>
      </div>
    </div>
  );
}
