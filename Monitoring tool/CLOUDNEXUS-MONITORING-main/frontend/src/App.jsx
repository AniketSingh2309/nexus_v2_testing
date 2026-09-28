import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PROVIDER_META, fmt } from './utils/theme';
import {
  MOCK_AWS_SERVICES, MOCK_GCP_SERVICES, MOCK_AZURE_SERVICES,
  MOCK_ALERTS, OVERVIEW_STATS, NETWORK_NODES
} from './utils/mockData';
import { api } from './utils/api';
import { useSocket } from './hooks/useSocket';
import Topbar from './components/Topbar';
import CloudConnectModal from './components/CloudConnectModal';
import MetricRow from './components/MetricRow';
import ProviderCard from './components/ProviderCard';
import ServiceDetailTable from './components/ServiceDetailTable';
import NetworkTopologyMap from './components/NetworkTopologyMap';
import AlertsPanel from './components/AlertsPanel';
import OverviewCharts from './components/OverviewCharts';
import ResourceDetailDrawer from './components/ResourceDetailDrawer';
import ProcessMonitor from './components/ProcessMonitor';
import HeatmapPanel from './components/HeatmapPanel';
import SLATracker from './components/SLATracker';
import RegionMap from './components/RegionMap';
import CostAnalysis from './components/CostAnalysis';
import SpaceUtilizationCharts from './components/SpaceUtilizationCharts';
import ExportModal from './components/ExportModal';
import NetworkSecurityPanel from './components/NetworkSecurityPanel';
import ProviderLogo from './components/ProviderLogo';
import AISuggestions from './components/AISuggestions';
import AIBillingPanel from './components/AIBillingPanel';

const TABS = ['overview', 'aws', 'gcp', 'azure', 'network', 'heatmap', 'alerts', 'ai', 'ai-billing'];

function TabLabel({ tabKey }) {
  const plain = { overview: 'Overview', network: 'Network', heatmap: 'Heatmap', cost: 'Cost', alerts: 'Alerts', ai: 'AI Suggestions', 'ai-billing': 'AI Billing' };
  if (plain[tabKey]) return <span>{plain[tabKey]}</span>;
  const provMap = { aws: 'aws', gcp: 'gcp', azure: 'azure' };
  const labels = { aws: 'AWS', gcp: 'GCP', azure: 'Azure' };
  const p = provMap[tabKey];
  if (!p) return <span>{tabKey}</span>;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <ProviderLogo provider={p} size={14} />
      {labels[p]}
    </span>
  );
}

export default function App() {
  const [tab, setTab] = useState('overview');
  const [mode, setMode] = useState('mock');
  const [modalOpen, setModalOpen] = useState(false);
  const [connections, setConnections] = useState({});
  const [fetchingProviders, setFetchingProviders] = useState({});
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [selectedResource, setSelectedResource] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [backendOnline, setBackendOnline] = useState(false);
  const [sessionRevoked, setSessionRevoked] = useState(false);
  const [revokeReason, setRevokeReason] = useState(null);
  const uidRef = useRef('');
  const [userName, setUserName] = useState('');
  const [userPhoto, setUserPhoto] = useState(null);

  const TAB_PATHS = {
    overview: 'mycloudnexus.com/monitoring/overview',
    aws:      'mycloudnexus.com/monitoring/aws',
    gcp:      'mycloudnexus.com/monitoring/gcp',
    azure:    'mycloudnexus.com/monitoring/azure',
    network:  'mycloudnexus.com/monitoring/network',
    heatmap:  'mycloudnexus.com/monitoring/heatmap',
    alerts:   'mycloudnexus.com/monitoring/alerts',
    ai:       'mycloudnexus.com/monitoring/ai',
    'ai-billing': 'mycloudnexus.com/monitoring/ai-billing',
  };

  function logActivity(type, details) {
    const uid = uidRef.current;
    if (!uid) return;
    fetch('/api/activity', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: uid, type, details: details || {} }) }).catch(() => {});
  }

  // Persist uid + name from URL, fetch photo
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlUid  = params.get('uid');
    const urlName = params.get('name');
    const urlSid  = params.get('sid');
    if (urlUid)  localStorage.setItem('cn_tool_uid',  urlUid.toLowerCase().trim());
    if (urlName) localStorage.setItem('cn_tool_name', urlName);
    if (urlSid)  localStorage.setItem('cn_tool_sid',  urlSid);
    const uid  = urlUid  || localStorage.getItem('cn_tool_uid');
    const name = urlName || localStorage.getItem('cn_tool_name') || '';
    const sid  = urlSid  || localStorage.getItem('cn_tool_sid') || '';
    if (!uid) return;
    uidRef.current = uid;
    setUserName(name);
    fetch(`/auth/photo/${encodeURIComponent(uid)}`).then(r=>r.json()).then(d=>{ if(d.photo) setUserPhoto(d.photo); }).catch(()=>{});
    logActivity('session_start', { tool: 'Monitoring', path: 'mycloudnexus.com/monitoring' });
    let cancelled = false;
    async function check() {
      try {
        const res = await fetch(`/api/session-check?email=${encodeURIComponent(uid)}&sessionId=${encodeURIComponent(sid)}`);
        const data = await res.json();
        if (!cancelled && !data.valid) {
          setRevokeReason(data.reason === 'logged_in_elsewhere' ? 'kicked' : 'deleted');
          setSessionRevoked(true);
        }
      } catch {}
    }
    check();
    const id = setInterval(check, 3000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  const [realData, setRealData] = useState({ aws: [], gcp: [], azure: [] });
  const [realAlerts, setRealAlerts] = useState([]);
  const [realTopology, setRealTopology] = useState(null);
  const [mockAlerts, setMockAlerts] = useState(MOCK_ALERTS);

  const { emit } = useSocket({
    onConnect: () => setBackendOnline(true),
    onDisconnect: () => {},
    onInitialState: (state) => {
      setBackendOnline(true);
      setRealData({
        aws: state.aws?.resources || [],
        gcp: state.gcp?.resources || [],
        azure: state.azure?.resources || [],
      });
      setRealAlerts(state.alerts || []);
      if (state.topology) setRealTopology(state.topology);
      if (state.connections) {
        const conns = {};
        for (const [p, v] of Object.entries(state.connections)) {
          if (v.connected) conns[p] = { connected: true };
        }
        setConnections(conns);
        if (Object.keys(conns).length > 0) setMode('real');
      }
    },
    onProviderUpdated: ({ provider, resources, timestamp }) => {
      setRealData(prev => ({ ...prev, [provider]: resources }));
      setFetchingProviders(prev => ({ ...prev, [provider]: false }));
      setLastRefresh(new Date(timestamp || Date.now()));
    },
    onProviderFetching: ({ provider }) => {
      setFetchingProviders(prev => ({ ...prev, [provider]: true }));
    },
    onProviderError: ({ provider }) => {
      setFetchingProviders(prev => ({ ...prev, [provider]: false }));
    },
    onProviderDisconnected: ({ provider }) => {
      setRealData(prev => ({ ...prev, [provider]: [] }));
      setConnections(prev => { const c = { ...prev }; delete c[provider]; return c; });
    },
    onAlertsUpdated: (alerts) => setRealAlerts(alerts),
    onTopologyUpdated: (topology) => setRealTopology(topology),
    onAccountSwitched: ({ email: targetEmail, provider }) => {
      const uid = localStorage.getItem('cn_tool_uid') || '';
      if (!uid || !targetEmail || uid.toLowerCase() !== targetEmail.toLowerCase()) return;
      // Clear this provider's data and trigger a fresh fetch via reconnect
      setRealData(prev => ({ ...prev, [provider]: [] }));
      setFetchingProviders(prev => ({ ...prev, [provider]: true }));
      setTimeout(() => window.location.reload(), 800);
    },
    onSessionRevoked: ({ email, sessionId: winningSessionId, reason }) => {
      const uid = localStorage.getItem('cn_tool_uid') || new URLSearchParams(window.location.search).get('uid');
      if (!uid || !email || uid.toLowerCase() !== email.toLowerCase()) return;
      const mySid = localStorage.getItem('cn_tool_sid') || '';
      if (reason === 'kicked' && winningSessionId && winningSessionId === mySid) return;
      setRevokeReason(reason === 'kicked' ? 'kicked' : 'deleted');
      setSessionRevoked(true);
    },
  });

  useEffect(() => {
    function checkHealth() {
      fetch('/health').then(r => r.json()).then(() => setBackendOnline(true)).catch(() => {});
    }
    checkHealth();
    const id = setInterval(checkHealth, 5000);
    return () => clearInterval(id);
  }, []);

  // Log tab navigation (including initial)
  useEffect(() => {
    logActivity('tab_viewed', { tab: tab.charAt(0).toUpperCase() + tab.slice(1), tool: 'Monitoring', path: TAB_PATHS[tab] || `mycloudnexus.com/monitoring/${tab}` });
  }, [tab]);

  // Bottom-left path indicator — shows mycloudnexus.com/monitoring/<tab> on cursor move
  useEffect(() => {
    const path = TAB_PATHS[tab] || `mycloudnexus.com/monitoring/${tab}`;
    let bar = document.getElementById('__cn_statusbar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = '__cn_statusbar';
      bar.style.cssText = [
        'position:fixed','bottom:0','left:0','z-index:2147483647',
        'background:rgba(15,23,42,0.88)','backdrop-filter:blur(6px)',
        'color:#e2e8f0','font-size:12px','font-family:ui-monospace,monospace',
        'padding:3px 12px 4px 10px','border-top-right-radius:7px',
        'pointer-events:none','max-width:50vw',
        'overflow:hidden','text-overflow:ellipsis','white-space:nowrap',
        'opacity:0','transition:opacity 0.15s ease',
        'border-top:1px solid rgba(148,163,184,0.15)',
        'border-right:1px solid rgba(148,163,184,0.15)',
      ].join(';');
      document.body.appendChild(bar);
    }
    bar.textContent = path;
    let idleTimer = null;
    function onMove() {
      bar.textContent = TAB_PATHS[tab] || `mycloudnexus.com/monitoring/${tab}`;
      bar.style.opacity = '1';
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => { bar.style.opacity = '0'; }, 300);
    }
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => { window.removeEventListener('mousemove', onMove); clearTimeout(idleTimer); };
  }, [tab]);

  // Log cloud disconnections
  const prevConns = useRef({});
  useEffect(() => {
    const prev = prevConns.current;
    Object.keys(prev).forEach(p => { if (prev[p]?.connected && !connections[p]?.connected) logActivity('cloud_disconnected', { provider: p.toUpperCase(), path: `mycloudnexus.com/monitoring/connections/${p}` }); });
    prevConns.current = { ...connections };
  }, [connections]);

  // Log report export
  const prevExport = useRef(false);
  useEffect(() => {
    if (exportOpen && !prevExport.current) logActivity('report_exported', { tool: 'Monitoring', path: 'mycloudnexus.com/monitoring/export' });
    prevExport.current = exportOpen;
  }, [exportOpen]);

  const isReal = mode === 'real' && backendOnline;

  const rawAWS   = isReal ? realData.aws   : MOCK_AWS_SERVICES;
  const rawGCP   = isReal ? realData.gcp   : MOCK_GCP_SERVICES;
  const rawAzure = isReal ? realData.azure : MOCK_AZURE_SERVICES;
  const alerts   = isReal ? realAlerts     : mockAlerts;
  const topologyNodes = isReal && realTopology ? realTopology : NETWORK_NODES;

  function filterServices(services) {
    return services.filter(s => {
      const q = searchQuery.toLowerCase();
      const matchQ = !q || s.name?.toLowerCase().includes(q) || s.type?.toLowerCase().includes(q) || s.region?.toLowerCase().includes(q);
      let matchS = true;
      if (filterStatus === 'private') matchS = s.isPrivate || s.networkAccess === 'private';
      else if (filterStatus === 'stopped') matchS = ['stopped','terminated','deallocated','shutting-down','stopping'].includes((s.status||'').toLowerCase());
      else if (filterStatus !== 'all') matchS = s.health === filterStatus;
      return matchQ && matchS;
    });
  }

  const NETWORK_INFRA_TYPES = new Set(['Security Group', 'Route Table', 'VPC', 'Internet Gateway', 'Virtual Network']);
  const excludeNetworkInfra = services => services.filter(s => !NETWORK_INFRA_TYPES.has(s.type));

  const awsServices   = filterServices(rawAWS);
  const gcpServices   = filterServices(rawGCP);
  const azureServices = filterServices(rawAzure);
  const allServices   = [...rawAWS, ...rawGCP, ...rawAzure];
  const activeAlerts  = alerts.filter(a => !a.acknowledged);

  const allFiltered = [...awsServices, ...gcpServices, ...azureServices];
  const statsData = isReal ? {
    totalServices: allFiltered.length,
    healthyServices: allFiltered.filter(s => s.health === 'healthy').length,
    warningServices: allFiltered.filter(s => s.health === 'warning').length,
    criticalServices: allFiltered.filter(s => s.health === 'critical').length,
    totalCostMTD: Math.round(allFiltered.reduce((a, s) => a + (s.cost || 0), 0)),
    regions: new Set(allFiltered.map(s => s.region).filter(Boolean)).size,
  } : OVERVIEW_STATS;

  function handleRefresh() {
    setLoading(true);
    setLastRefresh(new Date());
    if (isReal) {
      emit('refresh', {});
      setTimeout(() => setLoading(false), 1500);
    } else {
      setTimeout(() => setLoading(false), 800);
    }
  }

  function _serviceLogDetails(resource, action) {
    const providerFromResource = resource._provider || resource.provider || '';
    const cloud = providerFromResource
      ? providerFromResource.toUpperCase()
      : ({ aws: 'AWS', gcp: 'GCP', azure: 'Azure' }[tab] || tab.toUpperCase());
    const serviceName = resource.type || resource.family || 'Unknown Service';
    const slug = serviceName.toLowerCase().replace(/\s+/g, '-');
    return {
      cloud,
      serviceName,
      resourceName: resource.name || '',
      tab,
      region: resource.region || '',
      status: resource.status || '',
      action,
      path: `mycloudnexus.com/monitoring/${tab}/${slug}/${resource.name || ''}`,
    };
  }

  function handleResourceClick(resource) {
    setSelectedResource(resource);
    setDrawerOpen(true);
    logActivity('service_clicked', _serviceLogDetails(resource, 'Left Click'));
  }

  function handleResourceRightClick(resource) {
    logActivity('service_right_clicked', _serviceLogDetails(resource, 'Right Click'));
  }

  function handleAllConnected(conns) {
    Object.entries(conns).forEach(([provider, data]) => {
      if (data.connected && data.credMeta && Object.keys(data.credMeta).length > 0) {
        logActivity('cloud_connected', { provider: provider.toUpperCase(), credentials: data.credMeta, path: `mycloudnexus.com/monitoring/connections/${provider}` });
      }
    });
    setConnections(conns);
    if (Object.values(conns).some(c => c.connected)) setMode('real');
    else setMode('mock');
  }

  function handleAcknowledge(alertId) {
    if (isReal) {
      emit('acknowledge', { alertId });
    } else {
      setMockAlerts(prev => prev.map(a => a.id === alertId ? { ...a, acknowledged: true } : a));
    }
  }

  const awsCost   = Math.round(rawAWS.reduce((a, s) => a + (s.cost || 0), 0));
  const gcpCost   = Math.round(rawGCP.reduce((a, s) => a + (s.cost || 0), 0));
  const azCost    = Math.round(rawAzure.reduce((a, s) => a + (s.cost || 0), 0));

  const overviewMetrics = [
    { label: 'Total Services', value: fmt.num(statsData.totalServices), sub: `${statsData.regions} active regions` },
    { label: 'MTD Cloud Spend', value: fmt.usd(statsData.totalCostMTD), sub: '↑ 8.2% vs last month', color: 'var(--color-danger)' },
    { label: 'Service Health', value: `${statsData.healthyServices} healthy`, sub: `${statsData.warningServices} warn · ${statsData.criticalServices} critical`, color: 'var(--color-success)' },
    { label: 'Active Alerts', value: fmt.num(activeAlerts.length), sub: `${alerts.filter(a => a.severity === 'critical' && !a.acknowledged).length} critical`, color: activeAlerts.length > 0 ? 'var(--color-danger)' : 'var(--color-success)' },
  ];

  const awsMetrics = [
    { label: 'AWS Services', value: fmt.num(rawAWS.length), sub: `${new Set(rawAWS.map(s => s.region)).size} regions` },
    { label: 'AWS MTD Spend', value: fmt.usd(awsCost), sub: '↑ 6.1% vs last month', color: 'var(--color-danger)' },
    { label: 'Compute', value: `${rawAWS.filter(s => s.family === 'Compute').length} instances`, sub: `${rawAWS.filter(s => s.family === 'Compute' && s.health === 'warning').length} warnings`, color: 'var(--color-warning)' },
    { label: 'Databases', value: `${rawAWS.filter(s => s.family === 'Database').length} instances`, sub: 'All regions', color: 'var(--color-success)' },
  ];

  const gcpMetrics = [
    { label: 'GCP Services', value: fmt.num(rawGCP.length), sub: `${new Set(rawGCP.map(s => s.region)).size} regions` },
    { label: 'GCP MTD Spend', value: fmt.usd(gcpCost), sub: '↑ 4.2% vs last month', color: 'var(--color-warning)' },
    { label: 'Compute VMs', value: `${rawGCP.filter(s => s.family === 'Compute').length} running`, sub: 'All zones', color: 'var(--color-success)' },
    { label: 'GKE Clusters', value: `${rawGCP.filter(s => s.family === 'Container').length} clusters`, sub: 'Kubernetes' },
  ];

  const azureMetrics = [
    { label: 'Azure Services', value: fmt.num(rawAzure.length), sub: `${new Set(rawAzure.map(s => s.region)).size} regions` },
    { label: 'Azure MTD Spend', value: fmt.usd(azCost), sub: '↑ 11.4% vs last month', color: 'var(--color-danger)' },
    { label: 'Virtual Machines', value: `${rawAzure.filter(s => s.family === 'Compute').length} running`, sub: `${rawAzure.filter(s => s.family === 'Compute' && s.health === 'warning').length} warning`, color: 'var(--color-warning)' },
    { label: 'AKS Clusters', value: `${rawAzure.filter(s => s.family === 'Container').length} clusters`, sub: 'Kubernetes', color: 'var(--color-success)' },
  ];

  const connectedCount = Object.values(connections).filter(c => c.connected).length;

  if (sessionRevoked) return (
    <div style={{position:'fixed',inset:0,background:'rgba(7,17,31,0.93)',backdropFilter:'blur(6px)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
      <div style={{background:'#fff',borderRadius:20,padding:'40px 36px',maxWidth:420,width:'100%',textAlign:'center',boxShadow:'0 24px 64px rgba(0,0,0,0.3)'}}>
        <div style={{width:60,height:60,background:'#fee2e2',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px'}}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </div>
        <div style={{fontSize:20,fontWeight:800,color:'#0f172a',marginBottom:10,letterSpacing:'-0.4px'}}>{revokeReason === 'kicked' ? 'Signed In Elsewhere' : 'Account Removed'}</div>
        <div style={{fontSize:14,color:'#64748b',lineHeight:1.6,marginBottom:28}}>
          {revokeReason === 'kicked'
            ? <>Your account was just signed in on another device.<br/>For security, only one device can be active at a time.</>
            : <>Your account has been removed by the administrator.<br/>You no longer have access to this tool.</>}
        </div>
        <button
          onClick={() => window.location.href = 'http://localhost:3006'}
          style={{background:'#2563eb',color:'#fff',fontSize:14,fontWeight:700,padding:'12px 32px',borderRadius:10,border:'none',cursor:'pointer'}}
        >
          Back to Login
        </button>
      </div>
    </div>
  );

  return (
    <div className="app">
      {isReal && connectedCount > 0 && (
        <div className="mode-banner">
          Real mode — live data from: {Object.keys(connections).filter(p => connections[p]?.connected).map(p => p.toUpperCase()).join(', ')}.{' '}
          <span style={{ cursor:'pointer', textDecoration:'underline' }} onClick={() => setModalOpen(true)}>Manage connections</span>
        </div>
      )}
      {!backendOnline && (
        <div className="mode-banner" style={{ background:'rgba(239,68,68,0.1)', borderColor:'rgba(239,68,68,0.3)', color:'#dc2626' }}>
          Backend offline — showing mock data ({allServices.length} services). Start: <code style={{ fontSize:11 }}>cd backend && npm start</code>
        </div>
      )}

      <Topbar
        mode={mode} onModeChange={m => { setMode(m); if (m === 'real') setModalOpen(true); }}
        onRefresh={handleRefresh} lastRefresh={lastRefresh}
        connections={connections} onOpenConnect={() => setModalOpen(true)}
        onExport={() => setExportOpen(true)}
        searchQuery={searchQuery} onSearchChange={setSearchQuery}
        filterStatus={filterStatus} onFilterChange={setFilterStatus}
        alertCount={activeAlerts.length}
        userName={userName} userPhoto={userPhoto}
        onBack={() => window.history.length > 1 ? window.history.back() : window.close()}
      />

      <div className="tabs">
        {TABS.map(t => (
          <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t === 'alerts'
              ? <><TabLabel tabKey={t} /> {activeAlerts.length > 0 && <span className="alert-badge">{activeAlerts.length}</span>}</>
              : <TabLabel tabKey={t} />}
          </button>
        ))}
      </div>

      {loading && <div className="loading-bar"><div className="loading-fill" /></div>}
      {Object.values(fetchingProviders).some(Boolean) && (
        <div style={{ height:2, background:'var(--border)', position:'relative', overflow:'hidden' }}>
          <div style={{ height:'100%', background:'linear-gradient(90deg, #4285F4, #FF9900, #008AD7)',
            animation:'loadingSlide 1.5s linear infinite', position:'absolute', width:'60%' }} />
        </div>
      )}

      {/* ── OVERVIEW ── */}
      {tab === 'overview' && (
        <>
          <MetricRow metrics={overviewMetrics} />
          <div className="provider-grid">
            {['aws','gcp','azure'].map(p => (
              <ProviderCard key={p} provider={p}
                services={p === 'aws' ? rawAWS : p === 'gcp' ? rawGCP : rawAzure}
                onClick={() => setTab(p)} />
            ))}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
            <SLATracker awsServices={rawAWS} gcpServices={rawGCP} azureServices={rawAzure} />
            <div>
              <OverviewCharts awsServices={rawAWS} gcpServices={rawGCP} azureServices={rawAzure} alerts={alerts} />
            </div>
          </div>
          <RegionMap allServices={allServices} />
          <ProcessMonitor allServices={allServices} />
          <div className="section-card" style={{ marginBottom:16 }}>
            <div className="section-title">Recent Alerts</div>
            <AlertsPanel alerts={alerts.slice(0, 5)} onAcknowledge={handleAcknowledge} compact />
          </div>
        </>
      )}

      {/* ── AWS ── */}
      {tab === 'aws' && (
        <>
          <MetricRow metrics={awsMetrics} />
          <SpaceUtilizationCharts services={rawAWS} provider="aws" />
          <div className="section-card">
            <div className="section-title" style={{ display:'flex', alignItems:'center', gap:8 }}>
              <ProviderLogo provider="aws" size={20} />
              AWS Services — All Resources ({excludeNetworkInfra(rawAWS).length})
              {fetchingProviders.aws && <span style={{ marginLeft:8, fontSize:12, color:'#FF9900' }}>Fetching...</span>}
            </div>
            <ServiceDetailTable services={excludeNetworkInfra(rawAWS)} provider="aws" onRowClick={handleResourceClick} onRightClick={handleResourceRightClick} showStatusFilter={true} />
          </div>
          <div className="section-card" style={{ marginTop: 12 }}>
            <div className="section-title">Security &amp; Networking — Internet Gateways · Security Groups · Route Tables</div>
            <NetworkSecurityPanel allServices={rawAWS} />
          </div>
        </>
      )}

      {/* ── GCP ── */}
      {tab === 'gcp' && (
        <>
          <MetricRow metrics={gcpMetrics} />
          <SpaceUtilizationCharts services={rawGCP} provider="gcp" />
          <div className="section-card">
            <div className="section-title" style={{ display:'flex', alignItems:'center', gap:8 }}>
              <ProviderLogo provider="gcp" size={20} />
              GCP Services — All Resources ({excludeNetworkInfra(gcpServices).length})
              {fetchingProviders.gcp && <span style={{ marginLeft:8, fontSize:12, color:'#4285F4' }}>Fetching...</span>}
            </div>
            <ServiceDetailTable services={excludeNetworkInfra(gcpServices)} provider="gcp" onRowClick={handleResourceClick} onRightClick={handleResourceRightClick} />
          </div>
        </>
      )}

      {/* ── AZURE ── */}
      {tab === 'azure' && (
        <>
          <MetricRow metrics={azureMetrics} />
          <SpaceUtilizationCharts services={rawAzure} provider="azure" />
          <div className="section-card">
            <div className="section-title" style={{ display:'flex', alignItems:'center', gap:8 }}>
              <ProviderLogo provider="azure" size={20} />
              Azure Services — All Resources ({excludeNetworkInfra(azureServices).length})
              {fetchingProviders.azure && <span style={{ marginLeft:8, fontSize:12, color:'#008AD7' }}>Fetching...</span>}
            </div>
            <ServiceDetailTable services={excludeNetworkInfra(azureServices)} provider="azure" onRowClick={handleResourceClick} onRightClick={handleResourceRightClick} />
          </div>
        </>
      )}

      {/* ── NETWORK ── */}
      {tab === 'network' && (
        <>
          <div className="section-card" style={{ padding: 0, height: 'calc(100vh - 140px)', minHeight: 700, display: 'flex', flexDirection: 'column' }}>
            <NetworkTopologyMap nodes={topologyNodes} onNodeClick={handleResourceClick} allServices={allServices} />
          </div>
          <div className="section-card" style={{ marginTop: 12 }}>
            <div className="section-title">Security &amp; Networking — Internet Gateways · Security Groups · Route Tables</div>
            <NetworkSecurityPanel allServices={allServices} />
          </div>
        </>
      )}

      {/* ── HEATMAP ── */}
      {tab === 'heatmap' && (
        <>
          <HeatmapPanel allServices={allServices} />
          <ProcessMonitor allServices={allServices} />
        </>
      )}

      {/* ── ALERTS ── */}
      {tab === 'alerts' && (
        <div className="section-card">
          <div className="section-title">Active Anomalies &amp; Alerts</div>
          <AlertsPanel alerts={alerts} onAcknowledge={handleAcknowledge} />
        </div>
      )}

      {/* ── AI SUGGESTIONS ── */}
      {tab === 'ai' && (
        <AISuggestions
          awsServices={rawAWS}
          gcpServices={rawGCP}
          azureServices={rawAzure}
        />
      )}

      {/* ── AI BILLING & USAGE ── */}
      {tab === 'ai-billing' && <AIBillingPanel />}

      <ExportModal
        open={exportOpen} onClose={() => setExportOpen(false)}
        awsServices={rawAWS} gcpServices={rawGCP} azureServices={rawAzure}
        alerts={alerts}
      />
      <ResourceDetailDrawer
        resource={selectedResource} open={drawerOpen}
        onClose={() => setDrawerOpen(false)} allServices={allServices}
      />
      <CloudConnectModal
        open={modalOpen}
        uid={uidRef.current}
        onClose={() => { setModalOpen(false); if (!Object.values(connections).some(c => c.connected)) setMode('mock'); }}
        initialConnections={connections}
        fetchingProviders={fetchingProviders}
      />
    </div>
  );
}
