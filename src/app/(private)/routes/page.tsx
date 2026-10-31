import {SubmitButton} from "@/components/submit-button";
import {randomUUID} from "node:crypto";
import {requireActor} from "@/lib/access";
import {listRoutes,listAvailableDeliveries,routeAllocations} from "@/lib/route-operations";
import {PageHead,Panel,Notice,Empty,rupiah} from "@/components/ui";
import {routeCreate,routeStop,routeCost} from "./actions";
export const dynamic="force-dynamic";
const today=()=>new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Jakarta",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
export default async function DeliveryRoutes({searchParams}:{searchParams:Promise<{success?:string;error?:string}>}){
 await requireActor(["owner","admin"]);
 const [routes,available,allocations,params]=await Promise.all([listRoutes(),listAvailableDeliveries(),routeAllocations(),searchParams]);
 return <><PageHead eyebrow="DISTRIBUSI / COSTING" title="Rute & Biaya Pengantaran"
 description="Gabungkan beberapa nota menjadi satu perjalanan dan catat biaya aktual tanpa menghitung biaya dua kali."/>
 <Notice success={params.success} error={params.error}/>
 <Panel title="Buat perjalanan"><form action={routeCreate} className="form-grid">
 <input type="hidden" name="requestKey" value={randomUUID()}/>
 <label>Nama rute<input name="title" maxLength={140} minLength={3} required placeholder="Pengantaran area utara"/></label>
 <label>Tanggal<input name="date" type="date" defaultValue={today()} required/></label>
 <label>Kendaraan<input name="vehicle" maxLength={100} placeholder="Mobil 1"/></label>
 <label>Pengemudi<input name="driver" maxLength={120}/></label>
 <label>Jarak aktual (km, opsional)<input name="distance" type="number" min="0" step=".01"/></label>
 <label className="wide">Catatan<input name="note" maxLength={400}/></label>
 <SubmitButton className="primary-button">Buat Rute</SubmitButton></form></Panel>
 <Panel title="Tambahkan nota ke rute" detail="Satu nota hanya masuk satu perjalanan">
 <form action={routeStop} className="form-grid">
 <label>Rute<select name="routeId" defaultValue="" required><option value="" disabled>Pilih perjalanan</option>{routes.map(x=><option key={x.id} value={x.id}>{x.route_date} · {x.title}</option>)}</select></label>
 <label className="wide">Nota pengantaran<select name="deliveryId" defaultValue="" required><option value="" disabled>Pilih nota belum ditempatkan di rute</option>{available.map(x=><option value={x.id} key={x.id}>{x.document_number} · {x.outlet} · {rupiah(x.gross)}</option>)}</select></label>
 <label>Urutan stop<input name="stopOrder" type="number" min="1" step="1" required placeholder="1"/></label>
 <SubmitButton className="primary-button" disabled={!routes.length||!available.length}>Tambahkan Stop</SubmitButton></form></Panel>
 <Panel title="Catat biaya aktual rute"><form className="form-grid" action={routeCost}>
 <input type="hidden" name="requestKey" value={randomUUID()}/>
 <label>Rute<select name="routeId" defaultValue="" required><option value="" disabled>Pilih rute</option>{routes.map(x=><option key={x.id} value={x.id}>{x.route_date} · {x.title}</option>)}</select></label>
 <label>Jenis biaya<select name="category" defaultValue="fuel"><option value="fuel">BBM</option><option value="driver">Upah pengantar</option><option value="toll">Tol</option><option value="parking">Parkir</option><option value="vehicle">Kendaraan</option><option value="other">Lainnya</option></select></label>
 <label>Nominal (Rp)<input name="amount" type="number" min=".01" step=".01" required/></label>
 <label className="wide">Catatan<input name="note" maxLength={400} placeholder="BBM, biaya aktual atau referensi bukti"/></label>
 <SubmitButton className="primary-button" disabled={!routes.length}>Simpan Biaya Rute</SubmitButton>
 </form><p className="form-hint">Biaya yang dicatat di sini khusus satu perjalanan. Jangan dicatat kembali pada Buku Biaya sebagai biaya yang sama. Integrasi buku kas masih akan disatukan di tahap berikutnya.</p></Panel>
 <Panel title="Ringkasan perjalanan">{routes.length===0?<Empty label="rute pengantaran"/>:<div className="table-wrap"><table><thead><tr><th>Tanggal</th><th>Rute</th><th>Kendaraan</th><th>Stop</th><th>Jarak (km)</th><th>Penjualan Bersih</th><th>Biaya Rute</th></tr></thead><tbody>{routes.map(x=><tr key={x.id}><td>{x.route_date}</td><td>{x.title}</td><td>{x.vehicle||"—"}</td><td>{x.stops}</td><td>{x.distance_km||"—"}</td><td>{rupiah(x.revenue)}</td><td>{rupiah(x.cost)}</td></tr>)}</tbody></table></div>}</Panel>
 <Panel title="Alokasi biaya per outlet" detail="Proporsional terhadap nilai nota bersih pada rute yang sama">
 {allocations.length===0?<Empty label="alokasi biaya pengiriman"/>:<div className="table-wrap"><table><thead><tr><th>Rute</th><th>Stop</th><th>Outlet</th><th>Nota</th><th>Penjualan Bersih</th><th>Alokasi Ongkir</th><th>Setelah Ongkir*</th></tr></thead>
 <tbody>{allocations.map(x=><tr key={x.routeId+x.documentNumber}><td>{x.routeTitle}</td><td>{x.stop}</td><td>{x.outlet}</td><td>{x.documentNumber}</td><td>{rupiah(x.revenue)}</td><td>{rupiah(x.allocatedCost)}</td><td>{rupiah(x.afterDelivery)}</td></tr>)}</tbody></table></div>}
 <p className="form-hint">*Setelah ongkir BUKAN laba bersih, karena HPP produksi dan biaya lain belum dikurangkan. Total biaya rute dibagi dengan pembulatan hingga seluruh sen/angka rupiah tetap cocok.</p>
 </Panel>
 </>;
}