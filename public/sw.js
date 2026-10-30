const CACHE="stokly-shell-v2";
const OFFLINE=["/offline.html","/icons/icon.svg"];
self.addEventListener("install",event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(OFFLINE)))});
self.addEventListener("activate",event=>{event.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))),self.clients.claim()]))});
self.addEventListener("message",event=>{if(event.data?.type==="SKIP_WAITING")self.skipWaiting()});
self.addEventListener("fetch",event=>{
 if(event.request.method!=="GET")return;
 const url=new URL(event.request.url);
 if(url.origin!==self.location.origin)return;
 if(event.request.mode==="navigate"){
   event.respondWith(fetch(event.request).catch(()=>caches.match("/offline.html")));
 }else if(url.pathname==="/icons/icon.svg"){
   event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request)));
 }
});
