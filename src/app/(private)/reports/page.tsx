import { requireActor } from "@/lib/access";
import { query } from "@/lib/db";
import { PageHead,Panel,rupiah,Empty } from "@/components/ui";
export const dynamic="force-dynamic";
export default async function Reports(){
 await requireActor(["owner","admin"]);
 const rows=await query<{report_date:string;count:string;total:string}>(`SELECT to_char(created_at AT TIME ZONE 'Asia/Jakarta','YYYY-MM-DD') AS report_date,COUNT(*)::text AS count,SUM(total)::text AS total FROM sales WHERE status='completed' GROUP BY 1 ORDER BY 1 DESC LIMIT 30`);
 const moves=await query<{name:string;quantity_delta:number;source_type:string;created_at:Date}>(`SELECT p.name,m.quantity_delta,CASE WHEN m.source_type='adjustment' AND EXISTS(SELECT 1 FROM goods_issues g WHERE g.id=m.source_id) THEN 'goods_issue' ELSE m.source_type END AS source_type,m.created_at FROM stock_movements m JOIN products p ON p.id=m.product_id ORDER BY m.created_at DESC LIMIT 40`);
 return <><PageHead eyebrow="ANALYTICS / REPORTS" title="Laporan Bisnis" description="Pantau penjualan dan mutasi stok dari transaksi yang telah dicatat."/>
 <Panel title="Ringkasan penjualan" detail="Maksimal 30 tanggal terakhir yang memiliki transaksi">{rows.length===0?<Empty label="laporan penjualan"/>:<div className="table-wrap"><table><thead><tr><th>Tanggal</th><th>Transaksi</th><th>Total bruto</th></tr></thead><tbody>{rows.map(r=><tr key={r.report_date}><td>{r.report_date}</td><td>{r.count}</td><td className="strong-cell">{rupiah(r.total)}</td></tr>)}</tbody></table></div>}</Panel>
 <Panel title="Mutasi stok terbaru">{moves.length===0?<Empty label="mutasi stok"/>:<div className="table-wrap"><table><thead><tr><th>Tanggal</th><th>Produk</th><th>Sumber</th><th>Perubahan</th></tr></thead><tbody>{moves.map((m,i)=><tr key={i}><td>{new Date(m.created_at).toLocaleString("id-ID")}</td><td>{m.name}</td><td>{m.source_type}</td><td className={m.quantity_delta<0?"negative":"positive"}>{m.quantity_delta>0?"+":""}{m.quantity_delta}</td></tr>)}</tbody></table></div>}</Panel></>;
}
