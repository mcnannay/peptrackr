import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { hydrate } from './serverStorage'

const KEYS = ['meds','shots','theme','home_weight_range','screen','shot_draft']

async function start() {
  try {
    await hydrate(KEYS)
  } catch (e) {
    console.error('Failed to hydrate server storage', e)
  }
  createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
}
start()
