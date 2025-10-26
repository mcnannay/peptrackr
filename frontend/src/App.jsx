import React, { useEffect, useMemo, useState } from 'react'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend
} from 'chart.js'
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend)

const VERSION = (import.meta?.env?.VITE_APP_VERSION) || 'dev'

const c = {
  bg: '#0b0b0c',
  card: '#111113',
  border: '#27272a',
  text: '#e5e7eb',
  muted: '#9ca3af',
  primary: '#7c3aed',
  surface: '#0f0f11'
}

// Simple icon button (dark-themed, no white wash-out)
function NavIcon({ label, active, onClick, children }) {
  return (
    <button onClick={onClick} aria-label={label}
      style={{
        flex: 1,
        display:'flex', flexDirection:'column', alignItems:'center', gap:6,
        padding:'8px 0', background:'transparent', border:'none', cursor:'pointer',
        color: active ? '#fff' : c.muted
      }}>
      <div style={{
        width:40, height:40, display:'grid', placeItems:'center',
        borderRadius:12,
        background: active ? 'linear-gradient(135deg,#1f2937,#111827)' : '#0f0f11',
        border: `1px solid ${active ? '#4f46e5' : c.border}`,
        boxShadow: active ? '0 0 0 2px rgba(79,70,229,.35) inset' : 'none'
      }}>{children}</div>
      <div style={{fontSize:12}}>{label}</div>
    </button>
  )
}

// PK/Step toggle styled like nav
function ToggleChip({ value, onChange }){
  const opt = ['PK','Step']
  return (
    <div style={{display:'inline-flex', gap:8, background: c.surface, border:`1px solid ${c.border}`, padding:4, borderRadius:12}}>
      {opt.map(k=>{
        const active = (value===k)
        return (
          <button key={k} onClick={()=>onChange(k)}
            style={{
              all:'unset', cursor:'pointer', padding:'6px 10px', borderRadius:10,
              background: active ? '#111827' : 'transparent',
              color: active ? '#fff' : c.muted,
              border: `1px solid ${active ? '#4f46e5' : 'transparent'}`,
              boxShadow: active ? '0 0 0 2px rgba(79,70,229,.35)' : 'none',
              fontSize:12
            }}>{k}</button>
        )
      })}
    </div>
  )
}

async function api(path, opts){
  const r = await fetch(path.startsWith('/api')?path:`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts
  })
  if(!r.ok){ const t = await r.text(); throw new Error(t) }
  return r.json()
}

export default function App(){
  const [tab,setTab] = useState('home')
  const [theme,setTheme] = useState('dark')
  const [state,setState] = useState({ settings:null, users:[], meds:[] })
  const [selectedUser,setSelectedUser] = useState(null)
  const [pkMode,setPkMode] = useState('PK')
  const [shotRepeat,setShotRepeat] = useState(1)

  async function refresh(){
    const s = await api('/state')
    setState(s)
    setTheme(s.settings?.theme ?? 'dark')
    if(s.settings?.currentUserId) setSelectedUser(s.settings.currentUserId)
  }
  useEffect(()=>{ refresh() }, [])

  async function setAppTheme(t){
    setTheme(t)
    await api('/settings', { method:'PATCH', body: JSON.stringify({ theme:t })})
    await refresh()
  }

  async function addUser(){
    const name = prompt('User name?')
    if(!name) return
    await api('/users', { method:'POST', body: JSON.stringify({ name }) })
    await refresh()
  }

  // quick add preset with adjustable freq/absorption
  async function quickAddPreset(name){
    const freq = parseInt(prompt('Frequency days?', '7') || '7', 10)
    const absorb = parseFloat(prompt('Absorption half-life hours?', '12') || '12')
    await api('/meds/preset', { method:'POST', body: JSON.stringify({ key:name, freqDays:freq, absorptionHalfLifeHours:absorb })})
    await refresh()
  }

  function Header(){
    return (
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 14px', borderBottom:`1px solid ${c.border}`, background:c.card}}>
        <div style={{display:'flex', alignItems:'baseline', gap:10}}>
          <div style={{fontWeight:700, fontSize:18}}>PepTrackr</div>
          <div style={{fontSize:12, color:c.muted}}>v {VERSION}</div>
        </div>
        <div style={{fontSize:12, color:c.muted}}>
          {state.users.find(u=>u.id===selectedUser)?.name || 'no user'}
        </div>
      </div>
    )
  }

  function Home(){
    // simple demo data for charts
    const labels = Array.from({length:14}, (_,i)=>`D${i+1}`)
    const data = {
      labels,
      datasets: [
        { label:'Med A', data: labels.map((_,i)=> pkMode==='PK' ? Math.max(0, 100*Math.exp(-i/3)) : (i<7?100:50) ) },
        { label:'Med B', data: labels.map((_,i)=> pkMode==='PK' ? Math.max(0, 60*Math.exp(-i/5)) : (i<5?60:30) ) },
      ]
    }
    const options = { plugins:{ legend:{ labels:{ color:c.muted }}, tooltip:{ enabled:true }}, scales:{ x:{ ticks:{ color:c.muted }}, y:{ ticks:{ color:c.muted }}} }

    return (
      <div style={{padding:12, display:'grid', gap:12}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <div style={{fontSize:14, color:c.muted}}>Meds in system</div>
          <ToggleChip value={pkMode} onChange={setPkMode} />
        </div>
        <div style={{background:c.card, border:`1px solid ${c.border}`, borderRadius:12, padding:8}}>
          <Line data={data} options={options} />
        </div>

        {/* gauges placeholder */}
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
          <div style={{background:c.card, border:`1px solid ${c.border}`, borderRadius:12, padding:16}}>Next Shot Gauge</div>
          <div style={{background:c.card, border:`1px solid ${c.border}`, borderRadius:12, padding:16}}>Next Shot Gauge 2</div>
        </div>

        <div style={{background:c.card, border:`1px solid ${c.border}`, borderRadius:12, padding:8}}>
          <div style={{fontSize:14, color:c.muted, padding:'0 8px 8px'}}>Weight</div>
          <Line data={data} options={options} />
        </div>

        <div style={{background:c.card, border:`1px solid ${c.border}`, borderRadius:12, padding:12}}>BMI Gauge</div>
      </div>
    )
  }

  function Settings(){
    return (
      <div style={{padding:12, display:'grid', gap:12}}>
        <div style={{background:c.card, border:`1px solid ${c.border}`, borderRadius:12, padding:12}}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <div style={{fontWeight:600}}>Users</div>
            <button onClick={addUser} style={{padding:'6px 10px', borderRadius:8, background:c.surface, border:`1px solid ${c.border}`, color:c.text}}>Add</button>
          </div>
          <div style={{display:'flex', gap:8, marginTop:8, flexWrap:'wrap'}}>
            {state.users.map(u=>(
              <button key={u.id} onClick={async()=>{ setSelectedUser(u.id); await api('/settings',{method:'PATCH', body: JSON.stringify({ currentUserId:u.id })}); await refresh(); }}
                style={{padding:'6px 10px', borderRadius:8, background: selectedUser===u.id?'#111827':c.surface, border:`1px solid ${selectedUser===u.id?'#4f46e5':c.border}`, color:c.text}}>
                {u.name}
              </button>
            ))}
          </div>
        </div>

        <div style={{background:c.card, border:`1px solid ${c.border}`, borderRadius:12, padding:12}}>
          <div style={{fontWeight:600, marginBottom:8}}>Presets</div>
          <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
            <button onClick={()=>quickAddPreset('Retatrutide')} style={{padding:'6px 10px', borderRadius:8, background:c.surface, border:`1px solid ${c.border}`, color:c.text}}>Add Retatrutide</button>
            <button onClick={()=>quickAddPreset('Tirzepatide')} style={{padding:'6px 10px', borderRadius:8, background:c.surface, border:`1px solid ${c.border}`, color:c.text}}>Add Tirzepatide</button>
          </div>
        </div>

        <div style={{background:c.card, border:`1px solid ${c.border}`, borderRadius:12, padding:12}}>
          <div style={{fontWeight:600, marginBottom:8}}>Theme</div>
          <div style={{display:'flex', gap:8}}>
            <button onClick={()=>setAppTheme('dark')} style={{padding:'6px 10px', borderRadius:8, background: theme==='dark'?'#111827':c.surface, border:`1px solid ${theme==='dark'?'#4f46e5':c.border}`, color:c.text}}>Dark</button>
            <button onClick={()=>setAppTheme('light')} style={{padding:'6px 10px', borderRadius:8, background: theme==='light'?'#f8fafc':c.surface, border:`1px solid ${theme==='light'?'#4f46e5':c.border}`, color: theme==='light'?'#111827':c.text}}>Light</button>
          </div>
        </div>
      </div>
    )
  }

  function Shots(){
    const [dose,setDose] = useState(0)
    const [medId,setMedId] = useState(state.meds[0]?.id || '')
    const [count,setCount] = useState(1)

    useEffect(()=>{ if(state.meds.length && !medId) setMedId(state.meds[0].id) },[state.meds])

    async function add(){
      if(!selectedUser || !medId) return alert('select user & med')
      if(count>1){
        await api('/shots/bulk', { method:'POST', body: JSON.stringify({ userId:selectedUser, medId, doseMg: Number(dose), count, intervalDays: 7 })})
      }else{
        await api('/shots', { method:'POST', body: JSON.stringify({ userId:selectedUser, medId, doseMg: Number(dose) })})
      }
      alert('Saved')
    }

    return (
      <div style={{padding:12, display:'grid', gap:12}}>
        <div style={{background:c.card, border:`1px solid ${c.border}`, borderRadius:12, padding:12, display:'grid', gap:8}}>
          <div style={{display:'grid', gap:6}}>
            <label>Medication</label>
            <select value={medId} onChange={e=>setMedId(parseInt(e.target.value,10))}
              style={{padding:'8px', borderRadius:8, background:c.surface, color:c.text, border:`1px solid ${c.border}`}}>
              {state.meds.map(m=>(<option key={m.id} value={m.id}>{m.name}</option>))}
            </select>
          </div>
          <div style={{display:'grid', gap:6}}>
            <label>Dosage (mg)</label>
            <input type="number" value={dose} onChange={e=>setDose(e.target.value)} style={{padding:'8px', borderRadius:8, background:c.surface, color:c.text, border:`1px solid ${c.border}`}}/>
          </div>
          <div style={{display:'flex', gap:8, alignItems:'center'}}>
            <label>Add repeats (weeks)</label>
            <input type="number" min="1" value={count} onChange={e=>setCount(parseInt(e.target.value||'1',10))}
              style={{width:100, padding:'8px', borderRadius:8, background:c.surface, color:c.text, border:`1px solid ${c.border}`}}/>
          </div>
          <div>
            <button onClick={add} style={{padding:'8px 12px', borderRadius:10, background:'#111827', border:`1px solid #4f46e5`, color:'#fff'}}>Save</button>
          </div>
        </div>
      </div>
    )
  }

  function Weights(){
    const [kg,setKg] = useState(0)
    async function add(){
      if(!selectedUser) return alert('select user')
      await api('/weights', { method:'POST', body: JSON.stringify({ userId:selectedUser, valueKg: Number(kg) })})
      alert('Saved')
    }
    return (
      <div style={{padding:12}}>
        <div style={{background:c.card, border:`1px solid ${c.border}`, borderRadius:12, padding:12, display:'grid', gap:8}}>
          <label>Weight (kg)</label>
          <input type="number" value={kg} onChange={e=>setKg(e.target.value)} style={{padding:'8px', borderRadius:8, background:c.surface, color:c.text, border:`1px solid ${c.border}`}}/>
          <button onClick={add} style={{padding:'8px 12px', borderRadius:10, background:'#111827', border:`1px solid #4f46e5`, color:'#fff'}}>Save</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{display:'grid', gridTemplateRows:'auto 1fr auto', minHeight:'100vh', background:c.bg}}>
      <Header />
      <div>
        {tab==='home' && <Home />}
        {tab==='settings' && <Settings />}
        {tab==='shot' && <Shots />}
        {tab==='weight' && <Weights />}
        {tab==='calc' && <div style={{padding:12}}>Calculator (coming next)</div>}
      </div>

      <div style={{display:'flex', gap:8, padding:8, borderTop:`1px solid ${c.border}`, background:'#0a0a0b'}}>
        <NavIcon label="Settings" active={tab==='settings'} onClick={()=>setTab('settings')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M12 15.5a3.5 3.5 0 1 0 0-7a3.5 3.5 0 0 0 0 7Z" stroke="currentColor" strokeWidth="2"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33a1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" stroke="currentColor" strokeWidth="1.6"/>
          </svg>
        </NavIcon>

        <NavIcon label="Weight" active={tab==='weight'} onClick={()=>setTab('weight')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M4 20V10l6 6 4-4 6 6" stroke="currentColor" strokeWidth="2"/>
            <path d="M20 8h-5V3" stroke="currentColor" strokeWidth="2"/>
          </svg>
        </NavIcon>

        <NavIcon label="Home" active={tab==='home'} onClick={()=>setTab('home')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M3 9.5 12 3l9 6.5V21a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V9.5z" stroke="currentColor" strokeWidth="2"/>
          </svg>
        </NavIcon>

        <NavIcon label="Shot" active={tab==='shot'} onClick={()=>setTab('shot')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M5 12h14" stroke="currentColor" strokeWidth="2"/>
            <rect x="7" y="6" width="10" height="12" rx="2" stroke="currentColor" strokeWidth="2"/>
          </svg>
        </NavIcon>

        <NavIcon label="Calc" active={tab==='calc'} onClick={()=>setTab('calc')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <rect x="5" y="3" width="14" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
            <path d="M8 8h8M8 12h8M8 16h8" stroke="currentColor" strokeWidth="2"/>
          </svg>
        </NavIcon>
      </div>
    </div>
  )
}
