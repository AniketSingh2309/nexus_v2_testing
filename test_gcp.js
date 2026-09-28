const { google } = require('googleapis');
require('dotenv').config({ path: 'D:/CloudNexus_Website/.env' });
const initSqlJs = require('sql.js');
const fs = require('fs');
const crypto = require('crypto');

const DB_PATH = process.env.DB_PATH;
const KEY = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');

function decrypt(enc) {
  const [ivHex, tagHex, dataHex] = enc.split(':');
  const d = crypto.createDecipheriv('aes-256-gcm', KEY, Buffer.from(ivHex, 'hex'));
  d.setAuthTag(Buffer.from(tagHex, 'hex'));
  return JSON.parse(d.update(Buffer.from(dataHex, 'hex')) + d.final('utf8'));
}

async function main() {
  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync(DB_PATH));
  const rows = db.exec("SELECT credentials_enc FROM cloud_accounts WHERE provider='gcp' LIMIT 1");
  const creds = decrypt(rows[0].values[0][0]);
  console.log('Project ID from SA JSON (project_id):', creds.project_id);
  console.log('Project ID from form (projectId):', creds.projectId);
  
  const projectId = creds.project_id || creds.projectId;
  const auth = new google.auth.GoogleAuth({ credentials: creds, scopes: ['https://www.googleapis.com/auth/cloud-platform'] });

  // Test Compute Engine
  try {
    const compute = google.compute({ version: 'v1', auth });
    const res = await compute.instances.aggregatedList({ project: projectId, maxResults: 10 });
    let count = 0;
    for (const [,z] of Object.entries(res.data.items||{})) count += (z.instances||[]).length;
    console.log('Compute instances found:', count);
  } catch(e) { console.log('Compute error:', e.message.slice(0,120)); }

  // Test Cloud Run
  try {
    const run = google.run({ version: 'v1', auth });
    const res = await run.projects.locations.services.list({ parent: `projects/${projectId}/locations/-` });
    console.log('Cloud Run services found:', (res.data.items||[]).length);
  } catch(e) { console.log('Cloud Run error:', e.message.slice(0,120)); }

  // Test GKE
  try {
    const container = google.container({ version: 'v1', auth });
    const res = await container.projects.locations.clusters.list({ parent: `projects/${projectId}/locations/-` });
    console.log('GKE clusters found:', (res.data.clusters||[]).length);
  } catch(e) { console.log('GKE error:', e.message.slice(0,120)); }
}
main().catch(e => console.error('Fatal:', e.message));
