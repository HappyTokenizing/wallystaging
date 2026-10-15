// Renders video/<name>/stage.html frame by frame with headless Chromium and
// encodes video/<name>/rwaf-<name>.mp4.
//   node video/render.mjs ecosystem-categories                 full video
//   node video/render.mjs ecosystem-categories --stills 1,12   PNG stills only
// Needs Playwright (global install is fine), ffmpeg and python3 with numpy.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {execSync, spawn} from 'node:child_process';
import {fileURLToPath, pathToFileURL} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const [name,...flags]=process.argv.slice(2);
if(!name||!fs.existsSync(path.join(here,name,'stage.html'))){
  console.error('usage: node video/render.mjs <name> [--stills t1,t2] [--from s --to s] [--out file] [--no-audio]');
  process.exit(1);
}
const args=Object.fromEntries(flags.reduce((acc,a,i,all)=>{
  if(a.startsWith('--'))acc.push([a.slice(2),all[i+1]&&!all[i+1].startsWith('--')?all[i+1]:true]);
  return acc;
},[]));
const dir=path.join(here,name);
const out=path.resolve(args.out||path.join(dir,`rwaf-${name}.mp4`));

async function loadPlaywright(){
  try{return await import('playwright');}catch{}
  const global=execSync('npm root -g').toString().trim();
  return import(pathToFileURL(path.join(global,'playwright','index.mjs')).href);
}

// Static server for the repository. /api/ecosystem answers with no pending
// updates so the directory renders its committed snapshot without a warning.
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.ico':'image/x-icon','.woff2':'font/woff2'};
function serve(){
  const server=http.createServer((req,res)=>{
    const url=new URL(req.url,'http://localhost');
    if(url.pathname==='/api/ecosystem'){res.writeHead(200,{'content-type':'application/json'});return res.end('{"records":[],"updatedAt":null}');}
    if(url.pathname.startsWith('/api/')){res.writeHead(404,{'content-type':'application/json'});return res.end('{}');}
    let file=path.join(root,decodeURIComponent(url.pathname));
    if(!file.startsWith(root)){res.writeHead(403);return res.end();}
    if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
    if(!fs.existsSync(file)){res.writeHead(404);return res.end();}
    res.writeHead(200,{'content-type':types[path.extname(file).toLowerCase()]||'application/octet-stream'});
    fs.createReadStream(file).pipe(res);
  });
  return new Promise(r=>server.listen(0,'127.0.0.1',()=>r(server)));
}

const server=await serve();
const {chromium}=await loadPlaywright();
const browser=await chromium.launch();
const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
page.on('pageerror',e=>console.error('page error:',e.message));
await page.goto(`http://127.0.0.1:${server.address().port}/video/${name}/stage.html`,{waitUntil:'networkidle'});
const meta=await page.evaluate(()=>window.stageReady);
// renderFrame may return a promise (e.g. waiting for images a view switch added).
const shoot=async t=>{await page.evaluate(t=>renderFrame(t),t);return page.screenshot({type:'png'});};

try{
  if(args.stills){
    const stills=path.resolve(args['stills-dir']||path.join(dir,'stills'));
    fs.mkdirSync(stills,{recursive:true});
    for(const t of String(args.stills).split(',').map(Number)){
      fs.writeFileSync(path.join(stills,`t${t.toFixed(2).padStart(5,'0')}.png`),await shoot(t));
    }
    console.log('stills written to',stills);
  }else{
    const from=Number(args.from||0),to=Number(args.to||meta.duration);
    const audio=!args['no-audio'];
    const tmp=fs.mkdtempSync(path.join(path.dirname(out),'.render-'));
    const wav=path.join(tmp,'sfx.wav');
    if(audio){
      fs.writeFileSync(path.join(tmp,'sfx.json'),JSON.stringify({duration:meta.duration,events:meta.sfx}));
      execSync(`python3 "${path.join(here,'sfx.py')}" "${path.join(tmp,'sfx.json')}" "${wav}"`,{stdio:'inherit'});
    }
    const ff=spawn('ffmpeg',['-y','-loglevel','error','-f','image2pipe','-framerate',String(meta.fps),'-i','-',
      ...(audio?['-ss',String(from),'-t',String(to-from),'-i',wav]:[]),
      '-c:v','libx264','-preset','slow','-crf','17','-pix_fmt','yuv420p','-profile:v','high','-r',String(meta.fps),
      ...(audio?['-c:a','aac','-b:a','192k','-ar','48000']:[]),'-movflags','+faststart','-shortest',out],{stdio:['pipe','inherit','inherit']});
    const done=new Promise((r,j)=>ff.on('close',c=>c?j(Error('ffmpeg exited '+c)):r()));
    const frames=Math.round((to-from)*meta.fps);
    for(let i=0;i<frames;i++){
      const png=await shoot(from+i/meta.fps);
      if(!ff.stdin.write(png))await new Promise(r=>ff.stdin.once('drain',r));
      if(i%60===0)console.log(`frame ${i}/${frames}`);
    }
    ff.stdin.end();await done;
    fs.rmSync(tmp,{recursive:true,force:true});
    console.log('wrote',out);
  }
}finally{
  await browser.close();server.close();
}
