'use strict';
const path      = require('path');
const fs        = require('fs');
const crypto    = require('crypto');
const bcrypt    = require('bcryptjs');
const initSqlJs = require('sql.js');

const _projectRoot = path.resolve(__dirname, '..', '..', '..');
const DB_PATH = process.env.DB_PATH
  ? path.resolve(_projectRoot, process.env.DB_PATH)
  : path.join(__dirname, 'cloudnexus.db');

let _db        = null;
let _saveTimer = null;

function _scheduleSave() {
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(_persist, 2000);
}
function _persist() {
  if (!_db) return;
  fs.writeFileSync(DB_PATH, Buffer.from(_db.export()));
}

function _rows(result) {
  if (!result.length) return [];
  const cols = result[0].columns;
  return result[0].values.map(r => Object.fromEntries(cols.map((c, i) => [c, r[i]])));
}

async function initDB() {
  const SQL = await initSqlJs();
  _db = fs.existsSync(DB_PATH)
    ? new SQL.Database(fs.readFileSync(DB_PATH))
    : new SQL.Database();

  // Base tables
  _db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT    NOT NULL,
      email         TEXT    UNIQUE NOT NULL,
      password_hash TEXT    NOT NULL,
      totp_secret   TEXT,
      mfa_enabled   INTEGER DEFAULT 0,
      created_at    TEXT    DEFAULT (datetime('now')),
      last_login    TEXT
    );
  `);
  _db.run(`
    CREATE TABLE IF NOT EXISTS logs (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_email TEXT,
      action     TEXT NOT NULL,
      provider   TEXT,
      tool       TEXT,
      details    TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_logs_email ON logs(user_email);
    CREATE INDEX IF NOT EXISTS idx_logs_tool  ON logs(tool);
  `);
  _db.run(`
    CREATE TABLE IF NOT EXISTS cloud_sessions (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      tool            TEXT NOT NULL,
      provider        TEXT NOT NULL,
      credentials_enc TEXT NOT NULL,
      connected_at    TEXT DEFAULT (datetime('now')),
      expires_at      TEXT NOT NULL,
      UNIQUE(tool, provider)
    );
  `);

  // ── Orgs table — one row per admin, org_name = email domain ───────────────
  _db.run(`
    CREATE TABLE IF NOT EXISTS orgs (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      org_name    TEXT    NOT NULL,
      admin_email TEXT    UNIQUE NOT NULL,
      created_at  TEXT    DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_orgs_admin ON orgs(admin_email);
  `);

  // ── Multi-tenant column migrations (safe: silently skip if already exist) ──
  const migrations = [
    "ALTER TABLE users ADD COLUMN role              TEXT DEFAULT 'user'",
    "ALTER TABLE users ADD COLUMN org_admin         TEXT",
    "ALTER TABLE users ADD COLUMN subscription_plan TEXT",
    "ALTER TABLE users ADD COLUMN plan_purchased_at INTEGER",
    "ALTER TABLE users ADD COLUMN plan_paused_at    INTEGER",
    "ALTER TABLE users ADD COLUMN photo             TEXT",
    "ALTER TABLE users ADD COLUMN tools             TEXT DEFAULT '[\"monitoring\",\"billing\"]'",
    "ALTER TABLE logs  ADD COLUMN org_admin         TEXT",
    "ALTER TABLE users ADD COLUMN deleted_at        TEXT",
    "ALTER TABLE users ADD COLUMN deleted_by        TEXT",
    "ALTER TABLE users ADD COLUMN demo_expires_at     INTEGER",
    "ALTER TABLE users ADD COLUMN cold_period_ends_at INTEGER",
    "ALTER TABLE orgs ADD COLUMN company_name TEXT",
    "ALTER TABLE orgs ADD COLUMN subdomain    TEXT",
    "ALTER TABLE orgs ADD COLUMN domain       TEXT",
    "ALTER TABLE orgs ADD COLUMN industry     TEXT",
    "ALTER TABLE orgs ADD COLUMN country      TEXT",
    "ALTER TABLE orgs ADD COLUMN timezone     TEXT",
  ];
  for (const sql of migrations) { try { _db.run(sql); } catch {} }

  // ── cloud_sessions: add org_admin column (requires table recreation for new UNIQUE) ──
  try {
    const colInfo = _db.exec("PRAGMA table_info(cloud_sessions)");
    const existingCols = _rows(colInfo).map(r => r.name);
    if (!existingCols.includes('org_admin')) {
      _db.run(`CREATE TABLE cloud_sessions_v2 (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        tool            TEXT NOT NULL,
        provider        TEXT NOT NULL,
        org_admin       TEXT NOT NULL DEFAULT '',
        credentials_enc TEXT NOT NULL,
        connected_at    TEXT DEFAULT (datetime('now')),
        expires_at      TEXT NOT NULL,
        UNIQUE(tool, provider, org_admin)
      )`);
      _db.run(`INSERT OR IGNORE INTO cloud_sessions_v2
        (tool, provider, org_admin, credentials_enc, connected_at, expires_at)
        SELECT tool, provider, '', credentials_enc, connected_at, expires_at FROM cloud_sessions`);
      _db.run(`DROP TABLE cloud_sessions`);
      _db.run(`ALTER TABLE cloud_sessions_v2 RENAME TO cloud_sessions`);
      console.log('[DB] Migrated cloud_sessions — added org_admin column');
    }
  } catch (e) { console.log('[DB] cloud_sessions migration:', e.message); }

  // ── Cloud Accounts (multi-account-per-provider credential model) ──────────
  _db.run(`
    CREATE TABLE IF NOT EXISTS cloud_accounts (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      org_admin       TEXT    NOT NULL,
      provider        TEXT    NOT NULL CHECK(provider IN ('aws','gcp','azure')),
      label           TEXT    NOT NULL,
      credentials_enc TEXT    NOT NULL,
      account_meta    TEXT,
      status          TEXT    NOT NULL DEFAULT 'active',
      created_at      TEXT    DEFAULT (datetime('now')),
      created_by      TEXT    NOT NULL,
      updated_at      TEXT    DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_cloud_accounts_org ON cloud_accounts(org_admin);

    CREATE TABLE IF NOT EXISTS cloud_account_access (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id  INTEGER NOT NULL,
      user_email  TEXT    NOT NULL,
      granted_at  TEXT    DEFAULT (datetime('now')),
      granted_by  TEXT,
      UNIQUE(account_id, user_email)
    );
    CREATE INDEX IF NOT EXISTS idx_cloud_account_access_user ON cloud_account_access(user_email);
  `);

  // ── Active account per user per provider ──────────────────────────────────
  _db.run(`
    CREATE TABLE IF NOT EXISTS user_primary_accounts (
      user_email TEXT NOT NULL,
      provider   TEXT NOT NULL,
      account_id INTEGER NOT NULL,
      set_at     TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (user_email, provider)
    );
  `);

  // ── Account activation tokens ─────────────────────────────────────────────
  _db.run(`
    CREATE TABLE IF NOT EXISTS activation_tokens (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      email      TEXT    NOT NULL,
      token      TEXT    UNIQUE NOT NULL,
      expires_at TEXT    NOT NULL,
      used_at    TEXT,
      created_at TEXT    DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_activation_token ON activation_tokens(token);
  `);

  // ── Generic API connectors (usage & billing monitoring for any provider) ──
  _db.run(`
    CREATE TABLE IF NOT EXISTS connectors (
      id                     INTEGER PRIMARY KEY AUTOINCREMENT,
      org_admin              TEXT    NOT NULL,
      name                   TEXT    NOT NULL,
      base_url               TEXT    NOT NULL,
      usage_path             TEXT    NOT NULL,
      auth_type              TEXT    NOT NULL CHECK(auth_type IN ('api_key_header','bearer','basic')),
      auth_config_enc        TEXT    NOT NULL,
      field_mapping          TEXT    NOT NULL,
      poll_frequency_minutes INTEGER NOT NULL DEFAULT 60,
      threshold_cost         REAL,
      threshold_usage        REAL,
      alert_emails           TEXT,
      last_breach_state      INTEGER NOT NULL DEFAULT 0,
      template_id            TEXT,
      status                 TEXT    NOT NULL DEFAULT 'active',
      last_polled_at         TEXT,
      last_error             TEXT,
      created_at             TEXT    DEFAULT (datetime('now')),
      created_by             TEXT    NOT NULL,
      updated_at             TEXT    DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_connectors_org ON connectors(org_admin);

    CREATE TABLE IF NOT EXISTS connector_usage (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      connector_id INTEGER NOT NULL,
      provider     TEXT,
      total_cost   REAL,
      usage_amount REAL,
      unit         TEXT,
      ts           TEXT,
      fetched_at   TEXT DEFAULT (datetime('now')),
      raw_response TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_connector_usage_connector ON connector_usage(connector_id, fetched_at);
  `);

  // ── AI provider billing/usage monitoring ───────────────────────────────────
  // provider is a free-text slug (openai, anthropic, gemini, azure_openai,
  // bedrock, vertex_ai, ...) — no CHECK constraint so new providers can be
  // added without a schema change.
  _db.run(`
    CREATE TABLE IF NOT EXISTS ai_provider_credentials (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      org_admin       TEXT    NOT NULL,
      provider        TEXT    NOT NULL,
      label           TEXT    NOT NULL,
      credentials_enc TEXT    NOT NULL,
      status          TEXT    NOT NULL DEFAULT 'active',
      last_polled_at  TEXT,
      last_error      TEXT,
      created_at      TEXT    DEFAULT (datetime('now')),
      created_by      TEXT    NOT NULL,
      updated_at      TEXT    DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_ai_provider_credentials_org ON ai_provider_credentials(org_admin);

    CREATE TABLE IF NOT EXISTS ai_usage_events (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      credential_id INTEGER NOT NULL,
      org_admin     TEXT    NOT NULL,
      provider      TEXT    NOT NULL,
      team_or_user  TEXT,
      model         TEXT,
      tokens_in     INTEGER,
      tokens_out    INTEGER,
      units_consumed REAL,
      cost_usd      REAL    NOT NULL DEFAULT 0,
      period_start  TEXT    NOT NULL,
      period_end    TEXT    NOT NULL,
      source        TEXT    NOT NULL DEFAULT 'collector',
      ingested_at   TEXT    DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_ai_usage_events_org      ON ai_usage_events(org_admin, provider, period_start);
    CREATE INDEX IF NOT EXISTS idx_ai_usage_events_cred     ON ai_usage_events(credential_id, period_start);

    CREATE TABLE IF NOT EXISTS ai_budgets (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      org_admin     TEXT    NOT NULL,
      scope         TEXT    NOT NULL CHECK(scope IN ('key','team','org')),
      scope_id      TEXT,
      threshold_usd REAL    NOT NULL,
      period        TEXT    NOT NULL CHECK(period IN ('daily','weekly','monthly')) DEFAULT 'monthly',
      warn_pct      REAL    NOT NULL DEFAULT 0.7,
      status        TEXT    NOT NULL DEFAULT 'active',
      created_at    TEXT    DEFAULT (datetime('now')),
      created_by    TEXT    NOT NULL,
      updated_at    TEXT    DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_ai_budgets_org ON ai_budgets(org_admin);

    CREATE TABLE IF NOT EXISTS ai_alerts_sent (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      budget_id  INTEGER NOT NULL,
      channel    TEXT    NOT NULL DEFAULT 'email',
      level      TEXT    NOT NULL CHECK(level IN ('warning','exceeded')),
      period_key TEXT    NOT NULL,
      sent_at    TEXT    DEFAULT (datetime('now')),
      UNIQUE(budget_id, level, period_key)
    );
    CREATE INDEX IF NOT EXISTS idx_ai_alerts_sent_budget ON ai_alerts_sent(budget_id);
  `);

  // ── Seed migration: promote existing self-registered users to admins ───────
  _runAdminSeedMigration();

  // ── One-time migration: legacy single-account cloud_sessions → cloud_accounts ──
  _migrateCloudSessionsToAccounts();

  _persist();
  console.log('[DB] SQLite initialized at', DB_PATH);
  return _db;
}

// Runs once on startup: any user with org_admin=NULL becomes an admin,
// gets an org row, and their old logs get org_admin stamped.
function _runAdminSeedMigration() {
  const admins = _rows(_db.exec("SELECT id,name,email FROM users WHERE org_admin IS NULL"));
  for (const u of admins) {
    const domain = u.email.split('@')[1] || u.email;
    // Mark role=admin
    _db.run("UPDATE users SET role='admin' WHERE email=?", [u.email]);
    // Create org row (ignore duplicate)
    try {
      _db.run("INSERT INTO orgs (org_name, admin_email) VALUES (?,?)", [domain, u.email]);
    } catch {}
    // Back-fill org_admin on their own logs
    _db.run("UPDATE logs SET org_admin=? WHERE user_email=? AND org_admin IS NULL", [u.email, u.email]);
  }
}

// Runs once: migrates legacy single-account-per-provider cloud_sessions rows
// into the new multi-account cloud_accounts model, granting every existing
// org user access so nobody loses a currently-working connection.
function _migrateCloudSessionsToAccounts() {
  const already = _rows(_db.exec('SELECT COUNT(*) as c FROM cloud_accounts'));
  if (already.length && already[0].c > 0) return;
  const sessions = _rows(_db.exec('SELECT * FROM cloud_sessions'));
  if (!sessions.length) return;
  for (const s of sessions) {
    if (!s.org_admin) continue;
    const label = `${String(s.provider).toUpperCase()} Account (migrated)`;
    _db.run(
      `INSERT INTO cloud_accounts (org_admin, provider, label, credentials_enc, status, created_by)
       VALUES (?,?,?,?, 'active', ?)`,
      [s.org_admin, s.provider, label, s.credentials_enc, s.org_admin]
    );
    const accountId = _db.exec('SELECT last_insert_rowid() as id')[0].values[0][0];
    const orgUsers = getOrgUsers(s.org_admin);
    const emails = new Set([s.org_admin, ...orgUsers.map(u => u.email)]);
    for (const email of emails) {
      try {
        _db.run(
          'INSERT OR IGNORE INTO cloud_account_access (account_id, user_email, granted_by) VALUES (?,?,?)',
          [accountId, (email || '').toLowerCase().trim(), s.org_admin]
        );
      } catch {}
    }
  }
  console.log(`[DB] Migrated ${sessions.length} cloud_sessions row(s) into cloud_accounts`);
}

function getDB() { return _db; }

// ── Users ──────────────────────────────────────────────────────────────────

async function createUser(name, email, password, totpSecret, orgAdmin = null, tools = null, role = 'user') {
  const hash = await bcrypt.hash(password, 10);
  const toolsJson = tools ? JSON.stringify(tools) : '["monitoring","billing"]';
  const userRole  = orgAdmin ? 'user' : role;
  try {
    _db.run(
      `INSERT INTO users (name, email, password_hash, totp_secret, mfa_enabled, org_admin, tools, role)
       VALUES (?,?,?,?,0,?,?,?)`,
      [name, email, hash, totpSecret || null, orgAdmin || null, toolsJson, userRole]
    );
    _persist(); // immediate write — never lose a newly created user on server restart
    return { success: true };
  } catch (e) {
    if (e.message.includes('UNIQUE')) return { error: 'Email already exists' };
    return { error: e.message };
  }
}

async function findUser(email, password) {
  const rows = _db.exec('SELECT * FROM users WHERE email = ?', [email]);
  if (!rows.length || !rows[0].values.length) return null;
  const user = _rows(rows)[0];
  if (!(await bcrypt.compare(password, user.password_hash))) return null;
  return user;
}

function getUserByEmail(email) {
  const rows = _db.exec('SELECT * FROM users WHERE email = ?', [email]);
  if (!rows.length || !rows[0].values.length) return null;
  return _rows(rows)[0];
}

// ── Org queries ────────────────────────────────────────────────────────────

function getAllOrgs() {
  const orgs = _rows(_db.exec('SELECT * FROM orgs ORDER BY created_at ASC'));
  return orgs.map(o => {
    const users = _rows(_db.exec(
      'SELECT id,name,email,tools,photo,created_at,last_login FROM users WHERE org_admin=? AND deleted_at IS NULL',
      [o.admin_email]
    ));
    const logsCount = _db.exec(
      'SELECT COUNT(*) FROM logs WHERE org_admin=?', [o.admin_email]
    );
    return {
      orgName: o.org_name,
      adminEmail: o.admin_email,
      companyName: o.company_name || null,
      subdomain: o.subdomain || null,
      domain: o.domain || null,
      industry: o.industry || null,
      country: o.country || null,
      timezone: o.timezone || null,
      createdAt: o.created_at,
      userCount: users.length,
      logCount: logsCount.length ? (logsCount[0].values[0][0] || 0) : 0,
      users,
    };
  });
}

function updateOrgInfo(adminEmail, { companyName, subdomain, domain, industry, country, timezone } = {}) {
  _db.run(
    `UPDATE orgs SET company_name=?, subdomain=?, domain=?, industry=?, country=?, timezone=? WHERE admin_email=?`,
    [companyName || null, subdomain || null, domain || null, industry || null, country || null, timezone || null, adminEmail]
  );
  _persist();
}

// Bulk-upsert users from localStorage into the correct admin's org
async function syncOrgUsers(adminEmail, localUsers) {
  const results = { created: 0, skipped: 0 };
  for (const u of localUsers) {
    if (!u.email || !u.name) { results.skipped++; continue; }
    const existing = _rows(_db.exec('SELECT id,org_admin FROM users WHERE email=?', [u.email]));
    if (existing.length) {
      // Already in DB — just make sure org_admin is set if missing
      if (!existing[0].org_admin) {
        _db.run('UPDATE users SET org_admin=? WHERE email=?', [adminEmail, u.email]);
        _db.run('UPDATE logs SET org_admin=? WHERE user_email=? AND org_admin IS NULL', [adminEmail, u.email]);
      }
      results.skipped++;
    } else {
      const pwd = u.password || Math.random().toString(36).slice(-10) + 'X1!';
      const hash = await bcrypt.hash(pwd, 10);
      const tools = u.tools ? JSON.stringify(u.tools) : '["monitoring","billing"]';
      try {
        _db.run(
          `INSERT INTO users (name,email,password_hash,mfa_enabled,org_admin,tools,role,created_at)
           VALUES (?,?,?,0,?,?,'user',datetime(?,'unixepoch'))`,
          [u.name, u.email, hash, adminEmail, tools,
           u.createdAt ? String(Math.floor(u.createdAt / 1000)) : null]
        );
        _db.run('INSERT INTO logs (user_email,action,tool,org_admin) VALUES (?,?,?,?)',
          [u.email, 'sync_from_localstorage', 'website', adminEmail]);
        results.created++;
      } catch { results.skipped++; }
    }
  }
  _scheduleSave();
  return results;
}

// All active (non-deleted) users for a specific admin's org
function getOrgUsers(adminEmail) {
  const rows = _db.exec(
    'SELECT id,name,email,role,mfa_enabled,created_at,last_login,tools,photo FROM users WHERE org_admin=? AND deleted_at IS NULL ORDER BY created_at ASC',
    [adminEmail]
  );
  return _rows(rows);
}

// Soft-deleted users still within the 7-day restore window
function getDeletedOrgUsers(adminEmail) {
  const rows = _db.exec(
    "SELECT id,name,email,role,deleted_at,deleted_by FROM users WHERE LOWER(org_admin)=LOWER(?) AND deleted_at IS NOT NULL AND deleted_at > datetime('now','-7 days') ORDER BY deleted_at DESC",
    [adminEmail]
  );
  return _rows(rows);
}

// Restore a soft-deleted user (clears deleted_at/deleted_by)
function restoreOrgUser(adminEmail, userEmail) {
  _db.run(
    'UPDATE users SET deleted_at=NULL, deleted_by=NULL WHERE LOWER(email)=LOWER(?) AND LOWER(org_admin)=LOWER(?)',
    [userEmail, adminEmail]
  );
  _persist();
}

// Hard-delete users whose 7-day restore window has expired
function purgeExpiredDeletedUsers() {
  _db.run("DELETE FROM users WHERE deleted_at IS NOT NULL AND deleted_at <= datetime('now','-7 days')");
  _persist();
}

// Legacy — all users (no org filter)
function getAllUsers() {
  const rows = _db.exec('SELECT id,name,email,mfa_enabled,created_at,last_login,org_admin FROM users ORDER BY created_at ASC');
  return _rows(rows);
}

// Soft-delete a user — keeps logs for audit, blocks login, 7-day restore window
function deleteOrgUser(adminEmail, userEmail, deletedBy) {
  const now = new Date().toISOString();
  _db.run(
    'UPDATE users SET deleted_at=?, deleted_by=? WHERE LOWER(email)=LOWER(?) AND LOWER(org_admin)=LOWER(?)',
    [now, deletedBy || adminEmail, userEmail, adminEmail]
  );
  _persist();
}

function deleteUser(email) {
  _db.run('DELETE FROM users WHERE email=?', [email]);
  _persist(); // immediate write
}

function updateUserTools(adminEmail, userEmail, tools) {
  _db.run('UPDATE users SET tools=? WHERE email=? AND org_admin=?',
    [JSON.stringify(tools), userEmail, adminEmail]);
  _persist();
}

function markMFAEnabled(email) {
  _db.run("UPDATE users SET mfa_enabled=1, last_login=? WHERE email=?", [new Date().toISOString(), email]);
  _scheduleSave();
}
function saveUserTOTPSecret(email, secret) {
  _db.run("UPDATE users SET totp_secret=? WHERE LOWER(email)=LOWER(?)", [secret || null, email]);
  _scheduleSave();
}
function updateLastLogin(email) {
  _db.run("UPDATE users SET last_login=? WHERE email=?", [new Date().toISOString(), email]);
  _scheduleSave();
}

// ── Photos ─────────────────────────────────────────────────────────────────

function savePhoto(email, photoBase64) {
  _db.run('UPDATE users SET photo=? WHERE LOWER(email)=LOWER(?)', [photoBase64 || null, email]);
  _persist(); // immediate disk write — never lose a photo on a restart
}

function getPhoto(email) {
  const rows = _db.exec('SELECT photo FROM users WHERE email=?', [email]);
  if (!rows.length || !rows[0].values.length) return null;
  return rows[0].values[0][0] || null;
}

// ── Subscription plan (admin users) ────────────────────────────────────────

function updateAdminPlan(adminEmail, plan, purchasedAt) {
  _db.run(
    'UPDATE users SET subscription_plan=?, plan_purchased_at=?, plan_paused_at=NULL WHERE email=?',
    [plan || null, purchasedAt || null, adminEmail]
  );
  _persist();
}

function cancelAdminPlan(adminEmail) {
  _db.run(
    'UPDATE users SET subscription_plan=NULL, plan_purchased_at=NULL, plan_paused_at=NULL WHERE email=?',
    [adminEmail]
  );
  _persist();
}

function pauseAdminPlan(adminEmail) {
  const now = Date.now();
  _db.run(
    'UPDATE users SET plan_paused_at=? WHERE email=? AND subscription_plan IS NOT NULL AND plan_paused_at IS NULL',
    [now, adminEmail]
  );
  _scheduleSave();
}

function resumeAdminPlan(adminEmail) {
  const rows = _db.exec('SELECT plan_purchased_at, plan_paused_at FROM users WHERE email=?', [adminEmail]);
  if (!rows.length || !rows[0].values.length) return;
  const [purchasedAt, pausedAt] = rows[0].values[0];
  if (!pausedAt) return;
  // Extend purchasedAt by the time spent paused so the admin loses no time
  const pausedDuration = Date.now() - Number(pausedAt);
  const newPurchasedAt = Number(purchasedAt) + pausedDuration;
  _db.run(
    'UPDATE users SET plan_purchased_at=?, plan_paused_at=NULL WHERE email=?',
    [newPurchasedAt, adminEmail]
  );
  _scheduleSave();
}

function getAdminData(adminEmail) {
  const rows = _db.exec(
    'SELECT name,email,subscription_plan,plan_purchased_at,plan_paused_at,photo FROM users WHERE email=?',
    [adminEmail]
  );
  if (!rows.length || !rows[0].values.length) return null;
  return _rows(rows)[0];
}

// ── Logs ───────────────────────────────────────────────────────────────────

function addLog(userEmail, action, tool, provider, details, orgAdmin = null) {
  // Auto-resolve org_admin from user record if not provided
  let org = orgAdmin;
  if (!org && userEmail) {
    try {
      const rows = _db.exec('SELECT org_admin FROM users WHERE email=?', [userEmail]);
      if (rows.length && rows[0].values.length) org = rows[0].values[0][0] || null;
    } catch {}
  }
  _db.run(
    'INSERT INTO logs (user_email,action,tool,provider,details,org_admin) VALUES (?,?,?,?,?,?)',
    [userEmail || null, action, tool || null, provider || null,
     typeof details === 'object' ? JSON.stringify(details) : (details || null),
     org || null]
  );
  _scheduleSave();
}

// Logs scoped to an admin's org (their own actions + their users' actions)
function getOrgLogs(adminEmail, limit = 500) {
  const rows = _db.exec(
    `SELECT * FROM logs WHERE org_admin=? OR user_email=?
     ORDER BY created_at DESC LIMIT ?`,
    [adminEmail, adminEmail, limit]
  );
  return _rows(rows);
}

function getLogs(limit = 200, tool = null) {
  const sql = tool
    ? 'SELECT * FROM logs WHERE tool=? ORDER BY created_at DESC LIMIT ?'
    : 'SELECT * FROM logs ORDER BY created_at DESC LIMIT ?';
  const rows = _db.exec(sql, tool ? [tool, limit] : [limit]);
  return _rows(rows);
}

// ── Cloud Sessions ──────────────────────────────────────────────────────────

const SESSION_KEY = process.env.ENCRYPTION_KEY
  ? Buffer.from(process.env.ENCRYPTION_KEY, 'hex')
  : crypto.createHash('sha256').update('cloudnexus-session-key-2024').digest();

function encryptCreds(obj) {
  const iv     = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', SESSION_KEY, iv);
  const enc    = Buffer.concat([cipher.update(JSON.stringify(obj), 'utf8'), cipher.final()]);
  return iv.toString('hex') + ':' + cipher.getAuthTag().toString('hex') + ':' + enc.toString('hex');
}
function decryptCreds(enc) {
  const [ivHex, tagHex, dataHex] = enc.split(':');
  const d = crypto.createDecipheriv('aes-256-gcm', SESSION_KEY, Buffer.from(ivHex, 'hex'));
  d.setAuthTag(Buffer.from(tagHex, 'hex'));
  return JSON.parse(d.update(Buffer.from(dataHex, 'hex')) + d.final('utf8'));
}

function saveCloudSession(tool, provider, orgAdmin, creds) {
  const enc     = encryptCreds(creds);
  const expires = new Date(Date.now() + 48 * 3600 * 1000).toISOString();
  const org     = (orgAdmin || '').toLowerCase().trim();
  _db.run(
    `INSERT INTO cloud_sessions (tool,provider,org_admin,credentials_enc,expires_at) VALUES (?,?,?,?,?)
     ON CONFLICT(tool,provider,org_admin) DO UPDATE SET
       credentials_enc=excluded.credentials_enc,
       connected_at=datetime('now'),
       expires_at=excluded.expires_at`,
    [tool, provider, org, enc, expires]
  );
  _scheduleSave();
}

function loadCloudSessions(tool, orgAdmin) {
  const org  = (orgAdmin || '').toLowerCase().trim();
  const rows = _db.exec(
    "SELECT * FROM cloud_sessions WHERE tool=? AND org_admin=? AND expires_at > datetime('now')",
    [tool, org]
  );
  return _rows(rows).map(row => {
    try { row.credentials = decryptCreds(row.credentials_enc); } catch { row.credentials = null; }
    return row;
  });
}

function loadAllCloudSessions(tool) {
  const rows = _db.exec(
    "SELECT * FROM cloud_sessions WHERE tool=? AND expires_at > datetime('now')",
    [tool]
  );
  return _rows(rows).map(row => {
    try { row.credentials = decryptCreds(row.credentials_enc); } catch { row.credentials = null; }
    return row;
  });
}

function deleteCloudSession(tool, provider, orgAdmin) {
  const org = (orgAdmin || '').toLowerCase().trim();
  _db.run('DELETE FROM cloud_sessions WHERE tool=? AND provider=? AND org_admin=?', [tool, provider, org]);
  _scheduleSave();
}

function getOrgAdminForUser(userEmail) {
  if (!userEmail) return null;
  const rows = _db.exec('SELECT org_admin FROM users WHERE LOWER(email)=LOWER(?)', [userEmail]);
  const user = _rows(rows)[0];
  if (!user) return null;
  return ((user.org_admin || userEmail).toLowerCase().trim()) || null;
}

// ── Cloud Accounts (multi-account-per-provider, per-user ACL) ───────────────

function createCloudAccount(orgAdmin, provider, label, creds, meta, createdBy) {
  const org = (orgAdmin || '').toLowerCase().trim();
  const enc = encryptCreds(creds);
  _db.run(
    `INSERT INTO cloud_accounts (org_admin, provider, label, credentials_enc, account_meta, created_by)
     VALUES (?,?,?,?,?,?)`,
    [org, provider, label, enc, meta ? JSON.stringify(meta) : null, createdBy]
  );
  const id = _db.exec('SELECT last_insert_rowid() as id')[0].values[0][0];
  _persist();
  return id;
}

function _accountRow(row) {
  let meta = null;
  try { meta = row.account_meta ? JSON.parse(row.account_meta) : null; } catch {}
  return {
    id: row.id,
    orgAdmin: row.org_admin,
    provider: row.provider,
    label: row.label,
    accountMeta: meta,
    status: row.status,
    createdAt: row.created_at,
    createdBy: row.created_by,
    updatedAt: row.updated_at,
  };
}

function listCloudAccounts(orgAdmin) {
  const org = (orgAdmin || '').toLowerCase().trim();
  const rows = _rows(_db.exec('SELECT * FROM cloud_accounts WHERE org_admin=? ORDER BY created_at ASC', [org]));
  return rows.map(row => {
    const account = _accountRow(row);
    const assigned = _rows(_db.exec(
      `SELECT u.name as name, a.user_email as email FROM cloud_account_access a
       LEFT JOIN users u ON LOWER(u.email)=LOWER(a.user_email)
       WHERE a.account_id=?`,
      [row.id]
    ));
    account.assignedUsers = assigned.map(u => ({ email: u.email, name: u.name || u.email }));
    return account;
  });
}

function getCloudAccount(accountId) {
  const rows = _rows(_db.exec('SELECT * FROM cloud_accounts WHERE id=?', [accountId]));
  if (!rows.length) return null;
  const account = _accountRow(rows[0]);
  try { account.credentials = decryptCreds(rows[0].credentials_enc); } catch { account.credentials = null; }
  return account;
}

function updateCloudAccount(accountId, { label, creds, meta, status } = {}) {
  const sets = [];
  const params = [];
  if (label !== undefined)  { sets.push('label=?');  params.push(label); }
  if (creds !== undefined)  { sets.push('credentials_enc=?'); params.push(encryptCreds(creds)); }
  if (meta !== undefined)   { sets.push('account_meta=?'); params.push(meta ? JSON.stringify(meta) : null); }
  if (status !== undefined) { sets.push('status=?'); params.push(status); }
  if (!sets.length) return;
  sets.push("updated_at=datetime('now')");
  params.push(accountId);
  _db.run(`UPDATE cloud_accounts SET ${sets.join(', ')} WHERE id=?`, params);
  _persist();
}

function deleteCloudAccount(accountId) {
  _db.run('DELETE FROM cloud_account_access WHERE account_id=?', [accountId]);
  _db.run('DELETE FROM cloud_accounts WHERE id=?', [accountId]);
  _persist();
}

function grantAccountAccess(accountId, userEmail, grantedBy) {
  const email = (userEmail || '').toLowerCase().trim();
  if (!email) return;
  _db.run(
    'INSERT OR IGNORE INTO cloud_account_access (account_id, user_email, granted_by) VALUES (?,?,?)',
    [accountId, email, grantedBy || null]
  );
  _persist();
}

function revokeAccountAccess(accountId, userEmail) {
  const email = (userEmail || '').toLowerCase().trim();
  _db.run('DELETE FROM cloud_account_access WHERE account_id=? AND LOWER(user_email)=?', [accountId, email]);
  _persist();
}

function listAccountAssignments(accountId) {
  const rows = _rows(_db.exec('SELECT user_email FROM cloud_account_access WHERE account_id=?', [accountId]));
  return rows.map(r => r.user_email);
}

function listAccountsForUser(userEmail) {
  const email = (userEmail || '').toLowerCase().trim();
  const rows = _rows(_db.exec(
    `SELECT ca.* FROM cloud_accounts ca
     JOIN cloud_account_access a ON a.account_id=ca.id
     WHERE LOWER(a.user_email)=? AND ca.status='active'
     ORDER BY ca.created_at ASC`,
    [email]
  ));
  return rows.map(_accountRow);
}

function isUserAssignedToAccount(userEmail, accountId) {
  const email = (userEmail || '').toLowerCase().trim();
  const rows = _rows(_db.exec(
    'SELECT 1 as x FROM cloud_account_access WHERE account_id=? AND LOWER(user_email)=?',
    [accountId, email]
  ));
  return rows.length > 0;
}

function listAllActiveCloudAccounts() {
  const rows = _rows(_db.exec("SELECT * FROM cloud_accounts WHERE status='active'"));
  return rows.map(_accountRow);
}

// ── Generic API Connectors (usage & billing monitoring) ─────────────────────

function _connectorRow(row) {
  let fieldMapping = {};
  try { fieldMapping = row.field_mapping ? JSON.parse(row.field_mapping) : {}; } catch {}
  let alertEmails = [];
  try { alertEmails = row.alert_emails ? JSON.parse(row.alert_emails) : []; } catch {}
  return {
    id: row.id,
    orgAdmin: row.org_admin,
    name: row.name,
    baseUrl: row.base_url,
    usagePath: row.usage_path,
    authType: row.auth_type,
    fieldMapping,
    pollFrequencyMinutes: row.poll_frequency_minutes,
    thresholdCost: row.threshold_cost,
    thresholdUsage: row.threshold_usage,
    alertEmails,
    lastBreachState: !!row.last_breach_state,
    templateId: row.template_id,
    status: row.status,
    lastPolledAt: row.last_polled_at,
    lastError: row.last_error,
    createdAt: row.created_at,
    createdBy: row.created_by,
    updatedAt: row.updated_at,
  };
}

function createConnector(orgAdmin, { name, baseUrl, usagePath, authType, authConfig, fieldMapping,
  pollFrequencyMinutes, thresholdCost, thresholdUsage, alertEmails, templateId }, createdBy) {
  const org = (orgAdmin || '').toLowerCase().trim();
  const enc = encryptCreds(authConfig || {});
  _db.run(
    `INSERT INTO connectors
       (org_admin, name, base_url, usage_path, auth_type, auth_config_enc, field_mapping,
        poll_frequency_minutes, threshold_cost, threshold_usage, alert_emails, template_id, created_by)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [org, name, baseUrl, usagePath, authType, enc, JSON.stringify(fieldMapping || {}),
     pollFrequencyMinutes || 60, thresholdCost ?? null, thresholdUsage ?? null,
     JSON.stringify(alertEmails || []), templateId || null, createdBy]
  );
  const id = _db.exec('SELECT last_insert_rowid() as id')[0].values[0][0];
  _persist();
  return id;
}

function listConnectors(orgAdmin) {
  const org = (orgAdmin || '').toLowerCase().trim();
  const rows = _rows(_db.exec('SELECT * FROM connectors WHERE org_admin=? ORDER BY created_at ASC', [org]));
  return rows.map(_connectorRow);
}

function getConnector(connectorId) {
  const rows = _rows(_db.exec('SELECT * FROM connectors WHERE id=?', [connectorId]));
  if (!rows.length) return null;
  const connector = _connectorRow(rows[0]);
  try { connector.authConfig = decryptCreds(rows[0].auth_config_enc); } catch { connector.authConfig = null; }
  return connector;
}

function updateConnector(connectorId, { name, baseUrl, usagePath, authType, authConfig, fieldMapping,
  pollFrequencyMinutes, thresholdCost, thresholdUsage, alertEmails, status } = {}) {
  const sets = [];
  const params = [];
  if (name !== undefined)                  { sets.push('name=?');                   params.push(name); }
  if (baseUrl !== undefined)               { sets.push('base_url=?');               params.push(baseUrl); }
  if (usagePath !== undefined)             { sets.push('usage_path=?');             params.push(usagePath); }
  if (authType !== undefined)              { sets.push('auth_type=?');              params.push(authType); }
  if (authConfig !== undefined)            { sets.push('auth_config_enc=?');        params.push(encryptCreds(authConfig)); }
  if (fieldMapping !== undefined)          { sets.push('field_mapping=?');          params.push(JSON.stringify(fieldMapping)); }
  if (pollFrequencyMinutes !== undefined)  { sets.push('poll_frequency_minutes=?'); params.push(pollFrequencyMinutes); }
  if (thresholdCost !== undefined)         { sets.push('threshold_cost=?');         params.push(thresholdCost); }
  if (thresholdUsage !== undefined)        { sets.push('threshold_usage=?');        params.push(thresholdUsage); }
  if (alertEmails !== undefined)           { sets.push('alert_emails=?');           params.push(JSON.stringify(alertEmails)); }
  if (status !== undefined)                { sets.push('status=?');                 params.push(status); }
  if (!sets.length) return;
  sets.push("updated_at=datetime('now')");
  params.push(connectorId);
  _db.run(`UPDATE connectors SET ${sets.join(', ')} WHERE id=?`, params);
  _persist();
}

function deleteConnector(connectorId) {
  _db.run('DELETE FROM connector_usage WHERE connector_id=?', [connectorId]);
  _db.run('DELETE FROM connectors WHERE id=?', [connectorId]);
  _persist();
}

function listAllActiveConnectors() {
  const rows = _rows(_db.exec("SELECT * FROM connectors WHERE status='active'"));
  return rows.map(row => {
    const connector = _connectorRow(row);
    try { connector.authConfig = decryptCreds(row.auth_config_enc); } catch { connector.authConfig = null; }
    return connector;
  });
}

function markConnectorPolled(connectorId, { error = null } = {}) {
  _db.run(
    `UPDATE connectors SET last_polled_at=datetime('now'), last_error=? WHERE id=?`,
    [error, connectorId]
  );
  _persist();
}

function setConnectorBreachState(connectorId, breached) {
  _db.run('UPDATE connectors SET last_breach_state=? WHERE id=?', [breached ? 1 : 0, connectorId]);
  _persist();
}

function recordConnectorUsage(connectorId, { provider, totalCost, usageAmount, unit, ts, rawResponse }) {
  _db.run(
    `INSERT INTO connector_usage (connector_id, provider, total_cost, usage_amount, unit, ts, raw_response)
     VALUES (?,?,?,?,?,?,?)`,
    [connectorId, provider ?? null, totalCost ?? null, usageAmount ?? null, unit ?? null, ts ?? null,
     rawResponse ? JSON.stringify(rawResponse).slice(0, 20000) : null]
  );
  _scheduleSave();
}

function listConnectorUsage(connectorId, limit = 50) {
  const rows = _rows(_db.exec(
    'SELECT * FROM connector_usage WHERE connector_id=? ORDER BY fetched_at DESC LIMIT ?',
    [connectorId, limit]
  ));
  return rows.map(r => ({
    id: r.id, provider: r.provider, totalCost: r.total_cost, usageAmount: r.usage_amount,
    unit: r.unit, ts: r.ts, fetchedAt: r.fetched_at,
  }));
}

// ── AI provider credentials (org admin is sole writer; Python collectors
//    are read via the internal /internal/ai-billing/* routes, never direct
//    DB access, since Python and Node do not share a live in-memory view) ──

function _aiCredentialRow(row) {
  return {
    id: row.id, orgAdmin: row.org_admin, provider: row.provider, label: row.label,
    status: row.status, lastPolledAt: row.last_polled_at, lastError: row.last_error,
    createdAt: row.created_at, createdBy: row.created_by, updatedAt: row.updated_at,
  };
}

function createAiCredential(orgAdmin, provider, label, creds, createdBy) {
  const org = (orgAdmin || '').toLowerCase().trim();
  const enc = encryptCreds(creds || {});
  _db.run(
    `INSERT INTO ai_provider_credentials (org_admin, provider, label, credentials_enc, created_by)
     VALUES (?,?,?,?,?)`,
    [org, provider, label, enc, createdBy]
  );
  const id = _db.exec('SELECT last_insert_rowid() as id')[0].values[0][0];
  _persist();
  return id;
}

function listAiCredentials(orgAdmin) {
  const org = (orgAdmin || '').toLowerCase().trim();
  const rows = _rows(_db.exec('SELECT * FROM ai_provider_credentials WHERE org_admin=? ORDER BY created_at ASC', [org]));
  return rows.map(_aiCredentialRow);
}

function getAiCredential(credentialId) {
  const rows = _rows(_db.exec('SELECT * FROM ai_provider_credentials WHERE id=?', [credentialId]));
  if (!rows.length) return null;
  const cred = _aiCredentialRow(rows[0]);
  try { cred.credentials = decryptCreds(rows[0].credentials_enc); } catch { cred.credentials = null; }
  return cred;
}

function listAllActiveAiCredentials() {
  const rows = _rows(_db.exec("SELECT * FROM ai_provider_credentials WHERE status='active'"));
  return rows.map(row => {
    const cred = _aiCredentialRow(row);
    try { cred.credentials = decryptCreds(row.credentials_enc); } catch { cred.credentials = null; }
    return cred;
  });
}

function rotateAiCredential(credentialId, creds) {
  _db.run(
    `UPDATE ai_provider_credentials SET credentials_enc=?, last_error=NULL, updated_at=datetime('now') WHERE id=?`,
    [encryptCreds(creds || {}), credentialId]
  );
  _persist();
}

function updateAiCredentialStatus(credentialId, status) {
  _db.run(
    `UPDATE ai_provider_credentials SET status=?, updated_at=datetime('now') WHERE id=?`,
    [status, credentialId]
  );
  _persist();
}

function markAiCredentialPolled(credentialId, { error = null } = {}) {
  _db.run(
    `UPDATE ai_provider_credentials SET last_polled_at=datetime('now'), last_error=? WHERE id=?`,
    [error, credentialId]
  );
  _persist();
}

// ── AI usage events (append-only, one row per provider-reported bucket,
//    mirrors the connector_usage convention — no dedup, the collector's
//    own period cursor controls what gets re-fetched) ─────────────────────

function recordAiUsageEvents(events) {
  if (!events || !events.length) return 0;
  for (const e of events) {
    _db.run(
      `INSERT INTO ai_usage_events
         (credential_id, org_admin, provider, team_or_user, model, tokens_in, tokens_out,
          units_consumed, cost_usd, period_start, period_end, source)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [e.credentialId, (e.orgAdmin || '').toLowerCase().trim(), e.provider,
       e.teamOrUser ?? null, e.model ?? null, e.tokensIn ?? null, e.tokensOut ?? null,
       e.unitsConsumed ?? null, e.costUsd ?? 0, e.periodStart, e.periodEnd, e.source || 'collector']
    );
  }
  _scheduleSave();
  return events.length;
}

function listAiUsageEvents(orgAdmin, { provider, teamOrUser, model, dateFrom, dateTo, limit = 500 } = {}) {
  const org = (orgAdmin || '').toLowerCase().trim();
  const clauses = ['org_admin=?'];
  const params = [org];
  if (provider)    { clauses.push('provider=?');      params.push(provider); }
  if (teamOrUser)  { clauses.push('team_or_user=?');  params.push(teamOrUser); }
  if (model)       { clauses.push('model=?');         params.push(model); }
  if (dateFrom)    { clauses.push('period_start>=?'); params.push(dateFrom); }
  if (dateTo)      { clauses.push('period_start<?');  params.push(dateTo); }
  params.push(limit);
  const rows = _rows(_db.exec(
    `SELECT * FROM ai_usage_events WHERE ${clauses.join(' AND ')} ORDER BY period_start DESC LIMIT ?`,
    params
  ));
  return rows.map(r => ({
    id: r.id, credentialId: r.credential_id, provider: r.provider, teamOrUser: r.team_or_user,
    model: r.model, tokensIn: r.tokens_in, tokensOut: r.tokens_out, unitsConsumed: r.units_consumed,
    costUsd: r.cost_usd, periodStart: r.period_start, periodEnd: r.period_end,
    source: r.source, ingestedAt: r.ingested_at,
  }));
}

function deleteAiUsageEvent(eventId) {
  _db.run('DELETE FROM ai_usage_events WHERE id=?', [eventId]);
  _persist();
}

// ── AI budgets ──────────────────────────────────────────────────────────

function _aiBudgetRow(row) {
  return {
    id: row.id, orgAdmin: row.org_admin, scope: row.scope, scopeId: row.scope_id,
    thresholdUsd: row.threshold_usd, period: row.period, warnPct: row.warn_pct,
    status: row.status, createdAt: row.created_at, createdBy: row.created_by, updatedAt: row.updated_at,
  };
}

function createAiBudget(orgAdmin, { scope, scopeId, thresholdUsd, period, warnPct }, createdBy) {
  const org = (orgAdmin || '').toLowerCase().trim();
  _db.run(
    `INSERT INTO ai_budgets (org_admin, scope, scope_id, threshold_usd, period, warn_pct, created_by)
     VALUES (?,?,?,?,?,?,?)`,
    [org, scope, scopeId ?? null, thresholdUsd, period || 'monthly', warnPct ?? 0.7, createdBy]
  );
  const id = _db.exec('SELECT last_insert_rowid() as id')[0].values[0][0];
  _persist();
  return id;
}

function listAiBudgets(orgAdmin) {
  const org = (orgAdmin || '').toLowerCase().trim();
  const rows = _rows(_db.exec('SELECT * FROM ai_budgets WHERE org_admin=? ORDER BY created_at ASC', [org]));
  return rows.map(_aiBudgetRow);
}

function getAiBudget(budgetId) {
  const rows = _rows(_db.exec('SELECT * FROM ai_budgets WHERE id=?', [budgetId]));
  return rows.length ? _aiBudgetRow(rows[0]) : null;
}

function listAllActiveAiBudgets() {
  const rows = _rows(_db.exec("SELECT * FROM ai_budgets WHERE status='active'"));
  return rows.map(_aiBudgetRow);
}

function updateAiBudget(budgetId, { thresholdUsd, period, warnPct, status } = {}) {
  const sets = [];
  const params = [];
  if (thresholdUsd !== undefined) { sets.push('threshold_usd=?'); params.push(thresholdUsd); }
  if (period !== undefined)       { sets.push('period=?');        params.push(period); }
  if (warnPct !== undefined)      { sets.push('warn_pct=?');      params.push(warnPct); }
  if (status !== undefined)       { sets.push('status=?');        params.push(status); }
  if (!sets.length) return;
  sets.push("updated_at=datetime('now')");
  params.push(budgetId);
  _db.run(`UPDATE ai_budgets SET ${sets.join(', ')} WHERE id=?`, params);
  _persist();
}

function getAiBudgetSpend(budget, periodStartIso, periodEndIso) {
  const clauses = ['org_admin=?', 'period_start>=?', 'period_start<?'];
  const params = [budget.orgAdmin, periodStartIso, periodEndIso];
  if (budget.scope === 'key')  { clauses.push('credential_id=?'); params.push(Number(budget.scopeId)); }
  if (budget.scope === 'team') { clauses.push('team_or_user=?');  params.push(budget.scopeId); }
  const rows = _rows(_db.exec(
    `SELECT COALESCE(SUM(cost_usd),0) as total FROM ai_usage_events WHERE ${clauses.join(' AND ')}`,
    params
  ));
  return rows.length ? Number(rows[0].total) : 0;
}

// ── AI alert history + debounce ────────────────────────────────────────

function hasAiAlertSent(budgetId, level, periodKey) {
  const rows = _rows(_db.exec(
    'SELECT 1 as x FROM ai_alerts_sent WHERE budget_id=? AND level=? AND period_key=?',
    [budgetId, level, periodKey]
  ));
  return rows.length > 0;
}

// Returns true if this call recorded the alert (i.e. it wasn't already sent
// this period) — atomic via the UNIQUE(budget_id, level, period_key) constraint,
// safe even if called concurrently for the same breach.
function recordAiAlertSent(budgetId, channel, level, periodKey) {
  try {
    _db.run(
      'INSERT INTO ai_alerts_sent (budget_id, channel, level, period_key) VALUES (?,?,?,?)',
      [budgetId, channel || 'email', level, periodKey]
    );
    _persist();
    return true;
  } catch (e) {
    return false; // UNIQUE constraint hit — already recorded this period
  }
}

function listAiAlerts(orgAdmin, limit = 100) {
  const org = (orgAdmin || '').toLowerCase().trim();
  const rows = _rows(_db.exec(
    `SELECT a.*, b.scope, b.scope_id, b.threshold_usd, b.org_admin
       FROM ai_alerts_sent a JOIN ai_budgets b ON b.id = a.budget_id
      WHERE b.org_admin=?
      ORDER BY a.sent_at DESC LIMIT ?`,
    [org, limit]
  ));
  return rows.map(r => ({
    id: r.id, budgetId: r.budget_id, channel: r.channel, level: r.level,
    periodKey: r.period_key, sentAt: r.sent_at,
    scope: r.scope, scopeId: r.scope_id, thresholdUsd: r.threshold_usd,
  }));
}

// ── Primary (active) account per user per provider ────────────────────────

function setUserPrimaryAccount(userEmail, provider, accountId) {
  const email = (userEmail || '').toLowerCase().trim();
  _db.run(
    `INSERT INTO user_primary_accounts (user_email, provider, account_id, set_at)
     VALUES (?, ?, ?, datetime('now'))
     ON CONFLICT(user_email, provider) DO UPDATE SET account_id=excluded.account_id, set_at=excluded.set_at`,
    [email, provider, accountId]
  );
  _persist();
}

function getUserPrimaryAccountId(userEmail, provider) {
  const email = (userEmail || '').toLowerCase().trim();
  const rows = _rows(_db.exec(
    'SELECT account_id FROM user_primary_accounts WHERE LOWER(user_email)=? AND provider=?',
    [email, provider]
  ));
  return rows[0]?.account_id ?? null;
}

// Returns one active account per provider for a user.
// Respects the user's primary selection; auto-picks the first assigned if not set.
function getActiveAccountsForUser(userEmail) {
  const email = (userEmail || '').toLowerCase().trim();
  const all = _rows(_db.exec(
    `SELECT ca.* FROM cloud_accounts ca
     JOIN cloud_account_access a ON a.account_id=ca.id
     WHERE LOWER(a.user_email)=? AND ca.status='active'
     ORDER BY ca.created_at ASC`,
    [email]
  )).map(_accountRow);

  const byProvider = {};
  for (const acc of all) {
    if (!byProvider[acc.provider]) byProvider[acc.provider] = acc;
  }
  for (const provider of Object.keys(byProvider)) {
    const primaryId = getUserPrimaryAccountId(email, provider);
    if (primaryId) {
      const primary = all.find(a => a.id === primaryId);
      if (primary) byProvider[provider] = primary;
    }
  }
  return Object.values(byProvider);
}

// Batched per-org lookup for the Users-tab logo badges: for every user in
// the org, which accounts (id/provider/label) are they assigned to.
function listOrgUserAccountAccess(orgAdmin) {
  const org = (orgAdmin || '').toLowerCase().trim();
  const rows = _rows(_db.exec(
    `SELECT a.user_email as email, ca.id as id, ca.provider as provider, ca.label as label
     FROM cloud_account_access a
     JOIN cloud_accounts ca ON ca.id=a.account_id
     WHERE ca.org_admin=?`,
    [org]
  ));
  const byUser = {};
  for (const r of rows) {
    const email = (r.email || '').toLowerCase().trim();
    if (!byUser[email]) byUser[email] = [];
    byUser[email].push({ id: r.id, provider: r.provider, label: r.label });
  }
  return byUser;
}

// ── Activation Tokens ─────────────────────────────────────────────────────

function createActivationToken(email) {
  const e     = (email || '').toLowerCase().trim();
  const token = crypto.randomBytes(32).toString('hex');
  const exp   = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days
  _db.run('DELETE FROM activation_tokens WHERE LOWER(email)=?', [e]);
  _db.run('INSERT INTO activation_tokens (email, token, expires_at) VALUES (?,?,?)', [e, token, exp]);
  _scheduleSave();
  return token;
}

function getActivationToken(token) {
  const rows = _rows(_db.exec(
    "SELECT * FROM activation_tokens WHERE token=? AND used_at IS NULL AND expires_at > datetime('now')",
    [token]
  ));
  return rows[0] || null;
}

function consumeActivationToken(token) {
  _db.run("UPDATE activation_tokens SET used_at=datetime('now') WHERE token=?", [token]);
  _scheduleSave();
}

async function activateUser(email, plainPassword, totpSecret) {
  const e    = (email || '').toLowerCase().trim();
  const hash = await bcrypt.hash(plainPassword, 12);
  _db.run(
    'UPDATE users SET password_hash=?, totp_secret=?, mfa_enabled=1 WHERE LOWER(email)=?',
    [hash, totpSecret, e]
  );
  _scheduleSave();
}

// ── Demo / Trial ─────────────────────────────────────────────────────────────

function setDemoTimers(email, demoExpiresAt) {
  _db.run('UPDATE users SET demo_expires_at=? WHERE LOWER(email)=?', [demoExpiresAt, email.toLowerCase().trim()]);
  _persist();
}

function getDemoStatus(email) {
  const rows = _db.exec(
    'SELECT demo_expires_at, cold_period_ends_at, subscription_plan FROM users WHERE LOWER(email)=?',
    [email.toLowerCase().trim()]
  );
  if (!rows.length || !rows[0].values.length) return null;
  const [d, c, p] = rows[0].values[0];
  return { demoExpiresAt: d, coldPeriodEndsAt: c, subscriptionPlan: p };
}

function clearDemoFields(email) {
  _db.run('UPDATE users SET demo_expires_at=NULL, cold_period_ends_at=NULL WHERE LOWER(email)=?', [email.toLowerCase().trim()]);
  _persist();
}

function getExpiredDemoAdmins() {
  const now = Date.now();
  const rows = _db.exec(
    `SELECT u.email, u.name, o.company_name FROM users u
     LEFT JOIN orgs o ON LOWER(o.admin_email) = LOWER(u.email)
     WHERE u.demo_expires_at IS NOT NULL AND u.demo_expires_at < ?
     AND u.cold_period_ends_at IS NULL AND u.subscription_plan IS NULL AND u.role='admin'`,
    [now]
  );
  return rows.length ? rows[0].values.map(r => ({ email: r[0], name: r[1], companyName: r[2] })) : [];
}

function startColdPeriod(email) {
  const rows = _db.exec('SELECT demo_expires_at FROM users WHERE LOWER(email)=?', [email.toLowerCase().trim()]);
  const demoEnd = rows.length && rows[0].values.length ? rows[0].values[0][0] : Date.now();
  const coldEnds = (demoEnd || Date.now()) + 259200000; // 3 days
  _db.run('UPDATE users SET demo_expires_at=NULL, cold_period_ends_at=? WHERE LOWER(email)=?', [coldEnds, email.toLowerCase().trim()]);
  _persist();
}

function getExpiredColdPeriodAdmins() {
  const now = Date.now();
  const rows = _db.exec(
    `SELECT u.email, u.name, o.company_name FROM users u
     LEFT JOIN orgs o ON LOWER(o.admin_email) = LOWER(u.email)
     WHERE u.cold_period_ends_at IS NOT NULL AND u.cold_period_ends_at < ?
     AND u.subscription_plan IS NULL AND u.role='admin'`,
    [now]
  );
  return rows.length ? rows[0].values.map(r => ({ email: r[0], name: r[1], companyName: r[2] })) : [];
}

function hardDeleteAdminCascade(email) {
  const e = email.toLowerCase().trim();
  _db.run('DELETE FROM cloud_account_access WHERE account_id IN (SELECT id FROM cloud_accounts WHERE org_admin=?)', [e]);
  _db.run('DELETE FROM user_primary_accounts WHERE user_email IN (SELECT email FROM users WHERE org_admin=?)', [e]);
  _db.run('DELETE FROM cloud_accounts WHERE org_admin=?', [e]);
  _db.run('DELETE FROM users WHERE org_admin=?', [e]);
  _db.run('DELETE FROM logs WHERE org_admin=? OR user_email=?', [e, e]);
  _db.run('DELETE FROM orgs WHERE admin_email=?', [e]);
  _db.run('DELETE FROM users WHERE LOWER(email)=?', [e]);
  _persist();
}

module.exports = {
  initDB, getDB,
  createUser, findUser, getUserByEmail, getAllUsers,
  getOrgUsers, deleteOrgUser, deleteUser, updateUserTools,
  getDeletedOrgUsers, restoreOrgUser, purgeExpiredDeletedUsers,
  syncOrgUsers, getAllOrgs,
  markMFAEnabled, saveUserTOTPSecret, updateLastLogin,
  savePhoto, getPhoto,
  updateAdminPlan, cancelAdminPlan, pauseAdminPlan, resumeAdminPlan, getAdminData,
  addLog, getLogs, getOrgLogs,
  saveCloudSession, loadCloudSessions, loadAllCloudSessions, deleteCloudSession,
  getOrgAdminForUser,
  createCloudAccount, listCloudAccounts, getCloudAccount, updateCloudAccount, deleteCloudAccount,
  grantAccountAccess, revokeAccountAccess, listAccountAssignments,
  listAccountsForUser, isUserAssignedToAccount, listAllActiveCloudAccounts,
  setUserPrimaryAccount, getUserPrimaryAccountId, getActiveAccountsForUser,
  listOrgUserAccountAccess,
  createActivationToken, getActivationToken, consumeActivationToken, activateUser,
  updateOrgInfo,
  setDemoTimers, getDemoStatus, clearDemoFields,
  getExpiredDemoAdmins, startColdPeriod, getExpiredColdPeriodAdmins, hardDeleteAdminCascade,
  createConnector, listConnectors, getConnector, updateConnector, deleteConnector,
  listAllActiveConnectors, markConnectorPolled, setConnectorBreachState,
  recordConnectorUsage, listConnectorUsage,
  createAiCredential, listAiCredentials, getAiCredential, listAllActiveAiCredentials,
  rotateAiCredential, updateAiCredentialStatus, markAiCredentialPolled,
  recordAiUsageEvents, listAiUsageEvents, deleteAiUsageEvent,
  createAiBudget, listAiBudgets, getAiBudget, listAllActiveAiBudgets, updateAiBudget, getAiBudgetSpend,
  hasAiAlertSent, recordAiAlertSent, listAiAlerts,
};
