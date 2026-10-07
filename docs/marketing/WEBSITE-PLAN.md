# Marketing website: build plan

Written for the session that will build the site. Read this whole file before starting. The owner picks a direction from `previews/` first; this plan says **[DIRECTION]** wherever that choice matters.

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
- Domain (**owner decision, not for the builder**): today `choochootraining.com` serves the app from GitHub Pages. The likely end state is the website on `choochootraining.com` (Vercel) and the app on `app.choochootraining.com`. Moving the app means changing its `CNAME`, which belongs to the app session. Until the owner decides, the site runs on its Vercel preview URL and every "Start free" button points to the app's current address, kept in one constant in `main.js` (`APP_URL`).

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
1. **Owner's screen recording** if provided: export to MP4 (H.264) and WebM, under 2 MB each, 390×844-ish, 10–15 s loop, no sound. `<video autoplay muted loop playsinline poster="...">`.
2. **Record it ourselves**: the repo has Playwright and Chromium. Write a script under `site/tools/` that opens the app at a 390×844 viewport with `recordVideo`, taps through the home map, a lesson, tracing and a game, and saves a WebM. Convert/trim with ffmpeg if installed; otherwise ship the WebM.
3. **Fallback** (what the previews use): cross-fade 4 screenshots every ~2.6 s; respect `prefers-reduced-motion`.

## Assets and licensing

- Screenshots in `docs/screenshots/` show some pictures that may come from Mentava / Reading.com (for example the map, milk and moon cards). The README says that material isn't cleared for commercial use. For the public site, prefer screens without those pictures (railway map, trace pad, games), or blur them, until the owner confirms rights.
- Copy screenshots into `site/assets/` as resized JPG/WebP (390 px wide, about 40 KB each). Never link into `docs/` or the app's folders.
- Fonts from Google Fonts, or self-hosted in `site/assets/fonts/`. The app's Nunito is fine to reuse.
- Pip the Conductor: no artwork exists yet in the repo. Do not generate or invent a mascot; leave a slot the owner can fill.

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
