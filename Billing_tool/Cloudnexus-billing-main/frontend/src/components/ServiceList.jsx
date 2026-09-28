import React from 'react';
import { PROVIDER_META, fmt } from '../utils/theme';

const ICONS = {
  server: 'SRV', database: 'DB', bucket: 'BKT', function: 'FN', cdn: 'CDN',
  analytics: 'ANL', kubernetes: 'K8S', run: 'RUN', vm: 'VM', blob: 'BLB',
  app: 'APP', default: 'SVC',
};

export default function ServiceList({ provider, services }) {
  const meta = PROVIDER_META[provider];
  if (!services) return null;
  return (
    <div className="service-list">
      {services.map(s => (
        <div className="service-row" key={s.name}>
          <span className="svc-emoji">{ICONS[s.icon] || ICONS.default}</span>
          <span className="svc-name">{s.name}</span>
          <div className="svc-bar-wrap">
            <div className="svc-bar" style={{ width: `${s.pct}%`, background: meta.color }} />
          </div>
          <span className="svc-cost">{fmt.usd(s.cost)}</span>
          <span className="svc-status-dot" style={{
            background: s.status === 'healthy' ? '#22c55e' : '#eab308'
          }} />
        </div>
      ))}
    </div>
  );
}
