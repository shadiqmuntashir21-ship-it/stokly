import {SubmitButton} from "@/components/submit-button";
import {randomUUID} from "node:crypto";
import {requireActor} from "@/lib/access";
import {outlets} from "@/lib/v2-master";
import {listVisits} from "@/lib/coconut-operations";
import {PageHead,Panel,Empty,Notice} from "@/components/ui";
import {visitAction} from "../coconut-actions";
export const dynamic="force-dynamic";
const today=()=>new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Jakarta",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
export default async function Visits({searchParams}:{searchParams:Promise<{success?:string;error?:string}>}){
 await requireActor(["owner","admin","marketing"]);
 const [outletList,visits,params]=await Promise.all([outlets(),listVisits(),searchParams]);
 const active=outletList.filter(x=>x.active);
 return <><PageHead eyebrow="MARKETING / OUTLET" title="Kunjungan Outlet" description="Catat kunjungan, peluang order, komplain dan jadwal tindak lanjut."/><Notice success={params.success} error={params.error}/>
 <Panel title="Catat kunjungan"><form action={visitAction} className="form-grid">
  <input name="requestKey" type="hidden" value={randomUUID()}/>
  <label>Outlet<select name="outletId" defaultValue="" required><option value="" disabled>Pilih outlet</option>{active.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></label>
  <label>Tanggal<input type="date" name="date" defaultValue={today()} required/></label>
  <label>Nama petugas<input name="staff" required minLength={2} maxLength={120} placeholder="Nama petugas marketing"/></label>
  <label>Hasil kunjungan<select name="outcome" defaultValue="kunjungan">
   <option value="kunjungan">Kunjungan rutin</option><option value="prospek">Prospek</option><option value="order">Potensi order</option><option value="follow_up">Perlu tindak lanjut</option><option value="komplain">Komplain</option>
  </select></label>
  <label>Tindak lanjut pada<input type="date" name="followUp"/></label>
  <label className="wide">Catatan<input name="note" maxLength={1000} placeholder="Hasil diskusi dengan outlet"/></label>
  <SubmitButton className="primary-button" disabled={!active.length}>Simpan Kunjungan</SubmitButton>
 </form></Panel>
 <Panel title="Riwayat kunjungan">{visits.length===0?<Empty label="kunjungan"/>:<div className="table-wrap"><table><thead><tr><th>Tanggal</th><th>Outlet</th><th>Petugas</th><th>Hasil</th><th>Tindak Lanjut</th><th>Catatan</th></tr></thead>
 <tbody>{visits.map(v=><tr key={v.id}><td>{v.visited_on}</td><td>{v.outlet}</td><td>{v.staff_name}</td><td>{v.outcome.replace("_"," ")}</td><td>{v.follow_up_on??"—"}</td><td>{v.note||"—"}</td></tr>)}</tbody></table></div>}</Panel></>;
}
