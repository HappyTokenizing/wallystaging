/* trailer.js — "WALLY. Eau de Due Diligence." A 32-second luxury-ad style trailer for Wally's RWA Textbook.
   Dark frames, gold rim light, film grain, slow push-ins, text that resolves out of a blur. Built on the
   film's own toolkit (guide/film: kit, icons, Wally rig, engine), so every frame uses the real art and every
   line of book copy comes from the book's data. Pure function of time: TRAILER.renderAt(t) draws any frame.
   Formats: 9x16 (Reels / TikTok / Shorts), 16x9 (X / YouTube, letterboxed), 1x1 (feed). The short side is
   always 1080 logical px; layouts pick per-format values with pk(port, land, square).
   Music (music.py) is 90 BPM: one beat = 2/3 s, one bar = 8/3 s, and every cut lands on a beat. */
(function () {
  const K = window.K, C = K.C, E = K.E, I = window.I, R = window.WallyRig;
  const B = 2 / 3, DUR = 32;
  const FORMATS = { '9x16': [1080, 1920], '16x9': [1920, 1080], '1x1': [1080, 1080] };
  const TL = window.TL;
  const LESSON = {}; TL.scenes.forEach((s) => { if (s.kind === 'lesson') LESSON[s.lesson] = s; });
  const GOLD = '#D4AF6A', GOLD2 = '#F1D9A2', CREAM = '#F3EBDD', DIM = 'rgba(243,235,221,.62)', NIGHT = '#070605';

  let cv, ctx, W, H, filmCv, bufA, bufB, pageCv;
  const grain = [], MASCOT = {};

  // ------------------------------------------------------------------ helpers
  const pk = (S, p, l, s) => (S.port ? p : S.land ? l : s === undefined ? p : s);
  const clamp = K.clamp, lerp = K.lerp;
  const fitCache = {};
  function fit(c, s, maxW, o) {
    const key = s + '|' + maxW + '|' + JSON.stringify(o);
    if (!(key in fitCache)) fitCache[key] = K.fitSize(c, s, maxW, o);
    return fitCache[key];
  }
  function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  // resolve out of a blur: fade, rise and sharpen over d seconds starting at local time a
  function reveal(c, lt, a, d, draw, o = {}) {
    const p = clamp((lt - a) / d); if (p <= 0) return;
    const out = o.out !== undefined ? clamp((lt - o.out) / (o.outD || 0.4)) : 0; if (out >= 1) return;
    const e = E.outCubic(p), bl = (1 - e) * (o.blur || 14) + out * 10;
    c.save(); c.globalAlpha *= e * (1 - out); if (bl > 0.3) c.filter = `blur(${bl.toFixed(1)}px)`;
    c.translate(0, (1 - e) * (o.rise === undefined ? 24 : o.rise)); draw(e); c.restore();
  }
  // gold gradient fill with a travelling specular highlight (sweep 0..1 across the text)
  function goldFill(c, x0, x1, sweep = -1) {
    const g = c.createLinearGradient(x0, 0, x1, 0);
    if (sweep > 0 && sweep < 1) {
      const s = clamp(sweep, 0.07, 0.93);
      g.addColorStop(0, '#8C6A2F'); g.addColorStop(s - 0.07, '#CDA75F'); g.addColorStop(s, '#FFF6DE'); g.addColorStop(s + 0.07, '#CDA75F'); g.addColorStop(1, '#9C7634');
    } else { g.addColorStop(0, '#8C6A2F'); g.addColorStop(0.35, '#D4AF6A'); g.addColorStop(0.65, '#E9C987'); g.addColorStop(1, '#9C7634'); }
    return g;
  }
  function goldText(c, s, x, y, o) {
    const f = o.f || 'display', w = o.w || 300, st = o.st || 'expanded', ls = o.ls || 0, a = o.a || 'center';
    let size = o.s; if (o.maxW) size = Math.min(size, fit(c, s, o.maxW, { f, s: size, w, st, ls }));
    const tw = K.measure(c, s, { f, s: size, w, st, ls }), x0 = a === 'center' ? x - tw / 2 : a === 'right' ? x - tw : x;
    K.font(c, f, size, w, o.i, st); K.track(c, ls); c.textAlign = a; c.textBaseline = 'alphabetic';
    if (o.glow) { c.save(); c.shadowColor = 'rgba(212,175,106,.55)'; c.shadowBlur = o.glow; c.fillStyle = '#C9A45C'; c.fillText(s, x, y); c.restore(); }
    c.fillStyle = goldFill(c, x0, x0 + tw, o.sweep === undefined ? -1 : o.sweep); c.fillText(s, x, y); K.track(c, 0);
    return size;
  }
  function line(c, s, x, y, o = {}) {
    const st = Object.assign({ f: 'serif', s: 60, w: 400, i: true, c: CREAM, a: 'center' }, o);
    if (o.maxW) st.s = Math.min(st.s, fit(c, s, o.maxW, { f: st.f, s: st.s, w: st.w, i: st.i }));
    K.txt(c, s, x, y, st);
  }
  function caps(c, s, x, y, o = {}) { K.txt(c, s, x, y, { f: 'mono', s: o.s || 24, w: o.w || 500, c: o.c || DIM, a: o.a || 'center', ls: o.ls === undefined ? 10 : o.ls }); }

  // ------------------------------------------------------------------ atmosphere
  function bgNight(c, S, x = S.cx, y = S.cy) {
    c.fillStyle = NIGHT; c.fillRect(0, 0, W, H);
    const g = c.createRadialGradient(x, y, 0, x, y, Math.max(W, H) * 0.7);
    g.addColorStop(0, '#2A1F14'); g.addColorStop(0.45, '#130E09'); g.addColorStop(1, '#050403'); c.fillStyle = g; c.fillRect(0, 0, W, H);
  }
  function haze(c, S, a = 1) {
    c.save(); c.globalCompositeOperation = 'screen';
    for (let i = 0; i < 4; i++) {
      const x = W * (0.2 + 0.6 * K.hash(i + 3)) + Math.sin(S.t * 0.25 + i * 2) * W * 0.15, y = H * (0.25 + 0.5 * K.hash(i + 9)) + Math.cos(S.t * 0.2 + i) * H * 0.06, r = Math.max(W, H) * (0.35 + 0.2 * K.hash(i));
      const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(160,120,80,${0.07 * a})`); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, 0, W, H);
    }
    c.restore();
  }
  function bokeh(c, S, n = 34, a = 1) {
    c.save(); c.globalCompositeOperation = 'screen';
    for (let i = 0; i < n; i++) {
      const sp = 0.015 + K.hash(i * 3.1) * 0.04, r = 6 + K.hash(i * 7.7) * 34;
      const x = K.hash(i * 1.3) * W + Math.sin(S.t * 0.4 + i) * 30, y = H + 100 - ((K.hash(i * 5.9) + S.t * sp) % 1) * (H + 200);
      const al = (0.06 + 0.18 * K.hash(i * 2.2)) * a * (0.6 + 0.4 * Math.sin(S.t * 1.3 + i));
      const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(241,200,130,${al})`); g.addColorStop(0.7, `rgba(241,200,130,${al * 0.6})`); g.addColorStop(1, 'rgba(241,200,130,0)');
      c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
    }
    c.restore();
  }
  function leak(c, S, a = 1) {
    c.save(); c.globalCompositeOperation = 'screen';
    const x = W * (0.85 + 0.15 * Math.sin(S.t * 0.35)), y = H * (0.1 + 0.1 * Math.cos(S.t * 0.3));
    const g = c.createRadialGradient(x, y, 0, x, y, Math.max(W, H) * 0.75); g.addColorStop(0, `rgba(255,140,50,${0.22 * a})`); g.addColorStop(0.5, `rgba(255,98,0,${0.06 * a})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.fillRect(0, 0, W, H); c.restore();
  }
  function grade(c, S) { // warm soft-light tint, vignette, film grain, letterbox
    c.save(); c.globalCompositeOperation = 'soft-light'; c.fillStyle = 'rgba(255,170,90,.16)'; c.fillRect(0, 0, W, H); c.restore();
    const v = c.createRadialGradient(S.cx, S.cy, Math.min(W, H) * 0.35, S.cx, S.cy, Math.hypot(W, H) * 0.62); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.72)');
    c.fillStyle = v; c.fillRect(0, 0, W, H);
    const fr = Math.floor(S.t * 24), gi = grain[fr % grain.length], ox = Math.floor(K.hash(fr + 1) * 256), oy = Math.floor(K.hash(fr + 7) * 256);
    c.save(); c.globalCompositeOperation = 'overlay'; c.globalAlpha = 0.45;
    for (let y = -oy; y < H; y += 512) for (let x = -ox; x < W; x += 512) c.drawImage(gi, x, y);
    c.restore();
    if (S.land) { c.fillStyle = '#000'; c.fillRect(0, 0, W, 130); c.fillRect(0, H - 130, W, 130); }
  }

  // Wally with a gold rim light and a moody key from (lx, ly) (drawn through two offscreen buffers)
  function litWally(c, pose, o = {}) {
    const a = bufA.getContext('2d'), b = bufB.getContext('2d');
    a.setTransform(1, 0, 0, 1, 0, 0); a.globalCompositeOperation = 'source-over'; a.clearRect(0, 0, W, H); R.draw(a, pose);
    b.setTransform(1, 0, 0, 1, 0, 0); b.globalCompositeOperation = 'source-over'; b.clearRect(0, 0, W, H); b.drawImage(bufA, 0, 0);
    b.globalCompositeOperation = 'source-in'; b.fillStyle = o.rim || '#F2C77C'; b.fillRect(0, 0, W, H); b.globalCompositeOperation = 'source-over';
    a.globalCompositeOperation = 'source-atop';
    const lx = o.lx === undefined ? -0.6 : o.lx, ly = o.ly === undefined ? -0.8 : o.ly, cx = o.cx || W / 2, cy = o.cy || H / 2, L = o.L || Math.max(W, H) * 0.6;
    const g = a.createLinearGradient(cx + lx * L, cy + ly * L, cx - lx * L, cy - ly * L);
    g.addColorStop(0, 'rgba(255,190,110,.10)'); g.addColorStop(0.45, 'rgba(10,6,2,.30)'); g.addColorStop(1, `rgba(5,3,1,${o.dark === undefined ? 0.82 : o.dark})`);
    a.fillStyle = g; a.fillRect(0, 0, W, H); a.globalCompositeOperation = 'source-over';
    c.save(); c.globalAlpha *= o.rimA === undefined ? 0.85 : o.rimA; c.filter = `blur(${o.rimBlur || 10}px)`; c.drawImage(bufB, lx * (o.rimOff || 9), ly * (o.rimOff || 9)); c.restore();
    c.drawImage(bufA, 0, 0);
  }

  // ------------------------------------------------------------------ Tokens, Please mascot (from guide/game.js)
  function mascotSVG(mood) {
    const face = '#E7B43C', rim = '#B98A1E', ink = '#201A13';
    const eyes = mood === 'worried' ? `<ellipse cx="80" cy="94" rx="7" ry="10" fill="${ink}"/><ellipse cx="120" cy="94" rx="7" ry="10" fill="${ink}"/><path d="M66 80 l20 6 M134 80 l-20 6" stroke="${ink}" stroke-width="5" stroke-linecap="round"/>`
      : `<path d="M70 92 h20 M110 92 h20" stroke="${ink}" stroke-width="7" stroke-linecap="round"/><path d="M66 82 q12 -6 24 -2 M110 80 q12 -4 24 2" stroke="${ink}" stroke-width="5" fill="none" stroke-linecap="round"/>`;
    const mouth = mood === 'worried' ? `<path d="M74 128 q8 -8 16 0 t16 0 t16 0" stroke="${ink}" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M150 64 q10 18 0 26 q-10 -8 0 -26 z" fill="#7FC4F5" stroke="${ink}" stroke-width="3"/>`
      : `<path d="M78 124 q24 16 46 -6" stroke="${ink}" stroke-width="7" fill="none" stroke-linecap="round"/>`;
    return `<svg viewBox="0 0 200 230" width="400" height="460" xmlns="http://www.w3.org/2000/svg">
      <path d="M78 186 v26 h-14 M122 186 v26 h14" stroke="${ink}" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M36 112 q-22 12 -10 34 M164 112 q22 12 10 34" stroke="${ink}" stroke-width="8" fill="none" stroke-linecap="round"/>
      <ellipse cx="100" cy="112" rx="72" ry="76" fill="${rim}" stroke="${ink}" stroke-width="7"/>
      <circle cx="100" cy="104" r="70" fill="${face}" stroke="${ink}" stroke-width="7"/>
      <circle cx="100" cy="104" r="54" fill="none" stroke="rgba(32,26,19,.25)" stroke-width="4"/>
      ${eyes}${mouth}<path d="M58 50 l8 -36 l20 20 l14 -26 l14 26 l20 -20 l8 36 z" fill="#FFD84D" stroke="${ink}" stroke-width="5" stroke-linejoin="round"/></svg>`;
  }
  function loadMascots() {
    return Promise.all(['smug', 'worried'].map((m) => { const im = new Image(); im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(mascotSVG(m)); MASCOT[m] = im; return im.decode(); }));
  }

  // ------------------------------------------------------------------ book props (permit + page), from the book's data
  const BARZ = [['ASSET', '1 token = 1 gram of gold'], ['WRAPPER', 'Permissioned token, freeze for court orders'], ['CUSTODIAN', 'To be announced (soon™)', 1], ['TRANSFER AGENT', 'Registered, keeps the register'], ['HOLDERS', '3,904 wallets']];
  function permit(c, cw, flagP, stampP) {
    const rh = 86, hh = 64, th = 130, ch = hh + th + BARZ.length * rh + 30;
    c.save(); c.translate(-cw / 2, -ch / 2);
    K.rr(c, 0, 0, cw, ch, 20); c.fillStyle = '#F3EEE3'; c.fill();
    c.save(); K.rr(c, 0, 0, cw, ch, 20); c.clip(); c.fillStyle = '#16110C'; c.fillRect(0, 0, cw, hh); c.restore();
    c.beginPath(); c.arc(36, hh / 2, 8, 0, 7); c.fillStyle = C.orange; c.fill();
    K.txt(c, 'ONCHAIN CUSTOMS · ENTRY PERMIT', 58, hh / 2 + 8, { f: 'mono', s: 22, w: 700, c: GOLD, ls: 3 });
    K.txt(c, 'BARZ', 36, hh + 92, { f: 'display', s: 82, w: 900, st: 'expanded', c: C.ink });
    K.txt(c, 'Gold-in-your-wallet token', 290, hh + 90, { f: 'serif', s: 30, i: true, c: C.ink2 });
    BARZ.forEach(([lab, val, flag], i) => {
      const y = hh + th + i * rh, on = flag && flagP > 0;
      if (on) { c.fillStyle = `rgba(214,69,69,${0.16 * clamp(flagP * 3)})`; c.fillRect(8, y, cw - 16, rh); }
      c.fillStyle = C.line2; c.fillRect(30, y, cw - 60, 2);
      K.txt(c, lab, 36, y + 34, { f: 'mono', s: 19, w: 700, c: on ? C.red : C.ink3, ls: 2 });
      K.txt(c, val, 36, y + 72, { f: 'serif', s: 31, w: 700, c: on ? C.red : C.ink });
      if (flag) { const vw = K.measure(c, val, { f: 'serif', s: 31, w: 700 }); K.circleAround(c, 36 + vw / 2, y + 60, vw / 2 + 26, 34, flagP, { lw: 6 }); }
    });
    c.restore();
    K.stamp(c, 'DENIED', cw * 0.12, 40, { p: stampP, s: 110, c: C.red, rot: -0.16, seed: 9 });
    return ch;
  }
  const CH_ICON = { 1: 'vault', 3: 'clock', 5: 'cash', 11: 'magnifier' };
  function page(c, code, pw, ph, extra = {}) {
    const sc = LESSON[code];
    c.fillStyle = '#FAF8F3'; c.fillRect(-pw / 2, -ph / 2, pw, ph);
    const m = pw * 0.09, x0 = -pw / 2 + m, top = -ph / 2;
    K.txt(c, "WALLY'S RWA TEXTBOOK", x0, top + 62, { f: 'mono', s: 16, w: 600, c: C.ink, ls: 3 });
    K.txt(c, sc.chapterName.toUpperCase(), pw / 2 - m, top + 62, { f: 'mono', s: 16, w: 600, c: C.orange, a: 'right', ls: 2 });
    c.fillStyle = C.line2; c.fillRect(x0, top + 82, pw - 2 * m, 2);
    K.txt(c, sc.lesson, x0, top + 150, { f: 'mono', s: 30, w: 700, c: C.orange, ls: 2 });
    const tsz = Math.min(54, fit(c, sc.title, pw - 2 * m - 90, { f: 'serif', s: 54, w: 700 }));
    K.txt(c, sc.title, x0 + 90, top + 152, { f: 'serif', s: tsz, w: 700 });
    const fn = I[CH_ICON[sc.chapter]]; if (fn) fn(c, 0, top + ph * 0.36, ph * 0.18, {});
    const py = top + ph * 0.56;
    c.fillStyle = C.line2; c.fillRect(x0, py, pw - 2 * m, 2);
    K.txt(c, 'THE POINT', x0, py + 44, { f: 'mono', s: 17, w: 700, c: C.orange, ls: 5 });
    const ps = 36, lines = K.wrap(c, sc.point, pw - 2 * m, { f: 'serif', s: ps, w: 700, i: true });
    if (extra.marker) K.marker(c, x0 - 6, py + 70, pw - 2 * m + 12, lines.length * ps * 1.3 + 10, extra.marker, 'rgba(231,180,60,.42)');
    K.words(c, sc.point, x0, py + 104, { f: 'serif', s: ps, w: 700, i: true, maxW: pw - 2 * m, lh: ps * 1.3 });
    K.txt(c, `${sc.page} / 49`, 0, ph / 2 - 40, { f: 'mono', s: 18, w: 600, c: C.ink2, a: 'center', ls: 2 });
    if (extra.note > 0) {
      const lw = K.measure(c, sc.note, { f: 'hand', s: 72, w: 700 });
      c.save(); c.beginPath(); c.rect(-lw / 2 - 10, ph / 2 - 180, (lw + 20) * clamp(extra.note), 110); c.clip();
      K.txt(c, sc.note, 0, ph / 2 - 100, { f: 'hand', s: 72, w: 700, c: C.orange2, a: 'center' }); c.restore();
    }
  }

  // ================================================================== SHOTS (B = 2/3 s; bar = 4 beats)
  // 0 – 2.67  RWA FOUNDATION PRESENTS
  function shotOpen(c, S) {
    const lt = S.lt; bgNight(c, S); haze(c, S, 0.8); bokeh(c, S, 26, 0.7); leak(c, S, 0.6);
    const lw = pk(S, 460, 600, 440) * E.inOutCubic(clamp((lt - 0.2) / 1.2));
    const lg = c.createLinearGradient(S.cx - lw, 0, S.cx + lw, 0); lg.addColorStop(0, 'rgba(212,175,106,0)'); lg.addColorStop(0.5, GOLD2); lg.addColorStop(1, 'rgba(212,175,106,0)');
    c.fillStyle = lg; c.fillRect(S.cx - lw, S.cy + 8, lw * 2, 2);
    reveal(c, lt, 0.5, 0.9, () => { K.rwafMark(c, S.cx, S.cy - 150, 96, CREAM); caps(c, 'RWA FOUNDATION', S.cx, S.cy - 36, { s: 32, w: 600, c: CREAM, ls: 16 }); });
    reveal(c, lt, 1.0, 0.9, () => caps(c, 'PRESENTS', S.cx, S.cy + 70, { s: 20, ls: 14 }));
  }

  // 2.67 – 5.33  extreme close-up: the sunglasses, a light sweeps across them
  let LENS = null;
  function shotGlasses(c, S) {
    const lt = S.lt; bgNight(c, S, S.cx * 0.7, S.cy * 0.6); haze(c, S, 0.7);
    const s = pk(S, 3.3, 3.0, 2.9) * (1 + lt * 0.03), gy = pk(S, S.cy - 260, S.cy - 60, S.cy - 90), gx = S.cx + Math.sin(lt * 0.4) * 10;
    const pose = { x: gx, y: gy + s * 449, s };
    litWally(c, pose, { lx: -0.7, ly: -0.7, dark: 0.95, cx: gx, cy: gy, rimBlur: 16, rimOff: 12, rimA: 0.75, L: 520 });
    // a reflection gliding across the lenses (the rig's own glint never animates; this is light moving over glass)
    const sw = clamp((lt - 0.7) / 1.2);
    if (sw > 0 && sw < 1) {
      if (!LENS) { LENS = new Path2D(); LENS.addPath(new Path2D(R.P.lensL)); LENS.addPath(new Path2D(R.P.lensR)); }
      c.save(); c.translate(pose.x, pose.y); c.scale(s, s); c.translate(-250, -591); c.clip(LENS);
      const bx = lerp(90, 430, E.inOutSine(sw));
      c.translate(bx, 140); c.transform(1, 0, -0.55, 1, 0, 0);
      const g = c.createLinearGradient(-36, 0, 36, 0); g.addColorStop(0, 'rgba(255,240,210,0)'); g.addColorStop(0.5, 'rgba(255,240,210,.6)'); g.addColorStop(1, 'rgba(255,240,210,0)');
      c.fillStyle = g; c.fillRect(-40, -60, 80, 120);
      c.restore();
    }
    const ly = pk(S, H - 520, H - 210, H - 150);
    const g2 = c.createLinearGradient(0, ly - 300, 0, H); g2.addColorStop(0, 'rgba(0,0,0,0)'); g2.addColorStop(1, 'rgba(0,0,0,.88)'); c.fillStyle = g2; c.fillRect(0, ly - 300, W, H);
    reveal(c, lt, 0.55, 0.9, () => line(c, "He doesn't chase pumps.", S.cx, ly, { s: 66, maxW: W - 100 }));
  }

  // 5.33 – 8  a gold coin turns slowly in the dark
  function shotCoin(c, S) {
    const lt = S.lt; bgNight(c, S); bokeh(c, S, 44, 1.2); haze(c, S, 0.8);
    const cy = pk(S, S.cy - 160, S.cy - 50, S.cy - 90), r = pk(S, 250, 220, 210) * (1 + lt * 0.03);
    const glow = c.createRadialGradient(S.cx, cy, r * 0.4, S.cx, cy, r * 2.4); glow.addColorStop(0, 'rgba(231,180,60,.32)'); glow.addColorStop(1, 'rgba(231,180,60,0)'); c.fillStyle = glow; c.fillRect(0, 0, W, H);
    const spin = lerp(-0.22, 0.22, lt / S.d);
    K.coin(c, S.cx, cy, r, { fill: '#D9A93A', rim: '#8A6420', stroke: '#3A2A10', spin, markC: '#FBE7B0' });
    const gp = clamp((lt - 0.9) / 0.9);
    if (gp > 0 && gp < 1) {
      c.save(); c.globalCompositeOperation = 'screen'; const gx = S.cx + lerp(-r, r, E.inOutSine(gp)) * Math.abs(Math.cos(spin * Math.PI));
      const g = c.createRadialGradient(gx, cy - r * 0.3, 0, gx, cy - r * 0.3, r * 0.7); g.addColorStop(0, 'rgba(255,245,220,.55)'); g.addColorStop(1, 'rgba(255,245,220,0)');
      c.fillStyle = g; c.fillRect(S.cx - r * 1.5, cy - r * 1.5, r * 3, r * 3); c.restore();
    }
    const ly = pk(S, H - 520, H - 210, H - 150);
    reveal(c, lt, 0.45, 0.9, () => line(c, 'He asks who holds the gold.', S.cx, ly, { s: 66, maxW: W - 100 }));
  }

  // 8 – 10.67  the fine print: a textbook page in shallow focus, the point gets highlighted in gold
  function shotPage(c, S) {
    const lt = S.lt; bgNight(c, S);
    const pc = pageCv.getContext('2d'); pc.setTransform(1, 0, 0, 1, 0, 0); pc.clearRect(0, 0, pageCv.width, pageCv.height);
    pc.translate(pageCv.width / 2, pageCv.height / 2); page(pc, '1.4', pageCv.width, pageCv.height, { marker: clamp((lt - 0.7) / 0.8) });
    const sc = pk(S, 1.55, 1.45, 1.35) * (1 + lt * 0.03);
    const px = S.cx + pk(S, 30, 60, 20), py = S.cy + pk(S, -120, -230, -40) - lt * 30;
    const fyOff = pageCv.height * 0.2 * sc; // the point paragraph sits ~20% below the page centre
    const draw = (blur) => { c.save(); c.filter = `${blur ? `blur(${blur}px) ` : ''}brightness(.78) sepia(.3)`; c.translate(px, py); c.rotate(-0.07); c.scale(sc, sc); c.drawImage(pageCv, -pageCv.width / 2, -pageCv.height / 2); c.restore(); };
    draw(9);
    const fy = py + fyOff, band = pk(S, 230, 170, 180);
    c.save(); c.beginPath(); c.rect(0, fy - band, W, band * 2); c.clip(); draw(0); c.restore();
    const l = c.createRadialGradient(px, fy, 80, px, fy, Math.max(W, H) * 0.55); l.addColorStop(0, 'rgba(255,190,110,0)'); l.addColorStop(0.5, 'rgba(10,6,3,.35)'); l.addColorStop(1, 'rgba(5,3,2,.94)');
    c.fillStyle = l; c.fillRect(0, 0, W, H);
    const ly = pk(S, H - 470, H - 210, H - 130);
    const g2 = c.createLinearGradient(0, ly - 220, 0, H); g2.addColorStop(0, 'rgba(0,0,0,0)'); g2.addColorStop(1, 'rgba(0,0,0,.92)'); c.fillStyle = g2; c.fillRect(0, ly - 220, W, H);
    reveal(c, lt, 0.5, 0.9, () => line(c, 'He reads the fine print.', S.cx, ly, { s: 66, maxW: W - 100 }));
  }

  // 10.67 – 13.33  the drop: one word per beat over graded footage from the film
  const WORDS = [['CUSTODY', 'L1.4'], ['SETTLEMENT', 'L3.2'], ['YIELD', 'L5.1'], ['RED FLAGS', 'L11.1']];
  function shotWords(c, S) {
    const lt = S.lt, k = Math.min(3, Math.floor(lt / B)), u = lt - k * B;
    const sc = TL.scenes.find((s) => s.id === WORDS[k][1]);
    window.FILM.renderAt(sc.start + sc.dur * 0.62 + u);
    const z = 1.15 + u * 0.08, fw = Math.max(W, H * 16 / 9) * z, fh = fw * 9 / 16;
    c.save(); c.filter = 'grayscale(1) sepia(.6) brightness(.24) contrast(1.25) blur(6px)'; c.drawImage(filmCv, S.cx - fw / 2 + (k % 2 ? -1 : 1) * u * 60, S.cy - fh / 2, fw, fh); c.restore();
    const v = c.createRadialGradient(S.cx, S.cy, 0, S.cx, S.cy, Math.max(W, H) * 0.6); v.addColorStop(0, 'rgba(0,0,0,.15)'); v.addColorStop(1, 'rgba(0,0,0,.75)'); c.fillStyle = v; c.fillRect(0, 0, W, H);
    const p = E.outCubic(clamp(u / 0.3)), ls = lerp(36, 16, E.outCubic(clamp(u / B)));
    c.save(); c.globalAlpha = p; c.filter = `blur(${((1 - p) * 10).toFixed(1)}px)`;
    goldText(c, WORDS[k][0], S.cx, S.cy + 40, { s: pk(S, 150, 170, 140), w: 300, ls, maxW: W - 120, sweep: clamp(u / B) * 1.2 - 0.1, glow: 30 });
    c.restore();
    caps(c, `${String(k + 1).padStart(2, '0')} / 04   ·   LESSON ${WORDS[k][1].slice(1)}`, S.cx, S.cy + 150, { s: 20, ls: 8, c: `rgba(243,235,221,${0.6 * p})` });
    if (u < 0.08) { c.fillStyle = `rgba(255,230,190,${0.3 * (1 - u / 0.08)})`; c.fillRect(0, 0, W, H); }
  }

  // 13.33 – 16  no price calls. no hopium.
  function shotNo(c, S) {
    const lt = S.lt; bgNight(c, S); haze(c, S, 1); bokeh(c, S, 20, 0.6); leak(c, S, 0.5);
    const y0 = pk(S, S.cy - 130, S.cy - 70, S.cy - 90), fs = pk(S, 92, 100, 84);
    reveal(c, lt, 0.05, 0.6, () => K.txt(c, 'No price calls.', S.cx, y0, { f: 'serif', s: fs, w: 700, c: CREAM, a: 'center' }));
    reveal(c, lt, 2 * B, 0.6, () => { K.font(c, 'serif', fs * 1.08, 700, true); const tw = c.measureText('No hopium.').width; c.fillStyle = goldFill(c, S.cx - tw / 2, S.cx + tw / 2, clamp((lt - 2 * B) / 1.0)); c.textAlign = 'center'; c.textBaseline = 'alphabetic'; c.fillText('No hopium.', S.cx, y0 + fs * 1.25); });
    reveal(c, lt, 3 * B, 0.6, () => caps(c, 'JUST THE PAPERWORK', S.cx, y0 + fs * 2.4, { s: 22, ls: 12 }));
  }

  // 16 – 18.67  the reveal: WALLY. eau de due diligence.
  function shotReveal(c, S) {
    const lt = S.lt;
    const wp = pk(S, { x: S.cx, y: 1600, s: 1.2 }, { x: 600, y: 945, s: 1.08 }, { x: S.cx, y: 1050, s: 1.05 });
    bgNight(c, S, wp.x, wp.y - 300);
    c.save(); c.globalCompositeOperation = 'screen';
    const cg = c.createLinearGradient(wp.x, 0, wp.x, wp.y); cg.addColorStop(0, 'rgba(255,214,160,0)'); cg.addColorStop(0.3, 'rgba(255,214,160,.08)'); cg.addColorStop(1, 'rgba(255,214,160,.16)');
    c.fillStyle = cg; c.beginPath(); c.moveTo(wp.x - 60, 0); c.lineTo(wp.x + 60, 0); c.lineTo(wp.x + 420 * wp.s, wp.y + 20); c.lineTo(wp.x - 420 * wp.s, wp.y + 20); c.closePath(); c.fill();
    c.save(); c.translate(wp.x, wp.y); c.scale(1, 0.14); const fl = c.createRadialGradient(0, 0, 0, 0, 0, 380 * wp.s); fl.addColorStop(0, 'rgba(255,200,140,.4)'); fl.addColorStop(1, 'rgba(255,200,140,0)'); c.fillStyle = fl; c.fillRect(-400 * wp.s, -400 * wp.s, 800 * wp.s, 800 * wp.s); c.restore();
    c.restore();
    haze(c, S, 1.2);
    const push = 1 + lt * 0.035;
    c.save(); c.translate(wp.x, wp.y); c.scale(push, push); c.translate(-wp.x, -wp.y);
    c.globalAlpha = E.outCubic(clamp(lt / 0.9));
    litWally(c, { x: wp.x, y: wp.y, s: wp.s, trunk: { bend: Math.sin(S.t * 0.9) * 0.08 - 0.05 }, sparkle: lt > 1.5 ? Math.sin(clamp((lt - 1.5) / 0.6) * Math.PI) * 1.2 : 0 }, { lx: -0.25, ly: -1, dark: 0.72, cx: wp.x, cy: wp.y - 300 * wp.s, rimBlur: 12, rimOff: 7 });
    c.restore();
    const tp = pk(S, { x: S.cx, y: 420 }, { x: 1340, y: 520 }, { x: S.cx, y: 190 });
    reveal(c, lt, 0.3, 1.0, () => goldText(c, 'WALLY', tp.x, tp.y, { s: pk(S, 210, 200, 170), w: 300, ls: lerp(70, 40, clamp(lt / 2.6)), maxW: pk(S, W - 60, 900, W - 60), sweep: clamp((lt - 0.8) / 1.4), glow: 40 }), { blur: 20 });
    reveal(c, lt, 1.0, 0.9, () => line(c, 'eau de due diligence', tp.x, tp.y + pk(S, 100, 105, 85), { s: pk(S, 56, 58, 48) }));
  }

  // 18.67 – 22.67  WATCH. PLAY. READ. — three product shots, two beats each
  function shotTrio(c, S) {
    const lt = S.lt, k = Math.min(2, Math.floor(lt / (2 * B))), u = lt - k * 2 * B;
    bgNight(c, S); haze(c, S, 0.8);
    const label = ['WATCH.', 'PLAY.', 'READ.'][k], sub = ['THE NINE-MINUTE FILM', 'TOKENS, PLEASE', 'FORTY-EIGHT LESSONS'][k];
    const push = 1 + u * 0.04;
    const prod = pk(S, { x: S.cx, y: 1060 }, { x: 1230, y: 545 }, { x: S.cx, y: 650 });
    c.save(); c.translate(prod.x, prod.y); c.scale(push, push); if (k) c.filter = 'brightness(.8) sepia(.28)';
    if (k === 0) {
      const sc = TL.scenes.find((s) => s.id === 'C11'); window.FILM.renderAt(sc.start + sc.dur * 0.3 + u);
      const pw = pk(S, 960, 940, 880), ph = pw * 9 / 16;
      c.rotate(-0.02);
      c.save(); c.shadowColor = 'rgba(255,140,60,.35)'; c.shadowBlur = 90; c.fillStyle = '#000'; c.fillRect(-pw / 2, -ph / 2, pw, ph); c.restore();
      c.drawImage(filmCv, -pw / 2, -ph / 2, pw, ph);
      c.save(); c.translate(0, ph + 16); c.scale(1, -1); c.globalAlpha = 0.18; c.drawImage(filmCv, -pw / 2, -ph / 2, pw, ph); c.restore();
      const fg = c.createLinearGradient(0, ph / 2 + 8, 0, ph * 1.4); fg.addColorStop(0, 'rgba(7,6,5,.3)'); fg.addColorStop(0.6, 'rgba(7,6,5,1)'); c.fillStyle = fg; c.fillRect(-pw, ph / 2 + 8, pw * 2, ph);
    } else if (k === 1) {
      c.rotate(-0.05); const s2 = pk(S, 1, 0.8, 0.88); c.scale(s2, s2);
      const ch = permit(c, 900, clamp((u - 0.15) / 0.4), clamp((u - B) / 0.18));
      const im = MASCOT[u > B ? 'worried' : 'smug']; if (im) c.drawImage(im, 900 / 2 - 230, -ch / 2 - 150 + Math.sin(S.t * 5) * 6, 200, 230);
    } else {
      c.rotate(0.03); const s3 = pk(S, 1.0, 0.75, 0.68); c.scale(s3, s3);
      const pc = pageCv.getContext('2d'); pc.setTransform(1, 0, 0, 1, 0, 0); pc.clearRect(0, 0, pageCv.width, pageCv.height); pc.translate(pageCv.width / 2, pageCv.height / 2);
      page(pc, '11.4', pageCv.width, pageCv.height, { note: clamp((u - 0.25) / 0.6) });
      c.drawImage(pageCv, -pageCv.width / 2, -pageCv.height / 2);
    }
    c.restore();
    const l = c.createRadialGradient(prod.x, prod.y, pk(S, 320, 300, 240), prod.x, prod.y, Math.max(W, H) * 0.7); l.addColorStop(0, 'rgba(0,0,0,0)'); l.addColorStop(1, 'rgba(4,3,2,.9)');
    c.fillStyle = l; c.fillRect(0, 0, W, H);
    const tp = pk(S, { x: S.cx, y: 400, a: 'center' }, { x: 140, y: 520, a: 'left' }, { x: S.cx, y: 140, a: 'center' });
    reveal(c, u, 0.0, 0.45, () => goldText(c, label, tp.x, tp.y, { s: pk(S, 150, 120, 104), w: 300, ls: 22, a: tp.a, sweep: clamp(u / 1.2), glow: 24 }), { blur: 16 });
    reveal(c, u, 0.25, 0.45, () => caps(c, sub, tp.x, tp.y + pk(S, 70, 66, 52), { s: 22, a: tp.a, ls: 10 }));
    if (u < 0.07) { c.fillStyle = `rgba(255,230,190,${0.22 * (1 - u / 0.07)})`; c.fillRect(0, 0, W, H); }
  }

  // 22.67 – 26.67  product shot: the cover turns on a mirror-black floor, light glides across it
  function shotCover(c, S) {
    const lt = S.lt;
    const cp = pk(S, { x: S.cx, y: 960, w: 540 }, { x: 1300, y: 495, w: 380 }, { x: S.cx, y: 540, w: 350 });
    bgNight(c, S, cp.x, cp.y); bokeh(c, S, 24, 0.6); haze(c, S, 0.7);
    const ang = lerp(-0.62, 0.12, E.inOutSine(clamp(lt / 4))), sx = Math.cos(ang);
    const ch = cp.w * 1.3, floor = cp.y + ch / 2;
    const drawCover = (alpha) => {
      c.save(); c.globalAlpha *= alpha; c.translate(cp.x, cp.y); c.scale(sx, 1); K.cover(c, 0, 0, cp.w, { t: S.t });
      c.fillStyle = `rgba(0,0,0,${clamp(Math.abs(ang) * 0.6)})`; c.fillRect(-cp.w / 2, -ch / 2, cp.w, ch);
      const sp = clamp((lt - 0.8) / 1.6);
      if (sp > 0 && sp < 1) { const bx = lerp(-cp.w, cp.w, sp); const g = c.createLinearGradient(bx - cp.w * 0.25, 0, bx + cp.w * 0.25, 0); g.addColorStop(0, 'rgba(255,245,225,0)'); g.addColorStop(0.5, 'rgba(255,245,225,.38)'); g.addColorStop(1, 'rgba(255,245,225,0)'); c.save(); c.beginPath(); c.rect(-cp.w / 2, -ch / 2, cp.w, ch); c.clip(); c.fillStyle = g; c.fillRect(-cp.w / 2, -ch / 2, cp.w, ch); c.restore(); }
      c.restore();
    };
    c.save(); c.translate(0, floor * 2); c.scale(1, -1); drawCover(0.22); c.restore();
    const fg = c.createLinearGradient(0, floor, 0, floor + ch * 0.6); fg.addColorStop(0, 'rgba(7,6,5,.25)'); fg.addColorStop(1, 'rgba(7,6,5,1)'); c.fillStyle = fg; c.fillRect(0, floor, W, ch * 0.6 + 2);
    c.fillStyle = 'rgba(241,217,162,.25)'; c.fillRect(cp.x - cp.w, floor, cp.w * 2, 1.5);
    drawCover(1);
    const tp = pk(S, { x: S.cx, y: 380, a: 'center' }, { x: 140, y: 470, a: 'left' }, { x: S.cx, y: 140, a: 'center' });
    reveal(c, lt, 0.4, 0.9, () => goldText(c, "WALLY'S RWA TEXTBOOK", tp.x, tp.y, { f: 'mono', w: 600, st: 'normal', s: pk(S, 44, 42, 38), ls: pk(S, 8, 8, 6), a: tp.a, maxW: pk(S, W - 80, 820, W - 80), sweep: clamp((lt - 1.0) / 1.5) }));
    const by = pk(S, 1560, 570, 1010);
    reveal(c, lt, 1.2, 0.9, () => line(c, '49 pages. 11 chapters. Zero hype.', tp.x, by, { s: pk(S, 52, 46, 44), a: tp.a }));
  }

  // 26.67 – 32  end card: read responsibly
  function shotEnd(c, S) {
    const lt = S.lt; bgNight(c, S); haze(c, S, 0.9); bokeh(c, S, 30, 0.8); leak(c, S, 0.45);
    reveal(c, lt, 0.15, 0.8, () => line(c, 'Read responsibly.', S.cx, S.cy + 10, { s: 76 }), { out: 1.5, outD: 0.4 });
    const t2 = lt - 2 * B;
    if (t2 > 0) {
      const y0 = pk(S, S.cy - 320, S.cy - 240, S.cy - 280);
      reveal(c, t2, 0, 0.9, () => K.headMark(c, S.cx, y0, pk(S, 170, 140, 140), GOLD), { blur: 16 });
      reveal(c, t2, 0.2, 0.9, () => K.txt(c, "WALLY'S", S.cx, y0 + 160, { f: 'mono', s: pk(S, 96, 86, 84), w: 800, c: CREAM, a: 'center', ls: 6 }));
      reveal(c, t2, 0.35, 0.9, () => goldText(c, 'RWA TEXTBOOK', S.cx, y0 + 160 + pk(S, 100, 90, 88), { f: 'mono', w: 800, st: 'normal', s: pk(S, 96, 86, 84), ls: 6, maxW: W - 80, sweep: clamp((t2 - 0.6) / 1.4), glow: 20 }));
      const gy = y0 + 160 + pk(S, 190, 170, 166);
      reveal(c, t2, 0.8, 0.8, () => line(c, 'Watch it. Play it. Read it.', S.cx, gy, { s: pk(S, 48, 42, 42), c: DIM }));
      reveal(c, t2, 1.2, 0.8, () => {
        const s = 'rwaf.xyz/guide', fs = pk(S, 40, 34, 36), w = K.measure(c, s, { f: 'mono', s: fs, w: 600, ls: 2 }) + 80, h = fs * 2.1, yy = gy + pk(S, 100, 82, 84);
        K.rr(c, S.cx - w / 2, yy - h / 2, w, h, h / 2); c.lineWidth = 2.5; c.strokeStyle = GOLD; c.stroke();
        K.txt(c, s, S.cx, yy + fs * 0.36, { f: 'mono', s: fs, w: 600, c: GOLD2, a: 'center', ls: 2 });
      });
      const fy = pk(S, 1530, H - 190, H - 80);
      reveal(c, t2, 1.7, 0.8, () => {
        caps(c, 'CREATED BY RWA FOUNDATION  ·  @wallycollection', S.cx, fy, { s: pk(S, 17, 17, 16), ls: 4, c: DIM });
        caps(c, 'EDUCATIONAL CONTENT ONLY. NOT FINANCIAL ADVICE.', S.cx, fy + 32, { s: 13, ls: 4, c: 'rgba(243,235,221,.4)' });
      });
    }
  }

  // [start, end, draw, fade-in from black (s), fade-out to black (s)]
  const SHOTS = [
    [0, 4 * B, shotOpen, 0.7, 0.3], [4 * B, 8 * B, shotGlasses, 0.3, 0.25], [8 * B, 12 * B, shotCoin, 0.3, 0.25], [12 * B, 16 * B, shotPage, 0.3, 0.12],
    [16 * B, 20 * B, shotWords, 0, 0], [20 * B, 24 * B, shotNo, 0, 0.2], [24 * B, 28 * B, shotReveal, 0.15, 0], [28 * B, 34 * B, shotTrio, 0, 0],
    [34 * B, 40 * B, shotCover, 0, 0.35], [40 * B, DUR, shotEnd, 0.4, 0.6],
  ];

  function renderAt(t) {
    t = clamp(t, 0, DUR - 1e-6);
    let i = 0; while (i < SHOTS.length - 1 && t >= SHOTS[i + 1][0]) i++;
    const [a, b, fn, fin, fout] = SHOTS[i];
    const S = { t, lt: t - a, d: b - a, W, H, cx: W / 2, cy: H / 2, port: H > W * 1.2, land: W > H * 1.2 };
    S.sq = !S.port && !S.land;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    // camera: a slow drift on everything; a soft kick on each beat while the drums play
    let z = 1 + S.lt * 0.008;
    if (t >= 16 * B && t < 34 * B) z += 0.008 * Math.exp(-(t % B) * 10);
    ctx.save(); ctx.translate(S.cx, S.cy); ctx.scale(z, z); ctx.translate(-S.cx, -S.cy);
    fn(ctx, S);
    ctx.restore();
    grade(ctx, S);
    const black = Math.max(fin ? 1 - clamp(S.lt / fin) : 0, fout ? clamp((S.lt - (S.d - fout)) / fout) : 0);
    if (black > 0) { ctx.fillStyle = `rgba(0,0,0,${E.inOutSine(black)})`; ctx.fillRect(0, 0, W, H); }
  }

  async function setup(canvasEl, fmt) {
    const f = FORMATS[fmt] ? fmt : '9x16'; [W, H] = FORMATS[f];
    cv = canvasEl; cv.width = W; cv.height = H; ctx = cv.getContext('2d');
    bufA = canvas(W, H); bufB = canvas(W, H);
    if (!filmCv) {
      filmCv = canvas(1280, 720); window.FILM.init(filmCv);
      pageCv = canvas(820, 1000);
      for (let k = 0; k < 6; k++) { // film grain tiles
        const g = canvas(512, 512), x = g.getContext('2d'), id = x.createImageData(512, 512), r = K.rand(k + 11);
        for (let i = 0; i < id.data.length; i += 4) { const v = 128 + (r() - 0.5) * 120; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
        x.putImageData(id, 0, 0); grain.push(g);
      }
      const fonts = ['300 40px Archivo', '900 40px Archivo', '700 40px Lora', 'italic 700 40px Lora', 'italic 400 40px Lora', '400 40px Lora', '700 40px Caveat', '800 40px "Geist Mono"', '700 40px "Geist Mono"', '600 40px "Geist Mono"', '500 40px "Geist Mono"'];
      await Promise.all(fonts.map((q) => document.fonts.load(q, 'Aa')));
      await Promise.all([K.loadAssets(), loadMascots()]);
    }
    for (const k in fitCache) delete fitCache[k];
  }

  window.TRAILER = { DUR, BPM: 90, FORMATS, setup, renderAt, get size() { return [W, H]; } };
})();
