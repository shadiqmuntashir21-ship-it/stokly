import {requireOwner} from "@/lib/access";
import {listProductionCosts} from "@/lib/costing-operations";
import type {CostLine} from "@/lib/costing-operations";
import {PageHead,Panel,Notice,Empty,rupiah} from "@/components/ui";
import {allocateCosts} from "./actions";
export const dynamic="force-dynamic";
export default async function Costing({searchParams}:{searchParams:Promise<{success?:string;error?:string}>}){
 await requireOwner();
 const [lines,params]=await Promise.all([listProductionCosts(),searchParams]);
 const grouped=new Map<string,CostLine[]>();
 for(const line of lines){const rows=grouped.get(line.production_id)||[];rows.push(line);grouped.set(line.production_id,rows);}
 const runs=[...grouped.entries()];
 return <><PageHead eyebrow="OWNER / COST ACCOUNTING" title="Alokasi Biaya Produksi" description="Hitung biaya bahan baku dan biaya produksi per batch, lalu bagi ke produk jadi yang dihasilkan."/>
 <Notice success={params.success} error={params.error}/>
 <Panel title="Dasar perhitungan"><div style={{padding:22}}>
 <p>Biaya bahan baku untuk proses = nilai pembelian batch × (jumlah butir digunakan / jumlah butir lolos QC). Biaya tenaga produksi langsung dan overhead yang ditautkan ke proses ditambahkan, kemudian dibagi ke setiap produk berdasarkan persentase alokasi.</p>
 <p className="small-muted">QC seluruh batch harus selesai sebelum bahan baku dianggap final. Alokasi 100% tidak otomatis berarti HPP penjualan sudah tersedia; HPP penjualan memerlukan lapisan persediaan dan penelusuran biaya saat barang dikirim.</p>
 </div></Panel>
 <Panel title="Proses produksi & alokasi">{runs.length===0?<Empty label="proses produksi untuk costing"/>:<div className="product-manage-list">
 {runs.map(([id,items])=>{
  const first=items[0],all=items.every(x=>x.share_pct!==null),shares=items.reduce((sum,x)=>sum+Number(x.share_pct||0),0);
  const ready=first.qc_complete&&all&&Math.abs(shares-100)<0.0001;
  const raw=Number(first.raw_cost||0),other=Number(first.other_cost||0),total=raw+other;
  return <section className="manage-item" key={id}>
   <div className="manage-item-head"><div><strong>Produksi {first.production_date}</strong><p className="small-muted">{id.slice(0,8)} · {items.length} produk hasil</p></div>
   <span className={ready?"status-success":"status-danger"}>{ready?"Biaya teralokasi":"Butuh alokasi / QC"}</span></div>
   <p className="small-muted">Bahan baku: {first.raw_cost===null?"Menunggu QC lengkap":rupiah(raw)} · Biaya produksi terkait: {rupiah(other)} · Total: {first.raw_cost===null?"Belum final":rupiah(total)}</p>
   <form action={allocateCosts} className="form-grid">
    <input type="hidden" name="productionId" value={id}/>
    {items.map(x=><div key={x.product_id} style={{minWidth:0}}>
     <input name="productId" type="hidden" value={x.product_id}/>
     <label>{x.product} · {x.produced_qty} {x.unit}
       <input name="pct" type="number" min=".01" max="100" step=".01" defaultValue={x.share_pct??(items.length===1?"100":"")} placeholder="Persentase biaya %" required/></label>
     {ready&&<p className="small-muted">Alokasi: {rupiah(total*Number(x.share_pct)/100)} · Estimasi biaya per {x.unit}: {rupiah(total*Number(x.share_pct)/100/x.produced_qty)}</p>}
    </div>)}
    <button className="primary-button">Simpan Alokasi 100%</button>
   </form>
  </section>;
 })}</div>}</Panel>
 </>;
}
