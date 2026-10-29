// 휴대폰 판 길 나누기(코덱스 배경 계약 v1): 게임 상태 요청은 휴대폰 안 엔진으로,
// 배경 목록과 내용 해시 이름 그림만 진짜 네트워크로 보낸다. 깃허브 페이지 같은 하위 경로(/prot-phone/)도 지킨다.
(function(root){
  const LIST='/assets/backgrounds-v1.json';
  const NAME=/^(asset-[0-9a-f]{20}\.webp|[A-Za-z0-9_-]+\.[0-9a-f]{16}\.webp|backgrounds-v1\.json)$/;
  const folder=base=>{const b=new URL(base);b.search='';b.hash='';b.pathname=b.pathname.replace(/[^/]*$/,'');return b;};
  // "/assets/이름" 꼴이고 허용된 이름일 때만 참
  function isStatic(path){return typeof path==='string'&&path.startsWith('/assets/')&&NAME.test(path.slice(8));}
  // 이미 풀린 주소(기준 주소/assets/이름)인지
  function isResolved(url,base){const dir=new URL('assets/',folder(base)).href;return typeof url==='string'&&url.startsWith(dir)&&NAME.test(url.slice(dir.length));}
  // "/assets/이름"을 기준 주소 아래 진짜 주소로 푼다. 허용되지 않은 주소는 오류
  function assetURL(path,base){
    if(isResolved(path,base))return path;
    if(!isStatic(path))throw new Error('허용되지 않은 그림 주소: '+path);
    return new URL(path.slice(1),folder(base)).href;
  }
  const api={LIST,isStatic,isResolved,assetURL};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ProtRoute=api;
})(typeof window!=='undefined'?window:globalThis);
