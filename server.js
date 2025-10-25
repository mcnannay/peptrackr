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
    const seed = { users:[{id:'u1',name:'You',sex:'M',heightCm:180}], currentUserId:'u1', meds:[], shots:[], weights:[] }
    fs.writeFileSync(DATA_FILE, JSON.stringify(seed,null,2))
  }
}
function load(){ ensureData(); return JSON.parse(fs.readFileSync(DATA_FILE,'utf-8')) }
function save(obj){ fs.writeFileSync(DATA_FILE, JSON.stringify(obj, null, 2)) }

app.use(express.json())

// Health
app.get('/api/health', (req,res)=>res.json({ok:true, version:'v16.5.2+server'}))

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

// Sync (bulk meds/shots/weights) so we don't rewrite your handlers
app.get('/api/sync', (req,res)=>{
  const db=load(); res.json({ meds:db.meds, shots:db.shots, weights:db.weights })
})
app.post('/api/sync', (req,res)=>{
  const db=load()
  const { meds, shots, weights } = req.body||{}
  if (Array.isArray(meds)) db.meds = meds
  if (Array.isArray(shots)) db.shots = shots
  if (Array.isArray(weights)) db.weights = weights
  save(db); res.json({ok:true})
})

// Static (serve built app)
app.use(express.static(path.join(__dirname,'dist'), { maxAge:'1d', etag:true }))
app.get('*',(req,res)=>{
  res.set('Cache-Control','no-store, no-cache, must-revalidate, proxy-revalidate')
  res.sendFile(path.join(__dirname,'dist','index.html'))
})

app.listen(80, ()=>console.log('PepTrackr listening on :80 — data at', DATA_FILE))
