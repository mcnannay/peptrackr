import React, { useEffect, useMemo, useState } from 'react'
import { fetchAll, setDoc, bulkSet, connectSSE } from './api.js'

const defaultProfile = { name: '', age: '', notes: '' }

export default function App(){
  // Canonical state mirrors server keys (no local storage)
  const [theme, setTheme] = useState((window.__PEP_BOOT__ && window.__PEP_BOOT__.theme) || 'light')
  const [profile, setProfile] = useState((window.__PEP_BOOT__ && window.__PEP_BOOT__.profile) || defaultProfile)
  const [meds, setMeds] = useState((window.__PEP_BOOT__ && window.__PEP_BOOT__.meds) || [])
  const [shots, setShots] = useState((window.__PEP_BOOT__ && window.__PEP_BOOT__.shots) || [])
  const [weights, setWeights] = useState((window.__PEP_BOOT__ && window.__PEP_BOOT__.weights) || [])

  // One source of truth: server. On change events, refetch and replace state.
  useEffect(() => {
    let es
    let timer = null
    async function reconcile(){
      const data = await fetchAll()
      if (data.theme !== undefined) setTheme(data.theme)
      if (data.profile !== undefined) setProfile(data.profile)
      if (data.meds !== undefined) setMeds(data.meds)
      if (data.shots !== undefined) setShots(data.shots)
      if (data.weights !== undefined) setWeights(data.weights)
    }
    es = connectSSE(() => {
      if (!timer) {
        timer = setTimeout(() => { timer = null; reconcile().catch(()=>{}); }, 100)
      }
    })
    return () => { try { es && es.close() } catch {} }
  }, [])

  // Basic UI: meds and weights management + backup/restore + theme/profile
  const [newMed, setNewMed] = useState({ name:'', dose:'' })
  const [newWeight, setNewWeight] = useState({ date:'', value:'' })

  async function addMed(){
    const next = [...meds, { id: crypto.randomUUID(), ...newMed }]
    setMeds(next)
    await setDoc('meds', next)
    setNewMed({ name:'', dose:'' })
  }

  async function addWeight(){
    const next = [...weights, { date: newWeight.date || new Date().toISOString().slice(0,10), value: Number(newWeight.value||0) }]
    setWeights(next)
    await setDoc('weights', next)
    setNewWeight({ date:'', value:'' })
  }

  async function saveProfile(p){
    setProfile(p)
    await setDoc('profile', p)
  }

  async function switchTheme(t){
    setTheme(t)
    await setDoc('theme', t)
  }

  async function factoryReset(){
    if (!confirm('This will clear ALL data on the server. Continue?')) return
    await bulkSet({}) // writes empty dataset
    // Immediate local feedback:
    setTheme('light')
    setProfile({ name:'', age:'', notes:'' })
    setMeds([])
    setShots([])
    setWeights([])
    // SSE will still arrive shortly and confirm canonical state
  }

  async function exportBackup(){
    const blob = new Blob([JSON.stringify(await fetchAll(), null, 2)], { type:'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'backup.json'
    a.click()
  }

  function importJSON(e){
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const data = JSON.parse(reader.result || '{}')
        await bulkSet(data)
        // Update this tab immediately without waiting for SSE
        if (data.theme !== undefined) setTheme(data.theme)
        if (data.profile !== undefined) setProfile(data.profile)
        if (data.meds !== undefined) setMeds(data.meds)
        if (data.shots !== undefined) setShots(data.shots)
        if (data.weights !== undefined) setWeights(data.weights)
        alert('Import complete.')
      } catch(e) {
        alert('Import failed: ' + e.message)
      }
    }
    reader.readAsText(file)
    e.target.value=''
  }

  return (
    <div className="card">
      <h1>PepTrackr</h1>
      <div className="row">
        <label>Theme</label>
        <button className="btn" onClick={()=>switchTheme('light')}>Light</button>
        <button className="btn" onClick={()=>switchTheme('dark')}>Dark</button>
        <div style={{marginLeft:'auto'}}>
          <button className="btn" onClick={exportBackup}>Export Backup</button>
          <label className="btn">
            Import JSON
            <input type="file" accept="application/json" onChange={importJSON} style={{display:'none'}} />
          </label>
          <button className="btn" onClick={factoryReset}>Factory Reset</button>
        </div>
      </div>

      <hr/>

      <h2>Profile</h2>
      <div className="row">
        <input placeholder="name" value={profile.name} onChange={e=>setProfile({...profile,name:e.target.value})}/>
        <input placeholder="age"  value={profile.age} onChange={e=>setProfile({...profile,age:e.target.value})}/>
        <input placeholder="notes" style={{flex:1}} value={profile.notes} onChange={e=>setProfile({...profile,notes:e.target.value})}/>
        <button className="btn primary" onClick={()=>saveProfile(profile)}>Save</button>
      </div>

      <hr/>

      <h2>Meds</h2>
      <div className="row">
        <input placeholder="name" value={newMed.name} onChange={e=>setNewMed({...newMed,name:e.target.value})}/>
        <input placeholder="dose" value={newMed.dose} onChange={e=>setNewMed({...newMed,dose:e.target.value})}/>
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
