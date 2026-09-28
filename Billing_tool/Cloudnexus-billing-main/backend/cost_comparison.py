"""
cost_comparison.py — Multi-Cloud Cost Comparison module for CloudNexus
=======================================================================
Ported and adapted from main.py (Cost Analyst v2).

Exposes:
  build_comparison_payload(credentials, mock_data_fn, real_data_fn) -> dict

The payload is consumed by the /api/cost-comparison endpoint and the new
CostComparisonPanel frontend component embedded in the Analysis tab.
"""
from __future__ import annotations

import datetime
import math
from typing import Any, Dict, List, Optional


# ─────────────── helpers ───────────────

def _safe_float(v: Any, default: float = 0.0) -> float:
    try:
        return float(v) if v is not None else default
    except Exception:
        return default


def _build_monthly_history(provider: str, months: int = 6, current_mtd: float = 0) -> list:
    """
    Generate per-provider monthly history.
    When current_mtd > 0, derives full-month from current spend and projects
    previous months backwards with a small trend; otherwise uses safe placeholder values.
    """
    today = datetime.date.today()
    days_elapsed = max(today.day, 1)
    # Project current MTD to a full-month estimate
    if current_mtd > 0:
        full_month_est = current_mtd * (30 / days_elapsed)
    else:
        full_month_est = {"aws": 4200, "gcp": 2000, "azure": 1200}.get(provider, 800)
    hist = []
    for i in range(months):
        d = today - datetime.timedelta(days=(months - 1 - i) * 30)
        label = d.strftime("%b %Y")
        seed = d.toordinal() + (0 if provider == "aws" else 111 if provider == "gcp" else 222)
        noise = (math.sin(seed * 1.3) + 1) / 2
        # Most recent month → full_month_est; earlier months slightly lower
        age_factor = 1 - ((months - 1 - i) / max(months - 1, 1)) * 0.12
        cost = int(full_month_est * age_factor + noise * full_month_est * 0.06)
        hist.append({"label": label, "month": label, "cost": cost})
    return hist


def _build_radar(providers_info: dict) -> list:
    """Build radar chart data from provider info."""
    def score(p):
        mtd = _safe_float(providers_info.get(p, {}).get("mtd", 0))
        delta = _safe_float(providers_info.get(p, {}).get("delta_pct", 0))
        svcs = len(providers_info.get(p, {}).get("services", []))
        # Efficiency: lower delta % = more stable
        eff = max(30, min(90, 70 - delta))
        # Savings: inverse of delta (if shrinking costs = high savings focus)
        sav = max(30, min(90, 65 + (-delta * 1.5)))
        # Cost per service: lower = better (rough proxy)
        cps = max(30, min(90, 75 - (mtd / max(svcs, 1) / 500)))
        # MoM stability: low absolute delta = stable
        stab = max(30, min(90, 80 - abs(delta) * 2))
        # Optimization readiness: rough heuristic
        opt = max(40, min(85, 62 + (svcs * 0.5)))
        return {
            "efficiency": round(eff),
            "savings": round(sav),
            "cost_per_service": round(cps),
            "stability": round(stab),
            "optimization": round(opt),
        }

    scores = {p: score(p) for p in ("aws", "gcp", "azure")}

    return [
        {"metric": "Efficiency",          "aws": scores["aws"]["efficiency"],        "gcp": scores["gcp"]["efficiency"],        "azure": scores["azure"]["efficiency"]},
        {"metric": "Savings Focus",        "aws": scores["aws"]["savings"],           "gcp": scores["gcp"]["savings"],           "azure": scores["azure"]["savings"]},
        {"metric": "Cost/Service",         "aws": scores["aws"]["cost_per_service"],  "gcp": scores["gcp"]["cost_per_service"],  "azure": scores["azure"]["cost_per_service"]},
        {"metric": "MoM Stability",        "aws": scores["aws"]["stability"],         "gcp": scores["gcp"]["stability"],         "azure": scores["azure"]["stability"]},
        {"metric": "Optimization Ready",   "aws": scores["aws"]["optimization"],      "gcp": scores["gcp"]["optimization"],      "azure": scores["azure"]["optimization"]},
    ]


def _build_savings_recommendations(providers_info: dict) -> list:
    """Build savings recommendations similar to Cost Analyst."""
    recs = []
    for p, info in providers_info.items():
        mtd = _safe_float(info.get("mtd", 0))
        services = info.get("services", [])
        delta = _safe_float(info.get("delta_pct", 0))

        if not mtd:
            continue

        # High delta = EC2/compute spike
        if delta > 8 and p == "aws":
            recs.append({
                "id": len(recs) + 1,
                "priority": "critical",
                "title": "EC2 Reserved Instance Coverage",
                "desc": f"On-demand coverage high. Upgrading to 80%+ 1-year RIs could save ~30-40%.",
                "savings": round(mtd * 0.082),
                "effort": "Easy",
                "provider": p,
                "status": "pending",
            })

        # Idle resources heuristic for azure
        if p == "azure" and delta > 4:
            recs.append({
                "id": len(recs) + 1,
                "priority": "high",
                "title": "Azure Idle VMs detected",
                "desc": "VMs showing <5% CPU pattern. Schedule auto-stop outside business hours.",
                "savings": round(mtd * 0.065),
                "effort": "Easy",
                "provider": p,
                "status": "pending",
            })

        # GCP BigQuery optimisation
        if p == "gcp":
            bq = next((s for s in services if "bigquery" in s.get("name", "").lower() or "bigquery" in s.get("name", "").lower()), None)
            if bq:
                recs.append({
                    "id": len(recs) + 1,
                    "priority": "high",
                    "title": "GCP BigQuery Slot Optimization",
                    "desc": "Flat-rate slots often underutilised off-peak. Switch to on-demand billing.",
                    "savings": round(_safe_float(bq.get("cost", 0)) * 0.12),
                    "effort": "Medium",
                    "provider": p,
                    "status": "in_progress",
                })

        # Storage tiering for any provider
        storage_svc = next(
            (s for s in services if any(k in s.get("name", "").lower() for k in ("s3", "storage", "blob", "gcs"))),
            None,
        )
        if storage_svc:
            recs.append({
                "id": len(recs) + 1,
                "priority": "medium",
                "title": f"{p.upper()} Storage Intelligent-Tiering",
                "desc": "Move infrequently accessed data to cheaper storage tiers.",
                "savings": round(_safe_float(storage_svc.get("cost", 0)) * 0.22),
                "effort": "Easy",
                "provider": p,
                "status": "pending",
            })

    # Sort by savings desc
    recs.sort(key=lambda r: r["savings"], reverse=True)
    for i, r in enumerate(recs):
        r["id"] = i + 1
    return recs


def _build_budget_analysis(providers_info: dict, budgets: Optional[dict] = None) -> dict:
    DEFAULT_BUDGETS = {"aws": 25000, "gcp": 12000, "azure": 8000}
    limits = budgets or DEFAULT_BUDGETS
    result = {}
    for p in ("aws", "gcp", "azure"):
        mtd = _safe_float(providers_info.get(p, {}).get("mtd", 0))
        limit = _safe_float(limits.get(p, DEFAULT_BUDGETS[p]))
        pct = (mtd / limit * 100) if limit else 0
        remaining = limit - mtd
        status = "danger" if pct >= 100 else "warning" if pct >= 80 else "ok"
        result[p] = {
            "limit": round(limit),
            "spend": round(mtd),
            "remaining": round(remaining),
            "pct": round(pct, 1),
            "status": status,
        }
    return result


def build_comparison_payload(
    providers_info: dict,
    budgets: Optional[dict] = None,
    months: int = 6,
    real_monthly: Optional[list] = None,
) -> dict:
    """
    Build the full multi-cloud cost comparison payload.

    providers_info: dict keyed by "aws"/"gcp"/"azure", each with at minimum:
        { "mtd": float, "delta_pct": float, "share": float, "services": [...] }
    """
    # ── per-provider stats ──
    provider_stats: Dict[str, Any] = {}
    for p in ("aws", "gcp", "azure"):
        info = providers_info.get(p, {})
        mtd = _safe_float(info.get("mtd", 0))
        services = info.get("services", [])
        delta = _safe_float(info.get("delta_pct", 0))
        share = _safe_float(info.get("share", 0))
        svc_count = len(services)
        top_svc = services[0] if services else {}
        savings_potential = round(mtd * 0.12)  # rough 12% savings opportunity

        provider_stats[p] = {
            "mtd": round(mtd),
            "share_pct": round(share),
            "delta_pct": round(delta, 1),
            "efficiency_score": max(40, min(92, round(72 - delta + (3 if delta < 0 else 0)))),
            "savings_potential": savings_potential,
            "cost_per_service": round(mtd / max(svc_count, 1)),
            "top_service": top_svc.get("name", "—"),
            "top_service_cost": round(_safe_float(top_svc.get("cost", 0))),
            "services_count": svc_count,
            "savings_pct": round((savings_potential / mtd * 100) if mtd else 0, 1),
            "connected": info.get("connected", False),
            "real_data": info.get("real_data", False),
        }

    # ── summary ──
    total_mtd = sum(provider_stats[p]["mtd"] for p in ("aws", "gcp", "azure"))
    most_efficient = min(provider_stats, key=lambda p: provider_stats[p].get("cost_per_service", 99999))
    highest_savings = max(provider_stats, key=lambda p: provider_stats[p].get("savings_potential", 0))

    summary = {
        "total_mtd": total_mtd,
        "most_cost_efficient": most_efficient,
        "highest_savings_potential": highest_savings,
        "total_savings_potential": sum(provider_stats[p]["savings_potential"] for p in ("aws", "gcp", "azure")),
    }

    # ── monthly comparison ──
    # Use real trend-derived monthly data when available (real mode with connected providers)
    if real_monthly and len(real_monthly) >= 1:
        monthly_comparison = [
            {
                "label": m.get("label") or m.get("month", ""),
                "aws":   round(m.get("aws",   0)),
                "gcp":   round(m.get("gcp",   0)),
                "azure": round(m.get("azure", 0)),
                "total": round(m.get("total", m.get("aws", 0) + m.get("gcp", 0) + m.get("azure", 0))),
            }
            for m in real_monthly
        ]
    else:
        hist = {
            p: _build_monthly_history(p, months,
                                      current_mtd=_safe_float(providers_info.get(p, {}).get("mtd", 0)))
            for p in ("aws", "gcp", "azure")
        }
        monthly_comparison = []
        for i in range(months):
            monthly_comparison.append({
                "label": hist["aws"][i]["label"],
                "aws":   hist["aws"][i]["cost"],
                "gcp":   hist["gcp"][i]["cost"],
                "azure": hist["azure"][i]["cost"],
                "total": hist["aws"][i]["cost"] + hist["gcp"][i]["cost"] + hist["azure"][i]["cost"],
            })

    # ── budget analysis ──
    budget_analysis = _build_budget_analysis(providers_info, budgets)

    # ── savings recommendations ──
    savings_recs = _build_savings_recommendations(providers_info)

    # ── radar ──
    radar = _build_radar(providers_info)

    # ── service-level cross-cloud comparison table ──
    # Flatten all services from all providers for a unified comparison table
    cross_table_rows = []
    for p in ("aws", "gcp", "azure"):
        for svc in providers_info.get(p, {}).get("services", []):
            cross_table_rows.append({
                "provider": p.upper(),
                "service": svc.get("name", "—"),
                "cost": round(_safe_float(svc.get("cost", 0))),
                "pct_of_provider": _safe_float(svc.get("pct", 0)),
                "monthly": round(_safe_float(svc.get("cost", 0))),
                "daily": round(_safe_float(svc.get("cost", 0)) / 30, 2),
            })
    cross_table_rows.sort(key=lambda r: r["cost"], reverse=True)

    return {
        "providers": provider_stats,
        "summary": summary,
        "radar": radar,
        "monthly_comparison": monthly_comparison,
        "budget_analysis": budget_analysis,
        "savings_recommendations": savings_recs,
        "cross_service_table": cross_table_rows,
        "generated_at": datetime.date.today().isoformat(),
    }
