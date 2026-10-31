import {randomUUID} from "node:crypto";
import {requireActor} from "@/lib/access";
import {listProducts} from "@/lib/operations";
import {listCoconutReceipts,listProduction} from "@/lib/coconut-operations";
import {PageHead,Panel,Notice,Empty} from "@/components/ui";
import {ProductionComposer} from "@/components/production-composer";
export const dynamic="force-dynamic";
const today=()=>new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Jakarta",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
export default async function Production({searchParams}:{searchParams:Promise<{success?:string}>}){
 await requireActor(["owner","admin"]);
 const [batches,products,runs,params]=await Promise.all([listCoconutReceipts(),listProducts(),listProduction(),searchParams]);
 const available=batches.filter(b=>b.accepted_qty-b.consumed_qty>0);
 return <><PageHead eyebrow="PRODUKSI / HARIAN" title="Pengupasan & Hasil Produksi" description="Bahan baku lolos QC dipakai untuk produksi, lalu hasil produk jadi masuk stok otomatis."/><Notice success={params.success}/>
 <Panel title="Catat produksi">
  <ProductionComposer batches={available} products={products} requestKey={randomUUID()} date={today()}/>
 </Panel>
 <Panel title="Riwayat produksi">{runs.length===0?<Empty label="produksi"/>:<div className="table-wrap"><table><thead><tr><th>Tanggal</th><th>Supplier bahan</th><th>Bahan terpakai</th><th>Dikupas</th><th>Produk jadi</th><th>Hasil</th></tr></thead><tbody>{runs.map(r=><tr key={r.id}><td>{r.production_date}</td><td>{r.supplier}</td><td>{r.coconut_used}</td><td>{r.peeled_qty}</td><td>{r.product}</td><td>{r.produced_qty}</td></tr>)}</tbody></table></div>}</Panel></>;
}
