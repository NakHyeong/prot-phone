// 휴대폰 판 오프라인 도우미: 한 번 받은 파일을 휴대폰에 두고, 인터넷이 없어도 그것으로 연다.
// - 껍데기·엔진·배경 목록: 인터넷이 되면 새 판을 먼저 받고, 안 되면 둔 것을 쓴다.
// - 파이썬: 둔 것을 먼저 쓴다.
// - 해시 이름 그림: 둔 것을 먼저 쓰고, 그림 전용 저장소에 최근 것만 MAX_IMAGES개 남긴다.
// - 세이브는 브라우저 데이터베이스 저장소에 있어 여기서 건드리지 않는다. 같은 주소의 다른 앱 저장소도 지우지 않는다(이름이 prot-phone-로 시작하는 것만 정리).
const SHELL='prot-phone-v1',IMAGES='prot-phone-images-v1',MAX_IMAGES=40,MAX_IMAGE_BYTES=8*1024*1024,MAX_ONE_IMAGE=1024*1024;   // 그림 저장소: 최대 40장·합계 8MiB, 1MiB 넘는 그림은 두지 않는다
const FRESH=['index.html','route.js','worker.js','engine.json','manifest.json','./'];
const IMAGE=/\/assets\/(asset-[0-9a-f]{20}\.webp|[A-Za-z0-9_-]+\.[0-9a-f]{16}\.webp)$/;
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(SHELL).then(c=>c.addAll(FRESH)).catch(()=>{}));});   // 배경은 미리 받지 않는다
self.addEventListener('activate',e=>{e.waitUntil((async()=>{
  for(const k of await caches.keys())if(k.startsWith('prot-phone-')&&![SHELL,IMAGES].includes(k))await caches.delete(k);
  const shell=await caches.open(SHELL);   // 예전 판이 껍데기 저장소에 넣어 둔 그림은 그림 저장소 몫이라 뺀다
  for(const r of await shell.keys())if(IMAGE.test(new URL(r.url).pathname))await shell.delete(r);
  await self.clients.claim();
})());});

async function trim(c){   // 최근 것부터 세어, 장수나 합계 용량을 넘는 오래된 것을 지운다
  const keys=await c.keys();let bytes=0;
  for(let i=keys.length-1;i>=0;i--){
    const kept=await c.match(keys[i]);bytes+=kept?(await kept.blob()).size:0;
    if(keys.length-i>MAX_IMAGES||bytes>MAX_IMAGE_BYTES)await c.delete(keys[i]);
  }
}
async function firstKept(req,name,limit){
  const c=await caches.open(name);const kept=await c.match(req,{ignoreSearch:true});if(kept)return kept;
  const r=await fetch(req);
  if(limit){   // 그림: 정상 응답이고 1MiB 이하일 때만 둔다
    if(r.ok&&(await r.clone().blob()).size<=MAX_ONE_IMAGE){await c.put(req,r.clone());await trim(c);}
  }else if(r.ok||r.type==='opaque')await c.put(req,r.clone());   // 일꾼이 불러오는 파이썬 시작 파일은 내용을 볼 수 없는 응답으로 오지만 그대로 둘 수 있다
  return r;
}
async function firstFresh(req){
  const c=await caches.open(SHELL);
  try{const r=await fetch(req,{cache:'no-cache'});if(r.ok)await c.put(req,r.clone());return r;}
  catch(err){const kept=await c.match(req,{ignoreSearch:true});if(kept)return kept;throw err;}
}
self.addEventListener('fetch',e=>{
  const req=e.request;if(req.method!=='GET')return;
  const url=new URL(req.url);const mine=url.origin===location.origin;const python=url.hostname==='cdn.jsdelivr.net'&&url.pathname.startsWith('/pyodide/');
  if(python)return e.respondWith(firstKept(req,SHELL,false));
  if(!mine||!url.pathname.startsWith(new URL('./',location.href).pathname))return;   // 이 앱 폴더 밖은 손대지 않는다
  if(IMAGE.test(url.pathname))return e.respondWith(firstKept(req,IMAGES,true));
  e.respondWith(firstFresh(req));   // 껍데기·엔진·배경 목록(backgrounds-v1.json)
});
