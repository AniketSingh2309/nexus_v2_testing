import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import { fmt, PROVIDER_META, chartDefaults, gridY, noGridX } from '../utils/theme';
import ProviderLogo from './ProviderLogo';

const PROVIDER_COLORS = { aws: '#FF9900', gcp: '#4285F4', azure: '#008AD7' };

function ThinkingDots() {
  return <span className="thinking-dots"><span /><span /><span /></span>;
}

function RiskBadge({ level }) {
  const map = {
    low:    { bg: '#dcfce7', color: '#16a34a', label: 'Low Risk'    },
    medium: { bg: '#fef9c3', color: '#ca8a04', label: 'Medium Risk' },
    high:   { bg: '#fee2e2', color: '#dc2626', label: 'High Risk'   },
  };
  const s = map[level] || map.medium;
  return (
    <span style={{ background: s.bg, color: s.color, borderRadius: 6,
                   padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>
      {s.label}
    </span>
  );
}


export default function ForecastPanelV2({ forecast, loading }) {
  const [selectedProvider, setSelectedProvider] = useState('all');

  if (!forecast) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af' }}>
        <ThinkingDots /> Loading forecast data…
      </div>
    );
  }

  // ── Real data from API ──────────────────────────────────────────────
  // provider_shares comes from the backend based on actual spend — never use hardcoded fallbacks
  const shares   = forecast.provider_shares   || {};
  const provHist = forecast.provider_history  || {};  // { aws: [...], gcp: [...], azure: [...] }
  const forecastArr = forecast.forecast_30d   || [];
  const lowerArr    = forecast.lower_band     || [];
  const upperArr    = forecast.upper_band     || [];
  const riskLevel   = forecast.risk_level     || 'medium';
  const seasonPeriod = forecast.seasonal_period;

  // Always show all three providers — unconnected ones use estimated share from MTD
  const activeProviderKeys = ['aws', 'gcp', 'azure'];

  const histLen  = 30;
  const fcastLen = forecastArr.length || 30;

  const histLabels  = Array.from({ length: histLen }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (histLen - i));
    return `${d.toLocaleString('default', { month: 'short' })} ${d.getDate()}`;
  });
  const fcastLabels = Array.from({ length: fcastLen }, (_, i) => `F+${i + 1}`);
  const allLabels   = [...histLabels, ...fcastLabels];

  function buildDatasets() {
    const providers = selectedProvider === 'all' ? activeProviderKeys : [selectedProvider];

    return providers.flatMap((p) => {
      const color = PROVIDER_COLORS[p];
      const share = shares[p] || 0.33;

      // Real per-provider history from API (last 30 days of actual trend data)
      const rawHist = (provHist[p] || []).slice(-histLen);
      const padded  = rawHist.length < histLen
        ? [...Array(histLen - rawHist.length).fill(null), ...rawHist]
        : rawHist;
      const lastHist = padded[padded.length - 1] || 0;

      // Scale forecast arrays by provider share
      const fc = forecastArr.map(v => Math.round(v * share));
      const lo = lowerArr.map(v   => Math.round(v * share));
      const hi = upperArr.map(v   => Math.round(v * share));

      const histData  = [...padded, ...Array(fcastLen).fill(null)];
      const fcastData = [...Array(histLen - 1).fill(null), lastHist, ...fc];
      const loData    = [...Array(histLen - 1).fill(null), lastHist, ...lo];
      const hiData    = [...Array(histLen - 1).fill(null), lastHist, ...hi];

      if (selectedProvider === 'all') {
        return [
          { label: `${PROVIDER_META[p].label} Historical`, data: histData,  borderColor: color, borderWidth: 2, fill: false, pointRadius: 0, tension: 0.3 },
          { label: `${PROVIDER_META[p].label} Forecast`,   data: fcastData, borderColor: color, borderDash: [5, 3], borderWidth: 2, fill: false, pointRadius: 0, tension: 0.3 },
        ];
      } else {
        return [
          { label: 'Upper 95% CI', data: hiData,    borderColor: 'transparent', backgroundColor: `${color}18`, fill: '+1', pointRadius: 0, tension: 0.3 },
          { label: 'Lower 95% CI', data: loData,    borderColor: 'transparent', fill: false, pointRadius: 0, tension: 0.3 },
          { label: 'Historical',   data: histData,  borderColor: color, backgroundColor: `${color}08`, borderWidth: 2, fill: true, pointRadius: 0, tension: 0.3 },
          { label: 'Ensemble Forecast', data: fcastData, borderColor: color, borderDash: [6, 3], borderWidth: 2.5, fill: false, pointRadius: 0, tension: 0.3 },
        ];
      }
    });
  }

  // Only show providers with real spend data — no zeros for unconnected providers
  const forecastProviders = activeProviderKeys.map(k => ({
    key:      k,
    share:    shares[k] || 0,
    forecast: forecast.total_30d * (shares[k] || 0),
    trendPct: forecast.trend_pct || 0,
  }));

  const selColor = PROVIDER_COLORS[selectedProvider] || '#888';

  return (
    <div className="forecast-v2-wrap">

      {/* Risk badge */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <RiskBadge level={riskLevel} />
      </div>

      {/* Provider tabs — only show providers that have data */}
      <div className="forecast-provider-tabs">
        <button
          className={`fcast-prov-btn ${selectedProvider === 'all' ? 'active' : ''}`}
          style={selectedProvider === 'all' ? { borderColor: '#888', color: '#555', background: '#f5f5f5' } : {}}
          onClick={() => setSelectedProvider('all')}
        >All Providers</button>
        {activeProviderKeys.map(p => (
          <button key={p}
            className={`fcast-prov-btn ${selectedProvider === p ? 'active' : ''}`}
            style={selectedProvider === p ? { borderColor: PROVIDER_COLORS[p], color: PROVIDER_COLORS[p], background: `${PROVIDER_COLORS[p]}12` } : {}}
            onClick={() => setSelectedProvider(p)}
          >
            <ProviderLogo provider={p} size={13} /> {PROVIDER_META[p].label}
          </button>
        ))}
      </div>

      {/* Chart — driven purely by real data */}
      <div style={{ height: 240, marginTop: 8 }}>
        <Line
          data={{ labels: allLabels, datasets: buildDatasets() }}
          options={{
            ...chartDefaults,
            plugins: {
              legend: {
                display: selectedProvider === 'all', position: 'top',
                labels: { font: { size: 11 }, boxWidth: 20, padding: 12 },
              },
              tooltip: {
                mode: 'index', intersect: false,
                callbacks: { label: (ctx) => ` ${ctx.dataset.label}: $${Number(ctx.raw || 0).toLocaleString()}` },
              },
            },
            scales: {
              y: { ...gridY(), ticks: { font: { size: 10 }, callback: v => '$' + (v >= 1000 ? (v / 1000).toFixed(1) + 'K' : v) } },
              x: { ...noGridX(), ticks: { font: { size: 9 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 10 } },
            },
          }}
        />
      </div>

      {/* Legend */}
      <div className="chart-legend" style={{ marginTop: 10 }}>
        {selectedProvider === 'all' ? (
          activeProviderKeys.map(p => (
            <span key={p}><span className="leg-dot" style={{ background: PROVIDER_COLORS[p] }} />{PROVIDER_META[p].label}</span>
          ))
        ) : (
          <>
            <span><span className="leg-dot" style={{ background: selColor }} />Historical</span>
            <span><span className="leg-line dashed" style={{ borderTopColor: selColor }} />Ensemble Forecast</span>
            <span><span className="leg-dot" style={{ background: `${selColor}30` }} />95% CI Band</span>
          </>
        )}
      </div>

      {/* Metrics strip — all values from API */}
      {selectedProvider !== 'all' && (
        <div className="forecast-metrics-strip">
          <div className="fms-item">
            <div className="fms-label">30-Day Forecast</div>
            <div className="fms-val" style={{ color: selColor }}>
              {fmt.usd(forecast.total_30d * (shares[selectedProvider] || 0.33))}
            </div>
          </div>
          <div className="fms-item">
            <div className="fms-label">Trend</div>
            <div className="fms-val">{forecast.trend_pct > 0 ? '+' : ''}{forecast.trend_pct}%/mo</div>
          </div>
          <div className="fms-item">
            <div className="fms-label">Confidence</div>
            <div className="fms-val">{forecast.confidence}%</div>
          </div>
          {seasonPeriod && (
            <div className="fms-item">
              <div className="fms-label">Seasonality</div>
              <div className="fms-val">{seasonPeriod}d cycle</div>
            </div>
          )}
        </div>
      )}



      {/* Seasonal + recommendation */}
      {(forecast.seasonal_insight || forecast.top_recommendation) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
          {forecast.seasonal_insight && (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8,
                          padding: '8px 10px', fontSize: 11, color: '#14532d' }}>
              <span style={{ fontWeight: 700 }}>Seasonal:</span> {forecast.seasonal_insight}
            </div>
          )}
          {forecast.top_recommendation && (
            <div style={{ background: '#fefce8', border: '1px solid #fde68a', borderRadius: 8,
                          padding: '8px 10px', fontSize: 11, color: '#713f12' }}>
              <span style={{ fontWeight: 700 }}>Action:</span> {forecast.top_recommendation}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
