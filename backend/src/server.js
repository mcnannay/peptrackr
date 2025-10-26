
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import bodyParser from 'body-parser';
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 8086;

app.use(morgan('dev'));
app.use(cors()); // nginx terminates in web; this is fine for local usage
app.use(bodyParser.json({ limit: '1mb' }));

app.get('/health', (req,res)=>res.json({ok:true}));

// Initialize defaults if empty
async function ensureSeed() {
  const users = await prisma.user.findMany();
  if (users.length === 0) {
    const u = await prisma.user.create({ data: { name: 'You' } });
    await prisma.setting.upsert({
      where: { id: 1 },
      create: { id: 1, activeUserId: u.id, theme: 'dark' },
      update: { activeUserId: u.id }
    });
  }
  const meds = await prisma.med.findMany();
  if (meds.length === 0) {
    await prisma.med.createMany({
      data: [
        { name: 'Retatrutide', halfLifeDays: 8, freqDays: 7, color: '#8b5cf6' },
        { name: 'Tirzepatide', halfLifeDays: 5, freqDays: 7, color: '#22c55e' },
      ]
    });
  }
}

// State snapshot
app.get('/api/state', async (req,res)=>{
  await ensureSeed();
  const [users, meds, shots, weights, setting] = await Promise.all([
    prisma.user.findMany({ orderBy: { name: 'asc' } }),
    prisma.med.findMany({ orderBy: { name: 'asc' } }),
    prisma.shot.findMany({ orderBy: { ts: 'desc' }, take: 200 }),
    prisma.weight.findMany({ orderBy: { ts: 'desc' }, take: 200 }),
    prisma.setting.findUnique({ where: { id: 1 } }),
  ]);
  res.json({ users, meds, shots, weights, setting });
});

// Users
app.post('/api/users', async (req,res)=>{
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const u = await prisma.user.create({ data: { name } });
  res.json(u);
});

// Settings
app.patch('/api/settings', async (req,res)=>{
  const { activeUserId, theme } = req.body;
  const setting = await prisma.setting.upsert({
    where: { id: 1 },
    update: { activeUserId, theme },
    create: { id: 1, activeUserId, theme: theme ?? 'dark' }
  });
  res.json(setting);
});

// Meds
app.post('/api/meds', async (req,res)=>{
  const { name, halfLifeDays, freqDays, color } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const m = await prisma.med.create({ data: { name, halfLifeDays: Number(halfLifeDays), freqDays: Number(freqDays), color: color || '#84cc16' } });
  res.json(m);
});

app.delete('/api/meds/:id', async (req,res)=>{
  const id = req.params.id;
  // Delete shots referencing med
  await prisma.shot.deleteMany({ where: { medId: id } });
  const m = await prisma.med.delete({ where: { id } });
  res.json(m);
});

// Shots
app.get('/api/shots', async (req,res)=>{
  const skip = Number(req.query.skip || 0);
  const take = Number(req.query.take || 10);
  const items = await prisma.shot.findMany({ orderBy: { ts: 'desc' }, skip, take });
  res.json(items);
});

app.post('/api/shots', async (req,res)=>{
  const { medId, mg, ts, userId } = req.body;
  if (!medId || !mg || !ts) return res.status(400).json({ error: 'medId, mg, ts required' });
  const item = await prisma.shot.create({ data: { medId, mg: Number(mg), ts: new Date(ts), userId: userId || null } });
  res.json(item);
});

app.patch('/api/shots/:id', async (req,res)=>{
  const id = req.params.id;
  const { mg, ts } = req.body;
  const item = await prisma.shot.update({ where: { id }, data: { mg: mg !== undefined ? Number(mg) : undefined, ts: ts ? new Date(ts) : undefined } });
  res.json(item);
});

app.delete('/api/shots/:id', async (req,res)=>{
  const id = req.params.id;
  await prisma.shot.delete({ where: { id } });
  res.json({ ok: true });
});

// Weights
app.get('/api/weights', async (req,res)=>{
  const skip = Number(req.query.skip || 0);
  const take = Number(req.query.take || 10);
  const items = await prisma.weight.findMany({ orderBy: { ts: 'desc' }, skip, take });
  res.json(items);
});

app.post('/api/weights', async (req,res)=>{
  const { kg, ts, userId } = req.body;
  if (kg === undefined || !ts) return res.status(400).json({ error: 'kg, ts required' });
  const item = await prisma.weight.create({ data: { kg: Number(kg), ts: new Date(ts), userId: userId || null } });
  res.json(item);
});

app.patch('/api/weights/:id', async (req,res)=>{
  const id = req.params.id;
  const { kg, ts } = req.body;
  const item = await prisma.weight.update({ where: { id }, data: { kg: kg !== undefined ? Number(kg) : undefined, ts: ts ? new Date(ts) : undefined } });
  res.json(item);
});

app.delete('/api/weights/:id', async (req,res)=>{
  const id = req.params.id;
  await prisma.weight.delete({ where: { id } });
  res.json({ ok: true });
});

// Backup / Restore
app.get('/api/backup', async (req,res)=>{
  const [users, meds, shots, weights, setting] = await Promise.all([
    prisma.user.findMany(),
    prisma.med.findMany(),
    prisma.shot.findMany(),
    prisma.weight.findMany(),
    prisma.setting.findUnique({ where: { id: 1 } }),
  ]);
  res.json({ users, meds, shots, weights, setting });
});

app.post('/api/restore', async (req,res)=>{
  const { users, meds, shots, weights, setting } = req.body || {};
  // naive restore: wipe & insert
  await prisma.$transaction([
    prisma.shot.deleteMany(),
    prisma.weight.deleteMany(),
    prisma.med.deleteMany(),
    prisma.user.deleteMany(),
  ]);
  if (users?.length) await prisma.user.createMany({ data: users.map(({id,name})=>({id,name})) });
  if (meds?.length) await prisma.med.createMany({ data: meds.map(m=>({id:m.id,name:m.name,halfLifeDays:m.halfLifeDays,freqDays:m.freqDays,color:m.color})) });
  if (shots?.length) await prisma.shot.createMany({ data: shots.map(s=>({id:s.id,medId:s.medId,mg:s.mg,ts:new Date(s.ts),userId:s.userId||null})) });
  if (weights?.length) await prisma.weight.createMany({ data: weights.map(w=>({id:w.id,kg:w.kg,ts:new Date(w.ts),userId:w.userId||null})) });
  if (setting) await prisma.setting.upsert({ where: { id: 1 }, create: { id: 1, activeUserId: setting.activeUserId || null, theme: setting.theme || 'dark' }, update: { activeUserId: setting.activeUserId || null, theme: setting.theme || 'dark' } });
  res.json({ ok: true });
});

app.listen(PORT, async () => {
  console.log(`PepTrackr API on :${PORT}`);
  await ensureSeed();
});
