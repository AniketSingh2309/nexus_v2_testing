import React, { useState } from 'react';

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

function EndpointList({ endpoints }) {
  if (!endpoints || endpoints.length === 0) return <span style={{ color: 'var(--text3)', fontSize: 11 }}>—</span>;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
      {endpoints.map((e, i) => (
        <span
          key={i}
          className={e.type === 'sg' ? 'net-tag net-tag-sg' : 'net-tag'}
          style={{ fontSize: 10 }}
          title={e.desc || undefined}
        >
          {e.type === 'sg' ? (e.name ? `${e.name} (${e.value})` : e.value) : e.value}
        </span>
      ))}
    </div>
  );
}

function ProtoBadge({ protocol }) {
  const p = (protocol || 'all').toLowerCase();
  return (
    <span className={`proto-badge proto-${p}`} style={{ fontSize: 10 }}>
      {protocol || 'All'}
    </span>
  );
}

function SGRulesExpanded({ sg }) {
  return (
    <div style={{ padding: '10px 14px 12px', background: 'var(--bg)', borderTop: '0.5px solid var(--border)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Inbound */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <span className="rules-dir-badge rules-inbound" style={{ fontSize: 10 }}>↓ Inbound</span>
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>{(sg.inboundRules || []).length} rules</span>
          </div>
          {!sg.inboundRules?.length
            ? <div style={{ fontSize: 11, color: 'var(--text3)' }}>No inbound rules</div>
            : (
              <table className="net-rules-table" style={{ fontSize: 11 }}>
                <thead>
                  <tr>
                    <th>Proto</th>
                    <th>Port</th>
                    <th>Source</th>
                  </tr>
                </thead>
                <tbody>
                  {sg.inboundRules.map((rule, i) => (
                    <tr key={i}>
                      <td><ProtoBadge protocol={rule.protocol} /></td>
                      <td style={{ fontFamily: 'monospace', fontSize: 10, whiteSpace: 'nowrap' }}>{formatPortRange(rule)}</td>
                      <td><EndpointList endpoints={rule.sources} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          }
        </div>
        {/* Outbound */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <span className="rules-dir-badge rules-outbound" style={{ fontSize: 10 }}>↑ Outbound</span>
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>{(sg.outboundRules || []).length} rules</span>
          </div>
          {!sg.outboundRules?.length
            ? <div style={{ fontSize: 11, color: 'var(--text3)' }}>No outbound rules</div>
            : (
              <table className="net-rules-table" style={{ fontSize: 11 }}>
                <thead>
                  <tr>
                    <th>Proto</th>
                    <th>Port</th>
                    <th>Destination</th>
                  </tr>
                </thead>
                <tbody>
                  {sg.outboundRules.map((rule, i) => (
                    <tr key={i}>
                      <td><ProtoBadge protocol={rule.protocol} /></td>
                      <td style={{ fontFamily: 'monospace', fontSize: 10, whiteSpace: 'nowrap' }}>{formatPortRange(rule)}</td>
                      <td><EndpointList endpoints={rule.destinations} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          }
        </div>
      </div>
      {/* SG-to-SG connectivity */}
      {(() => {
        const allRules = [...(sg.inboundRules || []), ...(sg.outboundRules || [])];
        const sgRefs = [];
        allRules.forEach(rule => {
          (rule.sources || rule.destinations || [])
            .filter(e => e.type === 'sg')
            .forEach(e => { if (!sgRefs.find(r => r.value === e.value)) sgRefs.push(e); });
        });
        if (!sgRefs.length) return null;
        return (
          <div style={{ marginTop: 10, padding: '7px 10px', background: 'rgba(99,102,241,0.06)', borderRadius: 6, border: '0.5px solid rgba(99,102,241,0.2)' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#6366f1', marginRight: 8 }}>🔗 SG Connectivity:</span>
            {sgRefs.map((e, i) => (
              <span key={i} className="net-tag net-tag-sg" style={{ fontSize: 10 }}>
                {e.name ? `${e.name} (${e.value})` : e.value}
              </span>
            ))}
          </div>
        );
      })()}
    </div>
  );
}

function RTRoutesExpanded({ rt }) {
  return (
    <div style={{ padding: '10px 14px 12px', background: 'var(--bg)', borderTop: '0.5px solid var(--border)' }}>
      {rt.associations?.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, marginRight: 8 }}>ASSOCIATED SUBNETS:</span>
          {rt.associations.map((a, i) => (
            <span key={i} className={a.isMain ? 'net-tag net-tag-main' : 'net-tag'} style={{ fontSize: 10 }} title={`State: ${a.state}`}>
              {a.subnetId || 'Main (all subnets)'}
            </span>
          ))}
        </div>
      )}
      <table className="net-rules-table" style={{ fontSize: 11 }}>
        <thead>
          <tr>
            <th>Destination</th>
            <th>Target</th>
            <th>State</th>
          </tr>
        </thead>
        <tbody>
          {(rt.routes || []).map((route, i) => (
            <tr key={i}>
              <td style={{ fontFamily: 'monospace', fontSize: 10 }}>{route.destination || '—'}</td>
              <td>
                <span className={
                  route.target === 'local' ? 'net-tag net-tag-local' :
                  route.target?.startsWith('igw-') ? 'net-tag net-tag-igw' :
                  route.target?.startsWith('nat-') ? 'net-tag net-tag-nat' :
                  'net-tag'
                } style={{ fontSize: 10 }}>
                  {route.target || '—'}
                </span>
              </td>
              <td>
                <span style={{ fontSize: 10, color: route.state === 'active' ? '#22c55e' : route.state === 'blackhole' ? '#ef4444' : 'var(--text3)' }}>
                  {route.state || '—'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SectionHeader({ title, count, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
      <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{title}</div>
      <span style={{ fontSize: 11, padding: '1px 8px', borderRadius: 20, background: `${color}15`, color, border: `0.5px solid ${color}40`, fontWeight: 600 }}>
        {count}
      </span>
    </div>
  );
}

export default function NetworkSecurityPanel({ allServices }) {
  const [expandedSG, setExpandedSG] = useState(null);
  const [expandedRT, setExpandedRT] = useState(null);
  const [sgSearch, setSgSearch] = useState('');
  const [rtSearch, setRtSearch] = useState('');
  const [sgCollapsed, setSgCollapsed] = useState(false);
  const [rtCollapsed, setRtCollapsed] = useState(false);
  const [igwCollapsed, setIgwCollapsed] = useState(false);

  const securityGroups = allServices.filter(s => s.type === 'Security Group');
  const routeTables = allServices.filter(s => s.type === 'Route Table');
  const vpcs = allServices.filter(s => s.type === 'VPC');

  // Extract internet gateways from VPC resources
  const internetGateways = vpcs
    .filter(v => v.internetGateway)
    .map(v => ({
      igwId: v.internetGateway.id,
      state: v.internetGateway.state || 'attached',
      vpcId: v.rawId,
      vpcName: v.name,
      region: v.region,
      cidr: v.cidr,
    }));

  const filteredSGs = sgSearch
    ? securityGroups.filter(sg => sg.name?.toLowerCase().includes(sgSearch.toLowerCase()) || sg.rawId?.toLowerCase().includes(sgSearch.toLowerCase()) || sg.vpcId?.toLowerCase().includes(sgSearch.toLowerCase()))
    : securityGroups;

  const filteredRTs = rtSearch
    ? routeTables.filter(rt => rt.name?.toLowerCase().includes(rtSearch.toLowerCase()) || rt.rawId?.toLowerCase().includes(rtSearch.toLowerCase()) || rt.vpcId?.toLowerCase().includes(rtSearch.toLowerCase()))
    : routeTables;

  if (!securityGroups.length && !routeTables.length && !internetGateways.length) {
    return (
      <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
        No networking resources found. Connect a cloud account to see Security Groups, Route Tables, and Internet Gateways.
      </div>
    );
  }

  return (
    <div style={{ padding: '16px 0', display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ─── Internet Gateways ─── */}
      {internetGateways.length > 0 && (
        <div className="section-card" style={{ marginBottom: 0 }}>
          <div
            style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none', marginBottom: igwCollapsed ? 0 : 12 }}
            onClick={() => setIgwCollapsed(c => !c)}
          >
            <span style={{ fontSize: 14, color: 'var(--text3)', transition: 'transform 0.2s', display: 'inline-block', transform: igwCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}>▼</span>
            <SectionHeader title="Internet Gateways" count={internetGateways.length} color="#22c55e" />
          </div>
          {!igwCollapsed && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 }}>
              {internetGateways.map((igw, i) => (
                <div key={i} style={{ padding: '10px 14px', background: 'rgba(34,197,94,0.05)', border: '0.5px solid rgba(34,197,94,0.25)', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, fontWeight: 600, fontFamily: 'monospace', color: 'var(--text)' }}>{igw.igwId}</span>
                    <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 20, background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '0.5px solid rgba(34,197,94,0.3)', fontWeight: 500 }}>
                      {igw.state}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--text3)' }}>
                    <span>VPC: <span style={{ color: 'var(--text)', fontFamily: 'monospace' }}>{igw.vpcName || igw.vpcId}</span></span>
                    {igw.cidr && <span>CIDR: <span style={{ color: 'var(--text)', fontFamily: 'monospace' }}>{igw.cidr}</span></span>}
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text3)' }}>{igw.region}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Security Groups ─── */}
      {securityGroups.length > 0 && (
        <div className="section-card" style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: sgCollapsed ? 0 : 12 }}>
            <div
              style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}
              onClick={() => setSgCollapsed(c => !c)}
            >
              <span style={{ fontSize: 14, color: 'var(--text3)', transition: 'transform 0.2s', display: 'inline-block', transform: sgCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}>▼</span>
              <SectionHeader title="Security Groups" count={securityGroups.length} color="#818cf8" />
            </div>
            {!sgCollapsed && (
              <input
                placeholder="Search SGs..."
                value={sgSearch}
                onChange={e => setSgSearch(e.target.value)}
                style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, border: '0.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', outline: 'none', width: 160 }}
              />
            )}
          </div>
          {!sgCollapsed && (
            <div style={{ border: '0.5px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
              {/* Header row */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 80px 80px 36px', gap: '0 12px', padding: '7px 14px', background: 'var(--bg)', borderBottom: '0.5px solid var(--border)', fontSize: 11, fontWeight: 600, color: 'var(--text3)' }}>
                <span>NAME / ID</span>
                <span>VPC</span>
                <span>REGION</span>
                <span>INBOUND</span>
                <span>OUTBOUND</span>
                <span />
              </div>
              {filteredSGs.length === 0 && (
                <div style={{ padding: '16px', textAlign: 'center', fontSize: 12, color: 'var(--text3)' }}>No results</div>
              )}
              {filteredSGs.map(sg => (
                <div key={sg.id} style={{ borderBottom: '0.5px solid var(--border)' }}>
                  <div
                    style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 80px 80px 36px', gap: '0 12px', padding: '9px 14px', alignItems: 'center', cursor: 'pointer', transition: 'background 0.12s' }}
                    onClick={() => setExpandedSG(expandedSG === sg.id ? null : sg.id)}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}
                  >
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{sg.name}</div>
                      <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'monospace' }}>{sg.rawId}</div>
                    </div>
                    <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text2)' }}>{sg.vpcId || '—'}</span>
                    <span style={{ fontSize: 11, color: 'var(--text3)' }}>{sg.region}</span>
                    <span style={{ fontSize: 11 }}>
                      <span className="rules-dir-badge rules-inbound" style={{ fontSize: 10 }}>↓ {(sg.inboundRules || []).length}</span>
                    </span>
                    <span style={{ fontSize: 11 }}>
                      <span className="rules-dir-badge rules-outbound" style={{ fontSize: 10 }}>↑ {(sg.outboundRules || []).length}</span>
                    </span>
                    <span style={{ fontSize: 13, color: 'var(--text3)', textAlign: 'center' }}>
                      {expandedSG === sg.id ? '▲' : '▼'}
                    </span>
                  </div>
                  {expandedSG === sg.id && <SGRulesExpanded sg={sg} />}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Route Tables ─── */}
      {routeTables.length > 0 && (
        <div className="section-card" style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: rtCollapsed ? 0 : 12 }}>
            <div
              style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}
              onClick={() => setRtCollapsed(c => !c)}
            >
              <span style={{ fontSize: 14, color: 'var(--text3)', transition: 'transform 0.2s', display: 'inline-block', transform: rtCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}>▼</span>
              <SectionHeader title="Route Tables" count={routeTables.length} color="#60a5fa" />
            </div>
            {!rtCollapsed && (
              <input
                placeholder="Search route tables..."
                value={rtSearch}
                onChange={e => setRtSearch(e.target.value)}
                style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, border: '0.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', outline: 'none', width: 180 }}
              />
            )}
          </div>
          {!rtCollapsed && (
            <div style={{ border: '0.5px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
              {/* Header row */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 60px 60px 36px', gap: '0 12px', padding: '7px 14px', background: 'var(--bg)', borderBottom: '0.5px solid var(--border)', fontSize: 11, fontWeight: 600, color: 'var(--text3)' }}>
                <span>NAME / ID</span>
                <span>VPC</span>
                <span>REGION</span>
                <span>ROUTES</span>
                <span>MAIN</span>
                <span />
              </div>
              {filteredRTs.length === 0 && (
                <div style={{ padding: '16px', textAlign: 'center', fontSize: 12, color: 'var(--text3)' }}>No results</div>
              )}
              {filteredRTs.map(rt => (
                <div key={rt.id} style={{ borderBottom: '0.5px solid var(--border)' }}>
                  <div
                    style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 60px 60px 36px', gap: '0 12px', padding: '9px 14px', alignItems: 'center', cursor: 'pointer', transition: 'background 0.12s' }}
                    onClick={() => setExpandedRT(expandedRT === rt.id ? null : rt.id)}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}
                  >
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{rt.name}</div>
                      <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'monospace' }}>{rt.rawId}</div>
                    </div>
                    <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text2)' }}>{rt.vpcId || '—'}</span>
                    <span style={{ fontSize: 11, color: 'var(--text3)' }}>{rt.region}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#60a5fa' }}>{(rt.routes || []).length}</span>
                    <span>
                      {rt.isMain
                        ? <span className="net-tag net-tag-main" style={{ fontSize: 10 }}>Main</span>
                        : <span style={{ fontSize: 11, color: 'var(--text3)' }}>—</span>}
                    </span>
                    <span style={{ fontSize: 13, color: 'var(--text3)', textAlign: 'center' }}>
                      {expandedRT === rt.id ? '▲' : '▼'}
                    </span>
                  </div>
                  {expandedRT === rt.id && <RTRoutesExpanded rt={rt} />}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
