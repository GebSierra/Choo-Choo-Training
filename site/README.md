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
node tools/check-redirect.mjs   # the old-link forward and sw.js
node tools/og.mjs               # rebuilds assets/og.jpg from tools/og.html
```

`check.mjs` fails on console errors, failed requests, horizontal overflow, dead local links or anchors, images without
alt text, a start button below the fold on a phone, or a mobile start bar that covers another start button.

## Deploy (Netlify)

A second Netlify project from this repo: **Base directory `site`**, production branch `claude/choochoo-marketing-chat-mjzg8m`.
`netlify.toml` copies the deployable files into `dist/` (so `tools/` is not served), caches `/assets/*` for a year and never
caches `/sw.js`. `404.html` is the not-found page. Go-live steps: `docs/marketing/DOMAIN-MOVE.md`.

## Old app visitors

Until the move, `choochootraining.com` served the app, so this page also cleans up after it:
- `sw.js` removes the old app's service worker and caches from phones and browsers.
- Nobody is redirected just for visiting. Only an old app link (`#/lesson/3`) or a password-reset link opened on this
  address is forwarded, unchanged, to `https://app.choochootraining.com/`.
- `node tools/check-redirect.mjs` tests all of it.

## Media

All screens are from the current train theme with no picture cards: `first-track.jpg`, `blend.jpg` and `check.jpg` were
captured from the app; `hero.mp4`, `balloons.jpg` and `trace.jpg` come from the owner's recordings. Fonts are
self-hosted (SIL OFL, see `assets/fonts/OFL.txt`).
