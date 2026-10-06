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
