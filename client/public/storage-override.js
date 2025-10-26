// storage-override.js — Robust sync: server is source of truth, localStorage is a fast mirror.
// This version **monkey-patches Storage.prototype** instead of trying to replace window.localStorage,
// which browsers typically block. App code can continue to call localStorage.* normally.

(function(){
  // ---- Instance identity (per-tab) ----
  const INSTANCE = (globalThis.crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Math.random()).slice(2);
  try { window.__PEP_INSTANCE__ = INSTANCE; } catch(_) {}

  // ---- Utilities ----
  const toJSON = (x) => typeof x === 'string' ? x : JSON.stringify(x);
  const fromJSON = (x) => { try { return JSON.parse(x); } catch(_) { return x; } };
  const post = (url, body) => fetch(url, { method:'POST', headers:{'Content-Type':'application/json','x-pep-instance':INSTANCE}, body: JSON.stringify(body) });
  const getJson = async (url) => { const r = await fetch(url, { cache:'no-store' }); if(!r.ok) return null; return r.json(); };

  // ---- Original methods ----
  const S = globalThis.Storage && Storage.prototype;
  if (!S) return;
  const origSet = S.setItem;
  const origRemove = S.removeItem;
  const origClear = S.clear;
  const origGet = S.getItem;

  // ---- Bootstrap guard to avoid echoing server preload back to server ----
  let IN_BOOTSTRAP = true;

  // ---- Preload from server-injected bootstrap (window.__PEP_BOOT__) into *real* localStorage ----
  try {
    if (globalThis.__PEP_BOOT__ && typeof __PEP_BOOT__ === 'object') {
      for (const [k, v] of Object.entries(__PEP_BOOT__)) {
        // Use original set to avoid triggering network in bootstrap
        try { origSet.call(localStorage, k, toJSON(v)); } catch(_) {}
      }
    }
  } catch(_) {}

  // ---- Method monkey-patches (write-through) ----
  S.setItem = function(k, v) {
    // 1) Write to localStorage for immediate reads by the app
    try { origSet.call(this, k, String(v)); } catch(_) {}
    // 2) If not bootstrapping, push to server
    if (!IN_BOOTSTRAP) {
      let payload = v;
      try { payload = JSON.parse(v); } catch(_) { payload = v; }
      post('/api/doc/set', { key: k, value: payload }).catch(()=>{});
    }
  };

  S.removeItem = function(k) {
    try { origRemove.call(this, k); } catch(_) {}
    if (!IN_BOOTSTRAP) {
      // Reflect by sending full snapshot after removal
      const data = {};
      try {
        for (let i=0;i<localStorage.length;i++){
          const key = localStorage.key(i);
          const val = localStorage.getItem(key);
          data[key] = fromJSON(val);
        }
      } catch(_) {}
      post('/api/doc/bulkset', { data }).catch(()=>{});
    }
  };

  S.clear = function() {
    try { origClear.call(this); } catch(_) {}
    if (!IN_BOOTSTRAP) {
      post('/api/doc/bulkset', { data: {} }).catch(()=>{});
    }
  };

  // ---- After app mounts: reconcile from server to ensure exact match ----
  (async () => {
    try {
      const data = await getJson('/api/storage/all');
      if (data && typeof data === 'object') {
        // Apply diff into localStorage using original set (won't network)
        let changed = false;
        const seen = new Set(Object.keys(data));
        for (const [k, v] of Object.entries(data)) {
          const s = toJSON(v);
          if (origGet.call(localStorage, k) !== s) {
            try { origSet.call(localStorage, k, s); changed = true; } catch(_) {}
          }
        }
        // Remove locals that no longer exist server-side
        for (let i=localStorage.length-1; i>=0; i--) {
          const key = localStorage.key(i);
          if (!seen.has(key)) {
            try { origRemove.call(localStorage, key); changed = true; } catch(_) {}
          }
        }
        if (changed) {
          try { window.dispatchEvent(new Event('storage')); } catch(_) {}
        }
      }
    } catch(_) {}
    IN_BOOTSTRAP = false;
  })();

  // ---- Real-time updates via SSE ----
  try {
    const es = new EventSource('/api/stream');
    let reconcileTimer = null;
    es.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data || '{}');
        if (!msg || msg.event !== 'change') return;
        if (msg.source === INSTANCE) return; // ignore our own writes

        // Debounced reconcile: pull full server state and make it authoritative
        if (!reconcileTimer) {
          reconcileTimer = setTimeout(async () => {
            reconcileTimer = null;
            try {
              const data = await getJson('/api/storage/all');
              if (data && typeof data === 'object') {
                let changed = false;
                const seen = new Set(Object.keys(data));
                for (const [k, v] of Object.entries(data)) {
                  const s = toJSON(v);
                  if (origGet.call(localStorage, k) !== s) {
                    try { origSet.call(localStorage, k, s); changed = true; } catch(_) {}
                  }
                }
                for (let i=localStorage.length-1; i>=0; i--) {
                  const key = localStorage.key(i);
                  if (!seen.has(key)) {
                    try { origRemove.call(localStorage, key); changed = true; } catch(_) {}
                  }
                }
                if (changed) {
                  try { window.dispatchEvent(new Event('storage')); } catch(_) {}
                }
              }
            } catch(_) {}
          }, 150);
        }
      } catch(_) {}
    };
  } catch(_) {}

})();