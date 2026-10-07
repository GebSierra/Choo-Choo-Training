# Choo Choo Training: marketing site

One static page, no build step. Plan: `docs/marketing/WEBSITE-PLAN.md`.

## Edit by hand

- **Seats:** `SEATS_TAKEN` (and `SEATS_TOTAL`) at the top of `main.js`. The ticket count and bar read from them.
- **App address:** `APP_URL` in `main.js`. Every start button points there.
- **Contact:** `hellopip@choochootraining.com`, in the footer of `index.html` and in `privacy.html`.
- `TODO(owner)` comments mark the rest (real parent quotes, an absolute `og:image` URL once the domain is final).

## Preview and check

```sh
cd site
python3 -m http.server 8000     # open http://localhost:8000
node tools/check.mjs            # phone, small phone, desktop and reduced motion; screenshots in _shots/
node tools/og.mjs               # rebuilds assets/og.jpg from tools/og.html
```

`check.mjs` fails on console errors, failed requests, horizontal overflow, dead local links or anchors, images without
alt text, a start button below the fold on a phone, or a mobile start bar that covers another start button.

## Deploy (Vercel, later)

Import the repo, Root Directory `site`, Framework Other, no build command. `vercel.json` sets clean URLs and long caching
for `/assets/*`; `404.html` is the not-found page. Turn on Web Analytics in the Vercel project to get the click events
(`start`, `start-dock`, `founding-seat`).

## Media

All screens are from the current train theme with no picture cards: `first-track.jpg`, `blend.jpg` and `check.jpg` were
captured from the app; `hero.mp4`, `balloons.jpg` and `trace.jpg` come from the owner's recordings. Fonts are
self-hosted (SIL OFL, see `assets/fonts/OFL.txt`).
