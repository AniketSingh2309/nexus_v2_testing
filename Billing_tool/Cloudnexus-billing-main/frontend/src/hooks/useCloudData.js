import { useState, useEffect, useCallback } from 'react';
import { fetchOverview, fetchProvider, fetchTrend, fetchForecast, fetchAlerts } from '../services/api';

export function useCloudData(mode) {
  const [overview,  setOverview]  = useState(null);
  const [providers, setProviders] = useState({});
  const [trend,     setTrend]     = useState([]);
  const [forecast,  setForecast]  = useState(null);
  const [alerts,    setAlerts]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ov, aws, gcp, azure, tr, fc, al] = await Promise.all([
        fetchOverview(mode),
        fetchProvider('aws', mode),
        fetchProvider('gcp', mode),
        fetchProvider('azure', mode),
        fetchTrend(mode, 90),
        fetchForecast(mode).catch(() => null),   // 422 when no cost data yet — don't fail all
        fetchAlerts(mode).catch(() => []),
      ]);
	console.log("MODE =", mode);
	console.log("OVERVIEW =", ov);
	console.log("AWS =", aws);
	console.log("GCP =", gcp);
	console.log("AZURE =", azure);
	console.log("OVERVIEW JSON =", JSON.stringify(ov));
	console.log("AWS MTD =", aws?.mtd);
	console.log("GCP MTD =", gcp?.mtd);
	console.log("AZURE MTD =", azure?.mtd);
      setOverview(ov);
      setProviders({ aws, gcp, azure });
      setTrend(tr);
      setForecast(fc);
      setAlerts(al);
      setLastRefresh(new Date());
    } catch (e) {
      setError(e.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [mode]);

  useEffect(() => { load(); }, [load]);

  return { overview, providers, trend, forecast, alerts, loading, error, refresh: load, lastRefresh };
}
