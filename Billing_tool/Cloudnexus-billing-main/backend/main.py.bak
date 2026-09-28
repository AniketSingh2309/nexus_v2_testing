from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel
import json, io, csv
import os, sys
import smtplib
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '..', '..', '.env'))
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
from time import time
import time as _std_time
from typing import Optional, Dict, Any
import threading

# ── Shared SQLite DB ──────────────────────────────────────────────────────
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..')))
try:
    from cloudnexus_db import init_db, save_cloud_session, load_cloud_sessions, \
        load_all_cloud_sessions, delete_cloud_session, add_log, get_org_admin_for_user, \
        get_cloud_account, list_accounts_for_user, list_accounts_for_org, is_user_assigned_to_account
    init_db()
    _db_available = True
except Exception as _db_err:
    print(f"[DB] Warning: {_db_err}")
    _db_available = False
    def save_cloud_session(*a, **kw): pass
    def load_cloud_sessions(*a, **kw): return []
    def load_all_cloud_sessions(*a, **kw): return []
    def delete_cloud_session(*a, **kw): pass
    def add_log(*a, **kw): pass
    def get_org_admin_for_user(*a, **kw): return ""
    def get_cloud_account(*a, **kw): return None
    def list_accounts_for_user(*a, **kw): return []
    def list_accounts_for_org(*a, **kw): return []
    def is_user_assigned_to_account(*a, **kw): return False

try:
    from forecaster import run_forecast
except ModuleNotFoundError:
    from .forecaster import run_forecast

try:
    from mock_data import get_mock_data
    from real_data import get_real_data, connect_aws, connect_gcp, connect_azure
    from optimizer import analyze_cross_cloud
except ModuleNotFoundError:
    from .mock_data import get_mock_data
    from .real_data import get_real_data, connect_aws, connect_gcp, connect_azure
    from .optimizer import analyze_cross_cloud


app = FastAPI(title="CloudNexus API v2")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

_real_data_cache: Dict[str, tuple] = {}  # uid → (data, timestamp)
_real_data_cache_lock = threading.Lock()
_REAL_DATA_CACHE_TTL = 120.0


def _resolve_org(uid: str) -> str:
    if not uid:
        return ""
    try:
        return get_org_admin_for_user(uid.lower().strip()) or uid.lower().strip()
    except Exception:
        return uid.lower().strip()


def _get_account_creds(account_id: int) -> Optional[Dict]:
    """Load and decrypt credentials for one cloud account from the shared DB."""
    if not _db_available:
        return None
    try:
        account = get_cloud_account(account_id)
        if not account or not account.get("credentials"):
            return None
        creds = dict(account["credentials"])
        auth_type = creds.pop("auth_type", None) or (
            "service_account" if account["provider"] == "gcp" else "iam"
        )
        # Normalize camelCase AWS keys to snake_case expected by boto3 calls
        if account["provider"] == "aws":
            if "accessKeyId" in creds and "access_key_id" not in creds:
                creds["access_key_id"] = creds.pop("accessKeyId")
            if "secretAccessKey" in creds and "secret_access_key" not in creds:
                creds["secret_access_key"] = creds.pop("secretAccessKey")
            if "sessionToken" in creds and "session_token" not in creds:
                creds["session_token"] = creds.pop("sessionToken")
        return {"auth_type": auth_type, "creds": creds, "meta": account.get("accountMeta") or {}}
    except Exception as e:
        print(f"[billing] _get_account_creds({account_id}) error: {e}")
        return None


def _build_org_creds_for_uid(uid: str) -> Dict[str, Dict]:
    """
    Build the {provider: {auth_type, creds, meta}} map expected by get_real_data(),
    using the first active account per provider from this user's accessible accounts.
    """
    if not uid or not _db_available:
        return {}
    try:
        # Try user-assigned accounts first (regular users assigned via admin portal)
        accounts = list_accounts_for_user(uid.lower().strip())
        # If no assigned accounts, try org-owned accounts (admin viewing own org)
        if not accounts:
            accounts = list_accounts_for_org(uid.lower().strip())
    except Exception:
        return {}
    seen: Dict[str, Dict] = {}
    for a in accounts:
        p = a.get("provider")
        if not p or p in seen:
            continue
        cred_info = _get_account_creds(a["id"])
        if cred_info:
            seen[p] = cred_info
    return seen


def _invalidate_real_cache(uid: str = None) -> None:
    if uid is not None:
        _real_data_cache.pop((uid or "").lower().strip(), None)
    else:
        _real_data_cache.clear()


def _get_hot_cache_only(uid: str) -> Optional[dict]:
    """Return cached data if fresh — never blocks, never fetches cloud APIs."""
    key = (uid or "").lower().strip()
    now = time()
    cached = _real_data_cache.get(key)
    if cached is not None:
        data, ts = cached
        if now - ts < _REAL_DATA_CACHE_TTL:
            return data
    return None


def _get_cached_real_data(uid: str = "") -> dict:
    key = (uid or "").lower().strip()
    now = time()
    cached = _real_data_cache.get(key)
    if cached is not None:
        data, ts = cached
        if now - ts < _REAL_DATA_CACHE_TTL:
            return data
    with _real_data_cache_lock:
        cached = _real_data_cache.get(key)
        if cached is not None:
            data, ts = cached
            if now - ts < _REAL_DATA_CACHE_TTL:
                return data
        org_creds = _build_org_creds_for_uid(key)
        try:
            data = get_real_data(org_creds)
        except ModuleNotFoundError:
            from .real_data import get_real_data as gr
            data = gr(org_creds)
        _real_data_cache[key] = (data, now)
        return data


def _get_smtp_config() -> Optional[Dict[str, Any]]:
    host = os.getenv("EMAIL_SMTP_HOST", "smtp.zoho.in").strip()
    user = os.getenv("EMAIL_SMTP_USER", "support@core5.co.in").strip()
    password = os.getenv("EMAIL_SMTP_PASS", "JsC6DWiPJ7rv")
    port = int(os.getenv("EMAIL_SMTP_PORT", "465"))
    return {
        "host": host,
        "port": port,
        "user": user,
        "password": password,
        "from_addr": os.getenv("EMAIL_FROM", user).strip(),
        "use_ssl": port == 465,
        "use_tls": port != 465 and os.getenv("EMAIL_SMTP_USE_TLS", "true").strip().lower() not in ("false", "0", "no"),
    }


def _send_email(to_email: str, subject: str, body_text: str, body_html: str = None) -> None:
    smtp_config = _get_smtp_config()
    if not smtp_config or not smtp_config["user"] or not smtp_config["password"]:
        raise HTTPException(
            status_code=501,
            detail="Email sending is not configured. Set EMAIL_SMTP_HOST, EMAIL_SMTP_USER, and EMAIL_SMTP_PASS in the backend environment.",
        )

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = smtp_config["from_addr"]
    message["To"] = to_email
    message.set_content(body_text)
    if body_html:
        message.add_alternative(body_html, subtype="html")

    try:
        if smtp_config.get("use_ssl"):
            with smtplib.SMTP_SSL(smtp_config["host"], smtp_config["port"], timeout=10) as smtp:
                smtp.login(smtp_config["user"], smtp_config["password"])
                smtp.send_message(message)
        else:
            with smtplib.SMTP(smtp_config["host"], smtp_config["port"], timeout=10) as smtp:
                if smtp_config["use_tls"]:
                    smtp.starttls()
                smtp.login(smtp_config["user"], smtp_config["password"])
                smtp.send_message(message)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Failed to send email: {exc}")


# ── Report email builder ──────────────────────────────────────────────

def _r_usd(n: float) -> str:
    return f"${n:,.0f}"


def _r_delta(pct: float) -> str:
    if pct > 0:
        return f'<span style="color:#c53030;font-weight:600;">&#9650; {abs(pct):.1f}%</span>'
    if pct < 0:
        return f'<span style="color:#276749;font-weight:600;">&#9660; {abs(pct):.1f}%</span>'
    return '<span style="color:#718096;">&#8212; 0%</span>'


def _r_dot(status: str) -> str:
    c = {"healthy": "#38a169", "warning": "#dd6b20", "danger": "#e53e3e"}.get(status, "#a0aec0")
    return (
        f'<span style="display:inline-block;width:7px;height:7px;border-radius:50%;'
        f'background:{c};margin-right:5px;vertical-align:middle;"></span>'
    )


def _r_bar(label: str, pct: int, color: str) -> str:
    w = min(pct, 100)
    return (
        f'<tr>'
        f'<td style="padding:3px 0;font-size:11px;color:#718096;width:76px;">{label}</td>'
        f'<td style="padding:3px 6px;">'
        f'<div style="background:#edf2f7;border-radius:3px;height:5px;width:150px;">'
        f'<div style="background:{color};height:5px;border-radius:3px;width:{w}%;"></div>'
        f'</div></td>'
        f'<td style="padding:3px 0;font-size:11px;color:#4a5568;font-weight:600;">{pct}%</td>'
        f'</tr>'
    )


def _build_report_html(data: dict) -> str:
    today  = datetime.utcnow()
    ov     = data["overview"]
    pr     = data["providers"]
    alerts = data.get("alerts", [])
    trend  = data.get("trend", [])

    today_label = today.strftime("%b %d")
    td = next((d for d in trend if d["date"] == today_label),
              trend[-1] if trend else {"aws": 0, "gcp": 0, "azure": 0, "total": 0})
    date_str = today.strftime(f"%A, %B {today.day}, %Y")

    # ── inline cell builders ──────────────────────────────────────────

    def kpi(label, val, color, last=False):
        br = "" if last else "border-right:1px solid #edf2f7;"
        return (
            f'<td style="padding:18px 22px;{br}vertical-align:top;">'
            f'<div style="font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;'
            f'color:#a0aec0;margin-bottom:6px;">{label}</div>'
            f'<div style="font-size:22px;font-weight:700;color:{color};">{val}</div>'
            f'</td>'
        )

    def today_col(label, val, color):
        return (
            f'<td style="text-align:center;padding:0 12px;border-right:1px solid #f0f0f0;">'
            f'<div style="font-size:10px;color:#a0aec0;letter-spacing:0.5px;margin-bottom:4px;">{label}</div>'
            f'<div style="font-size:17px;font-weight:700;color:{color};">{val}</div>'
            f'</td>'
        )

    def metric_cell(val, label, last=False):
        br = "" if last else "border-right:1px solid #e2e8f0;"
        return (
            f'<td style="text-align:center;padding:10px 12px;{br}">'
            f'<div style="font-size:14px;font-weight:700;color:#2d3748;">{val}</div>'
            f'<div style="font-size:10px;color:#a0aec0;margin-top:2px;">{label}</div>'
            f'</td>'
        )

    def svc_rows(services):
        out = ""
        for s in services:
            out += (
                f'<tr style="border-bottom:1px solid #f7fafc;">'
                f'<td style="padding:7px 0;font-size:12px;color:#2d3748;">{_r_dot(s["status"])}{s["name"]}</td>'
                f'<td style="padding:7px 0;font-size:12px;font-weight:600;color:#1a202c;text-align:right;">'
                f'{_r_usd(s["cost"])}</td>'
                f'<td style="padding:7px 0 7px 14px;font-size:11px;color:#a0aec0;text-align:right;">'
                f'{s["pct"]}%</td>'
                f'</tr>'
            )
        return out

    def provider_card(display, key, accent, bg, pdata, metrics_html, util_html):
        today_val = td.get(key, 0)
        return (
            f'<tr><td style="padding-bottom:14px;">'
            f'<table width="100%" cellpadding="0" cellspacing="0" '
            f'style="background:#ffffff;border-radius:8px;border:1px solid #e2e8f0;">'
            f'<tr><td style="border-left:4px solid {accent};padding:18px 22px 16px;">'

            # header
            f'<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:14px;">'
            f'<tr>'
            f'<td>'
            f'<div style="font-size:10px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;'
            f'color:{accent};margin-bottom:4px;">{display}</div>'
            f'<div style="font-size:24px;font-weight:700;color:#1a202c;line-height:1.1;">'
            f'{_r_usd(pdata["mtd"])}</div>'
            f'<div style="font-size:11px;color:#718096;margin-top:3px;">'
            f'Month-to-date &nbsp;&middot;&nbsp; {_r_delta(pdata["delta_pct"])} vs last month</div>'
            f'</td>'
            f'<td style="text-align:right;vertical-align:top;">'
            f'<div style="font-size:10px;color:#a0aec0;margin-bottom:3px;">Today</div>'
            f'<div style="font-size:17px;font-weight:600;color:#4a5568;">{_r_usd(today_val)}</div>'
            f'</td>'
            f'</tr></table>'

            # metrics band
            f'<table width="100%" cellpadding="0" cellspacing="0" '
            f'style="background:{bg};border-radius:6px;margin-bottom:14px;">'
            f'<tr>{metrics_html}</tr></table>'

            # services table
            f'<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:14px;">'
            f'<tr style="border-bottom:1px solid #edf2f7;">'
            f'<th style="padding:5px 0;font-size:10px;font-weight:700;color:#a0aec0;'
            f'text-transform:uppercase;text-align:left;">Service</th>'
            f'<th style="padding:5px 0;font-size:10px;font-weight:700;color:#a0aec0;'
            f'text-transform:uppercase;text-align:right;">MTD Cost</th>'
            f'<th style="padding:5px 0 5px 14px;font-size:10px;font-weight:700;color:#a0aec0;'
            f'text-transform:uppercase;text-align:right;">Share</th>'
            f'</tr>'
            f'{svc_rows(pdata.get("services", []))}'
            f'</table>'

            # utilization
            f'<div style="font-size:10px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;'
            f'color:#a0aec0;margin-bottom:7px;">Resource Utilization</div>'
            f'<table cellpadding="0" cellspacing="0">{util_html}</table>'

            f'</td></tr></table>'
            f'</td></tr>'
        )

    # ── AWS ──
    aws = pr["aws"]
    aws_m = (
        metric_cell(aws["metrics"]["instances"], "EC2 Instances") +
        metric_cell(f"{aws['metrics']['storage_tb']} TB", "S3 Storage") +
        metric_cell(f"{aws['metrics']['lambda_invocations'] // 1_000_000:.1f}M", "Lambda Calls") +
        metric_cell(_r_usd(aws["metrics"]["storage_cost"]), "Storage Cost", last=True)
    )
    aws_u = (
        _r_bar("CPU Avg",  aws["utilization"]["cpu_avg"],  "#FF9900") +
        _r_bar("Memory",   aws["utilization"]["memory"],   "#FF9900") +
        _r_bar("RDS CPU",  aws["utilization"]["rds_cpu"],  "#FF9900") +
        _r_bar("Network",  aws["utilization"]["network"],  "#FF9900")
    )

    # ── GCP ──
    gcp = pr["gcp"]
    gcp_m = (
        metric_cell(gcp["metrics"]["instances"], "Compute VMs") +
        metric_cell(f"{gcp['metrics']['bigquery_tb']} TB", "BigQuery Data") +
        metric_cell(gcp["metrics"]["gke_pods"], "GKE Pods") +
        metric_cell(_r_usd(gcp["metrics"]["bigquery_cost"]), "BigQuery Cost", last=True)
    )
    gcp_u = (
        _r_bar("CPU Avg", gcp["utilization"]["cpu_avg"], "#4285F4") +
        _r_bar("Memory",  gcp["utilization"]["memory"],  "#4285F4") +
        _r_bar("Disk",    gcp["utilization"]["disk"],    "#4285F4") +
        _r_bar("Network", gcp["utilization"]["network"], "#4285F4")
    )

    # ── Azure ──
    az = pr["azure"]
    az_m = (
        metric_cell(az["metrics"]["vms"], "Virtual Machines") +
        metric_cell(f"{az['metrics']['storage_tb']} TB", "Blob Storage") +
        metric_cell(az["metrics"]["aks_nodes"], "AKS Nodes") +
        metric_cell(_r_usd(az["metrics"]["storage_cost"]), "Storage Cost", last=True)
    )
    az_u = (
        _r_bar("CPU Avg", az["utilization"]["cpu_avg"], "#0078D4") +
        _r_bar("Memory",  az["utilization"]["memory"],  "#0078D4") +
        _r_bar("Disk",    az["utilization"]["disk"],    "#0078D4") +
        _r_bar("Network", az["utilization"]["network"], "#0078D4")
    )

    # ── Alerts ──
    ALERT_C = {"danger": "#c53030", "warning": "#c05621", "info": "#2b6cb0"}
    ALERT_I = {"danger": "&#9679;", "warning": "&#9650;", "info": "&#8505;"}
    alert_rows = ""
    for a in alerts:
        if a.get("resolved"):
            continue
        c  = ALERT_C.get(a["type"], "#718096")
        ic = ALERT_I.get(a["type"], "&#8226;")
        pb = a.get("provider", "").upper()
        alert_rows += (
            f'<tr><td style="padding:10px 0;border-bottom:1px solid #f7fafc;">'
            f'<table width="100%" cellpadding="0" cellspacing="0"><tr>'
            f'<td style="width:14px;vertical-align:top;padding-top:1px;font-size:9px;color:{c};">{ic}</td>'
            f'<td style="padding-left:6px;">'
            f'<div style="font-size:12px;font-weight:600;color:#2d3748;">{a["title"]}'
            f'<span style="font-size:9px;font-weight:700;background:{c}1a;color:{c};'
            f'padding:1px 5px;border-radius:3px;margin-left:6px;">{pb}</span></div>'
            f'<div style="font-size:11px;color:#718096;margin-top:2px;line-height:1.5;">{a["detail"]}</div>'
            f'</td>'
            f'<td style="text-align:right;font-size:10px;color:#a0aec0;white-space:nowrap;'
            f'vertical-align:top;padding-left:12px;">{a["time"]}</td>'
            f'</tr></table></td></tr>'
        )
    if not alert_rows:
        alert_rows = (
            '<tr><td style="padding:14px 0;font-size:12px;color:#a0aec0;text-align:center;">'
            'No active alerts.</td></tr>'
        )

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#f0f2f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f2f5;">
<tr><td align="center" style="padding:28px 16px 40px;">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

  <!-- Branding -->
  <tr><td>
    <table width="100%" cellpadding="0" cellspacing="0"
      style="background:#ffffff;border-radius:10px 10px 0 0;border:1px solid #e2e8f0;border-bottom:none;">
      <tr><td style="text-align:center;padding:30px 24px 26px;">
        <svg width="56" height="38" viewBox="0 0 56 38" xmlns="http://www.w3.org/2000/svg"
          style="display:block;margin:0 auto 10px;">
          <rect x="3" y="20" width="50" height="18" rx="9" fill="#4285F4"/>
          <circle cx="14" cy="21" r="10" fill="#4285F4"/>
          <circle cx="28" cy="13" r="12" fill="#4285F4"/>
          <circle cx="42" cy="20" r="10" fill="#4285F4"/>
          <circle cx="14" cy="21" r="6" fill="#e8f0fe"/>
          <circle cx="28" cy="13" r="7" fill="#e8f0fe"/>
          <circle cx="42" cy="20" r="6" fill="#e8f0fe"/>
          <circle cx="14" cy="21" r="3" fill="#4285F4"/>
          <circle cx="28" cy="13" r="4" fill="#4285F4"/>
          <circle cx="42" cy="20" r="3" fill="#4285F4"/>
        </svg>
        <div style="font-size:28px;font-weight:800;letter-spacing:-0.8px;line-height:1;margin-bottom:6px;">
          <span style="color:#1a202c;">Cloud</span><span style="color:#4285F4;">Nexus</span>
        </div>
        <div style="font-size:10px;font-weight:600;color:#a0aec0;letter-spacing:2.5px;text-transform:uppercase;">
          Cloud Cost Intelligence
        </div>
      </td></tr>
    </table>
  </td></tr>

  <!-- Report title bar -->
  <tr><td style="padding-bottom:16px;">
    <table width="100%" cellpadding="0" cellspacing="0"
      style="background:#1e293b;border-radius:0 0 0 0;border:1px solid #e2e8f0;border-top:none;border-bottom:none;">
      <tr>
        <td style="padding:14px 24px;">
          <div style="font-size:13px;font-weight:700;color:#f8fafc;letter-spacing:0.2px;">
            Cloud Infrastructure Cost Report</div>
          <div style="font-size:11px;color:#94a3b8;margin-top:2px;">{date_str}</div>
        </td>
        <td style="text-align:right;padding:14px 24px;">
          <div style="display:inline-block;background:#334155;border-radius:4px;
            padding:3px 10px;font-size:10px;font-weight:700;color:#94a3b8;
            text-transform:uppercase;letter-spacing:1px;">Daily Summary</div>
        </td>
      </tr>
    </table>
    <div style="height:3px;background:linear-gradient(90deg,#4285F4 0%,#0078D4 50%,#FF9900 100%);
      border-radius:0 0 2px 2px;"></div>
  </td></tr>

  <!-- KPI Bar -->
  <tr><td style="padding-bottom:14px;">
    <table width="100%" cellpadding="0" cellspacing="0"
      style="background:#ffffff;border-radius:8px;border:1px solid #e2e8f0;">
      <tr>
        {kpi("Total Spend MTD",    _r_usd(ov["total_mtd"]),    "#1a202c")}
        {kpi("Active Services",    str(ov["active_services"]), "#1a202c")}
        {kpi("30-Day Forecast",    _r_usd(ov["forecast_30d"]), "#2b6cb0")}
        {kpi("Savings Identified", _r_usd(ov["savings_found"]),"#276749", last=True)}
      </tr>
    </table>
  </td></tr>

  <!-- Today's charges -->
  <tr><td style="padding-bottom:14px;">
    <table width="100%" cellpadding="0" cellspacing="0"
      style="background:#ffffff;border-radius:8px;border:1px solid #e2e8f0;">
      <tr><td style="padding:14px 22px 10px;border-bottom:1px solid #f7fafc;">
        <span style="font-size:10px;font-weight:700;letter-spacing:1px;
          text-transform:uppercase;color:#a0aec0;">
          Today&#8217;s Charges &mdash; {td.get('date', today_label)}</span>
      </td></tr>
      <tr><td style="padding:14px 22px;">
        <table width="100%" cellpadding="0" cellspacing="0"><tr>
          {today_col("Amazon Web Services", _r_usd(td.get("aws",   0)), "#FF9900")}
          {today_col("Google Cloud",        _r_usd(td.get("gcp",   0)), "#4285F4")}
          {today_col("Microsoft Azure",     _r_usd(td.get("azure", 0)), "#0078D4")}
          <td style="text-align:center;padding:0 12px;">
            <div style="font-size:10px;color:#a0aec0;letter-spacing:0.5px;margin-bottom:4px;">Combined Total</div>
            <div style="font-size:17px;font-weight:700;color:#1a202c;">{_r_usd(td.get("total", 0))}</div>
          </td>
        </tr></table>
      </td></tr>
    </table>
  </td></tr>

  <!-- Provider cards -->
  <table width="100%" cellpadding="0" cellspacing="0">
    {provider_card("Amazon Web Services", "aws",   "#FF9900", "#fff8f0", aws, aws_m, aws_u)}
    {provider_card("Google Cloud",        "gcp",   "#4285F4", "#f0f4ff", gcp, gcp_m, gcp_u)}
    {provider_card("Microsoft Azure",     "azure", "#0078D4", "#f0f7ff", az,  az_m,  az_u)}
  </table>

  <!-- Alerts -->
  <tr><td style="padding-bottom:16px;">
    <table width="100%" cellpadding="0" cellspacing="0"
      style="background:#ffffff;border-radius:8px;border:1px solid #e2e8f0;">
      <tr><td style="padding:14px 22px 6px;border-bottom:1px solid #f7fafc;">
        <span style="font-size:10px;font-weight:700;letter-spacing:1px;
          text-transform:uppercase;color:#a0aec0;">Active Alerts</span>
      </td></tr>
      <tr><td style="padding:4px 22px 10px;">
        <table width="100%" cellpadding="0" cellspacing="0">{alert_rows}</table>
      </td></tr>
    </table>
  </td></tr>

  <!-- Footer -->
  <tr><td style="text-align:center;font-size:11px;color:#a0aec0;line-height:2;padding-top:4px;">
    Generated {today.strftime("%B %d, %Y")} at {today.strftime("%H:%M")} UTC
    &nbsp;&middot;&nbsp; All amounts in USD
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>"""


class CredentialPayload(BaseModel):
    provider:    str
    auth_type:   str
    credentials: Dict[str, Any]
    uid:         str = ""


def check_account_access_response(uid: str, account_id: Optional[int]):
    """Returns a JSONResponse with the appropriate error if access is denied, else None."""
    if not account_id:
        return JSONResponse(status_code=400, content={"error": "missing_account", "message": "account_id is required."})
    if not _db_available:
        return None
    try:
        account = get_cloud_account(account_id)
    except Exception:
        account = None
    if account is None:
        return JSONResponse(status_code=404, content={"error": "not_found", "message": "Cloud account not found."})
    org_admin = get_org_admin_for_user(uid.lower().strip()) if uid else ""
    is_admin = bool(org_admin) and org_admin == (uid or "").lower().strip() and account.get("orgAdmin") == org_admin
    if is_admin:
        return None
    try:
        assigned = is_user_assigned_to_account(uid, account_id)
    except Exception:
        assigned = False
    if not assigned:
        return JSONResponse(status_code=403, content={"error": "not_assigned", "message": "You do not have access to this cloud account."})
    return None


@app.post("/api/credentials/connect")
async def credentials_connect(payload: CredentialPayload):
    return JSONResponse(status_code=410, content={
        "success": False, "error": "admin_only",
        "message": "Credential management has moved to the Admin Portal. Contact your admin to add cloud accounts."
    })


@app.post("/api/credentials/disconnect")
async def credentials_disconnect(payload: dict):
    return JSONResponse(status_code=410, content={
        "success": False, "error": "admin_only",
        "message": "Credential management has moved to the Admin Portal. Contact your admin to remove cloud accounts."
    })


@app.get("/api/credentials/status")
def credentials_status(uid: str = ""):
    if not _db_available:
        return {p: {"connected": False, "auth_type": None} for p in ["aws", "gcp", "azure"]}
    try:
        accounts = list_accounts_for_user((uid or "").lower().strip())
        if not accounts:
            accounts = list_accounts_for_org((uid or "").lower().strip())
    except Exception:
        accounts = []
    by_provider: Dict[str, Dict] = {}
    for a in accounts:
        p = a.get("provider")
        if p and p not in by_provider:
            by_provider[p] = {"connected": True, "auth_type": None, "accountId": a["id"], "label": a.get("label")}
    return {p: by_provider.get(p, {"connected": False, "auth_type": None}) for p in ["aws", "gcp", "azure"]}


class ReportSchedulePayload(BaseModel):
    email: str
    time: str


class ReportSendPayload(BaseModel):
    email: str


_SCHEDULE_FILE = os.path.join(os.path.dirname(__file__), "report_schedules.json")

def _load_schedules() -> Dict[str, str]:
    try:
        with open(_SCHEDULE_FILE, "r") as f:
            return json.load(f)
    except Exception:
        return {}

def _save_schedules(data: Dict[str, str]):
    try:
        with open(_SCHEDULE_FILE, "w") as f:
            json.dump(data, f, indent=2)
    except Exception:
        pass

_report_schedule: Dict[str, str] = _load_schedules()
_sent_today: Dict[str, str] = {}  # email -> "YYYY-MM-DD" prevents double-send
_IST = timezone(timedelta(hours=5, minutes=30))


def _scheduler_loop():
    """Background thread: fires billing reports at their scheduled IST times."""
    while True:
        _std_time.sleep(30)
        now = datetime.now(_IST)
        current_hhmm = now.strftime("%H:%M")
        today_str = now.strftime("%Y-%m-%d")

        for email, sched_time in list(_report_schedule.items()):
            if sched_time != current_hhmm or _sent_today.get(email) == today_str:
                continue
            _sent_today[email] = today_str  # mark before sending to avoid double-fire
            try:
                uid  = email.lower().strip()
                data = _get_hot_cache_only(uid) or _get_cached_real_data(uid)
                today   = now
                ov      = data["overview"]
                pr      = data["providers"]
                subject = f"Cloud Infrastructure Cost Report — {today.strftime('%B')} {today.day}, {today.year}"
                text_body = (
                    f"Cloud Infrastructure Cost Report\n"
                    f"{today.strftime('%A, %B')} {today.day}, {today.year}\n\n"
                    f"SUMMARY\n"
                    f"  Total Spend MTD:     {_r_usd(ov['total_mtd'])}\n"
                    f"  Active Services:     {ov['active_services']}\n"
                    f"  30-Day Forecast:     {_r_usd(ov['forecast_30d'])}\n"
                    f"  Savings Identified:  {_r_usd(ov['savings_found'])}\n\n"
                    f"PROVIDER BREAKDOWN\n"
                    f"  Amazon Web Services: {_r_usd(pr['aws']['mtd'])}  ({pr['aws']['delta_pct']:+.1f}%)\n"
                    f"  Google Cloud:        {_r_usd(pr['gcp']['mtd'])}  ({pr['gcp']['delta_pct']:+.1f}%)\n"
                    f"  Microsoft Azure:     {_r_usd(pr['azure']['mtd'])}  ({pr['azure']['delta_pct']:+.1f}%)\n"
                )
                html_body = _build_report_html(data)
                _send_email(email, subject, text_body, html_body)
                print(f"[Scheduler] Billing report sent to {email} at {current_hhmm} IST")
            except Exception as exc:
                print(f"[Scheduler] Failed to send billing report to {email}: {exc}")


threading.Thread(target=_scheduler_loop, daemon=True).start()


@app.get("/api/report/schedule")
def get_report_schedule(email: str = ""):
    if email:
        key = email.lower().strip()
        if key in _report_schedule:
            return {"schedule": {"email": key, "time": _report_schedule[key]}}
        return {"schedule": None}
    return {"schedules": [{"email": e, "time": t} for e, t in _report_schedule.items()]}


@app.post("/api/report/schedule")
def save_report_schedule(payload: ReportSchedulePayload):
    if "@" not in payload.email:
        raise HTTPException(status_code=400, detail="Invalid email address")
    _report_schedule[payload.email.lower()] = payload.time
    _save_schedules(_report_schedule)
    return {"success": True, "scheduled": {"email": payload.email.lower(), "time": payload.time}}


@app.delete("/api/report/schedule/{email}")
def delete_report_schedule(email: str):
    _report_schedule.pop(email.lower(), None)
    _save_schedules(_report_schedule)
    return {"success": True}


@app.post("/api/report/send-now")
def send_report_now(payload: ReportSendPayload):
    if "@" not in payload.email:
        raise HTTPException(status_code=400, detail="Invalid email address")

    uid = payload.email.lower().strip()
    # Try hot cache first (instant); fall back to blocking real fetch if cold
    cached = _get_hot_cache_only(uid)
    if cached is not None:
        data = cached
    else:
        # Kick off background warm so subsequent calls are fast, then block for real data
        import threading
        threading.Thread(target=_get_cached_real_data, args=(uid,), daemon=True).start()
        data = _get_cached_real_data(uid)   # blocking fetch — waits for real data

    today   = datetime.utcnow()
    ov      = data["overview"]
    pr      = data["providers"]
    subject = f"Cloud Infrastructure Cost Report — {today.strftime('%B')} {today.day}, {today.year}"

    text_body = (
        f"Cloud Infrastructure Cost Report\n"
        f"{today.strftime('%A, %B')} {today.day}, {today.year}\n\n"
        f"SUMMARY\n"
        f"  Total Spend MTD:     {_r_usd(ov['total_mtd'])}\n"
        f"  Active Services:     {ov['active_services']}\n"
        f"  30-Day Forecast:     {_r_usd(ov['forecast_30d'])}\n"
        f"  Savings Identified:  {_r_usd(ov['savings_found'])}\n\n"
        f"PROVIDER BREAKDOWN\n"
        f"  Amazon Web Services: {_r_usd(pr['aws']['mtd'])}  ({pr['aws']['delta_pct']:+.1f}%)\n"
        f"  Google Cloud:        {_r_usd(pr['gcp']['mtd'])}  ({pr['gcp']['delta_pct']:+.1f}%)\n"
        f"  Microsoft Azure:     {_r_usd(pr['azure']['mtd'])}  ({pr['azure']['delta_pct']:+.1f}%)\n\n"
        f"Open the HTML version of this email for the full breakdown with services, "
        f"utilization, and active alerts."
    )

    html_body = _build_report_html(data)
    _send_email(payload.email.lower(), subject, text_body, html_body)
    return {"success": True, "sent_to": payload.email.lower()}


def _get_data(mode: str, uid: str = "") -> dict:
    if mode == "mock":
        try:
            return get_mock_data()
        except ModuleNotFoundError:
            from .mock_data import get_mock_data as gm
            return gm()
    return _get_cached_real_data(uid)



@app.get("/api/overview")
def overview(mode: str = "mock", uid: str = ""):
    # In real mode: use hot cache first to avoid blocking; background fetch warms cache
    if mode == "real":
        cached = _get_hot_cache_only(uid)
        if cached is not None:
            return cached["overview"]
        # Cache cold — trigger background warm and return mock overview immediately
        threading.Thread(target=_get_cached_real_data, args=(uid,), daemon=True).start()
        try:
            from mock_data import get_mock_data
        except ModuleNotFoundError:
            from .mock_data import get_mock_data
        return get_mock_data()["overview"]
    return _get_data(mode, uid)["overview"]


@app.get("/api/provider/{provider}")
def provider_data(provider: str, mode: str = "mock", uid: str = ""):
    if mode == "real":
        cached = _get_hot_cache_only(uid)
        if cached is not None:
            pdata = cached["providers"].get(provider)
            if pdata:
                return pdata
        # Cache cold — return mock provider data; overview endpoint already kicked off warm
        try:
            from mock_data import get_mock_data
        except ModuleNotFoundError:
            from .mock_data import get_mock_data
        pdata = get_mock_data()["providers"].get(provider)
        if not pdata:
            raise HTTPException(status_code=404, detail=f"Provider {provider} not found")
        pdata["_warming"] = True
        return pdata
    data = _get_data(mode, uid)
    pdata = data["providers"].get(provider)
    if not pdata:
        raise HTTPException(status_code=404, detail=f"Provider {provider} not found")
    return pdata


@app.get("/api/trend")
def trend(mode: str = "mock", days: int = 90, uid: str = ""):
    if mode == "real":
        cached = _get_hot_cache_only(uid)
        if cached is not None:
            return cached["trend"][-days:]
        try:
            from mock_data import get_mock_data
        except ModuleNotFoundError:
            from .mock_data import get_mock_data
        return get_mock_data()["trend"][-days:]
    return _get_data(mode, uid)["trend"][-days:]


@app.get("/api/analysis")
def analysis(mode: str = "real", uid: str = ""):
    try:
        if mode == "mock":
            payload = analyze_cross_cloud({})
            payload["source"] = "mock"
            return payload

        org_creds = _build_org_creds_for_uid(uid) if mode == "real" else {}

        # Only read from hot cache — never block on cloud API calls here.
        # The main dashboard endpoints (overview/provider/trend) already populate the cache.
        # If cache is cold (user opened analysis before dashboard loaded), return mock
        # immediately so the UI is responsive; a subsequent refresh will use real data.
        cached_data = _get_hot_cache_only(uid) if org_creds else None

        if cached_data is not None:
            payload = analyze_cross_cloud(org_creds, cached_data=cached_data)
        else:
            # Cache not ready yet — use mock so the UI loads instantly
            payload = analyze_cross_cloud({})
            payload["source"] = "warming"

        return payload
    except Exception as e:
        # Ensure the fallback itself can't crash the endpoint
        try:
            fb = analyze_cross_cloud({})
            fb["source"] = "mock"
            fb["error"] = str(e)
            return fb
        except Exception:
            return {
                "source": "mock", "error": str(e),
                "cards": {}, "recommendations": [], "tips": [],
            }


@app.get("/api/forecast")
def forecast(mode: str = "mock", uid: str = ""):
    """
    Run ensemble forecast (Holt-Winters + LSTM + XGBoost + Claude AI) over
    the actual trend history — mock or live.  No hardcoded forecast values.
    Always returns data for all three providers (AWS, GCP, Azure).
    """
    # Use hot-cache for real mode to avoid blocking on cloud APIs
    if mode == "real":
        cached = _get_hot_cache_only(uid)
        if cached is not None:
            data = cached
        else:
            # No warm cache yet — fall through to mock so we don't block
            try:
                from mock_data import get_mock_data
            except ModuleNotFoundError:
                from .mock_data import get_mock_data
            data = get_mock_data()
    else:
        data = _get_data(mode, uid)

    history = [d["total"] for d in data["trend"]]
    if not history:
        raise HTTPException(status_code=422, detail="No trend data available for forecasting")
    # Strip leading zeros — they corrupt Holt-Winters initialisation
    first_real = next((i for i, v in enumerate(history) if v > 0), None)
    if first_real is not None and first_real > 0:
        history = history[first_real:]
    if not history or all(v == 0 for v in history):
        raise HTTPException(status_code=422, detail="No non-zero cost data found for forecasting")

    trend_data = data["trend"]
    recent     = trend_data[-30:] if len(trend_data) >= 30 else trend_data

    # ── Provider shares — always fill all three providers ─────────────
    # First try from trend data (accurate when all providers have history)
    trend_totals = {"aws": 0, "gcp": 0, "azure": 0, "total": 0}
    for d in recent:
        for k in trend_totals:
            trend_totals[k] += d.get(k, 0)
    trend_grand = trend_totals["total"] or 1

    # For providers missing from trend, use MTD from providers block
    providers_block = data.get("providers", {})
    mtd_totals = {
        p: (providers_block.get(p) or {}).get("mtd", 0)
        for p in ("aws", "gcp", "azure")
    }
    mtd_grand = sum(mtd_totals.values()) or 1

    raw_shares: dict = {}
    for p in ("aws", "gcp", "azure"):
        trend_share = trend_totals[p] / trend_grand
        if trend_share > 0.005:
            raw_shares[p] = trend_share
        else:
            # Provider absent from trend — estimate from MTD
            raw_shares[p] = mtd_totals[p] / mtd_grand if mtd_totals[p] > 0 else 0

    # Ensure all three are present; if all zero default to equal thirds
    if all(v == 0 for v in raw_shares.values()):
        raw_shares = {"aws": 0.6, "gcp": 0.25, "azure": 0.15}

    # Normalise to sum to 1
    shares_sum = sum(raw_shares.values()) or 1
    provider_shares = {k: round(v / shares_sum, 4) for k, v in raw_shares.items()}

    # ── Per-provider history — estimate from total × share when missing ─
    provider_history: dict = {}
    for p in ("aws", "gcp", "azure"):
        raw_hist = [d.get(p, 0) for d in recent]
        if all(v == 0 for v in raw_hist) and provider_shares[p] > 0:
            # No per-provider trend data — scale total by share for chart continuity
            raw_hist = [round(d.get("total", 0) * provider_shares[p], 2) for d in recent]
        provider_history[p] = raw_hist

    result = run_forecast(history, provider_shares=provider_shares)
    result["provider_shares"]  = provider_shares
    result["provider_history"] = provider_history
    return result


@app.get("/api/alerts")
def alerts(mode: str = "mock", uid: str = ""):
    return _get_data(mode, uid)["alerts"]


@app.get("/api/export/csv")
def export_csv(mode: str = "mock", uid: str = ""):
    data   = _get_data(mode, uid)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Provider", "Service", "Cost", "Percentage", "Status"])
    for prov, pdata in data["providers"].items():
        for svc in pdata.get("services", []):
            writer.writerow([prov.upper(), svc["name"], svc["cost"], f"{svc['pct']}%", svc["status"]])
    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=cloudnexus-export.csv"})


@app.get("/api/export/json")
def export_json(mode: str = "mock", uid: str = ""):
    data    = _get_data(mode, uid)
    content = json.dumps(data, indent=2, default=str)
    return StreamingResponse(
        io.BytesIO(content.encode()),
        media_type="application/json",
        headers={"Content-Disposition": "attachment; filename=cloudnexus-export.json"})


# ── INVOICES ──────────────────────────────────────────────────────────

def _build_invoices_from_cached_trend(provider: str, cached: dict) -> list:
    """
    Build real monthly invoices by aggregating daily trend data from the hot cache.
    Used when the cloud-native invoice API is unavailable (e.g. GCP, Azure).
    Trend entries have format {"date": "Jun 19", "aws": 592, "gcp": 481, ...}.
    """
    pdata = (cached.get("providers") or {}).get(provider, {})
    if not pdata or pdata.get("_not_connected"):
        return []

    trend  = cached.get("trend", [])
    today  = datetime.utcnow()

    # Build a lookup of "Mon DD" → datetime for the last 90 days so we can
    # resolve ambiguous month-day strings to the correct calendar year.
    valid_dates: dict = {}
    for i in range(91):
        d = today - timedelta(days=i)
        valid_dates[d.strftime("%b %d")] = d
        valid_dates[d.strftime("%b  %d")] = d  # handle single-digit day with extra space

    # Aggregate daily provider spend by calendar month
    monthly_totals: dict = {}  # "Jun 2026" → float
    for entry in trend:
        date_str = (entry.get("date") or "").strip()
        val = float(entry.get(provider, 0) or 0)
        if not date_str or val == 0:
            continue
        dt = valid_dates.get(date_str)
        if dt is None:
            continue
        key = dt.strftime("%b %Y")
        monthly_totals[key] = monthly_totals.get(key, 0.0) + val

    # Override current month with MTD from providers block (more accurate)
    mtd  = float(pdata.get("mtd", 0) or 0)
    svcs = pdata.get("services", [])
    cur_key = today.strftime("%b %Y")
    if mtd > 0.01:
        monthly_totals[cur_key] = mtd

    if not monthly_totals:
        return []

    due_offset = {"aws": 15, "gcp": 20, "azure": 25}.get(provider, 20)
    invoices   = []

    def _month_dt(mk):
        try:    return datetime.strptime(mk, "%b %Y")
        except: return datetime.min

    for month_key in sorted(monthly_totals, key=_month_dt, reverse=True):
        amount = monthly_totals[month_key]
        if amount < 0.01:
            continue
        month_start = _month_dt(month_key)
        if month_start.month == 12:
            month_end = month_start.replace(year=month_start.year + 1, month=1, day=1)
        else:
            month_end = month_start.replace(month=month_start.month + 1, day=1)

        is_current = (month_key == cur_key)
        status     = "pending" if is_current else "paid"
        items      = []
        if is_current and svcs:
            items = [{"service": s["name"], "qty": f"{today.day} days MTD",
                      "unit":  round(s.get("cost", 0), 2),
                      "total": round(s.get("cost", 0), 2)} for s in svcs[:10]]

        invoices.append({
            "id":     f"INV-{provider.upper()}-{month_start.strftime('%Y-%m')}",
            "period": month_key,
            "issued": month_end.strftime("%Y-%m-%d"),
            "due":    month_end.replace(day=min(due_offset, 28)).strftime("%Y-%m-%d"),
            "amount": round(amount, 2),
            "status": status,
            "items":  items,
            "source": "live",
            "note":   ("Month-to-date spend" if is_current
                       else "Aggregated from daily billing data"),
        })

    return invoices[:6]


@app.get("/api/invoices/{provider}")
def get_invoices(provider: str, mode: str = "mock", uid: str = ""):
    provider = provider.lower()
    if provider not in ["aws", "gcp", "azure"]:
        raise HTTPException(status_code=400, detail="Invalid provider")

    if mode == "real":
        org_creds = _build_org_creds_for_uid(uid)

        # 1. Try cloud-native invoice API (AWS Cost Explorer gives full detail)
        if org_creds:
            try:
                from real_data import get_real_invoices
            except ModuleNotFoundError:
                from .real_data import get_real_invoices
            live = get_real_invoices(provider, org_creds)
            if live:
                return {"source": "live", "invoices": live}

        # 2. Build from cached real daily spend — covers GCP and Azure
        cached = _get_hot_cache_only(uid)
        if cached:
            trend_invs = _build_invoices_from_cached_trend(provider, cached)
            if trend_invs:
                return {"source": "live", "invoices": trend_invs}

        # 3. Cache is cold — kick off background warm; return empty (never mock in real mode)
        if not cached and org_creds:
            import threading
            threading.Thread(target=_get_cached_real_data, args=(uid,), daemon=True).start()

        return {"source": "real", "invoices": []}

    # ── Mock mode ─────────────────────────────────────────────────────────
    data  = _get_data(mode, uid)
    pdata = data["providers"].get(provider, {})
    mtd   = pdata.get("mtd", 0)
    svcs  = pdata.get("services", [])
    today = datetime.utcnow()
    trend = data.get("trend", [])

    def make_invoice(months_ago, status):
        month_start = (today.replace(day=1) - timedelta(days=months_ago * 28)).replace(day=1)
        if month_start.month == 12:
            month_end = month_start.replace(year=month_start.year+1, month=1, day=1)
        else:
            month_end = month_start.replace(month=month_start.month+1, day=1)
        month_label = month_start.strftime("%b")
        month_trend = [d for d in trend if d.get("date", "").startswith(month_label)]
        amount = round(sum(d.get(provider, 0) for d in month_trend), 2) if month_trend else 0
        if amount == 0:
            amount = round(mtd * (0.95 ** months_ago), 2)
        due_offsets = {"aws": 15, "gcp": 20, "azure": 25}
        items = [{"service": s["name"], "qty": "1 month",
                  "unit": round(s["cost"] * (0.95 ** months_ago), 2),
                  "total": round(s["cost"] * (0.95 ** months_ago), 2)} for s in svcs]
        return {
            "id":     f"INV-{provider.upper()}-{month_start.strftime('%Y-%m')}",
            "period": month_start.strftime("%b %Y"),
            "issued": month_end.strftime("%Y-%m-%d"),
            "due":    month_end.replace(day=min(due_offsets.get(provider, 15), 28)).strftime("%Y-%m-%d"),
            "amount": amount,
            "status": status,
            "items":  items,
            "source": "mock",
        }

    statuses = ["pending", "paid", "paid", "paid", "paid", "paid"]
    invoices = [make_invoice(i, statuses[i]) for i in range(6)]
    return {"source": "mock", "invoices": invoices}


# ── MONTHLY TREND ──────────────────────────────────────────────────────

@app.get("/api/trend/monthly")
def monthly_trend(mode: str = "mock", uid: str = ""):
    org_creds = _build_org_creds_for_uid(uid) if mode != "mock" else {}
    if mode == "real" and org_creds:
        data = _get_data(mode, uid)
        trend = data.get("trend", [])
        months: dict = {}
        for d in trend:
            try:
                month_label = d["date"][:3]
            except Exception:
                month_label = "Unknown"
            if month_label not in months:
                months[month_label] = {"month": month_label, "aws": 0, "gcp": 0, "azure": 0, "total": 0}
            months[month_label]["aws"]   += d.get("aws",   0)
            months[month_label]["gcp"]   += d.get("gcp",   0)
            months[month_label]["azure"] += d.get("azure", 0)
            months[month_label]["total"] += d.get("total", 0)
        return {"source": "live", "months": list(months.values())}

    # Derive from actual trend data — group by month
    data  = _get_data(mode, uid)
    trend = data["trend"]
    months: dict = {}
    for d in trend:
        try:
            m = d["date"][:3]
        except Exception:
            m = "Unknown"
        if m not in months:
            months[m] = {"month": m, "aws": 0, "gcp": 0, "azure": 0, "total": 0}
        months[m]["aws"]   += d.get("aws",   0)
        months[m]["gcp"]   += d.get("gcp",   0)
        months[m]["azure"] += d.get("azure", 0)
        months[m]["total"] += d.get("total", 0)

    return {"source": mode, "months": list(months.values())}


# ── COST COMPARISON (Multi-Cloud FinOps) ──────────────────────────────

@app.get("/api/cost-comparison")
def cost_comparison(mode: str = "mock", uid: str = ""):
    """
    Multi-cloud cost comparison payload: provider stats, radar, monthly history,
    budget analysis, savings recommendations, and cross-service table.
    Mirrors the Cost Analyst v2 comparison feature.
    """
    try:
        from cost_comparison import build_comparison_payload
    except ModuleNotFoundError:
        from .cost_comparison import build_comparison_payload

    org_creds = _build_org_creds_for_uid(uid) if mode != "mock" else {}
    data      = _get_data(mode, uid)
    providers_raw = data.get("providers", {})

    # Normalise provider info for the comparison builder
    providers_info = {}
    for p in ("aws", "gcp", "azure"):
        block = providers_raw.get(p, {})
        providers_info[p] = {
            "mtd":        block.get("mtd", 0),
            "delta_pct":  block.get("delta_pct", 0),
            "share":      data.get("overview", {}).get("providers", {}).get(p, {}).get("share", 0),
            "services":   block.get("services", []),
            "connected":  (p in org_creds),
            "real_data":  (p in org_creds),
        }

    budgets = None

    # Compute monthly rollup from actual trend data (real when providers are connected)
    real_monthly = None
    trend = data.get("trend", [])
    if trend:
        monthly_map: dict = {}
        for d in trend:
            try:
                # trend dates are "Jan 01" format — group by month abbreviation
                month_key = d["date"][:3]
                if month_key not in monthly_map:
                    monthly_map[month_key] = {"label": month_key, "aws": 0, "gcp": 0, "azure": 0, "total": 0}
                for k in ("aws", "gcp", "azure", "total"):
                    monthly_map[month_key][k] += d.get(k, 0)
            except Exception:
                pass
        if monthly_map:
            real_monthly = list(monthly_map.values())

    return build_comparison_payload(providers_info, budgets=budgets, real_monthly=real_monthly)


# ── ALL RESOURCES — full inventory from every connected provider ────────

@app.get("/api/all-resources")
def all_resources_endpoint(mode: str = "mock", uid: str = ""):
    """
    Returns every provisioned resource (EC2, RDS, S3, Lambda, EKS, ECS,
    Azure VMs, Storage Accounts, GCP Compute) with type, state, region.
    Real mode uses live cloud APIs; mock mode derives from billing services.
    """
    org_creds = _build_org_creds_for_uid(uid) if mode != "mock" else {}
    if mode == "real" and org_creds:
        data = _get_cached_real_data(uid)
        merged = []
        for p in ("aws", "gcp", "azure"):
            pdata = data.get("providers", {}).get(p, {})
            for r in pdata.get("all_resources", []):
                merged.append(r)
        if merged:
            return {"source": "live", "resources": merged, "total": len(merged)}

    # Mock fallback — derive resources from billing services list
    data = _get_data("mock")
    fallback = []
    for p, pdata in data.get("providers", {}).items():
        for svc in pdata.get("services", []):
            fallback.append({
                "name": svc.get("name", "Service"),
                "type": svc.get("name", "Service"),
                "id": f"mock-{p}-{svc.get('name','').replace(' ','-').lower()}",
                "region": "us-east-1",
                "state": svc.get("status", "healthy"),
                "provider": p, "family": "Other",
                "cost": svc.get("cost", 0),
                "pct": svc.get("pct", 0),
            })
    return {"source": "mock", "resources": fallback, "total": len(fallback)}


# ── NAMED RESOURCES — real user-defined names + specs ─────────────────

@app.get("/api/resources/named")
def named_resources(mode: str = "real", uid: str = ""):
    """
    Return all resources with user-defined names and full specs
    from every connected cloud provider.
    """
    try:
        from real_data import get_named_resources
    except ModuleNotFoundError:
        from .real_data import get_named_resources

    org_creds = _build_org_creds_for_uid(uid) if mode != "mock" else {}
    if mode == "real" and org_creds:
        resources = get_named_resources(org_creds)
        if resources:
            return {"source": "live", "resources": resources}

    # Fallback: build resource list from mock services data
    data = _get_data("mock")
    fallback = []
    for p, pdata in data.get("providers", {}).items():
        for svc in pdata.get("services", []):
            fallback.append({
                "provider": p.upper(),
                "type": svc.get("name", "Service"),
                "user_name": svc.get("name", "—"),
                "resource_id": "—",
                "region": "us-east-1",
                "state": svc.get("status", "healthy"),
                "specs": {
                    "Monthly Cost": f"${svc.get('cost', 0):,.2f}",
                    "% of Provider": f"{svc.get('pct', 0)}%",
                },
                "tags": {},
            })
    return {"source": "mock", "resources": fallback}
