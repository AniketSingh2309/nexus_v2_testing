import React, { useState, useEffect } from 'react';
import { PROVIDER_META, fmt, FAMILY_ICONS, COLORS } from '../utils/theme';
import { api } from '../utils/api';
import { PieChart3D } from './SpaceUtilizationCharts';

function getUsageColor(val) {
  if (val >= 85) return '#ef4444';
  if (val >= 70) return '#eab308';
  return '#22c55e';
}

function KVRow({ k, v }) {
  return (
    <>
      <span className="drawer-key">{k}</span>
      <span className="drawer-val">{v ?? '—'}</span>
    </>
  );
}

function UsageBar({ label, value, color }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
        <span style={{ color: 'var(--text2)' }}>{label}</span>
        <span style={{ fontWeight: 600, color }}>{value}%</span>
      </div>
      <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${value}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.6s' }} />
      </div>
    </div>
  );
}

function getInstanceStorageCharts(s) {
  if (!s) return [];
  const charts = [];

  if (s.family === 'Compute') {
    if (s.filesystems && s.filesystems.length > 0) {
      s.filesystems.forEach(fs => {
        const total = fs.diskTotalGB || 0;
        if (!total) return;
        const used = fs.diskUsedGB ?? null;
        const available = fs.diskFreeGB ?? (used != null ? total - used : null);
        charts.push({ label: fs.name, total, used: used ?? 0, available: available ?? total, noUsageData: used == null, unit: 'GB' });
      });
    } else if ((s.storageGB || s.osDiskSizeGB || s.diskSizeGb) > 0) {
      const total = s.storageGB || s.osDiskSizeGB || s.diskSizeGb;
      const hasDiskMetrics = s.diskUsedGB != null || s.diskFreeGB != null;
      let used = 0, available = total;
      if (hasDiskMetrics) {
        if (s.diskUsedGB != null && s.diskFreeGB != null) { used = s.diskUsedGB; available = s.diskFreeGB; }
        else if (s.diskTotalGB != null && s.diskUsedGB != null) { used = s.diskUsedGB; available = s.diskTotalGB - s.diskUsedGB; }
        else if (s.diskTotalGB != null && s.diskFreeGB != null) { available = s.diskFreeGB; used = s.diskTotalGB - s.diskFreeGB; }
      }
      const diskLabel = s.osDiskSizeGB ? 'OS Disk' : s.diskSizeGb ? 'Boot Disk' : 'EBS Storage';
      charts.push({ label: diskLabel, total, used, available, noUsageData: !hasDiskMetrics, unit: 'GB' });
    }
  }

  if (s.family === 'Database' && s.allocatedStorageGB > 0) {
    const total = s.allocatedStorageGB;
    const free = s.freeStorageGB ?? null;
    const used = free != null ? Math.max(0, total - free) : null;
    charts.push({ label: 'Allocated Storage', total, used: used ?? 0, available: free ?? total, noUsageData: used == null, unit: 'GB' });
  }

  return charts;
}

function sgLabel(sg) {
  if (typeof sg === 'string') return sg;
  return sg.name || sg.id || '?';
}

function formatPortRange(rule) {
  if (!rule) return '—';
  const proto = rule.protocol;
  if (proto === 'All' || proto === '-1') return 'All Traffic';
  if (proto === 'icmp' || proto === 'icmpv6') return 'ICMP';
  const from = rule.fromPort;
  const to = rule.toPort;
  if (from === undefined || from === null || from === -1) return 'All Ports';
  if (from === to) return String(from);
  if (from === 0 && to === 65535) return 'All (0–65535)';
  return `${from}–${to}`;
}

function EndpointTags({ endpoints, isSource }) {
  if (!endpoints || endpoints.length === 0) return <span style={{ color: 'var(--text3)', fontSize: 11 }}>—</span>;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
      {endpoints.map((e, i) => (
        <span
          key={i}
          className={e.type === 'sg' ? 'net-tag net-tag-sg' : 'net-tag'}
          title={e.desc || undefined}
        >
          {e.type === 'sg'
            ? (e.name ? `${e.name} (${e.value})` : e.value)
            : e.value}
        </span>
      ))}
    </div>
  );
}

function RulesTable({ rules, direction }) {
  if (!rules || rules.length === 0) {
    return <div style={{ fontSize: 12, color: 'var(--text3)', padding: '6px 0' }}>No {direction.toLowerCase()} rules</div>;
  }
  const endpointKey = direction === 'Inbound' ? 'sources' : 'destinations';
  return (
    <table className="net-rules-table">
      <thead>
        <tr>
          <th>Protocol</th>
          <th>Port Range</th>
          <th>{direction === 'Inbound' ? 'Source' : 'Destination'}</th>
        </tr>
      </thead>
      <tbody>
        {rules.map((rule, i) => (
          <tr key={i}>
            <td>
              <span className={`proto-badge proto-${(rule.protocol || 'all').toLowerCase()}`}>
                {rule.protocol || 'All'}
              </span>
            </td>
            <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{formatPortRange(rule)}</td>
            <td><EndpointTags endpoints={rule[endpointKey]} isSource={direction === 'Inbound'} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function fmtBytes(bytes) {
  if (!bytes) return '0 B';
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(2)} MB`;
  if (bytes >= 1024)      return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

function buildTree(objects) {
  const folders = {};
  const rootFiles = [];
  for (const obj of objects || []) {
    const parts = obj.key.split('/');
    if (parts.length === 1 || (parts.length === 2 && parts[1] === '')) {
      if (parts[0]) rootFiles.push(obj);
    } else {
      const folder = parts[0];
      if (!folders[folder]) folders[folder] = { name: folder, files: [], size: 0 };
      folders[folder].files.push({ ...obj, shortKey: parts.slice(1).join('/') });
      folders[folder].size += obj.size || 0;
    }
  }
  return { folders: Object.values(folders).sort((a, b) => b.size - a.size), rootFiles };
}

function S3FileBrowser({ objects, hasMore }) {
  const [openFolder, setOpenFolder] = useState(null);
  const { folders, rootFiles } = buildTree(objects);

  const rowStyle = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '5px 8px', borderRadius: 5, fontSize: 12,
  };
  const sizeStyle = { color: 'var(--text3)', fontSize: 11, whiteSpace: 'nowrap', marginLeft: 8 };

  return (
    <div style={{ border: '0.5px solid var(--border)', borderRadius: 8, overflow: 'hidden', maxHeight: 340, overflowY: 'auto' }}>
      {folders.map(folder => (
        <div key={folder.name}>
          <div
            style={{ ...rowStyle, cursor: 'pointer', background: openFolder === folder.name ? 'var(--bg)' : '', borderBottom: '0.5px solid var(--border)' }}
            onClick={() => setOpenFolder(openFolder === folder.name ? null : folder.name)}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <span style={{ color: '#eab308', fontSize: 13 }}>{openFolder === folder.name ? '▾' : '▸'}</span>
              <span style={{ fontSize: 13 }}>📁</span>
              {folder.name}/
            </span>
            <span style={sizeStyle}>{folder.files.length} files · {fmtBytes(folder.size)}</span>
          </div>
          {openFolder === folder.name && folder.files.map((f, i) => (
            <div key={i} style={{ ...rowStyle, paddingLeft: 28, background: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.02)', borderBottom: '0.5px solid var(--border)' }}>
              <span style={{ color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ fontSize: 12 }}>📄</span>{f.shortKey}
              </span>
              <span style={sizeStyle}>{fmtBytes(f.size)}</span>
            </div>
          ))}
        </div>
      ))}
      {rootFiles.map((f, i) => (
        <div key={i} style={{ ...rowStyle, borderBottom: '0.5px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.02)' }}>
          <span style={{ color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontSize: 12 }}>📄</span>{f.key}
          </span>
          <span style={sizeStyle}>{fmtBytes(f.size)}</span>
        </div>
      ))}
      {folders.length === 0 && rootFiles.length === 0 && (
        <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text3)', fontSize: 12 }}>Bucket is empty</div>
      )}
      {hasMore && (
        <div style={{ padding: '8px 12px', fontSize: 11, color: 'var(--text3)', textAlign: 'center', borderTop: '0.5px solid var(--border)' }}>
          Showing first 2000 objects — bucket has more
        </div>
      )}
    </div>
  );
}

export default function ResourceDetailDrawer({ resource: s, open, onClose, allServices }) {
  const [s3Details, setS3Details] = useState(null);
  const [s3Loading, setS3Loading] = useState(false);
  const [activeSG, setActiveSG] = useState(null); // SG resource currently expanded

  useEffect(() => {
    setActiveSG(null);
    if (!open || s?.type !== 'S3 Bucket' || !s?.rawId) {
      setS3Details(null);
      return;
    }
    setS3Loading(true);
    setS3Details(null);
    api.getS3Details(s.rawId, s.accountId)
      .then(data => setS3Details(data))
      .catch(err => setS3Details({ error: err.message }))
      .finally(() => setS3Loading(false));
  }, [open, s?.rawId, s?.accountId]);

  if (!open || !s) return null;

  const provider = s.id?.split('-')[0] === 'aws' ? 'aws'
    : s.id?.startsWith('gcp') ? 'gcp'
    : s.id?.startsWith('az') ? 'azure'
    : 'aws';
  const meta = PROVIDER_META[provider];
  const icon = FAMILY_ICONS[s.family] || '☁️';

  // Find connected services
  const connectedServices = (s.connections || []).map(id =>
    allServices?.find(svc => svc.id === id)
  ).filter(Boolean);

  // Tags
  const tags = s.tags || {};

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer">
        <div className="drawer-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                {icon}
              </div>
              <div>
                <div className="drawer-title">{s.name}</div>
                <div className="drawer-subtitle">{s.type} · {meta.label}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <span className={`badge badge-${s.health}`}>
                {s.health === 'healthy' ? '✓ Healthy' : s.health === 'warning' ? '⚠ Warning' : '✗ Critical'}
              </span>
              <span className="region-badge">{s.region}{s.az ? ` · ${s.az}` : s.zone ? ` · ${s.zone}` : ''}</span>
              {s.status && <span className="badge badge-active">{s.status}</span>}
            </div>
          </div>
          <button className="drawer-close" onClick={onClose}>✕</button>
        </div>

        <div className="drawer-body">

          {/* Cost */}
          <div className="drawer-section">
            <div className="drawer-metric-grid">
              <div className="drawer-metric-card">
                <div className="drawer-metric-label">Monthly Cost</div>
                <div className="drawer-metric-val" style={{ color: meta.color }}>{fmt.usd2(s.cost || s.costMonth || 0)}</div>
                <div className="drawer-metric-sub">estimated</div>
              </div>
              {s.uptime && (
                <div className="drawer-metric-card">
                  <div className="drawer-metric-label">Uptime</div>
                  <div className="drawer-metric-val">{s.uptime}</div>
                  <div className="drawer-metric-sub">continuous</div>
                </div>
              )}
              {s.cpu !== undefined && (
                <div className="drawer-metric-card">
                  <div className="drawer-metric-label">CPU Usage</div>
                  <div className="drawer-metric-val" style={{ color: getUsageColor(s.cpu) }}>{s.cpu}%</div>
                  <div className="drawer-metric-sub">current</div>
                </div>
              )}
              {s.memUsage !== undefined && (
                <div className="drawer-metric-card">
                  <div className="drawer-metric-label">Memory Usage</div>
                  <div className="drawer-metric-val" style={{ color: getUsageColor(s.memUsage) }}>{s.memUsage}%</div>
                  <div className="drawer-metric-sub">of {s.memory || 'total'}</div>
                </div>
              )}
            </div>
          </div>

          {/* Resource utilization bars */}
          {(s.cpu !== undefined || s.memUsage !== undefined) && (
            <div className="drawer-section">
              <div className="drawer-section-title">📊 Resource Utilization</div>
              {s.cpu !== undefined && <UsageBar label="CPU" value={s.cpu} color={getUsageColor(s.cpu)} />}
              {s.memUsage !== undefined && <UsageBar label="Memory" value={s.memUsage} color={getUsageColor(s.memUsage)} />}
              {s.diskUsage !== undefined && <UsageBar label="Disk" value={s.diskUsage} color={getUsageColor(s.diskUsage)} />}
            </div>
          )}

          {/* Space utilization (per-instance storage) */}
          {(() => {
            const storageCharts = getInstanceStorageCharts(s);
            if (!storageCharts.length) return null;
            return (
              <div className="drawer-section">
                <div className="drawer-section-title">💾 Space Utilization</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, paddingTop: 8, justifyContent: 'flex-start' }}>
                  {storageCharts.map((chart, i) => (
                    <PieChart3D
                      key={i}
                      label={chart.label}
                      total={chart.total}
                      used={chart.used}
                      available={chart.available}
                      noUsageData={chart.noUsageData}
                      unit={chart.unit}
                      color={meta.color}
                    />
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Compute specs */}
          {(s.vcpu || s.instanceType || s.machineType || s.size) && (
            <div className="drawer-section">
              <div className="drawer-section-title">⚙️ Specification</div>
              <div className="drawer-kv">
                {(s.instanceType || s.machineType || s.size) && <KVRow k="Instance Type" v={s.instanceType || s.machineType || s.size} />}
                {s.vcpu && <KVRow k="vCPUs" v={s.vcpu} />}
                {s.memory && <KVRow k="Memory" v={s.memory} />}
                {s.storage && <KVRow k="Storage" v={s.storage} />}
                {s.os && <KVRow k="OS" v={s.os} />}
                {s.engine && <KVRow k="Engine" v={s.engine} />}
                {s.runtime && <KVRow k="Runtime" v={s.runtime} />}
                {s.tier && <KVRow k="Tier" v={s.tier} />}
              </div>
            </div>
          )}

          {/* Network */}
          {(s.ip || s.publicIp || s.vpc || s.vnet) && (
            <div className="drawer-section">
              <div className="drawer-section-title">🌐 Network</div>
              <div className="drawer-kv">
                {s.ip && <KVRow k="Private IP" v={s.ip} />}
                {s.publicIp && <KVRow k="Public IP" v={s.publicIp} />}
                {s.vpc && <KVRow k="VPC" v={s.vpc} />}
                {s.vnet && <KVRow k="VNet" v={s.vnet} />}
                {s.subnet && <KVRow k="Subnet" v={s.subnet} />}
                {s.subnetwork && <KVRow k="Subnetwork" v={s.subnetwork} />}
                {s.network && <KVRow k="Network" v={s.network} />}
                {s.securityGroups && s.securityGroups.length > 0 && (
                  <>
                    <span className="drawer-key">Security Groups</span>
                    <span className="drawer-val" style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                      {s.securityGroups.map((sg, i) => {
                        const sgId   = sg.id || sg;
                        const sgName = sg.name || sgId;
                        const sgFull = allServices?.find(svc =>
                          svc.type === 'Security Group' && (svc.rawId === sgId || svc.id === sgId || svc.name === sgId)
                        );
                        const isOpen = activeSG?.rawId === sgId || activeSG?.id === sgId;
                        return (
                          <span
                            key={i}
                            onClick={() => setActiveSG(isOpen ? null : (sgFull || { rawId: sgId, name: sgName, noData: true }))}
                            style={{
                              fontSize: 11, padding: '2px 9px', borderRadius: 5,
                              background: isOpen ? 'rgba(129,140,248,0.18)' : 'rgba(129,140,248,0.08)',
                              border: `1px solid ${isOpen ? '#818cf8' : 'rgba(129,140,248,0.35)'}`,
                              color: '#818cf8', cursor: 'pointer', fontFamily: 'monospace',
                              transition: 'all 0.15s', userSelect: 'none',
                            }}
                          >
                            {sgName} {sgFull ? '▾' : '?'}
                          </span>
                        );
                      })}
                    </span>
                  </>
                )}
                {s.networkIn && <KVRow k="Network In" v={`${s.networkIn} KB/s`} />}
                {s.networkOut && <KVRow k="Network Out" v={`${s.networkOut} KB/s`} />}
              </div>
            </div>
          )}

          {/* Inline Security Group Detail — shown when user clicks a SG chip on an EC2 */}
          {activeSG && s.type !== 'Security Group' && (
            <div className="drawer-section" style={{ border: '1px solid rgba(129,140,248,0.35)', borderRadius: 10, padding: '14px 16px', background: 'rgba(129,140,248,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>
                    {activeSG.name}
                  </div>
                  <div style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text3)', marginTop: 2 }}>
                    {activeSG.rawId}
                    {activeSG.vpcId && <span style={{ marginLeft: 8 }}>VPC: {activeSG.vpcId}</span>}
                    {activeSG.region && <span style={{ marginLeft: 8 }}>{activeSG.region}</span>}
                  </div>
                  {activeSG.description && (
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>{activeSG.description}</div>
                  )}
                </div>
                <button
                  onClick={() => setActiveSG(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 16 }}
                >✕</button>
              </div>

              {activeSG.noData ? (
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                  Full rules not available — this SG may be in a different region or not yet fetched.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  {/* Inbound */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <span className="rules-dir-badge rules-inbound" style={{ fontSize: 10 }}>↓ Inbound</span>
                      <span style={{ fontSize: 11, color: 'var(--text3)' }}>{(activeSG.inboundRules || []).length} rules</span>
                    </div>
                    {!(activeSG.inboundRules?.length)
                      ? <div style={{ fontSize: 11, color: 'var(--text3)' }}>No inbound rules</div>
                      : <RulesTable rules={activeSG.inboundRules} direction="Inbound" />
                    }
                  </div>
                  {/* Outbound */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <span className="rules-dir-badge rules-outbound" style={{ fontSize: 10 }}>↑ Outbound</span>
                      <span style={{ fontSize: 11, color: 'var(--text3)' }}>{(activeSG.outboundRules || []).length} rules</span>
                    </div>
                    {!(activeSG.outboundRules?.length)
                      ? <div style={{ fontSize: 11, color: 'var(--text3)' }}>No outbound rules</div>
                      : <RulesTable rules={activeSG.outboundRules} direction="Outbound" />
                    }
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Security Group Rules — triggers on type OR presence of rule arrays */}
          {(s.type === 'Security Group' || s.inboundRules != null || s.outboundRules != null) && (
            <div className="drawer-section">
              <div className="drawer-section-title">🛡️ Security Group Rules</div>
              {s.description && (
                <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 10 }}>{s.description}</div>
              )}
              {s.vpcId && (
                <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 10 }}>
                  VPC: <span style={{ color: 'var(--text)', fontWeight: 500 }}>{s.vpcId}</span>
                </div>
              )}
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <span className="rules-dir-badge rules-inbound">↓ Inbound</span>
                  <span style={{ fontSize: 11, color: 'var(--text3)' }}>({(s.inboundRules || []).length} rules)</span>
                </div>
                <RulesTable rules={s.inboundRules} direction="Inbound" />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <span className="rules-dir-badge rules-outbound">↑ Outbound</span>
                  <span style={{ fontSize: 11, color: 'var(--text3)' }}>({(s.outboundRules || []).length} rules)</span>
                </div>
                <RulesTable rules={s.outboundRules} direction="Outbound" />
              </div>
              {/* SG-to-SG connectivity */}
              {(() => {
                const allRules = [...(s.inboundRules || []), ...(s.outboundRules || [])];
                const sgRefs = [];
                allRules.forEach(rule => {
                  const endpoints = rule.sources || rule.destinations || [];
                  endpoints.filter(e => e.type === 'sg').forEach(e => {
                    if (!sgRefs.find(r => r.value === e.value)) sgRefs.push(e);
                  });
                });
                if (sgRefs.length === 0) return null;
                return (
                  <div style={{ marginTop: 12, padding: '8px 10px', background: 'rgba(99,102,241,0.06)', borderRadius: 6, border: '0.5px solid rgba(99,102,241,0.2)' }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#6366f1', marginBottom: 6 }}>🔗 Connected Security Groups</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {sgRefs.map((e, i) => (
                        <span key={i} className="net-tag net-tag-sg">
                          {e.name ? `${e.name} (${e.value})` : e.value}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* VPC Details — triggers on type OR presence of cidr/subnets fields */}
          {(s.type === 'VPC' || s.cidr != null || s.subnets != null) && s.family !== 'Compute' && (
            <div className="drawer-section">
              <div className="drawer-section-title">🌐 VPC Details</div>
              <div className="drawer-kv" style={{ marginBottom: s.subnets?.length ? 12 : 0 }}>
                {s.cidr && <KVRow k="IPv4 CIDR" v={s.cidr} />}
                {s.ipv6Cidr && <KVRow k="IPv6 CIDR" v={s.ipv6Cidr} />}
                {s.isDefault !== undefined && <KVRow k="Default VPC" v={s.isDefault ? 'Yes' : 'No'} />}
                {s.tenancy && <KVRow k="Tenancy" v={s.tenancy} />}
                {s.dhcpOptionsId && <KVRow k="DHCP Options" v={s.dhcpOptionsId} />}
              </div>
              {s.internetGateway && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', marginBottom: 6 }}>INTERNET GATEWAY</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: 'rgba(34,197,94,0.06)', border: '0.5px solid rgba(34,197,94,0.2)', borderRadius: 6 }}>
                    <span style={{ fontSize: 14 }}>🌍</span>
                    <span style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--text)' }}>{s.internetGateway.id}</span>
                    <span style={{ marginLeft: 'auto', fontSize: 11, color: '#22c55e', fontWeight: 500 }}>{s.internetGateway.state || 'attached'}</span>
                  </div>
                </div>
              )}
              {s.natGateways?.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', marginBottom: 6 }}>NAT GATEWAYS ({s.natGateways.length})</div>
                  {s.natGateways.map((nat, i) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 12px', padding: '7px 10px', background: 'var(--bg)', border: '0.5px solid var(--border)', borderRadius: 6, marginBottom: 4, fontSize: 11 }}>
                      <span style={{ color: 'var(--text3)' }}>ID</span><span style={{ fontFamily: 'monospace', color: 'var(--text)' }}>{nat.id}</span>
                      <span style={{ color: 'var(--text3)' }}>State</span><span style={{ color: nat.state === 'available' ? '#22c55e' : '#eab308' }}>{nat.state}</span>
                      {nat.publicIp && <><span style={{ color: 'var(--text3)' }}>Public IP</span><span style={{ color: 'var(--text)' }}>{nat.publicIp}</span></>}
                      {nat.privateIp && <><span style={{ color: 'var(--text3)' }}>Private IP</span><span style={{ color: 'var(--text)' }}>{nat.privateIp}</span></>}
                    </div>
                  ))}
                </div>
              )}
              {s.subnets?.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', marginBottom: 6 }}>SUBNETS ({s.subnets.length})</div>
                  <table className="net-rules-table">
                    <thead>
                      <tr>
                        <th>CIDR</th>
                        <th>AZ</th>
                        <th>Type</th>
                        <th>Free IPs</th>
                      </tr>
                    </thead>
                    <tbody>
                      {s.subnets.map((sub, i) => (
                        <tr key={i}>
                          <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{sub.cidr}</td>
                          <td>{sub.az}</td>
                          <td>
                            <span className={sub.public ? 'net-tag net-tag-public' : 'net-tag net-tag-private'}>
                              {sub.public ? 'Public' : 'Private'}
                            </span>
                          </td>
                          <td style={{ color: 'var(--text3)' }}>{sub.availableIps ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Route Table — triggers on type OR presence of routes array */}
          {(s.type === 'Route Table' || s.routes != null) && (
            <div className="drawer-section">
              <div className="drawer-section-title">🗺️ Route Table</div>
              <div className="drawer-kv" style={{ marginBottom: 12 }}>
                {s.vpcId && <KVRow k="VPC" v={s.vpcId} />}
                {s.isMain !== undefined && <KVRow k="Main Table" v={s.isMain ? 'Yes' : 'No'} />}
              </div>
              {s.associations?.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', marginBottom: 6 }}>SUBNET ASSOCIATIONS ({s.associations.length})</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {s.associations.map((assoc, i) => (
                      <span key={i} className={assoc.isMain ? 'net-tag net-tag-main' : 'net-tag'} title={`State: ${assoc.state}`}>
                        {assoc.subnetId || 'Main (all subnets)'}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {s.routes?.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', marginBottom: 6 }}>ROUTES ({s.routes.length})</div>
                  <table className="net-rules-table">
                    <thead>
                      <tr>
                        <th>Destination</th>
                        <th>Target</th>
                        <th>State</th>
                      </tr>
                    </thead>
                    <tbody>
                      {s.routes.map((route, i) => (
                        <tr key={i}>
                          <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{route.destination || '—'}</td>
                          <td>
                            <span className={
                              route.target === 'local' ? 'net-tag net-tag-local' :
                              route.target?.startsWith('igw-') ? 'net-tag net-tag-igw' :
                              route.target?.startsWith('nat-') ? 'net-tag net-tag-nat' :
                              'net-tag'
                            }>
                              {route.target || '—'}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontSize: 11, color: route.state === 'active' ? '#22c55e' : route.state === 'blackhole' ? '#ef4444' : 'var(--text3)' }}>
                              {route.state || '—'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Database-specific */}
          {s.connections !== undefined && typeof s.connections === 'number' && (
            <div className="drawer-section">
              <div className="drawer-section-title">🗄️ Database Details</div>
              <div className="drawer-kv">
                <KVRow k="Active Connections" v={s.connections} />
                {s.maxConnections && <KVRow k="Max Connections" v={s.maxConnections} />}
                {s.multiAZ !== undefined && <KVRow k="Multi-AZ" v={s.multiAZ ? 'Yes' : 'No'} />}
                {s.replicaCount && <KVRow k="Read Replicas" v={s.replicaCount} />}
                {s.backupRetention && <KVRow k="Backup Retention" v={`${s.backupRetention} days`} />}
                {s.geoReplication !== undefined && <KVRow k="Geo Replication" v={s.geoReplication ? 'Enabled' : 'Disabled'} />}
              </div>
            </div>
          )}

          {/* Storage-specific */}
          {s.sizeGB !== undefined && (
            <div className="drawer-section">
              <div className="drawer-section-title">Storage Details</div>
              <div className="drawer-kv">
                {s.sizeGB > 0 && <KVRow k="Total Size (CloudWatch)" v={`${s.sizeGB.toLocaleString()} GB`} />}
                {s.objectsTotalSizeBytes > 0 && <KVRow k="Listed Size" v={fmtBytes(s.objectsTotalSizeBytes)} />}
                {s.objectCount != null && <KVRow k="Total Objects" v={fmt.num(s.objectCount)} />}
                {s.blobCount && <KVRow k="Blobs" v={fmt.num(s.blobCount)} />}
                {s.storageClass && <KVRow k="Storage Class" v={s.storageClass} />}
                {s.accessTier && <KVRow k="Access Tier" v={s.accessTier} />}
                {s.encryption && <KVRow k="Encryption" v={s.encryption} />}
                {s.versioning !== undefined && <KVRow k="Versioning" v={s.versioning ? 'Enabled' : 'Disabled'} />}
                {s.blockPublicAccess !== undefined && <KVRow k="Public Access Block" v={s.blockPublicAccess ? 'Enabled' : 'Disabled'} />}
              </div>
            </div>
          )}

          {/* S3 File Browser */}
          {s.type === 'S3 Bucket' && (
            <div className="drawer-section">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div className="drawer-section-title" style={{ margin: 0 }}>
                  Files &amp; Folders
                  {s3Details?.hasMoreObjects && <span style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 400, marginLeft: 6 }}>(first 5000 shown)</span>}
                </div>
                {!s3Loading && s3Details && (
                  <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                    {(s3Details.objects || []).length} listed · {fmtBytes(s3Details.objectsTotalSizeBytes)}
                  </span>
                )}
              </div>
              {s3Loading && (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
                  <div style={{ marginBottom: 8 }}>Fetching files from S3...</div>
                  <div style={{ height: 3, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: '#FF9900', width: '60%', borderRadius: 2, animation: 'loadingSlide 1.2s linear infinite' }} />
                  </div>
                </div>
              )}
              {!s3Loading && s3Details?.error && (
                <div style={{ fontSize: 12, color: '#ef4444', padding: '8px 0' }}>
                  Error: {s3Details.error}
                </div>
              )}
              {!s3Loading && s3Details && !s3Details.error && (
                <S3FileBrowser objects={s3Details.objects} hasMore={s3Details.hasMoreObjects} />
              )}
            </div>
          )}

          {/* S3 Bucket Policy */}
          {s.type === 'S3 Bucket' && (
            <div className="drawer-section">
              <div className="drawer-section-title">Bucket Policy</div>
              {s3Loading && (
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>Fetching policy...</div>
              )}
              {!s3Loading && s3Details?.policy && (
                <pre style={{
                  background: 'var(--bg)', border: '0.5px solid var(--border)',
                  borderRadius: 8, padding: '12px 14px',
                  fontSize: 11, color: 'var(--text2)', lineHeight: 1.6,
                  overflowX: 'auto', maxHeight: 300, overflowY: 'auto',
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0,
                }}>
                  {JSON.stringify(s3Details.policy, null, 2)}
                </pre>
              )}
              {!s3Loading && s3Details && !s3Details.policy && (
                <div style={{ fontSize: 12, color: 'var(--text3)', padding: '10px 0' }}>
                  No bucket policy attached
                </div>
              )}
            </div>
          )}

          {/* Serverless */}
          {s.invocations !== undefined && (
            <div className="drawer-section">
              <div className="drawer-section-title">⚡ Serverless Metrics</div>
              <div className="drawer-kv">
                <KVRow k="Invocations/mo" v={fmt.abbr(s.invocations)} />
                {s.errors !== undefined && <KVRow k="Errors" v={s.errors} />}
                {s.duration && <KVRow k="Avg Duration" v={`${s.duration}ms`} />}
                {s.memorySize && <KVRow k="Memory" v={s.memorySize} />}
                {s.timeout && <KVRow k="Timeout" v={`${s.timeout}s`} />}
                {s.throttles !== undefined && <KVRow k="Throttles" v={s.throttles} />}
              </div>
            </div>
          )}

          {/* Container */}
          {s.pods !== undefined && (
            <div className="drawer-section">
              <div className="drawer-section-title">☸️ Kubernetes Details</div>
              <div className="drawer-kv">
                {s.kubernetesVersion && <KVRow k="K8s Version" v={s.kubernetesVersion} />}
                {s.nodes && <KVRow k="Nodes" v={s.nodes} />}
                {s.nodeGroups && <KVRow k="Node Groups" v={s.nodeGroups} />}
                <KVRow k="Pods" v={`${s.runningPods || s.pods}/${s.pods} running`} />
                {s.nodeType && <KVRow k="Node Type" v={s.nodeType} />}
              </div>
            </div>
          )}

          {/* Tags */}
          {Object.keys(tags).length > 0 && (
            <div className="drawer-section">
              <div className="drawer-section-title">🏷️ Tags</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {Object.entries(tags).map(([k, v]) => (
                  <span key={k} className="tag-chip">{k}: {v}</span>
                ))}
              </div>
            </div>
          )}

          {/* Connected services */}
          {connectedServices.length > 0 && (
            <div className="drawer-section">
              <div className="drawer-section-title">🔗 Connected Services ({connectedServices.length})</div>
              {connectedServices.map(cs => {
                const cp = cs.id?.startsWith('gcp') ? 'gcp' : cs.id?.startsWith('az') ? 'azure' : 'aws';
                const cm = PROVIDER_META[cp];
                const icon = FAMILY_ICONS[cs.family] || '☁️';
                return (
                  <div key={cs.id} className="connected-service">
                    <span style={{ fontSize: 14 }}>{icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500 }}>{cs.name}</div>
                      <div style={{ fontSize: 10, color: 'var(--text3)' }}>{cs.type} · {cm.label} · {cs.region}</div>
                    </div>
                    <span className={`badge badge-${cs.health}`} style={{ fontSize: 10 }}>{cs.health}</span>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      </div>
    </>
  );
}
