import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import sqlite3 from 'sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = process.env.DATA_DIR || '/data';
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
const dbFile = path.join(dataDir, 'app.db');

sqlite3.verbose();
sqlite3.Database.prototype.configure && sqlite3.Database.prototype.configure('busyTimeout', 5000);
const db = new sqlite3.Database(dbFile);

// Init schema
db.serialize(() => {
  db.run('CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT)');
});

const app = express();
const PORT = process.env.PORT || 8080; // INTERNAL PORT MUST REMAIN 8080
app.set('trust proxy', 1);
app.use(express.json({ limit: '2mb' }));
app.get('/health', (req, res) => res.json({ ok: true }));

// Get all
app.get('/api/storage/all', (req, res) => {
  db.all('SELECT key, value FROM kv', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const obj = {};
    for (const r of rows) {
      let v = r.value;
      try { v = JSON.parse(r.value); } catch(_) {}
      obj[r.key] = v;
    }
    res.json(obj);
  });
});

// Get one
app.get('/api/storage/:key', (req, res) => {
  db.get('SELECT key, value FROM kv WHERE key = ?', [req.params.key], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'not found' });
    let v = row.value;
    try { v = JSON.parse(row.value); } catch(_) {}
    res.json({ key: row.key, value: v });
  });
});

// Upsert one
app.post('/api/storage', (req, res) => {
  const { key, value } = req.body || {};
  if (!key) return res.status(400).json({ error: 'key required' });
  const text = (typeof value === 'string') ? value : JSON.stringify(value);
  db.run('INSERT INTO kv(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value', [key, text], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    console.log('[storage] upsert', key);
    res.json({ ok: true });
  });
});

// Bulk upsert
app.post('/api/storage/bulk', (req, res) => {
  const { data } = req.body || {};
  if (!data || typeof data !== 'object') return res.status(400).json({ error: 'data object required' });
  const entries = Object.entries(data);
  if (!entries.length) return res.json({ ok: true, count: 0 });
  const stmt = db.prepare('INSERT INTO kv(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');
  db.serialize(() => {
    for (const [k, v] of entries) {
      const text = (typeof v === 'string') ? v : JSON.stringify(v);
      stmt.run(k, text);
    }
  });
  stmt.finalize(err => {
    if (err) return res.status(500).json({ error: err.message });
    console.log('[storage] bulk upsert', entries.length, 'keys');
    res.json({ ok: true, count: entries.length });
  });
});

// Static client
const distDir = path.join(__dirname, 'public');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (req, res) => {
    const idx = path.join(distDir, 'index.html');
    if (fs.existsSync(idx)) return res.sendFile(idx);
    res.status(200).send('OK');
  });
} else {
  console.warn('[warn] public/ not found at', distDir);
  app.get('*', (req, res) => res.status(200).send('OK'));
}

app.listen(PORT, () => {
  console.log(`PepTrackr (SQLite sync-poll) on http://0.0.0.0:${PORT}`);
});

process.on('uncaughtException', (e)=>console.error('[fatal] uncaught', e));
process.on('unhandledRejection', (e)=>console.error('[fatal] unhandled', e));
