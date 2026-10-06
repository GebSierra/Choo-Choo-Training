# Handoff: where Choo Choo Training stands (version 1.9.6)

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
- No JS animation loops while idle (the phone overheated once). Small CSS animations are fine.
- Plans by Opus, building by Sonnet, to save credits. Commit and push to main after each phase.
- Run each phase's own suites; run the full `npm test` (about 40 to 60 minutes) once at the end of a session.
- Read the execution rules at the top of docs/PLAN-v1.9.md before building.

Full `npm test` on 1.9.6 (2026-10-06): all 23 suites pass, EXIT 0 (about 85 minutes).
