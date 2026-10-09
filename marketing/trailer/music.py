"""music.py: the trailer's 32-second soundtrack, synthesized from scratch (numpy only).

120 BPM, one beat = 0.5 s, so every hit lines up with a cut in trailer.js:
  0-2    the shill ad: 808, hat rolls, air horns          -> record scratch + tape stop at 2.0
  2-4    deadpan: clock ticks, pops, two NO stamps, riser and snare roll
  4-14   the drop: four-on-the-floor, sidechained chord stabs, bass, pluck hook, note-card dings
  14-16  numbers: an impact and orchestral stab on every beat
  16-25  watch / play / read: full groove + film clicks, DENIED buzz, ADMITTED ding, page riffles
  25-28  breakdown: pads, claps, sparkle, riser
  28-32  end card: final hit and ring-out

Writes soundtrack.wav (48 kHz stereo, loudness-normalised by ffmpeg to -14 LUFS for social).
    python3 marketing/trailer/music.py
"""
import os
import subprocess
import wave

import numpy as np

SR = 48000
DUR = 32.0
B = 0.5
N = int(SR * DUR)
rng = np.random.default_rng(7)
HERE = os.path.dirname(os.path.abspath(__file__))


def tt(d):
    return np.arange(int(SR * d)) / SR


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def onepole_lp(x, fc):
    """One-pole low-pass; fc may be a scalar or an array (per-sample cutoff)."""
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


def saw(f, t, nh=24, bright=1.0):
    """Band-limited-ish saw by additive synthesis, upper harmonics rolled off by `bright`."""
    out = np.zeros_like(t)
    for n in range(1, nh + 1):
        if f * n > 16000:
            break
        out += np.sin(2 * np.pi * f * n * t) / n * np.exp(-(n - 1) * (1 - bright) * 0.6)
    return out


class Bus:
    def __init__(self):
        self.x = np.zeros((N, 2))

    def add(self, sig, at, gain=1.0, pan=0.0):
        i = int(at * SR)
        if i >= N:
            return
        if sig.ndim == 1:
            l, r = np.sqrt((1 - pan) / 2), np.sqrt((1 + pan) / 2)
            sig = np.stack([sig * l * 1.414, sig * r * 1.414], 1)
        j = min(N, i + len(sig))
        self.x[i:j] += sig[: j - i] * gain


# ------------------------------------------------------------------ one-shots
def kick(d=0.45):
    t = tt(d)
    f = 48 + 120 * np.exp(-t * 32)
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) * np.exp(-t * 6.5)
    s[: int(0.004 * SR)] += rng.uniform(-1, 1, int(0.004 * SR)) * 0.5
    return np.tanh(s * 1.6)


def k808(d=1.6, f0=55):
    t = tt(d)
    f = f0 + 60 * np.exp(-t * 25)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 1.6)
    return np.tanh(s * 2.2) * 0.8


def clap():
    t = tt(0.35)
    n = rng.uniform(-1, 1, len(t))
    env = np.exp(-t * 18)
    for k in (0.0, 0.011, 0.022):  # the classic triple slap
        env += np.where(t >= k, np.exp(-(t - k) * 90), 0) * 0.8
    s = hp(onepole_lp(n, 4500), 900) * env
    return s / np.max(np.abs(s))


def snare():
    t = tt(0.25)
    n = hp(rng.uniform(-1, 1, len(t)), 1200) * np.exp(-t * 22)
    body = np.sin(2 * np.pi * 190 * t) * np.exp(-t * 30)
    s = n + body * 0.6
    return s / np.max(np.abs(s))


def hat(open_=False):
    t = tt(0.3 if open_ else 0.06)
    n = hp(rng.uniform(-1, 1, len(t)), 7000)
    return n * np.exp(-t * (14 if open_ else 70))


def crash(d=2.2):
    t = tt(d)
    n = hp(rng.uniform(-1, 1, len(t)), 3500)
    metal = sum(np.sin(2 * np.pi * f * t) for f in (3150, 4270, 5590, 7120)) * 0.08
    return (n + metal) * np.exp(-t * 1.9) * 0.8


def impact():
    t = tt(2.0)
    boom = np.sin(2 * np.pi * np.cumsum(38 + 90 * np.exp(-t * 18)) / SR) * np.exp(-t * 2.2)
    return np.tanh(boom * 2) * 0.9 + crash(2.0) * 0.5


def riser(d):
    t = tt(d)
    u = t / d
    n = rng.uniform(-1, 1, len(t))
    s = onepole_lp(n, 300 + 9000 * u ** 2) * u ** 2
    sweep = np.sin(2 * np.pi * np.cumsum(200 + 1600 * u ** 2) / SR) * 0.25 * u ** 2
    return (s + sweep) * 0.9


def whoosh(d=0.45, up=False):
    t = tt(d)
    u = t / d
    env = np.sin(np.pi * u) ** 2
    fc = 500 + 5000 * (u if up else 1 - u)
    return onepole_lp(rng.uniform(-1, 1, len(t)), fc) * env * 2.2


def scratch():
    t = tt(0.42)
    wob = 380 + 900 * np.abs(np.sin(2 * np.pi * 5.5 * t)) * np.exp(-t * 2)
    ph = 2 * np.pi * np.cumsum(wob) / SR
    s = np.sign(np.sin(ph)) * 0.35 + onepole_lp(rng.uniform(-1, 1, len(t)), wob * 3) * 1.4
    env = np.minimum(1, t / 0.01) * np.exp(-t * 4)
    return np.tanh(s * env * 2) * 0.7


def stamp():
    t = tt(0.4)
    thud = np.sin(2 * np.pi * np.cumsum(45 + 110 * np.exp(-t * 40)) / SR) * np.exp(-t * 12)
    slap = onepole_lp(rng.uniform(-1, 1, len(t)), 1800) * np.exp(-t * 35) * 1.5
    return np.tanh((thud + slap) * 1.5)


def pop(f0=500):
    t = tt(0.09)
    f = f0 + 900 * (t / 0.09)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 40)


def bell(f, d=1.2, decay=4.0):
    t = tt(d)
    s = sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t * decay * r ** 0.5) for r, a in ((1, 1), (2.76, 0.45), (5.4, 0.25), (8.93, 0.1)))
    return s * np.minimum(1, t / 0.002) * 0.5


def buzz():
    t = tt(0.35)
    s = np.sign(np.sin(2 * np.pi * 98 * t)) + np.sign(np.sin(2 * np.pi * 103 * t))
    return onepole_lp(s * 0.4, 2200) * np.exp(-t * 4)


def tick():
    t = tt(0.03)
    return hp(rng.uniform(-1, 1, len(t)), 3000) * np.exp(-t * 200)


def flip():
    t = tt(0.16)
    return hp(onepole_lp(rng.uniform(-1, 1, len(t)), 6000), 1500) * np.sin(np.pi * t / 0.16) ** 2 * 1.4


def horn(d=0.32):
    t = tt(d)
    vib = 1 + 0.004 * np.sin(2 * np.pi * 6 * t)
    s = sum(saw(f, t * vib, 18) for f in (466.2, 469.0, 233.1, 587.3))
    env = np.minimum(1, t / 0.01) * np.where(t > d - 0.05, (d - t) / 0.05, 1)
    return np.tanh(onepole_lp(s, 3500) * 0.9) * env * 0.8


# ------------------------------------------------------------------ pitched parts (vi-IV-I-V in C: Am F C G)
CHORDS = [(57, [69, 72, 76]), (53, [65, 69, 72, 77]), (48, [64, 67, 72, 76]), (55, [62, 67, 71, 74])]


def chord_at(t):
    return CHORDS[int(t // 2) % 4]


def stab(notes, d=0.22):
    t = tt(d)
    s = np.zeros_like(t)
    for m in notes:
        for det in (-0.12, -0.05, 0.0, 0.05, 0.12):
            s += saw(mtof(m + det), t, 16, 0.75)
    env = np.minimum(1, t / 0.004) * np.exp(-t * 11)
    return np.tanh(s / len(notes) * 0.35) * env


def pad(notes, d):
    t = tt(d)
    s = np.zeros_like(t)
    for m in notes:
        for det in (-0.1, 0.0, 0.1):
            s += saw(mtof(m + det), t, 8, 0.4)
    env = np.minimum(1, t / 0.4) * np.minimum(1, (d - t) / 0.3)
    return s / len(notes) * 0.18 * env


def bass(m, d=0.22):
    t = tt(d)
    f = mtof(m - 12)
    s = np.sin(2 * np.pi * f * t) + 0.35 * saw(f, t, 8, 0.5)
    env = np.minimum(1, t / 0.004) * np.exp(-t * 6)
    return np.tanh(s * env * 1.6) * 0.8


def pluck(m, d=0.35):
    t = tt(d)
    f = mtof(m)
    s = sum(np.sin(2 * np.pi * f * n * t) / n * np.exp(-t * (6 + n * 5)) for n in range(1, 9))
    return s * np.minimum(1, t / 0.002) * 0.6


def reverb(x, secs=1.6, mix=0.25):
    ir_t = tt(secs)
    ir = rng.uniform(-1, 1, (len(ir_t), 2)) * np.exp(-ir_t * 4.2)[:, None]
    ir[:, 0] = onepole_lp(ir[:, 0], 5000)
    ir[:, 1] = onepole_lp(ir[:, 1], 5000)
    ir /= np.sqrt(np.sum(ir ** 2, 0))
    n = 1 << int(np.ceil(np.log2(len(x) + len(ir))))
    out = np.stack([np.fft.irfft(np.fft.rfft(x[:, c], n) * np.fft.rfft(ir[:, c], n), n)[: len(x)] for c in (0, 1)], 1)
    return x + out * mix


def main():
    drums, music, sfx, kicks = Bus(), Bus(), Bus(), []
    K, CL, SN, HC, HO = kick(), clap(), snare(), hat(), hat(True)
    STAB = {i: stab(n) for i, (_, n) in enumerate(CHORDS)}
    BASS = {r: bass(r) for r, _ in CHORDS}

    # ---- 0-2 the shill ad
    drums.add(k808(1.9, 49), 0.0, 0.9)
    drums.add(k808(0.9, 49), 1.0, 0.7)
    for k in (0.5, 1.5):
        drums.add(CL, k, 0.6)
    for i in range(16):
        tt_ = i * 0.125
        drums.add(HC, tt_, 0.25, 0.3)
    for i in range(6):  # triplet hat roll into the last beat
        drums.add(HC, 1.5 + i * (0.25 / 3), 0.22, -0.3)
    hs = horn()
    for a in (0.0, 0.125, 0.25):
        music.add(hs, a, 0.45)
    for a in (1.0, 1.125):
        music.add(hs, a, 0.4)
    music.add(horn(0.6), 1.25, 0.4)
    # tape stop at 2.0: everything slows to zero over 0.3 s
    pre = drums.x + music.x
    i0, i1 = int(1.9 * SR), int(2.25 * SR)
    seg_t = np.arange(i1 - i0) / SR
    speed = np.clip(1 - seg_t / 0.35, 0, 1) ** 1.5
    src = i0 + np.cumsum(speed) * 1.0
    for c in (0, 1):
        pre[i0:i1, c] = np.interp(src, np.arange(N), pre[:, c]) * np.clip(1 - seg_t / 0.35, 0, 1)
    pre[i1:] = 0
    drums.x[:] = 0
    music.x[:] = pre  # the ad section lives on the music bus from here
    sfx.add(scratch(), 1.95, 0.8)

    # ---- 2-4 deadpan
    for i in range(4):
        sfx.add(tick(), 2.25 + i * 0.5, 0.55, 0.4 if i % 2 else -0.4)
    music.add(pluck(57, 1.2) + pluck(60, 1.2) + pluck(64, 1.2), 2.05, 0.4)
    sfx.add(pop(450), 2.5, 0.8, -0.3)
    sfx.add(pop(520), 3.0, 0.8, 0.3)
    sfx.add(stamp(), 3.5, 0.8, -0.2)
    sfx.add(stamp(), 3.625, 0.8, 0.2)
    sfx.add(riser(1.0), 3.0, 0.45)
    sfx.add(whoosh(0.2, up=False), 3.82, 0.6)
    for i in range(8):  # snare roll, 16ths to 32nds, crescendo
        drums.add(SN, 3.5 + i * 0.0625, 0.15 + i * 0.06)

    # ---- groove helper
    def groove(a, b, hook=True, stabs=True):
        t = a
        while t < b - 1e-9:
            beat = round((t - a) / B)
            drums.add(K, t, 1.0)
            kicks.append(t)
            if beat % 2 == 1:
                drums.add(CL, t, 0.55)
            drums.add(HO, t + 0.25, 0.18, 0.25)
            drums.add(HC, t + 0.125, 0.1, -0.25)
            drums.add(HC, t + 0.375, 0.1, -0.25)
            root, notes = chord_at(t)
            music.add(BASS[root], t + 0.25, 0.55)
            music.add(BASS[root], t, 0.35)
            if stabs:
                idx = CHORDS.index(chord_at(t))
                music.add(STAB[idx], t + 0.25, 0.32, -0.15)
                if beat % 4 == 3:
                    music.add(STAB[idx], t + 0.375, 0.22, 0.15)
            t += B
        if hook:  # pluck hook, one phrase per bar
            HOOK = [(0, 0), (0.375, 2), (0.75, 4), (1.0, 3), (1.25, 2), (1.5, 4)]
            bar = a
            while bar < b - 1e-9:
                root, notes = chord_at(bar)
                tones = sorted(notes) + [n + 12 for n in sorted(notes)]
                for off, k in HOOK:
                    if bar + off < b:
                        music.add(pluck(tones[k] + 12, 0.3), bar + off, 0.22, 0.35 if k % 2 else -0.35)
                bar += 2 * B * 2

    # ---- 4-14 the drop
    drums.add(impact(), 4.0, 0.9)
    groove(4.0, 8.0, hook=False)
    sfx.add(stamp(), 6.0, 0.7)
    sfx.add(stamp(), 7.0, 0.7)
    sfx.add(stamp(), 6.5, 0.5)
    sfx.add(stamp(), 7.5, 0.5)
    drums.add(crash(1.5), 8.0, 0.4)
    groove(8.0, 14.0)
    for i in range(6):  # each note card: a whoosh + a ding
        sfx.add(whoosh(0.18), 8.0 + i - 0.06, 0.35, 0.5 if i % 2 else -0.5)
        sfx.add(bell(mtof(84 + [0, 3, 7, 5, 2, 7][i]), 0.8), 8.12 + i, 0.18)

    # ---- 14-16 numbers
    for i in range(4):
        a = 14.0 + i * B
        drums.add(impact() * 0.7, a, 0.75)
        drums.add(K, a, 1.0)
        kicks.append(a)
        root, notes = CHORDS[[0, 1, 2, 3][i]]
        music.add(stab([n - 12 for n in notes] + notes, 0.4), a, 0.55)
    for i in range(16):
        drums.add(SN, 15.5 + i * 0.03125, 0.1 + i * 0.03)
    sfx.add(riser(0.5), 15.5, 0.5)

    # ---- 16-25 watch / play / read
    drums.add(crash(2.0), 16.0, 0.5)
    groove(16.0, 25.0)
    for i in range(6):
        sfx.add(tick(), 16.0 + i * B, 0.6)
    sfx.add(whoosh(0.3, True), 18.85, 0.5)
    sfx.add(stamp(), 20.5, 1.0)
    sfx.add(buzz(), 20.62, 0.35)
    sfx.add(whoosh(0.25), 20.95, 0.5)
    sfx.add(stamp(), 21.5, 0.9)
    sfx.add(bell(mtof(88), 1.0) + bell(mtof(95), 1.0), 21.62, 0.3)
    for i in range(7):
        sfx.add(flip(), 22.25 + i * 0.25, 0.5, 0.3 if i % 2 else -0.3)
    sfx.add(bell(mtof(91), 0.9), 24.4, 0.15)

    # ---- 25-28 breakdown
    drums.add(crash(2.5), 25.0, 0.45)
    music.add(pad(CHORDS[0][1], 2.0), 25.0, 1.0)
    music.add(pad(CHORDS[1][1], 1.2), 27.0, 1.0)
    for a in np.arange(25.0, 28.0, B):
        music.add(BASS[chord_at(a)[0]], a, 0.3)
        drums.add(HC, a + 0.25, 0.12)
    for a in (25.5, 26.5, 27.5):
        drums.add(CL, a, 0.5)
    for i, m in enumerate((84, 88, 91, 96, 100)):
        sfx.add(bell(mtof(m), 0.7, 6), 26.95 + i * 0.045, 0.16)
    sfx.add(riser(1.5), 26.5, 0.55)
    for i in range(16):
        drums.add(SN, 27.5 + i * 0.03125, 0.08 + i * 0.035)

    # ---- 28-32 end card
    drums.add(impact(), 28.0, 1.0)
    drums.add(K, 28.0, 1.0)
    kicks.append(28.0)
    final = [60, 64, 67, 72, 76]
    music.add(stab([48] + final, 0.6), 28.0, 0.6)
    music.add(pad(final, 3.6), 28.0, 0.9)
    music.add(bass(48, 2.0), 28.0, 0.5)
    sfx.add(pop(600), 29.0, 0.4)
    for i, m in enumerate((72, 76, 79, 84)):
        music.add(pluck(m, 0.6), 29.0 + i * 0.125, 0.25)
    for i, m in enumerate((84, 88, 91, 96)):
        sfx.add(bell(mtof(m), 0.7, 6), 30.0 + i * 0.05, 0.12)

    # ---- mix: sidechain the music to the kick, reverb, glue
    tN = np.arange(N) / SR
    duck = np.ones(N)
    for k in kicks:
        i = int(k * SR)
        j = min(N, i + int(0.3 * SR))
        u = tN[i:j] - k
        duck[i:j] = np.minimum(duck[i:j], 1 - 0.6 * np.exp(-u / 0.09))
    mus = reverb(music.x, 1.8, 0.22) * duck[:, None]
    mix = drums.x * 0.9 + mus + reverb(sfx.x, 1.0, 0.15) * 0.8
    fade = np.clip((DUR - tN) / 1.2, 0, 1) ** 1.5
    mix *= fade[:, None]
    mix = np.tanh(mix / np.max(np.abs(mix)) * 1.4) * 0.9

    raw = os.path.join(HERE, 'soundtrack.raw.wav')
    with wave.open(raw, 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((np.clip(mix, -1, 1) * 32767).astype('<i2').tobytes())
    out = os.path.join(HERE, 'soundtrack.wav')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', raw, '-af', 'loudnorm=I=-14:TP=-1.0:LRA=9', '-ar', str(SR), '-t', str(DUR), out], check=True)
    os.remove(raw)
    print('wrote', out)


if __name__ == '__main__':
    main()
