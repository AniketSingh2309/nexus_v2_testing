# CloudNexus v3 — AI-Powered Cloud Cost Intelligence

## What's New in This Build

### Forecast Engine — Upgraded to Production-Grade Ensemble

| Model | Implementation | Purpose |
|-------|---------------|---------|
| **Holt-Winters** | Triple exponential smoothing + STL seasonal decomposition | Trend + seasonality |
| **LSTM Patterns** | Pure-Python sliding window pattern memory | Long-range pattern matching |
| **XGBoost Features** | Lag, rolling stats, momentum, spike z-score | Feature-engineered signals |
| **Claude AI** | Anthropic API (claude-sonnet-4) | Narrative, drivers, anomaly intelligence |

### Real Data in Real Mode — No Hardcoded Values

- All charts, bars, metrics, and KPIs derive **only** from live API responses
- `provider_history` arrays in the forecast response carry per-provider daily actuals
- `provider_shares` are computed from trailing 30-day actuals, not fixed constants
- Mock data itself is dynamic (MTD computed from generated trend, not static numbers)
- Invoice amounts in mock mode computed from trend data, not literals

### Anomaly Detection
- Z-score detection over 7-day rolling window vs 30-day baseline
- Spikes and drops flagged with `{day, value, z_score, type}`
- Alert copy in real mode derived from live MTD figures

---

## Quick Start

```bash
# Backend
cd backend
pip install -r requirements.txt
# Set your Anthropic API key for Claude AI narrative (optional but recommended):
export ANTHROPIC_API_KEY=sk-ant-...
uvicorn main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm start
```

Then open http://localhost:3000

---

## Real Cloud Connections

### AWS
Uncomment `boto3` in requirements.txt, then connect with:
- IAM Access Key + Secret (needs `ce:GetCostAndUsage`, `ec2:DescribeInstances`, `sts:GetCallerIdentity`)
- Or use instance profile / SSO (auth_type: `profile`)

### GCP
Uncomment `google-cloud-*` deps. Requires:
- Service account JSON with `billing.accounts.list` + `resourcemanager.projects.get`
- For full cost breakdown: enable BigQuery billing export

### Azure
Uncomment `azure-*` deps. Requires:
- Service principal with `Cost Management Reader` role on subscription

---

## Architecture

```
Frontend (React)
  └─ useCloudData hook
       └─ FastAPI backend
            ├─ /api/forecast  → run_forecast(history)
            │     ├─ Holt-Winters (seasonal decomposition)
            │     ├─ LSTM pattern memory
            │     ├─ XGBoost feature engineering
            │     └─ Claude AI (ANTHROPIC_API_KEY)
            ├─ /api/trend     → real daily costs (AWS CE) or mock
            ├─ /api/provider  → live service breakdown
            └─ /api/overview  → rebuilt from live MTD figures
```

---

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `ANTHROPIC_API_KEY` | Claude AI narrative + driver analysis (optional; fallback narrative used if absent) |
| `REACT_APP_API_URL` | Backend URL (default: http://localhost:8000) |
