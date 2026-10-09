// render.mjs: render the trailer frame by frame in headless Chromium and encode it with ffmpeg.
//   node marketing/trailer/render.mjs [--fmt 9x16|16x9|1x1|all] [--fps 60] [--stills 0.5,4.2,...] [--out dir]
// Serves the repo root itself (the page loads ../../guide/film/*), so run it from anywhere.
// Needs: playwright (Chromium), ffmpeg, and marketing/trailer/soundtrack.wav (python3 music.py).
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile, access } from 'node:fs/promises';
import { dirname, join, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const FMTS = arg('fmt', 'all') === 'all' ? ['9x16', '16x9', '1x1'] : arg('fmt').split(',');
const FPS = +arg('fps', 60);
const OUT = resolve(arg('out', join(HERE, 'out')));
const STILLS = arg('stills') ? arg('stills').split(',').map(Number) : null;

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.png': 'image/png', '.jpg': 'image/jpeg', '.m4a': 'audio/mp4' };
const server = createServer(async (req, res) => {
  const p = join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(ROOT)) { res.writeHead(403).end(); return; }
  try { const b = await readFile(p); res.writeHead(200, { 'content-type': TYPES[extname(p)] || 'application/octet-stream' }).end(b); }
  catch { res.writeHead(404).end(); }
}).listen(0);
const PORT = server.address().port;

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ args: ['--font-render-hinting=none'] });

async function openPage(fmt) {
  const page = await browser.newPage({ viewport: { width: 600, height: 600 } });
  page.on('pageerror', (e) => console.error('[page]', e.message));
  await page.goto(`http://localhost:${PORT}/marketing/trailer/index.html?render&fmt=${fmt}`);
  await page.waitForFunction(() => window.TRAILER_READY === true, null, { timeout: 60000 });
  return page;
}
const grab = (page, t, type = 'image/jpeg') => page.evaluate(([t, type]) => { TRAILER.renderAt(t); return document.getElementById('cv').toDataURL(type, 0.96).split(',')[1]; }, [t, type]);

if (STILLS) {
  for (const fmt of FMTS) {
    const page = await openPage(fmt);
    for (const t of STILLS) await writeFile(join(OUT, `still-${fmt}-${t.toFixed(2)}.jpg`), Buffer.from(await grab(page, t), 'base64'));
    await page.close();
  }
} else {
  const wav = join(HERE, 'soundtrack.wav');
  const hasAudio = await access(wav).then(() => true, () => false);
  if (!hasAudio) console.warn('soundtrack.wav missing: run python3 marketing/trailer/music.py first. Rendering silent.');
  await Promise.all(FMTS.map(async (fmt) => {
    const page = await openPage(fmt);
    const dur = await page.evaluate(() => TRAILER.DUR), n = Math.round(dur * FPS);
    const file = join(OUT, `wally-rwa-textbook-trailer-${fmt}.mp4`);
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
      ...(hasAudio ? ['-i', wav] : []),
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-r', String(FPS),
      ...(hasAudio ? ['-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-shortest'] : []),
      '-movflags', '+faststart', file], { stdio: ['pipe', 'inherit', 'inherit'] });
    const done = new Promise((ok, no) => ff.on('close', (c) => (c ? no(new Error('ffmpeg ' + c)) : ok())));
    for (let i = 0; i < n; i++) {
      const buf = Buffer.from(await grab(page, i / FPS), 'base64');
      if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
      if (i % (FPS * 4) === 0) console.log(`${fmt}: ${i}/${n}`);
    }
    ff.stdin.end(); await done; await page.close();
    console.log('wrote', file);
  }));
}
await browser.close(); server.close();
