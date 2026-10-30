"use client";
import { useEffect, useState } from "react";

export function PwaRegister() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const [online, setOnline] = useState(true);
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    setOnline(navigator.onLine);
    const onOnline = () => setOnline(navigator.onLine);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOnline);
    let active = true;
    let refreshing = false;
    const onControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    navigator.serviceWorker.register("/sw.js").then((reg) => {
      if (!active) return;
      if (reg.waiting) setWaiting(reg.waiting);
      reg.addEventListener("updatefound", () => {
        const sw = reg.installing;
        sw?.addEventListener("statechange", () => {
          if (sw.state === "installed" && navigator.serviceWorker.controller) setWaiting(sw);
        });
      });
    }).catch(() => {});
    return () => {
      active = false;
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOnline);
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);
  return <>
    {!online && <div className="connection-banner">Sedang offline. Transaksi tidak tersedia.</div>}
    {waiting && <div className="update-banner">Pembaruan STOKLY tersedia. <button onClick={() => waiting.postMessage({type:"SKIP_WAITING"})}>Muat versi terbaru</button></div>}
  </>;
}
