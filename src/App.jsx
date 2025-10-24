import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Line } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler, Legend } from 'chart.js'
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler, Legend)

const LN2 = Math.log(2)
const hexToRgba=(hex,a=1)=>{if(!hex)return `rgba(96,165,250,${a})`;const h=hex.replace('#','');const n=parseInt(h.length===3?h.split('').map(c=>c+c).join(''):h,16);const r=(n>>16)&255,g=(n>>8)&255,b=n&255;return `rgba(${r}, ${g}, ${b}, ${a})`}

// ---- API helpers ----
const api = {
  async getUsers(){const r=await fetch('/api/users'); if(!r.ok) throw new Error('users fetch'); return r.json()},
  async addUser(name){const r=await fetch('/api/users',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name})}); if(!r.ok) throw new Error('add user'); return r.json()},
  async getData(uid){const r=await fetch('/api/data?user='+encodeURIComponent(uid)); if(!r.ok) throw new Error('get data'); return r.json()},
  async putData(uid,data){const r=await fetch('/api/data?user='+encodeURIComponent(uid),{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}); if(!r.ok) throw new Error('put data'); return r.json()},
}

// ---- small utils ----
const rememberUserId = () => { try { return localStorage.getItem('current_user_id') } catch { return null } }
const storeUserId = (id) => { try { localStorage.setItem('current_user_id', id) } catch {} }

// math
const stepAmount=(shot,med,t)=>{const dt=(t-new Date(shot.atISO))/36e5; if(dt<0) return 0; return shot.dose*Math.pow(0.5, dt/med.halfLifeHours)}
const pkAmount=(shot,med,t)=>{const dt=(t-new Date(shot.atISO))/36e5; if(dt<=0) return 0; const ke=LN2/med.halfLifeHours, ka=med.ka??1.0; if(Math.abs(ka-ke)<1e-6){return shot.dose*ke*dt*Math.exp(-ke*dt)} return shot.dose*(ka/(ka-ke))*(Math.exp(-ke*dt)-Math.exp(-ka*dt))}
const endOfDay=d=>{const x=new Date(d); x.setHours(23,59,59,999); return x}
const daysBack=n=>{const out=[],today=new Date(); for(let i=n-1;i>=0;i--){const d=new Date(today); d.setDate(today.getDate()-i); out.push(d)} return out}

// splash + wordmark
function Splash(){return(<div className="splash"><div style={{display:'grid',placeItems:'center'}}><div className="logo"><svg width="84" height="84" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="white" opacity=".12"/><path d="M4 14c4 2 12 2 16 0" stroke="white"/><path d="M8 10l4-4 4 4" stroke="white"/></svg></div><h1>PepTrackr • server</h1></div></div>)}
function Wordmark(){return(<svg width="118" height="24" viewBox="0 0 236 48" role="img" aria-label="PepTrackr"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#22d3ee"/><stop offset="100%" stopColor="#60a5fa"/></linearGradient></defs><text x="0" y="32" fontFamily="ui-sans-serif,system-ui,Segoe UI,Roboto" fontSize="28" fontWeight="900" fill="url(#g)">PepTrackr</text></svg>)}

// ---- MAIN APP ----
export default function App(){
  const [ready,setReady]=useState(false)
  const [screen,setScreen]=useState('home')
  const [theme,setTheme]=useState('dark')

  const [users,setUsers]=useState([])           // [{id,name}]
  const [currentUserId,setCurrentUserId]=useState(rememberUserId())
  const currentUser = users.find(u=>u.id===currentUserId)

  // app state (server-synced)
  const [meds,setMeds]=useState([])
  const [shots,setShots]=useState([])
  const [weights,setWeights]=useState([])
  const [profile,setProfile]=useState({sex:'other',heightIn:70})
  const [chart,setChart]=useState({range:30,view:'per-med',stacked:false,model:'step'})
  const [homeWeightRange,setHomeWeightRange]=useState('month')

  useEffect(()=>{const t=setTimeout(()=>setReady(true),700);return()=>clearTimeout(t)},[])
  useEffect(()=>{document.documentElement.setAttribute('data-theme',theme)},[theme])

  // bootstrap: users + initial data
  useEffect(()=>{(async()=>{
      const {users, defaultId} = await api.getUsers()
      setUsers(users)
      const id = currentUserId || defaultId || users[0]?.id
      setCurrentUserId(id); storeUserId(id)
      const { data } = await api.getData(id)
      hydrate(data)
    })().catch(console.error)},[])

  const hydrate=(data)=>{
    setTheme(data.theme ?? 'dark')
    setMeds(data.meds ?? [])
    setShots(data.shots ?? [])
    setWeights(data.weights ?? [])
    setProfile(data.profile ?? {sex:'other',heightIn:70})
    setChart(data.chart_settings ?? {range:30,view:'per-med',stacked:false,model:'step'})
    setHomeWeightRange(data.home_weight_range ?? 'month')
    setScreen(data.screen ?? 'home')
  }

  // save to server (debounced) when data changes
  useEffect(()=>{
    if(!currentUserId) return
    const h=setTimeout(()=>{
      const payload={
        theme, meds, shots, weights, profile,
        chart_settings: chart,
        home_weight_range: homeWeightRange,
        screen
      }
      api.putData(currentUserId, payload).catch(e=>console.error('save failed', e))
    },400)
    return ()=>clearTimeout(h)
  },[currentUserId, theme, meds, shots, weights, profile, chart, homeWeightRange, screen])

  async function switchUser(id){
    setCurrentUserId(id); storeUserId(id)
    const { data } = await api.getData(id)
    hydrate(data)
  }
  async function addUser(name){
    const { id } = await api.addUser(name)
    const { users: fresh } = await api.getUsers()
    setUsers(fresh)
    await switchUser(id)
  }

  if(!ready) return <Splash/>

  return(<div className="container">
    <div className="header">
      <div className="brand" style={{gap:10}}>
        <Wordmark/>
        {currentUser && <span className="badge" title="Active user">{currentUser.name}</span>}
      </div>
    </div>

    {screen==='home'&&<Home meds={meds} shots={shots} weights={weights} profile={profile} chart={chart} setChart={setChart} homeWeightRange={homeWeightRange} setHomeWeightRange={setHomeWeightRange}/>}
    {screen==='settings'&&<Settings theme={theme} setTheme={setTheme} meds={meds} setMeds={setMeds} shots={shots} setShots={setShots} weights={weights} setWeights={setWeights} profile={profile} setProfile={setProfile} chart={chart} setChart={setChart} homeWeightRange={homeWeightRange} setHomeWeightRange={setHomeWeightRange} users={users} onAddUser={addUser} currentUserId={currentUserId} onSwitchUser={switchUser}/>}
    {screen==='shot'&&<Shot meds={meds} shots={shots} setShots={setShots}/>}
    {screen==='weight'&&<Weight entries={weights} setEntries={setWeights} profile={profile} setProfile={setProfile}/>}
    {screen==='calc'&&<Calculator/>}
    <BottomMenu setScreen={setScreen} screen={screen}/>
  </div>)
}

// ---- HOME ----
function Home({meds,shots,weights,profile,chart,setChart,homeWeightRange,setHomeWeightRange}){
  return(<>
    <DailyMedChart meds={meds} shots={shots} chart={chart} setChart={setChart}/>
    <UpcomingShots meds={meds} shots={shots}/>
    <HomeBMI weights={weights} profile={profile}/>
    <HomeWeightChart entries={weights} homeWeightRange={homeWeightRange} setHomeWeightRange={setHomeWeightRange}/>
    <KpiRow meds={meds} shots={shots}/>
  </>)
}

// BMI gauge
function HomeBMI({weights,profile}){
  const last = weights.slice(-1)[0]?.v
  if(!last || !profile.heightIn) return null
  const kg = last*0.45359237, m = profile.heightIn*0.0254
  const bmi = Math.round((kg/(m*m))*10)/10
  const min=15, max=40
  const clamp = v => Math.max(min, Math.min(max, v))
  const pct = (clamp(bmi)-min)/(max-min)
  const left = `calc(${pct*100}% - 1px)`
  let cat='Healthy', color='var(--ok)'
  if(bmi<18.5){cat='Underweight';color='var(--under)'} else if(bmi<25){cat='Healthy';color='var(--ok)'} else if(bmi<30){cat='Overweight';color='var(--warn)'} else {cat='Obese';color='var(--bad)'}
  return (<div className="card">
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
      <h3 style={{margin:0}}>BMI</h3>
      <div className="badge">Current: <strong>{bmi}</strong> <span style={{color}}>&nbsp;{cat}</span></div>
    </div>
    <div className="bmi-bar">
      <div className="bmi-seg" style={{width:`${(18.5-min)/(max-min)*100}%`,background:'rgba(96,165,250,.35)'}} title="Underweight"></div>
      <div className="bmi-seg" style={{width:`${(25-18.5)/(max-min)*100}%`,background:'rgba(16,185,129,.35)'}} title="Healthy"></div>
      <div className="bmi-seg" style={{width:`${(30-25)/(max-min)*100}%`,background:'rgba(245,158,11,.35)'}} title="Overweight"></div>
      <div className="bmi-seg" style={{width:`${(max-30)/(max-min)*100}%`,background:'rgba(239,68,68,.35)'}} title="Obese"></div>
      <div className="bmi-marker" style={{left}}></div>
    </div>
    <div style={{display:'flex',justifyContent:'space-between',marginTop:6}} className="tiny">
      <span>15</span><span>18.5</span><span>25</span><span>30</span><span>40</span>
    </div>
  </div>)
}

// Daily meds chart
function DailyMedChart({meds,shots,chart,setChart}){
  const {range,view,stacked,model}=chart
  const setRange=v=>setChart({...chart,range:v})
  const setView=v=>setChart({...chart,view:v})
  const setStacked=v=>setChart({...chart,stacked:v})
  const setModel=v=>setChart({...chart,model:v})

  const days=daysBack(range), labels=days.map(d=>d.toLocaleDateString([],{month:'numeric',day:'numeric'}))
  const per=meds.map(m=>({med:m,series:days.map(d=>{const t=endOfDay(d); let tot=0; for(const s of shots){ if(s.medId!==m.id) continue; tot += model==='pk'?pkAmount(s,m,t):stepAmount(s,m,t)} return Math.round(tot*100)/100 })}))
  const total=days.map((_,i)=>per.reduce((sum,row)=>sum+row.series[i],0)).map(v=>Math.round(v*100)/100)
  const datasets= (view==='total'
    ? [{label:model==='pk'?'Total (PK)':'Total (Step)',data:total,fill:true,backgroundColor:'rgba(96,165,250,0.15)',borderColor:'rgba(96,165,250,1)',tension:.35}]
    : per.map(({med,series})=>({label:med.name,data:series,fill:true,backgroundColor:hexToRgba(med.color,.15),borderColor:hexToRgba(med.color,1),tension:.35,stack:stacked?'stack1':undefined}))
  )
  const options={responsive:true,maintainAspectRatio:false,plugins:{legend:{display:true,position:'bottom'}},scales:{x:{grid:{display:false},ticks:{color:'#9ca3af'}},y:{grid:{color:'rgba(127,127,127,.2)'},ticks:{color:'#9ca3af'},beginAtZero:true,title:{display:true,text:`mg in system (end of day) • ${model==='pk'?'PK':'Step'}`},stacked:stacked&&view==='per-med'}},elements:{point:{radius:0}}}
  return(<div className="card">
    <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:8,flexWrap:'wrap'}}>
      <div className="label">Range</div>
      <div style={{display:'flex',gap:6}}><button className="save" onClick={()=>setRange(14)} style={{opacity:range===14?1:.6}}>14d</button><button className="save" onClick={()=>setRange(30)} style={{opacity:range===30?1:.6}}>30d</button><button className="save" onClick={()=>setRange(90)} style={{opacity:range===90?1:.6}}>90d</button></div>
      <div className="label" style={{marginLeft:8}}>View</div>
      <div style={{display:'flex',gap:6}}><button className="save" onClick={()=>setView('per-med')} style={{opacity:view==='per-med'?1:.6}}>Per-med</button><button className="save" onClick={()=>setView('total')} style={{opacity:view==='total'?1:.6}}>Total</button></div>
      {view==='per-med'&&<label style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:6}}><input type="checkbox" checked={stacked} onChange={e=>setStacked(e.target.checked)}/><span className="tiny">Stacked</span></label>}
      <div className="label" style={{marginLeft:'auto'}}>Model</div>
      <div style={{display:'flex',gap:6}}><button className="save" onClick={()=>setModel('step')} style={{opacity:model==='step'?1:.6}}>Step</button><button className="save" onClick={()=>setModel('pk')} style={{opacity:model==='pk'?1:.6}}>PK</button></div>
    </div>
    <div style={{height:240}}><Line data={{labels,datasets}} options={options}/></div>
  </div>)
}

// Upcoming shots gauges
function UpcomingShots({ meds, shots }){
  const soonest = useMemo(() => {
    const list=[]
    for(const m of meds){
      const last = [...shots].filter(s=>s.medId===m.id).sort((a,b)=>new Date(b.atISO)-new Date(a.atISO))[0]
      let next = last ? new Date(new Date(last.atISO).getTime() + (m.everyDays||7)*24*3600e3) : null
      if(!last){ continue }
      while(next <= new Date()) next = new Date(next.getTime() + (m.everyDays||7)*24*3600e3)
      list.push({ med:m, next })
    }
    return list.sort((a,b)=>a.next-b.next).slice(0,2)
  }, [JSON.stringify(meds), JSON.stringify(shots)])

  return (
    <div className="card">
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6}}>
        <h3 style={{margin:0}}>Next Shots</h3>
        <span className="tiny">Soonest two</span>
      </div>
      {soonest.length===0 && <div className="tiny">No upcoming shots yet—log a first dose.</div>}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
        {soonest.map(({med, next}) => <Gauge key={med.id} med={med} next={next} />)}
      </div>
    </div>
  )
}
function Gauge({ med, next }){
  const now = new Date()
  const totalMs = (med.everyDays||7)*24*3600e3
  const shots = [] // not needed for elapsed; we base purely on cadence from last shot
  const remaining = Math.max(0, (next - now))
  const elapsed = totalMs - remaining
  const pct = Math.max(0, Math.min(1, elapsed / totalMs))
  const daysLeft = Math.floor(remaining / (24*3600e3))
  const hoursLeft = Math.floor((remaining % (24*3600e3)) / 3600e3)

  const size=140, cx=size/2, cy=size/2, r=54
  const startAngle = -Math.PI*3/4, endAngle = Math.PI*3/4
  const sweep = endAngle - startAngle
  const end = startAngle + pct * sweep
  const arcPath=(R,a0,a1)=>{const x0=cx+R*Math.cos(a0), y0=cy+R*Math.sin(a0), x1=cx+R*Math.cos(a1), y1=cy+R*Math.sin(a1); const large=(a1-a0)>Math.PI?1:0; return `M ${x0} ${y0} A ${R} ${R} 0 ${large} 1 ${x1} ${y1}`}

  return (
    <div className="card" style={{margin:0}}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs><filter id="shadow" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity=".25"/></filter></defs>
        <path d={arcPath(r, startAngle, endAngle)} stroke="rgba(255,255,255,.12)" strokeWidth="12" fill="none" strokeLinecap="round" />
        <path d={arcPath(r, startAngle, Math.max(startAngle+0.01, end))} stroke={med.color} strokeWidth="12" fill="none" strokeLinecap="round" filter="url(#shadow)"/>
        <circle cx={cx} cy={cy} r="38" fill={hexToRgba(med.color, .15)} stroke={med.color} strokeWidth="1"/>
        <text x={cx} y={cy-10} textAnchor="middle" fontWeight="700" fontSize="12">{med.name}</text>
        <text x={cx} y={cy+6} textAnchor="middle" fontWeight="800" fontSize="18">{daysLeft}d {hoursLeft}h</text>
        <text x={cx} y={cy+24} textAnchor="middle" fontSize="10" fill="#9ca3af">until next</text>
      </svg>
    </div>
  )
}

// Home weight small chart
function HomeWeightChart({entries,homeWeightRange,setHomeWeightRange}){
  const filtered=useMemo(()=>{if(homeWeightRange==='all')return entries; const now=new Date(); const since=new Date(now); if(homeWeightRange==='week') since.setDate(now.getDate()-7); if(homeWeightRange==='month') since.setDate(now.getDate()-30); return entries.filter(e=>new Date(e.atISO)>=since)},[entries,homeWeightRange])
  const labels=filtered.map(e=>new Date(e.atISO).toLocaleDateString([],{month:'numeric',day:'numeric'}))
  const series=filtered.map(e=>e.v)
  const weightColor='rgba(34,211,238,1)', weightFill='rgba(34,211,238,0.15)'
  return(<div className="card">
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
      <h3 style={{margin:0}}>Weight</h3>
      <div style={{display:'flex',gap:6}}><button className="save" onClick={()=>setHomeWeightRange('week')} style={{opacity:homeWeightRange==='week'?1:.6}}>Week</button><button className="save" onClick={()=>setHomeWeightRange('month')} style={{opacity:homeWeightRange==='month'?1:.6}}>Month</button><button className="save" onClick={()=>setHomeWeightRange('all')} style={{opacity:homeWeightRange==='all'?1:.6}}>All</button></div>
    </div>
    <div style={{height:180}}>
      <Line data={{labels,datasets:[{data:series,fill:true,backgroundColor:weightFill,borderColor:weightColor,borderWidth:3,pointRadius:3,pointBackgroundColor:weightColor,tension:.35}]}} options={{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{grid:{color:'rgba(127,127,127,.25)'},ticks:{color:'#9ca3af'}},y:{grid:{color:'rgba(127,127,127,.25)'},ticks:{color:'#9ca3af'}}}}}/>
    </div>
    {entries.length===0&&<div className="tiny" style={{marginTop:8}}>No weight entries yet.</div>}
  </div>)
}

// KPI row
function KpiRow({meds,shots}){
  const today=new Date(), start=new Date(today); start.setHours(0,0,0,0)
  const shotsToday=shots.filter(s=>new Date(s.atISO)>=start).length, activeMeds=meds.length
  const soon=meds.map(m=>{const last=[...shots].reverse().find(s=>s.medId===m.id); if(!last) return null; let next=new Date(new Date(last.atISO).getTime()+m.everyDays*24*3600e3); while(next<=new Date()) next=new Date(next.getTime()+m.everyDays*24*3600e3); return {next}}).filter(Boolean).sort((a,b)=>a.next-b.next)[0]
  const inHours=soon?Math.max(0,Math.round((soon.next-new Date())/36e5)):'—'
  return(<div className="kpi-row"><div className="kpi"><h3>Shots Today</h3><p>{shotsToday}</p></div><div className="kpi"><h3>Meds</h3><p>{activeMeds}</p></div><div className="kpi"><h3>Next Due (h)</h3><p>{inHours}</p></div></div>)
}

// Bottom nav
function BottomMenu({setScreen,screen}){
  const items=[
    {id:'home',label:'Home',icon:'🏠'},
    {id:'settings',label:'Settings',icon:'⚙️'},
    {id:'shot',label:'Shot',icon:'💉'},
    {id:'weight',label:'Weight',icon:'⚖️'},
    {id:'calc',label:'Calc',icon:'🧮'}
  ]
  return(<div className="bottom-bar">{items.map(i=>(<button key={i.id} onClick={()=>setScreen(i.id)} className={`icon-btn ${screen===i.id?'active':''}`}><span style={{fontSize:20}}>{i.icon}</span>{i.label}</button>))}</div>)
}

// Settings (includes user add/switch)
function Settings({theme,setTheme,meds,setMeds,shots,setShots,weights,setWeights,profile,setProfile,chart,setChart,homeWeightRange,setHomeWeightRange,users,onAddUser,currentUserId,onSwitchUser}){
  const [form,setForm]=useState({name:'',halfLifeHours:'24',everyDays:'7',color:'#60a5fa',ka:'1.0'})
  const [resetConfirm,setResetConfirm]=useState('')
  const [newUser,setNewUser]=useState('')

  const addMed=e=>{e.preventDefault(); const name=form.name.trim(), hl=parseFloat(form.halfLifeHours), ev=parseInt(form.everyDays); const color=form.color||'#60a5fa', ka=parseFloat(form.ka)||1.0; if(!name||!Number.isFinite(hl)||!Number.isFinite(ev)) return; const med={id:crypto.randomUUID(),name,halfLifeHours:hl,everyDays:ev,color,ka}; setMeds(p=>[...p,med]); setForm({name:'',halfLifeHours:'24',everyDays:'7',color:'#60a5fa',ka:'1.0'})}
  const delMed=id=>setMeds(p=>p.filter(m=>m.id!==id))
  const updateField=(id,patch)=>setMeds(p=>p.map(m=>m.id===id?{...m,...patch}:m))
  const addPreset=med=>{ if(meds.some(x=>x.name.toLowerCase()===med.name.toLowerCase())){alert(med.name+' already exists.');return} setMeds(p=>[...p,med]) }

  const exportJSON=()=>{const payload={theme,meds,shots,weights,profile,chart_settings:chart,home_weight_range:homeWeightRange,screen:'settings'}; const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='backup.json'; a.click(); URL.revokeObjectURL(a.href) }
  const importJSONFile=e=>{const file=e.target.files?.[0]; if(!file) return; const r=new FileReader(); r.onload=()=>{try{const data=JSON.parse(r.result); if(data.theme) setTheme(data.theme); if(data.meds) setMeds(data.meds); if(data.shots) setShots(data.shots); if(data.weights) setWeights(data.weights); if(data.profile) setProfile(data.profile); if(data.chart_settings) setChart(data.chart_settings); if(data.home_weight_range) setHomeWeightRange(data.home_weight_range); alert('Imported.')}catch(err){alert('Invalid JSON: '+err.message)}}; r.readAsText(file); e.target.value=''}

  const factoryReset=()=>{ if((resetConfirm||'').trim().toLowerCase()!=='yes'){alert('Type "yes" to confirm reset.'); return} setMeds([]); setShots([]); setWeights([]); setProfile({sex:'other',heightIn:70}); setChart({range:30,view:'per-med',stacked:false,model:'step'}); setHomeWeightRange('month'); alert('Cleared current user data.') }

  return(<div className="card">
    <h2 style={{marginTop:4}}>Settings</h2>

    <div className="label">Theme</div><div className="row"><button className="save" onClick={()=>setTheme('light')}>Light</button><button className="save" onClick={()=>setTheme('dark')}>Dark</button></div>

    <div style={{height:16}}/><h3 style={{marginBottom:8}}>Users</h3>
    <div className="row" style={{alignItems:'center',gap:8}}>
      <select className="input" value={currentUserId||''} onChange={e=>onSwitchUser(e.target.value)}>
        {users.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}
      </select>
      <span className="tiny">Active user</span>
    </div>
    <div className="row" style={{alignItems:'center',gap:8, marginTop:8}}>
      <input className="input" placeholder="New user name" value={newUser} onChange={e=>setNewUser(e.target.value)} />
      <button className="save" onClick={()=>{ if(newUser.trim()) onAddUser(newUser.trim()); setNewUser('') }}>Add User</button>
    </div>

    <div style={{height:12}}/><h3 style={{marginBottom:8}}>Quick add presets</h3>
    <div className="row"><button className="save" onClick={()=>addPreset({id:crypto.randomUUID(),name:'Tirzepatide',halfLifeHours:129.6,everyDays:7,color:'#7c3aed',ka:0.037})}>Add Tirzepatide</button><button className="save" onClick={()=>addPreset({id:crypto.randomUUID(),name:'Retatrutide',halfLifeHours:144,everyDays:7,color:'#f59e0b',ka:0.04})}>Add Retatrutide</button></div>

    <div style={{height:12}}/><h3 style={{marginBottom:8}}>Medications</h3>
    <div className="list">{meds.map(m=>(<div className="list-item" key={m.id}><div><div style={{fontWeight:700,display:'flex',alignItems:'center',gap:8}}><span style={{width:14,height:14,borderRadius:4,background:m.color,display:'inline-block',border:'1px solid var(--border)'}}></span>{m.name}</div><div className="tiny">Half-life: {m.halfLifeHours} h • Every {m.everyDays} d • ka: {m.ka??1.0} 1/h</div></div><div style={{display:'flex',alignItems:'center',gap:8}}><input type="color" className="input" value={m.color} onChange={e=>updateField(m.id,{color:e.target.value})} style={{width:48,padding:2}}/><input className="input" type="number" step="0.001" min="0.001" style={{width:90}} value={m.ka??1.0} onChange={e=>updateField(m.id,{ka:parseFloat(e.target.value)||1.0})} title="Absorption rate ka (1/h)"/><button className="del" onClick={()=>delMed(m.id)}>Delete</button></div></div>))}{meds.length===0&&<div className="tiny">No meds yet</div>}</div>

    <form onSubmit={addMed} className="list-item" style={{display:'block',marginTop:10}}>
      <div className="label">Name</div><input className="input" placeholder="Medication name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
      <div className="row" style={{marginTop:10}}><div><div className="label">Half-life (hours)</div><input className="input" type="number" min="1" step="0.1" value={form.halfLifeHours} onChange={e=>setForm({...form,halfLifeHours:e.target.value})}/></div><div><div className="label">How often (days)</div><input className="input" type="number" min="1" step="1" value={form.everyDays} onChange={e=>setForm({...form,everyDays:e.target.value})}/></div></div>
      <div className="row" style={{marginTop:10}}><div><div className="label">Color</div><input className="input" type="color" value={form.color} onChange={e=>setForm({...form,color:e.target.value})}/></div><div><div className="label">ka (1/h)</div><input className="input" type="number" min="0.001" step="0.001" value={form.ka} onChange={e=>setForm({...form,ka:e.target.value})}/></div></div>
      <div style={{marginTop:10,display:'flex',justifyContent:'space-between'}}><div></div><button className="save" type="submit">Add Medication</button></div>
    </form>

    <div style={{height:16}}/><h3 style={{margin:'8px 0'}}>Backup & Restore</h3>
    <div className="row"><button className="save" onClick={exportJSON}>Export JSON</button><label className="add-btn"><input type="file" accept="application/json" onChange={importJSONFile} style={{display:'none'}}/>Import JSON</label></div>

    <div style={{height:16}}/><h3 style={{margin:'8px 0',color:'var(--red)'}}>Factory Reset (current user)</h3>
    <div className="row" style={{alignItems:'center',gap:8}}><input className="input" placeholder='type "yes" to confirm' value={resetConfirm} onChange={e=>setResetConfirm(e.target.value)}/><button className="del" disabled={(resetConfirm||'').trim().toLowerCase()!=='yes'} onClick={factoryReset}>Reset</button></div>
  </div>)
}

// Shot
function Shot({meds,shots,setShots}){
  const [medId,setMedId]=useState(meds[0]?.id??'')
  const [dose,setDose]=useState('10')
  const [timeISO,setTimeISO]=useState(()=>new Date().toISOString().slice(0,16))
  const addShot=(medId,doseNum,atDate)=>({id:crypto.randomUUID(),medId,dose:doseNum,atISO:atDate.toISOString()})
  function add(){ if(!medId) return; const d=parseFloat(dose); if(!Number.isFinite(d)||d<=0) return; const at=new Date(timeISO); if(isNaN(at.getTime())) return
    const s=addShot(medId,d,at); setShots(p=>[...p,s].sort((a,b)=>new Date(a.atISO)-new Date(b.atISO))) }
  function addNext(){ if(!medId) return; const med=meds.find(m=>m.id===medId); if(!med) return alert('Medication not found'); const days=parseInt(med.everyDays)||7
    const d=parseFloat(dose); if(!Number.isFinite(d)||d<=0) return; const at=new Date(timeISO); if(isNaN(at.getTime())) return
    const first=addShot(medId,d,at), later=addShot(medId,d,new Date(at.getTime()+days*24*3600e3))
    setShots(p=>[...p,first,later].sort((a,b)=>new Date(a.atISO)-new Date(b.atISO))) }
  function addSeries(){ if(!medId) return; const med=meds.find(m=>m.id===medId); if(!med) return alert('Medication not found')
    const d=parseFloat(dose); if(!Number.isFinite(d)||d<=0) return; const start=new Date(timeISO); if(isNaN(start.getTime())) return; const days=parseInt(med.everyDays)||7
    const weeksStr=prompt('How many weeks to schedule?','4'); if(weeksStr===null) return; const weeks=parseInt(weeksStr); if(!Number.isFinite(weeks)||weeks<=0) return alert('Enter a positive number of weeks.')
    const end=new Date(start.getTime()+weeks*7*24*3600e3); const addList=[]; let t=new Date(start); while(t<=end){ addList.push(addShot(medId,d,new Date(t))); t=new Date(t.getTime()+days*24*3600e3) }
    if(!confirm(`This will add ${addList.length} shots from ${start.toLocaleString()} through ~${end.toLocaleDateString()}. Continue?`)) return
    setShots(p=>[...p,...addList].sort((a,b)=>new Date(a.atISO)-new Date(b.atISO))) }
  return(<div className="card">
    <h2 style={{marginTop:4}}>Add Shot</h2>
    {meds.length===0&&<div className="tiny">No medications defined yet. Add some in Settings.</div>}
    <div className="label" style={{marginTop:8}}>Medication</div>
    <select value={medId} onChange={e=>setMedId(e.target.value)} className="input">{meds.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select>
    <div className="row" style={{marginTop:10}}><div><div className="label">Dose (mg)</div><input className="input" type="number" min="0" step="0.1" value={dose} onChange={e=>setDose(e.target.value)}/></div><div><div className="label">Time</div><input className="input" type="datetime-local" value={timeISO} onChange={e=>setTimeISO(e.target.value)}/></div></div>
    <div style={{marginTop:12,display:'flex',justifyContent:'space-between',gap:8,flexWrap:'wrap'}}>
      <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
        <button className="save" onClick={add}>Save Shot</button>
        <button className="save" onClick={addNext}>Save & Add Next (+{(() => (meds.find(m=>m.id===medId)?.everyDays ?? 7))()}d)</button>
        <button className="save" onClick={addSeries}>Save & Add Series</button>
      </div>
    </div>
  </div>)
}

// Weight tab
function Weight({entries,setEntries,profile,setProfile}){
  const [w,setW]=useState('')
  const [timeISO,setTimeISO]=useState(()=>new Date().toISOString().slice(0,16))
  const [range,setRange]=useState('month')
  const last=entries.length?entries[entries.length-1].v:null
  const bmi=useMemo(()=>{ if(!last||!profile.heightIn) return null; const kg=last*0.45359237, m=profile.heightIn*0.0254; return Math.round((kg/(m*m))*10)/10 },[last,profile.heightIn])

  function add(){ const val=parseFloat(w); if(!Number.isFinite(val)) return; const at=new Date(timeISO); if(isNaN(at.getTime())) return
    const row={id:crypto.randomUUID(),v:val,atISO:at.toISOString()}; const next=[...entries,row].sort((a,b)=>new Date(a.atISO)-new Date(b.atISO)); setEntries(next); setW('') }
  function edit(id){ const r=entries.find(x=>x.id===id); if(!r) return; const nv=prompt('Weight (lb):',String(r.v)); if(nv===null) return; const nt=prompt('Time:',r.atISO.slice(0,16)); if(nt===null) return
    const at=new Date(nt); if(isNaN(at.getTime())) return alert('Invalid date/time'); const val=parseFloat(nv); if(!Number.isFinite(val)) return alert('Invalid weight')
    const next=entries.map(x=>x.id===id?{...x,v:val,atISO:at.toISOString()}:x).sort((a,b)=>new Date(a.atISO)-new Date(b.atISO)); setEntries(next) }
  function delEntry(id){ if(!confirm('Delete this entry?')) return; const next=entries.filter(x=>x.id!==id); setEntries(next) }

  // CSV export/import (client-side)
  function toCSV(rows,headers){ const esc=v=>{if(v==null)return''; const s=String(v); return /[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s }; const head=headers.map(h=>esc(h.label)).join(','); const body=rows.map(r=>headers.map(h=>esc(h.get(r))).join(',')).join('\n'); return head+'\n'+body }
  function exportCSV(){ const csv=toCSV(entries,[{label:'id',get:r=>r.id},{label:'weight_lb',get:r=>r.v},{label:'time_iso',get:r=>r.atISO}]); const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='weights.csv'; a.click(); URL.revokeObjectURL(a.href) }
  function parseCSV(text){ const rows=[]; let i=0,field='',row=[],inQ=false; const pf=()=>{row.push(field);field=''}, pr=()=>{rows.push(row);row=[]}
    while(i<text.length){ const c=text[i]; if(inQ){ if(c==='"'){ if(text[i+1]==='"'){field+='"';i+=2;continue} inQ=false; i++; continue } field+=c; i++; continue }
      if(c==='"'){ inQ=true; i++; continue } if(c===','){ pf(); i++; continue } if(c==='\r'){ i++; continue } if(c==='\n'){ pf(); pr(); i++; continue } field+=c; i++ }
    pf(); if(row.length) pr(); if(rows.length===0) return {headers:[],records:[]}; const headers=rows[0].map(h=>h.trim()); const records=rows.slice(1).filter(r=>r.length&&r.some(x=>x.trim()!==''))
      .map(r=>{const o={}; headers.forEach((h,idx)=>o[h]=r[idx]?.trim()??''); return o}); return {headers,records} }
  function handleImport(e){ const file=e.target.files?.[0]; if(!file) return; const reader=new FileReader(); reader.onload=()=>{
      try{ const {headers,records}=parseCSV(reader.result); const need=['id','weight_lb','time_iso']; const ok=need.every(h=>headers.includes(h)); if(!ok) return alert('CSV headers must include: '+need.join(', '))
        const parsed=records.map(r=>({id:r.id||crypto.randomUUID(),v:parseFloat(r.weight_lb),atISO:new Date(r.time_iso).toISOString()})).filter(x=>Number.isFinite(x.v)&&!isNaN(new Date(x.atISO).getTime()))
        const combined = [...entries, ...parsed]; combined.sort((a,b)=>new Date(a.atISO)-new Date(b.atISO)); setEntries(combined); alert('Imported '+parsed.length+' weights.') }
      catch(err){ alert('Import failed: '+err.message) } }; reader.readAsText(file); e.target.value='' }

  const filtered=useMemo(()=>{ if(range==='all') return entries; const now=new Date(); const since=new Date(now); if(range==='week') since.setDate(now.getDate()-7); if(range==='month') since.setDate(now.getDate()-30); return entries.filter(e=>new Date(e.atISO)>=since)},[entries,range])
  const labels=filtered.map(e=>new Date(e.atISO).toLocaleDateString([],{month:'numeric',day:'numeric'})+' '+new Date(e.atISO).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}))
  const series=filtered.map(e=>e.v)
  const weightColor='rgba(34,211,238,1)', weightFill='rgba(34,211,238,0.15)'

  return(<div className="card">
    <h2 style={{marginTop:4}}>Weight</h2>
    <div className="row"><div><div className="label">Weight (lb)</div><input className="input" placeholder="e.g., 185.2" value={w} onChange={e=>setW(e.target.value)}/></div>
    <div><div className="label">Date & Time</div><input className="input" type="datetime-local" value={timeISO} onChange={e=>setTimeISO(e.target.value)}/></div></div>
    <div style={{display:'flex',justifyContent:'space-between',marginTop:8,gap:8,flexWrap:'wrap'}}>
      <div style={{display:'flex',gap:8}}><button className="save" onClick={add}>Add Entry</button><button className="del" onClick={exportCSV}>Export CSV</button></div>
      <div style={{display:'flex',gap:8,alignItems:'center'}}>
        <input id="csvfile" type="file" accept=".csv,text/csv" onChange={handleImport} style={{display:'none'}}/>
        <label className="add-btn" htmlFor="csvfile">Import CSV</label>
      </div>
    </div>
    <div className="row" style={{marginTop:10,alignItems:'center',gap:8}}>
      <span className="tiny">Range</span>
      <button className="save" onClick={()=>setRange('week')} style={{opacity:range==='week'?1:.6}}>Week</button>
      <button className="save" onClick={()=>setRange('month')} style={{opacity:range==='month'?1:.6}}>Month</button>
      <button className="save" onClick={()=>setRange('all')} style={{opacity:range==='all'?1:.6}}>All</button>
      <div style={{marginLeft:'auto',fontWeight:700}}>BMI: {bmi ?? '—'}</div>
    </div>
    <div className="card" style={{marginTop:10}}>
      <div style={{height:180}}>
        <Line data={{labels,datasets:[{data:series,fill:true,backgroundColor:weightFill,borderColor:weightColor,borderWidth:3,pointRadius:3,pointBackgroundColor:weightColor,tension:.35}]}} options={{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{grid:{color:'rgba(127,127,127,.25)'},ticks:{color:'#9ca3af',maxRotation:0,autoSkip:true}},y:{grid:{color:'rgba(127,127,127,.25)'},ticks:{color:'#9ca3af'},beginAtZero:false}},elements:{point:{radius:3}}}}/>
      </div>
    </div>
    <div className="list" style={{marginTop:10}}>{entries.slice().reverse().map(r=>(<div className="list-item" key={r.id}><div><div style={{fontWeight:700}}>{r.v} lb</div><div className="tiny">{new Date(r.atISO).toLocaleString()}</div></div><div style={{display:'flex',gap:8}}><button className="save" onClick={()=>edit(r.id)}>Edit</button><button className="del" onClick={()=>delEntry(r.id)}>Delete</button></div></div>))}{entries.length===0&&<div className="tiny">No entries yet.</div>}</div>
  </div>)
}

// Calculator syringe and vial (same as prior realistic versions)
function Syringe({units}){
  const totalU=100
  const u = (units!=null&&units>0)?Math.min(units,totalU):0
  const fillPct = u/totalU
  const W=360, H=140
  const barrelX=70, barrelY=52, barrelW=220, barrelH=24
  const needleLen=40
  const flangeR=16
  const textColor='var(--text)'
  const fillLabel = `${Math.round(u*10)/10} U`

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Syringe gauge">
      <defs>
        <linearGradient id="liquid" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#22d3ee"/><stop offset="100%" stopColor="#60a5fa"/>
        </linearGradient>
        <linearGradient id="glass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.20)"/><stop offset="100%" stopColor="rgba(255,255,255,0.06)"/>
        </linearGradient>
        <linearGradient id="rubber" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#111827"/><stop offset="100%" stopColor="#374151"/>
        </linearGradient>
        <filter id="shadow"><feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity=".25"/></filter>
        <filter id="glow"><feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#22d3ee" floodOpacity=".7"/></filter>
      </defs>

      <circle cx={barrelX+barrelW+40} cy={barrelY+barrelH/2} r={flangeR} fill="url(#glass)" stroke="rgba(255,255,255,.35)"/>
      <rect x={barrelX+barrelW+8} y={barrelY+barrelH/2-3} width="26" height="6" rx="3" fill="#cbd5e1" stroke="rgba(0,0,0,.1)"/>

      <g filter="url(#shadow)">
        <rect x={barrelX-needleLen} y={barrelY+barrelH/2-2} width={needleLen} height="4" fill="#9ca3af"/>
        <polygon points={`${barrelX-needleLen-6},${barrelY+barrelH/2} ${barrelX-needleLen},${barrelY+barrelH/2-2} ${barrelX-needleLen},${barrelY+barrelH/2+2}`} fill="#9ca3af"/>
      </g>

      <rect x={barrelX} y={barrelY} width={barrelW} height={barrelH} rx="8" ry="8" fill="url(#glass)" stroke="rgba(255,255,255,.35)"/>
      <rect x={barrelX} y={barrelY} width={barrelW*fillPct} height={barrelH} rx="8" ry="8" fill="url(#liquid)" filter="url(#glow)"/>
      <rect x={barrelX+barrelW*fillPct-6} y={barrelY+2} width="12" height={barrelH-4} rx="4" fill="url(#rubber)"/>

      {Array.from({length:51}).map((_,i)=>{
        const unit=i*2; const x=barrelX + (barrelW*(unit/100)); let h=5; let stroke='rgba(255,255,255,.45)';
        if(unit%10===0){h=14; stroke='rgba(255,255,255,.85)'} else if(unit%5===0){h=9; stroke='rgba(255,255,255,.65)'}
        return <line key={i} x1={x} x2={x} y1={barrelY+barrelH} y2={barrelY+barrelH+h} stroke={stroke}/>
      })}
      {[0,10,20,30,40,50,60,70,80,90,100].map((t,i)=>{
        const x=barrelX + (barrelW*(t/100))
        return <text key={i} x={x} y={barrelY+barrelH+24} fontSize="10" textAnchor="middle" fill={textColor}>{t}</text>
      })}

      <text x={barrelX+barrelW*fillPct} y={barrelY-10} fontSize="13" fontWeight="900" textAnchor="middle" fill={textColor} stroke="rgba(0,0,0,.45)" strokeWidth="0.7">{fillLabel}</text>
    </svg>
  )
}
function Vial({totalMl, drawMl}){
  const T = Number.isFinite(totalMl) && totalMl>0 ? totalMl : null
  const D = (Number.isFinite(drawMl) && T!=null) ? Math.max(0, Math.min(drawMl, T)) : 0
  const remain = T!=null ? Math.max(0, T - D) : null
  const pct = T!=null ? (remain/T) : 1

  const W=90, H=160
  const bodyX=26, bodyY=34, bodyW=38, bodyH=98
  const neckW=20, neckH=12
  const capH=16

  const labelText = T!=null ? `${Math.round(remain*100)/100} mL` : "—"

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Vial">
      <defs>
        <linearGradient id="cap" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#9ca3af"/><stop offset="100%" stopColor="#6b7280"/>
        </linearGradient>
        <linearGradient id="glassV" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.35)"/><stop offset="100%" stopColor="rgba(255,255,255,0.08)"/>
        </linearGradient>
        <linearGradient id="liquidV" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22d3ee"/><stop offset="100%" stopColor="#60a5fa"/>
        </linearGradient>
        <filter id="vShadow"><feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity=".25"/></filter>
      </defs>

      <rect x={bodyX-((neckW-bodyW)/2)} y={bodyY-capH} width={neckW} height={capH} rx="3" fill="url(#cap)" filter="url(#vShadow)"/>
      <rect x={bodyX+(bodyW-neckW)/2} y={bodyY-neckH} width={neckW} height={neckH} rx="3" fill="url(#glassV)" stroke="rgba(255,255,255,.35)"/>
      <rect x={bodyX} y={bodyY} width={bodyW} height={bodyH} rx="10" ry="10" fill="url(#glassV)" stroke="rgba(255,255,255,.35)"/>
      { T!=null && (
        <g>
          {(() => { const h = bodyH * (1-pct), y = bodyY + bodyH - h; return <rect x={bodyX} y={y} width={bodyW} height={h} rx="10" ry="10" fill="url(#liquidV)"/> })()}
          {(() => { const h = bodyH * (1-pct), y = bodyY + bodyH - h, mx = bodyX + bodyW/2; return <path d={`M ${bodyX} ${y} Q ${mx} ${y-6} ${bodyX+bodyW} ${y}`} fill="rgba(255,255,255,.25)"/> })()}
        </g>
      )}
      { T!=null && Array.from({length: Math.floor(T*2)+1}).map((_,i)=>{
          const frac = i/(T*2), y = bodyY + bodyH - bodyH*frac, len = (i%2===0) ? 10 : 6, val = (i/2).toFixed(1)
          return <g key={i}><line x1={bodyX+bodyW+4} x2={bodyX+bodyW+4+len} y1={y} y2={y} stroke="rgba(255,255,255,.6)"/>{i%2===0 && <text x={bodyX+bodyW+4+len+2} y={y+3} fontSize="9" fill="var(--text)">{val}</text>}</g>
      )}
      <text x={W/2} y={bodyY+bodyH+18} textAnchor="middle" fontSize="11" fill="var(--text)">{labelText}</text>
    </svg>
  )
}

function Calculator(){
  const [desiredMg,setDesiredMg]=useState('')
  const [vialMl,setVialMl]=useState('')
  const [conc,setConc]=useState('')
  const mg=parseFloat(desiredMg), ml=parseFloat(vialMl), mgPerMl=parseFloat(conc)
  const mlNeeded = (Number.isFinite(mg)&&Number.isFinite(mgPerMl)&&mgPerMl>0) ? (mg/mgPerMl) : null
  const units = mlNeeded!=null ? mlNeeded*100 : null
  const warn = units!=null && units>100
  const drawMl = (mlNeeded!=null && Number.isFinite(ml)) ? Math.min(mlNeeded, ml) : null
  return(<div className="card">
    <h2 style={{marginTop:4}}>Dose Calculator</h2>
    <div className="row">
      <div><div className="label">Desired dose (mg)</div><input className="input" value={desiredMg} onChange={e=>setDesiredMg(e.target.value)} placeholder="e.g., 2.5"/></div>
      <div><div className="label">Vial size (mL)</div><input className="input" value={vialMl} onChange={e=>setVialMl(e.target.value)} placeholder="e.g., 5"/></div>
      <div><div className="label">Concentration (mg/mL)</div><input className="input" value={conc} onChange={e=>setConc(e.target.value)} placeholder="e.g., 5"/></div>
    </div>
    <div style={{marginTop:12,display:'grid',gridTemplateColumns:'1fr auto',gap:16,alignItems:'center'}}>
      <div style={{display:'flex',alignItems:'center',gap:16,flexWrap:'wrap'}}>
        <Syringe units={units}/>
        <div>
          <div className="label">Units needed (100 units = 1 mL)</div>
          <div style={{fontSize:28,fontWeight:900}}>{units!=null?Math.round(units*10)/10:'—'} <span className="tiny">U</span></div>
          {warn&&<div className="tiny" style={{color:'var(--bad)'}}>This exceeds a 1 mL (100 U) syringe. Consider splitting the dose.</div>}
          {mlNeeded!=null&&Number.isFinite(ml)&&<div className="tiny" style={{marginTop:6}}>
            Equals <strong>{Math.round((mlNeeded)*100)/100}</strong> mL • Remaining in {ml} mL vial after this dose: <strong>{Math.max(0, Math.round(((ml - mlNeeded)*100))/100)}</strong> mL
          </div>}
        </div>
      </div>
      <div style={{justifySelf:'end'}}>
        <Vial totalMl={Number.isFinite(ml)?ml:null} drawMl={drawMl}/>
      </div>
    </div>
  </div>)
}

export { }
