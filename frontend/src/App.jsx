
import React, { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Home, Settings, Weight as WeightIcon, Syringe, Calculator, Moon, Sun, ChevronLeft, ChevronRight, Upload, Download, Trash2, Edit3, Info } from 'lucide-react'


function ToggleChip({options,value,onChange,theme}){
  const isDark = theme==='dark';
  return (
    <div style={{display:'inline-flex',gap:8, background: isDark?'#0b0b0c':'#ffffff', border:'1px solid #27272a', borderRadius:12, padding:4}}>
      {options.map(opt=>{
        const active = value===opt.value;
        return (
          <button key={opt.value} type="button" onClick={()=>onChange(opt.value)}
            style={{
              all:'unset', cursor:'pointer', padding:'8px 12px', borderRadius:8,
              background: active ? (isDark?'#111827':'#e5e7eb') : 'transparent',
              border: active ? '1px solid #3f3f46' : '1px solid transparent',
              outline: active ? (isDark?'2px solid #4f46e5':'2px solid #6366f1') : 'none',
              outlineOffset: 0,
              color: active ? (isDark?'#ffffff':'#111827') : (isDark?'#cbd5e1':'#334155'),
              fontSize:12
            }}>
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}


const VERSION = '0.4.5'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, AreaChart, Area, ReferenceLine } from 'recharts'

const dayMs = 24*60*60*1000
const api = {
  async state(){ const r = await fetch('/api/state'); return r.json() },
  async addUser(name){ const r = await fetch('/api/users',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name})}); return r.json() },
  async setSettings(payload){ const r = await fetch('/api/settings',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}); return r.json() },
  async addMed(payload){ const r = await fetch('/api/meds',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}); return r.json() },
  async delMed(id){ const r = await fetch('/api/meds/'+id,{method:'DELETE'}); return r.json() },
  async listShots(skip=0,take=10){ const r = await fetch(`/api/shots?skip=${skip}&take=${take}`); return r.json() },
  async addShot(payload){ const r = await fetch('/api/shots',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}); return r.json() },
  async updShot(id,payload){ const r = await fetch('/api/shots/'+id,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}); return r.json() },
  async delShot(id){ const r = await fetch('/api/shots/'+id,{method:'DELETE'}); return r.json() },
  async listWeights(skip=0,take=10){ const r = await fetch(`/api/weights?skip=${skip}&take=${take}`); return r.json() },
  async addWeight(payload){ const r = await fetch('/api/weights',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}); return r.json() },
  async updWeight(id,payload){ const r = await fetch('/api/weights/'+id,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}); return r.json() },
  async delWeight(id){ const r = await fetch('/api/weights/'+id,{method:'DELETE'}); return r.json() },
  async backup(){ const r = await fetch('/api/backup'); return r.json() },
  async restore(json){ const r = await fetch('/api/restore',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(json)}); return r.json() },
}

function PepWordmark(){ return (
  <div style={{display:'flex',alignItems:'center',gap:8}}>
    <svg width="24" height="24" viewBox="0 0 100 100" aria-hidden>
      <defs>
        <linearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
      </defs>
      <rect x="8" y="8" width="84" height="84" rx="20" fill="url(#grad)" />
      <path d="M28 68V32h22q9 0 14 4.5T69 48q0 9-6 14.5T48 68H28Zm12-12h8q5 0 7.5-2.5T58 48q0-3-2.5-5.5T48 40h-8v16Z" fill="#0a0a0a" />
      <rect x="60" y="28" width="12" height="8" rx="3" fill="#0a0a0a" />
    </svg>
    <span style={{fontWeight:600,backgroundImage:'linear-gradient(90deg,#a78bfa,#67e8f9)',WebkitBackgroundClip:'text',color:'transparent'}}>PepTrackr</span>
  </div>
)}

const TABS = [
  { key: 'settings', label: 'Settings', icon: Settings },
  { key: 'weight', label: 'Weight', icon: WeightIcon },
  { key: 'home', label: 'Home', icon: Home },
  { key: 'shot', label: 'Shot', icon: Syringe },
  { key: 'calc', label: 'Calc', icon: Calculator },
]

function exponentialDecayRemaining(doseMg, elapsedDays, halfLifeDays){
  if (halfLifeDays <= 0) return 0
  const factor = Math.pow(0.5, elapsedDays / halfLifeDays)
  return doseMg * factor
}

function buildPKSeries(shots, meds, startTs, endTs, stepMinutes=60){
  const steps = []
  for(let t=startTs;t<=endTs;t+=stepMinutes*60*1000) steps.push(t)
  const map = {}; meds.forEach(m=>map[m.id]=[])
  for(const t of steps){
    for(const m of meds){
      const total = shots.filter(s=>s.medId===m.id && new Date(s.ts).getTime()<=t)
        .reduce((acc,s)=>acc+exponentialDecayRemaining(s.mg,(t-new Date(s.ts).getTime())/dayMs,m.halfLifeDays),0)
      map[m.id].push({t,total})
    }
  }
  return map
}
function buildStepSeries(shots, meds, startTs, endTs){
  const steps=[]; for(let t=startTs;t<=endTs;t+=60*60*1000) steps.push(t)
  const map={}; meds.forEach(m=>map[m.id]=[])
  for(const t of steps){
    for(const m of meds){
      const total = shots.filter(s=>s.medId===m.id && new Date(s.ts).getTime()<=t).reduce((a,s)=>a+s.mg,0)
      map[m.id].push({t,total})
    }
  }
  return map
}

export default function App(){
  const [tab,setTab] = useState('home')
  const [state,setState] = useState({users:[],meds:[],shots:[],weights:[],setting:{theme:'dark'}})
  const activeUser = state.users.find(u=>u.id===state.setting?.activeUserId) || state.users[0]
  const theme = state.setting?.theme || 'dark'

  const [range,setRange] = useState('30d')
  const [model,setModel] = useState('pk')
  const now = Date.now()
  const startTs = useMemo(()=> now - (range==='7d'?7:range==='30d'?30:90)*dayMs, [range, now])

  useEffect(()=>{ document.body.style.backgroundColor = theme==='dark' ? '#09090b' : 'white' },[theme])

  async function refresh(){ setState(await api.state()) }
  useEffect(()=>{ refresh() },[])

  const medSeries = useMemo(()=>{
    const meds = state.meds
    if (model==='pk') return buildPKSeries(state.shots, meds, startTs, now)
    return buildStepSeries(state.shots, meds, startTs, now)
  },[state.shots,state.meds,startTs,now,model])

  return (
    <div style={{minHeight:'100vh',color:'#e4e4e7',display:'flex',flexDirection:'column'}}>
      <div style={{position:'sticky',top:0,backdropFilter:'blur(6px)',background: theme==='dark' ? '#0b0b0c' : '#ffffff', borderBottom:'1px solid #27272a'}}>
        <div style={{maxWidth:420,margin:'0 auto',padding:'12px 16px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <PepWordmark/>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <span style={{fontSize:12,color:'#a1a1aa'}}>{activeUser?.name||'User'}</span>
            <span style={{fontSize:11,padding:'4px 8px',borderRadius:999,border:'1px solid #3f3f46',background:'#111827',color:'#e5e7eb'}}>v{VERSION}</span>
            <button onClick={async ()=>{ await api.setSettings({theme: theme==='dark'?'light':'dark'}) ; refresh() }} style={{padding:8,border:'1px solid #3f3f46',borderRadius:12}}>
              {theme==='dark'? <Sun size={18}/> : <Moon size={18}/>}
            </button>
          </div>
        </div>
      </div>

      {tab==='home' && <HomeScreen state={state} medSeries={medSeries} model={model} setModel={setModel} range={range} setRange={setRange} now={now} />}
      {tab==='settings' && <SettingsScreen state={state} refresh={refresh} />}
      {tab==='shot' && <ShotScreen state={state} refresh={refresh} />}
      {tab==='weight' && <WeightScreen state={state} refresh={refresh} />}
      {tab==='calc' && <CalcScreen />}

      <nav style={{position:'sticky',bottom:0, borderTop:'1px solid #27272a', background: theme==='dark' ? '#0b0b0c' : '#ffffff'}}>
        <div style={{maxWidth:420,margin:'0 auto',padding:'8px',display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:'4px'}}>
          {TABS.map(t => {
            const active = tab===t.key
            const Icon = t.icon
            return (
  <button
    key={t.key}
    type="button"
    onClick={() => setTab(t.key)}
    style={{
      all: 'unset',
      cursor: 'pointer',
      WebkitTapHighlightColor: 'transparent',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 4,
      color: active
        ? (theme === 'dark' ? '#ffffff' : '#111827')
        : (theme === 'dark' ? '#cbd5e1' : '#334155')
    }}
  >
    <div
      style={{
        padding: 10,
        borderRadius: 14,
        background: active
          ? (theme === 'dark' ? '#111827' : '#e5e7eb')
          : 'transparent',
        border: active ? '1px solid #3f3f46' : '1px solid transparent',
        outline: active
          ? (theme === 'dark' ? '2px solid #4f46e5' : '2px solid #6366f1')
          : 'none',
        outlineOffset: 0
      }}
    >
      <Icon size={22} strokeWidth={2.2} />
    </div>
    <span style={{ fontSize: 10 }}>{t.label}</span>
  </button>
)
          })}
        </div>
      </nav>
    </div>
  )
}

function HomeScreen({ state, medSeries, model, setModel, range, setRange, now }){
  const meds = state.meds
  const allTs = Array.from(new Set(Object.values(medSeries).flat().map(p=>p.t))).sort((a,b)=>a-b)
  const dataMerged = allTs.map(t=>{
    const row = { t, date: new Date(t).toLocaleDateString() }
    for(const m of meds){
      const p = medSeries[m.id].find(p=>p.t===t)
      row[m.name] = p ? +p.total.toFixed(2) : 0
    }
    return row
  })

  const weights = state.weights.slice().sort((a,b)=> new Date(a.ts)-new Date(b.ts)).map(w=>({ t:new Date(w.ts).getTime(), date:new Date(w.ts).toLocaleDateString(), kg:w.kg }))
  const latestW = state.weights[0]?.kg ?? 85
  const heightCm = 175
  const bmi = +(latestW / Math.pow(heightCm/100,2)).toFixed(1)

  return (
    <div style={{maxWidth:420, margin:'0 auto', padding:16, display:'grid', gap:16}}>
      <div style={{padding:16, border:'1px solid #27272a', borderRadius:16, background:'#0b0b0c'}}>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
          <h2 style={{fontSize:14}}>Medication in system</h2>
          <div style={{display:'flex',gap:8}}>
            <button onClick={()=>setModel(model==='pk'?'step':'pk')} style={{border:'1px solid #3f3f46',borderRadius:12,padding:'6px 10px',color:'#e4e4e7'}}>{model==='pk'?'PK model':'Step model'}</button>
            <select value={range} onChange={e=>setRange(e.target.value)} style={{border:'1px solid #3f3f46',borderRadius:12,padding:'6px 10px',background:'#0b0b0c',color:'#e4e4e7'}}>
              <option value="7d">7d</option>
              <option value="30d">30d</option>
              <option value="90d">90d</option>
            </select>
          </div>
        </div>
        <div style={{height:176}}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dataMerged} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
              <XAxis dataKey="date" hide />
              <YAxis hide />
              <Tooltip contentStyle={{ background: '#0a0a0a', border: '1px solid #27272a' }} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              {state.meds.map(m => (
                <Area key={m.id} type="monotone" dataKey={m.name} stackId={model==='step'?'1':undefined} stroke={m.color} fill={m.color} fillOpacity={0.25} />
              ))}
              <ReferenceLine x={new Date(now).toLocaleDateString()} stroke="#71717a" strokeDasharray="3 3" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
        {(state.meds.slice(0,2)).map((m,idx)=>{
          const last = state.shots.filter(s=>s.medId===m.id).sort((a,b)=>new Date(b.ts)-new Date(a.ts))[0]
          const dueTs = last ? new Date(last.ts).getTime() + m.freqDays*dayMs : Date.now()
          const msLeft = Math.max(0, dueTs - Date.now())
          return (
            <div key={m.id} style={{padding:16, border:'1px solid #27272a', borderRadius:16, background:'#0b0b0c', display:'flex', flexDirection:'column', alignItems:'center'}}>
              <div style={{fontSize:12,color:'#a1a1aa',marginBottom:6}}>Next dose: {m.name}</div>
              <CircularETA msLeft={msLeft} color={m.color} />
              <div style={{fontSize:12,color:'#a1a1aa',marginTop:6}}>Due {msLeft===0?'now':humanizeMs(msLeft)}</div>
            </div>
          )
        })}
      </div>

      <div style={{padding:16, border:'1px solid #27272a', borderRadius:16, background:'#0b0b0c'}}>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
          <h2 style={{fontSize:14}}>Weight</h2>
        </div>
        <div style={{height:144}}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={weights} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
              <XAxis dataKey="date" hide/>
              <YAxis hide/>
              <Tooltip contentStyle={{ background: '#0a0a0a', border: '1px solid #27272a' }}/>
              <Line type="monotone" dataKey="kg" stroke="#22c55e" dot={false}/>
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div style={{marginTop:12}}>
          <BMIGauge bmi={bmi} />
        </div>
      </div>
    </div>
  )
}

function humanizeMs(ms){
  const s = Math.floor(ms/1000)
  const d = Math.floor(s/86400)
  const h = Math.floor((s%86400)/3600)
  const m = Math.floor((s%3600)/60)
  if (d>0) return `${d}d ${h}h`
  if (h>0) return `${h}h ${m}m`
  return `${m}m`
}

function CircularETA({ msLeft, color }){
  const radius=38, stroke=8, C=2*Math.PI*radius
  const cycle = 7*dayMs
  const p = 1 - Math.min(1, msLeft / cycle)
  return (
    <svg width={96} height={96} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r={radius} stroke="#27272a" strokeWidth={stroke} fill="none"/>
      <circle cx="50" cy="50" r={radius} stroke={color} strokeWidth={stroke} fill="none"
        strokeDasharray={`${C}`} strokeDashoffset={`${(1-p)*C}`} strokeLinecap="round" transform="rotate(-90 50 50)" />
      <text x="50" y="54" textAnchor="middle" fontSize="14" fill="#e4e4e7">{humanizeMs(msLeft)}</text>
    </svg>
  )
}

function BMIGauge({ bmi }){
  const max = 40
  const pct = Math.min(100, (bmi/max)*100)
  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'#a1a1aa',marginBottom:6}}>
        <span>BMI</span><span style={{color:'#e4e4e7'}}>{bmi}</span>
      </div>
      <div style={{position:'relative',height:16,borderRadius:999,overflow:'hidden',background:'#1f1f22',border:'1px solid #3f3f46'}}>
        <div style={{position:'absolute',inset:'0 0 0 0', width:`${pct}%`, background:'linear-gradient(90deg,#22c55e,#8b5cf6)'}}/>
        <div style={{position:'absolute',inset:0,display:'flex',justifyContent:'space-between',alignItems:'center',padding:'0 8px',fontSize:10,color:'#a1a1aa'}}>
          <span>Under</span><span>Healthy</span><span>Over</span><span>Obese</span><span>Severe</span>
        </div>
      </div>
    </div>
  )
}

function SettingsScreen({ state, refresh }){
  const [userName,setUserName]=useState('')
  const [customMed,setCustomMed]=useState({ name:'', halfLifeDays:5, freqDays:7, color:'#84cc16' })
  const theme = state.setting?.theme || 'dark'

  return (
    <div style={{maxWidth:420, margin:'0 auto', padding:16, display:'grid', gap:16}}>
      <section style={{padding:16,border:'1px solid #27272a',borderRadius:16,background:'#0b0b0c'}}>
        <h2 style={{fontWeight:600,marginBottom:12}}>Users</h2>
        <div style={{display:'flex',gap:8,marginBottom:12}}>
          <input placeholder="New user name" value={userName} onChange={e=>setUserName(e.target.value)} style={{flex:1,background:'#18181b',color:'#e4e4e7',border:'1px solid #3f3f46',borderRadius:12,padding:'8px 10px'}}/>
          <button onClick={async ()=>{ if(!userName.trim())return; await api.addUser(userName.trim()); setUserName(''); refresh() }} style={{background:'#4f46e5',color:'white',borderRadius:12,padding:'8px 12px'}}>Add</button>
        </div>
        <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
          {state.users.map(u=> (
            <button key={u.id} onClick={async ()=>{ await api.setSettings({activeUserId:u.id}); refresh() }} style={{padding:'8px 10px',borderRadius:12,border:'1px solid #3f3f46', background: state.setting?.activeUserId===u.id?'#18181b':'transparent', color:'#e4e4e7'}}>
              {u.name}
            </button>
          ))}
        </div>
      </section>

      <section style={{padding:16,border:'1px solid #27272a',borderRadius:16,background:'#0b0b0c'}}>
        <h2 style={{fontWeight:600,marginBottom:12}}>Medications</h2>
        <div style={{display:'flex',flexWrap:'wrap',gap:8,marginBottom:12}}>
          {state.meds.map(m=> (
            <div key={m.id} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 10px',borderRadius:12,border:'1px solid #27272a',background:'#0a0a0a'}}>
              <span style={{width:10,height:10,borderRadius:999,background:m.color}}/>
              <span style={{fontSize:14}}>{m.name} · t½ {m.halfLifeDays}d · every {m.freqDays}d</span>
              <button onClick={async ()=>{ await api.delMed(m.id); refresh() }} style={{marginLeft:8,color:'#f87171'}}>Remove</button>
            </div>
          ))}
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:12}}>
          <span style={{fontSize:12,color:'#a1a1aa'}}>Quick add:</span>
          <button onClick={async ()=>{ await api.addMed({name:'Retatrutide', halfLifeDays:8, freqDays:7, color:'#8b5cf6'}); refresh() }} style={{border:'1px solid #3f3f46',borderRadius:12,padding:'6px 10px'}}>Retatrutide</button>
          <button onClick={async ()=>{ await api.addMed({name:'Tirzepatide', halfLifeDays:5, freqDays:7, color:'#22c55e'}); refresh() }} style={{border:'1px solid #3f3f46',borderRadius:12,padding:'6px 10px'}}>Tirzepatide</button>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
          <div><label style={{fontSize:12,color:'#a1a1aa'}}>Name</label><input value={customMed.name} onChange={e=>setCustomMed({...customMed,name:e.target.value})} style={{width:'100%',background:'#18181b',color:'#e4e4e7',border:'1px solid #3f3f46',borderRadius:12,padding:'8px 10px'}}/></div>
          <div><label style={{fontSize:12,color:'#a1a1aa'}}>Half-life (days)</label><input type="number" step="0.1" value={customMed.halfLifeDays} onChange={e=>setCustomMed({...customMed,halfLifeDays:+e.target.value})} style={{width:'100%',background:'#18181b',color:'#e4e4e7',border:'1px solid #3f3f46',borderRadius:12,padding:'8px 10px'}}/></div>
          <div><label style={{fontSize:12,color:'#a1a1aa'}}>Frequency (days)</label><input type="number" step="1" value={customMed.freqDays} onChange={e=>setCustomMed({...customMed,freqDays:+e.target.value})} style={{width:'100%',background:'#18181b',color:'#e4e4e7',border:'1px solid #3f3f46',borderRadius:12,padding:'8px 10px'}}/></div>
          <div><label style={{fontSize:12,color:'#a1a1aa'}}>Color</label><input type="color" value={customMed.color} onChange={e=>setCustomMed({...customMed,color:e.target.value})} style={{width:'100%',height:38,borderRadius:12,border:'1px solid #3f3f46',background:'#18181b'}}/></div>
        </div>
        <div style={{display:'flex',justifyContent:'flex-end',marginTop:8}}>
          <button onClick={async ()=>{ if(!customMed.name.trim()) return; await api.addMed(customMed); setCustomMed({ name:'', halfLifeDays:5, freqDays:7, color:'#84cc16' }); refresh() }} style={{background:'#4f46e5',color:'white',borderRadius:12,padding:'8px 12px'}}>Add custom</button>
        </div>
      </section>

      <section style={{padding:16,border:'1px solid #27272a',borderRadius:16,background:'#0b0b0c'}}>
        <h2 style={{fontWeight:600,marginBottom:12}}>Appearance & Data</h2>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span style={{fontSize:14}}>Theme</span>
          <div style={{display:'flex',gap:8}}>
            <button onClick={async ()=>{ await api.setSettings({ theme:'dark' }); refresh() }} style={{border:'1px solid #3f3f46',borderRadius:12,padding:'6px 10px'}}><Moon size={16}/> Dark</button>
            <button onClick={async ()=>{ await api.setSettings({ theme:'light' }); refresh() }} style={{border:'1px solid #3f3f46',borderRadius:12,padding:'6px 10px'}}><Sun size={16}/> Light</button>
          </div>
        </div>
        <div style={{display:'flex',gap:8,marginTop:8}}>
          <button onClick={async ()=>{ const data = await api.backup(); const blob = new Blob([JSON.stringify(data,null,2)],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='peptrackr-backup.json'; a.click(); URL.revokeObjectURL(url) }} style={{background:'#4f46e5',color:'white',borderRadius:12,padding:'8px 12px'}}>Backup JSON</button>
          <label style={{display:'inline-flex',alignItems:'center',gap:8,border:'1px solid #3f3f46',borderRadius:12,padding:'8px 12px',cursor:'pointer'}}>
            <Upload size={16}/> Restore JSON
            <input type="file" accept="application/json" style={{display:'none'}} onChange={async (e)=>{
              const f=e.target.files?.[0]; if(!f) return;
              const txt = await f.text(); const json = JSON.parse(txt);
              await api.restore(json); await refresh();
            }}/>
          </label>
        </div>
      </section>

      <section style={{padding:16,border:'1px solid #27272a',borderRadius:16,background:'#0b0b0c'}}>
        <h2 style={{color:'#f87171',fontWeight:700}}>Danger zone</h2>
        <p style={{fontSize:12,color:'#a1a1aa'}}>Use backup before resetting via database tools if needed.</p>
      </section>
    </div>
  )
}

function ShotScreen({ state, refresh }){
  const firstMed = state.meds[0]?.id || ''
  const [medId,setMedId]=useState(firstMed)
  const [mg,setMg]=useState(2.5)
  const [ts,setTs]=useState(new Date().toISOString().slice(0,16))
  const [page,setPage]=useState(0)
  const perPage=10
  const [items,setItems]=useState([])

  useEffect(()=>{ load() },[page])
  async function load(){ setItems(await api.listShots(page*perPage, perPage)) }

  return (
    <div style={{maxWidth:420, margin:'0 auto', padding:16, display:'grid', gap:16}}>
      <div style={{padding:16,border:'1px solid #27272a',borderRadius:16,background:'#0b0b0c'}}>
        <h2 style={{fontWeight:600,marginBottom:12}}>Log a shot</h2>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
          <div>
            <label style={{fontSize:12,color:'#a1a1aa'}}>Medication</label>
            <select value={medId} onChange={e=>setMedId(e.target.value)} style={{width:'100%',background:'#18181b',color:'#e4e4e7',border:'1px solid #3f3f46',borderRadius:12,padding:'8px 10px'}}>
              {state.meds.map(m=> <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{fontSize:12,color:'#a1a1aa'}}>Dosage (mg)</label>
            <input type="number" step="0.25" value={mg} onChange={e=>setMg(+e.target.value)} style={{width:'100%',background:'#18181b',color:'#e4e4e7',border:'1px solid #3f3f46',borderRadius:12,padding:'8px 10px'}}/>
          </div>
          <div style={{gridColumn:'1 / -1'}}>
            <label style={{fontSize:12,color:'#a1a1aa'}}>Date & time</label>
            <input type="datetime-local" value={ts} onChange={e=>setTs(e.target.value)} style={{width:'100%',background:'#18181b',color:'#e4e4e7',border:'1px solid #3f3f46',borderRadius:12,padding:'8px 10px'}}/>
          </div>
        </div>
        <div style={{display:'flex',justifyContent:'flex-end',marginTop:8}}>
          <button onClick={async ()=>{ if(!medId) return; await api.addShot({ medId, mg, ts }); await load(); await refresh() }} style={{background:'#4f46e5',color:'white',borderRadius:12,padding:'8px 12px'}}>Save shot</button>
        </div>
      </div>

      <div style={{padding:16,border:'1px solid #27272a',borderRadius:16,background:'#0b0b0c'}}>
        <h3 style={{fontWeight:600,marginBottom:12}}>Recent shots</h3>
        <div style={{display:'grid',gap:8}}>
          {items.map(s=> (
            <div key={s.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:12,border:'1px solid #27272a',borderRadius:12,background:'#0a0a0a'}}>
              <div>
                <div style={{fontSize:14}}>{(state.meds.find(m=>m.id===s.medId)||{}).name} · {s.mg} mg</div>
                <div style={{fontSize:12,color:'#a1a1aa'}}>{new Date(s.ts).toLocaleString()}</div>
              </div>
              <div style={{display:'flex',gap:8}}>
                <button onClick={async ()=>{ const v=prompt('Edit dosage mg', String(s.mg)); if(v){ await api.updShot(s.id,{ mg:+v }); await load(); await refresh() } }} style={{border:'1px solid #3f3f46',borderRadius:12,padding:'6px 10px'}}>Edit</button>
                <button onClick={async ()=>{ await api.delShot(s.id); await load(); await refresh() }} style={{border:'1px solid #3f3f46',borderRadius:12,padding:'6px 10px', color:'#f87171'}}>Delete</button>
              </div>
            </div>
          ))}
        </div>
        <div style={{display:'flex',justifyContent:'space-between',marginTop:8}}>
          <button onClick={()=>setPage(p=>Math.max(0,p-1))} style={{border:'1px solid #3f3f46',borderRadius:12,padding:'6px 10px'}}>Prev</button>
          <button onClick={()=>setPage(p=>p+1)} style={{border:'1px solid #3f3f46',borderRadius:12,padding:'6px 10px'}}>Next</button>
        </div>
      </div>
    </div>
  )
}

function WeightScreen({ state, refresh }){
  const [kg,setKg]=useState(85)
  const [ts,setTs]=useState(new Date().toISOString().slice(0,16))
  const [page,setPage]=useState(0)
  const perPage=10
  const [items,setItems]=useState([])

  useEffect(()=>{ load() },[page])
  async function load(){ setItems(await api.listWeights(page*perPage, perPage)) }

  return (
    <div style={{maxWidth:420, margin:'0 auto', padding:16, display:'grid', gap:16}}>
      <div style={{padding:16,border:'1px solid #27272a',borderRadius:16,background:'#0b0b0c'}}>
        <h2 style={{fontWeight:600,marginBottom:12}}>Log weight</h2>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
          <div>
            <label style={{fontSize:12,color:'#a1a1aa'}}>Weight (kg)</label>
            <input type="number" step="0.1" value={kg} onChange={e=>setKg(+e.target.value)} style={{width:'100%',background:'#18181b',color:'#e4e4e7',border:'1px solid #3f3f46',borderRadius:12,padding:'8px 10px'}}/>
          </div>
          <div>
            <label style={{fontSize:12,color:'#a1a1aa'}}>Date & time</label>
            <input type="datetime-local" value={ts} onChange={e=>setTs(e.target.value)} style={{width:'100%',background:'#18181b',color:'#e4e4e7',border:'1px solid #3f3f46',borderRadius:12,padding:'8px 10px'}}/>
          </div>
        </div>
        <div style={{display:'flex',justifyContent:'flex-end',marginTop:8}}>
          <button onClick={async ()=>{ await api.addWeight({ kg, ts }); await load(); await refresh() }} style={{background:'#4f46e5',color:'white',borderRadius:12,padding:'8px 12px'}}>Save</button>
        </div>
      </div>

      <div style={{padding:16,border:'1px solid #27272a',borderRadius:16,background:'#0b0b0c'}}>
        <h3 style={{fontWeight:600,marginBottom:12}}>Recent weights</h3>
        <div style={{display:'grid',gap:8}}>
          {items.map(w=> (
            <div key={w.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:12,border:'1px solid #27272a',borderRadius:12,background:'#0a0a0a'}}>
              <div>
                <div style={{fontSize:14}}>{w.kg} kg</div>
                <div style={{fontSize:12,color:'#a1a1aa'}}>{new Date(w.ts).toLocaleString()}</div>
              </div>
              <div style={{display:'flex',gap:8}}>
                <button onClick={async ()=>{ const v=prompt('Edit kg', String(w.kg)); if(v){ await api.updWeight(w.id,{ kg:+v }); await load(); await refresh() } }} style={{border:'1px solid #3f3f46',borderRadius:12,padding:'6px 10px'}}>Edit</button>
                <button onClick={async ()=>{ await api.delWeight(w.id); await load(); await refresh() }} style={{border:'1px solid #3f3f46',borderRadius:12,padding:'6px 10px', color:'#f87171'}}>Delete</button>
              </div>
            </div>
          ))}
        </div>
        <div style={{display:'flex',justifyContent:'space-between',marginTop:8}}>
          <button onClick={()=>setPage(p=>Math.max(0,p-1))} style={{border:'1px solid #3f3f46',borderRadius:12,padding:'6px 10px'}}>Prev</button>
          <button onClick={()=>setPage(p=>p+1)} style={{border:'1px solid #3f3f46',borderRadius:12,padding:'6px 10px'}}>Next</button>
        </div>
      </div>
    </div>
  )
}

function CalcScreen(){
  const [conc,setConc]=useState(50)
  const [dose,setDose]=useState(2.5)
  const units = (dose/conc)*100
  const clamped = Math.max(0,Math.min(100,units))
  return (
    <div style={{maxWidth:420, margin:'0 auto', padding:16, display:'grid', gap:16}}>
      <div style={{padding:16,border:'1px solid #27272a',borderRadius:16,background:'#0b0b0c'}}>
        <h2 style={{fontWeight:600,marginBottom:12}}>Dose calculator</h2>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
          <div><label style={{fontSize:12,color:'#a1a1aa'}}>Concentration (mg/mL)</label><input type="number" step="0.1" value={conc} onChange={e=>setConc(+e.target.value)} style={{width:'100%',background:'#18181b',color:'#e4e4e7',border:'1px solid #3f3f46',borderRadius:12,padding:'8px 10px'}}/></div>
          <div><label style={{fontSize:12,color:'#a1a1aa'}}>Desired dose (mg)</label><input type="number" step="0.1" value={dose} onChange={e=>setDose(+e.target.value)} style={{width:'100%',background:'#18181b',color:'#e4e4e7',border:'1px solid #3f3f46',borderRadius:12,padding:'8px 10px'}}/></div>
        </div>
        <div style={{border:'1px solid #27272a',borderRadius:12,background:'#0a0a0a',padding:12, marginTop:8}}>
          <div style={{fontSize:14, marginBottom:8}}>Required: <strong>{units.toFixed(1)} units</strong> (1 mL / 100u syringe)</div>
          <svg viewBox="0 0 340 70" style={{width:'100%'}}>
            <rect x="10" y="20" width="300" height="30" rx="8" fill="#18181b" stroke="#3f3f46" />
            <rect x="10" y="20" width={(300*clamped)/100} height="30" rx="8" fill="#22c55e" />
            {Array.from({length:11}).map((_,i)=>(<line key={i} x1={10+i*30} y1={18} x2={10+i*30} y2={52} stroke="#52525b" strokeWidth={i%5===0?2:1}/>))}
            <text x="160" y="15" textAnchor="middle" fontSize="12" fill="#e4e4e7">0 — 100 units</text>
            <rect x="315" y="28" width="20" height="14" rx="4" fill="#71717a" />
          </svg>
        </div>
      </div>
    </div>
  )
}
