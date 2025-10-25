export async function api(path, opts={}){
  const res = await fetch(path, { headers: {'Content-Type':'application/json'}, ...opts })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}
export const Users = {
  list: ()=>api('/api/users'),
  add: (name, sex='M', heightCm=170)=>api('/api/users',{method:'POST',body:JSON.stringify({name,sex,heightCm})}),
  update: (id,p)=>api('/api/users/'+id,{method:'PUT',body:JSON.stringify(p)}),
  remove: (id)=>api('/api/users/'+id,{method:'DELETE'}),
  select: (id)=>api(`/api/users/${id}/select`,{method:'POST'}),
}
export const Sync = {
  get: ()=>api('/api/sync'),
  save: (body)=>api('/api/sync',{method:'POST',body:JSON.stringify(body)})
}
