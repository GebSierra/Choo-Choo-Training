# Handoff: where Choo Choo Training stands (version 1.9.3.1)

Last pushed commit: 1c09ae0 on main. Working tree clean.

## Pick up here, in this order
1. **Verify before building more.** The full `npm test` was NOT run after 1.9.3.1.
   `test/smoke.mjs` was edited (finish screen Yes now goes to #/home) but not run.
   Run the full suite in the background with a log ending in an EXIT line, and fix any failures.
2. **Review screenshots** in `docs/screenshots/v19/`: the three games (Green Light, Wagon Parade,
   Station Board) must look like our wooden-toy train world, and `hair-bob-redrawn.png` must no
   longer look like sideburns. Nobody has reviewed these yet.
2a. **Wagon Parade bug (owner report, fix before Phase B).** Sometimes a correct tap (for example
   on an "s" wagon) makes the wagon run off the top track, but the train on the bottom does not move
   forward and no star or point is counted. Every correct tap must count, every time. Likely cause:
   a race between taps or rounds (a tap during an animation, a wagon reused or removed before its
   handler finishes, or a count keyed to the wrong wagon). Write a test that taps correct wagons
   quickly and mid-animation and asserts the count and bottom-train position, prove it fails, then fix.
   **Owner's wanted behaviour:** the correct top wagon rolls off its track and couples onto the back of
   the bottom train, so the train visibly grows by one wagon per correct tap.
2b. **Auto-advance between activities (owner request).** When the child finishes an activity, move
   straight on to the next activity in the lesson without a tap (after the short success moment).
   The last activity goes to the lesson finish screen as now. Keep a way back (the back button).
   Update tests that expect to land on the lesson overview between activities.
3. **Phase B of docs/PLAN-v1.9.md: levels and celebrations** (not started). Owner decisions:
   Level 1 after 6 sounds (m a s i t p), Level 2 after all 13; later levels for all short vowels,
   every single letter, then digraphs. Reward at each level: tunnel celebration with Pip dancing
   and a "Level one complete!" banner, a new special car (caboose, coach, flatbed, tanker, dome),
   and a gold star.
4. **App store readiness**: docs/APP-STORE.md (native detection, storage seam test, no-remote test,
   grown-up gate before external links, Android back button).
5. **Story 2 "Pip and the Map"**: text approved in docs/PLAN-v1.7.md Phase D. Place after lesson 6.
6. **Music**: deferred until the owner supplies audio files. The spec is in the old notes below
   and the "Later" section of docs/PLAN-v1.8.md.

## Open questions for the owner
- Should Smooth Ride also lose its "Say this" bar, as the book did?
- The parent must record every letter sound in Grownups for the new games; unrecorded sounds show
  a "Say: ..." prompt instead. Consider a hired voice actor before selling.
- Before selling: trademark check on the name, IP check on Smooth Ride and the three tap games
  (similar ideas to another app), Andika font license check, privacy policy for the stores.

## Standing rules (owner)
- The phone's voice never says letter sounds. Parent voice or recordings only.
- No privacy or recording warnings in the app UI.
- Never change the YouTube links. Do not touch the jingle cut-off.
- No JS animation loops while idle (the phone overheated once). Small CSS animations are fine.
- Plans by Opus, building by Sonnet, to save credits. Commit and push to main after each phase.
- Read the execution rules at the top of docs/PLAN-v1.9.md before building.
