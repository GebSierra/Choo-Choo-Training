# Marketing website: build plan

Written for the session that will build the site. Read this whole file before starting.

## Owner decisions (2026-10-07)

- **Direction: `previews/chosen-night-train.html`.** Theme and golden ticket from Night Train (B), wording from Sunny Line (A), the Founding Families progress bar from Timetable (C) inside the golden ticket only. No seat bar at the top of the page. Build from that file; the other previews are reference only. Where this plan says **[DIRECTION]**, follow the chosen file.
- Use the line **"Tonight, your child reads you their bedtime story."** (closing section in the chosen file).
- **Only new train-theme visuals.** No screenshots from `docs/screenshots/` (old stone path / barn theme). Use `previews/media/` (cut from the owner's screen recordings) or new captures of the current app.
- **No Mentava picture cards** anywhere (map, milk, moon and the like). Check every frame and screenshot.
- **Domain stays as is.** The app keeps `choochootraining.com` for now; it moves to `app.choochootraining.com` later, done by the app session, not us.
- **Contact email: `hellopip@choochootraining.com`.** Used in the site footer and `site/privacy.html`.
- **No Vercel yet.** Build so it can drop onto Vercel later (Root Directory = `site`), but don't depend on it now.

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

- Code: `site/` at the repo root. Fully self-contained: its own `index.html`, `styles.css`, `main.js`, `assets/`, and a `vercel.json`.
- Plain static HTML/CSS/JS, no build step, no framework. Matches the app and deploys to Vercel as-is.
- Vercel: import the GitHub repo, set **Root Directory = `site`**, Framework = Other, no build command. Every push to the branch gets a preview URL.
- Domain: today `choochootraining.com` serves the app from GitHub Pages and stays that way. Later the website takes `choochootraining.com` (Vercel) and the app moves to `app.choochootraining.com`. Every "Start free" button points to the app through one constant in `main.js` (`APP_URL`, now `https://choochootraining.com/`), so that move is a one-line change.
- Until Vercel exists, preview the site locally (`python3 -m http.server` in `site/`) and send the owner screenshots. Nothing on this branch is served publicly.

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
- Pip the Conductor: `previews/media/pip.png` is a small crop from an owner screenshot (on white, so it sits in a white circle). Ask the owner for the original Pip artwork with a transparent background before launch.

## Conversion details

- One primary action everywhere: "Start the first 5 lessons free" → `APP_URL`.
- Seat counter: `SEATS_TOTAL = 100`, `SEATS_TAKEN = <owner sets>` in `main.js`; text and progress bar read from those.
- Above the fold on a 390 px phone: headline, one line of support, the button. Test it.
- Meta: `<title>`, description, Open Graph and Twitter image (1200×630, made from the hero), favicon from `icons/icon.svg` copied into `site/`.
- Analytics: Vercel Web Analytics (free tier, no cookie banner needed). Track clicks on the start button and the Founding seat button.
- Privacy page: one short page, `site/privacy.html`, stating parent email only, nothing about the child, no microphone.
- Performance target: Lighthouse mobile 90+ for Performance and Accessibility; total page under 1.5 MB before the video.

## Build steps

1. Create `site/` with `index.html`, `styles.css`, `main.js`, `vercel.json` (clean URLs, long cache for `/assets/*`).
2. Port the chosen preview from `docs/marketing/previews/` into `site/` (split CSS and JS out, keep the tokens).
3. Fill all sections with copy from `COPY.md`; owner-only placeholders marked `TODO(owner)`.
4. Add the phone video (option 1, 2 or 3 above).
5. Add meta tags, OG image, favicon, privacy page, analytics.
6. Test: run `python3 -m http.server` in `site/`, then a Playwright script in `site/tools/check.mjs` that loads the page at 390×844 and 1280×800, fails on console errors or horizontal overflow, checks every link and button target, and saves screenshots to `site/_shots/` (git-ignored inside `site/`).
7. Commit in small steps, push to the branch, report the preview URL and screenshots to the owner.

## Phase 2 (not now)

- German version (the owner's mockup shows English | Deutsch).
- Waitlist email capture (needs a form service or backend; ask the owner).
- Live seat counter from the Founding Families backend (`TECH.md`).
- Real reviews section once posts come in.
