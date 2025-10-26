// storage-override.js (v17 WS) — adds server sync using Socket.IO, keeps UI unchanged.
(function(){
  const CACHE = Object.assign({}, (window && window.__PEP_BOOT__) || {});
  const listeners = new Set();
  function notify(){ listeners.forEach(fn => { try { fn(); } catch(_){}}); }

  // Connect Socket.IO
  let socket;
  try {
    // global 'io' is injected by the server via <script src="/socket.io/socket.io.js">
    socket = io('/', { transports: ['websocket', 'polling'] });
    socket.on('connect', () => {});
    socket.on('kv:change', () => { fetchAll().catch(()=>{}); });
  } catch(e){ /* socket optional; REST fallback still works */ }

  async function fetchAll(){
    const r = await fetch('/api/storage/all', { cache: 'no-store' });
    if (!r.ok) return;
    const data = await r.json();
    Object.assign(CACHE, data);
    notify();
  }

  function wsEmit(event, payload){
    if (socket && socket.connected) { try { socket.emit(event, payload); return true; } catch(_){ } }
    return false;
  }

  async function restSet(key, value){
    await fetch('/api/storage', {
      method:'POST', headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ key, value })
    });
  }
  async function restBulk(data){
    await fetch('/api/storage/bulk', {
      method:'POST', headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ data })
    });
  }

  // Patch localStorage to mirror to server
  const LS = window.localStorage;
  const ORIG = {
    getItem: LS.getItem.bind(LS),
    setItem: LS.setItem.bind(LS),
    removeItem: LS.removeItem.bind(LS),
    clear: LS.clear.bind(LS),
  };

  LS.getItem = (k) => {
    if (k in CACHE) {
      try { return JSON.stringify(CACHE[k]); } catch { return String(CACHE[k]); }
    }
    return ORIG.getItem(k);
  };

  LS.setItem = (k, v) => {
    let val = v;
    try { val = JSON.parse(v); } catch {}
    CACHE[k] = val;
    // Prefer WS; fall back to REST
    if (!wsEmit('kv:set', { key: k, value: val })) { restSet(k, val).catch(()=>{}); }
    notify();
    return ORIG.setItem(k, v);
  };

  LS.removeItem = (k) => {
    delete CACHE[k];
    if (!wsEmit('kv:set', { key: k, value: undefined })) { restSet(k, undefined).catch(()=>{}); }
    notify();
    return ORIG.removeItem(k);
  };

  LS.clear = () => {
    const keys = Object.keys(CACHE);
    for (const k of keys) delete CACHE[k];
    if (!wsEmit('kv:bulk', { data: {} })) { restBulk({}).catch(()=>{}); }
    notify();
    return ORIG.clear();
  };

  // Public subscription (optional for React hooks)
  window.__PEP_SUB__ = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

  // Initial reconcile if no boot data
  if (!Object.keys(CACHE).length) fetchAll().catch(()=>{});
})();
