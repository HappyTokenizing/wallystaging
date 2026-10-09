/* trailer.js — the 32-second social trailer for Wally's RWA Textbook.
   Built on the film's own toolkit (guide/film: kit, icons, Wally rig, engine), so every frame is
   the real art. Pure function of time: TRAILER.renderAt(t) draws any frame in any order.
   Formats: 9x16 (Reels / TikTok / Shorts), 16x9 (X / YouTube), 1x1 (feed). The short side is
   always 1080 logical px; layouts pick per-format positions with pk(port, land, square).
   Music (music.py) is 120 BPM: one beat = 0.5 s, and every cut lands on a beat. */
(function () {
  const K = window.K, C = K.C, E = K.E, I = window.I, R = window.WallyRig;
  const B = 0.5, DUR = 32;
  const FORMATS = { '9x16': [1080, 1920], '16x9': [1920, 1080], '1x1': [1080, 1080] };
  const TL = window.TL;
  const LESSON = {}; TL.scenes.forEach((s) => { if (s.kind === 'lesson') LESSON[s.lesson] = s; });
  const SCENE = {}; TL.scenes.forEach((s) => { SCENE[s.id] = s; });

  let cv, ctx, W, H, FMT, filmCv;
  const MASCOT = {};

  // ------------------------------------------------------------------ helpers
  const pk = (S, p, l, s) => (S.port ? p : S.land ? l : s === undefined ? p : s);
  const clamp = K.clamp, lerp = K.lerp;
  const fitCache = {};
  function fit(c, s, maxW, o) {
    const key = s + '|' + maxW + '|' + JSON.stringify(o);
    if (!(key in fitCache)) fitCache[key] = K.fitSize(c, s, maxW, o);
    return fitCache[key];
  }
  // heavy display line with an optional hard offset shadow (sticker look)
  function heavy(c, s, x, y, o) {
    const f = o.f || 'display', w = o.w || 900, st = o.st || 'normal', a = o.a || 'center';
    const size = o.maxW ? Math.min(o.s, fit(c, s, o.maxW, { f, s: o.s, w, st, ls: o.ls })) : o.s;
    if (o.shadow) K.txt(c, s, x + o.shadow, y + o.shadow, { f, s: size, w, st, c: o.sc || C.ink, a, ls: o.ls });
    K.txt(c, s, x, y, { f, s: size, w, st, c: o.c || C.ink, a, ls: o.ls });
    return size;
  }
  // slam-in transform: scale from `from` to 1 with an expo ease, starting at local time a
  function slam(c, lt, a, x, y, draw, o = {}) {
    if (lt < a) return;
    const p = clamp((lt - a) / (o.d || 0.2)), s = lerp(o.from || 1.7, 1, E.outExpo(p));
    c.save(); c.translate(x, y); c.scale(s, s); c.rotate(o.rot || 0); c.globalAlpha *= clamp(p * 5); draw(); c.restore();
  }
  function popAt(c, lt, a, x, y, draw, d = 0.3) {
    const p = K.pop(lt, a, d); if (p <= 0) return;
    c.save(); c.translate(x, y); c.scale(p, p); draw(); c.restore();
  }
  function noSign(c, x, y, r, p) {
    if (p <= 0) return; const s = lerp(1.8, 1, E.outCubic(clamp(p)));
    c.save(); c.translate(x, y); c.scale(s, s); c.globalAlpha *= clamp(p * 3); c.lineWidth = r * 0.17; c.strokeStyle = C.red; c.lineCap = 'round';
    c.beginPath(); c.arc(0, 0, r, 0, 7); c.stroke(); c.beginPath(); c.moveTo(-r * 0.7, -r * 0.7); c.lineTo(r * 0.7, r * 0.7); c.stroke(); c.restore();
  }
  // centred handwritten line(s), revealed left->right like a pen
  function hand(c, s, cx, y, o) {
    const size = o.s, lines = o.maxW ? K.wrap(c, s, o.maxW, { f: 'hand', s: size, w: 700 }) : [s], lh = size * 1.0;
    const p = o.p === undefined ? 1 : o.p; if (p <= 0) return lines.length * lh;
    let w = 0; for (const l of lines) w = Math.max(w, K.measure(c, l, { f: 'hand', s: size, w: 700 }));
    const total = lines.length; const per = 1 / total;
    lines.forEach((l, i) => {
      const lp = clamp((p - i * per) / per); if (lp <= 0) return;
      const lw = K.measure(c, l, { f: 'hand', s: size, w: 700 }), x0 = cx - lw / 2, yy = y + i * lh;
      c.save(); c.beginPath(); c.rect(x0 - 20, yy - size, (lw + 40) * lp, size * 1.4); c.clip();
      K.txt(c, l, cx, yy, { f: 'hand', s: size, w: 700, c: o.c || C.orange, a: 'center' }); c.restore();
    });
    return lines.length * lh;
  }
  function emoji(c, e, x, y, s) { K.txt(c, e, x, y, { f: 'emoji', s, a: 'center', b: 'middle' }); }
  function wally(c, pose) { R.draw(c, pose); }

  // ------------------------------------------------------------------ backgrounds
  function bgPaper(c) { c.drawImage(K.paper(W, H), 0, 0); }
  function bgDark(c) { c.drawImage(K.paper(W, H, '#1C150F', 9), 0, 0); }
  function rays(c, x, y, t, col, n = 22) {
    const R0 = Math.hypot(W, H); c.save(); c.translate(x, y); c.rotate(t * 0.12); c.fillStyle = col;
    for (let k = 0; k < n; k++) { const a = (k / n) * Math.PI * 2, d = Math.PI / n; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a - d / 2) * R0, Math.sin(a - d / 2) * R0); c.lineTo(Math.cos(a + d / 2) * R0, Math.sin(a + d / 2) * R0); c.closePath(); c.fill(); }
    c.restore();
  }
  function bgOrange(c, S, x, y) {
    c.fillStyle = C.orange; c.fillRect(0, 0, W, H);
    rays(c, x === undefined ? S.cx : x, y === undefined ? S.cy : y, S.t, 'rgba(255,170,90,.22)');
    const g = c.createRadialGradient(S.cx, S.cy, Math.min(W, H) * 0.3, S.cx, S.cy, Math.hypot(W, H) * 0.6);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(120,30,0,.35)'); c.fillStyle = g; c.fillRect(0, 0, W, H);
  }
  function bgNeon(c, S) {
    c.fillStyle = '#07030D'; c.fillRect(0, 0, W, H);
    const blob = (x, y, r, col) => { const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, 0, W, H); };
    blob(W * 0.2, H * 0.25, Math.max(W, H) * 0.55, 'rgba(255,46,154,.38)');
    blob(W * 0.85, H * 0.7, Math.max(W, H) * 0.55, 'rgba(138,92,255,.40)');
    // synthwave floor grid
    const hz = H * 0.62; c.save(); c.beginPath(); c.rect(0, hz, W, H - hz); c.clip();
    c.strokeStyle = 'rgba(37,232,255,.45)'; c.lineWidth = 2.5;
    for (let k = -14; k <= 14; k++) { c.beginPath(); c.moveTo(S.cx + k * 40, hz); c.lineTo(S.cx + k * 420, H); c.stroke(); }
    for (let k = 0; k < 14; k++) { const u = ((k + (S.t * 2.4) % 1) / 14), y = hz + Math.pow(u, 2.2) * (H - hz); c.globalAlpha = u; c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
    c.restore();
  }
  function scanlines(c, a = 0.18) { c.save(); c.fillStyle = `rgba(0,0,0,${a})`; for (let y = 0; y < H; y += 6) c.fillRect(0, y, W, 2); c.restore(); }
  function neonText(c, s, x, y, size, col, o = {}) {
    const st = o.st || 'condensed';
    size = Math.min(size, fit(c, s, o.maxW || W * 0.9, { f: 'display', s: size, w: 900, st }));
    c.save();
    c.globalCompositeOperation = 'lighter';
    K.txt(c, s, x - 7, y, { f: 'display', s: size, w: 900, st, c: 'rgba(37,232,255,.75)', a: 'center' });
    K.txt(c, s, x + 7, y + 2, { f: 'display', s: size, w: 900, st, c: 'rgba(255,46,154,.75)', a: 'center' });
    c.globalCompositeOperation = 'source-over';
    c.shadowColor = col; c.shadowBlur = 50;
    K.txt(c, s, x, y, { f: 'display', s: size, w: 900, st, c: col, a: 'center' });
    c.shadowBlur = 0; c.globalAlpha *= 0.55;
    K.txt(c, s, x, y, { f: 'display', s: size, w: 900, st, c: '#FFFFFF', a: 'center' });
    c.restore();
  }

  // ------------------------------------------------------------------ Tokens, Please mascots (from guide/game.js)
  const COLORS = { tbill: ['#3E9E6B', '#2C7A51'], gold: ['#E7B43C', '#B98A1E'] };
  function mascotSVG(kind, mood) {
    const [face, rim] = COLORS[kind] || ['#FF6200', '#C44A00'];
    const ink = '#201A13';
    let eyes = '', mouth = '', extra = '';
    if (mood === 'smug') { eyes = `<path d="M70 92 h20 M110 92 h20" stroke="${ink}" stroke-width="7" stroke-linecap="round"/><path d="M66 82 q12 -6 24 -2 M110 80 q12 -4 24 2" stroke="${ink}" stroke-width="5" fill="none" stroke-linecap="round"/>`; mouth = `<path d="M78 124 q24 16 46 -6" stroke="${ink}" stroke-width="7" fill="none" stroke-linecap="round"/>`; }
    else if (mood === 'happy') { eyes = `<path d="M70 96 q10 -14 20 0 M110 96 q10 -14 20 0" stroke="${ink}" stroke-width="7" fill="none" stroke-linecap="round"/>`; mouth = `<path d="M72 118 q28 30 56 0 z" fill="${ink}"/>`; }
    else if (mood === 'worried') { eyes = `<ellipse cx="80" cy="94" rx="7" ry="10" fill="${ink}"/><ellipse cx="120" cy="94" rx="7" ry="10" fill="${ink}"/><path d="M66 80 l20 6 M134 80 l-20 6" stroke="${ink}" stroke-width="5" stroke-linecap="round"/>`; mouth = `<path d="M74 128 q8 -8 16 0 t16 0 t16 0" stroke="${ink}" stroke-width="6" fill="none" stroke-linecap="round"/>`; extra = `<path d="M150 64 q10 18 0 26 q-10 -8 0 -26 z" fill="#7FC4F5" stroke="${ink}" stroke-width="3"/>`; }
    else { eyes = `<ellipse cx="80" cy="94" rx="7" ry="10" fill="${ink}"/><ellipse cx="120" cy="94" rx="7" ry="10" fill="${ink}"/>`; mouth = `<path d="M80 122 q20 14 40 0" stroke="${ink}" stroke-width="7" fill="none" stroke-linecap="round"/>`; }
    const hats = {
      gold: `<path d="M58 50 l8 -36 l20 20 l14 -26 l14 26 l20 -20 l8 36 z" fill="#FFD84D" stroke="${ink}" stroke-width="5" stroke-linejoin="round"/>`,
      tbill: `<path d="M56 48 q44 -40 88 0 z" fill="#2E4A3A" stroke="${ink}" stroke-width="5"/><rect x="40" y="44" width="120" height="9" rx="4.5" fill="#2E4A3A" stroke="${ink}" stroke-width="4"/>`,
    };
    return `<svg viewBox="0 0 200 230" width="400" height="460" xmlns="http://www.w3.org/2000/svg">
      <path d="M78 186 v26 h-14 M122 186 v26 h14" stroke="${ink}" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M36 112 q-22 12 -10 34 M164 112 q22 12 10 34" stroke="${ink}" stroke-width="8" fill="none" stroke-linecap="round"/>
      <ellipse cx="100" cy="112" rx="72" ry="76" fill="${rim}" stroke="${ink}" stroke-width="7"/>
      <circle cx="100" cy="104" r="70" fill="${face}" stroke="${ink}" stroke-width="7"/>
      <circle cx="100" cy="104" r="54" fill="none" stroke="rgba(32,26,19,.25)" stroke-width="4"/>
      ${eyes}${mouth}${extra}${hats[kind] || ''}</svg>`;
  }
  function loadMascots() {
    const jobs = [];
    for (const kind of ['gold', 'tbill']) for (const mood of ['smug', 'calm', 'happy', 'worried']) {
      const im = new Image(); im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(mascotSVG(kind, mood));
      MASCOT[kind + '/' + mood] = im; jobs.push(im.decode());
    }
    return Promise.all(jobs);
  }
  function mascot(c, kind, mood, x, y, h) { const im = MASCOT[kind + '/' + mood]; if (im) c.drawImage(im, x - h * 0.435, y - h, h * 0.87, h); }

  // ================================================================== SHOTS
  // 0–2  cold open: the shill ad everybody has seen
  function shotNeon(c, S) {
    const lt = Math.min(S.lt, 1.9); // the last frames freeze (record scratch)
    bgNeon(c, S);
    const k = Math.min(3, Math.floor(lt / B)), u = lt - k * B;
    const z = 1 + u * 0.14, jit = u < 0.06 ? (K.hash(k * 7 + Math.floor(S.t * 60)) - 0.5) * 40 : 0;
    const sz = pk(S, 1, 0.82, 0.78), cx = S.cx, cy = S.cy - pk(S, 60, 30, 20);
    c.save(); c.translate(cx + jit, cy); c.scale(z, z); c.translate(-cx, -cy);
    if (k === 0) { emoji(c, '🚀', cx, cy - 330 * sz, 230 * sz); neonText(c, '100x', cx, cy + 90 * sz, 380 * sz, C.neonPink); neonText(c, 'RWA GEM', cx, cy + 250 * sz, 150 * sz, C.neonCyan); }
    if (k === 1) { neonText(c, 'NOT FINANCIAL', cx, cy - 40 * sz, 150 * sz, C.neonYellow); neonText(c, 'ADVICE. BUT…', cx, cy + 130 * sz, 150 * sz, C.neonPink); }
    if (k === 2) {
      c.save(); c.shadowColor = C.neonLime; c.shadowBlur = 60; I.chartUp(c, cx, cy - 140 * sz, 420 * sz, { p: clamp(u / 0.3) }); c.restore();
      neonText(c, 'WAGMI', cx, cy + 260 * sz, 260 * sz, C.neonLime);
    }
    if (k === 3) { emoji(c, '🤞', cx, cy - 330 * sz, 220 * sz); neonText(c, 'TRUST', cx, cy + 20 * sz, 250 * sz, C.neonCyan); neonText(c, 'ME BRO', cx, cy + 230 * sz, 250 * sz, C.neonPink); }
    c.restore();
    // ticker tape
    const ty = pk(S, H - 470, H - 70, H - 70), tape = '$RWA ▲ 4,269%   $MOON ▲ 900%   $HOPE ▲ ∞   $WAGMI ▲ 1,337%   $REKT ▼ 99%   ';
    c.fillStyle = 'rgba(0,0,0,.75)'; c.fillRect(0, ty - 38, W, 76); c.fillStyle = C.neonPink; c.fillRect(0, ty - 40, W, 3); c.fillRect(0, ty + 37, W, 3);
    const tw = K.measure(c, tape, { f: 'mono', s: 34, w: 700 }); let x0 = -((lt * 520) % tw);
    for (; x0 < W; x0 += tw) K.txt(c, tape, x0, ty + 12, { f: 'mono', s: 34, w: 700, c: C.neonLime });
    // sponsored chip
    K.chip(c, 'SPONSORED · TRUST ME', S.cx, pk(S, 300, 80, 70), { s: 24, fill: 'rgba(255,255,255,.12)', c: '#FFFFFF', a: 'center', stroke: 'rgba(255,255,255,.35)', lw: 2 });
    scanlines(c);
    // glitch tear on the way out
    if (S.lt > 1.8) {
      const r = K.rand(Math.floor(S.t * 60)); c.save();
      for (let i = 0; i < 9; i++) { const y = r() * H, h = 8 + r() * 60; c.fillStyle = [C.neonPink, C.neonCyan, '#000', C.neonLime][i % 4]; c.globalAlpha = 0.6; c.fillRect((r() - 0.5) * 80, y, W, h); }
      c.restore();
    }
  }

  // 2–3.85  "Most RWA content is a chart and a promise." -> two NO stamps
  function shotPromise(c, S) {
    const lt = S.lt; bgPaper(c);
    const fs = pk(S, 88, 84, 66), ty = pk(S, 560, 230, 200);
    K.words(c, 'Most RWA content is', S.cx, ty, { f: 'serif', s: fs, w: 700, a: 'center', maxW: W - 120, t: lt - 0.02, per: 0.06, fd: 0.25 });
    const iy = pk(S, 940, 560, 530), dx = pk(S, 250, 330, 230), isz = pk(S, 300, 300, 240), icx = S.cx + pk(S, 0, 140, 0);
    popAt(c, lt, 0.5, icx - dx, iy, () => I.chartUp(c, 0, 0, isz, { p: clamp((lt - 0.5) / 0.3) }));
    if (lt > 0.75) K.txt(c, '+', icx, iy + 30, { f: 'display', s: 110, w: 900, c: C.ink3, a: 'center', alpha: clamp((lt - 0.75) * 6) });
    popAt(c, lt, 1.0, icx + dx, iy, () => { c.rotate(Math.sin(S.t * 6) * 0.07); emoji(c, '🤞', 0, 10, isz * 0.8); });
    const ly = iy + isz * 0.5 + 70;
    if (lt > 0.6) hand(c, 'a chart', icx - dx, ly, { s: 64, c: C.ink2, p: clamp((lt - 0.6) / 0.25) });
    if (lt > 1.1) hand(c, 'a promise', icx + dx, ly, { s: 64, c: C.ink2, p: clamp((lt - 1.1) / 0.25) });
    noSign(c, icx - dx, iy, isz * 0.62, (lt - 1.5) / 0.15);
    noSign(c, icx + dx, iy, isz * 0.62, (lt - 1.625) / 0.15);
    // Wally: deadpan, then a slow head-shake
    const sh = lt > 1.45 ? Math.sin((lt - 1.45) * 16) * 0.09 * Math.exp(-(lt - 1.45) * 1.5) : 0;
    const wp = pk(S, { x: S.cx, y: H - 300, s: 0.62 }, { x: 330, y: 1040, s: 0.82 }, { x: 140, y: 1070, s: 0.3 });
    wally(c, { x: wp.x, y: wp.y, s: wp.s, headRot: sh, trunk: { bend: Math.sin(S.t * 2) * 0.12 + sh * 2 }, earL: Math.abs(sh), earR: Math.abs(sh) });
  }

  // 3.85–6  the cover slams down on the drop: "This is a textbook."
  function shotTextbook(c, S) {
    const lt = S.lt, L = 0.15; bgPaper(c);
    const cp = pk(S, { x: S.cx, y: 1100, w: 520 }, { x: 1360, y: 560, w: 470 }, { x: S.cx, y: 690, w: 370 });
    c.save(); c.globalAlpha = 0.6; rays(c, cp.x, cp.y, S.t, 'rgba(255,98,0,.10)'); c.restore();
    let y = cp.y, rot = -0.05;
    if (lt < L) { const u = E.inCubic(clamp(lt / L)); y = lerp(-cp.w * 0.8, cp.y, u); rot = lerp(-0.35, -0.05, u); }
    else { const u = lt - L; y = cp.y - Math.abs(Math.sin(u * 16)) * 26 * Math.exp(-u * 8); }
    K.cover(c, cp.x, y, cp.w, { rot, t: S.t });
    const d = lt - L;
    if (d > 0 && d < 0.8) { c.save(); for (let k = 0; k < 12; k++) { const dir = k % 2 ? 1 : -1, sp = 160 + 120 * K.hash(k); c.globalAlpha = 0.5 * (1 - d / 0.8); c.fillStyle = '#CFC6B4'; c.beginPath(); c.arc(cp.x + dir * (cp.w * 0.55 + d * sp), cp.y + cp.w * 0.62 - d * 90 * K.hash(k + 4), 18 + d * 50, 0, 7); c.fill(); } c.restore(); }
    // headline
    const tx = pk(S, S.cx, 140, S.cx), a = pk(S, 'center', 'left', 'center'), fs = pk(S, 112, 128, 92);
    const y1 = pk(S, 380, 450, 190), y2 = pk(S, 510, 600, 300);
    slam(c, lt, L, tx, y1, () => K.txt(c, 'This is a', 0, 0, { f: 'serif', s: fs, w: 700, a }), { from: 1.4 });
    slam(c, lt, L + 0.5, tx, y2, () => K.txt(c, 'textbook.', 0, 0, { f: 'serif', s: fs * 1.12, w: 700, i: true, c: C.orange, a }), { from: 1.6 });
    const tw = K.measure(c, 'textbook.', { f: 'serif', s: fs * 1.12, w: 700, i: true });
    const sx = a === 'center' ? tx - tw / 2 : tx;
    K.scribble(c, sx, y2 + 30, tw, clamp((lt - L - 0.85) / 0.3), { lw: 9, amp: 5 });
    // Wally slides in to vouch for it
    const wq = E.outBack(clamp((lt - L - 1.0) / 0.35), 1.4);
    if (wq > 0) {
      const wp = pk(S, { x: W - 150, y: H - 300, s: 0.42 }, { x: 1760, y: 1010, s: 0.5 }, { x: W - 110, y: 1060, s: 0.32 });
      wally(c, { x: lerp(W + 260, wp.x, wq), y: wp.y, s: wp.s, rot: -0.06, trunk: { bend: -0.5, lift: 0.6, curl: 0.3 }, sparkle: lt > L + 1.5 ? Math.sin(clamp((lt - L - 1.5) / 0.4) * Math.PI) : 0 });
    }
  }

  // 6–8  NO PRICE CALLS. / NO HOPIUM.
  function shotNo(c, S) {
    const lt = S.lt, second = lt >= 1, u = second ? lt - 1 : lt;
    if (!second) bgOrange(c, S); else { bgDark(c); c.save(); c.globalAlpha = 0.5; rays(c, S.cx, S.cy, S.t, 'rgba(255,98,0,.08)'); c.restore(); }
    const lines = second ? ['NO', 'HOPIUM.'] : ['NO PRICE', 'CALLS.'];
    const col = second ? C.orange : '#FFFFFF', sc = second ? '#000000' : C.ink;
    const fs = pk(S, 210, 230, 190), y1 = pk(S, 720, 380, 380), y2 = y1 + fs * 0.98;
    const tx = pk(S, S.cx, 130, S.cx), a = pk(S, 'center', 'left', 'center'), mw = pk(S, W - 110, 1060, W - 110);
    slam(c, u, 0, tx, y1, () => heavy(c, lines[0], 0, 0, { s: fs, c: col, a, shadow: 10, sc, maxW: mw }));
    slam(c, u, 0.125, tx, y2, () => heavy(c, lines[1], 0, 0, { s: fs, c: col, a, shadow: 10, sc, maxW: mw }));
    const ip = pk(S, { x: S.cx, y: 1280, s: 300 }, { x: 1520, y: 540, s: 360 }, { x: S.cx, y: 820, s: 230 });
    popAt(c, u, 0.2, ip.x, ip.y, () => { if (second) I.rocket(c, 0, 0, ip.s, {}); else { c.fillStyle = '#FFFFFF'; c.beginPath(); c.arc(0, 0, ip.s * 0.62, 0, 7); c.fill(); I.chartUp(c, 0, 0, ip.s * 0.85, { p: 1 }); } });
    noSign(c, ip.x, ip.y, ip.s * 0.62, (u - 0.5) / 0.15);
  }

  // 8–14  Wally has notes: real margin notes from the book, one card per beat-pair
  const NOTES = [
    { l: '7.1', icon: (c, s) => I.house(c, 0, 0, s) },
    { l: '5.1', big: '18%*' },
    { l: '11.3', icon: (c, s) => I.key(c, 0, 0, s, { rot: -0.5 }) },
    { l: '9.1', icon: (c, s) => I.goldbar(c, 0, 0, s) },
    { l: '3.1', icon: (c, s) => I.cricket(c, 0, 0, s) },
    { l: '1.2', emoji: '🌯' },
  ];
  const ROT = [-0.045, 0.035, -0.025, 0.05, -0.035, 0.025];
  function noteCard(c, n, k, cw, ch, t) {
    const sc = LESSON[n.l];
    K.box(c, -cw / 2, -ch / 2, cw, ch, { r: 30, fill: '#FFFFFF', stroke: C.ink, lw: 5, shadow: 30 });
    const tag = `CH ${String(sc.chapter).padStart(2, '0')} · ${sc.chapterName.toUpperCase()}`;
    const ts = Math.min(24, fit(c, tag, cw - 300, { f: 'mono', s: 24, w: 700, ls: 2 }));
    K.chip(c, tag, -cw / 2 + 40, -ch / 2 + 60, { s: ts, fill: C.orangeSoft, c: C.orange2, ls: 2 });
    K.txt(c, `p. ${sc.page} / 49`, cw / 2 - 44, -ch / 2 + 68, { f: 'mono', s: 22, w: 600, c: C.ink3, a: 'right', ls: 2 });
    const iy = -ch * 0.08, is = Math.min(cw, ch) * 0.34;
    c.save(); c.translate(0, iy + Math.sin(t * 7) * 6);
    if (n.icon) n.icon(c, is);
    else if (n.emoji) emoji(c, n.emoji, 0, 0, is * 0.95);
    else heavy(c, n.big, 0, is * 0.32, { s: is * 0.95, st: 'expanded', c: C.green, shadow: 8 });
    c.restore();
    hand(c, sc.note, 0, ch * 0.29, { s: Math.min(92, cw * 0.1), maxW: cw - 110, c: C.orange, p: clamp((t - 0.08) / 0.3) });
  }
  function shotNotes(c, S) {
    const lt = S.lt; bgPaper(c);
    const hp = pk(S, { x: S.cx, y: 330, a: 'center', s: 96 }, { x: 130, y: 330, a: 'left', s: 110 }, { x: S.cx, y: 130, a: 'center', s: 76 });
    K.txt(c, 'Wally has', hp.x, hp.y, { f: 'serif', s: hp.s, w: 700, a: hp.a });
    K.txt(c, 'notes.', hp.x, hp.y + hp.s * 1.05, { f: 'serif', s: hp.s * 1.1, w: 700, i: true, c: C.orange, a: hp.a });
    if (S.land) {
      K.txt(c, '48 lessons. Every one', 134, 560, { f: 'serif', s: 40, i: true, c: C.ink2 });
      K.txt(c, 'with a margin note.', 134, 612, { f: 'serif', s: 40, i: true, c: C.ink2 });
      wally(c, { x: 360, y: 1040, s: 0.62, rot: Math.sin(S.t * Math.PI * 2) * 0.03, bob: Math.abs(Math.sin(S.t * Math.PI * 2)) * 10, trunk: { bend: -0.4, lift: 0.3 + Math.sin(S.t * 4) * 0.1 }, earL: Math.abs(Math.sin(S.t * Math.PI * 2)) * 0.1, earR: Math.abs(Math.sin(S.t * Math.PI * 2)) * 0.1 });
    }
    const cp = pk(S, { x: S.cx, y: 1010, w: 900, h: 780 }, { x: 1230, y: 560, w: 940, h: 760 }, { x: S.cx, y: 640, w: 860, h: 680 });
    const k = Math.min(5, Math.floor(lt / 1.0));
    for (let j = Math.max(0, k - 2); j <= k; j++) {
      const t = lt - j, p = E.outExpo(clamp(t / 0.22));
      const ox = lerp(W * 0.9, 0, p) * (j % 2 ? -1 : 1), oy = lerp(400, 0, p), r = lerp(ROT[j] * 6, ROT[j], p);
      const s = lerp(1.15, 1, p) * (j < k ? 0.97 : 1);
      c.save(); c.translate(cp.x + ox, cp.y + oy); c.rotate(r); c.scale(s, s);
      noteCard(c, NOTES[j], j, cp.w, cp.h, t);
      c.restore();
    }
  }

  // 14–16  the book in numbers, one per beat
  function shotNumbers(c, S) {
    const lt = S.lt, k = Math.min(3, Math.floor(lt / B)), u = lt - k * B;
    const N = [['49', 'PAGES', 'o'], ['11', 'CHAPTERS', 'd'], ['48', 'LESSONS', 'p'], ['1', 'ELEPHANT', 'o']][k];
    if (N[2] === 'o') bgOrange(c, S); else if (N[2] === 'd') bgDark(c); else bgPaper(c);
    const numC = N[2] === 'o' ? '#FFFFFF' : C.orange, labC = N[2] === 'd' ? '#F4F1EA' : C.ink;
    if (k === 3) {
      const wp = pk(S, { x: S.cx, y: 1500, s: 1.0 }, { x: 1380, y: 1060, s: 1.2 }, { x: S.cx + 200, y: 1090, s: 0.75 });
      const q = E.outBack(clamp(u / 0.22), 1.6);
      wally(c, { x: wp.x, y: wp.y + (1 - q) * 700, s: wp.s, squash: u < 0.3 ? Math.sin(u / 0.3 * Math.PI) * -0.06 : 0, earL: 0.15 * Math.sin(u * 20), earR: 0.15 * Math.sin(u * 20), trunk: { bend: -0.6, lift: 0.8, curl: 0.4 }, sparkle: u > 0.2 ? Math.sin(clamp((u - 0.2) / 0.28) * Math.PI) : 0 });
    }
    const np = k === 3 ? pk(S, { x: S.cx, y: 640, s: 380 }, { x: 560, y: 640, s: 520 }, { x: 300, y: 600, s: 420 }) : pk(S, { x: S.cx, y: 1040, s: 560 }, { x: S.cx, y: 680, s: 560 }, { x: S.cx, y: 680, s: 520 });
    slam(c, u, 0, np.x, np.y, () => heavy(c, N[0], 0, 0, { s: np.s, st: 'expanded', c: numC, shadow: N[2] === 'p' ? 0 : 14, sc: N[2] === 'd' ? '#000' : C.ink }), { d: 0.14, from: 1.5 });
    const ly = np.y + pk(S, 140, 150, 140);
    const lp = E.outCubic(clamp((u - 0.05) / 0.15));
    K.txt(c, N[1], np.x, ly + (1 - lp) * 30, { f: 'mono', s: pk(S, 72, 78, 64), w: 800, c: labC, a: 'center', ls: 12, alpha: lp });
  }

  // 16–19  WATCH IT: the real film, jump-cut on every beat
  const CUTS = [['AD1', 0.55], ['C7', 0.35], ['L5.1', 0.55], ['L11.3', 0.55], ['L3.1', 0.62], ['O1', 0.05]];
  function filmFrame(i, u) {
    const sc = SCENE[CUTS[i][0]], T = sc.start + sc.dur * CUTS[i][1] + u;
    window.FILM.renderAt(T); return T;
  }
  function fmtT(s) { s = Math.floor(s); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
  function shotWatch(c, S) {
    const lt = S.lt; bgDark(c);
    const g = c.createRadialGradient(S.cx, S.cy, 50, S.cx, S.cy, Math.max(W, H) * 0.6); g.addColorStop(0, 'rgba(255,140,60,.18)'); g.addColorStop(1, 'rgba(255,140,60,0)'); c.fillStyle = g; c.fillRect(0, 0, W, H);
    const pw = pk(S, 1000, 1100, 960), ph = pw * 9 / 16;
    const pp = pk(S, { x: S.cx, y: 1000 }, { x: S.cx, y: 540 }, { x: S.cx, y: 590 });
    const tp = pk(S, { x: S.cx, y: 560, a: 'center' }, { x: S.cx, y: 130, a: 'center' }, { x: S.cx, y: 170, a: 'center' });
    slam(c, lt, 0, tp.x, tp.y, () => heavy(c, '▶ WATCH IT.', 0, 0, { s: pk(S, 150, 120, 120), c: '#F4F1EA', shadow: 0, maxW: W - 100 }), { from: 1.4 });
    const k = Math.min(CUTS.length - 1, Math.floor(lt / B)), u = lt - k * B;
    const T = filmFrame(k, u);
    const q = E.outExpo(clamp(lt / 0.3)), s = lerp(0.85, 1, q);
    c.save(); c.translate(pp.x, pp.y); c.scale(s, s);
    c.save(); c.shadowColor = 'rgba(0,0,0,.6)'; c.shadowBlur = 60; c.shadowOffsetY = 20; K.rr(c, -pw / 2, -ph / 2, pw, ph + 70, 26); c.fillStyle = '#000'; c.fill(); c.restore();
    c.save(); K.rr(c, -pw / 2, -ph / 2, pw, ph + 70, 26); c.clip();
    c.drawImage(filmCv, -pw / 2, -ph / 2, pw, ph);
    // controls strip
    c.fillStyle = '#100B07'; c.fillRect(-pw / 2, ph / 2, pw, 70);
    c.fillStyle = 'rgba(255,255,255,.18)'; c.fillRect(-pw / 2 + 170, ph / 2 + 33, pw - 340, 6);
    c.fillStyle = C.orange; c.fillRect(-pw / 2 + 170, ph / 2 + 33, (pw - 340) * (T / TL.duration), 6);
    c.beginPath(); c.arc(-pw / 2 + 170 + (pw - 340) * (T / TL.duration), ph / 2 + 36, 11, 0, 7); c.fill();
    c.fillStyle = '#F4F1EA'; c.beginPath(); c.rect(-pw / 2 + 36, ph / 2 + 22, 8, 28); c.rect(-pw / 2 + 52, ph / 2 + 22, 8, 28); c.fill();
    K.txt(c, fmtT(T), -pw / 2 + 80, ph / 2 + 45, { f: 'mono', s: 22, w: 600, c: '#F4F1EA' });
    K.txt(c, fmtT(TL.duration), pw / 2 - 40, ph / 2 + 45, { f: 'mono', s: 22, w: 600, c: 'rgba(244,241,234,.6)', a: 'right' });
    c.restore();
    K.rr(c, -pw / 2, -ph / 2, pw, ph + 70, 26); c.lineWidth = 3; c.strokeStyle = 'rgba(244,241,234,.25)'; c.stroke();
    c.restore();
    const sy = pp.y + ph / 2 + pk(S, 190, 0, 0) + 70;
    if (S.port) K.words(c, 'The whole book as a', S.cx, sy, { f: 'serif', s: 56, w: 400, i: true, c: 'rgba(244,241,234,.85)', a: 'center', t: lt - 0.4, per: 0.05 });
    const line = S.port ? 'nine-minute film.' : 'The whole book as a nine-minute film.';
    const y2 = S.port ? sy + 76 : pp.y + ph / 2 + 70 + pk(S, 0, 70, 100);
    K.words(c, line, S.cx, y2, { f: 'serif', s: pk(S, 64, 48, 46), w: 700, i: true, c: S.port ? C.orange : 'rgba(244,241,234,.9)', a: 'center', t: lt - (S.port ? 0.7 : 0.4), per: 0.05, hl: S.port ? [] : [5, 6], hc: C.orange });
  }

  // 19–22  PLAY IT: Tokens, Please. BARZ gets DENIED, TBILLY gets ADMITTED
  const CASES = {
    BARZ: { kind: 'gold', name: 'Gold-in-your-wallet token', fields: [['ASSET', '1 token = 1 gram of gold'], ['WRAPPER', 'Permissioned token, freeze for court orders'], ['CUSTODIAN', 'To be announced (soon™)', 1], ['TRANSFER AGENT', 'Registered, keeps the register'], ['HOLDERS', '3,904 wallets']] },
    TBILLY: { kind: 'tbill', name: 'Granite T-Bill Fund token', fields: [['ASSET', 'Short-term U.S. Treasury bills'], ['WRAPPER', 'Shares of a regulated fund, issued as tokens'], ['CUSTODIAN', 'Granite Trust Co., qualified custodian'], ['TRANSFER AGENT', 'Registered, keeps the official register'], ['TOTAL VALUE', '$210M onchain · $14M in protocols (TVL)']] },
  };
  function permit(c, tick, cw, flagP, stampP, ok) {
    const cs = CASES[tick], rh = 86, hh = 64, th = 130, ch = hh + th + cs.fields.length * rh + 30;
    c.save(); c.translate(-cw / 2, -ch / 2);
    c.save(); c.shadowColor = 'rgba(0,0,0,.5)'; c.shadowBlur = 40; c.shadowOffsetY = 18; K.rr(c, 0, 0, cw, ch, 22); c.fillStyle = '#F3EEE3'; c.fill(); c.restore();
    c.save(); K.rr(c, 0, 0, cw, ch, 22); c.clip(); c.fillStyle = C.ink; c.fillRect(0, 0, cw, hh); c.restore();
    c.beginPath(); c.arc(36, hh / 2, 8, 0, 7); c.fillStyle = C.orange; c.fill();
    K.txt(c, 'ONCHAIN CUSTOMS · ENTRY PERMIT', 58, hh / 2 + 8, { f: 'mono', s: 22, w: 700, c: C.orange, ls: 3 });
    K.txt(c, tick, 36, hh + 92, { f: 'display', s: 82, w: 900, st: 'expanded', c: C.ink });
    const tw = K.measure(c, tick, { f: 'display', s: 82, w: 900, st: 'expanded' });
    K.txt(c, cs.name, 36 + tw + 24, hh + 90, { f: 'serif', s: Math.min(32, fit(c, cs.name, cw - tw - 90, { f: 'serif', s: 32, w: 400, i: true })), i: true, c: C.ink2 });
    cs.fields.forEach(([lab, val, flag], i) => {
      const y = hh + th + i * rh;
      if (flag && flagP > 0) { c.fillStyle = `rgba(214,69,69,${0.16 * clamp(flagP * 3)})`; c.fillRect(8, y, cw - 16, rh); }
      c.fillStyle = C.line2; c.fillRect(30, y, cw - 60, 2);
      K.txt(c, lab, 36, y + 34, { f: 'mono', s: 19, w: 700, c: flag && flagP > 0 ? C.red : C.ink3, ls: 2 });
      const vs = Math.min(31, fit(c, val, cw - 72, { f: 'serif', s: 31, w: 700 }));
      K.txt(c, val, 36, y + 72, { f: 'serif', s: vs, w: 700, c: flag && flagP > 0 ? C.red : C.ink });
      if (flag) { const vw = K.measure(c, val, { f: 'serif', s: vs, w: 700 }); K.circleAround(c, 36 + vw / 2, y + 60, vw / 2 + 26, 34, flagP, { lw: 6 }); }
    });
    c.restore();
    K.stamp(c, ok ? 'ADMITTED' : 'DENIED', cw * 0.12, 40, { p: stampP, s: 104, c: ok ? C.green : C.red, rot: ok ? -0.1 : -0.16, seed: ok ? 3 : 9 });
    return ch;
  }
  function shotPlay(c, S) {
    const lt = S.lt;
    const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#3A2A1A'); g.addColorStop(1, '#16100A'); c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.save(); c.globalAlpha = 0.07; c.strokeStyle = '#000'; for (let x = 0; x < W; x += 34) { c.lineWidth = 2 + K.hash(x) * 4; c.beginPath(); c.moveTo(x, 0); c.lineTo(x + 20 * Math.sin(x), H); c.stroke(); } c.restore();
    const tp = pk(S, { x: S.cx, y: 330, a: 'center' }, { x: 130, y: 330, a: 'left' }, { x: S.cx, y: 70, a: 'center' });
    K.txt(c, 'PLAY IT.', tp.x, tp.y - pk(S, 120, 130, 0), { f: 'mono', s: 30, w: 700, c: C.orange, a: tp.a, ls: 8, alpha: S.land || S.port ? clamp(lt * 5) : 0 });
    slam(c, lt, 0, tp.x, tp.y + pk(S, 0, 0, 90), () => heavy(c, 'TOKENS,', 0, 0, { s: pk(S, 150, 150, 96), c: '#F4F1EA', a: tp.a, maxW: pk(S, W - 100, 760, W - 100) }), { from: 1.4 });
    slam(c, lt, 0.12, tp.x, tp.y + pk(S, 140, 140, 180), () => heavy(c, 'PLEASE.', 0, 0, { s: pk(S, 150, 150, 96), c: C.orange, a: tp.a, maxW: pk(S, W - 100, 760, W - 100) }), { from: 1.4 });
    if (!S.sq) {
      const sp = pk(S, { x: S.cx, y: 1610 }, { x: 134, y: 640 });
      const lines = ['48 tokens at the border.', 'Find the red flag.'];
      lines.forEach((l, i) => K.txt(c, l, sp.x, sp.y + i * 58, { f: 'serif', s: 46, w: i ? 700 : 400, i: true, c: i ? C.orange : 'rgba(244,241,234,.85)', a: tp.a, alpha: clamp((lt - 0.5 - i * 0.25) * 4) }));
    }
    const cw = pk(S, 960, 860, 900), cp = pk(S, { x: S.cx, y: 1130 }, { x: 1340, y: 650 }, { x: S.cx, y: 700 });
    const sw = lt >= 1.95 ? 1 : 0, u = lt - (sw ? 1.95 : 0);
    const tick = sw ? 'TBILLY' : 'BARZ';
    const inP = E.outExpo(clamp(u / 0.28)), outP = !sw ? E.inCubic(clamp((lt - 1.75) / 0.2)) : 0;
    const flagP = !sw ? clamp((lt - 0.75) / 0.3) : 0, stampP = !sw ? clamp((lt - 1.5) / 0.2) : clamp((lt - 2.5) / 0.2);
    const sc = pk(S, 1, 1, 0.9);
    c.save(); c.translate(cp.x - outP * W * 1.1, cp.y + (1 - inP) * H * 0.8); c.rotate(lerp(0.12, sw ? 0.015 : -0.02, inP) - outP * 0.2); c.scale(sc, sc);
    const ch = permit(c, tick, cw, flagP, stampP, sw);
    // the token waiting at the window, perched on the permit's corner
    const mood = sw ? (stampP > 0 ? 'happy' : 'calm') : (stampP > 0 ? 'worried' : flagP > 0 ? 'smug' : 'smug');
    const bob = Math.abs(Math.sin(S.t * Math.PI * 2)) * 14;
    const mh = pk(S, 290, 300, 200); mascot(c, CASES[tick].kind, mood, cw / 2 - mh * 0.5, -ch / 2 + 30 - bob, mh);
    c.restore();
  }

  // 22–25  READ IT: pages riffle, land on 11.4 with the margin note
  const RIFFLE = ['1.1', '2.2', '3.4', '4.3', '5.3', '6.4', '8.1', '11.4'];
  const CH_ICON = { 1: 'block', 2: 'share', 3: 'chartUp', 4: 'tbill', 5: 'cash', 6: 'loan', 7: 'house', 8: 'gear', 9: 'goldbar', 10: 'bank', 11: 'magnifier' };
  function page(c, code, pw, ph, extra) {
    const sc = LESSON[code];
    c.fillStyle = '#FAF8F3'; c.fillRect(-pw / 2, -ph / 2, pw, ph);
    const sp = c.createLinearGradient(-pw / 2, 0, -pw / 2 + 50, 0); sp.addColorStop(0, 'rgba(60,40,10,.18)'); sp.addColorStop(1, 'rgba(60,40,10,0)'); c.fillStyle = sp; c.fillRect(-pw / 2, -ph / 2, 50, ph);
    const m = pw * 0.09, x0 = -pw / 2 + m, top = -ph / 2;
    K.txt(c, "WALLY'S RWA TEXTBOOK", x0, top + 62, { f: 'mono', s: 16, w: 600, c: C.ink, ls: 3 });
    K.txt(c, sc.chapterName.toUpperCase(), pw / 2 - m, top + 62, { f: 'mono', s: 16, w: 600, c: C.orange, a: 'right', ls: 2 });
    c.fillStyle = C.line2; c.fillRect(x0, top + 82, pw - 2 * m, 2);
    K.txt(c, sc.lesson, x0, top + 150, { f: 'mono', s: 30, w: 700, c: C.orange, ls: 2 });
    const tsz = Math.min(54, fit(c, sc.title, pw - 2 * m - 90, { f: 'serif', s: 54, w: 700 }));
    K.txt(c, sc.title, x0 + 90, top + 152, { f: 'serif', s: tsz, w: 700 });
    const fn = I[CH_ICON[sc.chapter]]; if (fn) fn(c, 0, top + ph * 0.36, ph * (ph > 800 ? 0.2 : 0.16), {});
    const py = top + ph * 0.56;
    c.fillStyle = C.line2; c.fillRect(x0, py, pw - 2 * m, 2);
    K.txt(c, 'THE POINT', x0, py + 44, { f: 'mono', s: 17, w: 700, c: C.orange, ls: 5 });
    const ps = pw > 700 ? 36 : 32;
    if (extra) K.marker(c, x0 - 6, py + 64, pw - 2 * m + 12, ps * 2.6, extra.marker, 'rgba(255,98,0,.18)');
    K.words(c, sc.point, x0, py + 104, { f: 'serif', s: ps, w: 700, i: true, maxW: pw - 2 * m, lh: ps * 1.3 });
    K.txt(c, `${sc.page} / 49`, 0, ph / 2 - 40, { f: 'mono', s: 18, w: 600, c: C.ink2, a: 'center', ls: 2 });
    if (extra && extra.note > 0) hand(c, sc.note, 0, ph / 2 - (ph > 800 ? 120 : 82), { s: ph > 800 ? 74 : 60, c: C.orange, p: extra.note });
    c.lineWidth = 2; c.strokeStyle = 'rgba(32,26,19,.2)'; c.strokeRect(-pw / 2, -ph / 2, pw, ph);
  }
  function shotRead(c, S) {
    const lt = S.lt; bgPaper(c);
    const tp = pk(S, { x: S.cx, y: 300, a: 'center' }, { x: 130, y: 400, a: 'left' }, { x: S.cx, y: 150, a: 'center' });
    slam(c, lt, 0, tp.x, tp.y, () => heavy(c, 'READ IT.', 0, 0, { s: pk(S, 150, 160, 110), c: C.ink, a: tp.a }), { from: 1.4 });
    const sub = S.sq ? ['48 lessons, word for word.'] : ['48 lessons, word for word.', "Plus Wally's margin notes."];
    sub.forEach((l, i) => K.txt(c, l, tp.x, tp.y + pk(S, 90, 100, 70) + i * 58, { f: 'serif', s: pk(S, 46, 48, 40), w: i ? 700 : 400, i: true, c: i ? C.orange : C.ink2, a: tp.a, alpha: clamp((lt - 0.3 - i * 0.25) * 4) }));
    const pp = pk(S, { x: S.cx, y: 1080, w: 820, h: 1000 }, { x: 1330, y: 545, w: 740, h: 900 }, { x: S.cx, y: 660, w: 640, h: 800 });
    const enter = E.outExpo(clamp(lt / 0.3));
    c.save(); c.translate(pp.x, pp.y + (1 - enter) * 900); c.rotate(0.02 * (1 - enter) + 0.012);
    // page block under the riffle
    c.save(); c.shadowColor = 'rgba(40,28,10,.3)'; c.shadowBlur = 40; c.shadowOffsetY = 16; c.fillStyle = '#EDE6D8'; c.fillRect(-pp.w / 2 + 10, -pp.h / 2 + 10, pp.w, pp.h); c.restore();
    for (let k = 4; k > 0; k--) { c.fillStyle = k % 2 ? '#F1EBDF' : '#E6DECD'; c.fillRect(-pp.w / 2 + k * 3, -pp.h / 2 + k * 3, pp.w, pp.h); }
    // riffle: flip i starts at 0.25 + i*0.25 and lasts 0.2 s
    const fl = (i) => clamp((lt - 0.25 - i * 0.25) / 0.2);
    let cur = 0; while (cur < RIFFLE.length - 1 && fl(cur) >= 1) cur++;
    const last = cur === RIFFLE.length - 1;
    const tLand = 0.25 + (RIFFLE.length - 1) * 0.25 + 0.2;
    page(c, RIFFLE[Math.min(cur + (last ? 0 : 1), RIFFLE.length - 1)], pp.w, pp.h, last ? { note: clamp((lt - tLand - 0.15) / 0.45), marker: clamp((lt - tLand - 0.6) / 0.35) } : null);
    if (!last) {
      const p = E.inOutCubic(fl(cur));
      c.save(); c.translate(-pp.w / 2, 0); c.scale(Math.cos(p * Math.PI / 2) * (1 - p * 0.05), 1); c.translate(pp.w / 2, 0);
      page(c, RIFFLE[cur], pp.w, pp.h);
      c.fillStyle = `rgba(0,0,0,${0.25 * p})`; c.fillRect(-pp.w / 2, -pp.h / 2, pp.w, pp.h);
      c.restore();
    }
    c.restore();
  }

  // 25–28  the hero shot: Wally, on his books, on the orange
  function shotHero(c, S) {
    const lt = S.lt; bgOrange(c, S, pk(S, S.cx, 1400, S.cx + 250), pk(S, 1300, 640, 760));
    const beat = Math.abs(Math.sin(S.t * Math.PI)); // half-time sway for the breakdown
    const wp = pk(S, { x: S.cx, y: 1560, s: 1.05 }, { x: 1400, y: 1050, s: 1.12 }, { x: S.cx + 250, y: 1060, s: 0.8 });
    const spark = lt > 1.95 ? Math.sin(clamp((lt - 1.95) / 0.5) * Math.PI) : 0;
    c.save(); c.fillStyle = 'rgba(120,30,0,.25)'; c.beginPath(); c.ellipse(wp.x, wp.y + 4, 260 * wp.s, 30 * wp.s, 0, 0, 7); c.fill(); c.restore();
    wally(c, { x: wp.x, y: wp.y, s: wp.s, seated: 1, rot: Math.sin(S.t * Math.PI) * 0.025, earL: beat * 0.12, earR: beat * 0.12, trunk: { bend: Math.sin(S.t * Math.PI) * 0.3 - 0.2, lift: 0.2 + spark * 0.5, curl: 0.2 }, sparkle: spark * 1.4 });
    const tp = pk(S, { x: S.cx, y: 330, a: 'center' }, { x: 130, y: 360, a: 'left' }, { x: S.cx, y: 150, a: 'center' });
    const fs = pk(S, 84, 92, 66), gap = fs * 1.2;
    const L = [['Tokenized real-world', 0, { c: '#FFFFFF', w: 700 }], ['assets, explained.', 0.25, { c: '#FFFFFF', w: 700 }], ['By an elephant.', 1.0, { c: C.ink, w: 700, i: true }]];
    L.forEach(([s, a, o], i) => {
      const y = tp.y + i * gap + (i === 2 ? fs * 0.35 : 0);
      slam(c, lt, a, tp.x, y, () => {
        if (o.c === '#FFFFFF') K.txt(c, s, 6, 6, { f: 'serif', s: fs, w: o.w, i: o.i, c: 'rgba(90,25,0,.45)', a: tp.a });
        K.txt(c, s, 0, 0, { f: 'serif', s: fs * (i === 2 ? 1.1 : 1), w: o.w, i: o.i, c: o.c, a: tp.a });
      }, { from: 1.25, d: 0.25 });
    });
    if (S.land) K.note(c, '(in sunglasses)', 136, tp.y + 3 * gap + 60, { p: clamp((lt - 1.9) / 0.4), s: 64, c: C.ink, rot: -0.04 });
    else hand(c, '(in sunglasses)', tp.x, tp.y + 3 * gap + 50, { s: pk(S, 66, 0, 52), c: C.ink, p: clamp((lt - 1.9) / 0.4) });
  }

  // 28–32  end card
  function shotEnd(c, S) {
    const lt = S.lt; bgPaper(c);
    const cvp = pk(S, { x: S.cx - 150, y: 1180, w: 400 }, { x: 470, y: 560, w: 470 }, { x: S.cx - 200, y: 770, w: 260 });
    c.save(); c.globalAlpha = 0.6; rays(c, cvp.x, cvp.y, S.t, 'rgba(255,98,0,.08)'); c.restore();
    popAt(c, lt, 0.0, cvp.x, cvp.y, () => K.cover(c, 0, 0, cvp.w, { rot: -0.05, t: S.t }), 0.35);
    const wp = pk(S, { x: S.cx + 250, y: 1520, s: 0.55 }, { x: 860, y: 1000, s: 0.55 }, { x: S.cx + 190, y: 990, s: 0.4 });
    const wq = E.outBack(clamp((lt - 0.4) / 0.35), 1.4);
    if (wq > 0) { c.save(); c.translate(wp.x, wp.y); c.scale(wq, wq); wally(c, { x: 0, y: 0, s: wp.s, rot: 0.04, trunk: { bend: -0.7 + Math.sin(S.t * 5) * 0.25, lift: 0.9, curl: 0.3 }, earL: 0.08, earR: 0.08, sparkle: lt > 2.0 ? Math.sin(clamp((lt - 2.0) / 0.45) * Math.PI) : 0 }); c.restore(); }
    const tp = pk(S, { x: S.cx, y: 400 }, { x: 1390, y: 360 }, { x: S.cx, y: 170 });
    const ts = pk(S, 150, 130, 110), mw = pk(S, W - 100, 930, W - 100);
    slam(c, lt, 0, tp.x, tp.y, () => heavy(c, "WALLY'S", 0, 0, { f: 'mono', s: ts, c: C.ink, maxW: mw }), { from: 1.5 });
    slam(c, lt, 0.12, tp.x, tp.y + ts * 1.02, () => heavy(c, 'RWA TEXTBOOK', 0, 0, { f: 'mono', s: ts, c: C.orange, maxW: mw }), { from: 1.5 });
    const gy = tp.y + ts * 1.02 + pk(S, 120, 110, 95);
    K.words(c, 'Watch it. Play it. Read it.', tp.x, gy, { f: 'serif', s: pk(S, 56, 52, 46), w: 400, i: true, c: C.ink2, a: 'center', t: lt - 0.5, per: 0.07 });
    const cy = gy + pk(S, 120, 110, 95);
    popAt(c, lt, 1.0, tp.x, cy, () => K.chip(c, 'rwaf.xyz/guide', 0, 0, { s: pk(S, 50, 46, 42), fill: C.orange, c: '#FFFFFF', a: 'center', ls: 1, padX: 46, h: pk(S, 104, 96, 88), w: 700 }), 0.35);
    const fy = pk(S, 1610, cy + 140, 1050), fx = pk(S, S.cx, tp.x, S.cx);
    const fa = clamp((lt - 1.5) * 3);
    if (fa > 0) {
      c.save(); c.globalAlpha = fa;
      const t1 = 'CREATED BY RWA FOUNDATION', t2 = '@wallycollection';
      const fs = pk(S, 24, 22, 20);
      const w1 = K.measure(c, t1, { f: 'mono', s: fs, w: 700, ls: 3 });
      K.rwafMark(c, fx - w1 / 2 - 34, fy - fs * 0.4, 46, C.ink);
      K.txt(c, t1, fx + 10, fy, { f: 'mono', s: fs, w: 700, c: C.ink, a: 'center', ls: 3 });
      if (!S.sq) K.txt(c, t2, fx, fy + fs * 1.8, { f: 'mono', s: fs, w: 600, c: C.ink2, a: 'center', ls: 3 });
      c.restore();
    }
  }

  const SHOTS = [
    [0, 2, shotNeon], [2, 3.85, shotPromise], [3.85, 6, shotTextbook], [6, 8, shotNo], [8, 14, shotNotes],
    [14, 16, shotNumbers], [16, 19, shotWatch], [19, 22, shotPlay], [22, 25, shotRead], [25, 28, shotHero], [28, 32, shotEnd],
  ];
  // camera hits (time, shake px) and white flashes on the big downbeats
  const HITS = [[4.0, 22], [4.5, 8], [6.0, 12], [7.0, 12], [14.0, 14], [14.5, 14], [15.0, 14], [15.5, 18], [20.5, 16], [21.5, 10], [28.0, 12]];
  const FLASH = [4.0, 14.0, 16.0, 25.0, 28.0];

  function renderAt(t) {
    t = clamp(t, 0, DUR - 1e-6);
    let i = 0; while (i < SHOTS.length - 1 && t >= SHOTS[i + 1][0]) i++;
    const [a, b, fn] = SHOTS[i];
    const S = { t, lt: t - a, d: b - a, W, H, cx: W / 2, cy: H / 2, port: H > W * 1.2, land: W > H * 1.2 };
    S.sq = !S.port && !S.land;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    // camera: punch-in on every cut, a soft pulse on every beat while the groove plays, shakes on hits
    let z = 1 + 0.06 * Math.exp(-S.lt * 14);
    if (t >= 4 && t < 25) { const bt = t % B; z += 0.012 * Math.exp(-bt * 12); }
    let sx = 0, sy = 0; for (const [ht, amp] of HITS) { const s = K.shake(t, ht, amp, 0.3, ht); sx += s.x; sy += s.y; }
    ctx.save(); ctx.translate(S.cx + sx, S.cy + sy); ctx.scale(z, z); ctx.translate(-S.cx, -S.cy);
    fn(ctx, S);
    ctx.restore();
    for (const ft of FLASH) { const u = t - ft; if (u >= 0 && u < 0.14) { ctx.fillStyle = `rgba(255,255,255,${0.75 * (1 - u / 0.14)})`; ctx.fillRect(0, 0, W, H); } }
  }

  async function setup(canvas, fmt) {
    FMT = FORMATS[fmt] ? fmt : '9x16'; [W, H] = FORMATS[FMT];
    cv = canvas; cv.width = W; cv.height = H; ctx = cv.getContext('2d');
    if (!filmCv) {
      filmCv = document.createElement('canvas'); filmCv.width = 1280; filmCv.height = 720;
      window.FILM.init(filmCv);
      const fonts = ['900 40px Archivo', '700 40px Lora', 'italic 700 40px Lora', 'italic 400 40px Lora', '400 40px Lora', '700 40px Caveat', '900 40px "Geist Mono"', '700 40px "Geist Mono"', '600 40px "Geist Mono"', '40px "Noto Color Emoji"'];
      await Promise.all(fonts.map((f) => document.fonts.load(f, 'Aa🚀🤞🌯')));
      await Promise.all([K.loadAssets(), loadMascots()]);
    }
    K.paper(W, H); K.paper(W, H, '#1C150F', 9);
    for (const k in fitCache) delete fitCache[k];
  }

  window.TRAILER = { DUR, BPM: 120, FORMATS, setup, renderAt, get size() { return [W, H]; } };
})();
