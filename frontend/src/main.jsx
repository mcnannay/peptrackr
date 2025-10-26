import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { listUsers, createUser, listMeds, createMed, listShots, createShot, updateShot, deleteShot, listWeights, createWeight, updateWeight, deleteWeight, exportAll, importAll } from './api'
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts'
import { Calculator, Home, Settings, Weight as WeightIcon, Syringe } from 'lucide-react'

const dayMs = 24*60*60*1000
const now = () => new Date()
function pkAmountAt(t0, doseMg, halfLifeDays, t){ const dtDays=(t-t0)/dayMs; if(dtDays<0) return 0; const k=Math.log(2)/halfLifeDays; return doseMg*Math.exp(-k*dtDays) }
function stepAmountBetween(shots, freqDays, t){ if(!shots.length||!freqDays) return 0; const prev=[...shots].reverse().find(s=>new Date(s.when)<=t); if(!prev) return 0; const nextTime=new Date(new Date(prev.when).getTime()+freqDays*dayMs); return t<=nextTime?prev.doseMg:0 }

function App(){
  const [tab, setTab] = useState('home')
  const [users, setUsers] = useState([])
  const [meds, setMeds] = useState([])
  const [currentUserId, setCurrentUserId] = useState(null)
  const [shots, setShots] = useState([])
  const [weights, setWeights] = useState([])

  useEffect(()=>{ (async()=>{ const u=await listUsers(); setUsers(u); const m=await listMeds(); setMeds(m); setCurrentUserId(u[0]?.id||null) })() }, [])
  useEffect(()=>{ if(!currentUserId) return; (async()=>{ setShots(await listShots(currentUserId,0,500)); setWeights(await listWeights(currentUserId,0,500)) })() }, [currentUserId])

  return (<div>
    <Header appName="PepTrackr" userName={users.find(u=>u.id===currentUserId)?.name||'-'}/>
    <div className="container">
      {tab==='home' && <HomeScreen meds={meds} shots={shots} weights={weights}/>}
      {tab==='settings' && <SettingsScreen users={users} setUsers={setUsers} currentUserId={currentUserId} setCurrentUserId={setCurrentUserId} meds={meds} setMeds={setMeds}/>}
      {tab==='weight' && <WeightScreen userId={currentUserId} weights={weights} setWeights={setWeights}/>}
      {tab==='shot' && <ShotScreen userId={currentUserId} meds={meds} shots={shots} setShots={setShots}/>}
      {tab==='calc' && <CalcScreen/>}
    </div>
    <BottomNav tab={tab} setTab={setTab}/>
  </div>)
}

function Header({appName, userName}){ return (<div className="sticky row" style={{padding:'10px 12px', justifyContent:'space-between'}}><div style={{fontWeight:800, fontSize:18}}>{appName}</div><div className="muted" style={{fontSize:13}}>{userName}</div></div>) }
function BottomNav({ tab, setTab }){
  const Item=({id,label,icon})=>(<button className={`bn ${tab===id?'active':''}`} onClick={()=>setTab(id)}>{icon}<div style={{marginTop:4}}>{label}</div></button>)
  return (<div className="bottom">
    <Item id="settings" label="Settings" icon={<Settings size={18}/>}/> 
    <Item id="weight" label="Weight" icon={<WeightIcon size={18}/>}/>
    <Item id="home" label="Home" icon={<Home size={18}/>}/>
    <Item id="shot" label="Shot" icon={<Syringe size={18}/>}/>
    <Item id="calc" label="Calc" icon={<Calculator size={18}/>}/>
  </div>)
}

function HomeScreen({ meds, shots, weights }){
  const [range,setRange]=useState(7); const [model,setModel]=useState('pk')
  const data = useMemo(()=>{ const end=now(), start=new Date(end.getTime()-range*dayMs); const points=80, out=[]; for(let i=0;i<=points;i++){ const t=new Date(start.getTime()+i*(end-start)/points); const row={t, ts:t.getTime()}; meds.forEach(m=>{ const mShots=shots.filter(s=>s.medId===m.id); let amt=0; if(model==='pk'){ for(const s of mShots) amt += pkAmountAt(new Date(s.when), s.doseMg, m.halfLifeDays, t) } else { amt=stepAmountBetween(mShots, m.freqDays, t) } row[m.name]=+amt.toFixed(3) }); out.push(row) } return out }, [meds, shots, range, model])
  const timers = useMemo(()=>{ const out=[]; meds.slice(0,2).forEach(m=>{ const ms=shots.filter(s=>s.medId===m.id).sort((a,b)=>new Date(b.when)-new Date(a.when)); const last=ms[0]; if(!last){ out.push({med:m.name, remainingMs:0,total:m.freqDays*dayMs}); return } const nextTime=new Date(new Date(last.when).getTime()+m.freqDays*dayMs); out.push({med:m.name, remainingMs:Math.max(0,nextTime-now()), total:m.freqDays*dayMs}) }); return out }, [meds, shots])
  const [wRange,setWRange]=useState(30); const weightData=useMemo(()=>{ if(!weights.length) return []; const all=[...weights].sort((a,b)=>new Date(a.when)-new Date(b.when)).map(w=>({t:new Date(w.when), kg:w.kg})); if(wRange==='all') return all; const end=now(), start=new Date(end.getTime()-(wRange===7?7:30)*dayMs); return all.filter(p=>p.t>=start&&p.t<=end) }, [weights, wRange])
  const heightM=1.77; const lastW=[...weights].sort((a,b)=>new Date(b.when)-new Date(a.when))[0]; const bmi=lastW? lastW.kg/(heightM*heightM) : null

  return (<div className="container" style={{padding:'0 12px 96px'}}>
    <div className="card">
      <div className="row" style={{justifyContent:'space-between', marginBottom:6}}>
        <div style={{fontWeight:600}}>Medication Levels</div>
        <div className="row" style={{gap:6}}>{[7,30,90].map(v=>(<button key={v} className="btn" onClick={()=>setRange(v)} style={{padding:'4px 8px', opacity: range===v?1:.7}}>{v}d</button>))}</div>
      </div>
      <div className="row" style={{gap:6, marginBottom:6}}>
        <button className="btn" onClick={()=>setModel('pk')} style={{opacity:model==='pk'?1:.7}}>PK model</button>
        <button className="btn" onClick={()=>setModel('step')} style={{opacity:model==='step'?1:.7}}>Step model</button>
      </div>
      <div style={{height:180}}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{left:0,right:8,top:8,bottom:0}}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.15}/>
            <XAxis dataKey="t" tickFormatter={t=>new Date(t).toLocaleDateString()} hide />
            <YAxis hide/>
            <Tooltip labelFormatter={l=>new Date(l).toLocaleString()}/>
            <Legend />
            {meds.map(m=>(<Area key={m.id} type="monotone" dataKey={m.name} stackId="1" fillOpacity={0.35} strokeWidth={2}/>))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>

    <div className="grid2" style={{marginTop:8}}>
      {timers.map((t,i)=>(<div key={i} className="card"><div className="muted" style={{marginBottom:6}}>Next shot: {t.med}</div><CircularTimer remainingMs={t.remainingMs} totalMs={t.total}/></div>))}
    </div>

    <div className="card" style={{marginTop:8}}>
      <div className="row" style={{justifyContent:'space-between', marginBottom:6}}>
        <div style={{fontWeight:600}}>Weight</div>
        <div className="row" style={{gap:6}}>
          {[7,30,'all'].map(v=>(<button key={v} className="btn" onClick={()=>setWRange(v)} style={{padding:'4px 8px', opacity: wRange===v?1:.7}}>{v==='all'?'All':v+'d'}</button>))}
        </div>
      </div>
      <div style={{height:140}}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={weightData} margin={{left:0,right:8,top:8,bottom:0}}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.15}/>
            <XAxis dataKey="t" tickFormatter={t=>new Date(t).toLocaleDateString()} hide />
            <YAxis hide/>
            <Tooltip labelFormatter={l=>new Date(l).toLocaleString()}/>
            <Line type="monotone" dataKey="kg" strokeWidth={2} dot={false}/>
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div style={{marginTop:8}}><BmiGauge bmi={bmi}/></div>
    </div>
  </div>)
}

function CircularTimer({ remainingMs, totalMs }){ const r=42, c=2*Math.PI*r; const pct = totalMs===0?0:Math.max(0, Math.min(1, 1-remainingMs/totalMs)); const dash=c*pct; const remH=Math.floor(remainingMs/3600000); const remM=Math.floor((remainingMs/60000)%60); return (<div className="row" style={{gap:10}}><svg width={110} height={110}><circle cx={55} cy={55} r={r} stroke="currentColor" strokeOpacity="0.15" strokeWidth={8} fill="none"/><circle cx={55} cy={55} r={r} stroke="currentColor" strokeWidth={8} fill="none" strokeDasharray={`${dash} ${c}`} transform="rotate(-90 55 55)"/><text x="55" y="60" textAnchor="middle" fontSize="14">{Math.round(pct*100)}%</text></svg><div><div className="muted">Time remaining</div><div style={{fontWeight:700, fontSize:18}}>{remH}h {remM}m</div></div></div>) }
function BmiGauge({ bmi }){ const ranges=[['Under',18.5],['Healthy',24.9],['Over',29.9],['Obese',60]]; const pos=bmi? Math.max(0, Math.min(1, bmi/60)) : 0; return (<div><div className="muted" style={{fontSize:12, marginBottom:4}}>BMI {bmi?bmi.toFixed(1):'–'}</div><div style={{position:'relative', height:16, borderRadius:8, background:'#151515', border:'1px solid var(--border)'}}>{ranges.map((r,i)=>{const left=(i===0?0:ranges[i-1][1]/60)*100; const width=(r[1]/60 - (i===0?0:ranges[i-1][1]/60))*100; const bg=i===0?'#3b82f629': i===1?'#22c55e29': i===2?'#eab30829':'#ef444429'; return <div key={i} style={{position:'absolute', left:`${left}%`, width:`${width}%`, top:0, bottom:0, background:bg}}/>})}<div style={{position:'absolute', top:-4, bottom:-4, width:2, background:'currentColor', left:`${pos*100}%`}}/></div><div className="row" style={{justifyContent:'space-between', fontSize:10, opacity:.7, marginTop:4}}>{ranges.map((r,i)=>(<span key={i}>{r[0]}</span>))}</div></div>) }

function SettingsScreen({ users, setUsers, currentUserId, setCurrentUserId, meds, setMeds }){
  const [newUser, setNewUser] = useState('')
  const [medForm, setMedForm] = useState({ name:'', halfLifeDays:5, freqDays:7 })
  async function addUser(){ if(!newUser.trim()) return; const u=await createUser(newUser.trim()); setUsers([...users, u]); setNewUser('') }
  async function addMed(){ if(!medForm.name.trim()) return; const m=await createMed({...medForm, halfLifeDays:+medForm.halfLifeDays, freqDays:+medForm.freqDays}); setMeds([...meds, m]); setMedForm({ name:'', halfLifeDays:5, freqDays:7 }) }
  async function doExport(){ const data=await exportAll(); const blob=new Blob([JSON.stringify(data,null,2)], {type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`peptrackr-backup-${Date.now()}.json`; a.click(); URL.revokeObjectURL(url) }
  async function doImport(e){ const file=e.target.files?.[0]; if(!file) return; const txt=await file.text(); const data=JSON.parse(txt); await importAll(data); location.reload() }
  return (<div className="container">
    <div className="card"><div style={{fontWeight:600, marginBottom:8}}>Users</div><select className="input" value={currentUserId||''} onChange={e=>setCurrentUserId(e.target.value)}>{users.map(u=>(<option key={u.id} value={u.id}>{u.name}</option>))}</select><div className="row" style={{marginTop:8}}><input className="input" placeholder="Add new user" value={newUser} onChange={e=>setNewUser(e.target.value)}/><button className="btn" onClick={addUser}>Add</button></div></div>
    <div className="card" style={{marginTop:8}}><div style={{fontWeight:600, marginBottom:8}}>Medications</div><div className="muted" style={{fontSize:13, marginBottom:6}}>Presets include Retatrutide (t½≈6d) and Tirzepatide (t½≈5d)</div>{meds.map(m=>(<div key={m.id} className="row" style={{justifyContent:'space-between', borderBottom:'1px solid var(--border)', paddingBottom:6, marginBottom:6}}><div>{m.name}</div><div className="muted" style={{fontSize:13}}>t½ {m.halfLifeDays}d • every {m.freqDays}d</div></div>))}<div className="grid3"><input className="input" placeholder="Custom med name" value={medForm.name} onChange={e=>setMedForm({...medForm, name:e.target.value})}/><input className="input" type="number" placeholder="Half-life (days)" value={medForm.halfLifeDays} onChange={e=>setMedForm({...medForm, halfLifeDays:e.target.value})}/><input className="input" type="number" placeholder="Freq (days)" value={medForm.freqDays} onChange={e=>setMedForm({...medForm, freqDays:e.target.value})}/></div><button className="btn" style={{marginTop:8, width:'100%'}} onClick={addMed}>Add Medication</button></div>
    <div className="card" style={{marginTop:8}}><div style={{fontWeight:600, marginBottom:8}}>Backup & Restore</div><div className="row"><button className="btn" onClick={doExport}>Backup JSON</button><input className="input" type="file" accept="application/json" onChange={doImport}/></div></div>
  </div>)
}

function ShotScreen({ userId, meds, shots, setShots }){
  const [medId,setMedId]=useState(meds[0]?.id||''); const [dose,setDose]=useState(2.5); const [when,setWhen]=useState(new Date().toISOString().slice(0,16))
  async function addShot(e){ e.preventDefault(); if(!medId) return; const s=await createShot({userId, medId, doseMg:+dose, when:new Date(when).toISOString()}); setShots([s, ...shots]) }
  async function delShot(id){ await deleteShot(id); setShots(shots.filter(s=>s.id!==id)) }
  async function editShot(id){ const s=shots.find(x=>x.id===id); if(!s) return; const nd=prompt('New dose (mg)', s.doseMg); if(nd==null) return; const nw=prompt('New date/time (ISO yyyy-MM-ddTHH:mm)', s.when.slice(0,16)); if(nw==null) return; const up=await updateShot(id,{doseMg:+nd, when:new Date(nw).toISOString()}); setShots(shots.map(x=>x.id===id?up:x)) }
  const [page,setPage]=useState(0); const size=10; const sorted=[...shots].sort((a,b)=>new Date(b.when)-new Date(a.when)); const pageItems=sorted.slice(page*size,(page+1)*size); const hasNext=(page+1)*size<sorted.length
  return (<div className="container">
    <div className="card"><div style={{fontWeight:600, marginBottom:8}}>Log Shot</div><form onSubmit={addShot} className="grid2"><select className="input" value={medId} onChange={e=>setMedId(e.target.value)}>{meds.map(m=>(<option key={m.id} value={m.id}>{m.name}</option>))}</select><input className="input" type="number" step="0.1" value={dose} onChange={e=>setDose(e.target.value)} placeholder="Dose (mg)"/><input className="input" type="datetime-local" value={when} onChange={e=>setWhen(e.target.value)}/><button className="btn" type="submit">Add Shot</button></form></div>
    <div className="card" style={{marginTop:8}}><div style={{fontWeight:600, marginBottom:8}}>Recent Shots</div>{pageItems.map(s=>(<div key={s.id} className="row" style={{justifyContent:'space-between', borderBottom:'1px solid var(--border)', paddingBottom:6, marginBottom:6}}><div><div style={{fontWeight:600}}>{meds.find(m=>m.id===s.medId)?.name} • {s.doseMg} mg</div><div className="muted" style={{fontSize:13}}>{new Date(s.when).toLocaleString()}</div></div><div className="row" style={{gap:6}}><button className="btn" onClick={()=>editShot(s.id)}>Edit</button><button className="btn" onClick={()=>delShot(s.id)}>Delete</button></div></div>))}<div className="row" style={{justifyContent:'space-between'}}><button className="btn" disabled={page===0} onClick={()=>setPage(p=>Math.max(0,p-1))}>Prev</button><button className="btn" disabled={!hasNext} onClick={()=>setPage(p=>p+1)}>Next</button></div></div>
  </div>)
}

function WeightScreen({ userId, weights, setWeights }){
  const [kg,setKg]=useState(80); const [when,setWhen]=useState(new Date().toISOString().slice(0,16))
  async function addWeight(e){ e.preventDefault(); const w=await createWeight({userId, kg:+kg, when:new Date(when).toISOString()}); setWeights([w, ...weights]) }
  async function delWeight(id){ await deleteWeight(id); setWeights(weights.filter(w=>w.id!==id)) }
  async function editWeight(id){ const w=weights.find(x=>x.id===id); if(!w) return; const nk=prompt('New weight (kg)', w.kg); if(nk==null) return; const nw=prompt('New date/time (ISO)', w.when.slice(0,16)); if(nw==null) return; const up=await updateWeight(id,{kg:+nk, when:new Date(nw).toISOString()}); setWeights(weights.map(x=>x.id===id?up:x)) }
  const [page,setPage]=useState(0); const size=10; const sorted=[...weights].sort((a,b)=>new Date(b.when)-new Date(a.when)); const pageItems=sorted.slice(page*size,(page+1)*size); const hasNext=(page+1)*size<sorted.length
  return (<div className="container">
    <div className="card"><div style={{fontWeight:600, marginBottom:8}}>Log Weight</div><form onSubmit={addWeight} className="grid2"><input className="input" type="number" step="0.1" value={kg} onChange={e=>setKg(e.target.value)} placeholder="Weight (kg)"/><input className="input" type="datetime-local" value={when} onChange={e=>setWhen(e.target.value)}/><button className="btn" type="submit">Add Weight</button></form></div>
    <div className="card" style={{marginTop:8}}><div style={{fontWeight:600, marginBottom:8}}>Entries</div>{pageItems.map(w=>(<div key={w.id} className="row" style={{justifyContent:'space-between', borderBottom:'1px solid var(--border)', paddingBottom:6, marginBottom:6}}><div><div style={{fontWeight:600}}>{w.kg} kg</div><div className="muted" style={{fontSize:13}}>{new Date(w.when).toLocaleString()}</div></div><div className="row" style={{gap:6}}><button className="btn" onClick={()=>editWeight(w.id)}>Edit</button><button className="btn" onClick={()=>delWeight(w.id)}>Delete</button></div></div>))}<div className="row" style={{justifyContent:'space-between'}}><button className="btn" disabled={page===0} onClick={()=>setPage(p=>Math.max(0,p-1))}>Prev</button><button className="btn" disabled={!hasNext} onClick={()=>setPage(p=>p+1)}>Next</button></div></div>
  </div>)
}

function CalcScreen(){ const [conc,setConc]=useState(10); const [dose,setDose]=useState(2.5); const mL=dose/(conc||1); const units=Math.max(0, Math.min(100, mL*100)); return (<div className="container"><div className="card"><div style={{fontWeight:600, marginBottom:8}}>Dose Calculator</div><div className="grid2"><input className="input" type="number" step="0.1" value={conc} onChange={e=>setConc(+e.target.value)} placeholder="Concentration (mg/mL)"/><input className="input" type="number" step="0.1" value={dose} onChange={e=>setDose(+e.target.value)} placeholder="Desired dose (mg)"/></div><div className="muted" style={{marginTop:8}}>mL: <b>{mL.toFixed(2)}</b> • Units in 1mL (100U): <b>{units.toFixed(0)}U</b></div><SyringeGraphic units={units}/></div></div>) }
function SyringeGraphic({units}){ const h=220,w=60,pad=14; const fillH=(h-pad*2)*(units/100); return (<div style={{display:'flex', justifyContent:'center'}}><svg width={w*3} height={h} viewBox={`0 0 ${w} ${h}`}><rect x="10" y={pad} width={w-20} height={h-pad*2} rx="8" ry="8" fill="none" stroke="currentColor" strokeWidth="2"/><rect x="11" y={h-pad-fillH} width={w-22} height={fillH} rx="6" ry="6" fill="currentColor" opacity=".25"/>{Array.from({length:10}).map((_,i)=>{const y=pad+i*(h-pad*2)/10; return <line key={i} x1={w-20} x2={w-10} y1={y} y2={y} stroke="currentColor" strokeWidth="1"/>})}<text x={w/2} y={pad-4} textAnchor="middle" fontSize="10">0U</text><text x={w/2} y={h-pad+12} textAnchor="middle" fontSize="10">100U</text><line x1={w-5} x2={w} y1={h-pad-fillH} y2={h-pad-fillH} stroke="currentColor" strokeWidth="2"/><text x={w+2} y={h-pad-fillH+4} fontSize="10">{units.toFixed(0)}U</text></svg></div>) }

function main(){ createRoot(document.getElementById('root')).render(<App/>) }
main()
