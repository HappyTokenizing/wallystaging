# Ecosystem Submissions video

`rwaf-ecosystem-submissions.mp4` is a 31.5-second promo for submitting projects to the RWA ecosystem directory. It is 1920 × 1080, 30 fps, H.264 with AAC sound effects, and sized for posting on X.

| Time | Scene |
| --- | --- |
| 0–3.6 s | Title: "Get your project on the RWA map." |
| 3.6–8.2 s | Logo wall with the live directory count, then "Is yours missing?" |
| 7.7–22.6 s | Walkthrough of the real `/ecosystem/` page: **Submit your project**, the form, **Submit**, then the confirmation the site shows |
| 22.6–27.4 s | Profiles recently added from submissions |
| 27.4–31.5 s | End card: `rwaf.xyz/ecosystem` |

## Sources

- The walkthrough uses the actual `/ecosystem/` page and its **Submit your project** modal from this repository. Its transitions are disabled and replayed frame by frame. The confirmation text matches `submitEco()` in `templates/site.html`. Nothing is sent to `/api/ecosystem`.
- The form entries ("Your Project", `yourproject.xyz`) are placeholders.
- The directory count and logo wall come from `data/ecosystem-directory.json`.
- The "Recently added from submissions" grid lists current profiles that were added from the submission imports (`data/research/submission-import-*.json`). The grid uses their bundled directory logos.
- The brand artwork comes from `assets/brand/`. The sound effects are synthesized by `sfx.py`, so the video uses no third-party audio.

## Re-rendering

Rendering requires Playwright with Chromium, `ffmpeg`, and `python3` with `numpy`:

```sh
node video/ecosystem-submissions/render.mjs                         # full MP4
node video/ecosystem-submissions/render.mjs --stills 5,14.7,25.8    # review stills
node video/ecosystem-submissions/render.mjs --from 7.7 --to 22.6    # one section
```

`render.mjs` serves the repository locally. It answers `/api/ecosystem` with no pending updates, so the directory renders its committed snapshot. Edit the scene timing in the `T` object at the top of `stage.html`. Every frame is a pure function of time, so a re-render after a data change picks up the new count and logos.

`.vercelignore` keeps `video/` out of site deployments.
