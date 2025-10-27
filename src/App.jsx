import { useEffect, useMemo, useState } from 'react';

// ---- v7 server-side storage helpers ----
async function apiLoad(key, fallback){
  try { const r = await fetch(`/api/${key}`); if(!r.ok) return fallback; return await r.json(); }
  catch { return fallback; }
}
async function apiSave(key, data, onSync){
  try {
    onSync?.('syncing');
    const r = await fetch(`/api/${key}`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(data) });
    if(!r.ok) throw new Error('bad status');
    onSync?.('ok'); setTimeout(()=>onSync?.('idle'), 1000);
  } catch(e){
    console.error(e); onSync?.('error'); setTimeout(()=>onSync?.('idle'), 2000);
  }
}

const DEFAULT_MEDS = [{id:'m1',name:'Peptide A',everyDays:7, halfLifeHours:24, ka:1.0}];
const DEFAULT_SHOTS = [];
const DEFAULT_WEIGHTS = [];
const DEFAULT_PROFILE = {sex:'other',heightIn:70};

// chart helpers
const endOfDay = d => { const x = new Date(d); x.setHours(23,59,59,999); return x }
const daysBack = n => { const out = []; const today = new Date(); for (let i=n-1;i>=0;i--){ const d=new Date(today); d.setDate(today.getDate()-i); out.push(d) } return out }
const stepAmount = (shot, med, t) => { const dt = (t - new Date(shot.atISO)) / 36e5; if (dt < 0) return 0; const half = parseFloat(med.halfLifeHours)||24; return shot.dose * Math.pow(0.5, dt / half) }
const pkAmount = (shot, med, t) => {
  const dt = (t - new Date(shot.atISO)) / 36e5; if (dt < 0) return 0;
  const ka = parseFloat(med.ka)||1.0;
  const half = parseFloat(med.halfLifeHours)||24;
  const ke = Math.log(2)/half;
  if (ka === ke) return 0;
  return shot.dose * (ka/(ka - ke)) * (Math.exp(-ke*dt) - Math.exp(-ka*dt));
}

export default function App(){
  const [sync,setSync] = useState('idle');
  const [screen,setScreen] = useState('home');

  const [meds,setMeds] = useState(DEFAULT_MEDS);
  const [shots,setShots] = useState(DEFAULT_SHOTS);
  const [weights,setWeights] = useState(DEFAULT_WEIGHTS);
  const [profile,setProfile] = useState(DEFAULT_PROFILE);

  useEffect(()=>{(async()=>{
    setMeds(await apiLoad('meds', DEFAULT_MEDS));
    setShots(await apiLoad('shots', DEFAULT_SHOTS));
    setWeights(await apiLoad('weights', DEFAULT_WEIGHTS));
    setProfile(await apiLoad('profile', DEFAULT_PROFILE));
  })()},[]);

  const saveWithSync = (k,d)=>apiSave(k,d,setSync);

  return (<div className="container">
    <div className="header">
      <div className="brand">
        <img src="/src/assets/logo-dark.svg" alt="PepTrackr" height="22"/>
        <div style={{fontSize:18}}>PepTrackr</div>
        <span className={`sync-dot ${sync}`} title={sync==="ok"?"Server Online":sync==="syncing"?"Syncing…":sync==="error"?"Error":"Idle"}></span>
        <div className="tiny" style={{marginLeft:8, opacity:.7}}>v7.0 (Server‑Synced)</div>
      </div>
    </div>
    <div className="nav">
      {['home','shots','weight','calc','settings'].map(k=>(
        <button key={k} className={screen===k?'active':''} onClick={()=>setScreen(k)}>{k[0].toUpperCase()+k.slice(1)}</button>
      ))}
    </div>

    {screen==='home' && <Home meds={meds} shots={shots} weights={weights}/>}
    {screen==='shots' && <Shot meds={meds} shots={shots} setShots={setShots} save={saveWithSync}/>}
    {screen==='weight' && <Weight weights={weights} setWeights={setWeights} save={saveWithSync}/>}
    {screen==='calc' && <Calculator/>}
    {screen==='settings' && <Settings meds={meds} setMeds={setMeds} profile={profile} setProfile={setProfile} save={saveWithSync}/>}
  </div>)
}

function Home({meds,shots,weights}){
  // chart top
  return (<>
    <div className="card">
      <h3 style={{marginTop:0, marginBottom:8}}>PK / Step (7d)</h3>
      <MiniChart meds={meds} shots={shots}/>
    </div>
    <div className="row">
      {twoUpcoming(meds, shots).map(x=>(
        <div key={x.med.id} className="card" style={{flex:'1 1 0%'}}>
          <Gauge med={x.med} next={x.next}/>
        </div>
      ))}
    </div>
    <HomeWeightChart weights={weights}/>
    <HomeBMI weights={weights}/>
  </>)
}

function twoUpcoming(meds, shots){
  const nextForMed = (med) => {
    const days = parseInt(med.everyDays)||7;
    const last = [...shots].filter(s=>s.medId===med.id).sort((a,b)=>new Date(b.atISO)-new Date(a.atISO))[0];
    if(!last) return null;
    return new Date(new Date(last.atISO).getTime() + days*24*3600e3);
  };
  return meds.map(m=>({med:m,next:nextForMed(m)}))
             .filter(x=>x.next && x.next>new Date())
             .sort((a,b)=>a.next-b.next).slice(0,2);
}

// Simple canvas chart for pk and step
function MiniChart({meds,shots}){
  const ref = useState(null)[0];
  useEffect(()=>{
    const c = document.createElement('canvas');
    c.width = Math.min(780, window.innerWidth-40); c.height=160;
    const ctx = c.getContext('2d');
    ctx.fillStyle='#0e171d'; ctx.fillRect(0,0,c.width,c.height);
    const days = daysBack(7);
    const xs = days.map((d,i)=>i*(c.width-20)/(days.length-1)+10);
    function series(calc){
      return days.map((d,i)=>{
        const t = endOfDay(d);
        return shots.reduce((acc,s)=>{
          const med = meds.find(m=>m.id===s.medId); if(!med) return acc;
          return acc + calc(s, med, t);
        },0);
      });
    }
    const pk = series(pkAmount);
    const st = series(stepAmount);
    const maxV = Math.max(1, ...pk, ...st);
    function plot(vals, stroke){
      ctx.beginPath(); ctx.strokeStyle = stroke; ctx.lineWidth=2;
      vals.forEach((v,i)=>{
        const y = c.height - 10 - (v/maxV)*(c.height-30);
        const x = xs[i];
        i?ctx.lineTo(x,y):ctx.moveTo(x,y);
      });
      ctx.stroke();
    }
    plot(pk, '#00c2ff'); plot(st, '#00d084');
    const host = document.getElementById('mini-chart-host');
    host.innerHTML=''; host.appendChild(c);
  }, [JSON.stringify(meds), JSON.stringify(shots)]);
  return <div id="mini-chart-host"></div>
}

function Gauge({med, next}){
  const now = new Date();
  const ms = next - now;
  const hours = Math.max(0, Math.floor(ms/36e5));
  const days = Math.floor(hours/24);
  const remH = hours % 24;
  return (<div>
    <div style={{fontWeight:700, marginBottom:4}}>{med.name}</div>
    <div className="tiny" style={{marginBottom:8}}>Next in {days}d {remH}h</div>
    <div style={{width:140,height:140, margin:'0 auto', position:'relative'}}>
      <svg viewBox="0 0 100 100" width="140" height="140">
        <circle cx="50" cy="50" r="42" fill="none" stroke="#17323f" strokeWidth="10"/>
        <circle cx="50" cy="50" r="42" fill="none" stroke="var(--cyan)" strokeWidth="10"
          strokeDasharray="263" strokeDashoffset={String(Math.max(0, Math.min(263, 263 - (263*(hours/(med.everyDays*24))))))}
          strokeLinecap="round" transform="rotate(-90 50 50)"/>
        <text x="50" y="54" textAnchor="middle" fontSize="12" fill="#e8f9ff">{days}d {remH}h</text>
      </svg>
    </div>
  </div>)
}

function HomeWeightChart({weights}){
  const entries = weights.map(w=>({t:new Date(w.t), v:parseFloat(w.v)})).sort((a,b)=>a.t-b.t);
  const last = entries.slice(-1)[0];
  return (<div className="card">
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:8}}>
      <h3 style={{margin:0}}>Weight <span className="tiny" style={{fontWeight:400}}>— {last? `${last.v} lb`:'—'}</span></h3>
      <div className="tiny">All / 30d / 7d</div>
    </div>
    <div id="w-chart" style={{height:160, background:'#0e171d', border:'1px solid #17323f', borderRadius:10}}></div>
  </div>)
}

function HomeBMI({weights}){
  const profile = DEFAULT_PROFILE; // height set in Settings
  const last = weights.slice(-1)[0];
  const hM = (profile.heightIn||70) * 0.0254;
  const wKg = last ? parseFloat(last.v)*0.453592 : null;
  const bmi = (wKg && hM)? (wKg/(hM*hM)) : null;

  const segments=[{label:'Under',range:[0,18.5],var:'--under'},
                  {label:'Normal',range:[18.5,25],var:'--ok'},
                  {label:'Over',range:[25,30],var:'--warn'},
                  {label:'Obese',range:[30,40],var:'--bad'}];
  const maxBmi=40; const pct=bmi?Math.max(0,Math.min(1,bmi/maxBmi)):0;

  return (<div className="card">
    <h3 style={{marginTop:0}}>BMI</h3>
    <div className="bmi-bar">
      {segments.map((s,i)=>{
        const width=((s.range[1]-s.range[0])/maxBmi)*100+'%';
        return <div key={i} className="bmi-seg" style={{width, background:`var(${s.var})`}}/>;
      })}
      <div className="bmi-marker" style={{left:(pct*100)+'%'}}/>
    </div>
    <div className="row" style={{justifyContent:'space-between',marginTop:6}}>
      <span className="tiny">0</span><span className="tiny">18.5</span><span className="tiny">25</span><span className="tiny">30</span><span className="tiny">40</span>
    </div>
    <div style={{display:'flex',gap:0,marginTop:4}}>
      {segments.map((s,i)=>{ const width=((s.range[1]-s.range[0])/maxBmi)*100+'%'; return <div key={i} style={{width,textAlign:'center'}}><div className="tiny" style={{opacity:.9}}>{s.label}</div></div>})}
    </div>
    <div style={{marginTop:8,fontWeight:700}}>{bmi?`BMI: ${Math.round(bmi*10)/10}`:'Add height & weight to see BMI'}</div>
  </div>)
}

function Shot({meds,shots,setShots,save}){
  const [medId,setMedId] = useState(meds[0]?.id||'');
  const [dose,setDose] = useState('10');
  const [timeISO,setTimeISO] = useState(new Date().toISOString().slice(0,16));
  const [editingId,setEditingId] = useState(null);
  const [page,setPage] = useState(0);

  function add(){
    if(!medId) return;
    const d = parseFloat(dose); if(!Number.isFinite(d)||d<=0) return;
    const at = new Date(timeISO); if(isNaN(at.getTime())) return;

    if(editingId){
      const n = shots.map(s=>s.id===editingId?{...s,medId,dose:d,atISO:at.toISOString()}:s)
                     .sort((a,b)=>new Date(b.atISO)-new Date(a.atISO));
      setShots(n); save('shots', n); setEditingId(null);
    } else {
      const s = {id:crypto.randomUUID(), medId, dose:d, atISO:at.toISOString()};
      const n = [...shots, s].sort((a,b)=>new Date(b.atISO)-new Date(a.atISO));
      setShots(n); save('shots', n);
    }

    const reset = {dose:'10', timeISO:new Date().toISOString().slice(0,16)};
    setDose(reset.dose); setTimeISO(reset.timeISO);
  }

  return (<div className="card">
    <h3 style={{marginTop:0}}>Add Shot</h3>
    <div className="row">
      <select value={medId} onChange={e=>setMedId(e.target.value)}>{meds.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select>
      <input value={dose} onChange={e=>setDose(e.target.value)} placeholder="Dose (U)"/>
      <input value={timeISO} onChange={e=>setTimeISO(e.target.value)} type="datetime-local"/>
      <button className="save" onClick={add}>{editingId? 'Update Shot':'Save Shot'}</button>
    </div>

    <div style={{height:16}}/>
    <h3 style={{margin:'8px 0'}}>Recent Shots</h3>
    {shots.length===0 ? <div className="tiny">No shots logged yet.</div> : (
      <>
        {(() => {
          const sorted=[...shots].sort((a,b)=>new Date(b.atISO)-new Date(a.atISO));
          const start=page*10, end=start+10;
          const pageItems=sorted.slice(start,end);
          const medName = id => meds.find(m=>m.id===id)?.name || 'Unknown';
          function del(id){
            if(!confirm('Delete this entry?')) return;
            const n=shots.filter(s=>s.id!==id); setShots(n); save('shots',n);
          }
          function edit(id){
            const s=shots.find(x=>x.id===id); if(!s) return;
            setEditingId(id); setMedId(s.medId); setDose(String(s.dose)); setTimeISO(new Date(s.atISO).toISOString().slice(0,16));
            window.scrollTo({top:0,behavior:'smooth'});
          }
          return (
            <div>
              {pageItems.map(s=>(
                <div key={s.id} className="list-item" style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:8}}>
                  <div>
                    <div style={{fontWeight:600}}>{medName(s.medId)}</div>
                    <div className="tiny">{new Date(s.atISO).toLocaleString()} • {s.dose} U</div>
                  </div>
                  <div style={{display:'flex',gap:6}}>
                    <button className="save" onClick={()=>edit(s.id)}>Edit</button>
                    <button className="danger" onClick={()=>del(s.id)}>Delete</button>
                  </div>
                </div>
              ))}
              <div className="row" style={{justifyContent:'space-between',marginTop:8}}>
                <button disabled={page===0} onClick={()=>setPage(p=>Math.max(0,p-1))}>Previous</button>
                <div className="tiny">Page {page+1} of {Math.max(1, Math.ceil(sorted.length/10))}</div>
                <button disabled={(page+1)*10>=sorted.length} onClick={()=>setPage(p=>p+1)}>Next</button>
              </div>
            </div>
          )
        })()}
      </>
    )}
  </div>)
}

function Weight({weights,setWeights,save}){
  const [value,setValue] = useState('');
  const add = ()=>{
    const v = parseFloat(value); if(!Number.isFinite(v)) return;
    const n = [...weights, {t:new Date().toISOString(), v}];
    setWeights(n); save('weights', n); setValue('');
  }
  return (<div className="card">
    <h3 style={{marginTop:0}}>Log Weight</h3>
    <div className="row">
      <input value={value} onChange={e=>setValue(e.target.value)} placeholder="lb"/>
      <button className="save" onClick={add}>Save</button>
    </div>
  </div>)
}

function Settings({meds,setMeds,profile,setProfile,save}){
  const [name,setName] = useState('');
  const [days,setDays] = useState('7');
  const addMed = ()=>{
    if(!name) return;
    const m = {id:crypto.randomUUID(), name, everyDays:parseInt(days)||7, halfLifeHours:24, ka:1};
    const n = [...meds, m]; setMeds(n); save('meds',n); setName(''); setDays('7');
  }
  return (<div className="card">
    <h3 style={{marginTop:0}}>Medications</h3>
    <div className="row">
      <input value={name} onChange={e=>setName(e.target.value)} placeholder="Name"/>
      <input value={days} onChange={e=>setDays(e.target.value)} placeholder="Every (days)"/>
      <button className="save" onClick={addMed}>Add</button>
    </div>
  </div>)
}

function Calculator(){
  // simple syringe visual with needle-side fill
  const [pct, setPct] = useState(0.4);
  const barrelX=20, barrelY=30, barrelW=160, barrelH=20;
  return (<div className="card">
    <h3 style={{marginTop:0}}>Calculator</h3>
    <svg viewBox="0 0 220 80" width="100%" height="120">
      <rect x="10" y="35" width="40" height="10" rx="2" fill="#d7e9f3" />
      <rect x="50" y="30" width="150" height="20" rx="6" fill="#d7e9f3" stroke="#17323f"/>
      {/* liquid (needle side / right) */}
      <rect x={50 + 150*(1-pct)} y="30" width={150*pct} height="20" rx="6" fill="#00c2ff" opacity="0.8" />
      <line x1="200" y1="30" x2="210" y2="30" stroke="#d7e9f3" strokeWidth="2"/>
      <text x="110" y="70" textAnchor="middle" fontSize="12">{Math.round(pct*100)}%</text>
    </svg>
    <input type="range" min="0" max="1" step="0.01" value={pct} onChange={e=>setPct(parseFloat(e.target.value))}/>
  </div>)
}
