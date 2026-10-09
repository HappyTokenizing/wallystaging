"""music.py: the trailer's 32-second soundtrack, synthesized from scratch (numpy only).

Late-night noir R&B at 90 BPM in C minor (Cm9 - Abmaj9 - Fm9 - G7alt), one beat = 2/3 s, one bar = 8/3 s.
Every hit lines up with a cut in trailer.js:
  bars 0-3   (0 - 10.67)    sub drone, breathy 'ah' pad, FM Rhodes, vinyl; a heartbeat kick creeps in;
                            riser + reverse cymbal, then a half-beat of silence before the drop
  bar 4      (10.67 - 13.3) the drop: 808, trap hats, clap; a boom under every word
  bars 5-8   (13.3 - 22.67) the groove; a big swell for the WALLY reveal (16.0); whooshes on the
                            WATCH / PLAY / READ cuts, a stamp on DENIED
  34-40 b    (22.67 - 26.67) the cover: drums thin out, riser
  40-48 b    (26.67 - 32)   end card: final boom, the chord rings out, a soft chime on the lockup

Writes soundtrack.wav (48 kHz stereo, loudness-normalised by ffmpeg to -14 LUFS for social).
    python3 marketing/trailer/music.py
"""
import json
import os
import subprocess
import wave

import numpy as np

SR = 48000
DUR = 32.0
B = 2 / 3
BAR = 4 * B
N = int(SR * DUR)
rng = np.random.default_rng(11)
HERE = os.path.dirname(os.path.abspath(__file__))


def tt(d):
    return np.arange(int(SR * d)) / SR


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def onepole_lp(x, fc):
    """One-pole low-pass; fc may be a scalar or a per-sample array."""
    fc = np.broadcast_to(np.asarray(fc, dtype=float), x.shape)
    a = 1 - np.exp(-2 * np.pi * fc / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc += a[i] * (x[i] - acc)
        y[i] = acc
    return y


def hp(x, fc):
    return x - onepole_lp(x, fc)


class Bus:
    def __init__(self):
        self.x = np.zeros((N, 2))

    def add(self, sig, at, gain=1.0, pan=0.0):
        i = int(round(at * SR))
        if i >= N:
            return
        if sig.ndim == 1:
            sig = np.stack([sig * np.sqrt((1 - pan) / 2) * 1.414, sig * np.sqrt((1 + pan) / 2) * 1.414], 1)
        j = min(N, i + len(sig))
        self.x[i:j] += sig[: j - i] * gain


# ------------------------------------------------------------------ instruments
CHORDS = [  # (808 root, voicing)
    (36, [51, 55, 58, 62]),  # Cm9
    (32, [48, 51, 55, 58]),  # Abmaj9
    (29, [48, 51, 55, 56]),  # Fm9
    (31, [53, 56, 59, 63]),  # G7(b9 #5)
]


def chord_at(t):
    return CHORDS[int(t // BAR) % 4]


def rhodes_note(m, d, vel=1.0, decay=0.9):
    t = tt(d)
    f = mtof(m)
    idx = vel * (1.6 * np.exp(-t * 3.5) + 0.25)
    s = np.sin(2 * np.pi * f * t + idx * np.sin(2 * np.pi * f * t))
    s += 0.12 * vel * np.sin(2 * np.pi * f * 13.9 * t) * np.exp(-t * 28)  # tine
    env = np.minimum(1, t / 0.004) * np.exp(-t * decay) * np.minimum(1, (d - t) / 0.25)
    return s * env * (1 + 0.12 * np.sin(2 * np.pi * 4.2 * t))


def rhodes(notes, d, vel=1.0, decay=0.9):
    out = np.zeros((int(SR * d), 2))
    for k, m in enumerate(notes):
        pan = -0.5 + k / max(1, len(notes) - 1)
        s = rhodes_note(m, d, vel, decay) * 0.22
        out[:, 0] += s * np.sqrt((1 - pan) / 2) * 1.414
        out[:, 1] += s * np.sqrt((1 + pan) / 2) * 1.414
    return out


def ah_pad(notes, d, attack=0.7):
    """Breathy 'ah' choir: additive harmonics shaped by vowel formants, with a little vibrato and breath."""
    t = tt(d)
    out = np.zeros_like(t)
    vib = 1 + 0.004 * np.sin(2 * np.pi * 5.1 * t)
    for m in notes:
        f = mtof(m)
        for n in range(1, 40):
            fn = f * n
            if fn > 5000:
                break
            a = sum(g * np.exp(-((fn - F) / bw) ** 2) for F, bw, g in ((720, 140, 1.0), (1180, 170, 0.5), (2600, 300, 0.22))) + 0.02
            out += a / n ** 0.6 * np.sin(2 * np.pi * fn * t * vib + n)
    breath = onepole_lp(rng.uniform(-1, 1, len(t)), 2500) * 0.25
    env = np.minimum(1, t / attack) * np.minimum(1, (d - t) / 0.6)
    return (out / len(notes) * 0.09 + breath * 0.05) * env


def sub(m, d):
    t = tt(d)
    env = np.minimum(1, t / 0.8) * np.minimum(1, (d - t) / 0.8)
    return np.sin(2 * np.pi * mtof(m) * t) * env * 0.5


def b808(m, d, glide_to=None):
    t = tt(d)
    f0 = mtof(m)
    f = np.full_like(t, f0) * (1 + 0.6 * np.exp(-t * 40))
    if glide_to is not None:
        g = np.clip((t - (d - 0.12)) / 0.12, 0, 1)
        f *= 2 ** ((glide_to - m) * g / 12)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR)
    env = np.minimum(1, t / 0.003) * np.exp(-t * 0.9) * np.minimum(1, (d - t) / 0.03)
    return np.tanh(s * env * 2.6) * 0.75


def kick(d=0.5):
    t = tt(d)
    f = 42 + 110 * np.exp(-t * 30)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7)
    s[: int(0.003 * SR)] += rng.uniform(-1, 1, int(0.003 * SR)) * 0.3
    return np.tanh(s * 1.4)


def heartbeat():
    t = tt(0.35)
    return np.sin(2 * np.pi * np.cumsum(38 + 40 * np.exp(-t * 25)) / SR) * np.exp(-t * 11) * 0.8


def clap():
    t = tt(0.4)
    n = rng.uniform(-1, 1, len(t))
    env = np.exp(-t * 14)
    for k in (0.0, 0.012, 0.024):
        env += np.where(t >= k, np.exp(-(t - k) * 80), 0) * 0.8
    snap = hp(onepole_lp(n, 5000), 1100) * env
    body = np.sin(2 * np.pi * 185 * t) * np.exp(-t * 25) * 0.4
    s = snap + body
    return s / np.max(np.abs(s))


def hat(open_=False):
    t = tt(0.35 if open_ else 0.05)
    return hp(rng.uniform(-1, 1, len(t)), 8000) * np.exp(-t * (10 if open_ else 80))


def boom(d=3.0):
    t = tt(d)
    s = np.sin(2 * np.pi * np.cumsum(32 + 70 * np.exp(-t * 14)) / SR) * np.exp(-t * 1.4)
    shimmer = hp(rng.uniform(-1, 1, len(t)), 4000) * np.exp(-t * 2.2) * 0.12
    return np.tanh(s * 1.8) * 0.9 + shimmer


def reverse_cymbal(d):
    t = tt(d)
    n = hp(rng.uniform(-1, 1, len(t)), 3000)
    return n * (t / d) ** 3 * 0.7


def riser(d):
    t = tt(d)
    u = t / d
    s = onepole_lp(rng.uniform(-1, 1, len(t)), 200 + 6000 * u ** 2.5) * u ** 2.2
    tone = np.sin(2 * np.pi * np.cumsum(110 + 440 * u ** 2) / SR) * 0.15 * u ** 2
    return s + tone


def whoosh(d=0.5):
    t = tt(d)
    u = t / d
    return onepole_lp(rng.uniform(-1, 1, len(t)), 400 + 4000 * np.sin(np.pi * u)) * np.sin(np.pi * u) ** 2 * 1.6


def stamp():
    t = tt(0.5)
    thud = np.sin(2 * np.pi * np.cumsum(40 + 100 * np.exp(-t * 35)) / SR) * np.exp(-t * 10)
    slap = onepole_lp(rng.uniform(-1, 1, len(t)), 1500) * np.exp(-t * 30) * 1.2
    return np.tanh((thud + slap) * 1.4)


def chime(f, d=2.5):
    t = tt(d)
    s = sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t * 2.2 * r ** 0.5) for r, a in ((1, 1), (2.76, 0.35), (5.4, 0.15)))
    return s * np.minimum(1, t / 0.003) * 0.35


def pen():
    t = tt(0.5)
    n = hp(onepole_lp(rng.uniform(-1, 1, len(t)), 5000), 2000)
    return n * (0.5 + 0.5 * np.abs(np.sin(2 * np.pi * 9 * t))) * np.minimum(1, (0.5 - t) / 0.1) * 0.3


def vinyl():
    x = onepole_lp(rng.uniform(-1, 1, N), 3000) * 0.012
    for i in rng.integers(0, N - 50, 600):
        x[i:i + 40] += rng.uniform(-1, 1) * 0.12 * np.exp(-np.arange(40) / 6)
    return x


def reverb(x, secs=2.4, mix=0.3):
    ir_t = tt(secs)
    ir = rng.uniform(-1, 1, (len(ir_t), 2)) * np.exp(-ir_t * 3.0)[:, None]
    ir[:, 0] = onepole_lp(ir[:, 0], 4500)
    ir[:, 1] = onepole_lp(ir[:, 1], 4500)
    ir /= np.sqrt(np.sum(ir ** 2, 0))
    n = 1 << int(np.ceil(np.log2(len(x) + len(ir))))
    wet = np.stack([np.fft.irfft(np.fft.rfft(x[:, c], n) * np.fft.rfft(ir[:, c], n), n)[: len(x)] for c in (0, 1)], 1)
    return x + wet * mix


def main():
    drums, keys, pads, bass, fx, kicks = Bus(), Bus(), Bus(), Bus(), Bus(), []
    KK, CL, HC, HO = kick(), clap(), hat(), hat(True)
    at = lambda beats: beats * B  # noqa: E731

    # ---- intro: bars 0-3
    pads.add(sub(24, at(16)), 0.0, 0.4)
    for bar in range(4):
        root, notes = CHORDS[bar]
        keys.add(rhodes(notes, BAR + 0.6, 0.8), at(bar * 4), 0.5)
        keys.add(rhodes([notes[-1] + 12], 1.0, 0.5), at(bar * 4 + 2.5), 0.3)
        pads.add(ah_pad([n + 12 for n in notes[1:3]], BAR + 0.4, 0.6 if bar else 1.4), at(bar * 4), 0.35 if bar else 0.25)
        if bar >= 1:  # rhodes answer phrase, quiet
            for j, n in enumerate(sorted(notes)[1:]):
                keys.add(rhodes([n + 12], 0.6, 0.35), at(bar * 4 + 1 + j * 0.5), 0.22)
        if bar >= 2:  # heartbeat kick
            for b_ in (0, 0.5, 2, 2.5):
                drums.add(heartbeat(), at(bar * 4 + b_), 0.35 if b_ % 1 == 0 else 0.2)
    fx.add(riser(at(4)), at(12), 0.45)
    fx.add(reverse_cymbal(at(2)), at(14), 0.6)

    # ---- the groove (bars 4 - 8.5, beats 16 - 34)
    KICK_AT = (0, 0.75, 2.75)
    for bar in range(4, 10):
        b0 = bar * 4
        root, notes = CHORDS[bar % 4]
        nxt = CHORDS[(bar + 1) % 4][0]
        thin = b0 >= 34  # cover shot: drums thin out
        keys.add(rhodes(notes, BAR + 0.4, 0.9), at(b0), 0.85)
        keys.add(rhodes([notes[1] + 12, notes[3] + 12], 0.9, 0.5), at(b0 + 1.5), 0.45)
        keys.add(rhodes([notes[2] + 12], 0.9, 0.45), at(b0 + 3), 0.4)
        for i, kb in enumerate(KICK_AT):
            tb = b0 + kb
            if tb >= 40:
                continue
            if not thin:
                drums.add(KK, at(tb), 1.0)
                kicks.append(at(tb))
            d = at((KICK_AT[i + 1] if i + 1 < len(KICK_AT) else 4) - kb)
            bass.add(b808(root, d, nxt if i == len(KICK_AT) - 1 else None), at(tb), 0.85 if not thin else 0.6)
        if not thin and b0 + 2 < 40:
            drums.add(CL, at(b0 + 2), 0.6)
        for e in range(8):  # hats on eighths, a triplet roll at the end of every other bar
            tb = b0 + e * 0.5
            if tb >= 40:
                continue
            drums.add(HC, at(tb), 0.22 if e % 2 else 0.3, 0.25)
        if bar % 2 == 1 and b0 + 3 < 40:
            for r in range(6):
                drums.add(HC, at(b0 + 3 + r / 6), 0.12 + r * 0.03, -0.25)
        if not thin and bar % 2 == 0:
            drums.add(HO, at(b0 + 3.5), 0.18)

    # the drop + one boom under each word (beats 16-19)
    fx.add(boom(), at(16), 0.9)
    for b_ in (17, 18, 19):
        fx.add(boom(1.4) * 0.6, at(b_), 0.55)
    # the reveal (beat 24): big swell
    fx.add(reverse_cymbal(at(2)), at(22), 0.5)
    fx.add(boom(), at(24), 0.9)
    pads.add(ah_pad([60, 63, 67, 70], at(4) + 0.5, 0.3), at(24), 0.7)
    # WATCH / PLAY / READ (beats 28, 30, 32), DENIED on beat 31, pen on 32.4
    for b_ in (28, 30, 32):
        fx.add(whoosh(0.45), at(b_) - 0.3, 0.45)
    fx.add(stamp(), at(31), 0.8)
    fx.add(pen(), at(32.4), 0.6)
    # cover shot (beats 34-40)
    pads.add(ah_pad([63, 67, 70, 74], at(6), 1.0), at(34), 0.45)
    fx.add(riser(at(5)), at(35), 0.4)
    fx.add(reverse_cymbal(at(2)), at(38), 0.5)

    # ---- end card (beats 40-48)
    fx.add(boom(4.0), at(40), 1.0)
    bass.add(b808(24, 3.0), at(40), 0.7)
    keys.add(rhodes([51, 55, 58, 62, 67], 5.3, 0.9, 0.35), at(40), 1.0)
    pads.add(ah_pad([63, 67, 70, 74], 5.3, 0.8), at(40), 0.9)
    for i, m in enumerate((79, 84, 86)):
        fx.add(chime(mtof(m), 3.5), at(42) + i * 0.12, 0.3)

    # ---- mix
    tN = np.arange(N) / SR
    duck = np.ones(N)
    for k in kicks:
        i = int(k * SR)
        j = min(N, i + int(0.35 * SR))
        duck[i:j] = np.minimum(duck[i:j], 1 - 0.4 * np.exp(-(tN[i:j] - k) / 0.12))
    # half-beat of silence before the drop (keep the reverse cymbal and the sub tail out of it)
    gap = np.ones(N)
    g0, g1 = int((at(16) - 0.28) * SR), int(at(16) * SR)
    gap[g0:g1] = np.linspace(1, 0, g1 - g0) ** 3
    music = reverb(keys.x + pads.x, 2.6, 0.38) * duck[:, None] * gap[:, None]
    low = bass.x * duck[:, None] ** 0.5
    mix = drums.x * 0.8 * gap[:, None] + low + music * 1.1 + reverb(fx.x, 2.0, 0.25) * 0.8
    vin = vinyl()
    mix += np.stack([vin, np.roll(vin, 37)], 1)
    fade = np.clip((DUR - tN) / 1.2, 0, 1) ** 1.3
    mix *= fade[:, None]
    mix = np.tanh(mix / np.max(np.abs(mix)) * 1.15) * 0.9

    raw = os.path.join(HERE, 'soundtrack.raw.wav')
    with wave.open(raw, 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((np.clip(mix, -1, 1) * 32767).astype('<i2').tobytes())
    out = os.path.join(HERE, 'soundtrack.wav')
    # two-pass linear loudnorm: hits -14 LUFS without squashing the quiet intro into the drop
    probe = subprocess.run(['ffmpeg', '-hide_banner', '-i', raw, '-af', 'loudnorm=I=-14:TP=-1.0:LRA=20:print_format=json', '-f', 'null', '-'], capture_output=True, text=True).stderr
    m = json.loads(probe[probe.rindex('{'):probe.rindex('}') + 1])
    af = ('loudnorm=I=-14:TP=-1.0:LRA=20:linear=true:measured_I={input_i}:measured_TP={input_tp}:measured_LRA={input_lra}:'
          'measured_thresh={input_thresh}:offset={target_offset}').format(**m)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', raw, '-af', af, '-ar', str(SR), '-t', str(DUR), out], check=True)
    os.remove(raw)
    print('wrote', out)


if __name__ == '__main__':
    main()
