'use strict';
// Run once to inspect stored cloud account credentials.
// Usage: node show_credentials.cjs
// Delete this file after use.

require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') });

const path      = require('path');
const fs        = require('fs');
const crypto    = require('crypto');
const initSqlJs = require('sql.js');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'cloudnexus.db');

const SESSION_KEY = process.env.ENCRYPTION_KEY
  ? Buffer.from(process.env.ENCRYPTION_KEY, 'hex')
  : crypto.createHash('sha256').update('cloudnexus-session-key-2024').digest();

function decryptCreds(enc) {
  const [ivHex, tagHex, dataHex] = enc.split(':');
  const d = crypto.createDecipheriv('aes-256-gcm', SESSION_KEY, Buffer.from(ivHex, 'hex'));
  d.setAuthTag(Buffer.from(tagHex, 'hex'));
  return JSON.parse(d.update(Buffer.from(dataHex, 'hex')) + d.final('utf8'));
}

async function main() {
  const SQL = await initSqlJs();
  const db  = new SQL.Database(fs.readFileSync(DB_PATH));

  const rows = db.exec('SELECT id, org_admin, provider, label, credentials_enc FROM cloud_accounts');
  if (!rows.length || !rows[0].values.length) {
    console.log('No cloud accounts found in the database.');
    return;
  }

  for (const [id, orgAdmin, provider, label, encCreds] of rows[0].values) {
    console.log(`\n--- Account #${id} ---`);
    console.log(`  Provider : ${provider}`);
    console.log(`  Label    : ${label}`);
    console.log(`  Org Admin: ${orgAdmin}`);
    try {
      const creds = decryptCreds(encCreds);
      // Mask the secret
      const display = { ...creds };
      if (display.secretAccessKey) display.secretAccessKey = display.secretAccessKey.slice(0, 4) + '****';
      if (display.clientSecret)    display.clientSecret    = display.clientSecret.slice(0, 4)    + '****';
      if (display.private_key)     display.private_key     = '[GCP private key]';
      console.log('  Creds    :', JSON.stringify(display, null, 2).replace(/\n/g, '\n             '));
    } catch (e) {
      console.log('  Creds    : [decryption failed — wrong ENCRYPTION_KEY?]', e.message);
    }
  }
}

main().catch(console.error);
