// storage-override.js (v17) — keep UI unmodified, add server sync
(function(){
  const BOOT = (typeof window !== 'undefined' && window.__PEP_BOOT__) ? window.__PEP_BOOT__ : {};
  const CACHE = {...BOOT};
  const listeners = new Set();
  function emit(){ listeners.forEach(fn => { try { fn(); } catch(_){} }); }

  async function fetchAll(){
    try {
      const r = await fetch('/api/storage/all', { cache:'no-store' });
      if (!r.ok) return;
      const data = await r.json();
      Object.assign(CACHE, data);
      emit();
    } catch(_){}
  }

  async function setRemote(key, value){
    try {
      await fetch('/api/storage', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ key, value })
      });
    } catch(_){}
  }

  async function bulkRemote(obj){
    try {
      await fetch('/api/storage/bulk', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ data: obj })
      });
    } catch(_){}
  }

  // Monkey patch localStorage used by original UI
  const LS = window.localStorage;
  const ORIG = {
    getItem: LS.getItem.bind(LS),
    setItem: LS.setItem.bind(LS),
    removeItem: LS.removeItem.bind(LS),
    clear: LS.clear.bind(LS),
  };

  LS.getItem = (k) => {
    if (k in CACHE) return JSON.stringify(CACHE[k]);
    return ORIG.getItem(k);
  };
  LS.setItem = (k, v) => {
    try { CACHE[k] = JSON.parse(v); } catch { CACHE[k] = v; }
    setRemote(k, CACHE[k]);
    emit();
    return ORIG.setItem(k, v);
  };
  LS.removeItem = (k) => {
    delete CACHE[k];
    setRemote(k, undefined);
    emit();
    return ORIG.removeItem(k);
  };
  LS.clear = () => {
    const keys = Object.keys(CACHE);
    for (const k of keys) delete CACHE[k];
    bulkRemote({});
    emit();
    return ORIG.clear();
  };

  // SSE reconcile
  try {
    const es = new EventSource('/api/stream');
    es.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data || '{}');
        if (msg && msg.event === 'change') { fetchAll(); }
      } catch(_) {}
    };
  } catch(_){}

  // Expose a subscription for React effect if desired
  window.__PEP_SUB__ = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

  // Initial reconcile on load (if no injected boot)
  if (!Object.keys(BOOT).length) fetchAll();
})();
