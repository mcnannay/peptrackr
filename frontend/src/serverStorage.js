const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8080";

let cache = {};

export async function hydrate(keys) {
  const params = keys && keys.length ? ("?"+ new URLSearchParams(keys.map(k=>["keys",k])).toString()) : "";
  const res = await fetch(`${API_BASE}/api/v1/store${params}`);
  cache = await res.json();
}

export function load(key, fallback) {
  return cache[key] ?? fallback;
}

export async function save(key, value) {
  cache[key] = value;
  await fetch(`${API_BASE}/api/v1/store/${encodeURIComponent(key)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(value),
  });
}

export async function remove(key) {
  delete cache[key];
  await fetch(`${API_BASE}/api/v1/store/${encodeURIComponent(key)}`, { method: "DELETE" });
}
