import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Pool } from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 8080;

// DB
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
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const entries = Object.entries(obj || {});
    if (entries.length === 0) await client.query('DELETE FROM kv');
    for (const [k, v] of entries){
      await client.query(
        `INSERT INTO kv(key, value, updated_at) VALUES ($1, $2, NOW())
         ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()`,
        [k, v]
      );
    }
    await client.query('COMMIT');
    return Object.keys(obj || {}).length;
  } catch(e){ await client.query('ROLLBACK'); throw e; }
  finally { client.release(); }
}

// App + Socket.IO
const app = express();
app.use(express.json({ limit: '10mb' }));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: true, credentials: true } });

io.on('connection', (socket) => {
  socket.on('kv:set', async ({ key, value }) => {
    try { await setKV(key, value); io.emit('kv:change', { keys:[key] }); } catch(e){}
  });
  socket.on('kv:bulk', async ({ data }) => {
    try { await bulkSetKV(data || {}); io.emit('kv:change', { keys: Object.keys(data || {}) }); } catch(e){}
  });
});

// REST fallback (also used by override.js reconcile)
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
  io.emit('kv:change', { keys:[key] });
});
app.post('/api/storage/bulk', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const { data } = req.body || {};
  if (!data || typeof data !== 'object') return res.status(400).json({error:'data object required'});
  const n = await bulkSetKV(data);
  res.json({ok:true, count:n});
  io.emit('kv:change', { keys:Object.keys(data) });
});

// Static client (unchanged)
const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));

// Inject BOOT + override loader at serve-time (no source edits)
app.get('*', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const indexPath = path.join(publicDir, 'index.html');
  if (!fs.existsSync(indexPath)) return res.status(404).send('client not built');
  const html = fs.readFileSync(indexPath, 'utf8');
  let boot = {};
  try { boot = await getAll(); } catch {}
  const injected = html.replace(
    '</head>',
    `<script>window.__PEP_BOOT__=${JSON.stringify(boot)}</script>
     <script src="/socket.io/socket.io.js"></script>
     <script src="/storage-override.js"></script></head>`
  );
  res.send(injected);
});

await initDb();
server.listen(PORT, () => console.log('listening on', PORT));
