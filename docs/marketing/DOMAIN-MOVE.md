# Domain move: website status and go-live (website chat's side)

The source of truth is **`docs/DOMAIN-MOVE.md` on `main`** (written by the app chat). This file only tracks the website's part.

Situation: the app is live at `https://app.choochootraining.com` (Netlify project 1, repo root, `main`, DNS at Porkbun). The old address
`choochootraining.com` still serves the app until the owner moves it to the website.

## Website checklist (part D) and where it is

| Requirement | Status | Where / how it is checked |
|---|---|---|
| Own `/sw.js`: delete every cache, unregister, reload open windows | Built, tested | `site/sw.js`; `tools/check-redirect.mjs` installs a stand-in old worker with a cache, serves the real file, and checks caches are gone, it is unregistered and the window reloaded |
| Inline `<head>` redirect before first paint (cookie `cct_member`, `reading.v1`, `#/`, `access_token`; skip on `?site`) | Built, tested | `site/index.html`; 33 checks in `tools/check-redirect.mjs` |
| Handoff in the fragment only (`#handoff=<base64url>&route=<encoded>`), validation (JSON, schema 1, `lessons` object, at most 200 KB), reset/error hashes unchanged, never `reading.auth` | Built, tested | same; the test decodes the fragment the way the app's `js/handoff.js` does, including UTF-8 |
| "Log in" header button and "Start reading" main button to `https://app.choochootraining.com/` | Built | `site/index.html`, `APP_URL` in `site/main.js` |
| Absolute `og:image` and `og:url` | Built | `site/index.html` (also canonical and `twitter:image`) |
| Hosting: second Netlify project, Base directory `site` | Config ready, owner creates the project | `site/netlify.toml` |

## Owner: go live (after the app chat's part B has been live for a few weeks)

1. Netlify > Add new site > Import from GitHub > `Choo-Choo-Training`. **Base directory `site`.** Production branch **`claude/choochoo-marketing-chat-mjzg8m`**
   (see `WEBSITE-PLAN.md` for why). The build command and publish directory come from `site/netlify.toml`.
2. Open the project's `*.netlify.app` address and try it before touching the domain:
   - the page loads as a new visitor in a private window;
   - `/?site` stays on the website even if you already use the app;
   - in a normal window where you use the app, the plain address sends you to the app.
3. Follow part C of `docs/DOMAIN-MOVE.md` on `main`: in the **app** project remove `choochootraining.com` and `www`, make `app.choochootraining.com`
   primary; in the **website** project add both. Keep the Porkbun `app` CNAME.
4. After the switch, open `https://choochootraining.com/sw.js` and check it shows the cleanup code (cache headers `no-cache`).

## Open items

- Golden-ticket links in `TECH.md` use `choochootraining.com/t/CODE`. That path would now reach the website. Decide before any ticket is sent whether tickets live on `app.`.
- Supabase URL settings are the app chat's part E.
