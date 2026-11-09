const CACHE='sttp-shell-v4';
const CORE=['./','./index.html','./styles.css','./app.js','./manifest.webmanifest','./data/routes.geojson','./data/contact-network.geojson','./data/network-elements.geojson','./data/stops.geojson'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('sttp-shell-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;const u=new URL(e.request.url);if(u.searchParams.has('v')){e.respondWith(fetch(e.request,{cache:'no-store'}));return;}e.respondWith(caches.match(e.request).then(cached=>cached||fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r}).catch(()=>caches.match('./index.html'))));});
