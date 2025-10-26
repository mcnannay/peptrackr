// storage-override.js — Direct-to-DB facade (no persistent localStorage).
// Loads before app; provides synchronous data via injected window.__PEP_BOOT__.

(function(){
  const mem = new Map();
  const toJSON = (x) => typeof x === 'string' ? x : JSON.stringify(x);
  const fromJSON = (x) => { try { return JSON.parse(x); } catch(_) { return x; } };

  // 1) Synchronous bootstrap from server-injected data
  if (window.__PEP_BOOT__ && typeof window.__PEP_BOOT__ === 'object') {
    for (const [k, v] of Object.entries(window.__PEP_BOOT__)) {
      mem.set(k, toJSON(v));
    }
  }

  // 2) Facade for localStorage (memory only; no real localStorage writes)
  const api = {
    get length(){ return mem.size; },
    key(i){ return Array.from(mem.keys())[i] ?? null; },
    getItem(k){ return mem.has(k) ? mem.get(k) : null; },
    setItem(k, v){
      // Update memory immediately for sync semantics
      mem.set(k, String(v));
      // Push to DB
      let payload = v;
      try { payload = JSON.parse(v); } catch(_) { payload = v; }
      fetch('/api/storage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: k, value: payload })
      }).catch(()=>{});
    },
    removeItem(k){
      mem.delete(k);
      // We reflect deletes by pushing a full snapshot (keeps server in sync)
      const data = {};
      for (const [kk, vv] of mem.entries()) {
        data[kk] = fromJSON(vv);
      }
      fetch('/api/storage/bulk', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data })
      }).catch(()=>{});
    },
    clear(){
      mem.clear();
      // Reflect clear with empty snapshot
      fetch('/api/storage/bulk', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: {} })
      }).catch(()=>{});
    }
  };

  // Replace window.localStorage with facade
  try { Object.defineProperty(window, 'localStorage', { value: api, configurable: false, writable: false }); } catch(_) { window.localStorage = api; }

  // 3) After app mounts, do a background reconcile pull in case server changed
  (async () => {
    try {
      const r = await fetch('/api/storage/all', { cache: 'no-store' });
      if (!r.ok) return;
      const data = await r.json();
      if (!data || typeof data !== 'object') return;
      let changed = false;
      for (const [k, v] of Object.entries(data)) {
        const s = toJSON(v);
        if (mem.get(k) !== s) { mem.set(k, s); changed = true; }
      }
      if (changed) {
        try { window.dispatchEvent(new Event('storage')); } catch(_) {}
      }
    } catch(_) {}
  })();

  // 4) Hook JSON backup imports (FileReader) to push full snapshot after import
  (function(){
    const FR = window.FileReader && window.FileReader.prototype;
    if (!FR) return;
    const readAsText = FR.readAsText;
    FR.readAsText = function(){
      this.addEventListener('load', () => {
        setTimeout(() => {
          const data = {};
          for (const [kk, vv] of mem.entries()) data[kk] = fromJSON(vv);
          fetch('/api/storage/bulk', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data })
          }).catch(()=>{});
        }, 500);
      }, { once: true });
      return readAsText.apply(this, arguments);
    };
  })();
})();
