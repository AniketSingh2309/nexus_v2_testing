import React, { useState, useEffect } from 'react';

export default function AIInsights({ forecast }) {
  const [revealed, setRevealed] = useState(0);

  const insights = React.useMemo(() => {
    if (!forecast) return [];
    const list = [];

    if (forecast.key_drivers?.[0]) {
      const d = forecast.key_drivers[0];
      list.push(`Top cost driver: ${d.name} (${d.impact}) — ${d.severity} severity`);
    }
    if (forecast.narrative) {
      list.push(forecast.narrative);
    }
    if (forecast.anomaly_summary && forecast.anomaly_summary !== 'No significant anomalies detected') {
      list.push(forecast.anomaly_summary);
    }
    if (forecast.seasonal_insight) {
      list.push(forecast.seasonal_insight);
    }
    if (forecast.top_recommendation) {
      list.push(forecast.top_recommendation);
    }
    if (forecast.key_drivers?.[1]) {
      const d = forecast.key_drivers[1];
      list.push(`Secondary driver: ${d.name} (${d.impact})`);
    }
    if (forecast.confidence) {
      const confText = forecast.confidence >= 85
        ? `Forecast confidence is ${forecast.confidence}% — strong historical pattern detected.`
        : `Forecast confidence is ${forecast.confidence}% — high spend volatility detected.`;
      list.push(confText);
    }
    if (forecast.trend_pct !== undefined) {
      const dir = forecast.trend_pct > 0 ? 'increasing' : 'decreasing';
      list.push(`Monthly spend is ${dir} at ${Math.abs(forecast.trend_pct)}%/month based on 90-day baseline.`);
    }
    return list;
  }, [forecast]);

  useEffect(() => {
    setRevealed(0);
    if (!insights.length) return;
    const interval = setInterval(() => {
      setRevealed(v => {
        if (v >= insights.length) { clearInterval(interval); return v; }
        return v + 1;
      });
    }, 500);
    return () => clearInterval(interval);
  }, [insights]);

  if (!forecast) {
    return (
      <div className="muted-text" style={{ padding: '12px 0' }}>
        <span className="thinking-dots"><span /><span /><span /></span>
        {' '}Loading AI insights…
      </div>
    );
  }

  return (
    <div>
      {insights.slice(0, revealed).map((text, i) => (
        <div key={i} className="insight-row" style={{ animationDelay: `${i * 0.1}s` }}>
          <span>{text}</span>
        </div>
      ))}
      {revealed < insights.length && (
        <div className="insight-row muted">
          <span className="thinking-dots"><span /><span /><span /></span>
        </div>
      )}
    </div>
  );
}
