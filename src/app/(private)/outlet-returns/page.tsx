import {randomUUID} from "node:crypto";
import {requireActor} from "@/lib/access";
import {outlets} from "@/lib/v2-master";
import {listReturnLines,listV2Returns,listComplaints} from "@/lib/return-operations";
import {PageHead,Panel,Empty,Notice,rupiah} from "@/components/ui";
import {submitReturn,submitComplaint,finishComplaint} from "./actions";
export const dynamic="force-dynamic";
export default async function OutletReturns({searchParams}:{searchParams:Promise<{success?:string;error?:string}>}){
 const actor=await requireActor(["owner","admin","marketing"]);
 const [lines,returned,complaints,outletList,params]=await Promise.all([listReturnLines(),listV2Returns(),listComplaints(),outlets(),searchParams]);
 const available=lines.filter(x=>x.quantity>x.returned);
 const writable=actor.role!=="marketing";
 return <><PageHead eyebrow="QC / OUTLET" title="Retur & Komplain Outlet" description="Telusuri nota asal, nilai retur, keputusan QC, dan penyelesaian komplain."/>
 <Notice success={params.success} error={params.error}/>
 {writable&&<Panel title="Catat retur berdasarkan nota"><form className="form-grid" action={submitReturn}>
  <input name="requestKey" type="hidden" value={randomUUID()}/>
  <label className="wide">Nota dan produk<select required name="line" defaultValue=""><option value="" disabled>Pilih item terkirim</option>
   {available.map(x=><option key={x.delivery_id+x.order_item_id} value={x.delivery_id+"|"+x.order_item_id}>
    {x.number} · {x.outlet} · {x.product} · sisa {x.quantity-x.returned} · {rupiah(x.price)}/unit
   </option>)}</select></label>
  <label>Jumlah retur<input type="number" name="quantity" min="1" step="1" required/></label>
  <label>Hasil QC<select name="qc" defaultValue="pending">
   <option value="pending">Belum diperiksa</option><option value="passed">Layak jual</option>
   <option value="rejected">Rusak / tidak layak</option><option value="not_applicable">Tidak ada barang fisik</option>
  </select></label>
  <label>Kembalikan ke stok?<select name="restock" defaultValue="no"><option value="no">Tidak</option><option value="yes">Ya, hanya jika QC layak jual</option></select></label>
  <label className="wide">Alasan retur<input name="reason" required minLength={5} maxLength={400} placeholder="Produk rusak setelah pengiriman"/></label>
  <button className="primary-button" disabled={!available.length}>Simpan Retur & Potongan Nota</button>
 </form><p className="form-hint">Nilai retur dihitung dari harga pada nota, bukan harga produk terbaru. Retur yang lebih besar dari sisa nilai tagihan tidak diizinkan hingga pengembalian dana ditangani.</p></Panel>}
 <Panel title="Buat komplain outlet"><form className="form-grid" action={submitComplaint}>
  <input name="requestKey" type="hidden" value={randomUUID()}/>
  <label>Outlet<select name="outletId" defaultValue="" required><option value="" disabled>Pilih outlet</option>{outletList.filter(x=>x.active).map(x=><option value={x.id} key={x.id}>{x.name}</option>)}</select></label>
  <label>Nomor nota terkait (opsional)<select name="deliveryId" defaultValue=""><option value="">Tanpa nota</option>{Array.from(new Map(lines.map(l=>[l.delivery_id,{id:l.delivery_id,number:l.number,outlet:l.outlet}])).values()).map(x=><option key={x.id} value={x.id}>{x.number} · {x.outlet}</option>)}</select></label>
  <label>Kategori<select name="category" defaultValue="quality"><option value="quality">Kualitas/QC</option><option value="quantity">Jumlah</option><option value="delivery">Pengiriman</option><option value="price">Harga</option><option value="other">Lainnya</option></select></label>
  <label className="wide">Keterangan<input name="description" minLength={5} maxLength={1000} required placeholder="Keluhan, bukti dan permintaan outlet"/></label>
  <button className="primary-button">Catat Komplain</button>
 </form></Panel>
 <Panel title="Riwayat retur">{returned.length===0?<Empty label="retur outlet"/>:<div className="table-wrap"><table><thead><tr><th>Nota</th><th>Outlet</th><th>Produk</th><th>Jumlah</th><th>Nilai retur</th><th>QC</th><th>Stok kembali</th><th>Alasan</th></tr></thead>
 <tbody>{returned.map(x=><tr key={x.id}><td>{x.document_number}</td><td>{x.outlet}</td><td>{x.product}</td><td>{x.quantity}</td><td>{rupiah(x.credit_amount)}</td><td>{x.qc_result}</td><td>{x.restock?"Ya":"Tidak"}</td><td>{x.reason}</td></tr>)}</tbody></table></div>}</Panel>
 <Panel title="Tindak lanjut komplain">{complaints.length===0?<Empty label="komplain outlet"/>:<div className="product-manage-list">{complaints.map(c=><section key={c.id} className="manage-item">
  <div className="manage-item-head"><div><strong>{c.outlet}</strong><p className="small-muted">{c.number||"Tanpa nota"} · {c.category} · {new Date(c.created_at).toLocaleDateString("id-ID")}</p></div>
   <span className={c.status==="resolved"?"status-success":"status-danger"}>{c.status}</span></div>
  <p>{c.description}</p>{c.resolution&&<p className="small-muted">Penyelesaian: {c.resolution}</p>}
  {writable&&["open","investigating"].includes(c.status)&&<details className="edit-detail"><summary>Update komplain</summary><form action={finishComplaint} className="form-grid">
  <input type="hidden" name="id" value={c.id}/><label>Status<select name="status" defaultValue="investigating"><option value="investigating">Dalam pemeriksaan</option><option value="resolved">Selesai</option><option value="rejected">Ditolak</option></select></label>
  <label className="wide">Keputusan atau tindak lanjut<input name="resolution" required minLength={5} maxLength={1000}/></label>
  <button className="primary-button">Simpan Keputusan</button></form></details>}
 </section>)}</div>}</Panel>
 </>;
}