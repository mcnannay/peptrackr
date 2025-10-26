export async function fetchAll() {
  const r = await fetch('/api/storage/all', { cache: 'no-store' });
  if (!r.ok) throw new Error('fetchAll failed');
  return r.json();
}

export async function setDoc(key, value) {
  const r = await fetch('/api/doc/set', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-pep-instance': window.__PEP_INSTANCE__ || '' },
    body: JSON.stringify({ key, value }),
  });
  if (!r.ok) throw new Error('setDoc failed');
  return r.json();
}

export async function bulkSet(data) {
  const r = await fetch('/api/doc/bulkset', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-pep-instance': window.__PEP_INSTANCE__ || '' },
    body: JSON.stringify({ data }),
  });
  if (!r.ok) throw new Error('bulkSet failed');
  return r.json();
}

export function connectSSE(onChange) {
  const es = new EventSource('/api/stream');
  es.onmessage = (ev) => {
    try {
      const msg = JSON.parse(ev.data || '{}');
      if (msg && msg.event === 'change') onChange(msg);
    } catch {}
  };
  return es;
}
