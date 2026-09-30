# Round 3: the next five sounds (lessons 4 to 8: t, f, d, g, i)

Repo /home/user/kddash, branch main. Read PLAN.md (section 2 rules apply), the README decisions, docs/reference/mentava/alphabet_sounds_reference.md (how each sound is said), assets/images/mentava/web/index.json (which tiles exist) and skim data/curriculum.json, js/glyphs.js, js/theme.js, js/lessons.js, js/screens/home.js and test/ to match existing style.

## Which sounds and why
Mentava's scope and sequence (docs: README, PLAN 5.1) teaches a, m, s, t, then a review, then f, d, g, i, n, p ... We already have m, a, s. The next five in Mentava's order are therefore: lesson 4 = t, lesson 5 = f, lesson 6 = d, lesson 7 = g, lesson 8 = i. Keep the existing lessons 1 to 3 and the checkpoint c1 exactly as they are (progress saved on Geb's phone must keep working: old saved state without these lessons must load and upgrade cleanly).

Everything is data-driven; do NOT hardcode lesson content in code. Every task type (Letter Review, New Letter, Sound Story, Saying Words, Saying Sounds, Letter Writing, Letter Hunt, Barn Doors, Quick Check) must work for the new lessons with no special cases. Each lesson has the same 9 tasks as lessons 2 and 3 (they review earlier letters).

## Per-sound data (sayItLike, doNotSay and examples from the Mentava book; hold = held sound)
| lesson | sound | sayItLike | hold | doNotSay | howTo (parent text; must pass the letter-name rules) | words (tile) |
| 4 | t | t- | no (clipped) | tuh | "Tap the tip of your tongue just behind your top teeth. Short and crisp: t-. Do not add uh." | tiger, table, tree (t/), tent (e/tent) |
| 5 | f | fff | yes | fuh | "Rest your top teeth on your bottom lip and blow. Hold it: fff. Do not add uh." | fan, fish, fork (f/), fox (x/fox) |
| 6 | d | d- | no | duh | "Tap your tongue behind your top teeth and let your voice out. Short: d-. Do not add uh." | duck, deer, dog, door, dolphin (d/) |
| 7 | g | g- | no | guh | "Lift the back of your tongue and let your voice out. Short: g-. Do not add uh." | goat, gate, goose (g/) |
| 8 | i | i as in igloo | yes | (none) | "Say i as in igloo. Keep your mouth small and relaxed." with asIn "igloo" | igloo, sit, stick (i/) |
Tiles are in assets/images/mentava/web/<slug>/<word>.webp (paths as in index.json). startWords (used by the Sound Sack): only words that BEGIN with the sound: t: tiger, table, tree, tent; f: fan, fish, fork, fox; d: duck, deer, dog, door, dolphin; g: goat, gate, goose; i: igloo only (so the sack uses i at most once per checkpoint; generalise the round builder so a sound contributes at most as many rounds as it has start words and the rest come from the other sounds). Drop any word from `words` whose tile would mislead. Never use "sit" or "stick" as a start word for i (they start with s).
Do not play or ship clips for the new sounds: `clip` is null/absent for them; Grownups clip status must only list sounds that have a clip (m, a, s). playSounds stays off by default.

## Accent colors (js/theme.js and css tokens): choose clear, accessible colors, each distinct from the existing m blue, a red, s green and from the page background; white text/glyph contrast checks as before. Suggested: t orange #E8871E, f teal #14A3A8, d purple #8A5CF0, g pink #E0559C, i gold-brown #B9770E. Adjust if any fails contrast (glyph on white card needs 3:1 at least).

## Glyphs and handwriting (js/glyphs.js): add own single-stroke-style SVG glyphs with correct handwriting stroke order for lowercase t, f, d, g, i, same box, baseline and x-height as m, a, s.
- t: down stroke (slight curve at the foot), then a crossbar left to right.
- f: a curve over the top and down, then a crossbar left to right.
- d: the round bowl (counter-clockwise from about 2 o'clock, same as the "a" bowl), then the tall stem down on the right (taller than the "a" stem; the ascender clearly above the x-height so d never looks like our single-story a).
- g: single-story g: the bowl like the "a" bowl, then the stem down the right side with a hook to the left below the baseline.
- i: a short stem down, then the dot as a tiny second stroke (a tap point).
Trace pad start dots and arrows must work for every stroke including the dot. Also verify the word renderer (wordSvg) and all places that draw letters use the glyph set for any letter that has a glyph (m a s t f d g i), and the font for the rest.

## Words (every `showLetters: true` word must use only letters taught so far: the lesson's sound plus all earlier lessons' sounds; update check-content.mjs from "lesson sound plus review" to "all letters taught up to and including this lesson"; keep `review` (which letters the Letter Review task replays) to the previous two lessons only, to keep sessions short; lesson 4 reviews [a, s], lesson 5 [s, t], and so on)
Never use a word where an s is pronounced z (is, his, has, was, as) and never "as". Suggested (Geb will review; keep 3 per lesson, at least one containing the new letter):
- lesson 4 (t): at, mat, sat
- lesson 5 (f): fat, fast, sat
- lesson 6 (d): dad, sad, mad
- lesson 7 (g): tag, sag, gas (final s says s)
- lesson 8 (i): it, sit, dig
Picture words for Saying Sounds (showLetters false, use tiles): pick from each sound's tiles; update stretchWord expectations (only stretch the held sounds; for clipped t, d, g never stretch, say the word slowly instead: adapt the parent script text for clipped sounds, e.g. "Say the word slowly: tiger. Do not stretch the t." and check the script never writes "ttt", "ddd" or "ggg").
Saying Words compounds (two picturable nouns, emoji for each part, the part emoji must not be the whole word; one per sound should contain the sound; four per lesson; no duplicates of existing lesson compounds): e.g. lesson 4: treehouse 🌳🏠, teapot 🍵🫖, toothbrush is already used in lesson 2 so skip it, tugboat 🚤? (check it is picturable), cowboy 🐄👦; lesson 5: football (🦶⚽/🏈), fireman?, fishbowl 🐟🥣, fingerprint?; lesson 6: doghouse 🐕🏠, doorbell 🚪🔔, dragonfly 🐉🪰?; lesson 7: goldfish 🥇🐟, grapefruit 🍇🍊, gingerbread?; lesson 8: igloo? none; inchworm? pick simple: sandbox 🏖️📦, pigpen?; choose clear picturable pairs, re-check that every part is a concrete noun a three year old knows, and keep the four per lesson varied.
Quick Check per lesson: letter kind or picture kind alternating (4 letter, 5 picture, 6 letter, 7 picture, 8 letter); picture options from Mentava tiles, correct answer starts with the sound and the two distractors start with none of the letters taught so far; letter options use glyphs (t, f, d, g, i) with distractors from earlier letters, never a confusable one (see below).

## Games data (per lesson under games.hunt.distractors and games.barn.distractors): letters visually unlike the target, none equal to the target:
- t: m, a, s, o, n, e   (avoid f, l, i, j)
- f: m, a, s, o, n, e   (avoid t, l, i)
- d: m, s, t, o, n, e, i, f   (avoid a, b, p, q, g: they share the bowl and stem)
- g: m, s, t, o, n, e, i, f   (avoid a, d, q, y, p)
- i: m, a, s, o, n, e, f, d   (avoid l, j, t)
Also update the existing lessons if useful (for lesson 2 "a" add a check that d, g, q are never in its distractors). Letters without glyphs render from the font as before; those with glyphs render from glyphs.js. The re-deal rules (hunt-deal.js) must still be satisfiable with the smaller distractor variety (6 letters minimum): check and keep the constraint tests passing.

## Checkpoints (Sound Sack): keep c1 (after lesson 3: m, a, s). Add c2 after lesson 6 (sounds m, a, s, t, f, d; 6 rounds; favour the three newest: t, f, d each twice, earlier sounds fill remaining) and c3 after lesson 8 (all eight; 8 rounds; favour g and i once each). The distractor pool for a checkpoint is gameDistractors filtered to words that begin with NONE of the taught sounds of that checkpoint (remove any word that begins with t, f, d, g or i from the pool for checkpoints that include them; e.g. tent, tiger, table, tree, fan, fish, fork, fox, duck, deer, dog, door, dolphin, goat, gate, goose, igloo); require at least 12 distractors remain per checkpoint and validate that in check-content.mjs. Also keep words starting with "sh" out of any checkpoint with s, and "ch" is fine.

## The home map (important)
Eight lessons plus three checkpoint stones no longer fit the fixed three-position map. Rebuild the map as a longer winding path that scrolls: vertical scroll in portrait (lesson 1 at the bottom, the newest at the top), horizontal in landscape; the same storybook scene repeated or extended (hills, fence, trees, butterflies, the house at the start); stones data-driven from curriculum.json (lessons and checkpoints interleaved by `after`); the current stone is scrolled into view smoothly on load (and the map starts scrolled to the bottom/left for a new child); locked stones are muted as before; touch and scroll must not conflict (tapping a stone works while the map is scrollable; no accidental navigation after a scroll gesture); first-run card, the Grownups pill and the fullscreen button stay fixed on top of the map; performance stays smooth (transform/opacity only; at most the existing two drifting butterflies). Keep the hold gates, the locked-stone wobble and the entrance animation (stagger only the stones in view). Update the smoke tests' map assertions (states, tap targets at least 48 px, no overlap, all stones reachable by scrolling, current stone visible on load, landscape).

## Grownups and progress
Grownups lists all lessons and checkpoints with results; Unlock works for all; "Reset" resets all. Lessons overview "Today" lines, sound cards in Grownups (the "sounds" section) show all eight sounds (make that list compact or collapsible: a long list must not bury Reset). Unlock logic: lesson N needs lesson N-1 got-it; checkpoints unlock when their `after` lesson is got-it, and the next lesson after a checkpoint does not require the checkpoint to be done (checkpoints are optional bonuses).

## Tests and validation
- check-content.mjs: all rules updated for the above (letters taught so far, distractor rules per checkpoint, tile files exist and are under 70 KB, startWords begin with the sound letter, no banned s-says-z words, no letter names, glyph exists for every taught letter, every lesson has all required fields, checkpoint configs valid, hunt/barn distractors never include the target or a confusable letter from the lists above).
- smoke/games/sfx tests: derive lesson counts and task counts from the data; every new lesson and task visited at the three viewports with no console errors, no horizontal overflow, tap targets at least 48 px, nothing needing scroll in landscape except the map; Letter Hunt and Barn Doors play through for each new letter (the dealer constraints hold); Sound Sack c2 and c3 play through; Quick Check and Saying Sounds and Letter Writing (trace pad with all five new glyphs: drawing changes pixels; start dots visible); slide-blend works on the new showLetters words; progress and unlock flow through lessons 3 to 8; old saved state (v1.3 state with lessons 1 to 3 done) loads and opens lesson 4; the map scrolls and the current stone is in view.
- Keep all existing assertions green. Add every new precache file (tiles used by the new lessons, nothing else) to sw.js and keep the precache well under 10 MB total.
- Bump CACHE_VERSION and APP_VERSION together to 1.4.0.

## Docs and screenshots
Update PLAN.md (section 5.1 data, 6.1 home map, section 15 confirmed decisions: "lessons 4 to 8 are t, f, d, g, i in Mentava order") and README decisions. Screenshots in docs/screenshots/: the new home map (portrait and landscape, scrolled), New Letter for t, d and i (portrait), Letter Writing for g (trace pad guide), a Letter Hunt round for d showing the distractors, the lesson 8 overview, the c2 Sound Sack round.

## Order and commits
1. Data + glyphs + theme + check-content (lessons 4 to 8 playable through every task type), tests green, commit and push. 2. Games data, checkpoints c2 and c3, tests, commit and push. 3. The scrolling home map, tests, commit and push. 4. Polish pass with your own screenshots (portrait, landscape, 360 px), fix anything cramped or cheap; docs, versions, final full test run, commit and push.
Commit trailer lines on every commit:
Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Snz7WaaKpAYXCzF6JbUKmc
