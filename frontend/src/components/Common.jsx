import{AlertCircle,CheckCircle2,Inbox,Loader2,Search}from'lucide-react';
export function PageHeader({eyebrow,title,description,actions}){return <div className="page-header"><div>{eyebrow&&<div className="eyebrow">{eyebrow}</div>}<h1>{title}</h1>{description&&<p>{description}</p>}</div>{actions&&<div className="page-header-actions">{actions}</div>}</div>}
export function StatCard({label,value,hint,icon:Icon,tone='blue'}){return <div className={`stat-card tone-${tone}`}><div className="stat-top"><div><span>{label}</span><strong>{value}</strong></div><div className="stat-icon"><Icon size={20}/></div></div>{hint&&<small>{hint}</small>}</div>}
export function StatusPill({value}){return <span className={`status-pill ${String(value||'').toLowerCase()}`}>{value}</span>}
export function EmptyState({title='Nothing here yet',text='New information will appear here when it is available.'}){return <div className="empty-state"><Inbox size={28}/><strong>{title}</strong><p>{text}</p></div>}
export function Loading(){return <div className="inline-loading"><Loader2 className="spin" size={18}/> Loading…</div>}
export function ErrorBox({text}){return text?<div className="error-box"><AlertCircle size={18}/>{text}</div>:null}
export function SuccessBox({text}){return text?<div className="success-box"><CheckCircle2 size={18}/>{text}</div>:null}
export function SearchBox({value,onChange,placeholder='Search…'}){return <div className="search-box"><Search size={17}/><input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}/></div>}
