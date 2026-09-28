'use strict';
/**
 * Shared SQLite database for CloudNexus.
 * Used by: monitoring backend (Node.js)
 * Python billing backend uses cloudnexus_db.py
 * DB file: d:\CloudNexus_Website\cloudnexus.db
 */
const path = require('path');
const fs   = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'Monitoring tool', 'CLOUDNEXUS-MONITORING-main', 'backend', 'cloudnexus.db');
const crypto  = require('crypto');
const bcrypt  = require('bcryptjs');

// Load sql.js
const initSqlJs = require('sql.js');

let _db  = null;
let _ready = false;
let _saveTimer = null;

function _scheduleSave() {
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(_persist, 2000);
}

function _persist() {
  if (!_db) return;
  const data = _db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

async function initDB() {
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    const buf = fs.readFileSync(DB_PATH);
    _db = new SQL.Database(buf);
  } else {
    _db = new SQL.Database();
  }

  _db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      name         TEXT NOT NULL,
      email        TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      totp_secret  TEXT,
      mfa_enabled  INTEGER DEFAULT 0,
      created_at   TEXT DEFAULT (datetime('now')),
      last_login   TEXT
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

  _persist();
  _ready = true;
  console.log('[DB] SQLite initialized at', DB_PATH);
  return _db;
}

function getDB() { return _db; }

// ── Users ──────────────────────────────────────────────────────────────────

async function createUser(name, email, password, totpSecret) {
  const hash = await bcrypt.hash(password, 10);
  try {
    _db.run(
      'INSERT INTO users (name, email, password_hash, totp_secret, mfa_enabled) VALUES (?,?,?,?,0)',
      [name, email, hash, totpSecret]
    );
    _scheduleSave();
    return { success: true };
  } catch (e) {
    if (e.message.includes('UNIQUE')) return { error: 'Email already exists' };
    return { error: e.message };
  }
}

async function findUser(email, password) {
  const rows = _db.exec('SELECT * FROM users WHERE email = ?', [email]);
  if (!rows.length || !rows[0].values.length) return null;
  const cols = rows[0].columns;
  const row  = rows[0].values[0];
  const user = Object.fromEntries(cols.map((c, i) => [c, row[i]]));
  const ok   = await bcrypt.compare(password, user.password_hash);
  if (!ok) return null;
  return user;
}

function getUserByEmail(email) {
  const rows = _db.exec('SELECT * FROM users WHERE email = ?', [email]);
  if (!rows.length || !rows[0].values.length) return null;
  const cols = rows[0].columns;
  const row  = rows[0].values[0];
  return Object.fromEntries(cols.map((c, i) => [c, row[i]]));
}

function markMFAEnabled(email) {
  _db.run("UPDATE users SET mfa_enabled=1, last_login=datetime('now') WHERE email=?", [email]);
  _scheduleSave();
}

function updateLastLogin(email) {
  _db.run("UPDATE users SET last_login=datetime('now') WHERE email=?", [email]);
  _scheduleSave();
}

// ── Logs ───────────────────────────────────────────────────────────────────

function addLog(userEmail, action, tool, provider, details) {
  _db.run(
    'INSERT INTO logs (user_email, action, tool, provider, details) VALUES (?,?,?,?,?)',
    [userEmail || null, action, tool || null, provider || null,
     typeof details === 'object' ? JSON.stringify(details) : (details || null)]
  );
  _scheduleSave();
}

function getLogs(limit = 200, tool = null) {
  const sql = tool
    ? 'SELECT * FROM logs WHERE tool=? ORDER BY created_at DESC LIMIT ?'
    : 'SELECT * FROM logs ORDER BY created_at DESC LIMIT ?';
  const params = tool ? [tool, limit] : [limit];
  const rows = _db.exec(sql, params);
  if (!rows.length) return [];
  const cols = rows[0].columns;
  return rows[0].values.map(r => Object.fromEntries(cols.map((c, i) => [c, r[i]])));
}

// ── Cloud Sessions (48-hour persistence) ──────────────────────────────────

const SESSION_KEY = crypto.createHash('sha256').update('cloudnexus-session-key-2024').digest();

function encryptCreds(obj) {
  const iv      = crypto.randomBytes(16);
  const cipher  = crypto.createCipheriv('aes-256-gcm', SESSION_KEY, iv);
  const enc     = Buffer.concat([cipher.update(JSON.stringify(obj), 'utf8'), cipher.final()]);
  const tag     = cipher.getAuthTag();
  return iv.toString('hex') + ':' + tag.toString('hex') + ':' + enc.toString('hex');
}

function decryptCreds(enc) {
  const [ivHex, tagHex, dataHex] = enc.split(':');
  const decipher = crypto.createDecipheriv('aes-256-gcm', SESSION_KEY, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return JSON.parse(decipher.update(Buffer.from(dataHex, 'hex')) + decipher.final('utf8'));
}

function saveCloudSession(tool, provider, creds) {
  const enc     = encryptCreds(creds);
  const expires = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
  _db.run(
    `INSERT INTO cloud_sessions (tool, provider, credentials_enc, expires_at)
     VALUES (?,?,?,?)
     ON CONFLICT(tool, provider) DO UPDATE SET
       credentials_enc=excluded.credentials_enc,
       connected_at=datetime('now'),
       expires_at=excluded.expires_at`,
    [tool, provider, enc, expires]
  );
  _scheduleSave();
}

function loadCloudSessions(tool) {
  const rows = _db.exec(
    "SELECT * FROM cloud_sessions WHERE tool=? AND expires_at > datetime('now')",
    [tool]
  );
  if (!rows.length) return [];
  const cols = rows[0].columns;
  return rows[0].values.map(r => {
    const row = Object.fromEntries(cols.map((c, i) => [c, r[i]]));
    try { row.credentials = decryptCreds(row.credentials_enc); } catch { row.credentials = null; }
    return row;
  });
}

function deleteCloudSession(tool, provider) {
  _db.run('DELETE FROM cloud_sessions WHERE tool=? AND provider=?', [tool, provider]);
  _scheduleSave();
}

module.exports = {
  initDB, getDB,
  createUser, findUser, getUserByEmail, markMFAEnabled, updateLastLogin,
  addLog, getLogs,
  saveCloudSession, loadCloudSessions, deleteCloudSession,
};
