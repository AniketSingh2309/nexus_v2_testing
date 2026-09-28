import React from 'react';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Filler, Tooltip, Legend,
} from 'chart.js';
import { COLORS, chartDefaults, gridY, noGridX } from '../utils/theme';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Filler, Tooltip, Legend);

const ALL_PROVIDER_CFG = [
  { key: 'aws',   label: 'AWS',   color: COLORS.aws   },
  { key: 'gcp',   label: 'GCP',   color: COLORS.gcp   },
  { key: 'azure', label: 'Azure', color: COLORS.azure  },
];

export function TrendChart({ data, activeProviders }) {
  if (!data?.length) return <div className="chart-placeholder">Loading…</div>;
  const labels = data.map(d => d.date);

  // Only show lines for providers that are active (connected in real mode)
  // or have non-zero data. Hides flat $0 lines for unconnected providers.
  const visible = activeProviders && activeProviders.length > 0
    ? ALL_PROVIDER_CFG.filter(p => activeProviders.includes(p.key))
    : ALL_PROVIDER_CFG.filter(p => data.some(d => d[p.key] > 0));
  const shown = visible.length > 0 ? visible : ALL_PROVIDER_CFG;

  return (
    <div style={{ height: 180 }}>
      <Line
        data={{
          labels,
          datasets: shown.map(p => ({
            label: p.label,
            data: data.map(d => d[p.key]),
            borderColor: p.color, borderWidth: 2, tension: 0.4, pointRadius: 2, fill: false,
          })),
        }}
        options={{
          ...chartDefaults,
          scales: {
            y: { ...gridY(), ticks: { font: { size: 10 }, callback: v => '$' + v } },
            x: { ...noGridX(), ticks: { font: { size: 9 }, maxRotation: 0,
              callback: (_, i, all) => (i === 0 || i === Math.floor(all.length / 2) || i === all.length - 1) ? data[i]?.date : '',
              autoSkip: false } },
          },
        }}
      />
    </div>
  );
}

export function DistChart({ overview, activeProviders }) {
  if (!overview) return null;
  const pv = overview.providers;

  const all = [
    { key: 'aws',   label: 'AWS',   color: COLORS.aws,   share: pv.aws?.share   || 0 },
    { key: 'gcp',   label: 'GCP',   color: COLORS.gcp,   share: pv.gcp?.share   || 0 },
    { key: 'azure', label: 'Azure', color: COLORS.azure, share: pv.azure?.share || 0 },
  ];

  // Only show slices for connected providers (non-zero share)
  const visible = activeProviders && activeProviders.length > 0
    ? all.filter(p => activeProviders.includes(p.key) && p.share > 0)
    : all.filter(p => p.share > 0);
  const shown = visible.length > 0 ? visible : all;

  return (
    <div style={{ height: 160 }}>
      <Doughnut
        data={{
          labels: shown.map(p => p.label),
          datasets: [{
            data: shown.map(p => p.share),
            backgroundColor: shown.map(p => p.color),
            borderWidth: 0, hoverOffset: 4,
          }],
        }}
        options={{ ...chartDefaults, cutout: '65%' }}
      />
    </div>
  );
}

export function ProviderBarChart({ data, color, label }) {
  if (!data?.length) return <div className="chart-placeholder">Loading…</div>;
  // Use date if available, otherwise Day N
  const labels = data.map((d, i) => d.date
    ? new Date(d.date).toLocaleDateString('default', { month: 'short', day: 'numeric' })
    : `Day ${d.day ?? i + 1}`);
  return (
    <div style={{ height: 200 }}>
      <Bar
        data={{
          labels,
          datasets: [{ label, data: data.map(d => d.cost), backgroundColor: color, borderRadius: 3 }],
        }}
        options={{
          ...chartDefaults,
          scales: {
            y: { ...gridY(), ticks: { font: { size: 10 }, callback: v => '$' + v } },
            x: { ...noGridX(), ticks: { font: { size: 9 }, maxRotation: 45, autoSkip: true, maxTicksLimit: 7 } },
          },
        }}
      />
    </div>
  );
}

export function ForecastChart({ trend, forecast }) {
  if (!trend?.length || !forecast) return <div className="chart-placeholder">Loading forecast…</div>;
  const hist       = trend.map(d => d.total);
  const n          = hist.length;
  const fcastVals  = forecast.forecast_30d || [];
  const lower      = forecast.lower_band   || [];
  const upper      = forecast.upper_band   || [];
  const allLabels  = [
    ...trend.map(d => d.date),
    ...Array.from({ length: fcastVals.length }, (_, i) => `F+${i + 1}`),
  ];
  const histData  = [...hist,           ...Array(fcastVals.length).fill(null)];
  const fcastData = [...Array(n-1).fill(null), hist[n-1], ...fcastVals];
  const lowerData = [...Array(n-1).fill(null), hist[n-1], ...lower];
  const upperData = [...Array(n-1).fill(null), hist[n-1], ...upper];
  return (
    <div style={{ height: 220 }}>
      <Line
        data={{
          labels: allLabels,
          datasets: [
            { label: 'Upper band', data: upperData, borderColor: 'transparent', backgroundColor: 'rgba(66,133,244,0.10)', fill: '+1', pointRadius: 0, tension: 0.3 },
            { label: 'Lower band', data: lowerData, borderColor: 'transparent', backgroundColor: 'rgba(66,133,244,0.10)', fill: false, pointRadius: 0, tension: 0.3 },
            { label: 'Historical', data: histData,  borderColor: COLORS.gcp, backgroundColor: 'rgba(66,133,244,0.06)', borderWidth: 1.5, fill: true, pointRadius: 0, tension: 0.3 },
            { label: 'Forecast',   data: fcastData, borderColor: COLORS.aws, borderDash: [5, 3], borderWidth: 2, fill: false, pointRadius: 0, tension: 0.3 },
          ],
        }}
        options={{
          ...chartDefaults,
          scales: {
            y: { ...gridY(), ticks: { font: { size: 10 }, callback: v => '$' + v } },
            x: { ...noGridX(), ticks: { font: { size: 9 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 8 } },
          },
        }}
      />
    </div>
  );
}

export function AzureHorizontalChart({ services }) {
  if (!services?.length) return null;
  return (
    <div style={{ height: Math.max(200, services.length * 40) }}>
      <Bar
        data={{
          labels: services.map(s => s.name),
          datasets: [{ label: 'Cost', data: services.map(s => s.cost), backgroundColor: COLORS.azure, borderRadius: 3 }],
        }}
        options={{
          ...chartDefaults,
          indexAxis: 'y',
          scales: {
            x: { ...gridY(), ticks: { font: { size: 10 }, callback: v => '$' + v } },
            y: { ...noGridX(), ticks: { font: { size: 11 } } },
          },
        }}
      />
    </div>
  );
}
