"""
AI provider usage/cost collectors for the AI Billing & Usage Monitoring module.

Mirrors the existing cloud-provider collector pattern in real_data.py: one
function per provider, each independently callable and independently
failable (a bad key or an unreachable API raises — the caller is responsible
for catching it per-credential so one provider's failure never blocks the
others, exactly like _fetch_aws_data/_fetch_azure_data/_fetch_gcp_data do).

Every function returns a list of normalized usage-event dicts:
  {
    "model":         str | None,
    "teamOrUser":    str | None,
    "tokensIn":      int | None,
    "tokensOut":     int | None,
    "unitsConsumed": float | None,
    "costUsd":       float,
    "periodStart":   ISO-8601 str,
    "periodEnd":     ISO-8601 str,
  }
Callers attach `provider`/`orgAdmin`/`credentialId` before persisting — these
functions know nothing about the shared DB (Node is the sole writer; see the
comment above checkAiBudget() in server.js).
"""
import base64
from datetime import datetime, timedelta, timezone

import httpx

_DEFAULT_LOOKBACK = timedelta(days=2)  # re-pull a couple of days so late-arriving cost data isn't missed


def _iso(dt: datetime) -> str:
    return dt.replace(tzinfo=timezone.utc).isoformat() if dt.tzinfo is None else dt.isoformat()


def _since_or_default(since: datetime | None) -> datetime:
    if since:
        return since - _DEFAULT_LOOKBACK
    return datetime.utcnow() - timedelta(days=7)  # first-ever poll: pull the last week


# ── OpenAI — Usage & Costs API (Admin API key) ──────────────────────────────

def fetch_openai_usage(creds: dict, since: datetime | None = None) -> list[dict]:
    api_key = creds.get("admin_api_key") or creds.get("adminApiKey") or creds.get("api_key") or creds.get("apiKey")
    if not api_key:
        raise ValueError("OpenAI credential is missing admin_api_key")

    start = _since_or_default(since)
    start_unix = int(start.timestamp())
    headers = {"Authorization": f"Bearer {api_key}"}
    events: list[dict] = []

    with httpx.Client(timeout=20.0) as client:
        # Costs API — grouped by line_item (OpenAI's product-level cost breakdown,
        # the closest thing to a per-model cost split this endpoint exposes).
        page = None
        while True:
            params = {"start_time": start_unix, "bucket_width": "1d", "group_by": "line_item", "limit": 180}
            if page:
                params["page"] = page
            resp = client.get("https://api.openai.com/v1/organization/costs", params=params, headers=headers)
            if resp.status_code in (401, 403):
                hint = (" — this looks like a regular project API key (sk-proj-...); "
                        "the Costs/Usage API needs an Organization Admin key instead"
                        if api_key.startswith("sk-proj-") else
                        " — verify the key is an Organization Admin key (Organization > Admin keys) with the api.usage.read scope")
                raise ValueError(f"OpenAI auth failed (HTTP {resp.status_code}){hint}")
            if resp.status_code == 429:
                raise ValueError("OpenAI rate limit hit while fetching costs — will retry on the next scheduled poll")
            resp.raise_for_status()
            data = resp.json()
            for bucket in data.get("data", []):
                p_start = datetime.fromtimestamp(bucket["start_time"], tz=timezone.utc)
                p_end = datetime.fromtimestamp(bucket["end_time"], tz=timezone.utc)
                for result in bucket.get("results", []):
                    amount = (result.get("amount") or {}).get("value", 0) or 0
                    if amount <= 0:
                        continue
                    events.append({
                        "model": result.get("line_item"),
                        "teamOrUser": result.get("project_id"),
                        "tokensIn": None, "tokensOut": None, "unitsConsumed": None,
                        "costUsd": float(amount),
                        "periodStart": _iso(p_start), "periodEnd": _iso(p_end),
                    })
            page = data.get("next_page")
            if not data.get("has_more") or not page:
                break

        # Usage API — token counts per model, merged in as separate rows
        # (cost and token volume are reported by two different endpoints).
        try:
            page = None
            while True:
                # The Usage API (unlike Costs) caps limit at 31 for bucket_width=1d.
                params = {"start_time": start_unix, "bucket_width": "1d", "group_by": "model", "limit": 31}
                if page:
                    params["page"] = page
                resp = client.get("https://api.openai.com/v1/organization/usage/completions", params=params, headers=headers)
                if resp.status_code == 404:
                    break  # org has no completions usage in range — not an error
                resp.raise_for_status()
                data = resp.json()
                for bucket in data.get("data", []):
                    p_start = datetime.fromtimestamp(bucket["start_time"], tz=timezone.utc)
                    p_end = datetime.fromtimestamp(bucket["end_time"], tz=timezone.utc)
                    for result in bucket.get("results", []):
                        tin = result.get("input_tokens", 0) or 0
                        tout = result.get("output_tokens", 0) or 0
                        if tin == 0 and tout == 0:
                            continue
                        events.append({
                            "model": result.get("model"),
                            "teamOrUser": result.get("project_id"),
                            "tokensIn": int(tin), "tokensOut": int(tout), "unitsConsumed": None,
                            "costUsd": 0,  # cost already counted via the Costs API rows above
                            "periodStart": _iso(p_start), "periodEnd": _iso(p_end),
                        })
                page = data.get("next_page")
                if not data.get("has_more") or not page:
                    break
        except httpx.HTTPStatusError as e:
            print(f"[ai-billing] OpenAI token-usage breakdown call failed (non-fatal, cost rows still recorded): {e}")

    return events


# ── Anthropic — Admin Usage & Cost API (Admin API key) ──────────────────────

def fetch_anthropic_usage(creds: dict, since: datetime | None = None) -> list[dict]:
    api_key = creds.get("admin_api_key") or creds.get("adminApiKey") or creds.get("api_key") or creds.get("apiKey")
    if not api_key:
        raise ValueError("Anthropic credential is missing admin_api_key")

    start = _since_or_default(since)
    headers = {"x-api-key": api_key, "anthropic-version": "2023-06-01"}
    events: list[dict] = []

    with httpx.Client(timeout=20.0) as client:
        page = None
        while True:
            params = {"starting_at": _iso(start), "bucket_width": "1d", "group_by[]": "description", "limit": 31}
            if page:
                params["page"] = page
            resp = client.get("https://api.anthropic.com/v1/organizations/cost_report", params=params, headers=headers)
            if resp.status_code in (401, 403):
                hint = (" — this looks like a regular API key (sk-ant-api03-...); "
                        "the cost_report endpoint needs an Admin API key instead (sk-ant-admin...)"
                        if api_key.startswith("sk-ant-api") else
                        " — verify the key is an Admin API key (Console > Organization > Admin keys) with organization:cost_report:read")
                raise ValueError(f"Anthropic auth failed (HTTP {resp.status_code}){hint}")
            if resp.status_code == 429:
                raise ValueError("Anthropic rate limit hit while fetching costs — will retry on the next scheduled poll")
            resp.raise_for_status()
            data = resp.json()
            for bucket in data.get("data", []):
                p_start = bucket.get("starting_at") or _iso(start)
                p_end = bucket.get("ending_at") or p_start
                for result in bucket.get("results", []):
                    amount = (result.get("amount") or {}).get("value", 0) or 0
                    if float(amount or 0) <= 0:
                        continue
                    events.append({
                        "model": result.get("description"),
                        "teamOrUser": result.get("workspace_id"),
                        "tokensIn": None, "tokensOut": None, "unitsConsumed": None,
                        "costUsd": float(amount),
                        "periodStart": p_start, "periodEnd": p_end,
                    })
            page = data.get("next_page")
            if not data.get("has_more") or not page:
                break

        # Usage report — token counts per model.
        try:
            page = None
            while True:
                params = {"starting_at": _iso(start), "bucket_width": "1d", "group_by[]": "model", "limit": 31}
                if page:
                    params["page"] = page
                resp = client.get("https://api.anthropic.com/v1/organizations/usage_report/messages", params=params, headers=headers)
                resp.raise_for_status()
                data = resp.json()
                for bucket in data.get("data", []):
                    p_start = bucket.get("starting_at") or _iso(start)
                    p_end = bucket.get("ending_at") or p_start
                    for result in bucket.get("results", []):
                        tin = result.get("uncached_input_tokens", 0) or 0
                        tout = result.get("output_tokens", 0) or 0
                        if tin == 0 and tout == 0:
                            continue
                        events.append({
                            "model": result.get("model"),
                            "teamOrUser": result.get("workspace_id"),
                            "tokensIn": int(tin), "tokensOut": int(tout), "unitsConsumed": None,
                            "costUsd": 0,
                            "periodStart": p_start, "periodEnd": p_end,
                        })
                page = data.get("next_page")
                if not data.get("has_more") or not page:
                    break
        except httpx.HTTPStatusError as e:
            print(f"[ai-billing] Anthropic token-usage breakdown call failed (non-fatal, cost rows still recorded): {e}")

    return events


# ── AWS Bedrock — Cost Explorer, filtered to the Bedrock service ───────────

def fetch_bedrock_usage(creds: dict, since: datetime | None = None) -> list[dict]:
    import boto3

    access_key = creds.get("access_key_id") or creds.get("accessKeyId")
    secret_key = creds.get("secret_access_key") or creds.get("secretAccessKey")
    if not access_key or not secret_key:
        raise ValueError("AWS credential is missing access_key_id/secret_access_key")

    session = boto3.Session(
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        aws_session_token=creds.get("session_token") or creds.get("sessionToken") or None,
        region_name=creds.get("region", "us-east-1"),
    )
    ce = session.client("ce", region_name="us-east-1")

    start = _since_or_default(since)
    today = datetime.utcnow()
    try:
        resp = ce.get_cost_and_usage(
            TimePeriod={"Start": start.strftime("%Y-%m-%d"), "End": today.strftime("%Y-%m-%d")},
            Granularity="DAILY",
            Metrics=["UnblendedCost", "UsageQuantity"],
            Filter={"Dimensions": {"Key": "SERVICE", "Values": ["Amazon Bedrock"]}},
            GroupBy=[{"Type": "DIMENSION", "Key": "USAGE_TYPE"}],
        )
    except ce.exceptions.ClientError as e:
        code = e.response.get("Error", {}).get("Code", "")
        if code in ("AccessDeniedException", "UnauthorizedOperation", "AuthFailure"):
            raise ValueError(f"AWS auth failed for Cost Explorer: {e}") from e
        raise

    events: list[dict] = []
    for result in resp.get("ResultsByTime", []):
        p_start = result["TimePeriod"]["Start"] + "T00:00:00Z"
        p_end = result["TimePeriod"]["End"] + "T00:00:00Z"
        for group in result.get("Groups", []):
            cost = float(group["Metrics"]["UnblendedCost"]["Amount"])
            usage = float(group["Metrics"]["UsageQuantity"]["Amount"])
            if cost <= 0 and usage <= 0:
                continue
            usage_type = group["Keys"][0]  # e.g. "USE1-InputTokenCount-anthropic.claude-3-sonnet"
            events.append({
                "model": usage_type,
                "teamOrUser": None,
                "tokensIn": None, "tokensOut": None,
                "unitsConsumed": usage if usage > 0 else None,
                "costUsd": cost,
                "periodStart": p_start, "periodEnd": p_end,
            })
    return events


# ── Azure OpenAI — Cost Management, filtered to Cognitive Services accounts ─

def fetch_azure_openai_usage(creds: dict, since: datetime | None = None) -> list[dict]:
    from azure.identity import ClientSecretCredential
    from azure.mgmt.costmanagement import CostManagementClient
    from azure.mgmt.costmanagement.models import (
        QueryDefinition, QueryTimePeriod, QueryDataset,
        QueryAggregation, QueryGrouping, QueryFilter, QueryComparisonExpression,
    )

    tenant_id = creds.get("tenant_id") or creds.get("tenantId")
    client_id = creds.get("client_id") or creds.get("clientId")
    client_secret = creds.get("client_secret") or creds.get("clientSecret")
    sub_id = creds.get("subscription_id") or creds.get("subscriptionId")
    if not all([tenant_id, client_id, client_secret, sub_id]):
        raise ValueError("Azure credential is missing tenant_id/client_id/client_secret/subscription_id")

    try:
        cred = ClientSecretCredential(tenant_id=tenant_id, client_id=client_id, client_secret=client_secret)
        client = CostManagementClient(cred)
        scope = f"/subscriptions/{sub_id}"
        start = _since_or_default(since)
        today = datetime.utcnow()

        result = client.query.usage(
            scope=scope,
            parameters=QueryDefinition(
                type="Usage",
                timeframe="Custom",
                time_period=QueryTimePeriod(from_property=start, to=today),
                dataset=QueryDataset(
                    granularity="Daily",
                    aggregation={"totalCost": QueryAggregation(name="Cost", function="Sum")},
                    grouping=[QueryGrouping(type="Dimension", name="ResourceId"),
                              QueryGrouping(type="Dimension", name="Meter")],
                    filter=QueryFilter(
                        dimensions=QueryComparisonExpression(
                            name="ResourceType", operator="In", values=["microsoft.cognitiveservices/accounts"],
                        )
                    ),
                ),
            ),
        )
    except Exception as e:
        msg = str(e)
        if "AuthenticationFailed" in msg or "AADSTS" in msg or "Forbidden" in msg:
            raise ValueError(f"Azure auth failed for Cost Management: {e}") from e
        raise

    columns = [c.name for c in (result.columns or [])]

    def col(row, name, default=None):
        return row[columns.index(name)] if name in columns else default

    events: list[dict] = []
    for row in result.rows or []:
        cost = float(col(row, "Cost", 0) or 0)
        if cost <= 0:
            continue
        date_raw = str(int(col(row, "UsageDate", 0) or 0))
        p_start = f"{date_raw[:4]}-{date_raw[4:6]}-{date_raw[6:8]}T00:00:00Z" if len(date_raw) == 8 else _iso(start)
        resource_id = col(row, "ResourceId", "") or ""
        events.append({
            "model": col(row, "Meter"),
            "teamOrUser": resource_id.split("/")[-1] if resource_id else None,
            "tokensIn": None, "tokensOut": None, "unitsConsumed": None,
            "costUsd": cost,
            "periodStart": p_start, "periodEnd": p_start,
        })
    return events


# ── Gemini / Vertex AI — GCP Cloud Billing v1beta reports ───────────────────
# Reuses the same auth + reports mechanism real_data.py's GCP collector
# already uses successfully (Cloud Billing v1beta, not a BigQuery export —
# that's the actual working mechanism in this codebase today, see
# _fetch_gcp_billing_api in real_data.py). Requires the org's service account
# to have roles/billing.viewer on the linked billing account; if the project
# has no billing account linked at all, we return [] with a clear log line
# instead of raising, since that's a normal "not connected" org state.

def _gcp_service_costs(creds: dict, service_name_substrings: list[str], since: datetime | None) -> list[dict]:
    from google.oauth2 import service_account
    import googleapiclient.discovery as discovery

    key_data = creds.get("service_account_json") or creds.get("serviceAccountJson")
    if key_data:
        import json
        info = json.loads(key_data) if isinstance(key_data, str) else key_data
    elif creds.get("type") == "service_account" and creds.get("private_key"):
        info = dict(creds)
    else:
        raise ValueError("GCP credential is missing service_account_json")

    sa_creds = service_account.Credentials.from_service_account_info(
        info, scopes=["https://www.googleapis.com/auth/cloud-platform"])
    project_id = creds.get("project_id") or creds.get("projectId") or info.get("project_id")
    if not project_id:
        raise ValueError("GCP credential is missing project_id")

    try:
        billing_svc = discovery.build("cloudbilling", "v1", credentials=sa_creds, cache_discovery=False)
        billing_info = billing_svc.projects().getBillingInfo(name=f"projects/{project_id}").execute()
        billing_account = billing_info.get("billingAccountName", "")
    except Exception as e:
        raise ValueError(f"GCP auth failed for Cloud Billing: {e}") from e

    if not billing_account:
        print(f"[ai-billing] GCP project {project_id}: billing export not connected (no billing account linked) — skipping")
        return []

    start = _since_or_default(since)
    today = datetime.utcnow()
    try:
        billing_v1beta = discovery.build("cloudbilling", "v1beta", credentials=sa_creds, cache_discovery=False)
        result = billing_v1beta.billingAccounts().reports().get(
            name=f"{billing_account}/reports",
            **{
                "dateRange.startDate.year": start.year, "dateRange.startDate.month": start.month, "dateRange.startDate.day": start.day,
                "dateRange.endDate.year": today.year, "dateRange.endDate.month": today.month, "dateRange.endDate.day": today.day,
            },
        ).execute()
    except Exception as e:
        print(f"[ai-billing] GCP project {project_id}: billing report fetch failed: {e}")
        return []

    def _money_usd(m: dict) -> float:
        if not m:
            return 0.0
        return float(m.get("units", 0) or 0) + float(m.get("nanos", 0) or 0) / 1e9

    events: list[dict] = []
    p_start, p_end = _iso(start), _iso(today)
    for sec in result.get("costBreakdownSections", []):
        name = sec.get("service", {}).get("displayName", "")
        if not any(s.lower() in name.lower() for s in service_name_substrings):
            continue
        cost = _money_usd(sec.get("cost", {}))
        if cost <= 0:
            continue
        events.append({
            "model": name, "teamOrUser": None,
            "tokensIn": None, "tokensOut": None, "unitsConsumed": None,
            "costUsd": round(cost, 4),
            "periodStart": p_start, "periodEnd": p_end,
        })
    return events


def fetch_gemini_usage(creds: dict, since: datetime | None = None) -> list[dict]:
    return _gcp_service_costs(creds, ["Generative Language", "Gemini"], since)


def fetch_vertex_ai_usage(creds: dict, since: datetime | None = None) -> list[dict]:
    return _gcp_service_costs(creds, ["Vertex AI"], since)


COLLECTORS = {
    "openai": fetch_openai_usage,
    "anthropic": fetch_anthropic_usage,
    "bedrock": fetch_bedrock_usage,
    "azure_openai": fetch_azure_openai_usage,
    "gemini": fetch_gemini_usage,
    "vertex_ai": fetch_vertex_ai_usage,
}
