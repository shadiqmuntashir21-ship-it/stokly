import {randomUUID} from "node:crypto";
import Link from "next/link";
import {query} from "@/lib/db";
import {requireActor} from "@/lib/access";
import {listProducts} from "@/lib/operations";
import {outlets} from "@/lib/v2-master";
import {listOrders,listOrderLines,receiptNumberReady} from "@/lib/order-operations";
import {PageHead,Panel,Empty,Notice,rupiah} from "@/components/ui";
import {OrderComposer} from "@/components/order-composer";
import {DispatchComposer} from "@/components/dispatch-composer";
export const dynamic="force-dynamic";
export default async function Orders({searchParams}:{searchParams:Promise<{success?:string;error?:string;repeat?:string;dispatch?:string}>}){
 const actor=await requireActor(["owner","admin","marketing"]);
 const [products,outletList,orders,lines,ready,params]=await Promise.all([listProducts(),outlets(),listOrders(),listOrderLines(),receiptNumberReady(),searchParams]);
 const remaining=lines.filter(x=>x.quantity>x.shipped);
 const original=orders.find(o=>o.id===params.repeat);
 const repeat=original?await query<{productId:string;quantity:number}>("SELECT product_id::text AS \"productId\",quantity FROM customer_order_items WHERE order_id=$1 ORDER BY id",[original.id]):[];
 const initialOutlet=original?(await query<{outlet_id:string}>("SELECT outlet_id::text FROM customer_orders WHERE id=$1",[original.id]))[0]?.outlet_id:"";
 const initialItems=repeat.map(x=>({productId:x.productId,quantity:x.quantity,unitPrice:null}));

 return <><PageHead eyebrow="DISTRIBUSI / TRANSAKSI" title="Order Outlet" description="Harga transaksi bisa disesuaikan oleh Admin/Owner. Satu pengiriman bisa berisi banyak item."/><Notice success={params.success} error={params.error}/>
 {!ready&&actor.role==="owner"&&<p className="form-hint">Nomor kwitansi belum diaktifkan. <Link href="/settings/receipts">Aktifkan penomoran di Pengaturan Owner</Link> setelah memeriksa spreadsheet dan buku fisik.</p>}
 <Panel title={original?"Salin order sebelumnya":"Order Baru"} detail="Nomor kwitansi 7 digit otomatis setelah aktivasi">
  <OrderComposer products={products} outlets={outletList} requestKey={randomUUID()} canOverride={actor.role!=="marketing"} numberReady={ready} initialOutlet={initialOutlet||""} initialItems={initialItems}/>
 </Panel>
 {actor.role!=="marketing"&&<Panel title="Pengiriman & Nota Keluar" detail={remaining.length+" jenis item menunggu pengiriman"}>
  <DispatchComposer lines={remaining} requestKey={randomUUID()} initialOrderId={params.dispatch||""}/>
 </Panel>}
 <Panel title="Daftar Order" detail={orders.length+" order"}>{orders.length===0?<Empty label="order"/>:<div className="table-wrap"><table><thead><tr><th>No. Kwitansi</th><th>Tanggal</th><th>Outlet</th><th>Status</th><th>Dipesan</th><th>Terkirim</th><th>Nilai order</th><th>Tindakan</th></tr></thead><tbody>{orders.map(o=><tr key={o.id}><td className="mono">{o.document_number||"Menunggu nomor / legacy"}</td><td>{o.ordered_on}</td><td>{o.outlet}</td><td>{o.status.replaceAll("_"," ")}</td><td>{o.items}</td><td>{o.shipped}</td><td>{rupiah(o.total)}</td><td><Link href={"/orders/"+o.id}>Detail</Link> · <Link href={"/orders?repeat="+o.id}>Salin</Link> · {o.status!=="delivered"&&o.status!=="cancelled"&&actor.role!=="marketing"&&<Link href={"/orders?dispatch="+o.id}>Kirim</Link>}</td></tr>)}</tbody></table></div>}</Panel>
 </>;
}
