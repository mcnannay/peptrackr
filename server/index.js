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
const db = new sqlite3.Database(dbFile);

// Create table if not exists
db.serialize(() => {
  db.run('CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT)');
});

const app = express();
const PORT = process.env.PORT || 8080;
app.set('trust proxy', 1);
app.use(express.json({ limit: '1mb' }));

// Get all keys
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

// Get one key
app.get('/api/storage/:key', (req, res) => {
  db.get('SELECT key, value FROM kv WHERE key = ?', [req.params.key], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'not found' });
    let v = row.value;
    try { v = JSON.parse(row.value); } catch(_) {}
    res.json({ key: row.key, value: v });
  });
});

// Upsert a key
app.post('/api/storage', (req, res) => {
  const { key, value } = req.body || {};
  if (!key) return res.status(400).json({ error: 'key required' });
  const text = (typeof value === 'string') ? value : JSON.stringify(value);
  db.run('INSERT INTO kv(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value', [key, text], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ ok: true });
  });
});

// Serve built client
const distDir = path.join(__dirname, 'public');
app.use(express.static(distDir));
app.get('*', (req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`PepTrackr (SQLite) running on http://0.0.0.0:${PORT}`);
});
