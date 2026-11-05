import Link from "next/link";
import {requireOwner} from "@/lib/access";
import {unnumberedReceipts} from "@/lib/receipt-reconciliation";
import {receiptSetupStatus} from "@/lib/receipt-setup";
import {PageHead,Panel,Notice,Empty} from "@/components/ui";
import {SubmitButton} from "@/components/submit-button";
import {reconcileReceiptAction} from "./actions";

export const dynamic="force-dynamic";
export default async function ReceiptReconciliation({searchParams}:{searchParams:Promise<{success?:string;error?:string}>}){
 await requireOwner();
 const [items,settings,p]=await Promise.all([unnumberedReceipts(),receiptSetupStatus(),searchParams]);
 return <>
  <PageHead eyebrow="OWNER / KONTROL TRANSAKSI" title="Nomor Kwitansi Lama" description="Hubungkan nomor fisik lama atau terbitkan nomor baru dari seri STOKLY, tanpa menimpa kwitansi lain."/>
  <Notice success={p.success} error={p.error}/>
  <Panel title="Aturan penomoran">
   <div style={{padding:20}}>
    <p>Seri otomatis STOKLY: <strong>{settings.nextNumber===null?"Belum aktif":String(settings.nextNumber).padStart(7,"0")+" berikutnya"}</strong>.</p>
    <p className="form-hint">Nomor historis tidak diberi otomatis saat migrasi. Pilih “Sudah punya kwitansi fisik” untuk menautkan nomor yang benar-benar diterbitkan, atau “Terbitkan nomor baru” jika belum memiliki kwitansi.</p>
    <p className="form-hint">Nomor lama diperiksa terhadap nomor yang sudah tercatat di STOKLY. Untuk nota yang berada di buku fisik atau spreadsheet di luar aplikasi, Owner wajib memeriksa secara manual sebelum menyimpan.</p>
    <p><Link href="/settings/receipts">Pengaturan penomoran →</Link></p>
   </div>
  </Panel>
  <Panel title="Order yang belum bernomor" detail={items.length+" order ditampilkan"}>
   {!items.length?<Empty label="order yang menunggu nomor"/>:<div className="product-manage-list">{items.map(x=>
    <details className="edit-detail" key={x.id}>
     <summary>{x.outlet} · {x.ordered_on} · {x.status.replaceAll("_"," ")} · {x.deliveries} pengiriman</summary>
     <div style={{padding:12}}><Link href={"/orders/"+x.id}>Lihat detail order</Link>
      {x.deliveries===0?<p className="form-hint">Nota terbit otomatis ketika order ini dikirim. Tidak perlu menetapkan nomor sekarang.</p>:
      <form action={reconcileReceiptAction} className="form-grid">
       <input name="orderId" type="hidden" value={x.id}/>
       <label>Metode penomoran<select name="mode" defaultValue="new_sequence">
        <option value="new_sequence">Terbitkan nomor baru STOKLY (otomatis)</option>
        <option value="physical_existing">Sudah punya kwitansi fisik lama</option>
       </select></label>
       <label>Nomor fisik lama (jika ada)<input name="physicalNumber" pattern="[0-9]{7}" maxLength={7} placeholder="Contoh 0000352"/></label>
       <label className="wide">Alasan / referensi verifikasi<input name="reason" required minLength={8} maxLength={400} placeholder="Contoh: Sudah dicek pada buku kwitansi outlet"/></label>
       <label className="wide"><input type="checkbox" name="verified" value="yes" required/> Saya sudah mengecek buku fisik dan memastikan tidak ada nomor ganda.</label>
       <SubmitButton className="primary-button">Tetapkan Nomor Permanen</SubmitButton>
      </form>}
     </div>
    </details>)}</div>}
  </Panel>
 </>;
}
