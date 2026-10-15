"""Synthesizes the video's sound effects from the cue list stage.html exports.

Usage: python3 sfx.py cues.json out.wav
Every sound is generated here (no samples), so the track has no licensing
dependencies. Cues: pop, thud, whoosh, tick, key, click, chime, final; an optional p
scales pop, thud and whoosh, or sets a tick's pitch.
"""
import json
import sys
import wave

import numpy as np

SR = 48000
rng = np.random.default_rng(7)


def seconds(d):
    return np.arange(int(d * SR)) / SR


def sweep(f0, f1, d, curve=4.0):
    t = seconds(d)
    f = f1 + (f0 - f1) * np.exp(-t * curve / d)
    return np.sin(2 * np.pi * np.cumsum(f) / SR)


def click():
    t = seconds(0.05)
    noise = rng.standard_normal(t.size) * np.exp(-t / 0.002) * 0.5
    tone = np.sin(2 * np.pi * 1700 * t) * np.exp(-t / 0.01) * 0.6 + np.sin(2 * np.pi * 820 * t) * np.exp(-t / 0.018) * 0.35
    return (noise + tone) * 0.42


def key():
    t = seconds(0.035)
    f = rng.uniform(2300, 3300)
    noise = rng.standard_normal(t.size) * np.exp(-t / 0.0014) * 0.6
    tone = np.sin(2 * np.pi * f * t) * np.exp(-t / 0.005) * 0.4
    return (noise + tone) * rng.uniform(0.12, 0.18)


def tick(p=0.0):
    t = seconds(0.03)
    return np.sin(2 * np.pi * (2400 + 1600 * p) * t) * np.exp(-t / 0.006) * 0.11


def pop(p=1.0):
    d = 0.12
    t = seconds(d)
    return sweep(1150, 380, d, 6) * np.exp(-t / 0.045) * 0.34 * p


def thud(p=1.0):
    d = 0.35
    t = seconds(d)
    body = sweep(150, 52, d, 5) * np.exp(-t / 0.13)
    hit = rng.standard_normal(t.size) * np.exp(-t / 0.004) * 0.25
    return (body + hit) * 0.5 * p


def lowpass(x, cutoff):
    y = np.zeros_like(x)
    acc = 0.0
    for i, (v, c) in enumerate(zip(x, cutoff)):
        a = 1 - np.exp(-2 * np.pi * c / SR)
        acc += a * (v - acc)
        y[i] = acc
    return y


def whoosh(p=1.0):
    d = 0.6
    t = seconds(d)
    shape = np.sin(np.pi * np.clip(t / d, 0, 1) ** 0.7) ** 2
    cutoff = 350 + 4200 * shape
    return lowpass(rng.standard_normal(t.size), cutoff) * shape * 0.55 * p


def bell(freq, d, decay):
    t = seconds(d)
    tone = np.sin(2 * np.pi * freq * t) + 0.28 * np.sin(2 * np.pi * freq * 2.01 * t) * np.exp(-t / (decay / 3))
    attack = np.clip(t / 0.004, 0, 1)
    return tone * attack * np.exp(-t / decay)


def chime():
    out = np.zeros(int(0.9 * SR))
    for start, f in ((0.0, 783.99), (0.085, 1174.66)):
        b = bell(f, 0.8, 0.28) * 0.2
        i = int(start * SR)
        out[i:i + b.size] += b[: out.size - i]
    return out


def final():
    out = np.zeros(int(2.0 * SR))
    for k, f in enumerate((523.25, 659.25, 783.99, 1046.5)):
        b = bell(f, 1.9, 0.6) * 0.13
        i = int(k * 0.035 * SR)
        out[i:i + b.size] += b[: out.size - i]
    th = thud() * 0.8
    out[: th.size] += th
    return out


SOUNDS = {'click': click, 'key': key, 'tick': tick, 'pop': pop, 'thud': thud, 'whoosh': whoosh, 'chime': chime, 'final': final}
PAN = {'whoosh': None, 'key': 0.15, 'click': 0.1}


def main(cues_path, out_path):
    cues = json.load(open(cues_path))
    mix = np.zeros((int((cues['duration'] + 2.5) * SR), 2))
    for ev in cues['events']:
        fn = SOUNDS[ev['k']]
        sound = fn(ev['p']) if 'p' in ev and ev['k'] in ('tick', 'pop', 'thud', 'whoosh') else fn()
        i = int(ev['t'] * SR)
        n = min(sound.size, mix.shape[0] - i)
        if n <= 0:
            continue
        if ev['k'] == 'whoosh':
            pan = np.linspace(-0.6, 0.6, n)
        else:
            pan = np.full(n, rng.uniform(-1, 1) * PAN.get(ev['k'], 0.0))
        mix[i:i + n, 0] += sound[:n] * np.sqrt((1 - pan) / 2) * np.sqrt(2)
        mix[i:i + n, 1] += sound[:n] * np.sqrt((1 + pan) / 2) * np.sqrt(2)
    mix = mix[: int(cues['duration'] * SR)]
    fade = int(0.4 * SR)
    mix[-fade:] *= np.linspace(1, 0, fade)[:, None]
    peak = np.abs(mix).max() or 1
    mix = mix / peak * 0.7  # about -3 dBFS
    data = (np.clip(mix, -1, 1) * 32767).astype('<i2')
    with wave.open(out_path, 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data.tobytes())


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
