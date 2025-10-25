import express from 'express';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// DB setup (persisted to /data/db.json; ensure directory exists)
const dataDir = process.env.DATA_DIR || '/data';
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
const dbFile = path.join(dataDir, 'db.json');

const adapter = new JSONFile(dbFile);
const db = new Low(adapter, { storage: {} });
await db.read();
db.data ||= { storage: {} };

const app = express();
const PORT = process.env.PORT || 8080;

// trust proxy if behind reverse proxy
app.set('trust proxy', 1);

app.use(express.json({ limit: '1mb' }));

// API: Get ALL keys
app.get('/api/storage/all', async (req, res) => {
  await db.read();
  res.json(db.data.storage || {});
});

// API: Get a specific key
app.get('/api/storage/:key', async (req, res) => {
  const { key } = req.params;
  await db.read();
  const v = db.data.storage?.[key];
  if (typeof v === 'undefined') return res.status(404).json({ error: 'not found' });
  res.json({ key, value: v });
});

// API: Set/replace a key
app.post('/api/storage', async (req, res) => {
  const { key, value } = req.body || {};
  if (!key) return res.status(400).json({ error: 'key required' });
  await db.read();
  db.data.storage ||= {};
  db.data.storage[key] = value;
  await db.write();
  res.json({ ok: true });
});

// Serve compiled client (dist) as static assets
const distDir = path.join(__dirname, 'public');
app.use(express.static(distDir));

// SPA fallback to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`PepTrackr server running on http://0.0.0.0:${PORT}`);
});
