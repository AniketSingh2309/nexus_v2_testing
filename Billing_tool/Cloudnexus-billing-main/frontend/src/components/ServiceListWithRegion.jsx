import React from 'react';
import { PROVIDER_META, fmt } from '../utils/theme';
import ProviderLogo from './ProviderLogo';

const STATUS_COLOR = { healthy: '#22c55e', warning: '#eab308', critical: '#ef4444' };

// Guess a service family/icon from the name
function iconLabel(name = '') {
  const n = name.toLowerCase();
  if (n.includes('ec2') || n.includes('compute') || n.includes('elastic compute')) return 'EC2';
  if (n.includes('rds') || n.includes('database') || n.includes('aurora')) return 'RDS';
  if (n.includes('s3') || n.includes('simple storage') || n.includes('glacier')) return 'S3';
  if (n.includes('lambda')) return 'λ';
  if (n.includes('cloudfront') || n.includes('cdn')) return 'CDN';
  if (n.includes('eks') || n.includes('kubernetes') || n.includes('container')) return 'K8S';
  if (n.includes('ecs')) return 'ECS';
  if (n.includes('elasticache') || n.includes('redis') || n.includes('memcache')) return 'CACHE';
  if (n.includes('sqs') || n.includes('sns') || n.includes('messaging')) return 'MSG';
  if (n.includes('vpc') || n.includes('network') || n.includes('elb') || n.includes('load balancing')) return 'NET';
  if (n.includes('bigquery') || n.includes('analytics')) return 'BQ';
  if (n.includes('gke')) return 'GKE';
  if (n.includes('vm') || n.includes('virtual machine') || n.includes('compute engine')) return 'VM';
  if (n.includes('blob') || n.includes('storage')) return 'STG';
  if (n.includes('function') || n.includes('serverless')) return 'FN';
  if (n.includes('sql') || n.includes('cosmos') || n.includes('firestore')) return 'DB';
  return 'SVC';
}

export default function ServiceListWithRegion({ provider, services }) {
  const meta = PROVIDER_META[provider] || { color: '#64748b' };

  // Real services passed in — render them directly
  const list = Array.isArray(services) ? services : [];

  if (list.length === 0) {
    return (
      <div style={{ padding: '24px 0', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
        No services data available. Connect your {provider.toUpperCase()} account and switch to Real mode.
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'grid', gap: 1 }}>
        {list.map((s, i) => {
          const pct = s.pct || 0;
          const statusColor = STATUS_COLOR[s.status] || '#94a3b8';
          return (
            <div key={s.name + i} style={{
              display: 'grid',
              gridTemplateColumns: '48px 1fr auto auto 12px',
              alignItems: 'center',
              gap: 12,
              padding: '10px 12px',
              background: i % 2 === 0 ? '#fff' : '#fafbff',
              borderRadius: 8,
              border: '1px solid #f0f4ff',
              marginBottom: 4,
            }}>
              {/* Icon badge */}
              <div style={{
                width: 40, height: 40, borderRadius: 8, flexShrink: 0,
                background: meta.color + '15', color: meta.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 9, fontWeight: 800, letterSpacing: 0.3, textAlign: 'center',
              }}>
                {iconLabel(s.name)}
              </div>

              {/* Name + bar */}
              <div style={{ minWidth: 0 }}>
                <div style={{
                  fontSize: 13, fontWeight: 600, color: '#1a1a2e',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  marginBottom: 5,
                }}>
                  {s.name}
                </div>
                <div style={{
                  height: 5, background: '#f0f4ff', borderRadius: 99, overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%', width: `${Math.min(pct, 100)}%`,
                    background: meta.color, borderRadius: 99,
                    transition: 'width 0.6s ease',
                  }} />
                </div>
              </div>

              {/* Pct */}
              <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, whiteSpace: 'nowrap' }}>
                {pct}%
              </div>

              {/* Cost */}
              <div style={{ fontSize: 14, fontWeight: 800, color: '#1a1a2e', whiteSpace: 'nowrap' }}>
                {fmt.usd(s.cost)}
              </div>

              {/* Status dot */}
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: statusColor, flexShrink: 0,
              }} />
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 10, fontSize: 11, color: '#94a3b8', textAlign: 'right' }}>
        {list.length} service{list.length !== 1 ? 's' : ''} · sorted by cost
      </div>
    </div>
  );
}
