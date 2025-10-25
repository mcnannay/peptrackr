
import React, { useEffect, useState } from 'react'
import { Line } from 'react-chartjs-2'
import { Chart as ChartJS, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend } from 'chart.js'
import { Users, Meds, Shots, Weights } from './api'
ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend)

const clamp = (v,min,max)=>Math.max(min,Math.min(max,v))
const fmtDate = d => new Date(d).toISOString().slice(0,10)

function remainingFromDoses(doses, halfLifeDays, startDate, lengthDays){
  const k = Math.log(2) / halfLifeDays
  const out = []
  for(let i=0;i<=lengthDays;i++){
    const t = new Date(startDate); t.setDate(t.getDate()+i)
    let mg = 0
    for(const d of doses){
      const dt = (t - new Date(d.date))/(1000*60*60*24)
      if (dt >= 0){ mg += d.mg * Math.exp(-k*dt) }
    }
    out.push({ date: fmtDate(t), mg })
  }
  return out
}

const IconHome = ()=> (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 10v10h14V10"/></svg>)
const IconSettings = ()=> (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V22a2 2 0 1 1-4 0v-.07a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H2a2 2 0 1 1 0-4h.07a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06A2 2 0 1 1 6.02 3.3l.06.06c.48.48 1.17.62 1.82.33A1.65 1.65 0 0 0 9.41 2H9.5a2 2 0 1 1 4 0h.09a1.65 1.65 0 0 0 1.51 1c.65.29 1.34.15 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06c-.48.48-.62 1.17-.33 1.82.29.65.15 1.34-.33 1.82.48.48.62 1.17.33 1.82Z"/></svg>)
const IconShot = ()=> (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7h13"/><path d="M12 3v8"/><rect x="3" y="7" width="13" height="7" rx="2"/><path d="M16 10h5"/></svg>)
const IconWeight = ()=> (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M12 7a5 5 0 0 1 5 5h-2a3 3 0 0 0-3-3V7z"/></svg>)
const IconCalc = ()=> (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h8M8 15h4"/></svg>)

function UpcomingShotGauge({ daysLeft=3, hoursLeft=0, color='#60a5fa', label='Next dose' }){
  const totalDays = 14
  const totalHours = totalDays*24
  const leftHours = daysLeft*24 + hoursLeft
  const pct = Math.max(0, Math.min(1, 1 - (leftHours/totalHours)))
  const angle = pct*2*Math.PI
  const cx=40, cy=40, r=32
  const x = cx + r*Math.cos(-Math.PI/2 + angle)
  const y = cy + r*Math.sin(-Math.PI/2 + angle)
  const large = angle > Math.PI ? 1 : 0
  const d = `M ${cx} ${cy-r} A ${r} ${r} 0 ${large} 1 ${x} ${y}`
  return (
    <svg viewBox="0 0 100 100" width="92">
      <circle cx={cx} cy={cy} r={r} stroke="#334155" strokeWidth="10" fill="none"/>
      <path d={d} stroke={color} strokeWidth="10" fill="none" strokeLinecap="round"/>
      <circle cx={cx} cy={cy} r="24" fill={color} opacity="0.18"/>
      <text x={cx} y={cy-2} textAnchor="middle" dominantBaseline="middle" fontWeight="800" fill="#e5e7eb">{daysLeft}d</text>
      <text x={cx} y={cy+12} textAnchor="middle" fontSize="10" fill="#e5e7eb">{hoursLeft}h</text>
      <text x={cx} y={cy+26} textAnchor="middle" fontSize="10" fill="#e5e7eb">{label}</text>
    </svg>
  )
}

function WeightChart({ points }){
  const labels = points.map(p=>p.date)
  const data = {
    labels,
    datasets:[{
      label:'Weight',
      data: points.map(p=>p.kg),
      borderWidth:4,
      pointRadius:3,
      pointHoverRadius:5,
      borderColor:'#ffffff',
      pointBackgroundColor:'#ffffff',
      tension:0.35
    }]
  }
  const options = {
    responsive:true,
    plugins:{ legend:{ display:false } },
    scales: { x:{ ticks:{ color:'#e5e7eb'}}, y:{ ticks:{ color:'#e5e7eb'}} }
  }
  return <div className="card chart-card"><Line data={data} options={options}/></div>
}

function MedChart({ meds, doses }){
  const [view,setView] = useState('step')
  const today = new Date()
  const start = new Date(today); start.setDate(start.getDate()-28)
  const days = 56
  function remainingFromDosesLocal(doses, halfLifeDays, startDate, lengthDays){
    const k = Math.log(2) / halfLifeDays
    const out = []
    for(let i=0;i<=lengthDays;i++){
      const t = new Date(startDate); t.setDate(t.getDate()+i)
      let mg = 0
      for(const d of doses){
        const dt = (t - new Date(d.date))/(1000*60*60*24)
        if (dt >= 0){ mg += d.mg * Math.exp(-k*dt) }
      }
      out.push({ date: fmtDate(t), mg })
    }
    return out
  }
  const labels = Array.from({length:56+1}).map((_,i)=>{
    const t = new Date(start); t.setDate(t.getDate()+i); return fmtDate(t)
  })
  const datasets = meds.map(m=>{
    const ds = doses.filter(d=>d.medId===m.id)
    const vals = remainingFromDosesLocal(ds, m.halfLifeDays||7, start, days)
    return {
      label:m.name, data: vals.map(v=>v.mg), borderColor:m.color||'#60a5fa',
      borderWidth:3, tension:(view==='pk'?0.4:0), stepped:(view==='step')
    }
  })
  const data = { labels, datasets }
  const options = { responsive:true, plugins:{ legend:{ labels:{ color:'#cbd5e1'}}},
    scales:{ x:{ ticks:{ color:'#9ca3af'}}, y:{ ticks:{ color:'#9ca3af'}} } }
  return (
    <div className="card chart-card">
      <div className="row" style={{justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
        <strong>Medication in system (mg)</strong>
        <div className="row">
          <button className={"btn ghost"} onClick={()=>setView('step')} style={{opacity:view==='step'?1:.6}}>Step</button>
          <button className={"btn ghost"} onClick={()=>setView('pk')} style={{opacity:view==='pk'?1:.6}}>PK</button>
        </div>
      </div>
      <Line data={data} options={options}/>
    </div>
  )
}

export default function App(){
  const [ready,setReady] = useState(false)
  useEffect(()=>{ const t=setTimeout(()=>setReady(true), 1000); return ()=>clearTimeout(t) }, [])
  const [tab,setTab] = useState('home')
  const [users,setUsers] = useState([])
  const [currentUserId,setCurrentUserId] = useState(null)
  const [meds,setMeds] = useState([])
  const [shots,setShots] = useState([])
  const [weights,setWeights] = useState([])

  // load server data
  useEffect(()=>{
    (async ()=>{
      try{
        const u = await Users.list(); setUsers(u.users||[]); setCurrentUserId(u.currentUserId||null)
        const m = await Meds.list(); setMeds(m.meds||[])
        const s = await Shots.list(); setShots(s.shots||[])
        const w = await Weights.list(); setWeights(w.weights||[])
      }catch(e){ console.error(e) }
    })()
  }, [])

  const currentUser = users.find(u=>u.id===currentUserId)

  // Derived BMI from last weight of current user
  const userWeights = weights.filter(w=>w.userId===currentUserId).sort((a,b)=>a.date.localeCompare(b.date))
  const lastKg = userWeights[userWeights.length-1]?.kg || 90
  const heightM = (currentUser?.heightCm||180)/100
  const bmi = lastKg/(heightM*heightM)

  if (!ready){ return <div className="splash"><div className="splash-logo">PepTrackr</div></div> }

  const Home = () => (
    <>
      <MedChart meds={meds} doses={shots.filter(s=>s.userId===currentUserId)} />
      <div className="card">
        <div className="row" style={{alignItems:'center',justifyContent:'space-between'}}>
          <div>
            <div style={{fontWeight:700, marginBottom:6}}>Next shots</div>
            <div className="small">Color-coded per medication</div>
          </div>
          <div className="upcoming-wrap">
            {meds.slice(0,2).map((m,i)=>(
              <UpcomingShotGauge key={m.id} daysLeft={3+i*2} hoursLeft={i?0:12} color={m.color||'#60a5fa'} label={m.name}/>
            ))}
          </div>
        </div>
      </div>
      <div className="card">
        <div className="row" style={{justifyContent:'space-between',alignItems:'center'}}>
          <div><strong>BMI:</strong> {isFinite(bmi)?bmi.toFixed(1):'—'}</div>
          <div className="small">Under 18.5 | 18.5–24.9 | 25–29.9 | 30+</div>
        </div>
        <div className="bmi-bar" style={{marginTop:8}}>
          <div className="bmi-seg" style={{width:'18.5%', background:'#60a5fa'}}/>
          <div className="bmi-seg" style={{width:'31.5%', background:'#10b981'}}/>
          <div className="bmi-seg" style={{width:'12.5%', background:'#f59e0b'}}/>
          <div className="bmi-seg" style={{width:'37.5%', background:'#ef4444'}}/>
          <div className="bmi-marker" style={{left: `calc(${Math.max(0,Math.min(100,(bmi/40)*100))}% - 1px)`}}/>
        </div>
      </div>
      <WeightChart points={userWeights.length?userWeights:[{date:fmtDate(new Date()),kg:lastKg}] } />
    </>
  )

  const Settings = () => {
    const [name,setName] = useState('')
    const [sex,setSex] = useState('M')
    const [height,setHeight] = useState(currentUser?.heightCm || 170)
    useEffect(()=>{ setHeight(currentUser?.heightCm||170) }, [currentUserId])
    async function addUser(){
      if (!name.trim()) return
      const r = await Users.add(name.trim(), sex, Number(height)||170)
      const u = await Users.list(); setUsers(u.users); setCurrentUserId(u.currentUserId)
      setName('')
    }
    async function saveUser(){
      if (!currentUser) return
      await Users.update(currentUser.id, {sex, heightCm:Number(height)||170})
      const u = await Users.list(); setUsers(u.users); setCurrentUserId(u.currentUserId)
    }
    return (
      <div className="card">
        <div style={{fontWeight:700, marginBottom:8}}>Users</div>
        <div className="row">
          <select className="input" value={currentUserId||''} onChange={async e=>{ await Users.select(e.target.value); const u=await Users.list(); setUsers(u.users); setCurrentUserId(u.currentUserId) }}>
            {users.map(u=> <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <button className="btn ghost" onClick={async ()=>{ if (!currentUser) return; await Users.remove(currentUser.id); const u=await Users.list(); setUsers(u.users); setCurrentUserId(u.currentUserId) }}>Delete</button>
        </div>
        <div className="row">
          <input className="input" placeholder="New user's name" value={name} onChange={e=>setName(e.target.value)}/>
          <select className="input" value={sex} onChange={e=>setSex(e.target.value)}>
            <option>M</option><option>F</option><option>Other</option>
          </select>
          <input className="input" type="number" placeholder="Height (cm)" value={height} onChange={e=>setHeight(e.target.value)}/>
        </div>
        <div className="row">
          <button className="btn" onClick={addUser}>Add user</button>
          <button className="btn ghost" onClick={saveUser}>Save current</button>
        </div>
      </div>
    )
  }

  const Placeholder = ({title}) => (
    <div className="card"><strong>{title}</strong><div className="small">Coming soon</div></div>
  )

  return (
    <div className="container">
      <div className="header">
        <div className="brand"><div className="logo">PT</div> PepTrackr <span className="badge">{currentUser?.name || '—'}</span></div>
        <div className="small">v16.5.3</div>
      </div>
      {tab==='home' && <Home/>}
      {tab==='settings' && <Settings/>}
      {tab==='shot' && <Placeholder title="Add Shot"/>}
      {tab==='weight' && <Placeholder title="Weight"/>}
      {tab==='calc' && <Placeholder title="Calculator"/>}
      <div className="bottom-bar">
        <button className={"icon-btn " + (tab==='home'?'active':'')} onClick={()=>setTab('home')}><IconHome/><span>Home</span></button>
        <button className={"icon-btn " + (tab==='settings'?'active':'')} onClick={()=>setTab('settings')}><IconSettings/><span>Settings</span></button>
        <button className={"icon-btn " + (tab==='shot'?'active':'')} onClick={()=>setTab('shot')}><IconShot/><span>Shot</span></button>
        <button className={"icon-btn " + (tab==='weight'?'active':'')} onClick={()=>setTab('weight')}><IconWeight/><span>Weight</span></button>
        <button className={"icon-btn " + (tab==='calc'?'active':'')} onClick={()=>setTab('calc')}><IconCalc/><span>Calc</span></button>
      </div>
    </div>
  )
}
