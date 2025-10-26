import { io } from 'socket.io-client'

export async function fetchAll() {
  const r = await fetch('/api/kv', { cache: 'no-store' })
  if (!r.ok) throw new Error('fetchAll failed')
  return r.json()
}

export async function setDoc(key, value) {
  const r = await fetch('/api/kv/' + encodeURIComponent(key), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ value }),
  })
  if (!r.ok) throw new Error('setDoc failed')
  return r.json()
}

export async function bulkSet(data) {
  const r = await fetch('/api/kv/bulk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!r.ok) throw new Error('bulkSet failed')
  return r.json()
}

export function connectSocket(onChange) {
  const socket = io('/', { transports: ['websocket', 'polling'] })
  socket.on('kv:change', (payload) => {
    try { onChange && onChange(payload) } catch {}
  })
  return socket
}
