// storage-shim.js: Server-backed sync using write-through + poll+reconcile.
(function () {
  const POST = (url, body) => fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  }).catch(() => {});

  const pullAll = async () => {
    try {
      const r = await fetch('/api/storage/all', { cache: 'no-store' });
      if (!r.ok) return;
      const data = await r.json();
      if (!data || typeof data !== 'object') return;
      // Reconcile: write any server keys into localStorage (stringify non-strings)
      for (const [k, v] of Object.entries(data)) {
        try {
          const payload = typeof v === 'string' ? v : JSON.stringify(v);
          if (localStorage.getItem(k) !== payload) {
            localStorage.setItem(k, payload);
          }
        } catch (_) {}
      }
    } catch (_) {}
  };

  const pushAll = async () => {
    try {
      const obj = {};
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        const raw = localStorage.getItem(k);
        let v = raw;
        try { v = JSON.parse(raw); } catch (_) { v = raw; }
        obj[k] = v;
      }
      await POST('/api/storage/bulk', { data: obj });
    } catch (_) {}
  };

  // Initial hydrate
  pullAll();

  // Override single writes to be write-through + schedule bulk
  let bulkTimer = null;
  const scheduleBulk = () => {
    if (bulkTimer) clearTimeout(bulkTimer);
    bulkTimer = setTimeout(() => { pushAll(); }, 600);
  };

  const _setItem = localStorage.setItem.bind(localStorage);
  localStorage.setItem = (k, v) => {
    try { _setItem(k, v); } catch (_) {}
    // Immediate single upsert
    let payload = v;
    try { payload = JSON.parse(v); } catch (_) { payload = v; }
    POST('/api/storage', { key: k, value: payload });
    scheduleBulk();
  };

  const _removeItem = localStorage.removeItem.bind(localStorage);
  localStorage.removeItem = (k) => {
    try { _removeItem(k); } catch (_) {}
    scheduleBulk();
  };

  const _clear = localStorage.clear.bind(localStorage);
  localStorage.clear = () => {
    try { _clear(); } catch (_) {}
    scheduleBulk();
  };

  // If app defines a save(k,v), wrap it to ensure server push too
  if (typeof window.save === 'function') {
    const __origSave = window.save;
    window.save = (k, v) => {
      try { __origSave(k, v); } catch (_) {}
      try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {}
      scheduleBulk();
    };
  }

  // Poll-and-reconcile every 5 seconds to catch bulk imports or missed writes
  setInterval(pullAll, 5000);

  // Also push on page hide/unload
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') pushAll();
  });
  window.addEventListener('beforeunload', () => { try { navigator.sendBeacon && navigator.sendBeacon('/api/storage/bulk', new Blob([JSON.stringify({ data: (()=>{const o={};for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);const raw=localStorage.getItem(k);let v=raw;try{v=JSON.parse(raw)}catch(_){v=raw}o[k]=v;}return o;})()})], {type:'application/json'})); } catch(_){} });
})();
