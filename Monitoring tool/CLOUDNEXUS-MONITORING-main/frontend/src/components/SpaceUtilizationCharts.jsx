import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import ProviderLogo from './ProviderLogo';

const USED_COLOR = '#ef4444';
const FREE_COLOR = '#22c55e';
const UNKNOWN_COLOR = '#3b82f6';

function fmtGB(val, unit = 'GB') {
  if (val == null) return '—';
  const n = Number(val);
  if (isNaN(n)) return '—';
  return n < 1 ? `${Math.round(n * 1024)} MB` : `${n.toFixed(2)} ${unit}`;
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--border)',
      borderRadius: 6, padding: '6px 10px', fontSize: 12,
    }}>
      <span style={{ color: d.payload.color, fontWeight: 600 }}>{d.name}: </span>
      <span>{fmtGB(d.payload.rawValue)} ({d.value.toFixed(1)}%)</span>
    </div>
  );
}

export function PieChart3D({ total, used, available, label, noUsageData = false, unit = 'GB' }) {
  const t = Number(total) || 0;
  const u = Number(used) || 0;
  const a = Number(available) || 0;
  const usedPct  = t > 0 ? (u / t) * 100 : 0;
  const freePct  = t > 0 ? (a / t) * 100 : 0;
  const totalStr = fmtGB(t, unit);
  const usedStr  = fmtGB(u, unit);
  const availStr = fmtGB(a, unit);

  if (noUsageData) {
    const data = [{ name: 'EBS Provisioned', value: 100, color: UNKNOWN_COLOR, rawValue: total }];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 180 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 2,
          textAlign: 'center', maxWidth: 170, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
          title={label}>{label}</div>
        <div style={{ width: 150, height: 150, position: 'relative' }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={42} outerRadius={62}
                dataKey="value" startAngle={90} endAngle={-270} strokeWidth={0}>
                <Cell fill={UNKNOWN_COLOR} opacity={0.85} />
              </Pie>
              <Tooltip content={({ active }) => active
                ? <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', fontSize: 12 }}>
                    <span style={{ color: UNKNOWN_COLOR, fontWeight: 600 }}>EBS Provisioned: </span>{totalStr}
                  </div>
                : null}
              />
            </PieChart>
          </ResponsiveContainer>
          <div style={{
            position: 'absolute', inset: 0, display: 'flex',
            flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none',
          }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: UNKNOWN_COLOR }}>{totalStr}</span>
            <span style={{ fontSize: 9, color: 'var(--text3)', marginTop: 2 }}>EBS</span>
          </div>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text2)', width: '100%', padding: '0 4px' }}>
          <Row label="Provisioned" val={totalStr} />
          <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 4, lineHeight: 1.4 }}>
            In-VM usage not available via AWS API without an agent
          </div>
        </div>
      </div>
    );
  }

  const data = [
    { name: 'Used',      value: usedPct,  color: USED_COLOR, rawValue: used },
    { name: 'Available', value: freePct,  color: FREE_COLOR, rawValue: available },
  ].filter(d => d.value > 0);

  if (data.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 180 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 2,
        textAlign: 'center', maxWidth: 170, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
        title={label}>{label}</div>
      <div style={{ width: 150, height: 150, position: 'relative' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={42} outerRadius={62}
              dataKey="value" startAngle={90} endAngle={-270} strokeWidth={1} stroke="var(--card)">
              {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div style={{
          position: 'absolute', inset: 0, display: 'flex',
          flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <span style={{ fontSize: 13, fontWeight: 700,
            color: usedPct >= 85 ? USED_COLOR : usedPct >= 70 ? '#eab308' : FREE_COLOR }}>
            {usedPct.toFixed(1)}%
          </span>
          <span style={{ fontSize: 9, color: 'var(--text3)' }}>used</span>
        </div>
      </div>
      <div style={{ fontSize: 11, color: 'var(--text2)', width: '100%', padding: '0 4px' }}>
        <Row label="Total"     val={`${totalStr} (100%)`}                          />
        <Row label="Used"      val={`${usedStr} (${usedPct.toFixed(2)}%)`}         valColor={USED_COLOR} />
        <Row label="Available" val={`${availStr} (${freePct.toFixed(2)}%)`}        valColor={FREE_COLOR} />
      </div>
    </div>
  );
}

function Row({ label, val, valColor }) {
  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 2, alignItems: 'flex-start' }}>
      <span style={{ color: '#9ca3af', minWidth: 58, flexShrink: 0 }}>{label}</span>
      <span style={{ fontWeight: 600, color: valColor || 'var(--text)', wordBreak: 'break-word' }}>{val}</span>
    </div>
  );
}

// Extract storage data from resources — real data only, no estimates or randoms
function extractStorageData(services, provider) {
  const charts = [];

  if (provider === 'aws') {
    const ec2 = services.filter(s => s.family === 'Compute' && s.storageGB > 0);
    ec2.forEach(s => {
      if (s.filesystems && s.filesystems.length > 0) {
        // Real filesystem usage (from CWAgent or SSM if available)
        s.filesystems.forEach(fs => {
          const total = fs.diskTotalGB || 0;
          if (!total) return;
          const used = fs.diskUsedGB ?? null;
          const available = fs.diskFreeGB ?? (used != null ? total - used : null);
          charts.push({
            label: `${s.name} ${fs.name}`,
            total, used: used ?? 0, available: available ?? total,
            noUsageData: used == null, unit: 'GB',
          });
        });
      } else if (s.ebsVolumes && s.ebsVolumes.length > 0) {
        // Per-EBS-volume provisioned size from DescribeVolumes (access key only)
        s.ebsVolumes.filter(v => v.sizeGB > 0).forEach((vol, idx) => {
          const deviceLabel = vol.deviceName || vol.volumeId || `Vol ${idx + 1}`;
          charts.push({
            label: `${s.name} (${deviceLabel})`,
            total: vol.sizeGB, used: 0, available: vol.sizeGB,
            noUsageData: true, unit: 'GB',
          });
        });
      } else if (s.storageGB > 0) {
        charts.push({
          label: `EC2: ${s.name}`,
          total: s.storageGB, used: 0, available: s.storageGB,
          noUsageData: true, unit: 'GB',
        });
      }
    });

    const rds = services.filter(s => s.family === 'Database' && s.allocatedStorageGB > 0);
    rds.forEach(s => {
      const total = s.allocatedStorageGB;
      const free  = s.freeStorageGB ?? null;
      const used  = free != null ? Math.max(0, total - free) : null;
      if (total > 0) charts.push({
        label: `RDS: ${s.name}`, total, used: used ?? 0, available: free ?? total,
        noUsageData: used == null, unit: 'GB',
      });
    });

    // S3: real size from CloudWatch BucketSizeBytes (no agent, access-key only)
    services.filter(s => s.type === 'S3 Bucket' && s.sizeGB > 0).slice(0, 4).forEach(s => {
      charts.push({
        label: `S3: ${s.name}`, total: s.sizeGB, used: s.sizeGB, available: 0,
        noUsageData: false, unit: 'GB',
      });
    });

    // EFS: real usage from CloudWatch StorageBytes (no agent, access-key only)
    services.filter(s => s.type === 'EFS Filesystem' && s.sizeGB > 0).slice(0, 4).forEach(s => {
      charts.push({
        label: `EFS: ${s.name}`, total: s.sizeGB, used: s.sizeGB, available: 0,
        noUsageData: false, unit: 'GB',
      });
    });

  } else if (provider === 'gcp') {
    services.filter(s => s.family === 'Database' && s.dataDiskSizeGb > 0).forEach(s => {
      const total = s.dataDiskSizeGb || s.storageGB || 0;
      if (!total) return;
      const used = s.usedStorageGB ?? null;
      charts.push({ label: `SQL: ${s.name}`, total, used: used ?? 0,
        available: used != null ? total - used : total, noUsageData: used == null, unit: 'GB' });
    });
    services.filter(s => s.family === 'Compute' && s.diskSizeGb > 0).slice(0, 6).forEach(s => {
      const used = s.diskUsedGB ?? null;
      charts.push({ label: `VM: ${s.name}`, total: s.diskSizeGb, used: used ?? 0,
        available: used != null ? s.diskSizeGb - used : s.diskSizeGb, noUsageData: used == null, unit: 'GB' });
    });

  } else if (provider === 'azure') {
    services.filter(s => s.family === 'Database' && s.maxSizeBytes > 0).forEach(s => {
      const total = Math.round(s.maxSizeBytes / 1e9);
      if (!total) return;
      const used = s.currentSizeBytes ? Math.round(s.currentSizeBytes / 1e9) : null;
      charts.push({ label: `SQL: ${s.name}`, total, used: used ?? 0,
        available: used != null ? total - used : total, noUsageData: used == null, unit: 'GB' });
    });
    services.filter(s => s.family === 'Compute' && s.osDiskSizeGB > 0).slice(0, 6).forEach(s => {
      const used = s.diskUsedGB ?? null;
      charts.push({ label: `VM: ${s.name}`, total: s.osDiskSizeGB, used: used ?? 0,
        available: used != null ? s.osDiskSizeGB - used : s.osDiskSizeGB, noUsageData: used == null, unit: 'GB' });
    });
  }

  return charts.slice(0, 8);
}

export default function SpaceUtilizationCharts({ services, provider }) {
  const charts = extractStorageData(services, provider);
  const providerColors = { aws: '#FF9900', gcp: '#4285F4', azure: '#008AD7' };
  const providerNames = { aws: 'AWS', gcp: 'GCP', azure: 'Azure' };

  if (charts.length === 0) return null;

  return (
    <div className="section-card" style={{ marginTop: 16 }}>
      <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <ProviderLogo provider={provider} size={16} />
        <span style={{ color: providerColors[provider] }}>{providerNames[provider]}</span>
        <span>Space Utilization (relative to total)</span>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text3)', fontWeight: 400 }}>
          Filesystem &amp; Storage Overview
        </span>
      </div>

      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 20,
        padding: '16px 12px', justifyContent: 'flex-start', alignItems: 'flex-start',
      }}>
        {charts.map((chart, i) => (
          <PieChart3D key={i} {...chart} color={providerColors[provider]} />
        ))}
      </div>

      <div style={{
        display: 'flex', gap: 20, padding: '10px 12px',
        borderTop: '0.5px solid var(--border)', fontSize: 11, color: 'var(--text3)',
      }}>
        {[
          { color: USED_COLOR,    label: 'Used Space' },
          { color: FREE_COLOR,    label: 'Available Space' },
          { color: UNKNOWN_COLOR, label: 'EBS Provisioned (in-VM usage not available via API)' },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 12, height: 12, background: color, borderRadius: 2 }} />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
