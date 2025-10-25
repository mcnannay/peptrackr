import React, { useEffect, useState } from 'react'
import { Line } from 'react-chartjs-2'
import { Chart as ChartJS, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend } from 'chart.js'
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

const defaultMeds = [
  { id:'tirze', name:'Tirzepatide', color:'#7dd3fc', halfLifeDays:5.5, cadenceDays:7, enabled:true },
  { id:'retat', name:'Retatrutide', color:'#a78bfa', halfLifeDays:9.0, cadenceDays:7, enabled:true }
]
const defaultUser = { id:'u1', name:'You', sex:'M', heightCm:180 }

function SyringeGauge({ units=25 }){
  const total=100
  const u = clamp(units,0,total)
  const fillPct = u/total
  return (
    <svg viewBox="0 0 320 120" width="100%" aria-label="syringe gauge">
      <defs>
        <linearGradient id="glass" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#ffffff22"/><stop offset="50%" stopColor="#ffffff11"/><stop offset="100%" stopColor="#00000022"/>
        </linearGradient>
        <filter id="glow"><feDropShadow dx="0" dy="0" stdDeviation="1" floodColor="#ffffffaa"/></filter>
      </defs>
      <rect x="40" y="30" width="240" height="30" rx="8" fill="url(#glass)" stroke="#aab" strokeOpacity="0.4"/>
      <rect x="40" y="42" width={240*fillPct} height="6" rx="3" fill="#60a5fa" filter="url(#glow)"/>
      {[...Array(11)].map((_,i)=>{
        const x = 40 + i*24
        const h = i%2===0?14:8
        return <line key={i} x1={x} y1={26} x2={x} y2={26+h} stroke="#e5e7eb" strokeOpacity="0.8" strokeWidth="1"/>
      })}
      <rect x="280" y="43" width="24" height="4" rx="2" fill="#9ca3af"/>
      <polygon points="304,45 318,45 318,47 304,47" fill="#9ca3af"/>
      <text x="160" y="85" textAnchor="middle" fill="#e5e7eb" fontWeight="700">{u} u</text>
    </svg>
  )
}

function VialVertical({ drawUnits=25, totalUnits=100 }){
  const used = clamp(drawUnits,0,totalUnits)
  const remain = totalUnits - used
  const h = 160
  const usedH = (used/totalUnits)*h
  return (
    <svg viewBox="0 0 80 210" width="60" aria-label="vial level">
      <defs>
        <linearGradient id="glass2" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#ffffff33"/><stop offset="100%" stopColor="#00000033"/>
        </linearGradient>
      </defs>
      <rect x="20" y="10" width="40" height="180" rx="10" fill="url(#glass2)" stroke="#aab" strokeOpacity="0.4"/>
      <rect x="20" y={10+(h-usedH)} width="40" height={usedH} rx="10" fill="#60a5fa" opacity="0.8"/>
      <rect x="16" y="2" width="48" height="10" rx="3" fill="#9ca3af"/>
      <text x="40" y="200" textAnchor="middle" fill="#e5e7eb" fontSize="12">{remain} u left</text>
    </svg>
  )
}

function BMILinear({ bmi=25 }){
  const pos = Math.max(0, Math.min(100, (bmi/40)*100))
  return (
    <div className="card">
      <div className="row" style={{justifyContent:'space-between',alignItems:'center'}}>
        <div><strong>BMI:</strong> {bmi.toFixed(1)}</div>
        <div className="small">Under 18.5 | 18.5–24.9 | 25–29.9 | 30+</div>
      </div>
      <div className="bmi-bar" style={{marginTop:8}}>
        <div className="bmi-seg" style={{width:'18.5%', background:'#60a5fa'}}/>
        <div className="bmi-seg" style={{width:'31.5%', background:'#10b981'}}/>
        <div className="bmi-seg" style={{width:'12.5%', background:'#f59e0b'}}/>
        <div className="bmi-seg" style={{width:'37.5%', background:'#ef4444'}}/>
        <div className="bmi-marker" style={{left: `calc(${pos}% - 1px)`}}/>
      </div>
    </div>
  )
}

function UpcomingShotGauge({ daysLeft=3, color='#60a5fa', label='Next dose' }){
  const total=14
  const pct = Math.max(0,Math.min(1,1 - (daysLeft/total)))
  const angle = pct*2*Math.PI
  const cx=40, cy=40, r=32
  const x = cx + r*Math.cos(-Math.PI/2 + angle)
  const y = cy + r*Math.sin(-Math.PI/2 + angle)
  const large = angle > Math.PI ? 1 : 0
  const d = `M ${cx} ${cy-r} A ${r} ${r} 0 ${large} 1 ${x} ${y}`
  return (
    <svg viewBox="0 0 100 100" width="86">
      <circle cx={cx} cy={cy} r={r} stroke="#334155" strokeWidth="10" fill="none"/>
      <path d={d} stroke={color} strokeWidth="10" fill="none" strokeLinecap="round"/>
      <circle cx={cx} cy={cy} r="24" fill={color} opacity="0.15"/>
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fontWeight="800" fill="#e5e7eb">{daysLeft}d</text>
      <text x={cx} y={cy+22} textAnchor="middle" fontSize="10" fill="#e5e7eb">{label}</text>
    </svg>
  )
}

function WeightChart({ points }){
  const labels = points.map(p=>p.date)
  const data = {
    labels,
    datasets:[{ label:'Weight', data: points.map(p=>p.kg), borderWidth:3, tension:0.3 }]
  }
  const options = {
    responsive:true,
    plugins:{ legend:{ display:false } },
    scales: { x:{ ticks:{ color:'#9ca3af'}}, y:{ ticks:{ color:'#9ca3af'}} }
  }
  return <div className="card chart-card"><Line data={data} options={options}/></div>
}

function MedChart({ meds, doses }){
  const [view,setView] = useState('step')
  const today = new Date()
  const start = new Date(today); start.setDate(start.getDate()-28)
  const days = 56
  const series = meds.map(m=>{
    const ds = doses.filter(d=>d.medId===m.id)
    const vals = remainingFromDoses(ds, m.halfLifeDays||7, start, days)
    return { label:m.name, color:m.color||'#60a5fa', vals }
  })
  const labels = series.length? series[0].vals.map(v=>v.date) : []
  const datasets = series.map(s=>({
    label:s.label, data:s.vals.map(v=>v.mg), borderColor:s.color, borderWidth:3, tension:(view==='pk'?0.4:0), stepped:(view==='step')
  }))
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
  const [user] = useState(defaultUser)
  const [meds] = useState(defaultMeds)
  const [doses] = useState([
    { medId:'tirze', date: fmtDate(new Date(Date.now()-14*864e5)), mg:5 },
    { medId:'tirze', date: fmtDate(new Date(Date.now()-7*864e5)), mg:5 },
    { medId:'tirze', date: fmtDate(new Date(Date.now()-0*864e5)), mg:5 },
    { medId:'retat', date: fmtDate(new Date(Date.now()-10*864e5)), mg:2.5 }
  ])
  const [weights] = useState([
    { date: fmtDate(new Date(Date.now()-27*864e5)), kg:100 },
    { date: fmtDate(new Date(Date.now()-20*864e5)), kg:99 },
    { date: fmtDate(new Date(Date.now()-14*864e5)), kg:98.5 },
    { date: fmtDate(new Date(Date.now()-7*864e5)),  kg:98 },
    { date: fmtDate(new Date(Date.now()-0*864e5)),  kg:97.8 }
  ])
  const heightM = (user.heightCm||180)/100
  const lastKg = weights[weights.length-1]?.kg || 90
  const bmi = lastKg/(heightM*heightM)
  if (!ready){ return <div className="splash"><div className="splash-logo">PepTrackr</div></div> }
  return (
    <div className="container">
      <div className="header">
        <div className="brand"><div className="logo">PT</div> PepTrackr <span className="badge">{user.name}</span></div>
        <div className="small">v17.6</div>
      </div>
      <MedChart meds={meds} doses={doses} />
      <BMILinear bmi={bmi}/>
      <div className="card">
        <div className="row" style={{alignItems:'center',justifyContent:'space-between'}}>
          <div>
            <div style={{fontWeight:700, marginBottom:6}}>Next shots</div>
            <div className="small">Color-coded per medication</div>
          </div>
          <div className="row" style={{gap:12}}>
            <UpcomingShotGauge daysLeft={3} color={meds[0].color} label={meds[0].name}/>
            <UpcomingShotGauge daysLeft={6} color={meds[1].color} label={meds[1].name}/>
          </div>
        </div>
      </div>
      <WeightChart points={weights} />
      <div className="card">
        <div style={{fontWeight:700, marginBottom:6}}>Dose calculator</div>
        <div className="row" style={{alignItems:'center',gap:16}}>
          <SyringeGauge units={25}/>
          <VialVertical drawUnits={25} totalUnits={100}/>
        </div>
      </div>
      <div className="bottom-bar">
        <button className="icon-btn active">Home</button>
        <button className="icon-btn">Settings</button>
        <button className="icon-btn">Shot</button>
        <button className="icon-btn">Weight</button>
        <button className="icon-btn">Calc</button>
      </div>
    </div>
  )
}
