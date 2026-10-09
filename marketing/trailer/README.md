# Wally's RWA Textbook: social trailer

A 32-second, beat-synced trailer for `/guide`, in three cuts:

| File | Use it for |
| --- | --- |
| `out/wally-rwa-textbook-trailer-9x16.mp4` | Reels, TikTok, YouTube Shorts, X vertical |
| `out/wally-rwa-textbook-trailer-16x9.mp4` | X / LinkedIn / YouTube in-feed |
| `out/wally-rwa-textbook-trailer-1x1.mp4` | Square feed posts |

All three are 60 fps H.264 + AAC with `+faststart`, loudness-normalised to -14 LUFS.

## The edit (120 BPM, every cut on a beat)

| Time | Shot |
| --- | --- |
| 0–2 s | Cold open: a neon shill ad ("100x RWA GEM", "WAGMI", "TRUST ME BRO"), killed by a record scratch |
| 2–4 s | "Most RWA content is a chart + a promise." Two red NO stamps; Wally shakes his head |
| 4–6 s | The drop: the cover slams down. "This is a *textbook*." |
| 6–8 s | NO PRICE CALLS. / NO HOPIUM. |
| 8–14 s | "Wally has notes." Six real margin notes from the book, one card per two beats |
| 14–16 s | 49 PAGES · 11 CHAPTERS · 48 LESSONS · 1 ELEPHANT |
| 16–19 s | WATCH IT: jump cuts of the actual film, rendered live by `guide/film/engine.js` |
| 19–22 s | PLAY IT: *Tokens, Please*. BARZ ("custodian: to be announced (soon™)") gets DENIED, TBILLY gets ADMITTED |
| 22–25 s | READ IT: pages riffle and land on 11.4 The Trust Chain: "onchain ≠ okay" |
| 25–28 s | Wally on his books: "Tokenized real-world assets, explained. By an elephant. (in sunglasses)" |
| 28–32 s | End card: WALLY'S RWA TEXTBOOK · Watch it. Play it. Read it. · **rwaf.xyz/guide** · Created by RWA Foundation · @wallycollection |

Every lesson title, margin note, page number and *Tokens, Please* case comes from the book's own data
(`guide/film/timeline.js`, `guide/data/cases.js`); the art is the film's toolkit (`guide/film/*`), so it
stays on-model. Portrait layouts keep text out of the top ~250 px and bottom ~300 px covered by app UI.

## Preview and rebuild

```sh
npx http-server -p 8080 .                 # from the repo root
open http://localhost:8080/marketing/trailer/   # live player with format switcher (?fmt=16x9 etc.)

python3 marketing/trailer/music.py        # numpy + ffmpeg -> soundtrack.wav
node marketing/trailer/render.mjs         # playwright + ffmpeg -> out/*.mp4 (--fmt 9x16 --fps 30 --stills 4.2,10.5)
```

The soundtrack is synthesized from scratch in `music.py` (no samples or licensed music), so the trailer is
cleared to post anywhere. `soundtrack.m4a` is the same mix for the browser preview.

Suggested post copy: *Most RWA content is a chart and a promise. This is a textbook. 49 pages, a 9-minute
film and a customs-desk game. No price calls. No hopium. → rwaf.xyz/guide*
