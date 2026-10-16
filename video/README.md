# RWAF videos

Promo videos for X, rendered from HTML at 30 fps and encoded as H.264 with AAC sound effects. `.vercelignore` keeps `video/` out of site deployments.

| Folder | Video | Size | Length |
| --- | --- | --- | --- |
| `ecosystem-submissions/` | How to submit a project to the ecosystem directory | 1920 × 1080 | 31.5 s |
| `ecosystem-categories/` | The directory's sectors and their categories | 1920 × 1080 | 53.5 s |
| `onchain-never-sleeps/` | The "Onchain finance never sleeps" lunch-break lock screen | 1080 × 1080 | 27 s |
| `research-reports/` | The Research section's report series, with the Solana Ecosystem Report teaser | 1920 × 1080 | 50.9 s |

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

`render.mjs` serves the repository locally. It answers `/api/ecosystem` with no pending updates, so the directory renders its committed snapshot. Every frame is a pure function of time, so a re-render after a data change picks up the new counts and logos. Scene timing lives in the `T` object at the top of each `stage.html`. A stage can set its own `width` and `height`; the default is 1920 × 1080.

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

## Onchain Never Sleeps

This video animates the RWA Foundation's 15 October 2026 post: "When rails run 24/7, it's hard to take a break. Onchain finance never sleeps." It is square, like the post's picture.

| Time | Scene |
| --- | --- |
| 0–3.6 s | Title: "When rails run 24/7, it's hard to take a break." |
| 3.7–17 s | The lock screen at 12:00. The Lunch focus turns on, then six notifications arrive as the clock runs to 12:30. Captions name each rail: DeFi lending, tokenized gold, stablecoin transfers, tokenized fund payouts, tokenized stocks and stablecoin payments. |
| 17–22.2 s | The camera pulls back to the full picture. "+12 more since 12:00" counts up, then "Finally, lunch break. Markets didn't take one." appears. |
| 22.2–27 s | End card: "Onchain finance never sleeps.", `rwaf.xyz`, "Follow @RWAFoundation_" |

- The lock screen is rebuilt in HTML from the post's picture: its layout, notification copy, timestamps and sampled colours. Each "Xm ago" label follows the clock, so the final frame matches the picture.
- The punchline uses Lora, the closest Google Font to the picture's serif.
- The app icons are the bundled directory logos, used unmodified on plain tiles. The Securitize and Aave marks are their dark-on-light versions, where the picture used light-on-colour app icons. Kraken has only its official 48 px favicon (`ecosystem/kraken-community-20261007.ico`), so it is slightly soft when the camera zooms in. A larger official asset could not be fetched because `kraken.com` and `x.com` are outside this environment's network policy.

## Research Reports

| Time | Scene |
| --- | --- |
| 0–3.6 s | Title: "Data the herd can trust", the Research page's own headline |
| 3.6–8.6 s | A wall of the original report charts with the archive totals: reports, series and figures |
| 8.3–26.3 s | One card per series: its kicker as numbered on the site, description, editions, data providers and three charts from recent editions |
| 26.3–39.6 s | Walkthrough: open `/research/`, scroll to RWA Blockchains, open "Who Builds on Avalanche", then scroll to its first two charts |
| 39.6–45.6 s | Teaser: "Solana Ecosystem Report", coming soon, sliding in above the Avalanche report in the RWA Blockchains series |
| 45.6–50.9 s | End card: "Read the research", `rwaf.xyz/research` |

- The counts, series, editions, data providers and charts come from `data/research-reports.json` and `data/reports/` at render time. The series kickers are read from the generated `/research/` page.
- Provider logos are labelled "Data providers", and Avalanche is shown only as the featured chain, following the README's research credit rules.
- The report opens in a second, preloaded frame, so the click switches pages without waiting on a network load.
- The Solana Ecosystem Report has no published data, so the teaser shows only its title, the featured chain and a "Coming soon" tag. It is placed in RWA Blockchains because the README assigns network ecosystem research to that series. The Solana mark is the official logomark in `assets/member-icons/solana.svg`.
