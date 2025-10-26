const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8080";
async function j(res){ if(!res.ok) throw new Error(await res.text()); return res.json(); }
export const listUsers=()=>fetch(`${API_BASE}/api/v1/users`).then(j);
export const createUser=(name)=>fetch(`${API_BASE}/api/v1/users`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name})}).then(j);
export const updateUser=(id,body)=>fetch(`${API_BASE}/api/v1/users/${id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(j);
export const deleteUser=(id)=>fetch(`${API_BASE}/api/v1/users/${id}`,{method:'DELETE'});

export const listMeds=()=>fetch(`${API_BASE}/api/v1/meds`).then(j);
export const createMed=(body)=>fetch(`${API_BASE}/api/v1/meds`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(j);
export const updateMed=(id,body)=>fetch(`${API_BASE}/api/v1/meds/${id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(j);
export const deleteMed=(id)=>fetch(`${API_BASE}/api/v1/meds/${id}`,{method:'DELETE'});

export const listShots=(userId,page=0,size=50)=>fetch(`${API_BASE}/api/v1/shots?userId=${encodeURIComponent(userId||'')}&page=${page}&size=${size}`).then(j);
export const createShot=(body)=>fetch(`${API_BASE}/api/v1/shots`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(j);
export const updateShot=(id,body)=>fetch(`${API_BASE}/api/v1/shots/${id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(j);
export const deleteShot=(id)=>fetch(`${API_BASE}/api/v1/shots/${id}`,{method:'DELETE'});

export const listWeights=(userId,page=0,size=50)=>fetch(`${API_BASE}/api/v1/weights?userId=${encodeURIComponent(userId||'')}&page=${page}&size=${size}`).then(j);
export const createWeight=(body)=>fetch(`${API_BASE}/api/v1/weights`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(j);
export const updateWeight=(id,body)=>fetch(`${API_BASE}/api/v1/weights/${id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(j);
export const deleteWeight=(id)=>fetch(`${API_BASE}/api/v1/weights/${id}`,{method:'DELETE'});

export const exportAll=()=>fetch(`${API_BASE}/api/v1/backup/export`).then(j);
export const importAll=(payload)=>fetch(`${API_BASE}/api/v1/backup/import`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}).then(j);
