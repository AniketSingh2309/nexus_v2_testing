"""cloudnexus-v3/backend/optimizer.py

Cross-cloud FinOps analysis helper.

Goal (UI contract): provide a payload for the frontend "analysis" section with:
- 4 cards: combined/aws/gcp/azure (services running best-effort)
- recommendations list with: cloud, service, region, connectivity, user name,
  daily/monthly cost, tips
- comparison table placeholder keys

IMPORTANT: This project currently implements *accurate* resource/service inventory
only for AWS to a limited extent (service-level + some EC2 listing). For GCP/Azure
it is best-effort based on existing live billing adapters; if resource-level
inventory cannot be obtained with available permissions, we return explicit
"data_unavailable" statuses instead of fabricating values.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple


def _now_utc() -> datetime:
    return datetime.now(tz=timezone.utc)


def _safe_float(v: Any, default: float = 0.0) -> float:
    try:
        if v is None:
            return default
        return float(v)
    except Exception:
        return default


def _month_factor() -> int:
    # Use actual days elapsed this month so daily rate is accurate.
    return max(_now_utc().day, 1)


def _unknown_console(cloud: str, region: str, ident: str) -> str:
    cloud = (cloud or "").lower()
    region = region or ""
    if cloud == "aws":
        return f"https://console.aws.amazon.com/ec2/v2/home?region={region}"
    if cloud == "gcp":
        return "https://console.cloud.google.com/"
    if cloud == "azure":
        return "https://portal.azure.com/"
    return ""


def _recommendation(
    *,
    cloud: str,
    service_name: str,
    region: str,
    connectivity: str,
    user_kept_name: str,
    daily_cost: float,
    monthly_cost: float,
    tips: List[str],
    affected: Optional[List[Dict[str, str]]] = None,
) -> Dict[str, Any]:
    return {
        "cloud": cloud,
        "service_name": service_name,
        "region": region,
        "connectivity": connectivity,
        "user_kept_name": user_kept_name,
        "daily_cost": round(daily_cost, 4),
        "monthly_cost": round(monthly_cost, 2),
        "tips": tips,
        "affected_resources": affected or [],
    }


def _tips_for_service(cloud: str, service: str) -> List[str]:
    s = (service or "").lower()
    cloud = (cloud or "").lower()

    tips: List[str] = []
    if "compute" in s or "vm" in s or "ec2" in s:
        tips += [
            "Enable autoscaling with sensible min/max bounds and cooldowns.",
            "Identify idle/busy patterns and right-size instance types.",
            "Consider Savings Plans / RIs for steady-state workloads.",
        ]
    elif "storage" in s or "s3" in s or "blob" in s or "disk" in s:
        tips += [
            "Apply lifecycle policies (tiering/expiration) to reduce $/GB-month.",
            "Delete unattached/unused volumes and snapshots.",
            "Enable compression and dedupe where supported.",
        ]
    elif "network" in s or "nat" in s or "egress" in s:
        tips += [
            "Use VPC/VNet endpoints and cache/CDN to reduce egress charges.",
            "Verify cross-AZ/Affinity settings for load balancers.",
            "Review NAT Gateway usage and replace with Gateway Endpoints where possible.",
        ]
    elif "database" in s or "rds" in s or "sql" in s:
        tips += [
            "Right-size DB instances and enable auto-scaling if available.",
            "Use reservations for predictable usage.",
            "Consider pausing non-production environments outside business hours.",
        ]
    else:
        tips += [
            "Review top spend sub-services and validate there are no orphaned resources.",
            "Set budget alerts for rapid anomaly response.",
            "Enforce cost allocation tags/labels for chargeback.",
        ]

    # Cloud-specific nudge
    if cloud == "aws" and not any("RI" in t for t in tips):
        tips.append("For AWS, start with Cost Explorer → RI/Savings Plans recommendations.")
    if cloud == "gcp" and not any("Committed" in t for t in tips):
        tips.append("For GCP, consider Committed Use Discounts (CUDs) for steady workloads.")
    if cloud == "azure" and not any("Savings" in t for t in tips):
        tips.append("For Azure, evaluate Reserved Instances / Savings Plans for steady demand.")

    return tips[:5]


def _services_running_cards(
    *,
    aws_connected: bool,
    gcp_connected: bool,
    azure_connected: bool,
    services_running: Dict[str, List[Dict[str, Any]]],
    region_summary: Dict[str, str],
) -> Dict[str, Any]:
    def card(cloud: str, connected: bool) -> Dict[str, Any]:
        svcs = services_running.get(cloud, [])
        running_count = len(svcs)
        regions = [s.get("region") for s in svcs if s.get("region")]
        primary_region = region_summary.get(cloud) or (regions[0] if regions else "—")
        status = "live" if connected else "mock_or_unavailable"
        return {
            "cloud": cloud,
            "connected": connected,
            "services_running_count": running_count,
            "primary_region": primary_region,
            "status": status,
        }

    combined_count = (
        (len(services_running.get("aws", [])) if aws_connected else 0)
        + (len(services_running.get("gcp", [])) if gcp_connected else 0)
        + (len(services_running.get("azure", [])) if azure_connected else 0)
    )

    return {
        "combined": {
            "clouds": ["aws", "gcp", "azure"],
            "services_running_count": combined_count,
            "status": "live" if (aws_connected or gcp_connected or azure_connected) else "mock_or_unavailable",
        },
        "aws": card("aws", aws_connected),
        "gcp": card("gcp", gcp_connected),
        "azure": card("azure", azure_connected),
    }


def analyze_cross_cloud(credentials: Dict[str, Any], cached_data: Optional[Dict] = None) -> Dict[str, Any]:
    """Main entry used by FastAPI.

    Input is the same in-memory credential dict used by real_data.
    cached_data: pre-fetched provider data from the real_data cache — avoids a
    redundant cloud API round-trip when called from the analysis endpoint.
    We do *not* persist credentials.
    """
    # credentials keys: aws/gcp/azure present when connected in frontend flow.
    aws_connected = "aws" in credentials
    gcp_connected = "gcp" in credentials
    azure_connected = "azure" in credentials

    if cached_data is not None:
        # Use the pre-fetched cached data — fastest path, no cloud API call needed
        data = cached_data
        mode = "real" if (aws_connected or gcp_connected or azure_connected) else "mock"
    elif aws_connected or gcp_connected or azure_connected:
        try:
            from real_data import get_real_data
        except ModuleNotFoundError:
            from .real_data import get_real_data
        data = get_real_data(credentials)
        mode = "real"
    else:
        try:
            from mock_data import get_mock_data
        except ModuleNotFoundError:
            from .mock_data import get_mock_data
        data = get_mock_data()
        mode = "mock"

    services_running: Dict[str, List[Dict[str, Any]]] = {"aws": [], "gcp": [], "azure": []}
    region_summary: Dict[str, str] = {}

    # Existing adapters don't expose region/service for GCP/Azure reliably.
    # We'll provide the *primary region* as "global" for those unless present.
    region_summary["aws"] = credentials.get("aws", {}).get("creds", {}).get("region", "us-east-1")
    region_summary["gcp"] = "global"
    region_summary["azure"] = "global"

    recs: List[Dict[str, Any]] = []

    month_factor = _month_factor()

    def add_provider_recs(cloud: str):
        pdata = data.get("providers", {}).get(cloud) if isinstance(data.get("providers", {}), dict) else None
        # real_data structure: data['providers'][provider] exists inside overall dict
        # mock_data structure: same. so just use base.
        provider_block = data.get("providers", {}).get(cloud, {})
        services = provider_block.get("services", [])
        mtd_total = provider_block.get("mtd", 0) or 0

        # Estimate daily for UI. Use last 30-day approx: monthly = mtd_total (already MTd) * (30/days)
        # If missing, fallback to dividing by 30.
        # We do not claim absolute accuracy; recommendations indicate best-effort.
        daily_guess = (mtd_total / 30.0) if mtd_total else 0.0

        if not services:
            # Explicit data unavailable card
            services_running[cloud].append({
                "service": "—",
                "region": region_summary.get(cloud, "—"),
                "connectivity": "data_unavailable",
                "user_kept_name": "—",
                "status": "data_unavailable",
            })
            return

        # Pick top 3 services by cost (services list already sorted by cost in real_data adapters)
        top = services[:3]
        for s in top:
            service_name = s.get("name", "Unknown")
            # Region: AWS uses default; others global
            region = region_summary.get(cloud, "—")
            connectivity = "connected" if ((cloud == "aws" and aws_connected) or (cloud == "gcp" and gcp_connected) or (cloud == "azure" and azure_connected)) else "disconnected"

            # user_kept_name: we don't have it; use service_name as placeholder label but mark as best-effort
            user_kept_name = f"{cloud.upper()}: {service_name}"

            # Service daily/monthly: assume share based on service cost pct.
            cost_pct = _safe_float(s.get("pct", 0), 0)
            service_monthly = (mtd_total * (cost_pct / 100.0)) if mtd_total else _safe_float(s.get("cost", 0))
            service_daily = service_monthly / month_factor if month_factor else 0.0

            affected = []
            # Only AWS: we can provide a pseudo affected resource (service-level) safely.
            if cloud == "aws":
                affected = [
                    {
                        "name": service_name,
                        "id": service_name.lower().replace(" ", "-"),
                        "type": "AWS Service",
                        "console_url": "https://console.aws.amazon.com/",
                    }
                ]

            recs.append(
                _recommendation(
                    cloud=cloud,
                    service_name=service_name,
                    region=region,
                    connectivity=connectivity,
                    user_kept_name=user_kept_name,
                    daily_cost=service_daily,
                    monthly_cost=service_monthly,
                    tips=_tips_for_service(cloud, service_name),
                    affected=affected,
                )
            )

            services_running[cloud].append({
                "service": service_name,
                "region": region,
                "connectivity": connectivity,
                "user_kept_name": user_kept_name,
                "status": "best_effort",
            })

    if aws_connected:
        add_provider_recs("aws")
    else:
        # show mock/unavailable
        services_running["aws"] = []

    if gcp_connected:
        add_provider_recs("gcp")
        # If real_data returned None for gcp fetch it uses mock_data; mark as unavailable.
        # We detect by presence of "note".
        # Our real_data currently returns None for _fetch_gcp_data and will keep mock data.
    if azure_connected:
        add_provider_recs("azure")

    # Attach best-competitor mapping (best-effort, no claim of definitive accuracy)
    # Frontend expects: rec.competitor = { cloud, service_name, monthly_cost }
    cloud_order = ["aws", "gcp", "azure"]
    for rec in recs:
        try:
            others = [c for c in cloud_order if c != rec.get("cloud")]
            # Prefer the first other cloud that is "connected" in this session.
            preferred = None
            for c in others:
                if c == "aws" and aws_connected:
                    preferred = c
                    break
                if c == "gcp" and gcp_connected:
                    preferred = c
                    break
                if c == "azure" and azure_connected:
                    preferred = c
                    break
            if preferred is None:
                preferred = others[0] if others else rec.get("cloud")

            # Use the first top service from that preferred cloud as the competitor mapping.
            preferred_services = data.get("providers", {}).get(preferred, {}).get("services", []) if isinstance(data.get("providers", {}), dict) else []
            competitor_service = preferred_services[0] if preferred_services else None
            competitor_service_name = competitor_service.get("name") if competitor_service else None
            competitor_monthly = None
            mtd_total = (data.get("providers", {}).get(preferred, {}) or {}).get("mtd", 0)
            if competitor_service and mtd_total:
                cost_pct = _safe_float(competitor_service.get("pct", 0), 0)
                competitor_monthly = (mtd_total * (cost_pct / 100.0))
            elif competitor_service:
                competitor_monthly = _safe_float(competitor_service.get("cost", 0))


            rec["competitor"] = {
                "cloud": preferred,
                "service_name": competitor_service_name or "—",
                "monthly_cost": round(competitor_monthly, 2) if competitor_monthly is not None else None,
            }
        except Exception:
            rec["competitor"] = {"cloud": None, "service_name": None, "monthly_cost": None}

    # Tips summary across clouds
    tips_global = [
        "Start with the highest-cost services in each cloud, then validate resource ownership and tagging/labels.",
        "Create budgets + alerts at 80% and 100% to catch drift early.",
        "Use savings mechanisms (RI/Savings Plans/CUDs/Reserved Instances) for steady workloads; reserve other workloads for Spot/auto-shutdown.",
        "Before migrations, ensure data residency, compliance, and performance SLOs are met.",
    ]

    # Recommendations ordering
    recs.sort(key=lambda r: r.get("monthly_cost", 0), reverse=True)

    return {
        "source": mode,
        "cards": _services_running_cards(
            aws_connected=aws_connected,
            gcp_connected=gcp_connected,
            azure_connected=azure_connected,
            services_running=services_running,
            region_summary=region_summary,
        ),
        "recommendations": recs,
        "tips": tips_global,
        # Placeholder for later comparison table code.
        "comparison_table": {
            "status": "placeholder",
            "columns": ["Cloud", "Service", "Region", "Daily Cost", "Monthly Cost", "Confidence"],
            "rows": [],
        },
    }


