// Injected storage shim: robust hydrate + write-through + bulk sync (SQLite server).

(function () {
  const POST = (url, body) => fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  }).catch(() => {});

  // Hydrate from server on first load
  try {
    fetch('/api/storage/all')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data && typeof data === 'object') {
          for (const [k, v] of Object.entries(data)) {
            try {
              const payload = typeof v === 'string' ? v : JSON.stringify(v);
              localStorage.setItem(k, payload);
            } catch (e) {}
          }
          try { window.dispatchEvent(new Event('storage')); } catch (e) {}
        }
      })
      .catch(() => {});
  } catch (e) {}

  // Debounced bulk sync of entire localStorage (handles JSON imports, clear(), etc.)
  let bulkTimer = null;
  const scheduleBulkSync = () => {
    if (bulkTimer) clearTimeout(bulkTimer);
    bulkTimer = setTimeout(() => {
      try {
        const data = {};
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          const raw = localStorage.getItem(k);
          let v = raw;
          try { v = JSON.parse(raw); } catch (_) { v = raw; }
          data[k] = v;
        }
        POST('/api/storage/bulk', { data });
      } catch (e) {}
    }, 600); // debounce 600ms
  };

  // Write-through for single writes + schedule bulk sync
  const _origSetItem = localStorage.setItem.bind(localStorage);
  localStorage.setItem = (k, v) => {
    try { _origSetItem(k, v); } catch (_) {}
    // try immediate single upsert
    let payload = v;
    try { payload = JSON.parse(v); } catch (_) { payload = v; }
    POST('/api/storage', { key: k, value: payload });
    scheduleBulkSync();
  };

  const _origRemoveItem = localStorage.removeItem.bind(localStorage);
  localStorage.removeItem = (k) => {
    try { _origRemoveItem(k); } catch (_) {}
    // reflect removal by resyncing entire state
    scheduleBulkSync();
  };

  const _origClear = localStorage.clear.bind(localStorage);
  localStorage.clear = () => {
    try { _origClear(); } catch (_) {}
    scheduleBulkSync();
  };

  // Also trigger bulk on page load complete and visibility changes (covers import flows)
  window.addEventListener('load', scheduleBulkSync);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') scheduleBulkSync();
  });

  // Optional: wrap a global save(k,v) if app provides it
  if (typeof window.save === 'function') {
    const __origSave = window.save;
    window.save = (k, v) => {
      try { __origSave(k, v); } catch (_) {}
      try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {}
      scheduleBulkSync();
    };
  }
})();
