# Handoff: where Choo Choo Training stands (version 1.9.25)

Repo: GebSierra/Choo-Choo-Training (the old name KDDash is retired everywhere). Work on `main`.
Last session finished every item of the previous handoff. Full `npm test` result: see the last line of this file.

## Done last session
- 1.9.3.2 Wagon Parade: every right tap counts at once; the wagon rolls down and couples onto the bottom train
  (up to three per parade, then the star). No real tap-losing race was found; the problem was missing feedback.
  The "hear again" button moved under the find card.
- 1.9.3.3 Auto-advance: a finished game (Letter Hunt, Green Light, Wagon Parade, Station Board) opens the next
  activity 1.2 s after its success moment. Grown-up-led tasks keep Next. Again or Back cancels it. Back goes to the
  lesson overview (as it always did). Tests set `window.__noAutoAdvance` by default (test/lib.mjs).
- 1.9.4 Levels: level one after lesson 6 (m a s i t p), level two after lesson 13; tunnel ride, Pip dances,
  "Level one complete!" banner, a special car (caboose, coach), a gold star on the Home star board, and
  "Play again" in Grownups > Levels. Levels 3 to 5 are listed as "Coming later".
- 1.9.5 App store readiness (docs/APP-STORE.md items 1 to 6): js/platform.js `isNative`, no SW when native,
  storage seam test, no-remote test, a grown-up number gate before YouTube and Grownups links (the Grownups page
  keeps its hold gate), Android back button, mic only in Smooth Ride. New suite test/platform.mjs.
- 1.9.6 Story 2 "Pip and the Map" after lesson 6. Page 10 says "Sam runs to {name}" (check-content forbids
  he/she in a line with the child's name). Review tiles shrink when a review has more than six words.
- Test fix: smoke's precache size check counts an unrecorded optional letter sound as 0 bytes.

## ROADMAP (owner-approved 2026-10-07) — read this first if the session was cut off
Owner: implement all of these without asking, then report the decisions made. Commit + push to main after each phase.
- [x] 1.9.20 pace limit default 4 a day (Grownups 1, 2, 3, 4, No limit).
- [ ] **Owner fixes batch** (builder running on a worktree branch; merge, bump, test, push):
  tip cards close only manually ("Got it"; the crossing card waits for "Let's go!" while a tip shows); heart hint 'Try the
  other sound for the letter e. The real word is "the".'; more space + a tray between the built word and the letter
  jumble in Spell it; Find-it chip "Read the sentence together, then tap the heart word"; one grown-up "read it" script
  everywhere a teaching step asks the child to read ("Ask your child to read it. If they know some of the letters, sound
  it out together. Still stuck? Read it yourself, then have your child say it after you."; NOT in the placement check);
  drawing step: "Draw it first while your child watches, then let them try ... It's fine if it doesn't look right yet:
  your child can still move on." Send the owner the before/after wording list.
- [ ] **Journey board everywhere (owner picked A + B + C):** A) a map button REPLACES the star board at the top left of
  the Home (3D and 2D) and opens the journey board (stars/levels shown inside it); B) the board shows on the world-crossing
  loading card; C) a progress page in Grownups (the board plus a per-world summary for the grown-up).
- [x] **Accounts (owner approved; built in 1.9.21, off until the owner fills js/config.js — steps in docs/BACKEND.md): email + password only, grown-up accounts, sign-in REQUIRED except developer mode.**
  Supabase (Auth + one `progress` table with row-level security), called with fetch (no SDK, no remote script: the
  platform no-remote test stays green). Sign-in/sign-up/forgot-password behind the grown-up hold; offline-first sync of
  the whole reading.v1 state (local stays the source while offline, push on change, pull on sign-in; newer wins, with a
  fresh device taking the cloud copy); in-app "Delete account" (Apple 5.1.1(v)) via a security-definer RPC; "Sign out".
  Developer mode bypass: 7 taps on the version line of the sign-in screen. Until the owner creates the Supabase project and
  puts its URL + anon key in js/config.js, the app runs exactly as today (no sign-in screen). Setup steps + SQL in
  docs/BACKEND.md. Later: several children per account, subscriptions.
- [x] **Polish pass "next level" (DONE in 1.9.25; plan and audit in docs/POLISH-PLAN.md) (owner, after the fixes batch is live; Opus plans from screenshots, Sonnet builds):**
  onboarding and every first impression (welcome card, character creator, first Home), the Grownups menu (organization
  and appearance), the tools' appearance, how the app looks while the child practises (lesson/task screens, games), and a
  few extra details + sharper looks on the first world (Starter Station). Owner: "take it to the next level".
- Owner's own to-do list (setup, recordings, reviews, legal): **docs/OWNER-TODO.md** — keep it current.
- [ ] **Practice screens: world-themed look (owner picked A, 2026-10-08):** the dark navy task frame becomes a soft sky +
  landscape matching the current world, progress dots become a little train on a track at the top, the "Say this" bar a
  conductor's note card. Built first as a developer-mode preview ("New practice look" switch in Developer) for the owner
  to try on the phone; becomes the default only after approval.
- [ ] **Parent instructions pass (owner, 2026-10-08; do AFTER the practice look is built):** go through every grown-up
  text on every lesson, game and prototype step ("Say this" lines, full scripts, tips, prompts, judge questions) and polish
  it: clear and simple, short sentences, one action at a time, the white paper's principles (docs/CURRICULUM.md: explicit
  teaching, letter sounds not names, clipped stop sounds, connected blending, the grown-up judges, no guessing from
  pictures, short daily practice), and the owner's rule that a grown-up may first have to demonstrate before the child can
  imitate: new sounds and skills follow "I do, we do, you do" (grown-up models, then together, then the child); practice
  and review follow "child tries first; if stuck, sound it out together; still stuck, the grown-up says it and the child
  says it after". Placement check excluded (it is an assessment). Deliver a before/after wording list for the owner.
- **Owner direction for the lessons (2026-10-08):** the f-lesson prototype (Grownups > Previews "new lesson f", the
  8-step loop) has the structure and wording the owner likes; it aligns with the research much better. Use it as the
  model for the parent instructions pass and the lesson rebuild. Lessons do NOT need the exact same games every time: mix
  activities across lessons, and keep some of the current games (the balloon game Letter Hunt and the train games Green
  Light / Wagon Parade), but bring their wording and interactions in line with the f lesson and the white paper.
- [x] **"Look at a world" shows "This preview needs 3D" on the owner's phone (fixed, see README Decisions "World preview fix and regions W5 to W7"; owner to confirm on the phone)** (works in our test browser at both quality
  levels; investigate the real flow Home > Grownups > world button: a 3D failure on a real GPU, or a leftover GL context,
  falls back to the 2D message). Fix: retry once with a fresh context, never mark 3D as broken for the whole session from
  a preview, and show the actual error in developer mode.
- [x] **Build the next 3 worlds' environments (owner, 2026-10-08), ready for lessons (DONE, no version change):** W5 Blend Bay, W6 Endings Junction,
  W7 Silent E Summit (themes + landmarks + placeholder stations, same quality bar as Sunny Hills / Digraph Docks).
- Owner (2026-10-08): launch everything after Claude's own review and tests, without asking, then report what was done.
- [ ] **Better voice:** owner to choose A (best phone voice, done in the welcome-fit release), B (pre-recorded natural AI
  voice files, recommended) or C (voice actor).
- [ ] **Golden tickets (from the website plan, docs/marketing/TECH.md on the website branch):** decided 2026-10-07: ticket
  links live on the app as `https://app.choochootraining.com/t/CODE` (a Netlify redirect rule in the app's netlify.toml
  sends `/t/:code` to `/#/ticket/:code`); the website forwards its own `/t/*` to the same app address so old or mistyped
  links still work. The ticket screen itself is not built yet (needs accounts + the licence tables).
- [ ] **Placement check ending (owner, later — not now):** better wording on the result screen at the end of the check, and
  "Start here" must actually open the recommended lesson (today it is a disabled preview button), skipping the mastered
  lessons but keeping their review.
- Then the older list below (7 Mentava images, 7b idle life, 8 fishing egg), and the lesson rebuild after the owner
  approves the f lesson.

## Since 1.9.6 (2026-10-06/07)
- Live at https://app.choochootraining.com (moving from choochootraining.com; see docs/DOMAIN-MOVE.md; set HANDOFF_LIVE = true in js/config.js once the app address works; the CNAME file is unused on Netlify, kept). Plan approved: docs/CURRICULUM.md (v0.9,
  research fact-checked) is the authority; docs/CURRICULUM-REVIEW.md holds every owner decision.
- Built and live: recording studio (tools/studio.html, 47 items, files named sound-<key> / blend-<word>); Wagon Parade
  star flight; Pip and child redrawn with bigger eyes (2D + 3D); 3 hats (Baseball cap, Pink cap, Cowboy hat); theme
  song + real whistle on the railway only (coded toot stays in games), trying to autostart, else first tap; Music switch;
  Train world and Play recorded sounds switches REMOVED (always on, old settings migrated once, flag migrated1912);
  Grownups lesson list grouped World > Unit; worlds LIVE on the Home (only the current world, end portal + signpost to the
  next world, one-time crossing with the loading card); owner decision on wagons = option A (letter wagons delivered on
  a siding at the world tunnel, engine upgrades per world, only the newest level car stays); new 4-page welcome text
  (owner's words; "Harvard, Stanford, the CDC" replaced by the sources actually cited, owner informed).
- Prototypes under Grownups > Previews: tip card, journey board, world gateway, the f lesson in the 8-step loop
  (waiting for owner review = the template for every lesson); prototypes 5 (heart word "the") and 6 (Stage 1 sound play
  + placement check) in progress.
- 11 worlds: Starter Station (Stage 1 + m a s i t p), Green Valley (f o n d c/k h u g l r b), Sunny Hills (e j w v y z x
  qu), then one world per stage 3–10 (names are placeholders). Today's 13 lessons are still in the OLD order; regenerating
  them in the new order waits for the owner's approval of the f lesson.
- Owner's 3D models are stored in assets/models/ (not loaded; licences in its README).

## Master plan status (2026-10-06) — read this first
- The owner's master plan is docs/CURRICULUM-DRAFT.md; the review, the owner's decisions and the prototype order are in
  docs/CURRICULUM-REVIEW.md. Owner picked 1A 2A 3C 4A 5A 6A 7B 8A 9A 10A.
- Prototypes first: each new kind of screen is built once and approved by the owner before it is copied to every lesson.
- Decision 10A (worlds + journey board). Prototype order: plan, world gateway, recording studio, f lesson, heart word,
  Stage 1 + placement. Prototype 1 is docs/CURRICULUM.md v0.9, waiting for the owner's approval.
- Art: Pip and the child were redrawn (1.9.7, 1.9.7.1); the 3D Pip's temple tufts were removed (1.9.7.2).

## Pick up here, in this order (owner direction, 2026-10-06)
Nothing in this list gets built until the owner has picked an option and approved the written plan (rule below).
1. **Wording first.** Many grown-up explanations and scripts are off. Get every line perfect on the existing
   13 lessons and 4 games before anything is replicated. Offered: a wording-review page per lesson and per game
   listing every line the grown-up reads (Say this scripts, tips, prompts, grown-up cards) and the child sees, for
   the owner to mark up; the edits are then applied to the code and tools/gen-lessons.mjs in one pass.
2. **Each game and lesson must be great** before the master plan is implemented. Polish pass after the wording.
3. **Grownups lesson list will be too long** with many lessons. The owner will send an example of how to structure
   it. Idea to compare with it: group by level (folds), only the current level open.
4. **The track runs on too long.** At certain checkpoints the train should go through a tunnel into a new section
   of track (the level tunnel already exists: js/train/tunnel.js). Idea: each level is a "line"; Home shows only the
   current line, with a way back to earlier lines. This also keeps the 3D scene small (heat).
5. **New sounds master plan** (the owner will supply it): only after 1 and 2 are approved.
6. Music: deferred until the owner supplies audio files (see "Later" in docs/PLAN-v1.8.md).
7. **Replace the Mentava pictures (owner request, not urgent).** The app uses about 77 Mentava picture tiles
   (assets/images/mentava/web/, listed in APP_FILES in sw.js: apple, fish, milk, camel and so on), which cannot ship in a
   sold app. Make docs/IMAGES-TO-REPLACE.md: every non-emoji picture the app uses, where it appears (lesson, task,
   word), and for each one an image-generation prompt in one shared house style (soft flat illustration, warm palette,
   single object centred on a plain light background, no text, square), so the set can be recreated and swapped in at
   the same file paths.
7b. **Idle life on the railway (new heat rule).** Build the one shared low-rate ticker (≤ 10 fps, stops when hidden, after
   2 minutes without a touch, under reduced motion), change test/train.mjs heatChecks to the new budget, then add small
   idle life: chimney smoke puffs, Pip blinking and glancing, flowers/trees swaying gently, the portal glow shimmering.
8. **Easter egg: Fishing with Pip (owner request, not urgent; owner left the design to the planner).** Three quick
   taps on a river on the 3D Home (within about 1.5 s) open a small fishing game. Nothing about it is preloaded: the
   game is a separate module loaded with import() on the third tap, and its files are not in the precache (they cache on
   first use), so it costs the phone nothing until found. Planner's design:
   - Pip sits on the riverbank with a little rod; letter fish (the sounds the child has learned) swim slowly across a
     simple 2D river scene (DOM/SVG with CSS transforms, finite animations, no rAF loop while idle).
   - A card at the top shows one letter ("Catch the fish that says mmm": the grown-up prompt or the recorded sound,
     never the phone's voice). The child taps a matching fish: the line drops, the fish is reeled in with a splash and
     drops into Pip's bucket. A wrong fish just wiggles and swims on (no red cross, no penalty, nothing timed).
   - Five catches fill the bucket: Pip cheers, a short splash celebration, then "Fish again" or back to the railway.
   - Retrieval first: the child says the sound out loud before tapping (the card says "Say it, then catch it!").
   - Not counted as a lesson and never required; reduced motion: fish hold still; works in 2D Home too only if a
     river exists there (otherwise 3D only). Back button and the Android back return to the railway.

9. **Owner requests 2026-10-07 (DONE in 1.9.19, waiting for the owner's review):** (a) finishing a lesson counts every earlier lesson and checkpoint as done
   (derived in store.isDone, nothing overwritten); (b) a pace limit: 2 new lessons a day by default (Grownups: 1, 2, 3 or
   no limit), the next station "rests" with a friendly card and a grown-up hold "Open it anyway"; (c) a hidden developer
   mode (tap the version line in Grownups 7 times): open every lesson without changing progress, ignore the daily limit,
   look at any world (`#/world/<id>`); (d) the next two regions' environments, Sunny Hills (golden farmland) and Digraph
   Docks (a harbour), with placeholder stations and no lessons.

## How to plan (owner rule)
When the owner gives a plan or a problem: for each problem give **three options** with trade-offs and a
recommendation. The owner picks one per problem; write the approved choices into a plan; build only after the
owner approves that plan.

## Open questions for the owner
- Should Smooth Ride also lose its "Say this" bar, as the book did?
- Back after an auto-advance goes to the lesson overview. Should it go to the previous activity instead?
- The parent must record every letter sound in Grownups for the games; unrecorded sounds show "Say: ..." instead.
  Consider a hired voice actor before selling.
- Before selling: trademark check on the name, IP check on Smooth Ride and the three tap games, Andika font
  license check, privacy policy for the stores. App store VERIFY notes are in docs/APP-STORE.md.

## Standing rules (owner)
- The phone's voice never says letter sounds. Parent voice or recordings only.
- No privacy or recording warnings in the app UI.
- Never change the YouTube links. Do not touch the jingle cut-off.
- Heat rule (owner, 2026-10-07; replaces "no JS animation loops while idle"): small idle animation is welcome if it is
  cheap. (1) CSS/WAAPI animations of transform and opacity only may loop forever (no layout, box-shadow, filter or blur
  animation). (2) The 3D Home may animate while idle at most 10 frames per second, through ONE shared low-rate ticker
  (no second loop), for small things (smoke puffs, flowers swaying, Pip blinking, the portal glow). (3) It stops when the
  page is hidden, after 2 minutes without a touch (until the next tap), and under reduced motion. (4) Full frame rate
  only while something real happens (the train moving, a celebration, a drag). (5) Tests enforce the budget: idle at
  most ~10 fps (about 32 frames in 3 s), 0 frames while hidden, 0 after the 2-minute rest. The old one-off overheating
  came from a continuous 60 fps full-scene render.
- Plans by Opus, building by Sonnet, to save credits. Commit and push to main after each phase.
- Run each phase's own suites; run the full `npm test` (about 40 to 60 minutes) once at the end of a session.
- Read the execution rules at the top of docs/PLAN-v1.9.md before building.
- Keep the white paper current (owner): every study the app relies on (in code, design notes or parent text) goes into
  docs/CURRICULUM.md (research table and Sources), fact-checked against the paper before it is stated publicly.

Full `npm test` on 1.9.19 (2026-10-07): all 31 suites pass (train, regions and smoke re-run after two test fixes).
Since 1.9.14: 1.9.16 heart word prototype, 1.9.17 research-based placement check, 1.9.18 portal mountain redesign, 1.9.19
regions W3/W4 (`#/world/<id>`), pace limit, developer mode, finishing a lesson completes the earlier ones.
