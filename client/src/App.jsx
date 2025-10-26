import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Line } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler, Legend } from 'chart.js'
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler, Legend)

// storage utils — server-only (no browser storage)
const __CACHE__ = (typeof window !== 'undefined' && window.__PEP_BOOT__) ? { ...window.__PEP_BOOT__ } : {};
const load = (k, f) => (k in __CACHE__) ? __CACHE__[k] : f;
const save = async (k, v) => {
  __CACHE__[k] = v;
  try { await fetch('/api/doc/set', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ key: k, value: v }) }); } catch(_) {}
};
const bulkSet = async (data) => {
  Object.assign(__CACHE__, data);
  try { await fetch('/api/doc/bulkset', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ data }) }); } catch(_) {}
};
=>__REMOVED__(k,JSON.stringify(v))
const LN2=Math.log(2)
const hexToRgba=(hex,a=1)=>{if(!hex)return `rgba(96,165,250,${a})`;const h=hex.replace('#','');const n=parseInt(h.length===3?h.split('').map(c=>c+c).join(''):h,16);const r=(n>>16)&255,g=(n>>8)&255,b=n&255;return `rgba(${r}, ${g}, ${b}, ${a})`}

// defaults
const DEFAULT_MEDS=[{id:'m1',name:'ExampleMed A',halfLifeHours:24,everyDays:7,color:'#60a5fa',ka:1.0}]
const DEFAULT_SHOTS=[{id:'s1',medId:'m1',dose:10,atISO:new Date(Date.now()-72*3600e3).toISOString()},{id:'s2',medId:'m1',dose:10,atISO:new Date(Date.now()-24*3600e3).toISOString()}]

function Splash(){return(<div className="splash"><div style={{display:'grid',placeItems:'center'}}><div className="logo"><svg width="84" height="84" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="white" opacity=".12"/><path d="M4 14c4 2 12 2 16 0" stroke="white"/><path d="M8 10l4-4 4 4" stroke="white"/></svg></div><h1>PepTrackr • v16.5.2</h1></div></div>)}

function Wordmark(){
  return (
    <svg width="118" height="24" viewBox="0 0 236 48" role="img" aria-label="PepTrackr">
      <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#22d3ee"/><stop offset="100%" stopColor="#60a5fa"/></linearGradient></defs>
      <text x="0" y="32" fontFamily="ui-sans-serif,system-ui,Segoe UI,Roboto" fontSize="28" fontWeight="900" fill="url(#g)">PepTrackr</text>
    </svg>
  )
}

export default function App(){
  const [ready,setReady]=
  // Real-time sync: listen to server changes and reconcile state
  React.useEffect(() => {
    let es;
    let timer = null;
    async function reconcile() {
      const r = await fetch('/api/storage/all', { cache: 'no-store' });
      if (!r.ok) return;
      const data = await r.json();
      if (data.hasOwnProperty('meds')) setMeds(data['meds']);
      if (data.hasOwnProperty('shots')) setShots(data['shots']);
      if (data.hasOwnProperty('profile')) setProfile(data['profile']);
      if (data.hasOwnProperty('theme')) setTheme(data['theme']);
    }
    try {
      es = new EventSource('/api/stream');
      es.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data || '{}');
          if (msg && msg.event === 'change') {
            if (!timer) {
              timer = setTimeout(() => { timer = null; reconcile().catch(()=>{}); }, 100);
            }
          }
        } catch(_){}
      };
    } catch(_){}
    return () => { try { es && es.close(); } catch(_) {} };
  }, []);
useState(false); const [screen,setScreen]=useState(()=>load('screen','home')); const [theme,setTheme]=useState(()=>load('theme','dark'))
  const palette=['#60a5fa','#f59e0b','#10b981','#ef4444','#a78bfa','#22d3ee','#f472b6']
  const [meds,setMeds]=useState(()=>load('meds',DEFAULT_MEDS).map((x,i)=>({ka:x.ka??1.0,color:x.color??palette[i%palette.length],...x})))
  const [shots,setShots]=useState(()=>load('shots',DEFAULT_SHOTS))
  useEffect(()=>{const t=setTimeout(()=>setReady(true),1000);return()=>clearTimeout(t)},[])
  useEffect(()=>{document.documentElement.setAttribute('data-theme',theme);save('theme',theme)},[theme])
  useEffect(()=>save('meds',meds),[meds]); useEffect(()=>save('shots',shots),[shots]); useEffect(()=>save('screen',screen),[screen])
  if(!ready) return <Splash/>
  return(<div className="container">
    <div className="header">
      <div className="brand">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="10" stroke="var(--accent)" opacity=".8"/>
          <path d="M6 14c4 2 8 2 12 0" stroke="var(--accent)" />
          <path d="M8 11l4-4 4 4" stroke="var(--accent)" />
        </svg>
        <Wordmark/>
      </div>
    </div>
    {screen==='home'&&<Home meds={meds} shots={shots}/>}
    {screen==='settings'&&<Settings theme={theme} setTheme={setTheme} meds={meds} setMeds={setMeds} shots={shots} setShots={setShots}/>}
    {screen==='shot'&&<Shot meds={meds} shots={shots} setShots={setShots}/>}
    {screen==='weight'&&<Weight/>}
    {screen==='calc'&&<Calculator/>}
    <BottomMenu setScreen={setScreen} screen={screen}/>
  </div>)
}

// math
const stepAmount=(shot,med,t)=>{const dt=(t-new Date(shot.atISO))/36e5; if(dt<0) return 0; return shot.dose*Math.pow(0.5, dt/med.halfLifeHours)}
const pkAmount=(shot,med,t)=>{const dt=(t-new Date(shot.atISO))/36e5; if(dt<=0) return 0; const ke=LN2/med.halfLifeHours, ka=med.ka??1.0; if(Math.abs(ka-ke)<1e-6){return shot.dose*ke*dt*Math.exp(-ke*dt)} return shot.dose*(ka/(ka-ke))*(Math.exp(-ke*dt)-Math.exp(-ka*dt))}
const endOfDay=d=>{const x=new Date(d); x.setHours(23,59,59,999); return x}
const daysBack=n=>{const out=[],today=new Date(); for(let i=n-1;i>=0;i--){const d=new Date(today); d.setDate(today.getDate()-i); out.push(d)} return out}

// Home
function Home({meds,shots}){
  return(<>
    <DailyMedChart meds={meds} shots={shots}/>
    <UpcomingShots meds={meds} shots={shots}/>
    <HomeBMI/>
    <HomeWeightChart/>
    <KpiRow meds={meds} shots={shots}/>
  </>)
}

// BMI gauge
function HomeBMI(){
  const entries = load('weights',[])
  const profile = load('profile',{heightIn:70})
  const last = entries.slice(-1)[0]?.v
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
function DailyMedChart({meds,shots}){
  const persisted=load('chart_settings',{range:30,view:'per-med',stacked:false,model:'step'})
  const [range,setRange]=useState(persisted.range),[view,setView]=useState(persisted.view),[stacked,setStacked]=useState(persisted.stacked),[model,setModel]=useState(persisted.model)
  useEffect(()=>save('chart_settings',{range,view,stacked,model}),[range,view,stacked,model])
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
  const shots = load('shots', []).filter(s=>s.medId===med.id).sort((a,b)=>new Date(b.atISO)-new Date(a.atISO))
  const last = shots[0] ? new Date(shots[0].atISO) : null
  const elapsed = last ? Math.min(totalMs, Math.max(0, now - last)) : 0
  const remaining = Math.max(0, (next - now))
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

// Home weight
function HomeWeightChart(){
  const [entries]=useState(()=>load('weights',[]))
  const [range,setRange]=useState(()=>load('home_weight_range','month'))
  useEffect(()=>save('home_weight_range',range),[range])
  const filtered=useMemo(()=>{if(range==='all')return entries; const now=new Date(); const since=new Date(now); if(range==='week') since.setDate(now.getDate()-7); if(range==='month') since.setDate(now.getDate()-30); return entries.filter(e=>new Date(e.atISO)>=since)},[entries,range])
  const labels=filtered.map(e=>new Date(e.atISO).toLocaleDateString([],{month:'numeric',day:'numeric'}))
  const series=filtered.map(e=>e.v)
  const weightColor='rgba(34,211,238,1)', weightFill='rgba(34,211,238,0.15)'
  return(<div className="card">
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
      <h3 style={{margin:0}}>Weight</h3>
      <div style={{display:'flex',gap:6}}><button className="save" onClick={()=>setRange('week')} style={{opacity:range==='week'?1:.6}}>Week</button><button className="save" onClick={()=>setRange('month')} style={{opacity:range==='month'?1:.6}}>Month</button><button className="save" onClick={()=>setRange('all')} style={{opacity:range==='all'?1:.6}}>All</button></div>
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

// Settings
function Settings({
  const importJSONFile = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const data = JSON.parse(reader.result || '{}');
        const payload = {};
        if (data.theme !== undefined) payload.theme = data.theme;
        if (data.meds !== undefined) payload.meds = data.meds;
        if (data.shots !== undefined) payload.shots = data.shots;
        if (data.weights !== undefined) payload.weights = data.weights;
        if (data.profile !== undefined) payload.profile = data.profile;
        if (data.chart_settings !== undefined) payload.chart_settings = data.chart_settings;
        if (data.weight_range !== undefined) payload.weight_range = data.weight_range;
        if (data.home_weight_range !== undefined) payload.home_weight_range = data.home_weight_range;
        await bulkSet(payload);
        if (payload.hasOwnProperty('weights')) setWeights(payload.weights);
        if (payload.hasOwnProperty('theme')) setTheme(payload.theme);
        if (payload.hasOwnProperty('meds')) setMeds(payload.meds);
        if (payload.hasOwnProperty('shots')) setShots(payload.shots);
        if (payload.hasOwnProperty('profile')) setProfile(payload.profile);
        alert('Import complete.');
      } catch (err) {
        alert('Failed to import JSON: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value='';
  };
theme,setTheme,meds,setMeds,shots,setShots}){
  const [form,setForm]=useState({name:'',halfLifeHours:'24',everyDays:'7',color:'#60a5fa',ka:'1.0'})
  const importRef=useRef(), [resetConfirm,setResetConfirm]=useState('')
  const addMed=e=>{e.preventDefault(); const name=form.name.trim(), hl=parseFloat(form.halfLifeHours), ev=parseInt(form.everyDays); const color=form.color||'#60a5fa', ka=parseFloat(form.ka)||1.0; if(!name||!Number.isFinite(hl)||!Number.isFinite(ev)) return; const med={id:crypto.randomUUID(),name,halfLifeHours:hl,everyDays:ev,color,ka}; setMeds(p=>[...p,med]); setForm({name:'',halfLifeHours:'24',everyDays:'7',color:'#60a5fa',ka:'1.0'})}
  const delMed=id=>setMeds(p=>p.filter(m=>m.id!==id))
  const updateField=(id,patch)=>setMeds(p=>p.map(m=>m.id===id?{...m,...patch}:m))
  const addPreset=med=>{const exists=load('meds',[]).some(x=>x.name.toLowerCase()===med.name.toLowerCase()); if(exists){alert(med.name+' already exists.'); return} const next=[...load('meds',[]), med]; save('meds',next); setMeds(next)}
  const exportJSON=()=>{const payload={theme:load('theme','dark'),meds:load('meds',[]),shots:load('shots',[]),weights:load('weights',[]),profile:load('profile',{}),chart_settings:load('chart_settings',{}),screen:load('screen','home'),home_weight_range:load('home_weight_range','month')}; const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='backup.json'; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url) }
  const importJSONFile_orig=e=>{const file=e.target.files?.[0]; if(!file) return; const reader=new FileReader(); reader.onload=()=>{try{const data=JSON.parse(reader.result); if(data.meds) save('meds',data.meds.map(m=>({ka:1.0,...m}))); if(data.shots) save('shots',data.shots); if(data.weights) save('weights',data.weights); if(data.profile) save('profile',data.profile); if(data.theme) save('theme',data.theme); if(data.chart_settings) save('chart_settings',data.chart_settings); if(data.home_weight_range) save('home_weight_range',data.home_weight_range); if(data.screen) save('screen',data.screen); setMeds(load('meds',[])); setShots(load('shots',[])); alert('Import complete.')}catch(err){alert('Invalid JSON: '+err.message)}}; reader.readAsText(file); e.target.value=''}
  const factoryReset=()=>{ if((resetConfirm||'').trim().toLowerCase()!=='yes'){alert('Type \"yes\" to confirm reset.'); return} const keys=['theme','meds','shots','weights','profile','chart_settings','home_weight_range','screen','shot_draft']; keys.forEach(k=>__REMOVED__(k)); alert('All app data cleared. Reloading…'); window.location.reload()}
  return(<div className="card">
    <h2 style={{marginTop:4}}>Settings</h2>
    <div className="label">Theme</div><div className="row"><button className="save" onClick={()=>setTheme('light')}>Light</button><button className="save" onClick={()=>setTheme('dark')}>Dark</button></div>
    <div style={{height:16}}/><h3 style={{marginBottom:8}}>Quick add presets</h3>
    <div className="row"><button className="save" onClick={()=>addPreset({id:crypto.randomUUID(),name:'Tirzepatide',halfLifeHours:129.6,everyDays:7,color:'#7c3aed',ka:0.037})}>Add Tirzepatide</button><button className="save" onClick={()=>addPreset({id:crypto.randomUUID(),name:'Retatrutide',halfLifeHours:144,everyDays:7,color:'#f59e0b',ka:0.04})}>Add Retatrutide</button></div>
    <div style={{height:12}}/><h3 style={{marginBottom:8}}>Medications</h3>
    <div className="list">{meds.map(m=>(<div className="list-item" key={m.id}><div><div style={{fontWeight:700,display:'flex',alignItems:'center',gap:8}}><span style={{width:14,height:14,borderRadius:4,background:m.color,display:'inline-block',border:'1px solid var(--border)'}}></span>{m.name}</div><div className="tiny">Half-life: {m.halfLifeHours} h • Every {m.everyDays} d • ka: {m.ka??1.0} 1/h</div></div><div style={{display:'flex',alignItems:'center',gap:8}}><input type="color" className="input" value={m.color} onChange={e=>updateField(m.id,{color:e.target.value})} style={{width:48,padding:2}}/><input className="input" type="number" step="0.001" min="0.001" style={{width:90}} value={m.ka??1.0} onChange={e=>updateField(m.id,{ka:parseFloat(e.target.value)||1.0})} title="Absorption rate ka (1/h)"/><button className="del" onClick={()=>delMed(m.id)}>Delete</button></div></div>))}{meds.length===0&&<div className="tiny">No meds yet</div>}</div>
    <div style={{height:10}}/>
    <form onSubmit={addMed} className="list-item" style={{display:'block'}}>
      <div className="label">Name</div><input className="input" placeholder="Medication name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
      <div className="row" style={{marginTop:10}}><div><div className="label">Half-life (hours)</div><input className="input" type="number" min="1" step="0.1" value={form.halfLifeHours} onChange={e=>setForm({...form,halfLifeHours:e.target.value})}/></div><div><div className="label">How often (days)</div><input className="input" type="number" min="1" step="1" value={form.everyDays} onChange={e=>setForm({...form,everyDays:e.target.value})}/></div></div>
      <div className="row" style={{marginTop:10}}><div><div className="label">Color</div><input className="input" type="color" value={form.color} onChange={e=>setForm({...form,color:e.target.value})}/></div><div><div className="label">ka (1/h)</div><input className="input" type="number" min="0.001" step="0.001" value={form.ka} onChange={e=>setForm({...form,ka:e.target.value})}/></div></div>
      <div style={{marginTop:10,display:'flex',justifyContent:'space-between'}}><div></div><button className="save" type="submit">Add Medication</button></div>
    </form>
    <div style={{height:16}}/><h3 style={{margin:'8px 0'}}>Backup & Restore</h3>
    <div className="row"><button className="save" onClick={exportJSON}>Export JSON</button><input ref={importRef} type="file" accept="application/json" onChange={importJSONFile} style={{display:'none'}}/><button className="del" onClick={()=>importRef.current?.click()}>Import JSON</button></div>
    <div style={{height:16}}/><h3 style={{margin:'8px 0',color:'var(--red)'}}>Factory Reset</h3>
    <div className="row" style={{alignItems:'center',gap:8}}><input className="input" placeholder='type "yes" to confirm' value={resetConfirm} onChange={e=>setResetConfirm(e.target.value)}/><button className="del" disabled={(resetConfirm||'').trim().toLowerCase()!=='yes'} onClick={factoryReset}>Reset App</button></div>
  </div>)
}

// Shot
function Shot({meds,shots,setShots}){
  const draft=load('shot_draft',null)||{medId:meds[0]?.id??'',dose:'10',timeISO:new Date().toISOString().slice(0,16)}
  const [medId,setMedId]=useState(draft.medId), [dose,setDose]=useState(draft.dose), [timeISO,setTimeISO]=useState(draft.timeISO)
  useEffect(()=>save('shot_draft',{medId,dose,timeISO}),[medId,dose,timeISO])
  const addShot=(medId,doseNum,atDate)=>({id:crypto.randomUUID(),medId,dose:doseNum,atISO:atDate.toISOString()})
  function add(){ if(!medId) return; const d=parseFloat(dose); if(!Number.isFinite(d)||d<=0) return; const at=new Date(timeISO); if(isNaN(at.getTime())) return
    const s=addShot(medId,d,at); setShots(p=>{const n=[...p,s].sort((a,b)=>new Date(a.atISO)-new Date(b.atISO)); save('shots',n); return n})
    const clear={medId,dose:'10',timeISO:new Date().toISOString().slice(0,16)}; save('shot_draft',clear); setDose(clear.dose); setTimeISO(clear.timeISO) }
  function addNext(){ if(!medId) return; const med=meds.find(m=>m.id===medId); if(!med) return alert('Medication not found'); const days=parseInt(med.everyDays)||7
    const d=parseFloat(dose); if(!Number.isFinite(d)||d<=0) return; const at=new Date(timeISO); if(isNaN(at.getTime())) return
    const first=addShot(medId,d,at), later=addShot(medId,d,new Date(at.getTime()+days*24*3600e3))
    setShots(p=>{const n=[...p,first,later].sort((a,b)=>new Date(a.atISO)-new Date(b.atISO)); save('shots',n); return n})
    const clear={medId,dose:'10',timeISO:new Date().toISOString().slice(0,16)}; save('shot_draft',clear); setDose(clear.dose); setTimeISO(clear.timeISO) }
  function addSeries(){ if(!medId) return; const med=meds.find(m=>m.id===medId); if(!med) return alert('Medication not found')
    const d=parseFloat(dose); if(!Number.isFinite(d)||d<=0) return; const start=new Date(timeISO); if(isNaN(start.getTime())) return; const days=parseInt(med.everyDays)||7
    const weeksStr=prompt('How many weeks to schedule?','4'); if(weeksStr===null) return; const weeks=parseInt(weeksStr); if(!Number.isFinite(weeks)||weeks<=0) return alert('Enter a positive number of weeks.')
    const end=new Date(start.getTime()+weeks*7*24*3600e3); const addList=[]; let t=new Date(start); while(t<=end){ addList.push(addShot(medId,d,new Date(t))); t=new Date(t.getTime()+days*24*3600e3) }
    if(!confirm(`This will add ${addList.length} shots from ${start.toLocaleString()} through ~${end.toLocaleDateString()}. Continue?`)) return
    setShots(p=>{const n=[...p,...addList].sort((a,b)=>new Date(a.atISO)-new Date(b.atISO)); save('shots',n); return n})
    const clear={medId,dose:'10',timeISO:new Date().toISOString().slice(0,16)}; save('shot_draft',clear); setDose(clear.dose); setTimeISO(clear.timeISO) }
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
function Weight(){
  const [entries,setEntries]=useState(()=>load('weights',[]))
  const [w,setW]=useState('')
  const [timeISO,setTimeISO]=useState(()=>new Date().toISOString().slice(0,16))
  const [range,setRange]=useState(()=>load('weight_range','month'))
  const [profile,setProfile]=useState(()=>load('profile',{sex:'other',heightIn:70}))
  const [replace,setReplace]=useState(false)
  const importRef=useRef()
  useEffect(()=>save('weight_range',range),[range])

  const last=entries.length?entries[entries.length-1].v:null
  const bmi=useMemo(()=>{ if(!last||!profile.heightIn) return null; const kg=last*0.45359237, m=profile.heightIn*0.0254; return Math.round((kg/(m*m))*10)/10 },[last,profile.heightIn])

  function add(){ const val=parseFloat(w); if(!Number.isFinite(val)) return; const at=new Date(timeISO); if(isNaN(at.getTime())) return
    const row={id:crypto.randomUUID(),v:val,atISO:at.toISOString()}; const next=[...entries,row].sort((a,b)=>new Date(a.atISO)-new Date(b.atISO)); setEntries(next); save('weights',next); setW('') }
  function edit(id){ const r=entries.find(x=>x.id===id); if(!r) return; const nv=prompt('Weight (lb):',String(r.v)); if(nv===null) return; const nt=prompt('Time:',r.atISO.slice(0,16)); if(nt===null) return
    const at=new Date(nt); if(isNaN(at.getTime())) return alert('Invalid date/time'); const val=parseFloat(nv); if(!Number.isFinite(val)) return alert('Invalid weight')
    const next=entries.map(x=>x.id===id?{...x,v:val,atISO:at.toISOString()}:x).sort((a,b)=>new Date(a.atISO)-new Date(b.atISO)); setEntries(next); save('weights',next) }
  function delEntry(id){ if(!confirm('Delete this entry?')) return; const next=entries.filter(x=>x.id!==id); setEntries(next); save('weights',next) }

  function toCSV(rows,headers){ const esc=v=>{if(v==null)return''; const s=String(v); return /[\",\\n]/.test(s)?'\"'+s.replace(/\"/g,'\"\"')+'\"':s }; const head=headers.map(h=>esc(h.label)).join(','); const body=rows.map(r=>headers.map(h=>esc(h.get(r))).join(',')).join('\\n'); return head+'\\n'+body }
  function exportCSV(){ const csv=toCSV(entries,[{label:'id',get:r=>r.id},{label:'weight_lb',get:r=>r.v},{label:'time_iso',get:r=>r.atISO}]); const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='weights.csv'; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url) }
  function parseCSV(text){ const rows=[]; let i=0,field='',row=[],inQ=false; const pf=()=>{row.push(field);field=''}, pr=()=>{rows.push(row);row=[]}
    while(i<text.length){ const c=text[i]; if(inQ){ if(c==='\"'){ if(text[i+1]==='\"'){field+='\"';i+=2;continue} inQ=false; i++; continue } field+=c; i++; continue }
      if(c==='\"'){ inQ=true; i++; continue } if(c===','){ pf(); i++; continue } if(c==='\r'){ i++; continue } if(c==='\n'){ pf(); pr(); i++; continue } field+=c; i++ }
    pf(); if(row.length) pr(); if(rows.length===0) return {headers:[],records:[]}; const headers=rows[0].map(h=>h.trim()); const records=rows.slice(1).filter(r=>r.length&&r.some(x=>x.trim()!==''))
      .map(r=>{const o={}; headers.forEach((h,idx)=>o[h]=r[idx]?.trim()??''); return o}); return {headers,records} }
  function handleImport(e){ const file=e.target.files?.[0]; if(!file) return; const reader=new FileReader(); reader.onload=()=>{
      try{ const {headers,records}=parseCSV(reader.result); const need=['id','weight_lb','time_iso']; const ok=need.every(h=>headers.includes(h)); if(!ok) return alert('CSV headers must include: '+need.join(', '))
        const parsed=records.map(r=>({id:r.id||crypto.randomUUID(),v:parseFloat(r.weight_lb),atISO:new Date(r.time_iso).toISOString()})).filter(x=>Number.isFinite(x.v)&&!isNaN(new Date(x.atISO).getTime()))
        const combined = replace ? parsed : dedupe([...(load('weights',[])), ...parsed]); combined.sort((a,b)=>new Date(a.atISO)-new Date(b.atISO)); save('weights',combined); setEntries(combined); alert('Imported '+parsed.length+' weights.') }
      catch(err){ alert('Import failed: '+err.message) } }; reader.readAsText(file); e.target.value='' }
  const dedupe=list=>{const seen=new Set(),out=[]; for(const x of list){ if(seen.has(x.id)) continue; seen.add(x.id); out.push(x)} return out }

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
        <input ref={importRef} type="file" accept=".csv,text/csv" onChange={handleImport} style={{display:'none'}}/>
        <button className="save" onClick={()=>importRef.current?.click()}>Import CSV</button>
        <label className="tiny" style={{display:'flex',gap:6,alignItems:'center'}}><input type="checkbox" checked={replace} onChange={e=>setReplace(e.target.checked)}/> Replace existing</label>
      </div>
    </div>
    <div style={{height:12}}/><ProfilePanel profile={profile} setProfile={setProfile}/>
    <div className="card" style={{marginTop:10}}>
      <div style={{height:180}}>
        <Line data={{labels,datasets:[{data:series,fill:true,backgroundColor:weightFill,borderColor:weightColor,borderWidth:3,pointRadius:3,pointBackgroundColor:weightColor,tension:.35}]}} options={{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{grid:{color:'rgba(127,127,127,.25)'},ticks:{color:'#9ca3af',maxRotation:0,autoSkip:true}},y:{grid:{color:'rgba(127,127,127,.25)'},ticks:{color:'#9ca3af'},beginAtZero:false}},elements:{point:{radius:3}}}}/>
      </div>
    </div>
    <div className="list" style={{marginTop:10}}>{entries.slice().reverse().map(r=>(<div className="list-item" key={r.id}><div><div style={{fontWeight:700}}>{r.v} lb</div><div className="tiny">{new Date(r.atISO).toLocaleString()}</div></div><div style={{display:'flex',gap:8}}><button className="save" onClick={()=>edit(r.id)}>Edit</button><button className="del" onClick={()=>delEntry(r.id)}>Delete</button></div></div>))}{entries.length===0&&<div className="tiny">No entries yet.</div>}</div>
  </div>)
}

function ProfilePanel({profile,setProfile}){
  const bmi=useMemo(()=>{const last=load('weights',[]).slice(-1)[0]?.v; if(!last||!profile.heightIn) return null; const kg=last*0.45359237,m=profile.heightIn*0.0254; return Math.round((kg/(m*m))*10)/10},[profile.heightIn,JSON.stringify(load('weights',[]))])
  return(<div className="row">
    <div><div className="label">Sex</div><select className="input" value={profile.sex} onChange={e=>{const v=e.target.value; const next={...profile,sex:v}; setProfile(next); save('profile',next)}}><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></select></div>
    <div><div className="label">Height (inches)</div><input className="input" type="number" min="36" max="96" step="0.5" value={profile.heightIn} onChange={e=>{const v=parseFloat(e.target.value); const next={...profile,heightIn:v}; setProfile(next); save('profile',next)}}/></div>
    <div style={{marginLeft:'auto',alignSelf:'end',fontWeight:700}}>BMI: {bmi ?? '—'}</div>
  </div>)
}

// Calculator
function Calculator(){
  const [desiredMg,setDesiredMg]=useState(()=>load('calc_draft',{mg:''}).mg)
  const [vialMl,setVialMl]=useState(()=>load('calc_draft',{ml:''}).ml)
  const [conc,setConc]=useState(()=>load('calc_draft',{conc:''}).conc) // mg per mL
  useEffect(()=>save('calc_draft',{mg:desiredMg,ml:vialMl,conc}),[desiredMg,vialMl,conc])

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

// Realistic Syringe
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

      {/* finger flange */}
      <circle cx={barrelX+barrelW+40} cy={barrelY+barrelH/2} r={flangeR} fill="url(#glass)" stroke="rgba(255,255,255,.35)"/>
      {/* plunger rod */}
      <rect x={barrelX+barrelW+8} y={barrelY+barrelH/2-3} width="26" height="6" rx="3" fill="#cbd5e1" stroke="rgba(0,0,0,.1)"/>

      {/* needle left with bevel */}
      <g filter="url(#shadow)">
        <rect x={barrelX-needleLen} y={barrelY+barrelH/2-2} width={needleLen} height="4" fill="#9ca3af"/>
        <polygon points={`${barrelX-needleLen-6},${barrelY+barrelH/2} ${barrelX-needleLen},${barrelY+barrelH/2-2} ${barrelX-needleLen},${barrelY+barrelH/2+2}`} fill="#9ca3af"/>
      </g>

      {/* glass barrel */}
      <rect x={barrelX} y={barrelY} width={barrelW} height={barrelH} rx="8" ry="8" fill="url(#glass)" stroke="rgba(255,255,255,.35)"/>
      {/* liquid fill */}
      <rect x={barrelX} y={barrelY} width={barrelW*fillPct} height={barrelH} rx="8" ry="8" fill="url(#liquid)" filter="url(#glow)"/>
      {/* plunger rubber */}
      <rect x={barrelX+barrelW*fillPct-6} y={barrelY+2} width="12" height={barrelH-4} rx="4" fill="url(#rubber)"/>

      {/* ticks */}
      {Array.from({length:51}).map((_,i)=>{
        const unit=i*2; const x=barrelX + (barrelW*(unit/100)); let h=5; let stroke='rgba(255,255,255,.45)';
        if(unit%10===0){h=14; stroke='rgba(255,255,255,.85)'} else if(unit%5===0){h=9; stroke='rgba(255,255,255,.65)'}
        return <line key={i} x1={x} x2={x} y1={barrelY+barrelH} y2={barrelY+barrelH+h} stroke={stroke}/>
      })}
      {[0,10,20,30,40,50,60,70,80,90,100].map((t,i)=>{
        const x=barrelX + (barrelW*(t/100))
        return <text key={i} x={x} y={barrelY+barrelH+24} fontSize="10" textAnchor="middle" fill={textColor}>{t}</text>
      })}

      {/* label */}
      <text x={barrelX+barrelW*fillPct} y={barrelY-10} fontSize="13" fontWeight="900" textAnchor="middle" fill={textColor} stroke="rgba(0,0,0,.45)" strokeWidth="0.7">{fillLabel}</text>
    </svg>
  )
}

// Realistic Vial
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

      {/* cap */}
      <rect x={bodyX-((neckW-bodyW)/2)} y={bodyY-capH} width={neckW} height={capH} rx="3" fill="url(#cap)" filter="url(#vShadow)"/>
      {/* neck */}
      <rect x={bodyX+(bodyW-neckW)/2} y={bodyY-neckH} width={neckW} height={neckH} rx="3" fill="url(#glassV)" stroke="rgba(255,255,255,.35)"/>
      {/* body glass */}
      <rect x={bodyX} y={bodyY} width={bodyW} height={bodyH} rx="10" ry="10" fill="url(#glassV)" stroke="rgba(255,255,255,.35)"/>
      
      {/* liquid */}
      { T!=null && (
        <g>
          {(() => {
            const h = bodyH * (1-pct)
            const y = bodyY + bodyH - h
            return <rect x={bodyX} y={y} width={bodyW} height={h} rx="10" ry="10" fill="url(#liquidV)"/>
          })()}
          {(() => {
            const h = bodyH * (1-pct)
            const y = bodyY + bodyH - h
            const mx = bodyX + bodyW/2
            return <path d={`M ${bodyX} ${y} Q ${mx} ${y-6} ${bodyX+bodyW} ${y}`} fill="rgba(255,255,255,.25)"/>
          })()}
        </g>
      )}

      {/* side ticks every 0.5 mL */}
      { T!=null && Array.from({length: Math.floor(T*2)+1}).map((_,i)=>{
          const frac = i/(T*2)
          const y = bodyY + bodyH - bodyH*frac
          const len = (i%2===0) ? 10 : 6
          const val = (i/2).toFixed(1)
          return <g key={i}>
            <line x1={bodyX+bodyW+4} x2={bodyX+bodyW+4+len} y1={y} y2={y} stroke="rgba(255,255,255,.6)"/>
            {i%2===0 && <text x={bodyX+bodyW+4+len+2} y={y+3} fontSize="9" fill="var(--text)">{val}</text>}
          </g>
      })}

      <text x={W/2} y={bodyY+bodyH+18} textAnchor="middle" fontSize="11" fill="var(--text)">{labelText}</text>
    </svg>
  )
}

export { }
