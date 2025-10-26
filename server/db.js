import sqlite3 from 'sqlite3';
import fs from 'fs';
import path from 'path';

const DATA_DIR = process.env.DATA_DIR || './data';
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const dbFile = path.join(DATA_DIR, 'app.db');

sqlite3.verbose();
export const db = new sqlite3.Database(dbFile);

export function init() {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS kv (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )`);
  });
}

export function allKV() {
  return new Promise((resolve, reject) => {
    db.all('SELECT key, value FROM kv', (err, rows) => {
      if (err) return reject(err);
      const out = {};
      for (const r of rows) {
        try { out[r.key] = JSON.parse(r.value); } catch { out[r.key] = r.value; }
      }
      resolve(out);
    });
  });
}

export function setKV(key, value) {
  return new Promise((resolve, reject) => {
    const text = (typeof value === 'string') ? value : JSON.stringify(value);
    db.run('INSERT INTO kv(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',
      [key, text], (err) => err ? reject(err) : resolve(true));
  });
}

export function bulkSet(obj) {
  return new Promise((resolve, reject) => {
    const entries = Object.entries(obj || {});
    db.serialize(() => {
      const stmt = db.prepare('INSERT INTO kv(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');
      for (const [k, v] of entries) {
        const text = (typeof v === 'string') ? v : JSON.stringify(v);
        stmt.run([k, text]);
      }
      stmt.finalize((err) => err ? reject(err) : resolve(entries.length));
    });
  });
}

export function clearAll() {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM kv', err => err ? reject(err) : resolve(true));
  });
}
