import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {homeVariants,origin} from '../scripts/site-pages.mjs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
const pageFile=v=>v.path.slice(1)+'index.html';
test('homepage options /1/, /2/ and /3/ are standalone, noindexed homepages with the option switcher',()=>{
 assert.deepEqual(homeVariants.map(v=>v.path),['/1/','/2/','/3/']);
 for(const v of homeVariants){const html=read(pageFile(v));
  assert.equal((html.match(/<main\b/g)||[]).length,1,v.path);assert.match(html,/<main id="page-home"[^>]*>/);
  assert.ok(html.includes(`<title>${v.title}</title>`),v.path);assert.ok(html.includes(`href="${origin+v.path}"`),v.path);
  assert.match(html,/<meta name="robots" content="noindex,nofollow">/);assert.match(html,new RegExp(`<body data-page="home" data-variant="${v.id}"`));
  assert.match(html,/href="\/assets\/home-compare\.css"/);
  const bar=html.match(/<nav class="hv-bar"[\s\S]*?<\/nav>/)[0];
  assert.deepEqual([...bar.matchAll(/href="([^"]+)"/g)].map(m=>m[1]),['/1/','/2/','/3/']);
  assert.deepEqual([...bar.matchAll(/<a href="([^"]+)" aria-current="page">/g)].map(m=>m[1]),[v.path]);
  for(const [,url]of html.matchAll(/(?:src|href)="(\/[^"?#]*)[^" ]*"/g)){
   if(url.startsWith('/api/'))continue;
   const file=url.endsWith('/')?url.slice(1)+'index.html':url.slice(1);
   assert.ok(fs.existsSync(new URL('../'+file,import.meta.url)),`${v.path}: missing ${url}`);
  }
 }
 const live=read('index.html');assert.doesNotMatch(live,/hv-bar|data-variant|home-compare\.css/);
});
test('homepage options stay out of the sitemap and redirect their slashless paths',()=>{
 const xml=read('sitemap.xml'),config=JSON.parse(read('vercel.json'));
 for(const v of homeVariants){
  assert.ok(!xml.includes(origin+v.path),v.path);
  assert.ok(config.redirects.some(r=>r.source===v.path.slice(0,-1)&&r.destination===v.path&&r.permanent),v.path);
 }
});
test('option 3 in-page anchors are not captured by legacy homepage hash migrations',()=>{
 const html=read('3/index.html'),source=read('assets/legacy-routes.js');
 for(const anchor of ['start-here','herd']){
  assert.match(html,new RegExp(`id="${anchor}"`));
  let actual;vm.runInNewContext(source,{addEventListener:()=>{},location:{pathname:'/',hash:'#'+anchor,search:'',replace:p=>actual=p}});
  assert.equal(actual,undefined,anchor);
 }
});
