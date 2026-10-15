# RWAF videos

Promo videos for X, rendered from HTML. Each video is 1920 × 1080 at 30 fps, encoded as H.264 with AAC sound effects. `.vercelignore` keeps `video/` out of site deployments.

| Folder | Video | Length |
| --- | --- | --- |
| `ecosystem-submissions/` | How to submit a project to the ecosystem directory | 31.5 s |
| `ecosystem-categories/` | The directory's sectors and their categories | 53.5 s |

Each folder holds a `stage.html` composition and its rendered MP4. Shared parts live alongside them:

- `kit.css` and `kit.js` hold the brand styles, title card, orange wipe, browser walkthrough, step pills, cursor and end card.
- `render.mjs` renders the frames and encodes the MP4.
- `sfx.py` synthesizes the sound effects, so the videos use no third-party audio.

## Rendering

Rendering requires Playwright with Chromium, `ffmpeg`, and `python3` with `numpy`:

```sh
node video/render.mjs ecosystem-categories                         # full MP4
node video/render.mjs ecosystem-categories --stills 5,14.7,25.8    # review stills
node video/render.mjs ecosystem-submissions --from 7.7 --to 22.6   # one section
```

`render.mjs` serves the repository locally. It answers `/api/ecosystem` with no pending updates, so the directory renders its committed snapshot. Every frame is a pure function of time, so a re-render after a data change picks up the new counts and logos. Scene timing lives in the `T` object at the top of each `stage.html`.

## Ecosystem Submissions

| Time | Scene |
| --- | --- |
| 0–3.6 s | Title: "Get your project on the RWA map." |
| 3.6–8.2 s | Logo wall with the live directory count, then "Is yours missing?" |
| 7.7–22.6 s | Walkthrough of the real `/ecosystem/` page: **Submit your project**, the form, **Submit**, then the confirmation the site shows |
| 22.6–27.4 s | Profiles recently added from submissions |
| 27.4–31.5 s | End card: `rwaf.xyz/ecosystem` |

- The walkthrough uses the actual **Submit your project** modal. The confirmation text matches `submitEco()` in `templates/site.html`. Nothing is sent to `/api/ecosystem`.
- The form entries ("Your Project", `yourproject.xyz`) are placeholders.
- The "Recently added from submissions" grid lists current profiles that were added from the submission imports (`data/research/submission-import-*.json`).

## Ecosystem Categories

| Time | Scene |
| --- | --- |
| 0–3.6 s | Title: "Inside the RWA ecosystem", with the active-company and sector counts |
| 3.6–10.5 s | Ranked bars for the six biggest sectors |
| 10–31.6 s | One spotlight per big sector: active companies, category bars and logos |
| 31.6–37.8 s | Cards for the 11 smaller sectors |
| 37.8–48.2 s | Walkthrough: open `/ecosystem/`, switch to **Ecosystem map**, scroll through the sectors |
| 48.2–53.5 s | End card: "Explore the RWA map", `rwaf.xyz/ecosystem` |

The counts are unique current profiles, which the site labels "Active Companies". They match the counts on the site's Ecosystem map. A company can sit in more than one sector or category, so the counts overlap and don't sum to the total. Category bars show each category's share of its sector's companies. Two buckets are left out because they are not sectors: the original import bucket (shown on the site as "Additional ecosystem", 14 profiles) and "Historical".

Counts as of the October 15, 2026 render:

| Sector | Active companies | Categories |
| --- | ---: | --- |
| Tokenization | 416 | Tokenization Platforms 213; Tokenized Asset Issuers 206 |
| Stablecoins | 156 | Stablecoin Issuers 81; Payments Infrastructure 52; Stablecoin Builders 24 |
| Blockchains | 79 | One category |
| Institutions | 76 | Banks and financial institutions 50; Public institutions 14; Asset managers and issuers 12 |
| Services and infrastructure | 73 | Compliance and identity 26; Legal, audit and assurance 18; Tokenization infrastructure 12; Data and research 7; Custody and asset servicing 7; Interoperability 2; DePIN infrastructure 1; Events & education 1 |
| Lending | 70 | Lending 66; Private credit 3; Asset financing 1 |
| Fintech | 24 | Fintech 22; Payments 2 |
| Wallets | 15 | One category |
| Trading and liquidity | 15 | Decentralized exchanges 11; Token launchpads 2; Market making 2 |
| Wallet Infrastructure | 13 | One category |
| RWA Perps | 13 | One category |
| Oracles | 12 | One category |
| Insurance | 11 | One category |
| Neobanks | 8 | One category |
| Data & analytics | 8 | One category |
| Collectibles | 6 | Trading cards and collectibles 4; Wine and alternative collectibles 1; Physical asset tokenization 1 |
| Brokerage & exchanges | 5 | Digital asset exchanges 4; Brokerage 1 |

Spotlights show at most four category bars and note how many more there are. Logos come from each sector's directory listing, in the directory's own order.
