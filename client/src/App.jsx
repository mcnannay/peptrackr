import React, { useEffect, useState } from 'react'
import { fetchAll, setDoc, bulkSet, connectSocket } from './api.js'

const emptyProfile = { name:'', age:'', notes:'' }

export default function App(){
  const [theme, setTheme] = useState('light')
  const [profile, setProfile] = useState(emptyProfile)
  const [meds, setMeds] = useState([])
  const [shots, setShots] = useState([])
  const [weights, setWeights] = useState([])

  // initial fetch + live sync
  useEffect(() => {
    let socket
    let timer = null
    async function reconcile(){
      const data = await fetchAll()
      if (data.theme !== undefined) setTheme(data.theme)
      if (data.profile !== undefined) setProfile(data.profile)
      if (data.meds !== undefined) setMeds(data.meds)
      if (data.shots !== undefined) setShots(data.shots)
      if (data.weights !== undefined) setWeights(data.weights)
    }
    reconcile().catch(()=>{})
    socket = connectSocket(() => {
      if (!timer) {
        timer = setTimeout(() => { timer = null; reconcile().catch(()=>{}) }, 80)
      }
    })
    return () => { try { socket && socket.close() } catch {} }
  }, [])

  // Edits
  const [newMed, setNewMed] = useState({ name:'', dose:'' })
  async function addMed(){
    const next = [...meds, { id: crypto.randomUUID(), ...newMed }]
    setMeds(next)
    await setDoc('meds', next)
    setNewMed({ name:'', dose:'' })
  }

  const [newWeight, setNewWeight] = useState({ date:'', value:'' })
  async function addWeight(){
    const next = [...weights, { date: newWeight.date || new Date().toISOString().slice(0,10), value: Number(newWeight.value || 0) }]
    setWeights(next)
    await setDoc('weights', next)
    setNewWeight({ date:'', value:'' })
  }

  async function saveProfileNow(){
    await setDoc('profile', profile)
  }
  async function switchTheme(t){
    setTheme(t)
    await setDoc('theme', t)
  }

  async function resetAll(){
    if (!confirm('Clear ALL data on server?')) return
    await bulkSet({})
    setTheme('light'); setProfile(emptyProfile); setMeds([]); setShots([]); setWeights([])
  }

  function importJSON(e){
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const data = JSON.parse(reader.result || '{}')
        await bulkSet(data)
        if (data.theme !== undefined) setTheme(data.theme)
        if (data.profile !== undefined) setProfile(data.profile)
        if (data.meds !== undefined) setMeds(data.meds)
        if (data.shots !== undefined) setShots(data.shots)
        if (data.weights !== undefined) setWeights(data.weights)
        alert('Import done')
      } catch(e){ alert('Import failed: ' + e.message) }
    }
    reader.readAsText(file)
    e.target.value=''
  }

  async function exportJSON(){
    const data = await fetchAll()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], {type:'application/json'}))
    a.download = 'backup.json'; a.click()
  }

  return (
    <div className="card">
      <h1>PepTrackr — Postgres + WebSocket</h1>
      <div className="row">
        <label>Theme</label>
        <button className="btn" onClick={()=>switchTheme('light')}>Light</button>
        <button className="btn" onClick={()=>switchTheme('dark')}>Dark</button>
        <div style={{marginLeft:'auto'}}>
          <button className="btn" onClick={exportJSON}>Export</button>
          <label className="btn">Import
            <input type="file" accept="application/json" style={{display:'none'}} onChange={importJSON} />
          </label>
          <button className="btn" onClick={resetAll}>Factory Reset</button>
        </div>
      </div>

      <hr/>

      <h2>Profile</h2>
      <div className="row">
        <input placeholder="name" value={profile.name} onChange={e=>setProfile({...profile, name:e.target.value})}/>
        <input placeholder="age" value={profile.age} onChange={e=>setProfile({...profile, age:e.target.value})}/>
        <input placeholder="notes" style={{flex:1}} value={profile.notes} onChange={e=>setProfile({...profile, notes:e.target.value})}/>
        <button className="btn primary" onClick={saveProfileNow}>Save</button>
      </div>

      <hr/>

      <h2>Meds</h2>
      <div className="row">
        <input placeholder="name" value={newMed.name} onChange={e=>setNewMed({...newMed, name:e.target.value})}/>
        <input placeholder="dose" value={newMed.dose} onChange={e=>setNewMed({...newMed, dose:e.target.value})}/>
        <button className="btn primary" onClick={addMed}>Add</button>
      </div>
      <table><thead><tr><th>Name</th><th>Dose</th></tr></thead><tbody>
        {meds.map(m => <tr key={m.id}><td>{m.name}</td><td>{m.dose}</td></tr>)}
      </tbody></table>

      <hr/>

      <h2>Weights</h2>
      <div className="row">
        <input type="date" value={newWeight.date} onChange={e=>setNewWeight({...newWeight,date:e.target.value})}/>
        <input type="number" step="0.1" value={newWeight.value} onChange={e=>setNewWeight({...newWeight,value:e.target.value})}/>
        <button className="btn primary" onClick={addWeight}>Add</button>
      </div>
      <table><thead><tr><th>Date</th><th>Value</th></tr></thead><tbody>
        {weights.map((w,i) => <tr key={i}><td>{w.date}</td><td>{w.value}</td></tr>)}
      </tbody></table>
    </div>
  )
}
