import React, { useState, useEffect, useCallback } from 'react';
import { fetchNamedResources } from '../services/api';
import ProviderLogo from './ProviderLogo';

const PROVIDER_COLORS = { AWS: '#FF9900', GCP: '#4285F4', AZURE: '#008AD7' };

function SpecRow({ label, value }) {
  if (!value || value === '—') return null;
  return (
    <div style={{ display: 'flex', gap: 8, fontSize: 11, padding: '3px 0', borderBottom: '1px solid #f0f4ff' }}>
      <span style={{ color: '#94a3b8', minWidth: 120, flexShrink: 0 }}>{label}</span>
      <span style={{ color: '#374151', fontFamily: 'monospace', wordBreak: 'break-all' }}>{value}</span>
    </div>
  );
}

function ResourceRow({ resource, isLive }) {
  const [open, setOpen] = useState(false);
  const pc = PROVIDER_COLORS[resource.provider] || '#64748b';
  const stateColor = resource.state === 'running' || resource.state === 'active' || resource.state === 'Succeeded'
    ? '#22c55e' : resource.state === 'stopped' ? '#ef4444' : '#94a3b8';

  const specs    = resource.specs || {};
  const tags     = resource.tags  || {};
  const hasSpecs = Object.keys(specs).length > 0;
  const hasTags  = Object.keys(tags).length > 0;

  return (
    <>
      <tr
        onClick={() => hasSpecs && setOpen(v => !v)}
        style={{
          borderBottom: open ? 'none' : '1px solid #f0f4ff',
          cursor: hasSpecs ? 'pointer' : 'default',
          background: open ? '#f8faff' : 'transparent',
          transition: 'background 0.12s',
        }}
      >
        {/* Provider */}
        <td style={{ padding: '10px 10px', fontWeight: 700, color: pc, whiteSpace: 'nowrap' }}>
          <span style={{ display:'inline-flex', alignItems:'center', gap:4 }}>
            <ProviderLogo provider={resource.provider.toLowerCase()} size={12} />
            {resource.provider}
          </span>
        </td>
        {/* Type */}
        <td style={{ padding: '10px 10px', color: '#64748b', fontSize: 11, whiteSpace: 'nowrap' }}>
          {resource.type}
        </td>
        {/* User-defined name */}
        <td style={{ padding: '10px 10px' }}>
          <span style={{
            fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#1a1a2e',
            background: isLive ? '#f0fdf4' : '#f8faff',
            border: `1px solid ${isLive ? '#bbf7d0' : '#e2e8f5'}`,
            borderRadius: 4, padding: '2px 8px',
          }}>
            {resource.user_name}
          </span>
        </td>
        {/* Region */}
        <td style={{ padding: '10px 10px', color: '#64748b', fontSize: 11 }}>{resource.region || '—'}</td>
        {/* State */}
        <td style={{ padding: '10px 10px' }}>
          <span style={{
            background: stateColor + '18', color: stateColor,
            padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 700,
          }}>
            {resource.state || '—'}
          </span>
        </td>
        {/* Expand toggle */}
        <td style={{ padding: '10px 10px', textAlign: 'right' }}>
          {hasSpecs && (
            <span style={{ fontSize: 11, color: '#94a3b8', userSelect: 'none' }}>
              {open ? '▲ Hide specs' : '▼ View specs'}
            </span>
          )}
        </td>
      </tr>

      {/* Expanded specs + tags row */}
      {open && (
        <tr style={{ background: '#f8faff', borderBottom: '1px solid #e2e8f5' }}>
          <td colSpan={6} style={{ padding: '0 16px 14px 40px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 32px', marginTop: 10 }}>
              {/* Specs column */}
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>
                  Resource Specs
                </div>
                {Object.entries(specs).map(([k, v]) => (
                  <SpecRow key={k} label={k} value={String(v)} />
                ))}
              </div>
              {/* Tags column */}
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>
                  Tags / Labels
                </div>
                {hasTags ? (
                  Object.entries(tags).map(([k, v]) => (
                    <SpecRow key={k} label={k} value={String(v)} />
                  ))
                ) : (
                  <span style={{ fontSize: 11, color: '#c4c4c4' }}>No tags set</span>
                )}
                <div style={{ marginTop: 8 }}>
                  <SpecRow label="Resource ID" value={resource.resource_id} />
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function AllServicesTable({ mode = 'mock', defaultProvider = 'all' }) {
  const [data,      setData]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [filter,    setFilter]    = useState(defaultProvider);
  const [typeFilter, setTypeFilter] = useState('all'); // resource type filter
  const [search,    setSearch]    = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchNamedResources(mode);
      setData(res);
    } catch (e) {
      setError(e.message || 'Failed to load resources');
    } finally {
      setLoading(false);
    }
  }, [mode]);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div style={{ padding: '28px 0', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
      Fetching resources and names from cloud platforms…
    </div>
  );
  if (error)   return <div style={{ color: '#ef4444', fontSize: 13, padding: 8 }}>{error}</div>;
  if (!data)   return null;

  const resources = data.resources || [];
  const isLive    = data.source === 'live';

  // Build unique filter lists
  const providers  = ['all', ...new Set(resources.map(r => r.provider))];
  const types      = ['all', ...new Set(resources.map(r => r.type))];

  const filtered = resources.filter(r => {
    if (filter    !== 'all' && r.provider !== filter)  return false;
    if (typeFilter !== 'all' && r.type    !== typeFilter) return false;
    if (search && !r.user_name.toLowerCase().includes(search.toLowerCase()) &&
        !r.resource_id?.toLowerCase().includes(search.toLowerCase()) &&
        !r.region?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      {/* Status + filters bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 14 }}>
        {isLive ? (
          <span style={{ background: '#22c55e22', color: '#22c55e', padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>
            LIVE — names fetched from your cloud accounts
          </span>
        ) : (
          <span style={{ background: '#f97316' + '22', color: '#f97316', padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>
            ESTIMATED — connect cloud accounts for real resource names
          </span>
        )}

        {/* Search */}
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, ID, region…"
          style={{ flex: 1, minWidth: 180, padding: '5px 10px', border: '1px solid #e2e8f5', borderRadius: 6, fontSize: 12, outline: 'none' }}
        />

        {/* Provider filter */}
        <select
          value={filter}
          onChange={e => setFilter(e.target.value)}
          style={{ padding: '5px 8px', border: '1px solid #e2e8f5', borderRadius: 6, fontSize: 12, color: '#374151', background: '#fff' }}
        >
          {providers.map(p => <option key={p} value={p}>{p === 'all' ? 'All Providers' : p}</option>)}
        </select>

        {/* Type filter */}
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          style={{ padding: '5px 8px', border: '1px solid #e2e8f5', borderRadius: 6, fontSize: 12, color: '#374151', background: '#fff' }}
        >
          {types.map(t => <option key={t} value={t}>{t === 'all' ? 'All Types' : t}</option>)}
        </select>

        <button onClick={load} style={{ padding: '5px 12px', border: '1px solid #e2e8f5', borderRadius: 6, background: '#f8faff', color: '#64748b', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
          Refresh
        </button>
      </div>

      {/* Count */}
      <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8 }}>
        Showing {filtered.length} of {resources.length} resources · Click any row to expand specs
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px 0', color: '#94a3b8', fontSize: 13 }}>
          No resources match your filters.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f8faff' }}>
                {['Provider', 'Type', 'Name (from cloud)', 'Region', 'State', ''].map((h, i) => (
                  <th key={i} style={{
                    padding: '8px 10px',
                    textAlign: 'left',
                    fontSize: 10, fontWeight: 600, color: '#64748b',
                    textTransform: 'uppercase', letterSpacing: 0.8,
                    borderBottom: '1px solid #e2e8f5', whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <ResourceRow key={i} resource={r} isLive={isLive} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
