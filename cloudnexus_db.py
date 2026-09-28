"""
Shared SQLite database helper for CloudNexus billing backend.
Same DB file as the Node.js monitoring backend.
"""
import sqlite3, json, os, hashlib, hmac
from pathlib import Path
from datetime import datetime, timedelta

_project_root = Path(__file__).resolve().parent
_default_db = _project_root / "cloudnexus.db"
_env_db = os.environ.get("DB_PATH", "")
DB_PATH = (_project_root / _env_db) if _env_db else _default_db
_enc_key_env = os.environ.get('ENCRYPTION_KEY', '')
_SESSION_KEY = bytes.fromhex(_enc_key_env) if _enc_key_env else hashlib.sha256(b"cloudnexus-session-key-2024").digest()


def _conn():
    db = sqlite3.connect(str(DB_PATH), timeout=10, check_same_thread=False)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA journal_mode=WAL")   # safe concurrent access
    return db


def init_db():
    with _conn() as db:
        db.executescript("""
        CREATE TABLE IF NOT EXISTS users (
          id            INTEGER PRIMARY KEY AUTOINCREMENT,
          name          TEXT NOT NULL,
          email         TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          totp_secret   TEXT,
          mfa_enabled   INTEGER DEFAULT 0,
          created_at    TEXT DEFAULT (datetime('now')),
          last_login    TEXT
        );
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
        CREATE TABLE IF NOT EXISTS cloud_sessions (
          id              INTEGER PRIMARY KEY AUTOINCREMENT,
          tool            TEXT NOT NULL,
          provider        TEXT NOT NULL,
          org_admin       TEXT NOT NULL DEFAULT '',
          credentials_enc TEXT NOT NULL,
          connected_at    TEXT DEFAULT (datetime('now')),
          expires_at      TEXT NOT NULL,
          UNIQUE(tool, provider, org_admin)
        );
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
        """)


# ── Encryption ────────────────────────────────────────────────────────────

def _encrypt(obj: dict) -> str:
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    import os, base64
    key   = _SESSION_KEY[:32]
    nonce = os.urandom(12)
    ct    = AESGCM(key).encrypt(nonce, json.dumps(obj).encode(), None)
    return base64.b64encode(nonce + ct).decode()


def _decrypt(enc: str) -> dict:
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    import base64
    raw   = base64.b64decode(enc)
    nonce, ct = raw[:12], raw[12:]
    pt    = AESGCM(_SESSION_KEY[:32]).decrypt(nonce, ct, None)
    return json.loads(pt)


# Fallback for Node.js-encrypted sessions (hex format)
def _decrypt_node(enc: str) -> dict:
    """Decrypt sessions written by cloudnexus_db.js (aes-256-gcm, hex)."""
    from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
    iv_hex, tag_hex, data_hex = enc.split(":")
    iv   = bytes.fromhex(iv_hex)
    tag  = bytes.fromhex(tag_hex)
    data = bytes.fromhex(data_hex)
    decryptor = Cipher(
        algorithms.AES(_SESSION_KEY),
        modes.GCM(iv, tag),
    ).decryptor()
    pt = decryptor.update(data) + decryptor.finalize()
    return json.loads(pt)


def _safe_decrypt(enc: str) -> dict | None:
    try:
        # Try Node.js format first (hex with colons)
        if enc.count(":") == 2:
            return _decrypt_node(enc)
        return _decrypt(enc)
    except Exception:
        return None


# ── Cloud Sessions ────────────────────────────────────────────────────────

def save_cloud_session(tool: str, provider: str, org_admin: str, creds: dict):
    enc     = _encrypt(creds)
    expires = (datetime.utcnow() + timedelta(hours=48)).strftime("%Y-%m-%d %H:%M:%S")
    org     = (org_admin or "").lower().strip()
    with _conn() as db:
        db.execute("""
          INSERT INTO cloud_sessions (tool, provider, org_admin, credentials_enc, expires_at)
          VALUES (?,?,?,?,?)
          ON CONFLICT(tool,provider,org_admin) DO UPDATE SET
            credentials_enc=excluded.credentials_enc,
            connected_at=datetime('now'),
            expires_at=excluded.expires_at
        """, (tool, provider, org, enc, expires))


def load_cloud_sessions(tool: str, org_admin: str) -> list[dict]:
    org = (org_admin or "").lower().strip()
    with _conn() as db:
        rows = db.execute(
            "SELECT * FROM cloud_sessions WHERE tool=? AND org_admin=? AND expires_at > datetime('now')",
            (tool, org)
        ).fetchall()
    result = []
    for r in rows:
        creds = _safe_decrypt(r["credentials_enc"])
        if creds:
            result.append({"provider": r["provider"], "org_admin": r["org_admin"],
                           "credentials": creds, "expires_at": r["expires_at"]})
    return result


def load_all_cloud_sessions(tool: str) -> list[dict]:
    with _conn() as db:
        rows = db.execute(
            "SELECT * FROM cloud_sessions WHERE tool=? AND expires_at > datetime('now')",
            (tool,)
        ).fetchall()
    result = []
    for r in rows:
        creds = _safe_decrypt(r["credentials_enc"])
        if creds:
            result.append({"provider": r["provider"], "org_admin": r.get("org_admin", ""),
                           "credentials": creds, "expires_at": r["expires_at"]})
    return result


def delete_cloud_session(tool: str, provider: str, org_admin: str):
    org = (org_admin or "").lower().strip()
    with _conn() as db:
        db.execute("DELETE FROM cloud_sessions WHERE tool=? AND provider=? AND org_admin=?",
                   (tool, provider, org))


def get_org_admin_for_user(email: str) -> str:
    if not email:
        return ""
    try:
        with _conn() as db:
            row = db.execute(
                "SELECT org_admin FROM users WHERE LOWER(email)=LOWER(?)",
                (email.lower().strip(),)
            ).fetchone()
            if row is None:
                return email.lower().strip()
            return (row["org_admin"] or email).lower().strip()
    except Exception:
        return email.lower().strip()


# ── Cloud Accounts (read-only — Node/monitoring is the sole writer) ───────

def _account_row(r: sqlite3.Row) -> dict:
    meta = None
    try:
        meta = json.loads(r["account_meta"]) if r["account_meta"] else None
    except Exception:
        pass
    return {
        "id": r["id"], "orgAdmin": r["org_admin"], "provider": r["provider"],
        "label": r["label"], "accountMeta": meta, "status": r["status"],
        "createdAt": r["created_at"], "createdBy": r["created_by"], "updatedAt": r["updated_at"],
    }


def get_cloud_account(account_id: int) -> dict | None:
    with _conn() as db:
        row = db.execute("SELECT * FROM cloud_accounts WHERE id=?", (account_id,)).fetchone()
    if row is None:
        return None
    account = _account_row(row)
    account["credentials"] = _safe_decrypt(row["credentials_enc"])
    return account


def _get_primary_account_id(email: str, provider: str):
    with _conn() as db:
        try:
            row = db.execute(
                "SELECT account_id FROM user_primary_accounts WHERE LOWER(user_email)=? AND provider=?",
                (email, provider)
            ).fetchone()
            return row[0] if row else None
        except Exception:
            return None


def _one_per_provider(accounts: list[dict], user_email: str) -> list[dict]:
    """Return at most one account per provider, preferring the primary selection."""
    email = (user_email or "").lower().strip()
    by_provider: dict = {}
    for acc in accounts:
        p = acc.get("provider")
        if p and p not in by_provider:
            by_provider[p] = acc
    for provider in list(by_provider.keys()):
        primary_id = _get_primary_account_id(email, provider)
        if primary_id:
            primary = next((a for a in accounts if a["id"] == primary_id), None)
            if primary:
                by_provider[provider] = primary
    return list(by_provider.values())


def list_accounts_for_user(user_email: str) -> list[dict]:
    email = (user_email or "").lower().strip()
    with _conn() as db:
        rows = db.execute("""
            SELECT ca.* FROM cloud_accounts ca
            JOIN cloud_account_access a ON a.account_id = ca.id
            WHERE LOWER(a.user_email)=? AND ca.status='active'
            ORDER BY ca.created_at ASC
        """, (email,)).fetchall()
    all_accounts = [_account_row(r) for r in rows]
    return _one_per_provider(all_accounts, email)


def list_accounts_for_org(org_admin: str) -> list[dict]:
    org = (org_admin or "").lower().strip()
    with _conn() as db:
        rows = db.execute(
            "SELECT * FROM cloud_accounts WHERE org_admin=? AND status='active' ORDER BY created_at ASC",
            (org,)
        ).fetchall()
    all_accounts = [_account_row(r) for r in rows]
    return _one_per_provider(all_accounts, org)


def is_user_assigned_to_account(user_email: str, account_id: int) -> bool:
    email = (user_email or "").lower().strip()
    with _conn() as db:
        row = db.execute(
            "SELECT 1 FROM cloud_account_access WHERE account_id=? AND LOWER(user_email)=?",
            (account_id, email)
        ).fetchone()
    return row is not None


# ── Logs ─────────────────────────────────────────────────────────────────

def add_log(user_email: str, action: str, tool: str = None,
            provider: str = None, details=None):
    if isinstance(details, dict):
        details = json.dumps(details)
    with _conn() as db:
        db.execute(
            "INSERT INTO logs (user_email,action,tool,provider,details) VALUES (?,?,?,?,?)",
            (user_email, action, tool, provider, details)
        )


if __name__ == "__main__":
    init_db()
    print("DB initialized at", DB_PATH)
