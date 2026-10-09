# Wally's RWA Textbook: social trailer ("WALLY. Eau de Due Diligence.")

A 32-second trailer for `/guide` shot like a luxury fragrance or watch ad: near-black frames, gold rim
light, film grain and bokeh, slow push-ins, copy that resolves out of a blur, and a late-night noir R&B
score. Three cuts:

| File | Use it for |
| --- | --- |
| `out/wally-rwa-textbook-trailer-9x16.mp4` | Reels, TikTok, YouTube Shorts, X vertical |
| `out/wally-rwa-textbook-trailer-16x9.mp4` | X / LinkedIn / YouTube in-feed (2.39:1 letterbox) |
| `out/wally-rwa-textbook-trailer-1x1.mp4` | Square feed posts |

All three are 60 fps H.264 + AAC with `+faststart`, normalised to about -14 LUFS.

## The edit (90 BPM; beat = 2/3 s, every cut on a beat)

| Time | Shot |
| --- | --- |
| 0 – 2.7 s | A gold line draws across the dark. *RWA Foundation presents.* |
| 2.7 – 5.3 s | Extreme close-up: Wally's sunglasses, a reflection glides across the lenses. *He doesn't chase pumps.* |
| 5.3 – 8 s | A gold coin turns in the dark. *He asks who holds the gold.* |
| 8 – 10.7 s | Lesson 1.4 in shallow focus; the point is highlighted in gold. *He reads the fine print.* |
| 10.7 – 13.3 s | The drop. CUSTODY · SETTLEMENT · YIELD · RED FLAGS, one per beat, over graded footage from the film |
| 13.3 – 16 s | *No price calls. No hopium.* JUST THE PAPERWORK |
| 16 – 18.7 s | The reveal: Wally under a spotlight. **WALLY** *eau de due diligence* |
| 18.7 – 22.7 s | WATCH. (the film) · PLAY. (BARZ gets DENIED in *Tokens, Please*) · READ. (11.4, "onchain ≠ okay") |
| 22.7 – 26.7 s | Product shot: the cover turns on a mirror-black floor. *49 pages. 11 chapters. Zero hype.* |
| 26.7 – 32 s | *Read responsibly.* → WALLY'S RWA TEXTBOOK · Watch it. Play it. Read it. · **rwaf.xyz/guide** · Created by RWA Foundation · @wallycollection · Educational content only. Not financial advice. |

Lesson text, margin notes, page numbers and the *Tokens, Please* case come from the book's own data
(`guide/film/timeline.js`, `guide/data/cases.js`); the art is the film's toolkit (`guide/film/*`), so it
stays on-model. Portrait layouts keep text clear of the areas covered by app UI.

## Preview and rebuild

```sh
npx http-server -p 8080 .                       # from the repo root
open http://localhost:8080/marketing/trailer/   # live player with a format switcher (?fmt=16x9 etc.)

python3 marketing/trailer/music.py              # numpy + ffmpeg -> soundtrack.wav
node marketing/trailer/render.mjs               # playwright + ffmpeg -> out/*.mp4 (--fmt 9x16 --fps 30 --stills 4.2,10.5)
```

The score (FM Rhodes, formant "ah" pad, 808, trap hats, vinyl) is synthesized in `music.py`: no samples or
licensed music, so the trailer is cleared to post anywhere. `soundtrack.m4a` is the same mix for the
browser preview. The first, high-energy cut is in git history (commit "Add rendered trailer MP4s").

Suggested post copy: *He doesn't chase pumps. He reads the fine print. Wally's RWA Textbook: 49 pages, a
9-minute film and a customs-desk game. No price calls. No hopium. → rwaf.xyz/guide*
