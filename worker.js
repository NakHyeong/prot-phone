// 휴대폰 판 엔진 일꾼: 파이오다이드(브라우저 안 파이썬)로 진짜 게임 엔진을 돌린다.
// 화면과 따로 돌아서, 세계가 흐르는 동안에도 화면이 멈추지 않는다.
const PYODIDE='https://cdn.jsdelivr.net/pyodide/v0.27.2/full/';
importScripts(PYODIDE+'pyodide.js');
let py,bridge;
const say=(type,data={})=>postMessage({type,...data});
const sync=fill=>new Promise((ok,no)=>py.FS.syncfs(fill,e=>e?no(e):ok()));   // fill=true: 저장소 → 메모리, false: 메모리 → 저장소

async function boot(){
  const t0=performance.now();
  say('progress',{text:'파이썬을 불러오는 중입니다(처음에는 1~2분 걸릴 수 있습니다)'});
  py=await loadPyodide({indexURL:PYODIDE});
  await py.loadPackage('sqlite3');
  say('progress',{text:'저장된 세계를 찾는 중입니다'});
  py.FS.mkdirTree('/save');py.FS.mount(py.FS.filesystems.IDBFS,{},'/save');await sync(true);
  say('progress',{text:'게임 엔진을 불러오는 중입니다'});
  const files=await (await fetch('engine.json',{cache:'no-cache'})).json();
  for(const [name,text] of Object.entries(files)){const p='/app/'+name;py.FS.mkdirTree(p.slice(0,p.lastIndexOf('/')));py.FS.writeFile(p,text);}
  say('progress',{text:'세계를 여는 중입니다(처음이면 새 세계를 만듭니다)'});
  py.runPython("import sys; sys.path.insert(0,'/app')");
  bridge=py.pyimport('bridge');
  await sync(false);
  say('ready',{seconds:Math.round((performance.now()-t0)/100)/10});
}
const started=boot().catch(e=>say('fail',{text:String(e&&e.message||e)}));

let queue=Promise.resolve();
onmessage=e=>{queue=queue.then(()=>work(e.data)).catch(err=>say('fail',{text:String(err)}));};

async function work(m){
  await started;
  if(!bridge){postMessage({type:'reply',id:m.id,status:503,kind:'application/json',text:JSON.stringify({error:'게임 엔진을 열지 못했습니다.'})});return;}
  const r=bridge.handle_text(m.method,m.path,m.body||'');const [status,kind,text]=r.toJs();r.destroy();
  postMessage({type:'reply',id:m.id,status,kind,text});
  let drained=0;
  if(bridge.pending()>0){   // 한 달 진행처럼 응답 뒤로 미룬 일을 이어서 한다
    say('busy');const t1=performance.now();drained=bridge.drain();
    say('idle',{jobs:drained,seconds:Math.round((performance.now()-t1)/100)/10});
  }
  if(m.method!=='GET'||drained)await sync(false);   // 바뀐 것이 있으면 휴대폰 저장소에 쓴다
}
