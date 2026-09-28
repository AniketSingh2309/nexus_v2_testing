import React, { useState, useRef, useEffect } from 'react';
import { PROVIDER_META, FAMILY_ICONS } from '../utils/theme';
import ProviderLogo from './ProviderLogo';

const PROVIDER_COLORS = { aws: '#FF9900', gcp: '#4285F4', azure: '#008AD7' };
const HEALTH_COLORS   = { healthy: '#22c55e', warning: '#eab308', critical: '#ef4444' };

const LEVEL_H    = 160;   // vertical gap between tree levels
const MIN_LEAF_W = 90;    // minimum horizontal space per leaf node

// ── Tree builder ─────────────────────────────────────────────────────────────
function buildTree(nodes) {
  const map = {};
  nodes.forEach(n => {
    if (!map[n.provider]) map[n.provider] = {};
    if (!map[n.provider][n.family]) map[n.provider][n.family] = [];
    map[n.provider][n.family].push(n);
  });

  return {
    id: '__root__', label: 'Cloud', type: 'root', isVirtual: true,
    children: Object.entries(map).map(([provider, families]) => ({
      id: `__p_${provider}`, label: provider.toUpperCase(), type: 'provider',
      provider, isVirtual: true,
      children: Object.entries(families).map(([family, resources]) => ({
        id: `__f_${provider}_${family}`, label: family, type: 'family',
        family, provider, isVirtual: true,
        children: resources,
      })),
    })),
  };
}

function countLeaves(node) {
  if (!node.children?.length) return 1;
  return node.children.reduce((s, c) => s + countLeaves(c), 0);
}

function assignPos(node, level, x, width) {
  node._x = x + width / 2;
  node._y = level * LEVEL_H + 80;
  if (!node.children?.length) return;
  const total = countLeaves(node);
  let cx = x;
  for (const child of node.children) {
    const cw = (countLeaves(child) / total) * width;
    assignPos(child, level + 1, cx, cw);
    cx += cw;
  }
}

function flattenTree(node, parent, nodes = [], edges = []) {
  nodes.push(node);
  if (parent) edges.push({ from: parent, to: node, id: `${parent.id}>${node.id}` });
  for (const c of node.children || []) flattenTree(c, node, nodes, edges);
  return { nodes, edges };
}

function layoutTree(leafNodes) {
  if (!leafNodes.length) return { nodes: [], edges: [], canvasW: 800, canvasH: 400 };
  const tree = buildTree(leafNodes);
  const totalLeaves = countLeaves(tree);
  const canvasW = Math.max(1000, totalLeaves * MIN_LEAF_W);
  const depth = 4; // root → provider → family → leaf
  const canvasH = depth * LEVEL_H + 140;
  assignPos(tree, 0, 0, canvasW);
  const { nodes, edges } = flattenTree(tree, null);
  return { nodes, edges, canvasW, canvasH };
}

// ── Bezier edge path ─────────────────────────────────────────────────────────
function EdgePath({ from, to, highlight, faded }) {
  const mx = (from._x + to._x) / 2;
  const my = (from._y + to._y) / 2;
  const d = `M ${from._x} ${from._y} C ${from._x} ${my}, ${to._x} ${my}, ${to._x} ${to._y}`;
  return (
    <path d={d}
      fill="none"
      stroke={highlight ? '#60a5fa' : 'rgba(148,163,184,0.4)'}
      strokeWidth={highlight ? 2 : 1}
      strokeDasharray={highlight ? '0' : '5 4'}
      opacity={faded ? 0.08 : 1}
    />
  );
}

// ── Node renderer ─────────────────────────────────────────────────────────────
function NodeShape({ node, selected, faded, pulsing, onEnter, onLeave, onClick, showLabel }) {
  if (node.type === 'root') {
    return (
      <g style={{ cursor: 'default' }}>
        <circle cx={node._x} cy={node._y} r={28} fill="#1e293b" stroke="#4285F4" strokeWidth={2} />
        <text x={node._x} y={node._y + 5} textAnchor="middle" fontSize={18} fill="white">🌐</text>
        <text x={node._x} y={node._y + 44} textAnchor="middle" fontSize={10} fill="var(--text3)" fontWeight={600}>Internet</text>
      </g>
    );
  }

  if (node.type === 'provider') {
    const c = PROVIDER_COLORS[node.provider] || '#888';
    return (
      <g style={{ cursor: 'default' }}>
        <rect x={node._x - 36} y={node._y - 18} width={72} height={36} rx={10}
          fill={`${c}22`} stroke={c} strokeWidth={2} />
        <text x={node._x} y={node._y - 2} textAnchor="middle" fontSize={11}
          fill={c} fontWeight={700}>{PROVIDER_META[node.provider]?.emoji} {node.label}</text>
        <text x={node._x} y={node._y + 12} textAnchor="middle" fontSize={9}
          fill="var(--text3)">{node.children?.length || 0} families</text>
      </g>
    );
  }

  if (node.type === 'family') {
    const c = PROVIDER_COLORS[node.provider] || '#888';
    const icon = FAMILY_ICONS[node.family] || '☁️';
    return (
      <g style={{ cursor: 'default' }}>
        <rect x={node._x - 30} y={node._y - 14} width={60} height={28} rx={7}
          fill={`${c}12`} stroke={`${c}60`} strokeWidth={1.5} strokeDasharray="4 2" />
        <text x={node._x} y={node._y + 5} textAnchor="middle" fontSize={10}
          fill="var(--text2)" fontWeight={600}>{icon} {node.label}</text>
      </g>
    );
  }

  // Leaf resource node
  const color = PROVIDER_COLORS[node.provider] || '#888';
  const healthColor = HEALTH_COLORS[node.health] || '#888';
  const r = 16;

  return (
    <g style={{ cursor: 'pointer' }} opacity={faded ? 0.2 : 1}
      onMouseEnter={onEnter} onMouseLeave={onLeave} onClick={onClick}>
      {selected && (
        <circle cx={node._x} cy={node._y} r={r + 9}
          fill="none" stroke={color} strokeWidth={2} opacity={0.35} />
      )}
      {pulsing && (
        <circle cx={node._x} cy={node._y} r={r + 7}
          fill="none" stroke="#eab308" strokeWidth={1.2} opacity={0.5} />
      )}
      <circle cx={node._x} cy={node._y} r={r}
        fill={selected ? color : `${color}25`}
        stroke={color} strokeWidth={selected ? 2.5 : 1.5} />
      <circle cx={node._x + r * 0.65} cy={node._y - r * 0.65} r={4}
        fill={healthColor} stroke="var(--card)" strokeWidth={1} />
      <text x={node._x} y={node._y + 5} textAnchor="middle" fontSize={12}>
        {FAMILY_ICONS[node.family] || '☁️'}
      </text>
      {showLabel && (
        <text x={node._x} y={node._y + r + 13} textAnchor="middle"
          fontSize={9} fill="var(--text)" fontWeight={selected ? 700 : 400}
          style={{ userSelect: 'none', pointerEvents: 'none' }}>
          {(node.label || '').length > 16 ? (node.label || '').slice(0, 16) + '…' : node.label}
        </text>
      )}
    </g>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function NetworkTopologyMap({ nodes, onNodeClick, allServices }) {
  const containerRef = useRef();
  const [svgSize, setSvgSize] = useState({ w: 1200, h: 700 });
  const [viewport, setViewport] = useState({ x: 40, y: 20, scale: 1 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [hovered, setHovered] = useState(null);
  const [selected, setSelected] = useState(null);
  const [providerFilter, setProviderFilter] = useState('all');
  const [familyFilter, setFamilyFilter] = useState('all');
  const [showConnections, setShowConnections] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setPulse(p => !p), 1200);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(entries => {
      for (const e of entries) {
        const { width, height } = e.contentRect;
        if (width > 0 && height > 0) setSvgSize({ w: width, h: height });
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Flat leaf nodes from all providers
  const allLeaves = [
    ...nodes.aws.map(n => ({ ...n, provider: 'aws' })),
    ...nodes.gcp.map(n => ({ ...n, provider: 'gcp' })),
    ...nodes.azure.map(n => ({ ...n, provider: 'azure' })),
  ];

  // Apply filters to leaves only
  const filteredLeaves = allLeaves.filter(n => {
    if (providerFilter !== 'all' && n.provider !== providerFilter) return false;
    if (familyFilter !== 'all' && n.family !== familyFilter) return false;
    return true;
  });

  // Build and layout tree from filtered leaves
  const { nodes: treeNodes, edges: treeEdges, canvasW, canvasH } = layoutTree(filteredLeaves);

  // Leaf ids for highlight tracking
  const leafIds = new Set(filteredLeaves.map(n => n.id));

  // Selected node highlight: highlight all edges on the path to selected leaf
  const selectedLeafConnections = selected
    ? new Set([selected.id, ...(selected.connections || [])])
    : null;

  const families = ['all', ...new Set(allLeaves.map(n => n.family))];

  // Pan/zoom
  function onWheel(e) {
    e.preventDefault();
    const delta = -e.deltaY * 0.001;
    setViewport(v => ({ ...v, scale: Math.max(0.25, Math.min(3, v.scale * (1 + delta))) }));
  }
  function onMouseDown(e) {
    if (e.button !== 0) return;
    setDragging(true);
    setDragStart({ x: e.clientX - viewport.x, y: e.clientY - viewport.y });
  }
  function onMouseMove(e) {
    if (!dragging || !dragStart) return;
    setViewport(v => ({ ...v, x: e.clientX - dragStart.x, y: e.clientY - dragStart.y }));
  }
  function onMouseUp() { setDragging(false); }
  function resetView() { setViewport({ x: 40, y: 20, scale: 1 }); }
  function zoomIn()  { setViewport(v => ({ ...v, scale: Math.min(3,   v.scale * 1.2) })); }
  function zoomOut() { setViewport(v => ({ ...v, scale: Math.max(0.25, v.scale / 1.2) })); }

  const hoveredNode = hovered ? treeNodes.find(n => n.id === hovered) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      {/* Toolbar */}
      <div className="map-toolbar">
        <span className="map-title">Network Topology Map</span>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['all','aws','gcp','azure'].map(p => (
            <button key={p}
              className={`map-filter-btn ${providerFilter === p ? 'active' : ''}`}
              style={providerFilter === p && p !== 'all' ? { background: PROVIDER_COLORS[p], borderColor: PROVIDER_COLORS[p] } : {}}
              onClick={() => setProviderFilter(p)}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                {p !== 'all' && <ProviderLogo provider={p} size={14} />}
                {p === 'all' ? 'All Providers' : p.toUpperCase()}
              </span>
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {families.slice(0, 7).map(f => (
            <button key={f}
              className={`map-filter-btn ${familyFilter === f ? 'active' : ''}`}
              onClick={() => setFamilyFilter(f)}>
              {f === 'all' ? 'All Types' : f}
            </button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <button className={`map-filter-btn ${showConnections ? 'active' : ''}`} onClick={() => setShowConnections(v => !v)}>
            {showConnections ? 'Connections On' : 'Connections Off'}
          </button>
          <button className={`map-filter-btn ${showLabels ? 'active' : ''}`} onClick={() => setShowLabels(v => !v)}>
            {showLabels ? 'Labels On' : 'Labels Off'}
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div ref={containerRef}
        style={{ flex: 1, position: 'relative', overflow: 'hidden', background: 'var(--bg)', minHeight: 0 }}>

        {/* Zoom controls */}
        <div className="network-controls">
          <button className="icon-btn" onClick={zoomIn}    style={{ padding: '6px 10px' }}>+</button>
          <button className="icon-btn" onClick={zoomOut}   style={{ padding: '6px 10px' }}>−</button>
          <button className="icon-btn" onClick={resetView} style={{ padding: '6px 10px', fontSize: 11 }}>⌂</button>
        </div>

        {/* Legend */}
        <div className="network-legend">
          <div className="network-legend-title">LEGEND</div>
          {['aws','gcp','azure'].map(p => (
            <div key={p} className="network-legend-item">
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: PROVIDER_COLORS[p] }} />
              {PROVIDER_META[p]?.label}
            </div>
          ))}
          <div style={{ borderTop: '0.5px solid var(--border)', marginTop: 6, paddingTop: 6 }}>
            {[['Healthy','#22c55e'],['Warning','#eab308'],['Critical','#ef4444']].map(([s,c]) => (
              <div key={s} className="network-legend-item">
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: c }} />
                {s}
              </div>
            ))}
          </div>
          <div style={{ borderTop: '0.5px solid var(--border)', marginTop: 6, paddingTop: 6 }}>
            {[['🌐','Internet root'],['▭','Provider'],['▭·','Family group'],['●','Resource']].map(([ic, lb]) => (
              <div key={lb} className="network-legend-item" style={{ fontSize: 9 }}>
                <span>{ic}</span><span style={{ color: 'var(--text3)' }}>{lb}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 6, fontSize: 10, color: 'var(--text3)' }}>
            {filteredLeaves.length} services
          </div>
        </div>

        {/* Hover tooltip */}
        {hoveredNode && !hoveredNode.isVirtual && (
          <div style={{
            position: 'absolute', top: 14, right: 14, background: 'var(--card)',
            border: `1.5px solid ${PROVIDER_COLORS[hoveredNode.provider]}`,
            borderRadius: 10, padding: '12px 14px', minWidth: 220,
            fontSize: 12, zIndex: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
            pointerEvents: 'none',
          }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: PROVIDER_COLORS[hoveredNode.provider] }}>{PROVIDER_META[hoveredNode.provider]?.emoji}</span>
              {hoveredNode.label}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '3px 8px', color: 'var(--text2)' }}>
              <span style={{ color: 'var(--text3)' }}>Type</span><span>{hoveredNode.type}</span>
              <span style={{ color: 'var(--text3)' }}>Family</span><span>{hoveredNode.family}</span>
              <span style={{ color: 'var(--text3)' }}>Region</span><span>{hoveredNode.region}</span>
              <span style={{ color: 'var(--text3)' }}>Health</span>
              <span style={{ color: HEALTH_COLORS[hoveredNode.health], fontWeight: 600 }}>{hoveredNode.health}</span>
              <span style={{ color: 'var(--text3)' }}>Links</span><span>{(hoveredNode.connections||[]).length}</span>
            </div>
            <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text3)' }}>Click to open details →</div>
          </div>
        )}

        <svg
          style={{ width: '100%', height: '100%', cursor: dragging ? 'grabbing' : 'grab', display: 'block' }}
          onWheel={onWheel}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        >
          <defs>
            {['aws','gcp','azure'].map(p => (
              <radialGradient key={p} id={`glow-${p}`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor={PROVIDER_COLORS[p]} stopOpacity="0.35" />
                <stop offset="100%" stopColor={PROVIDER_COLORS[p]} stopOpacity="0" />
              </radialGradient>
            ))}
          </defs>

          <g transform={`translate(${viewport.x}, ${viewport.y}) scale(${viewport.scale})`}>

            {/* Tree edges (bezier curves) */}
            {treeEdges.map(e => {
              const isLeafEdge = !e.to.isVirtual;
              const highlight = isLeafEdge && selectedLeafConnections?.has(e.to.id);
              const faded = isLeafEdge && selectedLeafConnections && !highlight;
              return (
                <EdgePath key={e.id} from={e.from} to={e.to} highlight={highlight} faded={faded} />
              );
            })}

            {/* Cross-service connections (leaf ↔ leaf, if enabled) */}
            {showConnections && filteredLeaves.map(leaf =>
              (leaf.connections || [])
                .filter(cid => leafIds.has(cid) && leaf.id < cid)
                .map(cid => {
                  const target = filteredLeaves.find(n => n.id === cid);
                  if (!target) return null;
                  const isHigh = selectedLeafConnections?.has(leaf.id) && selectedLeafConnections?.has(cid);
                  return (
                    <line key={`${leaf.id}-${cid}`}
                      x1={leaf._x} y1={leaf._y} x2={target._x} y2={target._y}
                      stroke={isHigh ? '#f59e0b' : 'rgba(251,191,36,0.25)'}
                      strokeWidth={isHigh ? 2 : 1}
                      strokeDasharray="3 3"
                      opacity={selectedLeafConnections && !isHigh ? 0.08 : 0.7}
                    />
                  );
                })
            )}

            {/* All nodes */}
            {treeNodes.map(node => {
              if (node.isVirtual) {
                return <NodeShape key={node.id} node={node} showLabel={showLabels} />;
              }
              const isSel = selected?.id === node.id;
              const isFaded = selectedLeafConnections && !selectedLeafConnections.has(node.id);
              const isPulsing = node.health === 'warning' && pulse;
              return (
                <NodeShape key={node.id} node={node}
                  selected={isSel} faded={isFaded} pulsing={isPulsing}
                  showLabel={showLabels}
                  onEnter={() => setHovered(node.id)}
                  onLeave={() => setHovered(null)}
                  onClick={e => {
                    e.stopPropagation();
                    setSelected(s => s?.id === node.id ? null : node);
                    onNodeClick(allServices?.find(s => s.id === node.id) || node);
                  }}
                />
              );
            })}
          </g>
        </svg>

        {/* Bottom bar */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          background: 'var(--card)', borderTop: '0.5px solid var(--border)',
          padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 16,
          fontSize: 11, color: 'var(--text3)',
        }}>
          <span>🖱️ Drag to pan · Scroll to zoom · Click node for details</span>
          <span>{filteredLeaves.length}/{allLeaves.length} services</span>
          <span style={{ marginLeft: 'auto' }}>Scale: {Math.round(viewport.scale * 100)}%</span>
        </div>
      </div>
    </div>
  );
}
