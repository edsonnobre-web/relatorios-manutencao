const CACHE_NAME='techreport-v8-8-rc2-icon-refresh';
const APP_SHELL=[
 './',
 './index.html',
 './index.html?app=techreport-v2',
 './css/style.css',
 './js/utils.js',
 './js/pdf-styles.js',
 './js/pdf-layout.js',
 './js/help.js',
 './js/app.js',
 './manifest.webmanifest',
 './icons/techreport-icon-192-v2.png',
 './icons/techreport-icon-512-v2.png',
 './icons/techreport-maskable-192-v2.png',
 './icons/techreport-maskable-512-v2.png',
 './icons/techreport-apple-touch-v2.png'
];

self.addEventListener('install', event=>{
 event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(APP_SHELL)));
 self.skipWaiting();
});

self.addEventListener('activate', event=>{
 event.waitUntil(
  caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE_NAME).map(key=>caches.delete(key))))
 );
 self.clients.claim();
});

self.addEventListener('fetch', event=>{
 if(event.request.method!=='GET') return;
 const url=new URL(event.request.url);
 const freshAsset=url.pathname.endsWith('manifest.webmanifest') || url.pathname.includes('/icons/');

 if(freshAsset){
  event.respondWith(
   fetch(event.request,{cache:'no-store'})
    .then(response=>{
     const copy=response.clone();
     caches.open(CACHE_NAME).then(cache=>cache.put(event.request,copy));
     return response;
    })
    .catch(()=>caches.match(event.request))
  );
  return;
 }

 event.respondWith(
  fetch(event.request)
   .then(response=>{
    const copy=response.clone();
    caches.open(CACHE_NAME).then(cache=>cache.put(event.request,copy));
    return response;
   })
   .catch(()=>caches.match(event.request).then(cached=>cached||caches.match('./index.html')))
 );
});
