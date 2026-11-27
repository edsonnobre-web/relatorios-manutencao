const CACHE_NAME='techreport-v8-9-rc4';
const APP_SHELL=['./index.html','./css/style.css?v=89rc4',...['utils','report-storage','pdf-styles','pdf-layout','help','direct-pdf','app','connection'].map(n=>'./js/'+n+'.js?v=89rc4'),'./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png','./icons/apple-touch-icon.png'];
self.addEventListener('install',e=>e.waitUntil((async()=>{const c=await caches.open(CACHE_NAME);await c.addAll(APP_SHELL.map(u=>new Request(u,{cache:'reload'})));await self.skipWaiting()})()));
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET'||new URL(r.url).origin!==location.origin)return;e.respondWith((async()=>{const c=await caches.open(CACHE_NAME);if(r.mode==='navigate')return await c.match('./index.html')||fetch(r);return await c.match(r)||fetch(r)})())});
