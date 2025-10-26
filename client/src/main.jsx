import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './styles.css'

// Simple per-tab instance id for diagnostics
if (!window.__PEP_INSTANCE__) {
  try { window.__PEP_INSTANCE__ = crypto.randomUUID(); } catch { window.__PEP_INSTANCE__ = String(Math.random()).slice(2); }
}

createRoot(document.getElementById('root')).render(<App />)
