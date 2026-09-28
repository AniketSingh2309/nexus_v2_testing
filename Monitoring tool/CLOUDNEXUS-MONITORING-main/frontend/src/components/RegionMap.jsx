import React, { useState, useMemo, useRef, useCallback } from 'react';
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from 'react-simple-maps';
import ProviderLogo from './ProviderLogo';

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// World topology from Natural Earth (CDN, ~100 KB)
const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

// ── Region coordinates ─────────────────────────────────────────────────────
const REGION_COORDS = {
  // AWS
  'us-east-1':       { lat: 38.93,  lon: -77.46,  label: 'N. Virginia'    },
  'us-east-2':       { lat: 39.96,  lon: -82.99,  label: 'Ohio'           },
  'us-west-1':       { lat: 37.77,  lon: -122.42, label: 'N. California'  },
  'us-west-2':       { lat: 45.52,  lon: -122.68, label: 'Oregon'         },
  'ca-central-1':    { lat: 45.42,  lon: -75.69,  label: 'Canada Central' },
  'eu-west-1':       { lat: 53.33,  lon: -6.25,   label: 'Ireland'        },
  'eu-west-2':       { lat: 51.51,  lon: -0.13,   label: 'London'         },
  'eu-west-3':       { lat: 48.86,  lon:  2.35,   label: 'Paris'          },
  'eu-central-1':    { lat: 50.11,  lon:  8.68,   label: 'Frankfurt'      },
  'eu-north-1':      { lat: 59.33,  lon: 18.07,   label: 'Stockholm'      },
  'eu-south-1':      { lat: 45.46,  lon:  9.19,   label: 'Milan'          },
  'ap-southeast-1':  { lat:  1.35,  lon: 103.82,  label: 'Singapore'      },
  'ap-southeast-2':  { lat:-33.87,  lon: 151.21,  label: 'Sydney'         },
  'ap-northeast-1':  { lat: 35.69,  lon: 139.69,  label: 'Tokyo'          },
  'ap-northeast-2':  { lat: 37.57,  lon: 126.98,  label: 'Seoul'          },
  'ap-northeast-3':  { lat: 34.69,  lon: 135.50,  label: 'Osaka'          },
  'ap-south-1':      { lat: 19.08,  lon:  72.88,  label: 'Mumbai'         },
  'ap-south-2':      { lat: 17.39,  lon:  78.49,  label: 'Hyderabad'      },
  'ap-east-1':       { lat: 22.39,  lon: 114.11,  label: 'Hong Kong'      },
  'me-south-1':      { lat: 26.07,  lon:  50.56,  label: 'Bahrain'        },
  'me-central-1':    { lat: 25.20,  lon:  55.27,  label: 'UAE'            },
  'af-south-1':      { lat:-33.92,  lon:  18.42,  label: 'Cape Town'      },
  'sa-east-1':       { lat:-23.55,  lon: -46.63,  label: 'São Paulo'      },
  'il-central-1':    { lat: 31.77,  lon:  35.22,  label: 'Tel Aviv'       },
  // GCP
  'us-central1':     { lat: 41.26,  lon: -95.86,  label: 'Iowa'           },
  'us-east1':        { lat: 33.19,  lon: -80.01,  label: 'S. Carolina'    },
  'us-west1':        { lat: 45.60,  lon:-121.18,  label: 'Oregon'         },
  'europe-west1':    { lat: 50.45,  lon:   3.82,  label: 'Belgium'        },
  'europe-west2':    { lat: 51.51,  lon:  -0.13,  label: 'London'         },
  'europe-west3':    { lat: 50.11,  lon:   8.68,  label: 'Frankfurt'      },
  'asia-east1':      { lat: 24.05,  lon: 120.55,  label: 'Taiwan'         },
  'asia-southeast1': { lat:  1.35,  lon: 103.82,  label: 'Singapore'      },
  'asia-northeast1': { lat: 35.69,  lon: 139.69,  label: 'Tokyo'          },
  // Azure
  'eastus':          { lat: 37.36,  lon: -79.41,  label: 'East US'        },
  'eastus2':         { lat: 36.66,  lon: -78.37,  label: 'East US 2'      },
  'westus':          { lat: 37.78,  lon:-122.42,  label: 'West US'        },
  'westus2':         { lat: 47.23,  lon:-119.85,  label: 'West US 2'      },
  'westeurope':      { lat: 52.37,  lon:   4.90,  label: 'Netherlands'    },
  'northeurope':     { lat: 53.33,  lon:  -6.25,  label: 'Ireland'        },
  'southeastasia':   { lat:  1.35,  lon: 103.82,  label: 'Singapore'      },
  'eastasia':        { lat: 22.39,  lon: 114.11,  label: 'Hong Kong'      },
  'japaneast':       { lat: 35.69,  lon: 139.69,  label: 'Tokyo'          },
  'australiaeast':   { lat:-33.87,  lon: 151.21,  label: 'Sydney'         },
  'centralindia':    { lat: 18.52,  lon:  73.86,  label: 'Pune'           },
  'brazilsouth':     { lat:-23.55,  lon: -46.63,  label: 'São Paulo'      },
};

const PROVIDER_COLOR = { aws: '#FF9900', gcp: '#4285F4', azure: '#008AD7' };
const HEALTH_COLOR   = { healthy: '#22c55e', warning: '#eab308', critical: '#ef4444' };
const PROVIDER_LABEL = { aws: 'AWS', gcp: 'GCP', azure: 'Azure' };

function getHealth(services) {
  if (!services.length) return 'healthy';
  if (services.some(s => s.health === 'critical')) return 'critical';
  if (services.some(s => s.health === 'warning'))  return 'warning';
  return 'healthy';
}

export default function RegionMap({ allServices }) {
  const [hovered, setHovered] = useState(null);
  const [position, setPosition] = useState({ coordinates: [78.96, 20.59], zoom: 4 });
  const animRef = useRef(null);

  const flyTo = useCallback((targetCoords, targetZoom = 8) => {
    if (animRef.current) cancelAnimationFrame(animRef.current);

    const startCoords = position.coordinates;
    const startZoom   = position.zoom;
    const midZoom     = Math.max(1.2, Math.min(startZoom, targetZoom) * 0.35); // zoom-out valley
    const duration    = 1200; // ms total
    const startTime   = performance.now();

    function step(now) {
      const t      = Math.min((now - startTime) / duration, 1);
      const eased  = easeInOutCubic(t);

      // Coordinates: linear lerp with easing
      const lon = startCoords[0] + (targetCoords[0] - startCoords[0]) * eased;
      const lat = startCoords[1] + (targetCoords[1] - startCoords[1]) * eased;

      // Zoom: parabolic arc — valley at t=0.5 for the "fly over" effect
      const zoom = t < 0.5
        ? startZoom  + (midZoom    - startZoom)  * easeInOutCubic(t * 2)
        : midZoom    + (targetZoom - midZoom)     * easeInOutCubic((t - 0.5) * 2);

      setPosition({ coordinates: [lon, lat], zoom });

      if (t < 1) animRef.current = requestAnimationFrame(step);
    }

    animRef.current = requestAnimationFrame(step);
  }, [position]);

  const byRegion = useMemo(() => {
    const map = {};
    for (const s of allServices) {
      const k = s.region || 'unknown';
      if (!map[k]) map[k] = [];
      map[k].push(s);
    }
    return map;
  }, [allServices]);

  const markers = useMemo(() => {
    const seen = {};
    return Object.entries(byRegion)
      .filter(([id]) => REGION_COORDS[id])
      .map(([id, svcs]) => {
        const coord = REGION_COORDS[id];
        const key = `${Math.round(coord.lon / 3)}_${Math.round(coord.lat / 3)}`;
        const offset = seen[key] ? (seen[key] * 3) : 0;
        seen[key] = (seen[key] || 0) + 1;
        return {
          id, svcs,
          lon: coord.lon + offset,
          lat: coord.lat + offset,
          label: coord.label,
          health: getHealth(svcs),
          provider: svcs[0]?.provider || 'aws',
        };
      });
  }, [byRegion]);

  const hoveredMarker = hovered ? markers.find(m => m.id === hovered) : null;

  return (
    <div className="section-card">
      <div className="section-title">Regional Distribution
        <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 400, color: 'var(--text3)' }}>
          {markers.length} active regions · {allServices.length} services
        </span>
      </div>

      {/* Map container — fixed rectangle, scroll/drag to pan */}
      <div style={{
        position: 'relative', borderRadius: 12,
        background: '#060e2a',
        border: '1px solid rgba(0,180,216,0.2)',
        overflow: 'hidden',
        height: 420,
        boxShadow: 'inset 0 0 60px rgba(0,10,40,0.8)',
      }}>
        {/* Zoom controls */}
        <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {[
            { label: '+', action: () => setPosition(p => ({ ...p, zoom: Math.min(p.zoom * 1.5, 20) })) },
            { label: '−', action: () => setPosition(p => ({ ...p, zoom: Math.max(p.zoom / 1.5, 1) })) },
            { label: '⊙', action: () => flyTo([78.96, 20.59], 4) },
          ].map(({ label, action }) => (
            <button key={label} onClick={action} style={{
              width: 28, height: 28, borderRadius: 6, border: '1px solid rgba(0,180,216,0.3)',
              background: 'rgba(6,14,42,0.9)', color: 'rgba(255,255,255,0.8)',
              fontSize: 15, fontWeight: 700, cursor: 'pointer', lineHeight: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{label}</button>
          ))}
        </div>

        <ComposableMap
          projection="geoMercator"
          projectionConfig={{ scale: 155, center: [10, 15] }}
          style={{ width: '100%', height: '100%' }}
        >
          <defs>
            <filter id="neon-glow" x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="marker-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <linearGradient id="outlineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stopColor="#00e5ff" />
              <stop offset="45%"  stopColor="#2979ff" />
              <stop offset="100%" stopColor="#9c27b0" />
            </linearGradient>
          </defs>

          <ZoomableGroup
            zoom={position.zoom}
            center={position.coordinates}
            onMoveEnd={({ coordinates, zoom }) => setPosition({ coordinates, zoom })}
            minZoom={1}
            maxZoom={20}
          >
          {/* Continent outlines — glow layer (thick, blurred) */}
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map(geo => (
                <Geography
                  key={`glow-${geo.rsmKey}`}
                  geography={geo}
                  fill="none"
                  stroke="url(#outlineGrad)"
                  strokeWidth={3.5}
                  strokeOpacity={0.18}
                  style={{
                    default: { outline: 'none', filter: 'url(#neon-glow)' },
                    hover:   { outline: 'none' },
                    pressed: { outline: 'none' },
                  }}
                />
              ))
            }
          </Geographies>

          {/* Continent outlines — sharp top layer */}
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map(geo => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill="rgba(6,14,42,0.45)"
                  stroke="url(#outlineGrad)"
                  strokeWidth={0.7}
                  strokeOpacity={0.75}
                  style={{
                    default: { outline: 'none' },
                    hover:   { outline: 'none', fill: 'rgba(0,180,216,0.06)' },
                    pressed: { outline: 'none' },
                  }}
                />
              ))
            }
          </Geographies>

          {/* Region markers */}
          {markers.map(m => {
            const isHov = hovered === m.id;
            const hColor = HEALTH_COLOR[m.health];
            const pColor = PROVIDER_COLOR[m.provider];
            const r = isHov ? 9 : 6;

            return (
              <Marker key={m.id} coordinates={[m.lon, m.lat]}>
                {/* Outer pulse ring */}
                <circle r={isHov ? 20 : 13} fill="transparent"
                  stroke={hColor} strokeWidth={isHov ? 1.2 : 0.7}
                  opacity={isHov ? 0.55 : 0.22} />
                {/* Mid ring */}
                <circle r={isHov ? 13 : 9} fill={`${hColor}18`}
                  stroke={hColor} strokeWidth={0.7} opacity={0.6} />
                {/* Provider-colored core */}
                <circle r={r} fill={pColor}
                  stroke="rgba(0,0,0,0.5)" strokeWidth={1}
                  style={{ cursor: 'pointer', filter: isHov ? 'url(#marker-glow)' : undefined }}
                  onMouseEnter={() => setHovered(m.id)}
                  onMouseLeave={() => setHovered(null)}
                />
                {/* Service count */}
                <text textAnchor="middle" y={r * 0.38}
                  fontSize={isHov ? 7 : 5.5} fill="white" fontWeight="800"
                  style={{ pointerEvents: 'none', userSelect: 'none' }}>
                  {m.svcs.length}
                </text>
                {/* Label on hover */}
                {isHov && (
                  <>
                    <text textAnchor="middle" y={r + 14} fontSize={8.5}
                      fill={hColor} fontWeight="700"
                      style={{ pointerEvents: 'none', userSelect: 'none' }}>
                      {m.label}
                    </text>
                    <text textAnchor="middle" y={r + 25} fontSize={7}
                      fill="rgba(255,255,255,0.5)"
                      style={{ pointerEvents: 'none', userSelect: 'none' }}>
                      {m.id}
                    </text>
                  </>
                )}
              </Marker>
            );
          })}
          </ZoomableGroup>
        </ComposableMap>

        {/* Hover detail panel */}
        {hoveredMarker && (
          <div style={{
            position: 'absolute', bottom: 12, left: 12,
            background: 'rgba(6,14,42,0.95)',
            border: `1px solid ${PROVIDER_COLOR[hoveredMarker.provider]}50`,
            borderRadius: 10, padding: '10px 14px',
            minWidth: 240, maxWidth: 360,
            backdropFilter: 'blur(8px)',
            boxShadow: `0 0 20px ${PROVIDER_COLOR[hoveredMarker.provider]}20`,
            pointerEvents: 'none',
          }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <ProviderLogo provider={hoveredMarker.provider} size={16} />
              <span style={{ color: 'white' }}>{hoveredMarker.label}</span>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 400 }}>{hoveredMarker.id}</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {hoveredMarker.svcs.map(s => (
                <span key={s.id} style={{
                  fontSize: 10, padding: '2px 8px', borderRadius: 4,
                  background: `${HEALTH_COLOR[s.health]}18`,
                  border: `0.5px solid ${HEALTH_COLOR[s.health]}60`,
                  color: HEALTH_COLOR[s.health],
                }}>
                  {s.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Map legend overlay */}
        <div style={{
          position: 'absolute', top: 10, right: 10,
          display: 'flex', flexDirection: 'column', gap: 4,
          background: 'rgba(6,14,42,0.8)', borderRadius: 8,
          padding: '8px 12px', fontSize: 10, color: 'rgba(255,255,255,0.6)',
          border: '1px solid rgba(0,180,216,0.15)',
        }}>
          {[['aws','#FF9900','AWS'],['gcp','#4285F4','GCP'],['azure','#008AD7','Azure']].map(([p, c, l]) => (
            <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: c }} />
              <span>{l}</span>
            </div>
          ))}
          <div style={{ borderTop: '0.5px solid rgba(255,255,255,0.1)', marginTop: 4, paddingTop: 4 }}>
            {[['#22c55e','Healthy'],['#eab308','Warning'],['#ef4444','Critical']].map(([c, l]) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: c }} />
                <span>{l}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Region pills — click to fly to that region on the map */}
      <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
        {markers
          .sort((a, b) => b.svcs.length - a.svcs.length)
          .map(m => (
            <div key={m.id}
              onMouseEnter={() => setHovered(m.id)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => flyTo([m.lon, m.lat], 8)}
              style={{
                padding: '4px 10px', borderRadius: 20, cursor: 'pointer',
                background: hovered === m.id ? `${PROVIDER_COLOR[m.provider]}20` : 'var(--card2)',
                border: `1px solid ${hovered === m.id ? PROVIDER_COLOR[m.provider] : 'var(--border)'}`,
                fontSize: 11, display: 'flex', alignItems: 'center', gap: 6,
                transition: 'all 0.15s',
              }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: HEALTH_COLOR[m.health], flexShrink: 0 }} />
              <span style={{ color: 'var(--text)', fontWeight: 500 }}>{m.label}</span>
              <span style={{
                background: PROVIDER_COLOR[m.provider], color: 'white',
                borderRadius: 10, padding: '0 5px', fontSize: 10, fontWeight: 700,
              }}>{m.svcs.length}</span>
            </div>
          ))}
      </div>
    </div>
  );
}
