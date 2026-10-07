# Domain move: website status and go-live (website chat's side)

The source of truth is **`docs/DOMAIN-MOVE.md` on `main`** (written by the app chat). This file only tracks the website's part.

Situation (2026-10-07): the app is live at `https://app.choochootraining.com` (Netlify project 1, primary domain). The owner has
added `choochootraining.com` (primary) and `www` to the website's Netlify project 2. No families were using the old address.

## Website checklist (part D) and where it is

| Requirement | Status | Where / how it is checked |
|---|---|---|
| Own `/sw.js`: delete every cache, unregister, reload open windows | Built, tested | `site/sw.js`; `tools/check-redirect.mjs` installs a stand-in old worker with a cache, serves the real file, and checks caches are gone, it is unregistered and the window reloaded |
| No automatic redirect (owner decision): only old app links (`#/...`) and reset/auth-error links are forwarded to the app, unchanged; no cookie or progress check, no handoff | Built, tested | `site/index.html`; `tools/check-redirect.mjs` |
| "Log in" header button and "Start reading" main button to `https://app.choochootraining.com/` | Built | `site/index.html`, `APP_URL` in `site/main.js` |
| Absolute `og:image` and `og:url` | Built | `site/index.html` (also canonical and `twitter:image`) |
| Hosting: second Netlify project, Base directory `site` | Config ready, owner creates the project | `site/netlify.toml` |

## Owner: after the switch

1. In a private window, `choochootraining.com` shows the website and "Log in" opens the app.
2. `https://choochootraining.com/sw.js` shows the cleanup code.

## Open items

- Golden tickets: the owner has a way to track them; links like `choochootraining.com/t/CODE` would reach the website. A later task.
- Supabase URL settings are the app chat's part E.
