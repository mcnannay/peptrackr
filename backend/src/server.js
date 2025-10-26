import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 8086;

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.get('/health', (req, res) => res.status(200).send('ok'));
app.get('/api/health', (req, res) => res.status(200).json({ ok: true }));

// Ensure singleton settings row
async function ensureSettings() {
  const s = await prisma.settings.findUnique({ where: { id: 1 } });
  if (!s) {
    await prisma.settings.create({ data: { id: 1, theme: 'dark', currentUserId: null } });
  }
}
await ensureSettings();

// --------- State
app.get('/api/state', async (req, res) => {
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  const users = await prisma.user.findMany();
  const meds = await prisma.medication.findMany();
  res.json({ settings, users, meds });
});

// --------- Settings
app.patch('/api/settings', async (req, res) => {
  const { theme, currentUserId } = req.body || {};
  const s = await prisma.settings.update({
    where: { id: 1 },
    data: {
      ...(theme ? { theme } : {}),
      ...(typeof currentUserId !== 'undefined' ? { currentUserId } : {}),
    }
  });
  res.json({ ok: true, settings: s });
});

// --------- Users
app.post('/api/users', async (req, res) => {
  const { name } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name required' });
  const user = await prisma.user.create({ data: { name } });
  // if first user, set currentUserId
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  if (!settings.currentUserId) {
    await prisma.settings.update({ where: { id: 1 }, data: { currentUserId: user.id } });
  }
  res.json(user);
});

app.get('/api/users', async (req, res) => {
  const users = await prisma.user.findMany();
  res.json(users);
});

// --------- Meds
app.post('/api/meds', async (req, res) => {
  const { name, halfLifeHours, absorptionHalfLifeHours, freqDays } = req.body || {};
  if (!name || !halfLifeHours || !absorptionHalfLifeHours) return res.status(400).json({ error: 'name, halfLifeHours, absorptionHalfLifeHours required' });
  const med = await prisma.medication.upsert({
    where: { name },
    update: { halfLifeHours, absorptionHalfLifeHours, freqDays: freqDays ?? 7 },
    create: { name, halfLifeHours, absorptionHalfLifeHours, freqDays: freqDays ?? 7 }
  });
  res.json(med);
});

app.get('/api/meds', async (req, res) => {
  const meds = await prisma.medication.findMany();
  res.json(meds);
});

// Quick add presets with adjustable frequency & absorption
app.post('/api/meds/preset', async (req, res) => {
  const { key, freqDays, absorptionHalfLifeHours } = req.body || {};
  const presets = {
    Retatrutide: { name: 'Retatrutide', halfLifeHours: 160.0, absorptionHalfLifeHours: absorptionHalfLifeHours ?? 12, defaultFreq: 7 },
    Tirzepatide: { name: 'Tirzepatide', halfLifeHours: 120.0, absorptionHalfLifeHours: absorptionHalfLifeHours ?? 12, defaultFreq: 7 },
  };
  const p = presets[key];
  if (!p) return res.status(400).json({ error: 'unknown preset' });
  const med = await prisma.medication.upsert({
    where: { name: p.name },
    update: { halfLifeHours: p.halfLifeHours, absorptionHalfLifeHours: p.absorptionHalfLifeHours, freqDays: freqDays ?? p.defaultFreq },
    create: { name: p.name, halfLifeHours: p.halfLifeHours, absorptionHalfLifeHours: p.absorptionHalfLifeHours, freqDays: freqDays ?? p.defaultFreq }
  });
  res.json(med);
});

// --------- Shots
app.post('/api/shots', async (req, res) => {
  const { userId, medId, doseMg, takenAt } = req.body || {};
  if (!userId || !medId || typeof doseMg === 'undefined') return res.status(400).json({ error: 'userId, medId, doseMg required' });
  const shot = await prisma.shot.create({ data: { userId, medId, doseMg, takenAt: takenAt ? new Date(takenAt) : new Date() } });
  res.json(shot);
});

app.post('/api/shots/bulk', async (req, res) => {
  const { userId, medId, doseMg, startAt, count, intervalDays } = req.body || {};
  if (!userId || !medId || typeof doseMg === 'undefined' || !count) return res.status(400).json({ error: 'userId, medId, doseMg, count required' });
  const c = Math.max(1, Math.min(52, parseInt(count, 10) || 1));
  const step = Math.max(1, parseInt(intervalDays, 10) || 7);
  const start = startAt ? new Date(startAt) : new Date();
  const data = [];
  for (let i = 0; i < c; i++) {
    const d = new Date(start.getTime());
    d.setDate(d.getDate() + i * step);
    data.push({ userId, medId, doseMg, takenAt: d });
  }
  const created = await prisma.shot.createMany({ data });
  res.json({ ok: true, count: created.count });
});

app.get('/api/shots', async (req, res) => {
  const skip = parseInt(req.query.skip || '0', 10);
  const take = Math.min(50, parseInt(req.query.take || '10', 10));
  const shots = await prisma.shot.findMany({
    orderBy: { takenAt: 'desc' },
    include: { medication: true, user: true },
    skip, take
  });
  res.json(shots);
});

app.patch('/api/shots/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { doseMg, takenAt } = req.body || {};
  const shot = await prisma.shot.update({ where: { id }, data: { ...(doseMg!=null?{doseMg}:{}), ...(takenAt?{takenAt:new Date(takenAt)}:{}) } });
  res.json(shot);
});

app.delete('/api/shots/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  await prisma.shot.delete({ where: { id } });
  res.json({ ok: true });
});

// --------- Weights
app.post('/api/weights', async (req, res) => {
  const { userId, valueKg, takenAt } = req.body || {};
  if (!userId || typeof valueKg === 'undefined') return res.status(400).json({ error: 'userId, valueKg required' });
  const w = await prisma.weight.create({ data: { userId, valueKg, takenAt: takenAt ? new Date(takenAt) : new Date() } });
  res.json(w);
});

app.get('/api/weights', async (req, res) => {
  const { userId } = req.query;
  const skip = parseInt(req.query.skip || '0', 10);
  const take = Math.min(50, parseInt(req.query.take || '10', 10));
  const where = userId ? { userId: parseInt(userId, 10) } : {};
  const ws = await prisma.weight.findMany({ where, orderBy: { takenAt: 'desc' }, skip, take });
  res.json(ws);
});

app.patch('/api/weights/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { valueKg, takenAt } = req.body || {};
  const w = await prisma.weight.update({ where: { id }, data: { ...(valueKg!=null?{valueKg}:{}), ...(takenAt?{takenAt:new Date(takenAt)}:{}) } });
  res.json(w);
});

app.delete('/api/weights/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  await prisma.weight.delete({ where: { id } });
  res.json({ ok: true });
});

// --------- Start
app.listen(PORT, () => {
  console.log(`PepTrackr backend listening on ${PORT}`);
});
