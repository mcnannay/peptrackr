import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const app = express()

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data')
const DATA_FILE = path.join(DATA_DIR, 'data.json')

function ensureData(){
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, {recursive:true})
  if (!fs.existsSync(DATA_FILE)){
    const seed = {
      users: [{id:'u1', name:'You', sex:'M', heightCm:180}],
      currentUserId: 'u1',
      meds: [],
      shots: [],
      weights: []
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(seed, null, 2))
  }
}
function load(){ ensureData(); return JSON.parse(fs.readFileSync(DATA_FILE,'utf-8')) }
function save(obj){ fs.writeFileSync(DATA_FILE, JSON.stringify(obj, null, 2)) }

app.use(express.json())

// Avoid stale SPA shell caching
app.get('/', (req,res,next)=>{
  res.set('Cache-Control','no-store, no-cache, must-revalidate, proxy-revalidate')
  res.set('Pragma','no-cache'); res.set('Expires','0'); next()
})

// ---- API ----
app.get('/api/health', (req,res)=>res.json({ok:true, version:'16.6.0'}))

// Users
app.get('/api/users', (req,res)=>{ const db=load(); res.json({users:db.users, currentUserId:db.currentUserId}) })
app.post('/api/users', (req,res)=>{
  const {name, sex='M', heightCm=170} = req.body||{}
  if (!name) return res.status(400).json({error:'name required'})
  const db = load(); const id = 'u'+Math.random().toString(36).slice(2,8)
  db.users.push({id, name, sex, heightCm:Number(heightCm)||170})
  if (!db.currentUserId) db.currentUserId = id
  save(db); res.json({id})
})
app.put('/api/users/:id', (req,res)=>{
  const db=load(); const u = db.users.find(x=>x.id===req.params.id)
  if (!u) return res.status(404).json({error:'not found'})
  const {name, sex, heightCm} = req.body||{}
  if (name!=null) u.name = name
  if (sex!=null) u.sex = sex
  if (heightCm!=null) u.heightCm = Number(heightCm)
  save(db); res.json({ok:true})
})
app.delete('/api/users/:id', (req,res)=>{
  const db=load(); const i = db.users.findIndex(x=>x.id===req.params.id)
  if (i<0) return res.status(404).json({error:'not found'})
  const removed = db.users.splice(i,1)[0]
  if (db.currentUserId===removed.id){
    db.currentUserId = db.users[0]?.id || null
  }
  save(db); res.json({ok:true})
})
app.post('/api/users/:id/select', (req,res)=>{
  const db=load(); if (!db.users.some(u=>u.id===req.params.id)) return res.status(404).json({error:'not found'})
  db.currentUserId = req.params.id; save(db); res.json({ok:true})
})

// Meds
app.get('/api/meds', (req,res)=>{ const db=load(); res.json({meds: db.meds}) })
app.post('/api/meds', (req,res)=>{
  const {name, halfLifeDays, color='#60a5fa', cadenceDays=7, enabled=true} = req.body||{}
  if (!name) return res.status(400).json({error:'name required'})
  const db=load(); const id='m'+Math.random().toString(36).slice(2,8)
  db.meds.push({id, name, halfLifeDays:Number(halfLifeDays)||7, color, cadenceDays:Number(cadenceDays)||7, enabled: !!enabled})
  save(db); res.json({id})
})
app.put('/api/meds/:id', (req,res)=>{
  const db=load(); const m = db.meds.find(x=>x.id===req.params.id); if (!m) return res.status(404).json({error:'not found'})
  const {name, halfLifeDays, color, cadenceDays, enabled} = req.body||{}
  if (name!=null) m.name=name
  if (halfLifeDays!=null) m.halfLifeDays=Number(halfLifeDays)
  if (color!=null) m.color=color
  if (cadenceDays!=null) m.cadenceDays=Number(cadenceDays)
  if (enabled!=null) m.enabled=!!enabled
  save(db); res.json({ok:true})
})
app.delete('/api/meds/:id', (req,res)=>{
  const db=load(); const i=db.meds.findIndex(x=>x.id===req.params.id); if (i<0) return res.status(404).json({error:'not found'})
  db.meds.splice(i,1); save(db); res.json({ok:true})
})

// Shots
app.get('/api/shots', (req,res)=>{ const db=load(); res.json({shots: db.shots}) })
app.post('/api/shots', (req,res)=>{
  const {userId, medId, date, mg} = req.body||{}
  if (!userId || !medId || !date || mg==null) return res.status(400).json({error:'userId, medId, date, mg required'})
  const db=load(); const id='s'+Math.random().toString(36).slice(2,8)
  db.shots.push({id, userId, medId, date, mg:Number(mg)})
  save(db); res.json({id})
})

// Weights
app.get('/api/weights', (req,res)=>{ const db=load(); res.json({weights: db.weights}) })
app.post('/api/weights', (req,res)=>{
  const {userId, date, kg} = req.body||{}
  if (!userId || !date || kg==null) return res.status(400).json({error:'userId, date, kg required'})
  const db=load(); const id='w'+Math.random().toString(36).slice(2,8)
  db.weights.push({id, userId, date, kg:Number(kg)}); save(db); res.json({id})
})

// Static
app.use(express.static(path.join(__dirname,'dist'), { maxAge:'1d', etag:true }))
app.get('*',(req,res)=>{
  res.set('Cache-Control','no-store, no-cache, must-revalidate, proxy-revalidate')
  res.sendFile(path.join(__dirname,'dist','index.html'))
})

app.listen(80, ()=>console.log('PepTrackr listening on :80 — data at', DATA_FILE))
