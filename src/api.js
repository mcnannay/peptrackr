
export async function api(path, opts={}){
  const res = await fetch(path, {
    headers: {'Content-Type':'application/json'},
    ...opts
  })
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
export const Meds = {
  list: ()=>api('/api/meds'),
  add: (p)=>api('/api/meds',{method:'POST',body:JSON.stringify(p)}),
  update: (id,p)=>api('/api/meds/'+id,{method:'PUT',body:JSON.stringify(p)}),
  remove: (id)=>api('/api/meds/'+id,{method:'DELETE'}),
}
export const Shots = {
  list: ()=>api('/api/shots'),
  add: (p)=>api('/api/shots',{method:'POST',body:JSON.stringify(p)}),
}
export const Weights = {
  list: ()=>api('/api/weights'),
  add: (p)=>api('/api/weights',{method:'POST',body:JSON.stringify(p)}),
}
