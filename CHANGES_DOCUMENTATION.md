# CloudNexus — Changes Documentation
**From: Initial GitHub Pull (`56114f4`) → Current State**
**Prepared: 2026-07-03**

---

## Table of Contents
1. [Summary of What Changed](#1-summary-of-what-changed)
2. [File-by-File Changes](#2-file-by-file-changes)
3. [EC2 Deployment Guide — What to Copy vs What NOT to Copy](#3-ec2-deployment-guide)

---

## 1. Summary of What Changed

| Area | What Was Fixed / Added |
|---|---|
| Billing — Invoice Tab | Wrong API URL (`localhost:8001` → correct relative URL). All amounts now show exact decimals, not rounded integers. |
| Billing — Overview Tab | AWS/Azure cost filter was zeroing out totals for small accounts. Fixed. Forecast card now uses ML ensemble value. |
| Billing — Cross Cloud FinOps | Broken decimal display fixed. `$` amounts now show 2 decimal places everywhere. |
| Billing — Forecast Tab | Removed `Math.round()` from all forecast values. |
| Monitoring — Cold Period Cascade | When cold period ends: ALL org users' sessions are now revoked (not just admin). Deletion emails sent to admin, each user, and super admin. |
| Monitoring — Demo Expiry Email | Email now fires to `aniket.singh@core5.co.in` when any demo account expires and enters cold period. |
| Monitoring — Admin SA Email | Super admin login email separated from notification email. Login: `core5@core5.co.in`. Alerts go to: `aniket.singh@core5.co.in`. |
| Monitoring — Super Admin Password | Old bcrypt hash in `.env` didn't match `Core5@2022`. Regenerated correct hash. |
| Monitoring — User Account Persistence | Admin-created user accounts disappeared on page refresh (fire-and-forget API call). Now awaits DB confirmation before updating UI. |
| Monitoring — Demo Timer | Changed from 3 minutes → 1 month (30 days). |
| Monitoring — Free Email Block | `@gmail.com`, `@yahoo.com`, `@hotmail.com` and 30+ free email domains are now blocked on all account creation endpoints. |
| Monitoring — Unique Domain Enforcement | One organisation per email domain, enforced always for public registration regardless of sector/industry. |
| Landing Page | All occurrences of `CloudNexus` renamed to `MyCloudNexus`. Bundle plan price changed from `₹10,000` → `₹1`. |
| Admin Portal | Bundle plan price `₹10,000` → `₹1` on all plan cards and buttons (16 occurrences). User creation made async with real error handling. |
| Super Admin Portal | SA_EMAIL separated into login credential vs notification email. Test Email button added then removed. Login placeholder corrected. |
| Database | Wiped clean — all test admins and users deleted. Only one `cloudnexus.db` remains at project root. |

**Total: 43 files changed, 3,605 insertions, 1,398 deletions**

---

## 2. File-by-File Changes

---

### BILLING TOOL

---

#### `Billing_tool/Cloudnexus-billing-main/backend/real_data.py`
**What changed:**
- **AWS cost filter** (line ~305): Was `if cost < 0.5: continue` which skipped costs under $0.50 from the MTD total — causing Overview to show $0.00 for small accounts. Fixed: every non-zero cost always adds to `total_mtd`; only costs < $0.01 are excluded from the breakdown *list*.
- **Azure cost filter** (line ~1253): Same bug, same fix.
- **Percentage calculation**: Was `round(pct)` (integer). Now `round(pct, 1)` (one decimal).
- **`savings_found`**: Was `round(total * 0.097)` (no decimal argument = integer). Now `round(total * 0.097, 2)`.
- **AWS thread pool timeout**: Increased from 25s → 60s total, 5s → 10s per future, wrapped in try/except to prevent crash.
- **S3 bucket scan**: Limited to first 10 buckets (`buckets[:10]`) with 15s timeout (was unlimited with 30s).
- **AWS connection timeouts**: Reduced from 4s/8s → 3s/6s for faster failure detection.
- **Error logging**: Added `print(f"[billing] _fetch_aws_data FAILED: ...")` for easier debugging.

**Before vs After (key section):**
```python
# BEFORE — wrong: small costs silently excluded from total
if cost < 0.5: continue
total_mtd += cost
services.append(...)

# AFTER — correct: total always gets all non-zero costs
if cost <= 0: continue
total_mtd += cost   # always included
if cost >= 0.01:    # only filter the display list
    services.append(...)
```

---

#### `Billing_tool/Cloudnexus-billing-main/frontend/src/App.jsx`
**What changed:**
- Removed `Math.round()` from all four columns in `MonthlyOverviewTable` rows (`aws`, `gcp`, `azure`, `total`).
- **Overview "30-Day Forecast" card**: Was using `overview.forecast_30d` (simple linear). Now uses `forecast?.total_30d ?? overview.forecast_30d` (ML Holt-Winters ensemble). This fixed the mismatch between Overview ($10) and Forecast tab ($19).

---

#### `Billing_tool/Cloudnexus-billing-main/frontend/src/components/InvoicePanel.jsx`
**What changed:**
- **Critical bug fix**: Removed `const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8001'`. The billing backend is on port **8000**, not 8001 — every invoice fetch was throwing a network error, catch block silently set `invoices = []`, making total YTD show $0.00.
- Now imports `fetchInvoices` and `fetchMonthlyTrend` from `../services/api` which use relative URLs (correctly proxied).
- Removed `Math.round()` from all amount cells in `MonthlyTrendPanel`.
- Removed `Math.round()` from `totalYTD` display.
- Branding: `CloudNexus` → `MyCloudNexus` in PDF invoice template.

**Before vs After:**
```js
// BEFORE — wrong port, silent failure
const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8001';
fetch(`${BASE}/api/invoices/...`)

// AFTER — correct relative URL via proxy
import { fetchInvoices } from '../services/api';
const data = await fetchInvoices(activeProvider, mode);
```

---

#### `Billing_tool/Cloudnexus-billing-main/frontend/src/components/CostComparisonPanel.jsx`
**What changed:**
- Removed `$XK` abbreviation from local `fmt()` function — now always shows full decimal value.
- Removed `Math.round()` from `buildComparison`: `mtd`, `cost_per_service`, `top_service_cost`, all budget values.
- Fixed `buildMonthlyFromTrend` and `crossTable.monthly` — removed integer rounding.
- Savings estimates kept to 2dp: `Math.round(mtd * 0.082 * 100) / 100`.

---

#### `Billing_tool/Cloudnexus-billing-main/frontend/src/components/CrossCloudAnalysis.jsx`
**What changed:**
- Fixed `Money` component: `minimumFractionDigits: 0` → `minimumFractionDigits: 2`. This was causing all dollar amounts to show without cents (e.g. `$592` instead of `$592.50`).

---

#### `Billing_tool/Cloudnexus-billing-main/frontend/src/components/ForecastPanelV2.jsx`
**What changed:**
- Removed `Math.round()` from forecast amounts in both the per-provider forecast calculation and the display value.

---

#### `Billing_tool/Cloudnexus-billing-main/frontend/src/utils/theme.js`
**What changed:**
- Fixed `fmt.usd()`: Added `minimumFractionDigits: 2, maximumFractionDigits: 2` so amounts always show exactly 2 decimal places (e.g. `$592.50` not `$593`).

**Before vs After:**
```js
// BEFORE
usd: (v) => '$' + Number(v).toLocaleString()

// AFTER
usd: (v) => '$' + Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
```

---

#### `Billing_tool/Cloudnexus-billing-main/frontend/src/services/api.js`
**What changed:**
- Minor — confirmed `fetchInvoices` and `fetchMonthlyTrend` exports exist and use `getApiBase()` for correct relative URL routing.

---

### MONITORING TOOL

---

#### `Monitoring tool/CLOUDNEXUS-MONITORING-main/backend/server.js`
**What changed (556 lines changed — largest file):**

**1. Demo account timer**
```js
// BEFORE
const demoExpiresAt = Date.now() + 180000; // 3 minutes

// AFTER
const demoExpiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000; // 1 month (30 days)
```

**2. Welcome email label**
```
BEFORE: Demo Trial (3 minutes)
AFTER:  Demo Trial (1 month)
```

**3. Super admin email separation**
```js
// BEFORE — SA_EMAIL did double duty: login AND notifications
const SA_EMAIL = process.env.SA_EMAIL || 'core5@core5.co.in';

// AFTER — split into two separate constants
const SA_EMAIL        = process.env.SA_EMAIL        || 'core5@core5.co.in';        // login only
const SA_NOTIFY_EMAIL = process.env.SA_NOTIFY_EMAIL || 'aniket.singh@core5.co.in'; // all alerts
```
All three `sendMail` calls (demo expired, account deleted, test) now use `SA_NOTIFY_EMAIL`.

**4. Cold period cascade — session revocation for ALL users**
```js
// BEFORE — only admin session revoked
revokedSessions.add(admin.email.toLowerCase().trim());
persistRevocations();
orgEmails.forEach(cascadeDeleteUserData);
io.emit('session:revoked', { email: admin.email });

// AFTER — every org member session revoked
orgEmails.forEach(e => revokedSessions.add(e.toLowerCase().trim()));
persistRevocations();
orgEmails.forEach(cascadeDeleteUserData);
orgEmails.forEach(e => io.emit('session:revoked', { email: e.toLowerCase().trim() }));
io.emit('admin:deleted', { email: admin.email.toLowerCase().trim() });
```
Added 3 deletion emails: to admin, to each org user, to `SA_NOTIFY_EMAIL`.

**5. Phase 1 (demo → cold period) email to SA_NOTIFY_EMAIL**
- Email now fires to `aniket.singh@core5.co.in` when any demo account's trial ends.
- Subject: `Demo Ended: {name} ({company}) — Contact Required`

**6. Free email domain blocklist**
```js
const FREE_EMAIL_DOMAINS = new Set([
  'gmail.com', 'yahoo.com', 'yahoo.in', 'hotmail.com', 'outlook.com',
  'icloud.com', 'rediffmail.com', 'protonmail.com', 'zoho.com', 'aol.com',
  // ... 30+ total
]);
```
Applied to both public registration and super admin create-admin endpoints.

**7. Unique domain enforcement (always on for public registration)**
```js
// BEFORE — conditional on saSettings toggle
if (saSettings.uniqueDomains && domain) { ... }

// AFTER — always enforced for public registration
// (saSettings.uniqueDomains toggle only affects SA-created accounts)
const _domainRows = _domainCheckDb.exec(
  "SELECT email FROM users WHERE role='admin' AND org_admin IS NULL AND LOWER(email) LIKE ?",
  [`%@${domain}`]
);
if (_domainRows[0]?.values?.length > 0) {
  return res.status(400).json({ error: `An organisation with domain @${domain} already has an account.` });
}
```

**8. SMTP startup verification**
```js
server.listen(PORT, () => {
  reportService.transporter.verify((err) => {
    if (err) logger.error(`[smtp] Connection failed: ${err.message}`);
    else     logger.info(`[smtp] Connected OK — notify=${SA_NOTIFY_EMAIL}`);
  });
});
```

**9. Test email endpoint** (added then removed from UI, endpoint still exists in backend)

---

#### `Monitoring tool/CLOUDNEXUS-MONITORING-main/backend/cloudnexus_db.cjs`
**What changed:**
- **`getExpiredColdPeriodAdmins()`**: Added LEFT JOIN with `orgs` table to also return `name` and `companyName`. Previously only returned `email`, causing deletion emails to say "Hi there" instead of the real name.

**Before vs After:**
```js
// BEFORE — no name
const rows = _db.exec(
  `SELECT u.email FROM users u WHERE ...`,
  [now]
);
return rows[0]?.values.map(r => ({ email: r[0] }));

// AFTER — includes name and company
const rows = _db.exec(
  `SELECT u.email, u.name, o.company_name FROM users u
   LEFT JOIN orgs o ON LOWER(o.admin_email) = LOWER(u.email)
   WHERE ...`,
  [now]
);
return rows[0]?.values.map(r => ({ email: r[0], name: r[1], companyName: r[2] }));
```

---

#### `Monitoring tool/CLOUDNEXUS-MONITORING-main/backend/active_sessions.json`
**What changed:** Reset to `{}` (wiped all active sessions when DB was cleared).
**On EC2:** Do NOT copy this file. Leave whatever is on EC2 as-is.

---

#### `Monitoring tool/CLOUDNEXUS-MONITORING-main/backend/revoked_sessions.json`
**What changed:** Reset to `[]`.
**On EC2:** Do NOT copy this file.

---

#### `Monitoring tool/CLOUDNEXUS-MONITORING-main/backend/report_schedules.json`
**What changed:** Reset to `[]`.
**On EC2:** Do NOT copy this file.

---

#### `Monitoring tool/CLOUDNEXUS-MONITORING-main/backend/user_activity_log.json`
**What changed:** Reset to `[]`.
**On EC2:** Do NOT copy this file.

---

#### `Monitoring tool/CLOUDNEXUS-MONITORING-main/backend/superadmin_settings.json`
**What changed:** `uniqueDomains` flag may differ.
**On EC2:** Do NOT copy this — EC2 may have different settings. Configure manually.

---

#### `Monitoring tool/CLOUDNEXUS-MONITORING-main/frontend/src/components/AISuggestions.jsx`
**What changed:** Large refactor of AI suggestions panel (1,375 lines). Primarily branding (`CloudNexus` → `MyCloudNexus`) and UI improvements.

---

#### `Monitoring tool/CLOUDNEXUS-MONITORING-main/frontend/src/App.jsx`
**What changed:** Branding updates, demo/cold-period countdown UI integration, service click logging.

---

### MAIN LANDING PAGE / AUTH

---

#### `src/components/AdminPortal.jsx`
**What changed:**
- **User account persistence fix**: `handleCreate()` changed from fire-and-forget to `async/await`. Now waits for DB confirmation before updating UI. Shows real errors if backend rejects creation. Calls `loadUsersFromDB(orgScope)` after success to get real DB user (not fake local ID).
- **Branding**: `cloudnexus.com` → `mycloudnexus.com` in activity log path formatting (8 occurrences).
- **Audit log export**: File names `cloudnexus-log-*.csv` → `mycloudnexus-log-*.csv`.
- **Demo/cold period polling**: Polls `/auth/demo-status` every 3s when demo is active.

**Before vs After (critical fix):**
```js
// BEFORE — fire and forget, UI updates with fake ID before DB confirms
apiFetch('/auth/register-org-user', { ... }).catch(() => {});
updateUsers([...users, newUser]); // newUser has fake id: "u_" + Date.now()

// AFTER — waits for DB confirmation
async function handleCreate() {
  setFormErr("Creating…");
  const res = await apiFetch('/auth/register-org-user', { ... });
  const data = await res.json();
  if (!res.ok) { setFormErr(data?.error || "Server error"); return; }
  loadUsersFromDB(orgScope); // reload real record from DB
}
```

---

#### `src/components/PricingPage.jsx`
**What changed:**
- Bundle plan price: `₹10,000` → `₹1`
- Plans showing "Contact Us" were not changed.
- Branding: `CloudNexus` → `MyCloudNexus` in FAQ answers.

---

#### `src/components/SuperAdminPortal.jsx`
**What changed:**
- Login email placeholder: `core5@core5.co.in` → corrected back to `core5@core5.co.in` (went through `aniket.singh@core5.co.in` briefly, reverted).
- SA create-admin form: Added company name, subdomain, industry, country, timezone fields (multi-step form).
- Demo/cold period countdown cards shown per admin.
- "Demo / Trial" stat card added to header.
- Company name, industry, country, domain shown under each admin's email.
- Test Email button: added then removed (backend endpoint still exists).
- Login subtitle: `CloudNexus` → `MyCloudNexus`.

---

#### `src/components/AuthPage.jsx`
**What changed:** Large update (660 lines). Registration flow enhancements, branding updates.

---

#### `src/components/Landing.jsx`, `Navbar.jsx`, `Footer.jsx`, `FeaturesPage.jsx`, `AboutPage.jsx`, `ActivationPage.jsx`
**What changed:** All branding-only changes — `CloudNexus` → `MyCloudNexus` throughout.

---

#### `.env` (root)
**What changed:**
```
# BEFORE
SA_EMAIL=core5@core5.co.in
SA_PASS_HASH=$2b$12$t/deJu/T2GKCPOe1T5vGN.R5Uf7lPUE37smYCWEgSzAsocWAynnpy

# AFTER
SA_EMAIL=core5@core5.co.in
SA_NOTIFY_EMAIL=aniket.singh@core5.co.in
SA_PASS_HASH=$2b$12$YNZxRRKb.6IJUsOrp65bB.bNWZIBF0GOyRis.ZhsjRTEq611G8.im
```
`SA_PASS_HASH` now correctly corresponds to password `Core5@2022`.

---

#### `package.json` / `package-lock.json`
**What changed:** Dependency updates. `package-lock.json` has 1,258-line diff due to lockfile regeneration.

---

## 3. EC2 Deployment Guide

### The Answer: It Depends on the File

You **cannot blindly drop all files** onto EC2. Most code files are safe to copy. A small number of files are dangerous to copy and will break production or erase data.

---

### Files SAFE to Copy Directly to EC2

These are pure code files. Drop them in and restart services.

**Billing Tool:**
| File | Safe? | Notes |
|---|---|---|
| `Billing_tool/.../backend/real_data.py` | YES | Core bug fixes — must deploy |
| `Billing_tool/.../backend/main.py` | YES | Minor fixes |
| `Billing_tool/.../frontend/src/App.jsx` | YES | Overview + forecast fixes |
| `Billing_tool/.../frontend/src/components/InvoicePanel.jsx` | YES | Critical URL fix |
| `Billing_tool/.../frontend/src/components/CostComparisonPanel.jsx` | YES | Decimal fixes |
| `Billing_tool/.../frontend/src/components/CrossCloudAnalysis.jsx` | YES | Decimal fix |
| `Billing_tool/.../frontend/src/components/ForecastPanelV2.jsx` | YES | Decimal fix |
| `Billing_tool/.../frontend/src/services/api.js` | YES | |
| `Billing_tool/.../frontend/src/utils/theme.js` | YES | fmt.usd decimal fix |
| `Billing_tool/.../frontend/src/utils/reportExport.js` | YES | |
| `Billing_tool/.../frontend/index.html` | YES | |

**Monitoring Tool:**
| File | Safe? | Notes |
|---|---|---|
| `Monitoring tool/.../backend/server.js` | YES | Many fixes — must deploy |
| `Monitoring tool/.../backend/cloudnexus_db.cjs` | YES | `getExpiredColdPeriodAdmins` fix |
| `Monitoring tool/.../frontend/src/App.jsx` | YES | |
| `Monitoring tool/.../frontend/src/components/AISuggestions.jsx` | YES | |
| `Monitoring tool/.../frontend/src/components/ExportModal.jsx` | YES | |
| `Monitoring tool/.../frontend/src/components/ResourceDetailDrawer.jsx` | YES | |
| `Monitoring tool/.../frontend/src/utils/api.js` | YES | |
| `Monitoring tool/.../frontend/src/utils/exportReport.js` | YES | |
| `Monitoring tool/.../frontend/index.html` | YES | |

**Main Landing / Auth:**
| File | Safe? | Notes |
|---|---|---|
| `src/components/AdminPortal.jsx` | YES | User persistence fix — must deploy |
| `src/components/PricingPage.jsx` | YES | Price change |
| `src/components/SuperAdminPortal.jsx` | YES | SA portal fixes |
| `src/components/AuthPage.jsx` | YES | |
| `src/components/Landing.jsx` | YES | |
| `src/components/Navbar.jsx` | YES | |
| `src/components/Footer.jsx` | YES | |
| `src/components/FeaturesPage.jsx` | YES | |
| `src/components/AboutPage.jsx` | YES | |
| `src/components/ActivationPage.jsx` | YES | |
| `src/App.jsx` | YES | |
| `src/components/App.jsx` | YES | |
| `index.html` | YES | |
| `vite.config.js` | YES | |
| `cloudnexus_db.cjs` | YES | Root-level DB helper |
| `cloudnexus_db.py` | YES | Root-level Python DB helper |
| `package.json` | YES | |

---

### Files DO NOT Copy to EC2

| File | Why NOT to Copy |
|---|---|
| `.env` | EC2 has its own production secrets — SMTP credentials, Razorpay keys, DB path, SA hash. Copying local `.env` would overwrite production secrets. Manually add only `SA_NOTIFY_EMAIL=aniket.singh@core5.co.in` and update `SA_PASS_HASH` on EC2 if needed. |
| `cloudnexus.db` | Local DB was wiped clean (empty). Copying it to EC2 would DELETE all production users and data. Never copy the DB. |
| `Monitoring tool/.../backend/active_sessions.json` | Runtime session state. Copying would invalidate all currently-logged-in users on EC2. |
| `Monitoring tool/.../backend/revoked_sessions.json` | Runtime revocation list. Leave as-is on EC2. |
| `Monitoring tool/.../backend/report_schedules.json` | User-configured report schedules on EC2. Copying resets them. |
| `Monitoring tool/.../backend/user_activity_log.json` | Live activity logs. Copying overwrites them. |
| `Monitoring tool/.../backend/superadmin_settings.json` | May differ on prod (e.g. `uniqueDomains` setting). Configure manually. |
| `package-lock.json` | Node version on EC2 may differ. Run `npm install` on EC2 instead — do not copy this file. |

---

### What to Do on EC2 After Copying Code Files

1. **Copy all safe code files** listed above to their exact paths on EC2.
2. **Do NOT copy** any file from the "Do Not Copy" list.
3. **Edit `.env` on EC2** — add only these two lines (do not overwrite the whole file):
   ```
   SA_NOTIFY_EMAIL=aniket.singh@core5.co.in
   SA_PASS_HASH=$2b$12$YNZxRRKb.6IJUsOrp65bB.bNWZIBF0GOyRis.ZhsjRTEq611G8.im
   ```
4. **Run `npm install`** in the monitoring backend directory (to pick up any new packages).
5. **Run `pip install -r requirements.txt`** in the billing backend directory.
6. **Restart all services**:
   - Monitoring backend (port 3001)
   - Billing backend (port 8000)
   - Rebuild frontend: `npm run build` in both frontend directories
7. **Verify on EC2**: Check the startup log for `[smtp] Connected OK — notify=aniket.singh@core5.co.in`

---

*End of Documentation*
