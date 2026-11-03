import {randomUUID} from "node:crypto";
import {requireActor} from "@/lib/access";
import {listProducts} from "@/lib/operations";
import {outlets} from "@/lib/v2-master";
import {listOrders,listOrderLines,receiptNumberReady} from "@/lib/order-operations";
import {PageHead,Panel,Empty,Notice,rupiah} from "@/components/ui";
import {OrderComposer} from "@/components/order-composer";
import {DispatchComposer} from "@/components/dispatch-composer";
export const dynamic="force-dynamic";
export default async function Orders({searchParams}:{searchParams:Promise<{success?:string;error?:string}>}){
 const actor=await requireActor(["owner","admin","marketing"]);
 const [products,outletList,orders,lines,ready,params]=await Promise.all([listProducts(),outlets(),listOrders(),listOrderLines(),receiptNumberReady(),searchParams]);
 const remaining=lines.filter(x=>x.quantity>x.shipped);
 return <><PageHead eyebrow="DISTRIBUSI / TRANSAKSI" title="Order Outlet" description="Harga transaksi bisa disesuaikan oleh Admin/Owner. Satu pengiriman bisa berisi banyak item."/><Notice success={params.success} error={params.error}/>
 <Panel title="Order Baru" detail="Nomor kwitansi 7 digit otomatis">
  <OrderComposer products={products} outlets={outletList} requestKey={randomUUID()} canOverride={actor.role!=="marketing"} numberReady={ready}/>
 </Panel>
 {actor.role!=="marketing"&&<Panel title="Pengiriman & Nota Keluar" detail={remaining.length+" jenis item menunggu pengiriman"}>
  <DispatchComposer lines={remaining} requestKey={randomUUID()}/>
 </Panel>}
 <Panel title="Daftar Order" detail={orders.length+" order"}>{orders.length===0?<Empty label="order"/>:<div className="table-wrap"><table><thead><tr><th>No. Kwitansi</th><th>Tanggal</th><th>Outlet</th><th>Status</th><th>Dipesan</th><th>Terkirim</th><th>Nilai order</th></tr></thead><tbody>{orders.map(o=><tr key={o.id}><td className="mono">{o.document_number||"Belum direkonsiliasi"}</td><td>{o.ordered_on}</td><td>{o.outlet}</td><td>{o.status.replaceAll("_"," ")}</td><td>{o.items}</td><td>{o.shipped}</td><td>{rupiah(o.total)}</td></tr>)}</tbody></table></div>}</Panel>
 </>;
}
