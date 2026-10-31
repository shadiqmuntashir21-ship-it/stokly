import Link from "next/link";
import type { ReactNode } from "react";
import { PackageOpen } from "lucide-react";
export const rupiah=(n:number|string)=>new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(Number(n));
export function PageHead({eyebrow,title,description,action}:{eyebrow:string;title:string;description:string;action?:{href:string;label:string}}){
return <div className="page-head"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="muted">{description}</p></div>{action&&<Link className="primary-button" href={action.href}>{action.label}</Link>}</div>;
}
export function Panel({title,children,detail}:{title:string;children:ReactNode;detail?:string}){return <section className="panel"><div className="panel-head"><h2>{title}</h2>{detail&&<span className="small-muted">{detail}</span>}</div>{children}</section>;}
export function Notice({success,error}:{success?:string;error?:string}){return error?<p className="error-notice" role="alert">{error.slice(0,220)}</p>:success==="1"?<p className="success-notice">Data berhasil disimpan.</p>:null;}
export function Empty({label}:{label:string}){return <div className="empty"><span className="empty-icon"><PackageOpen size={23}/></span><strong>Belum ada {label}</strong><span className="small-muted">Data akan tampil setelah pencatatan pertama.</span></div>}
