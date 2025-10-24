// server.js — PepTrackr tiny backend for per-user JSON persistence
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Config
const DATA_DIR = process.env.DATA_DIR || '/data';
const PORT = process.env.PORT || 80;

// Ensure data dir exists
await fs.mkdir(DATA_DIR, { recursive: true });

// Data helpers
const usersFile = path.join(DATA_DIR, 'users.json');
async function readUsers() {
  try { return JSON.parse(await fs.readFile(usersFile, 'utf-8')); }
  catch { 
    const init = { users: [{ id: 'default', name: 'Default' }], defaultId: 'default' };
    await fs.writeFile(usersFile, JSON.stringify(init, null, 2));
    return init;
  }
}
async function writeUsers(obj) {
  await fs.writeFile(usersFile, JSON.stringify(obj, null, 2));
}
function userFile(id) { return path.join(DATA_DIR, `user_${id}.json`); }
async function readUserData(id) {
  try { return JSON.parse(await fs.readFile(userFile(id), 'utf-8')); }
  catch { 
    const empty = {
      theme: 'dark',
      meds: [],
      shots: [],
      weights: [],
      profile: { sex: 'other', heightIn: 70 },
      chart_settings: { range:30, view:'per-med', stacked:false, model:'step' },
      home_weight_range: 'month',
      screen: 'home'
    };
    await fs.writeFile(userFile(id), JSON.stringify(empty, null, 2));
    return empty;
  }
}
async function writeUserData(id, data) {
  await fs.writeFile(userFile(id), JSON.stringify(data, null, 2));
}

const app = express();
app.use(express.json({ limit: '2mb' }));

// API: Users
app.get('/api/users', async (req, res) => {
  const data = await readUsers();
  res.json(data);
});

app.post('/api/users', async (req, res) => {
  const { name } = req.body || {};
  if (!name || !String(name).trim()) return res.status(400).json({ error: 'name required' });
  const usersObj = await readUsers();
  const id = (name.toLowerCase().replace(/[^a-z0-9]+/g,'-') || 'user') + '-' + Date.now().toString(36);
  usersObj.users.push({ id, name: String(name).trim() });
  await writeUsers(usersObj);
  // Initialize data file
  await writeUserData(id, await readUserData(id));
  res.json({ ok: true, id });
});

// API: Per-user data blob (get/put)
app.get('/api/data', async (req, res) => {
  const id = req.query.user || (await readUsers()).defaultId;
  const data = await readUserData(id);
  res.json({ user: id, data });
});

app.put('/api/data', async (req, res) => {
  const id = req.query.user;
  if (!id) return res.status(400).json({ error: 'user query param required' });
  await writeUserData(id, req.body);
  res.json({ ok: true });
});

// Static UI
const distDir = path.join(__dirname, 'dist');
app.use(express.static(distDir));
app.get('*', (req, res) => res.sendFile(path.join(distDir, 'index.html')));

app.listen(PORT, () => console.log(`PepTrackr server listening on :${PORT}, data dir ${DATA_DIR}`));
