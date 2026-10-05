# Round 2: no spoken letter sounds, plus two games per lesson

Repo /home/user/Choo-Choo-Training, branch main. Read PLAN.md (section 2 rules still apply) and docs/reference/game-sheep-hunt.png and docs/reference/game-barn-doors.png (Geb's examples of the two games; draw our own art, do not try to copy those images).

## A. The app no longer pronounces letter sounds (do this first, small)

Geb: "skip adding in you pronouncing any more sounds. Just have instructions for the parents to pronounce the sounds." The parent says every sound. The app still reads words and instructions aloud with text to speech.
1. New setting `playSounds` in the store, default false. Grownups gets a switch "Play recorded letter sounds" (off by default) with the note "Off: your grown up says the sounds." The clip files and Grownups clip status stay.
2. `speech.say` skips every `{clip}` part when `playSounds` is false (silent skip, never tts in its place). All places that used to play a clip (Letter Review speaker, New Letter intro, Saying Sounds, script read-aloud, sound card speaker) then speak only their text parts.
3. Spoken lines that end in a clip would dangle. Give each such line an alternative used when sounds are off (store both in curriculum.json: e.g. `intro` / `introQuiet`, `prompt` / `promptQuiet`). Use exactly:
   - intro, all lessons: "Today we learn a new letter. Your grown up will say its sound."
   - quick check, letter kind: "Listen to your grown up. Then touch the letter."
   - quick check, picture kind: "Listen to your grown up. Then touch the picture that starts the same."
   - parent script read-aloud: read the script text but where it contains the sound itself (mmm, sss, a as in apple) say nothing for that word; simplest is to read only the framing sentences ("Now you try. Slide the letter as you say it.").
4. Keep the parent scripts and sound cards exactly as they are (they tell the parent how to say it). Make the New Letter screen show the sound card text prominently as the main instruction, since the parent now carries the sound.
5. Update check-content.mjs for the new fields (quiet variants must also pass the letter-name rules), and the smoke tests: with the default settings no clip event ever occurs in any task; with playSounds on, clips play as before.

## B. Two new games per lesson

Insert two new tasks between Letter Writing and Quick Check, so Quick Check stays last: task 7 "Letter Hunt", task 8 "Barn Doors". Lesson 1 then has 8 tasks; lessons 2 and 3 have 9 (was 6, 7, 7). Overview cards: two more cards with "Today we'll practice" showing the target letter chip, same style. Progress dots, done ticks, unlock logic and the parent "Next" (with the 1 s delay) work like every other task. Games never score, never say wrong, never play sound effects, never time the child out. Everything is silent except optional text to speech of the one-line instruction (auto-speak rules as elsewhere).

Shared rules for both games:
- Letters the child must find use the glyphs from js/glyphs.js (single-story a). Distractor letters the glyph set lacks (anything except m, a, s) render from the font, lowercase, same size and weight, in a neutral ink color `#1E2140`; the target letter in the sky/doors is drawn in its accent color only after it is found (before that all letters are ink) so color is not a clue. Never use the font for an `a`.
- Show a small "Find this" card at the top left with the target glyph in its accent color (the child matches shapes; the parent says the sound). Touch targets for floating letters at least 56 px, 12 px apart.
- Distractors per lesson (visually distinct from the target, none is the target): lesson 1 (m): a, s, o, t, l, i; lesson 2 (a): m, s, t, l, i, n; lesson 3 (s): m, a, t, l, i, o. Note: a and s and m use glyphs, the rest the font. Store these in curriculum.json under `games.hunt.distractors` / `games.barn.distractors` and validate in check-content.mjs (no target in its own distractors, all single lowercase letters, no letter-name word issue since they are single glyphs not words).
- Own art only: draw the scene as inline SVG/CSS in the app's color tokens (no bitmap): a sunny farm with a blue-green sky gradient, rolling hills, a white picket fence and a red barn with white X doors. Keep it light: under 25 KB total.
- Motion: subtle, A-class, transform and opacity only, reduced motion respected (see PLAN 8.1). Nothing may move a tap target while a finger is heading for it, except the deliberate gentle drift of the sky letters (max 6 px, slow, not while a finger is down on that letter).
- Add a short parent script to each game (words to say, as in the other tasks), e.g. Hunt: "Say: 'Find the letter that says mmm. Touch it.' Then say mmm together." (the sound is shown as the lesson's sayItLike; for a: "a as in apple").

### B1. Letter Hunt (sheep)
- Scene: sky with about 14 floating lowercase letters scattered (no overlaps, inside safe margins), 4 or 5 of them the target and the rest distractors; letters bob slowly. A sheep (own SVG: fluffy white cloud body from overlapping circles, soft purple face and legs, tiny round glasses) stands at the bottom left on the grass in front of the fence. A small flag or the barn marks the goal at the bottom right.
- Correct tap: the letter pops (quick scale and fade with a small sparkle burst like the slide track's, smaller), it is replaced after 500 ms by a new random distractor or target so the sky stays full (always keep at least 3 targets visible), and the sheep trots right by one step (its legs alternate with a gentle body bob). Five correct taps take it across. Reaching the goal: a hop, a bigger sparkle and a soft "done" state (sheep waves); the screen stays on the last frame; "Again" resets (sheep returns to the left instantly, sky refreshes).
- Wrong tap: the letter gives a small shake and stays; nothing else changes; no red, no sound.
- Progress is shown only by the sheep's position plus five small dots under the scene that fill with gold stars.

### B2. Barn Doors
- Scene: a big red barn centered, white-trimmed double doors. Doors swing open (scaleX of each door leaf from its outer edge, 400 ms) to reveal a dark interior with one big letter (about 40% of the barn width). Five rounds.
- Rounds 1 and 2 always show the target. After that, about one round in three shows a distractor. A target round: the doors stay open (the letter gently breathes) until the child touches the letter. A distractor round: the letter shakes if touched, and the doors close on their own after 2.5 s and the next round opens 900 ms later.
- Correct touch: the letter turns to its accent color and pops with a sparkle burst, the barn does a small happy hop (translateY -8 px spring), a gold star fills in the row of five, doors close 600 ms later, next round opens 900 ms after that. After five stars: a bigger sparkle, the barn hops twice, doors stay open on the letter, done state; "Again" resets.
- Must still work if reduced motion is on: doors swap instantly (opacity), no hops.

## C. Tests and docs
- Extend check-content.mjs and smoke.mjs: task counts derived from the data (8, 9, 9); every new task screen visited at the three viewports with no console errors, no overflow, all tap targets at least 48 px (letters 56), no overlap between sky letters; Hunt: wrong tap does not advance the sheep, correct taps (find targets via a data attribute `data-target`) advance it five times to the done state, Again resets; Barn: rounds 1 and 2 show the target, a correct touch fills a star, five stars reach the done state, distractor tap does nothing, doors auto-advance after a distractor; with default settings no clip event fires anywhere; Grownups switch toggles playSounds; landscape fits without scrolling.
- Update PLAN.md (section 2 rule 9 wording, section 6.4 task list, new 6.4 entries for the games, section 15) and README. Bump CACHE_VERSION and APP_VERSION together to 1.3.0; add every new file to the service worker precache list (the smoke test asserts this).
- Screenshots in docs/screenshots/: both games mid-play at portrait 412x915 and one landscape, plus the lesson overview with the new cards.

## Order and commits
1. Part A, tests green, commit and push. 2. Hunt game (with data, check-content, tests), commit and push. 3. Barn game, commit and push. 4. Polish pass: look at the screenshots yourself, fix anything that looks cheap or cramped; make the sheep, barn and sparkles feel A-class; final tests, version bump, docs, commit and push.
