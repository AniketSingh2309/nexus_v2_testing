import random, math, statistics
from datetime import datetime, timedelta

# Seeded so mock data is consistent within a session but regenerates on restart
_seed = int(datetime.utcnow().strftime('%Y%m%d'))
rng = random.Random(_seed)

def _compute_alerts(trend: list, aws_mtd: float, gcp_mtd: float, azure_mtd: float) -> list:
    """Compute alerts from actual trend data using z-score spike detection."""
    alerts = []
    alert_id = 1

    def _spike(costs, label, provider, time_label="recent"):
        nonlocal alert_id
        if len(costs) < 10:
            return
        recent_vals   = costs[-3:]
        baseline_vals = costs[-14:-3] if len(costs) >= 14 else costs[:-3]
        recent_avg  = sum(recent_vals) / len(recent_vals)
        baseline_mu = sum(baseline_vals) / len(baseline_vals)
        try:
            std = statistics.stdev(baseline_vals)
        except Exception:
            std = 1.0
        z   = (recent_avg - baseline_mu) / max(std, 1.0)
        pct = round((recent_avg - baseline_mu) / max(baseline_mu, 1) * 100, 1)
        if z > 1.6:
            sev = "danger" if z > 2.4 else "warning"
            alerts.append({
                "id": alert_id, "type": sev, "provider": provider,
                "title": f"{label} cost spike detected",
                "detail": (
                    f"{pct:+.0f}% above 2-week baseline (z={z:.1f}σ). "
                    f"3-day avg ${recent_avg:,.0f}/day vs baseline ${baseline_mu:,.0f}/day. "
                    f"Review autoscaling and reserved instance coverage."
                ),
                "time": time_label, "resolved": False,
            })
            alert_id += 1

    def _underutil(provider, label, mtd, cpu, count, time_label):
        nonlocal alert_id
        if cpu > 0 and cpu < 12 and mtd > 0:
            saving = round(mtd * 0.28)
            alerts.append({
                "id": alert_id, "type": "warning", "provider": provider,
                "title": f"{label} resource underutilization",
                "detail": (
                    f"{count} instance(s) averaging {cpu}% CPU. "
                    f"Right-sizing could save ~${saving:,}/mo."
                ),
                "time": time_label, "resolved": False,
            })
            alert_id += 1

    def _budget(provider, label, mtd, budget_share, time_label):
        nonlocal alert_id
        if mtd > 0:
            budget_est = round(mtd * budget_share)
            pct_used   = round(100 / (budget_share + 0.001) * (1 / (budget_share + 0.001)))
            alerts.append({
                "id": alert_id, "type": "info", "provider": provider,
                "title": f"{label} approaching monthly budget",
                "detail": (
                    f"Projected to reach ${budget_est:,} this month based on current pace. "
                    f"Optimize high-cost services to stay within budget."
                ),
                "time": time_label, "resolved": False,
            })
            alert_id += 1

    aws_daily   = [d["aws"]   for d in trend]
    gcp_daily   = [d["gcp"]   for d in trend]
    azure_daily = [d["azure"] for d in trend]

    _spike(aws_daily,   "AWS",   "aws",   "12m ago")
    _spike(gcp_daily,   "GCP",   "gcp",   "1h ago")
    _spike(azure_daily, "Azure", "azure", "3h ago")

    # Underutilization (Azure mock has low CPU by design)
    _underutil("azure", "Azure", azure_mtd, 5, 7, "2h ago")

    # Budget pace alerts
    _budget("gcp", "GCP", gcp_mtd, 1.22, "4h ago")

    return alerts


def get_mock_data() -> dict:
    today = datetime.utcnow()
    trend = _gen_trend(90, today)
    # Compute MTD from trend (current month days so far)
    month_start_str = today.strftime('%b 01')[:3]
    mtd_days = [d for d in trend if d['date'][:3] == today.strftime('%b')]
    aws_mtd   = sum(d['aws']   for d in mtd_days) if mtd_days else 18432
    gcp_mtd   = sum(d['gcp']   for d in mtd_days) if mtd_days else 14219
    azure_mtd = sum(d['azure'] for d in mtd_days) if mtd_days else 9730
    total_mtd = aws_mtd + gcp_mtd + azure_mtd
    total_prev = total_mtd * 0.92  # simulate last month
    aws_share   = round(aws_mtd   / total_mtd * 100) if total_mtd else 43
    gcp_share   = round(gcp_mtd   / total_mtd * 100) if total_mtd else 34
    azure_share = round(azure_mtd / total_mtd * 100) if total_mtd else 23

    # Derive forecast_30d from actual trend history
    history = [d['total'] for d in trend]
    from forecaster import run_forecast
    try:
        fc_result = run_forecast(history)
        forecast_30d_total = fc_result.get('total_30d', total_mtd * 1.1)
    except Exception:
        forecast_30d_total = round(total_mtd * 1.1)

    return {
        "overview": {
            "total_mtd":       round(total_mtd),
            "active_services": 147,
            "forecast_30d":    round(forecast_30d_total),
            "savings_found":   round(total_mtd * 0.097),
            "providers": {
                "aws":   {"mtd": round(aws_mtd),   "delta_pct": 12.4, "share": aws_share,   "health": "healthy"},
                "gcp":   {"mtd": round(gcp_mtd),   "delta_pct": -3.1, "share": gcp_share,   "health": "healthy"},
                "azure": {"mtd": round(azure_mtd), "delta_pct":  5.7, "share": azure_share, "health": "warning"},
            }
        },
        "providers": {
            "aws": {
                "mtd": round(aws_mtd), "delta_pct": 12.4,
                "metrics": {"instances": 84, "storage_tb": 4.7, "storage_cost": round(aws_mtd*0.017), "lambda_invocations": 2400000},
                "services": _aws_services(aws_mtd),
                "daily": _gen_daily(14, aws_mtd / today.day, 0.08),
                "utilization": {"cpu_avg": 67, "rds_cpu": 42, "memory": 78, "network": 55},
            },
            "gcp": {
                "mtd": round(gcp_mtd), "delta_pct": -3.1,
                "metrics": {"instances": 61, "bigquery_tb": 18.2, "bigquery_cost": round(gcp_mtd*0.026), "gke_pods": 203},
                "services": _gcp_services(gcp_mtd),
                "daily": _gen_daily(14, gcp_mtd / today.day, -0.03),
                "utilization": {"cpu_avg": 58, "memory": 62, "disk": 71, "network": 44},
            },
            "azure": {
                "mtd": round(azure_mtd), "delta_pct": 5.7,
                "metrics": {"vms": 47, "storage_tb": 2.1, "storage_cost": round(azure_mtd*0.019), "aks_nodes": 22},
                "services": _azure_services(azure_mtd),
                "daily": _gen_daily(14, azure_mtd / today.day, 0.06),
                "utilization": {"cpu_avg": 34, "memory": 51, "disk": 67, "network": 38},
            },
        },
        "trend": trend,
        "alerts": _compute_alerts(trend, aws_mtd, gcp_mtd, azure_mtd)
    }

def _aws_services(mtd):
    return [
        {"name": "EC2",        "cost": round(mtd*0.403), "pct": 40, "status": "healthy", "icon": "server"},
        {"name": "RDS",        "cost": round(mtd*0.207), "pct": 21, "status": "healthy", "icon": "database"},
        {"name": "S3",         "cost": round(mtd*0.159), "pct": 16, "status": "healthy", "icon": "bucket"},
        {"name": "Lambda",     "cost": round(mtd*0.102), "pct": 10, "status": "healthy", "icon": "function"},
        {"name": "CloudFront", "cost": round(mtd*0.067), "pct":  7, "status": "warning", "icon": "cdn"},
        {"name": "EKS",        "cost": round(mtd*0.041), "pct":  4, "status": "healthy", "icon": "kubernetes"},
    ]

def _gcp_services(mtd):
    return [
        {"name": "Compute Engine", "cost": round(mtd*0.409), "pct": 41, "status": "healthy", "icon": "server"},
        {"name": "BigQuery",       "cost": round(mtd*0.256), "pct": 26, "status": "healthy", "icon": "analytics"},
        {"name": "GKE",            "cost": round(mtd*0.175), "pct": 18, "status": "healthy", "icon": "kubernetes"},
        {"name": "Cloud SQL",      "cost": round(mtd*0.092), "pct":  9, "status": "healthy", "icon": "database"},
        {"name": "Cloud Run",      "cost": round(mtd*0.044), "pct":  4, "status": "healthy", "icon": "run"},
    ]

def _azure_services(mtd):
    return [
        {"name": "Virtual Machines", "cost": round(mtd*0.405), "pct": 40, "status": "warning", "icon": "vm"},
        {"name": "Blob Storage",     "cost": round(mtd*0.194), "pct": 19, "status": "healthy", "icon": "blob"},
        {"name": "AKS",              "cost": round(mtd*0.168), "pct": 17, "status": "healthy", "icon": "kubernetes"},
        {"name": "Azure SQL",        "cost": round(mtd*0.124), "pct": 12, "status": "healthy", "icon": "database"},
        {"name": "App Service",      "cost": round(mtd*0.076), "pct":  8, "status": "healthy", "icon": "app"},
    ]

def _gen_daily(days: int, base: float, drift: float) -> list:
    out = []
    val = max(base, 100)
    for i in range(days):
        val = val * (1 + drift / days) + rng.uniform(-80, 80)
        out.append({"day": i + 1, "cost": round(max(0, val))})
    return out

def _gen_trend(days: int, today: datetime) -> list:
    aws_base, gcp_base, azure_base = 620, 490, 340
    out = []
    for i in range(days):
        d = today - timedelta(days=days - i - 1)
        a = aws_base   + i * 3.1 + math.sin(i / 7)  * 180 + rng.uniform(-80, 80)
        g = gcp_base   + i * 1.5 + math.sin(i / 9)  * 140 + rng.uniform(-60, 60)
        z = azure_base + i * 2.2 + math.sin(i / 6)  * 100 + rng.uniform(-50, 50)
        out.append({
            "date":  d.strftime("%b %d"),
            "aws":   round(max(0, a)),
            "gcp":   round(max(0, g)),
            "azure": round(max(0, z)),
            "total": round(max(0, a + g + z)),
        })
    return out
