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

// --- DB ---
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
      value JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}
async function getAll(){
  const { rows } = await pool.query('SELECT key, value FROM kv');
  const out = {};
  for (const r of rows){ out[r.key] = r.value; }
  return out;
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
  if (!entries.length) return 0;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const [k, v] of entries){
      await client.query(
        `INSERT INTO kv(key, value, updated_at) VALUES ($1, $2, NOW())
         ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()`,
        [k, v]
      );
    }
    await client.query('COMMIT');
    return entries.length;
  } catch(e){
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

// --- App/Socket ---
const app = express();
app.use(express.json({limit:'10mb'}));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: true, credentials: true }
});

io.on('connection', (socket) => {
  // On connect, you could send a small hello; clients will fetch snapshot anyway.
});

function broadcastChange(keys){
  io.emit('kv:change', { keys });
}

// --- API ---
app.get('/health', (req, res) => res.json({ok:true}));

app.get('/api/kv', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    res.json(await getAll());
  } catch(e){
    res.status(500).json({error:e.message});
  }
});

app.put('/api/kv/:key', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const { key } = req.params;
  const { value } = req.body || {};
  if (value === undefined) return res.status(400).json({error:'value required'});
  try {
    await setKV(key, value);
    res.json({ok:true});
    broadcastChange([key]);
  } catch(e){
    res.status(500).json({error:e.message});
  }
});

app.post('/api/kv/bulk', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const data = req.body || {};
  if (!data || typeof data !== 'object') return res.status(400).json({error:'object body required'});
  try {
    const n = await bulkSetKV(data);
    res.json({ok:true, count:n});
    broadcastChange(Object.keys(data));
  } catch(e){
    res.status(500).json({error:e.message});
  }
});

app.get('/api/backup', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const data = await getAll();
    res.setHeader('Content-Disposition','attachment; filename="backup.json"');
    res.json(data);
  } catch(e){
    res.status(500).json({error:e.message});
  }
});

app.post('/api/backup', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const data = req.body || {};
  if (!data || typeof data !== 'object') return res.status(400).json({error:'object body required'});
  try {
    const n = await bulkSetKV(data);
    res.json({ok:true, count:n});
    broadcastChange(Object.keys(data));
  } catch(e){
    res.status(500).json({error:e.message});
  }
});

// Static client
const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));

app.get('*', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const indexPath = path.join(publicDir, 'index.html');
  if (!fs.existsSync(indexPath)) return res.status(404).send('client not built');
  const html = fs.readFileSync(indexPath, 'utf8');
  res.send(html);
});

await initDb();
server.listen(PORT, () => console.log('listening on', PORT));
