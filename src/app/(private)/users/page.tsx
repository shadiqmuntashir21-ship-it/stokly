import { requireActor } from "@/lib/access";
import { query } from "@/lib/db";
import { PageHead,Panel,Notice,Empty } from "@/components/ui";
import { createStaff } from "./actions";
export const dynamic="force-dynamic";
export default async function Users({searchParams}:{searchParams:Promise<{success?:string}>}){
 await requireActor(["owner"]);
 const [accounts,params]=await Promise.all([
   query<{id:string;name:string;username:string;role:string}>('SELECT u.id,u.name,u.username,r.role FROM "user" u JOIN user_roles r ON r.user_id=u.id ORDER BY r.role,u.name'),
   searchParams
 ]);
 return <><PageHead eyebrow="SETTINGS / ACCESS" title="Tim & Pengguna" description="Buat akun Admin dan Marketing dengan username dan PIN."/><Notice success={params.success}/>
 <Panel title="Buat akun anggota"><form className="form-grid" action={createStaff}>
  <label>Nama<input required name="name" minLength={2} maxLength={90}/></label>
  <label>Username<input type="text" required name="username" minLength={3} maxLength={30} pattern="[a-zA-Z][a-zA-Z0-9_.]{2,29}"/></label>
  <label>Peran<select name="role" defaultValue="marketing"><option value="marketing">Marketing</option><option value="admin">Admin Operasional</option></select></label>
  <label>PIN awal (8 digit)<input type="password" name="pin" inputMode="numeric" pattern="[0-9]{8}" minLength={8} maxLength={8} required autoComplete="new-password"/></label>
  <button className="primary-button">Buat akun</button>
  </form><p className="small-muted" style={{padding:"0 24px 20px"}}>Berikan PIN secara pribadi kepada anggota tim. Fitur undangan email dan reset kata sandi belum tersedia.</p>
 </Panel>
 <Panel title="Akun yang terdaftar">{!accounts.length?<Empty label="pengguna"/>:<div className="table-wrap"><table><thead><tr><th>Nama</th><th>Username</th><th>Peran</th></tr></thead><tbody>{accounts.map(a=><tr key={a.id}><td className="strong-cell">{a.name}</td><td>{a.username}</td><td>{a.role}</td></tr>)}</tbody></table></div>}</Panel></>;
}
