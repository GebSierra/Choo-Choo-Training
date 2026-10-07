# Marketing website: build plan

Written for the session that will build the site. Read this whole file before starting.

## Owner decisions (2026-10-07)

- **Direction: `previews/chosen-night-train.html`.** Theme and golden ticket from Night Train (B), wording from Sunny Line (A), the Founding Families progress bar from Timetable (C) inside the golden ticket only. No seat bar at the top of the page. Build from that file; the other previews are reference only. Where this plan says **[DIRECTION]**, follow the chosen file.
- Use the line **"Tonight, your child reads you their bedtime story."** (closing section in the chosen file).
- **Only new train-theme visuals.** No screenshots from `docs/screenshots/` (old stone path / barn theme). Use `previews/media/` (cut from the owner's screen recordings) or new captures of the current app.
- **No Mentava picture cards** anywhere (map, milk, moon and the like). Check every frame and screenshot.
- **Domains (updated 2026-10-07, after the app moved).** The app is live at `https://app.choochootraining.com` (app 1.9.24). The website takes `choochootraining.com` and `www`, **only after everything in "Before the website takes the main address" below is built and tested.** The owner moves the domains; we tell the owner when it is ready.
- **Hosting: Netlify, not Vercel** (Vercel's free plan is non-commercial). The website is a **second Netlify project** from the same repo with **Base directory `site`**; the app is the first project (repo root, `main`). DNS stays at Porkbun.
- **Which branch deploys the website: `claude/choochoo-marketing-chat-mjzg8m`** (set it as the website project's production branch). Reason: `site/` stays out of `main`, so the app project and its tests never see it, and the website does not depend on any app file. When the owner wants a tidier name, rename or merge later; nothing else changes.
- **Contact email: `hellopip@choochootraining.com`.** Used in the site footer and `site/privacy.html`.
- **Buttons (app session's request).** A small header button **"Log in"** and the main button **"Start reading"**, both to the app (`APP_URL` in `site/main.js`). The line "First 5 lessons free. No card." sits under the main button, so the offer is still said once, next to the button.
- Full app-side requirements and the order of the move: `docs/DOMAIN-MOVE.md` on `main` (part D is ours). Our status and checklist: `DOMAIN-MOVE.md` in this folder.

## Goal

A one-page marketing site for Choo Choo Training whose single job is to get a parent to **start the first 5 free lessons**. Secondary job: claim a Founding Family seat. Structure is borrowed from detach-app.de; the content, art and voice are our own.

## Hard rules

1. **Do not touch the app.** Another session is building it. Never edit, move or delete anything outside `site/` and `docs/marketing/`. That includes `index.html`, `css/`, `js/`, `data/`, `sw.js`, `manifest.webmanifest`, `CNAME`, `README.md`, `package.json`, `test/`.
2. Work only on branch `claude/choochoo-marketing-chat-mjzg8m`. Never push to `main`.
3. Copy nothing from detach-app.de: no code, text, images, raccoon, fonts or colors. Use the section order only.
4. No fake proof. No award badges ("Top EdTech Pick"), no App Store / Google Play buttons (the app is a web app, not in the stores), no invented reviews, no invented user counts. Placeholder quotes must say they are placeholders.
5. Scarcity numbers are real. Until there is a backend, the seat count is one number in one config value the owner edits by hand.
6. No paid APIs or credits. Nothing in this plan needs one.
7. Follow `docs/marketing/LAUNCH-PLAN.md` (rules and messaging) and use `docs/marketing/COPY.md` for wording.

## Where it lives and how it deploys

- Code: `site/` at the repo root. Fully self-contained: `index.html`, `privacy.html`, `404.html`, `styles.css`, `main.js`, `sw.js`, `assets/` (fonts self-hosted), `netlify.toml`, `tools/` (checks, not deployed).
- Plain static HTML/CSS/JS. The only build step is `netlify.toml` copying the deployable files into `dist/`, so `tools/` and the README are not served.
- Netlify: Add new site > Import from GitHub > this repo, **Base directory = `site`**, production branch `claude/choochoo-marketing-chat-mjzg8m`. Build command and publish directory come from `site/netlify.toml`. Every push gets a deploy; other branches and pull requests get preview URLs.
- Domain: until the owner moves `choochootraining.com` and `www` to this project, nothing here is public except the project's own `*.netlify.app` address. Every start/log-in button points at the app through one constant in `main.js` (`APP_URL = https://app.choochootraining.com/`).
- Preview locally: `python3 -m http.server` in `site/`. Note that on `localhost` a visitor with old app progress or the member cookie is sent to the app; add `?site` to the address to stay on the website.

## Before the website takes the main address

The old app is installed on families' phones and its service worker keeps answering for `choochootraining.com`. Built, and tested by `site/tools/check-redirect.mjs` (33 checks):

1. **`/sw.js`** deletes every cache, unregisters itself and reloads open windows. Served with `Cache-Control: no-cache` (`netlify.toml`), so old installs find it at once. Tested by installing a stand-in old worker with a cache, then serving the real file.
2. **Inline `<head>` script** (before the first stylesheet, so nothing paints) sends people to the app with `location.replace` when the `cct_member` cookie is present, or `localStorage['reading.v1']` exists, or the hash starts with `#/`, or it contains `access_token`. `?site` skips it. Progress travels in the fragment only: `#handoff=<base64url UTF-8 of reading.v1>&route=<encoded old hash>`, sent only if it parses, has `schema` 1, a `lessons` object and is at most 200 KB. Reset-password and error hashes are forwarded unchanged and never become a handoff. `reading.auth` is never read. It mirrors the app's own `js/handoff.js`. `privacy.html` and `404.html` never redirect.
3. **Buttons** "Log in" (header) and "Start reading" (main), see above.
4. **Absolute `og:image`, `og:url`, canonical and `twitter:image`** on `https://choochootraining.com/`.

Open items for the owner and the app session: golden-ticket links in `TECH.md` use `choochootraining.com/t/CODE`, which will land on the website; decide whether they live on `app.` instead before any ticket is sent.

## Page sections (Detach's rhythm, our content)

| # | Detach | Ours |
|---|---|---|
| 1 | Nav: logo, links, Download | Logo, How it works, For parents, FAQ, **Start free** button |
| 2 | Hero "Goodbye Doomscrolling!" + phone playing a video | Benefit headline + phone showing the app in motion + seat counter + one CTA |
| 3 | Band "Too much screentime." | Problem band: flashy apps, no reading |
| 4 | Why detach? | Why Choo Choo: one sound at a time, how specialists teach |
| 5 | How does it work? | Three steps: learn a sound, play with it, read a word |
| 6 | Our secret | You're the teacher; the app hands you the script; never listens |
| 7 | Reviews | Parent quotes (placeholders until Founding Families post) |
| 8 | FAQ | Age, cost, microphone, download, screen time |
| 9 | Closing line "Touchscreen? Touch grass." + CTA | **[DIRECTION]** closing line + CTA |
| 10 | Newsletter + footer | Waitlist email (phase 2) + footer: Privacy, Contact |

**[DIRECTION]** C replaces 4–5 with the timetable board and adds the two-plan block; B tells 3–6 as evening scenes and puts the golden ticket before the FAQ.

## The phone "video"

In priority order:
0. **Already done:** `previews/media/hero.mp4` (360×778, ~19 s, 400 KB, no sound) is cut from the owner's recordings: Blend Bay railway, Letter Hunt balloons, Wagon Parade, Track Tracing. Use it unless the owner sends a better one.
1. **Owner's screen recording** if provided: export to MP4 (H.264) and WebM, under 2 MB each, 390×844-ish, 10–15 s loop, no sound. `<video autoplay muted loop playsinline poster="...">`.
2. **Record it ourselves**: the repo has Playwright and Chromium. Write a script under `site/tools/` that opens the app at a 390×844 viewport with `recordVideo`, taps through the home map, a lesson, tracing and a game, and saves a WebM. Convert/trim with ffmpeg if installed; otherwise ship the WebM.
3. **Fallback** (what the previews use): cross-fade 4 screenshots every ~2.6 s; respect `prefers-reduced-motion`.

## Assets and licensing

- Never use `docs/screenshots/` (old theme, some Mentava picture cards). Use `previews/media/` or fresh captures of the current train theme with no picture cards.
- Copy media into `site/assets/` as resized JPG/WebP (360–390 px wide, about 40 KB each). Never link into `docs/` or the app's folders.
- **Use the app's own research copy** on the site: "Loved by kids, built on research" (studies from Harvard, the National Institutes of Health, the U.S. Department of Education) and the "cotton candy" welcome paragraph. Owner-approved, and the owner has the studies. Add a "See the research" section built from the white paper: `docs/CURRICULUM.md` on `main`, section **"2. Research foundations"** (the research table) and **"Sources"** at the end (29 linked studies). Read it with `git show origin/main:docs/CURRICULUM.md`; it belongs to the app session, so never edit or copy the file itself, only quote from it. Use only studies listed there, with their links, and pick the 4–6 most parent-friendly for the page (Harvard's Reach Every Reader apps meta-analysis is one). If something in that section is marked internal or "coming", leave it out.
- Fonts from Google Fonts, or self-hosted in `site/assets/fonts/`. The app's Nunito is fine to reuse.
- Pip the Conductor: `previews/media/pip.png` is a small crop from an owner screenshot (on white, so it sits in a white circle).

## Conversion details

- One primary action everywhere: **"Start reading"** → `APP_URL`, with "First 5 lessons free. No card." beside it. The header carries a small "Log in" to the same address.
- Seat counter: `SEATS_TOTAL = 100`, `SEATS_TAKEN = <owner sets>` in `main.js`; text and progress bar read from those.
- Above the fold on a 390 px phone: headline, one line of support, the button. Test it.
- Meta: `<title>`, description, Open Graph and Twitter image (1200×630, made from the hero), favicon from `icons/icon.svg` copied into `site/`.
- Analytics: none in the page (no cookies, no third-party scripts, so no banner). Use Netlify Analytics (server-side, paid) if numbers are wanted; the privacy page says the site has no trackers, so update it first if that changes.
- Privacy page: one short page, `site/privacy.html`, stating parent email only, nothing about the child, no microphone.
- Performance target: Lighthouse mobile 90+ for Performance and Accessibility; total page under 1.5 MB before the video.

## Build steps

1. Create `site/` with `index.html`, `styles.css`, `main.js`, `netlify.toml` (long cache for `/assets/*`, no cache for `/sw.js`).
2. Port the chosen preview from `docs/marketing/previews/` into `site/` (split CSS and JS out, keep the tokens).
3. Fill all sections with copy from `COPY.md`; owner-only placeholders marked `TODO(owner)`.
4. Add the phone video (option 1, 2 or 3 above).
5. Add meta tags, OG image, favicon, privacy page, `sw.js`, the inline redirect.
6. Test: run `node tools/check.mjs` (loads the page at 390×844, 360×640 and 1280×800 and with reduced motion; fails on console errors, failed requests, horizontal overflow, dead links, missing alt text, a hidden start button; saves screenshots to `site/_shots/`, git-ignored) and `node tools/check-redirect.mjs` (the redirect and `sw.js`).
7. Commit in small steps, push to the branch, report the Netlify deploy URL and screenshots to the owner.

## Phase 2 (not now)

- German version (the owner's mockup shows English | Deutsch).
- Waitlist email capture (needs a form service or backend; ask the owner).
- Live seat counter from the Founding Families backend (`TECH.md`).
- Real reviews section once posts come in.
