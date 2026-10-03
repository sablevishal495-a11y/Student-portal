export const API_URL=import.meta.env.VITE_API_URL||"http://localhost:4000/api";
export const FILE_BASE_URL=API_URL.replace(/\/api$/,'');
export async function api(path,options={}){const token=localStorage.getItem('edu_token');const headers=new Headers(options.headers||{});if(token)headers.set('Authorization',`Bearer ${token}`);if(!(options.body instanceof FormData)&&!headers.has('Content-Type'))headers.set('Content-Type','application/json');const r=await fetch(`${API_URL}${path}`,{...options,headers});let data={};try{data=await r.json()}catch{}if(!r.ok)throw new Error(data.message||'Something went wrong.');return data}
export const money=n=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(Number(n||0));
export const dateText=v=>v?new Date(v).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}):'—';
