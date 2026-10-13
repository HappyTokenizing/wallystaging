# Homepage comparison: hosting on staging (instructions for Codex)

The owner wants to compare three homepage options side by side on the **staging** site before choosing one. Everything needed is already on branch `claude/festive-johnson-htfzwi`; your job is to get it onto staging, verify it, and later promote the chosen option.

| URL | Option | Source | What it is |
|---|---|---|---|
| `/1/` | Original | `templates/home-variants/1.html` | The long-form homepage live before 13 Oct 2026 (commit `a8e8463`). Only change: the stats heading is an `h2`, which the current stylesheet targets. |
| `/2/` | Simplified | `templates/home-variants/2.html` | The current `/` (commit `aec8050`): marquee, hero, stats and an 8-card link grid. |
| `/3/` | Combined | `templates/home-variants/3.html` | New: the original's voice and conversion moments with the simplified page's direct routes. Styles are in `templates/site.html` under `HOMEPAGE OPTION 3`, scoped to `.home-plus`. |

`/` itself is unchanged until the owner decides.

## How it works

- `homeVariants` in `scripts/site-pages.mjs` lists the three options (path, label, title, description, `noindex`).
- `scripts/build-site.mjs` renders each option inside the normal homepage shell (same nav, footer, shared CSS/JS), adds `data-variant`/`data-title` to `<body>`, links `assets/home-compare.css` and appends the fixed **Compare homepages · 1 Original · 2 Simplified · 3 Combined** switcher. It also adds `/1` → `/1/` style redirects to `vercel.json`.
- The pages are `noindex,nofollow` and are not in `sitemap.xml`. `tests/home-variants.test.mjs` covers all of this.

## Host it on staging

1. Fetch `claude/festive-johnson-htfzwi` and merge it into the branch the staging Vercel project deploys from (normally `main`). If generated files conflict (`assets/site-layout-*.css`, `assets/site-runtime-*.js`, `vercel.json`, any generated `index.html`), resolve the sources (`templates/site.html`, `templates/home-variants/*`, `scripts/*.mjs`) and regenerate with `npm run build`; never hand-edit generated output.
2. Run `npm ci`, `npm run build`, `npm test`. All tests must pass, and `git status` must be clean after the build (the generated `1/`, `2/`, `3/` pages are committed).
3. Push and wait for the staging deployment.
4. Verify on the staging domain:
   - `/1/`, `/2/` and `/3/` load; `/1`, `/2` and `/3` redirect to the slash versions.
   - Each page shows the switcher at the bottom with its own option highlighted, and its tab title reads `Homepage option N: …`.
   - Each page has `<meta name="robots" content="noindex,nofollow">`; none appears in `/sitemap.xml`.
   - `/` is unchanged and has no switcher.
   - On `/3/`: the member logo marquee scrolls; the stat cards update from `/api/stats`; **Learn RWAs in 5 minutes** scrolls to the explainer; the chapter rail switches chapters; entering an invalid email in the newsletter form shows the error shake. Do not submit a real newsletter sign-up.
5. Report the three staging URLs back to the owner.

Do not edit the option files to make them more alike; they are deliberate snapshots. Do not release `/1/`, `/2/` or `/3/` to production: staging and production share this source tree, so remove the comparison (below) before any production release.

## After the owner chooses

1. In `templates/site.html`, replace `<main id="page-home">…</main>` with the chosen file's `<main>` element (without its leading comment).
   - **Option 2:** the homepage markup is already this; nothing to paste.
   - **Option 3:** keep the `HOMEPAGE OPTION 3` CSS block. In `tests/site-pages.test.mjs`, remove `newsEmail` from the regex in `assert.doesNotMatch(read('index.html'),/id="(?:primer|wallynft|newsEmail|page-news|page-jobs)"/)`: option 3 puts the newsletter form on the homepage on purpose. Its sections use `id="start-here"` and `id="herd"`, so legacy `/#primer` and `/#news` links still redirect to `/learn/` and `/newsletter/`.
   - **Option 1:** rename its section ids `primer`, `news` and `wallynft` (for example to `start-here`, `herd` and `collection`) so they do not collide with the legacy hash redirects in `assets/legacy-routes.js`, and remove `newsEmail` from the same test regex.
   - **Option 1 or 2:** delete the `HOMEPAGE OPTION 3` CSS block from `templates/site.html`.
2. Remove the comparison: `templates/home-variants/`, `homeVariants` in `scripts/site-pages.mjs`, the homepage-options loop and `.concat(homeVariants)` in `scripts/build-site.mjs`, `assets/home-compare.css`, `tests/home-variants.test.mjs`, the generated `1/`, `2/` and `3/` directories, the **Homepage comparison (staging)** section in `README.md`, and this file. The `document.body.dataset.title ||` fallback in `showPage` is harmless; keep or remove it.
3. Run `npm run build` and `npm test`, then commit the sources together with the generated files.

## What option 3 changes, and why

Kept from the original (`/1/`):
- The mission hero, member logo marquee and live stats.
- The interactive **RWAs explained in 5 minutes** chapters, so a newcomer learns something without leaving the homepage.
- The **Heard from the Herd** newsletter card as the main sign-up moment, now placed after the explainer and given a one-line value statement.
- The Wally's RWA Textbook call to action and the founder quote.

Kept from the simplified page (`/2/`):
- Pre-rendered stat values (no `$0` before the count-up), correct heading levels, and a direct route to every main section.
- The eight-card grid becomes a compact **Follow the market** row (News, Ecosystem, Research, Jobs) with icons and a one-line hint. The other four destinations are covered by the explainer, the textbook bar and the community row.

New:
- Two hero calls to action: **Learn RWAs in 5 minutes** (jumps to the explainer) and **Explore 1,000+ RWA companies** (the directory).
- The four WALLY NFT cards are condensed into one **Backed by builders. Joined by believers.** row: an **Our members** panel (with the existing **Apply for membership** form link from `/members/`) and a **WALLY NFT** panel (Meet WALLY / About the collection).
- The newsletter's WALLY illustration links to `/meet/` instead of a "coming soon" toast.
- Phones: 2×2 stat cards, 2×2 section tiles and a textbook bar that wraps cleanly. The page is about 9% shorter than the original on a phone while carrying more routes.
