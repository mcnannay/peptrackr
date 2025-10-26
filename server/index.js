import express from 'express';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { db, init, allKV, setKV, bulkSet, clearAll } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 8080;
const DATA_DIR = process.env.DATA_DIR || './data';

const app = express();
app.use(cors());
app.use(express.json({limit:'5mb'}));

// SSE clients
const clients = new Set();
function broadcast(event, payload) {
  const data = JSON.stringify({ event, ...payload });
  for (const res of clients) {
    try { res.write(`data: ${data}\n\n`); } catch {}
  }
}

app.get('/health', (req, res) => res.json({ok:true}));

app.get('/api/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders && res.flushHeaders();
  res.write(': connected\n\n');
  clients.add(res);
  req.on('close', () => clients.delete(res));
});

// Storage API
app.get('/api/storage/all', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const data = await allKV();
    res.json(data);
  } catch (e) {
    res.status(500).json({error: e.message});
  }
});

app.post('/api/doc/set', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const sourceId = req.get('x-pep-instance') || null;
  const { key, value } = req.body || {};
  if (!key) return res.status(400).json({error:'key required'});
  try {
    await setKV(key, value);
    res.json({ok:true});
    broadcast('change', { source: sourceId, keys:[key] });
  } catch(e) {
    res.status(500).json({error:e.message});
  }
});

app.post('/api/doc/bulkset', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const sourceId = req.get('x-pep-instance') || null;
  const { data } = req.body || {};
  if (!data || typeof data !== 'object') return res.status(400).json({error:'data object required'});
  try {
    const n = await bulkSet(data);
    res.json({ok:true, count:n});
    broadcast('change', { source: sourceId, keys:Object.keys(data) });
  } catch(e) {
    res.status(500).json({error:e.message});
  }
});

// Backup export/import
app.get('/api/backup', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const data = await allKV();
    res.setHeader('Content-Disposition','attachment; filename="backup.json"');
    res.json(data);
  } catch(e) {
    res.status(500).json({error:e.message});
  }
});

app.post('/api/backup', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const sourceId = req.get('x-pep-instance') || null;
  const data = req.body || {};
  if (!data || typeof data !== 'object') return res.status(400).json({error:'object body required'});
  try {
    await bulkSet(data);
    res.json({ok:true, count:Object.keys(data).length});
    broadcast('change', { source: sourceId, keys:Object.keys(data) });
  } catch(e) {
    res.status(500).json({error:e.message});
  }
});

// Static client
const clientDir = path.resolve(__dirname, '../client_dist');
app.use(express.static(clientDir));

app.get('*', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const indexPath = path.join(clientDir, 'index.html');
  if (!fs.existsSync(indexPath)) return res.status(404).send('missing client');
  // Inject initial state
  const html = fs.readFileSync(indexPath, 'utf8');
  let boot = {};
  try { boot = await allKV(); } catch {}
  const injected = html.replace('__PEP_BOOT__', () => JSON.stringify(boot));
  res.send(injected);
});

init();
app.listen(PORT, () => console.log('Server listening on', PORT));
