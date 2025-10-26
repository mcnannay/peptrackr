import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Pool } from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 8080;

const pool = new Pool({
  host: process.env.PGHOST,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
});

async function initDb(){
  await pool.query(`
    CREATE TABLE IF NOT EXISTS kv (
      key TEXT PRIMARY KEY,
      value JSONB,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function getAll(){
  const { rows } = await pool.query('SELECT key, value FROM kv');
  const out = {}; for (const r of rows) out[r.key] = r.value; return out;
}

async function setKV(key, value){
  await pool.query(
    `INSERT INTO kv(key, value, updated_at) VALUES ($1, $2, NOW())
     ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()`,
    [key, value]
  );
}

async function bulkSetKV(obj){
  const entries = Object.entries(obj || {});
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Empty object means "clear all"
    if (entries.length === 0) await client.query('DELETE FROM kv');
    for (const [k, v] of entries){
      await client.query(
        `INSERT INTO kv(key, value, updated_at) VALUES ($1, $2, NOW())
         ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()`,
        [k, v]
      );
    }
    await client.query('COMMIT');
    return entries.length;
  } catch(e){ await client.query('ROLLBACK'); throw e; }
  finally { client.release(); }
}

// SSE hub
const clients = new Set();
function broadcastChange(keys){
  const payload = JSON.stringify({ event:'change', keys });
  for (const res of clients){
    try { res.write(`data: ${payload}\n\n`); } catch {}
  }
}

const app = express();
app.use(express.json({ limit: '10mb' }));

app.get('/health', (req, res) => res.json({ok:true}));

// Legacy endpoints for override
app.get('/api/storage/all', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json(await getAll());
});

app.post('/api/storage', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const { key, value } = req.body || {};
  if (!key) return res.status(400).json({error:'key required'});
  await setKV(key, value);
  res.json({ok:true});
  broadcastChange([key]);
});

app.post('/api/storage/bulk', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const { data } = req.body || {};
  if (!data || typeof data !== 'object') return res.status(400).json({error:'data object required'});
  const n = await bulkSetKV(data);
  res.json({ok:true, count:n});
  broadcastChange(Object.keys(data));
});

app.get('/api/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders && res.flushHeaders();
  res.write(': connected\n\n');
  clients.add(res);
  req.on('close', () => clients.delete(res));
});

// Static client
const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));

// Inject __PEP_BOOT__ before </head> so override can seed synchronously
app.get('*', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const indexPath = path.join(publicDir, 'index.html');
  if (!fs.existsSync(indexPath)) return res.status(404).send('client not built');
  const html = fs.readFileSync(indexPath, 'utf8');
  let boot = {};
  try { boot = await getAll(); } catch {}
  const injected = html.replace('</head>', `<script>window.__PEP_BOOT__=${JSON.stringify(boot)}</script><script src="/storage-override.js"></script></head>`);
  res.send(injected);
});

await initDb();
app.listen(PORT, () => console.log('listening on', PORT));
