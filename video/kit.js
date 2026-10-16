/* Shared helpers for the RWAF videos. Every visual is a pure function of time t
   (seconds), so render.mjs can step frames deterministically. Walkthroughs drive
   the real site in a same-origin iframe; its own transitions are disabled and
   animated here instead. */
const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
const prog=(t,a,b)=>clamp((t-a)/(b-a));
const lerp=(a,b,p)=>a+(b-a)*p;
const E={
  lin:p=>p,
  out3:p=>1-Math.pow(1-p,3),
  out5:p=>1-Math.pow(1-p,5),
  in3:p=>p*p*p,
  io3:p=>p<.5?4*p*p*p:1-Math.pow(-2*p+2,3)/2,
  back:p=>{const c1=1.6,c3=c1+1;return 1+c3*Math.pow(p-1,3)+c1*Math.pow(p-1,2);},
};
const $=s=>document.querySelector(s);
const show=(el,on,display='block')=>{el.style.display=on?display:'none';};
const inRange=(t,[a,b])=>t>=a&&t<b;
// Holds `initial` until each move starts, then eases to its target.
function track(t,initial,moves){
  let v={...initial};
  for(const [a,b,target,ease=E.io3] of moves){
    if(t<a)break;
    const p=ease(prog(t,a,b)),next={};
    for(const k in v)next[k]=k in target?lerp(v[k],target[k],p):v[k];
    v=next;
  }
  return v;
}
function reveal(el,t,start,dur=.45,ease=E.out5){
  const p=ease(prog(t,start,start+dur));
  el.style.transform=`translateY(${(1-p)*110}%)`;
}
function fadeUp(el,t,start,dur=.45,dist=30){
  const p=E.out3(prog(t,start,start+dur));
  el.style.opacity=p;el.style.transform=`translateY(${(1-p)*dist}px)`;
}
function hash(i){const x=Math.sin(i*127.1+311.7)*43758.5453;return x-Math.floor(x);}
// Character i of a typed string appears at a slightly irregular, monotonic time.
function charTimes(text,[a,b]){
  const n=text.length,step=(b-a)/n,out=[];
  for(let i=0;i<n;i++)out.push(a+step*i+step*.55*(hash(i+n)-.5));
  return out;
}
function typed(text,range,t){return text.slice(0,charTimes(text,range).filter(c=>c<=t).length);}
function seeded(arr,seed){
  const a=arr.slice();let s=seed;
  for(let i=a.length-1;i>0;i--){s=(s*9301+49297)%233280;const j=Math.floor(s/233280*(i+1));[a[i],a[j]]=[a[j],a[i]];}
  return a;
}
function tileHTML(logo,cls){
  const c=[cls,logo.shape==='wordmark'?'wm':'',logo.background==='dark'?'dark':''].filter(Boolean).join(' ');
  return `<div class="${c}"><img src="${logo.src}" alt=""></div>`;
}
// Lazy images below the fold never load, so wait for eager ones with a cap.
function imagesLoaded(doc,ms=8000){
  const eager=[...doc.images].filter(img=>img.loading!=='lazy'||img.getBoundingClientRect().top<doc.documentElement.clientHeight);
  const all=Promise.all(eager.map(img=>img.complete?0:new Promise(r=>{img.addEventListener('load',r);img.addEventListener('error',r);})));
  return Promise.race([all,new Promise(r=>setTimeout(r,ms))]);
}
async function loadFonts(){
  await document.fonts.ready;
  await Promise.all(['820 120px Archivo','500 26px "Geist Mono"','600 36px "Instrument Sans"','400 36px "Instrument Sans"'].map(f=>document.fonts.load(f)));
}

/* ---------- shared scenes ---------- */
function renderGlow(t){
  $('#glow').style.transform=`translate(${1200+Math.sin(t*.35)*260-550}px,${-260+Math.cos(t*.27)*140}px)`;
}
function renderTitle(el,t){
  const pe=E.back(prog(t,.12,.6)),ele=el.querySelector('.ele');
  ele.style.transform=`scale(${.4+.6*pe}) rotate(${(1-pe)*-12}deg)`;ele.style.opacity=clamp(pe*2);
  fadeUp(el.querySelector('.kicker'),t,.32,.45,20);
  const lines=el.querySelectorAll('h1 .mask>span');
  reveal(lines[0],t,.48);reveal(lines[1],t,.62);
  fadeUp(el.querySelector('.sub'),t,1.0,.5,24);
  el.querySelector('.wrap').style.transform=`scale(${1+t*.012})`;
}
// Each wipe is [cover start, covered, uncover start, uncovered].
function renderWipe(t,wipes){
  const wipe=wipes.find(w=>t>=w[0]&&t<w[3]);
  show($('#wipe'),!!wipe,'flex');
  if(!wipe)return;
  const pin=E.io3(prog(t,wipe[0],wipe[1])),pout=E.io3(prog(t,wipe[2],wipe[3]));
  $('#wipe').style.transform=`translateY(${(1-pin)*100-pout*100}%)`;
  const pe=E.back(prog(t,wipe[0]+.15,wipe[1]+.12));
  $('#wipe img').style.transform=`scale(${.6+.4*pe})`;
}
function renderEndcard(el,t,t0){
  const q=s=>el.querySelector(s),cta=q('.cta');
  const pe=E.back(prog(t,t0,t0+.45));
  q('.ele').style.transform=`scale(${.5+.5*pe})`;q('.ele').style.opacity=clamp(pe*2);
  reveal(q('h2 .mask>span'),t,t0+.17,.5);
  const pc=E.back(prog(t,t0+.5,t0+.95));
  cta.style.transform=`scale(${.75+.25*pc})`;cta.style.opacity=clamp(pc*2);
  fadeUp(q('.note'),t,t0+.8,.5,24);
  const pw=E.back(prog(t,t0+1.05,t0+1.65));
  q('.wally').style.transform=`translateY(${(1-pw)*420}px) rotate(${Math.sin(Math.max(0,t-t0-1.65)*2.2)*2.2}deg)`;
  const pulse=t>t0+1.55?1+.025*Math.sin((t-t0-1.55)*Math.PI*2/1.6):1;
  cta.style.transform+=` scale(${pulse})`;
}
function renderPills(t,el,ranges){
  el.querySelectorAll('.pill').forEach((p,i)=>{
    const [a,b]=ranges[i];
    const pin=E.out3(prog(t,a,a+.35)),pout=E.in3(prog(t,b-.25,b));
    p.style.display=t>=a&&t<b?'flex':'none';
    p.style.opacity=pin*(1-pout);p.style.transform=`translateY(${(1-pin)*36-pout*24}px)`;
  });
}

/* ---------- browser walkthrough ---------- */
// Zoomed shots keep the page filling the frame, with the browser bar out of view.
function cover({px,py,z}){return {z,px:clamp(px,960/z,1440-960/z),py:clamp(py,600/z,900-480/z)};}
// Puts page point (px,py) at stage (960,600) at zoom z; `enter` slides the window up.
function renderBrowser(t,cam,{enter,url,load,address='rwaf.xyz/ecosystem'}){
  const pe=E.out3(prog(t,...enter));
  const z=cam.z*(.92+.08*pe),tx=960-z*cam.px,ty=600-z*(52+cam.py)+(1-pe)*1100;
  $('#win').style.transform=`translate(${tx}px,${ty}px) scale(${z})`;
  $('#urltext').textContent=typed(address,url,t);
  $('#urlcaret').style.opacity=(t>=url[0]&&t<load[1]&&Math.floor(t*2.5)%2===0)?1:0;
  $('#loadbar').style.width=(t<load[0]?0:E.out3(prog(t,...load))*100)+'%';
  $('#loadbar').style.opacity=1-prog(t,load[1],load[1]+.2);
  $('#site').style.opacity=E.out3(prog(t,load[0]+.12,load[1]+.05));
}
const SITE_CSS=`
*,*::before,*::after{transition:none!important;animation:none!important;scroll-behavior:auto!important}
html{scrollbar-width:none}::-webkit-scrollbar{display:none}
input,select{caret-color:#FF6200}
#vcursor{position:fixed;left:0;top:0;width:34px;height:34px;z-index:10000;pointer-events:none;transform-origin:5px 4px;filter:drop-shadow(0 4px 6px rgba(0,0,0,.28))}
#vripple{position:fixed;left:0;top:0;z-index:9999;border-radius:50%;border:3px solid #FF6200;background:rgba(255,98,0,.12);pointer-events:none;opacity:0}
#vdrop{position:fixed;z-index:9998;background:#fff;border:1px solid #D7CFBE;border-radius:12px;box-shadow:0 26px 60px -20px rgba(32,26,19,.45);padding:6px;font-family:'Instrument Sans',sans-serif;font-size:14.5px;color:#201A13;opacity:0;pointer-events:none;transform-origin:50% 0}
#vdrop div{height:38px;line-height:38px;padding:0 12px;border-radius:8px;white-space:nowrap}
#vdrop div.on{background:rgba(255,98,0,.1);color:#D85300}`;
// Loads a site page into a stage iframe and adds the cursor, ripple and dropdown.
async function loadSite(path,ready='.ec-row',frameSel='#site'){
  const frame=$(frameSel);
  await new Promise(r=>{frame.onload=r;frame.src=path;});
  const W=frame.contentWindow,D=frame.contentDocument;
  for(let i=0;i<200&&!D.querySelector(ready);i++)await new Promise(r=>setTimeout(r,50));
  const style=D.createElement('style');style.textContent=SITE_CSS;D.head.appendChild(style);
  D.body.insertAdjacentHTML('beforeend',`<svg id="vcursor" viewBox="0 0 24 24"><path d="M4 2.6v17.2l4.7-4.3 3.1 6.8 3.2-1.4-3.1-6.6h6.5z" fill="#14100c" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></svg><div id="vripple"></div><div id="vdrop"></div>`);
  await D.fonts.ready;await imagesLoaded(D);
  const q=s=>D.querySelector(s);
  return {W,D,q,cursor:q('#vcursor'),ripple:q('#vripple'),drop:q('#vdrop'),last:{}};
}
function renderCursor(site,t,c,clicks,from){
  const {cursor,ripple}=site;
  const press=clicks.some(k=>t>=k-.06&&t<k+.1);
  cursor.style.transform=`translate(${c.x-5.8}px,${c.y-4.2}px) scale(${press?.84:1})`;
  cursor.style.opacity=t<from?0:1;
  const k=clicks.filter(k=>t>=k&&t<k+.5).pop();
  if(k!==undefined){
    const p=prog(t,k,k+.5),size=14+64*E.out3(p);
    ripple.style.width=ripple.style.height=size+'px';
    ripple.style.transform=`translate(${c.x-size/2}px,${c.y-size/2}px)`;ripple.style.opacity=.75*(1-p);
  }else ripple.style.opacity=0;
}
