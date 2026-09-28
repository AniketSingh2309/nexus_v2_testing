import React from 'react';
import { fmt } from '../utils/theme';

export default function MetricRow({ metrics }) {
  return (
    <div className="metric-row">
      {metrics.map(m => (
        <div className="metric" key={m.label}>
          <div className="metric-label">{m.label}</div>
          <div className="metric-value">{m.value ?? '—'}</div>
          {m.sub && <div className="metric-sub" style={{ color: m.color }}>{m.sub}</div>}
        </div>
      ))}
    </div>
  );
}
