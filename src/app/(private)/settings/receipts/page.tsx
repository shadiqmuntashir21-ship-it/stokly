import Link from "next/link";
import {requireOwner} from "@/lib/access";
import {receiptSetupStatus} from "@/lib/receipt-setup";
import {PageHead,Panel,Notice} from "@/components/ui";
import {SubmitButton} from "@/components/submit-button";
import {activateReceiptAction} from "./actions";
export const dynamic="force-dynamic";
export default async function ReceiptSettings({searchParams}:{searchParams:Promise<{success?:string;error?:string}>}){
 await requireOwner();
 const [status,p]=await Promise.all([receiptSetupStatus(),searchParams]);
 const active=status.nextNumber!==null;
 return <><PageHead eyebrow="OWNER / PENOMORAN" title="Nomor Kwitansi Otomatis" description="Aktivasi sekali setelah memastikan nomor historis Kanda agar tidak terjadi kwitansi ganda."/><Notice success={p.success} error={p.error}/>
 <Panel title={active?"Penomoran sudah aktif":"Aktivasi nomor kwitansi 7 digit"}>
  <p>Format: <b>0000001, 0000002, ...</b> tanpa reset bulanan. Setiap nomor unik dan tidak dapat digunakan ulang.</p>
  <p>Nomor berikutnya: <b>{active?String(status.nextNumber).padStart(7,"0"):"BELUM DIAKTIFKAN"}</b></p>
  <p>Order V3 yang masih menunggu nomor: <b>{status.pending}</b>.</p>
  <p>Order lama yang belum dicocokkan: <b>{status.legacy}</b>. Order lama tidak diberi nomor otomatis tanpa mencocokkan kwitansi fisiknya.</p>
  <form action={activateReceiptAction} className="form-grid">
   {!active&&<label className="wide">Nomor berikutnya yang BENAR-BENAR BELUM digunakan<input name="nextNumber" required type="number" min="1" max="9999999" step="1" placeholder="Misal 352 jika 0000351 adalah nomor terakhir" /></label>}
   <label className="wide"><input name="confirmed" type="checkbox" value="yes" required/> Saya sudah memeriksa keseluruhan spreadsheet dan buku kwitansi fisik; nomor ini belum pernah diterbitkan.</label>
   <SubmitButton className="primary-button">{active?"Tetapkan nomor untuk order V3 tertunda":"Aktifkan & beri nomor order V3 tertunda"}</SubmitButton>
  </form>
  <p className="form-hint">Jangan menggunakan nomor terbesar dari tangkapan layar yang sedang difilter. Nomor yang telah diaktifkan tidak bisa di-reset dari halaman ini.</p>
 </Panel>
 <p><Link href="/orders">Kembali ke Order Outlet</Link></p>
 </>;
}
