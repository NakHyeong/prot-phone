// 휴대폰 판 오프라인 도우미: 한 번 받은 파일(껍데기·엔진·그림·파이썬)을 휴대폰에 두고, 인터넷이 없어도 그것으로 연다.
// 껍데기와 엔진은 인터넷이 되면 새 판을 먼저 받고(안 되면 둔 것), 파이썬과 그림은 둔 것을 먼저 쓴다.
const CACHE='prot-phone-v1';
const FRESH=['index.html','worker.js','engine.json','manifest.json','./'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FRESH)).catch(()=>{}));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  const req=e.request;if(req.method!=='GET')return;
  const url=new URL(req.url);const mine=url.origin===location.origin;const python=url.hostname==='cdn.jsdelivr.net'&&url.pathname.startsWith('/pyodide/');
  if(!mine&&!python)return;
  const fresh=mine&&!url.pathname.includes('/assets/');
  e.respondWith(caches.open(CACHE).then(async c=>{
    const kept=await c.match(req,{ignoreSearch:true});
    if(kept&&!fresh)return kept;
    try{const r=await fetch(req);if(r.ok||r.type==='opaque')c.put(req,r.clone());return r;}   // 일꾼이 불러오는 파이썬 시작 파일은 내용을 볼 수 없는 응답으로 오지만 그대로 둘 수 있다
    catch(err){if(kept)return kept;throw err;}
  }));
});
