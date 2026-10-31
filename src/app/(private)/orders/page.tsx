import {SubmitButton} from "@/components/submit-button";
import {randomUUID} from "node:crypto";
import {requireActor} from "@/lib/access";
import {listProducts} from "@/lib/operations";
import {outlets} from "@/lib/v2-master";
import {listOrders,listOrderLines} from "@/lib/order-operations";
import {PageHead,Panel,Empty,Notice,rupiah} from "@/components/ui";
import {dispatchAction} from "../order-actions";
import {OrderComposer} from "@/components/order-composer";
export const dynamic="force-dynamic";
const today=()=>new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Jakarta",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
export default async function Orders({searchParams}:{searchParams:Promise<{success?:string;error?:string}>}){
 const actor=await requireActor(["owner","admin","marketing"]);
 const [products,outletList,orders,lines,params]=await Promise.all([listProducts(),outlets(),listOrders(),listOrderLines(),searchParams]);
 const available=lines.filter(x=>x.quantity>x.shipped);
 return <><PageHead eyebrow="DISTRIBUSI / TRANSAKSI" title="Order Outlet" description="Satu order boleh berisi beberapa produk. Catat pengiriman dan nota berdasarkan jumlah aktual."/><Notice success={params.success} error={params.error}/>
 <Panel title="Order Baru">{outletList.filter(o=>o.active).length===0&&<p className="form-hint">Tambahkan outlet terlebih dahulu melalui menu Outlet.</p>}
 <OrderComposer products={products} outlets={outletList} requestKey={randomUUID()}/></Panel>
 {actor.role!=="marketing"&&<Panel title="Pengiriman & Nota Keluar" detail={available.length+" item order menunggu pengiriman"}>
 <form action={dispatchAction} className="form-grid">
  <input type="hidden" name="requestKey" value={randomUUID()}/>
  <label className="wide">Item order<select required name="orderItemId" defaultValue=""><option value="" disabled>Pilih item order</option>
   {available.map(x=><option key={x.id} value={x.id}>{x.outlet} — {x.product} (sisa {x.quantity-x.shipped} unit)</option>)}
  </select></label>
  <label>Tanggal kirim<input type="date" name="deliveredOn" defaultValue={today()} required/></label>
  <label>Jumlah dikirim<input type="number" name="quantity" min="1" step="1" required/></label>
  <label className="wide">Catatan pengiriman<input name="note" maxLength={400} placeholder="Kurir, kendaraan, bukti pengiriman"/></label>
  <SubmitButton className="primary-button" disabled={!available.length}>Kirim & Terbitkan Nota</SubmitButton>
 </form><p className="form-hint">Satu pengiriman untuk satu baris produk. Pengiriman sebagian didukung; sistem membuat nomor nota dan tagihan secara otomatis.</p>
 </Panel>}
 <Panel title="Daftar Order" detail={orders.length+" order"}>{orders.length===0?<Empty label="order"/>:<div className="table-wrap"><table><thead><tr><th>Tanggal</th><th>Outlet</th><th>Status</th><th>Order (unit)</th><th>Terkirim (unit)</th><th>Nilai Order</th></tr></thead>
 <tbody>{orders.map(o=><tr key={o.id}><td>{o.ordered_on}</td><td>{o.outlet}</td><td>{o.status.replaceAll("_"," ")}</td><td>{o.items}</td><td>{o.shipped}</td><td>{rupiah(o.total)}</td></tr>)}</tbody></table></div>}</Panel></>;
}
