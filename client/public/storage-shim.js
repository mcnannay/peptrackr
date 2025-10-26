// Injected storage shim: hydrate from server and mirror all writes to server-side SQLite.
// This file is served as /storage-shim.js (copied by Vite from /public).

(function () {
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

  // Write-through: capture ALL localStorage writes
  const __origSetItem = window.localStorage && window.localStorage.setItem
    ? window.localStorage.setItem.bind(window.localStorage) : null;

  function postToServer(k, v) {
    let value = v;
    try { value = JSON.parse(v); } catch (_) { value = v; }
    try {
      fetch('/api/storage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: k, value })
      }).catch(() => {});
    } catch (e) {}
  }

  if (__origSetItem) {
    window.localStorage.setItem = (k, v) => {
      try { __origSetItem(k, v); } catch (_) {}
      postToServer(k, v);
    };
  }

  // Optional: if app uses a global save(k,v), wrap it too.
  if (typeof window.save === 'function') {
    const __origSave = window.save;
    window.save = (k, v) => {
      try { __origSave(k, v); } catch (_) {}
      try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {}
      postToServer(k, JSON.stringify(v));
    };
  }
})();
