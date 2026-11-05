import Link from "next/link";
import {requireOwner} from "@/lib/access";
import {PageHead,Panel} from "@/components/ui";
export const dynamic="force-dynamic";
const options=[
 {title:"Penomoran Kwitansi",detail:"Lihat seri otomatis dan penanganan nomor tertunda",url:"/settings/receipts"},
 {title:"Kwitansi Lama",detail:"Tautkan nomor fisik atau terbitkan nomor dari seri baru",url:"/owner/receipts"},
 {title:"Master Produk & Harga",detail:"Kelola harga, stok minimum dan produk aktif",url:"/products"},
 {title:"Supplier & Petani",detail:"Data pemasok dan kontak pembelian",url:"/suppliers"},
 {title:"Grade & Harga Beli",detail:"Standar ketebalan, kategori kelapa, dan harga supplier",url:"/procurement"},
 {title:"Data Outlet",detail:"Kelola outlet, G.O, dan kontak pelanggan",url:"/outlets"},
 {title:"HPP & Kebijakan Biaya",detail:"Alokasi biaya produksi dan klasifikasi pengeluaran",url:"/owner/finance"},
 {title:"PIN Owner",detail:"Ganti PIN khusus Owner tanpa mengubah akses bebas Admin/Marketing",url:"/settings/security"},
 {title:"Arsip & Tutup Buku Tahunan",detail:"Unduh arsip, periksa checksum, dan lindungi data berjalan",url:"/owner/archive"},
 {title:"Penutupan Harian",detail:"Simpan snapshot dan cocokkan transaksi harian",url:"/closeout"}
];
export default async function OwnerSettings(){
 await requireOwner();
 return <><PageHead eyebrow="OWNER / PENGATURAN" title="Pusat Pengaturan Bisnis" description="Satu tempat untuk standar usaha, keamanan Owner, nomor kwitansi, dan pengelolaan data jangka panjang."/>
 <Panel title="Pengaturan utama"><div className="simple-list">{options.map(x=><div key={x.url}><span><strong>{x.title}</strong><small>{x.detail}</small></span><Link href={x.url}>Buka →</Link></div>)}</div></Panel>
 <p className="form-hint">Admin dan Marketing tetap bisa masuk tanpa PIN. Perubahan kebijakan keuangan dan pengarsipan hanya dapat dijalankan lewat sesi Owner yang terautentikasi.</p>
 </>;
}
