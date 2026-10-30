import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/", name: "STOKLY — Retail Management", short_name: "STOKLY",
    description: "Kelola stok, penjualan, dan retur dalam satu aplikasi.",
    start_url: "/dashboard", scope: "/", display: "standalone",
    background_color: "#f6f7f9", theme_color: "#123e3a", lang: "id",
    icons: [{src:"/icons/icon.svg", sizes:"any", type:"image/svg+xml", purpose:"any maskable"}]
  };
}
