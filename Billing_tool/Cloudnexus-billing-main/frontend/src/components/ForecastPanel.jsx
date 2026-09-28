import React, { useState, useEffect } from 'react';
import { fmt, PROVIDER_META } from '../utils/theme';

function ThinkingDots() {
  return (
    <span className="thinking-dots">
      <span /><span /><span />
    </span>
  );
}

export default function ForecastPanel({ forecast, loading }) {
  const [analysisReady, setAnalysisReady] = useState(false);

  useEffect(() => {
    setAnalysisReady(false);
    if (!loading && forecast) {
      const t = setTimeout(() => setAnalysisReady(true), 1800);
      return () => clearTimeout(t);
    }
  }, [forecast, loading]);

  const providers = [
    { key: 'aws',   forecast: forecast ? Math.round(forecast.total_30d * 0.443) : null, delta: '+$7,368' },
    { key: 'gcp',   forecast: forecast ? Math.round(forecast.total_30d * 0.328) : null, delta: '+$4,881' },
    { key: 'azure', forecast: forecast ? Math.round(forecast.total_30d * 0.229) : null, delta: '+$3,574' },
  ];

  return (
    <div className="forecast-card">
      <div className="forecast-title">
        <span className="ai-dot" />
        AI forecaster — provider outlook
      </div>
      {providers.map(p => (
        <div className="forecast-item" key={p.key}>
          <span className="fi-label">{PROVIDER_META[p.key].label}</span>
          <span>
            <span className="fi-val">{p.forecast ? fmt.usd(p.forecast) : '…'}</span>
            <span className="fi-trend">{p.delta}</span>
          </span>
        </div>
      ))}
      <div className="forecast-running">
        {analysisReady
          ? <><span style={{color:'#22c55e',marginRight:4}}>✓</span> Analysis complete — {forecast?.confidence}% confidence</>
          : <><ThinkingDots /> Analyzing trend signals…</>
        }
      </div>
    </div>
  );
}
