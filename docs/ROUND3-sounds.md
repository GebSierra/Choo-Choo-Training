# Round 3: the next ten sounds (lessons 4 to 13: t, f, d, g, i, n, p, h, b, l)

Repo /home/user/kddash, branch main. START FROM A CLEAN TREE after docs/FIXES-round2.md is fully applied (check `git log` for the round 2 group commits and the 1.3.6 bump; if they are missing, stop and report). Read PLAN.md (section 2 rules apply) and the README decisions first. Then ONLY the files you need: data/curriculum.json, js/glyphs.js, js/theme.js, js/lessons.js, js/screens/home.js, js/screens/tasks/hunt-deal.js, test/check-content.mjs (skim the others on demand). Reference data: docs/reference/mentava/alphabet_sounds_reference.md and assets/images/mentava/web/index.json (which tiles exist).

## Efficiency rules (learned the hard way; follow them to save time and tokens)
1. Everything is data-driven. Do NOT touch task screens, game logic or components unless a lesson genuinely cannot work; if it can't, fix the cause once, generically. The only code areas this round should need: glyphs.js (5 new letters per batch), theme.js (accents), home.js (the scrolling map), check-content.mjs, sw.js precache list, and a few test generalisations.
2. Write lesson data with a small script (`tools/gen-lessons.mjs`) from one compact table (sound, words, compounds, hunt distractors, quick check, ...) that emits the JSON, then run check-content. Hand-editing ten lessons of JSON is where mistakes and tokens go. Commit the script.
3. Run tests in layers: `node test/check-content.mjs` after every data change (0.2 s); the targeted suite for what you touched; the full `npm test` (fast mode) once per group; the slow full `node test/smoke.mjs` only once at the very end. Never run the same suite twice in a row without a change.
4. Test coverage by sampling, not by multiplying: data rules for ALL lessons; full play-through of all nine tasks for lessons 4, 8 and 13 (first new, a middle one, the last), plus Letter Writing (trace) and Letter Hunt for every new glyph/lesson (cheap). No per-lesson screenshots: take at most 8 screenshots in total.
5. Commit and push after EACH group (the container can restart and a spend limit can interrupt; unpushed work is lost).
6. No separate review round afterwards: the pitfalls found in two review rounds are listed below and are your checklist. Run the checklist yourself with the tests; do not spawn more agents.

## Pitfalls already found in this app (do not repeat; each is a test or a rule)
- A letter "a" or any single letter must never be a screen reader label or tts string; parent text must never write a bare letter ("Say a." makes a parent say "ay"): use "a as in apple" style and for new sounds the sayItLike phrases below.
- Clipped sounds (t, d, g, p, b, h, l, k and so on) are never stretched in scripts ("ttt", "ddd", "ggg", "ppp", "bbb", "hhh", "lll" must never appear); held sounds (f, n, m, s, i) may be stretched.
- No word where s says z (is, his, has, was, as), and never "as".
- Distractor letters must not look like the target (lists below). Hunt dealer needs at least 6 slots and 6 distractor variety even in short landscape (915x330); keep the guard against an empty distractor list.
- Tiles: some Mentava tiles mislead: "mop" looks like a broom, "red" is a paint can, "goose" looks like a duck, "jam" shows a knife: never use them. Open every new tile you use and check it matches its word and is fine for a three year old (note decisions in README).
- Tap targets at least 48 px, text at least 16 px, nothing clipped at 360x780, 412x915 and landscape 915x412; first line of each parent script (the bar "gist", at most 28 characters, sound first) must make sense alone.
- Hold gates, Next 1 s cooldown, two-step finish: unchanged; do not alter them.
- Old saved state (lessons 1 to 3 done, checkpoint c1 maybe done) must load and open lesson 4.
- Service worker: new tiles go in the precache list; derive it from curriculum.json as the smoke test already asserts; keep CACHE_VERSION equals APP_VERSION (bump to 1.4.0).
- Never include a sound or word in a Sound Sack distractor pool if it starts with any taught sound of that checkpoint (or the confusable ones: sh with s, th with t or s).

## Which sounds and why
Mentava's order: a m s t, review, f d g i n p h b l j c v w r k. We have m a s. The next ten are t, f, d, g, i, n, p, h, b, l (lessons 4 to 13). Keep lessons 1 to 3 and checkpoint c1 as they are. Every lesson has the same nine tasks as lessons 2 and 3, `review` = the previous two lessons' sounds.

## Per-sound data (from the Mentava book; clipped = short, no vowel added)
| L | sound | sayItLike | held | doNotSay | howTo (parent text; must pass letter-name rules; no "you", "eye", "see", "tee") | words (tile folder) |
| 4 | t | t- | no | tuh | Tap the tip of your tongue just behind your top teeth. Short and crisp: t-. Do not add uh. | tiger, table, tree (t); tent (e/tent) |
| 5 | f | fff | yes | fuh | Rest your top teeth on your bottom lip and blow. Hold it: fff. Do not add uh. | fan, fish, fork (f); fox (x/fox) |
| 6 | d | d- | no | duh | Tap your tongue behind your top teeth and let your voice out. Short: d-. Do not add uh. | duck, deer, dog, door, dolphin (d) |
| 7 | g | g- | no | guh | Lift the back of your tongue and let your voice out. Short: g-. Do not add uh. | goat, gate (g) (goose is dropped) |
| 8 | i | i as in igloo | yes | (none) | Say i as in igloo. Keep your mouth small and relaxed. asIn "igloo" | igloo, sit, stick (i) |
| 9 | n | nnn | yes | nuh | Put your tongue behind your top teeth and hum through your nose. Hold it: nnn. | nut, nose, necklace (n); nest (e/nest) |
| 10 | p | p- | no | puh | Close your lips, then let out a tiny puff of air. Short: p-. Do not add uh. | pig, panda, pumpkin (p); pot (o/pot) |
| 11 | h | h- | no | huh | Breathe out like you are fogging a mirror. Short: h-. Do not add uh. | hat, hand, hippo (h); hen (e/hen), horse (or/horse) |
| 12 | b | b- | no | buh | Close your lips, then let your voice pop out. Short: b-. Do not add uh. | baby, banana, ball, bear, bus (b) |
| 13 | l | l- | no | ull or luh | Put the tip of your tongue behind your top teeth. Say lion but stop before ion: l-. Do not add uh. | leaf, leg, ladder (l); light (ie/light) |
Tiles are assets/images/mentava/web/<folder>/<word>.webp (see index.json). startWords (Sound Sack) = words that BEGIN with the sound; i has only igloo (generalise the round builder so a sound contributes at most as many rounds as it has start words). Never use sit or stick as start words for i. Clip is null for all new sounds; Grownups clip status lists only sounds with a clip. playSounds stays off.

## Accent colours (theme.js and CSS tokens): use exactly this list; the glyph on white must have at least 3:1 contrast (check-content computes it; if one fails, darken that one only). Similar hues are fine for non-adjacent lessons; adjacent lessons must look clearly different.
m #3B7DD8, a #E5484D, s #2FB37A (existing), t #E8871E, f #14A3A8, d #8A5CF0, g #E0559C, i #B9770E, n #2B6CB0, p #C2417A, h #7A5C3E, b #5B6CFF, l #6B8E23.

## Glyphs (js/glyphs.js): own SVG glyphs with correct handwriting stroke order, same box, baseline and x-height as m a s, for lowercase t f d g i n p h b l
- t: down stroke, then crossbar left to right. f: curve over the top and down, then crossbar. d: bowl counter-clockwise from about 2 o'clock, then a tall stem (clearly above x-height so d never looks like our a). g: bowl then stem down the right side with a hook left below the baseline (single-story). i: short stem down, then the dot as a tiny second stroke. n: down stroke, then back up and over the arch. p: down stroke below the baseline, then up and the bowl clockwise from the top of the stem. h: tall stem down, then up and over the arch. b: tall stem down, then the bowl from the stem clockwise. l: one tall stem, one stroke (slight curve at the foot is fine, no serif or cross).
- Every place that draws letters uses glyphs for all 13 taught letters and the font for the rest; trace pad start dots/arrows work for every stroke including the i dot.

## Words (showLetters words use only letters taught up to and including that lesson; update check-content from "lesson sound plus review" to "all letters taught so far"; 3 per lesson, at least one containing the new letter)
4: at, mat, sat | 5: fat, fast, sat | 6: dad, sad, mad | 7: tag, sag, gas | 8: it, sit, dig | 9: man, tan, tin | 10: pat, tap, pig | 11: hat, him, hip | 12: bat, bad, big | 13: lap, lip, lid.
Picture words (showLetters false): from each sound's tiles. Quick Check alternates: even lessons letter kind, odd lessons picture kind; picture distractors are tiles whose word begins with none of the letters taught so far; letter options use glyphs with distractors from earlier letters, never confusable ones.
Saying Words compounds: four per lesson, two picturable concrete nouns each (emoji per part, the part emoji must not be the whole word, no duplicates of existing lessons or each other), ideally one containing the sound. Pick simple ones a three year old knows (treehouse, teapot, cowboy, football/fishbowl, doghouse, doorbell, goldfish, sandbox, nutshell? (skip if unclear), pigpen? (skip), hotdog is used, bathtub, bedroom? etc.); check each part really is a picturable noun.

## Games data (hunt and barn distractors per sound; letters visually unlike the target; none equal to the target):
t: m a s o n e | f: m a s o n e | d: m s t o n e i f | g: m s t o n e i f | i: m a s o n e f d | n: a s t o e i f d | p: m s t o e i f n | h: a s t o e i f d | b: m s t o e i f n | l: m a s o e n d p.
(Reason: avoid mirror and look-alike pairs: d with a b p q g; b with d p q h; p with b d q g; n with m h r u; h with n b k l; l with i t j f; t with f l; f with t l i.) Re-check the Hunt re-deal rules stay satisfiable at 6 distractor letters.

## Checkpoints (Sound Sack): keep c1 (after 3: m a s). Add c2 after 6 (m a s t f d; 6 rounds; favour t, f, d), c3 after 9 (adds g i n; 8 rounds; favour g, i, n), c4 after 13 (all 13; 10 rounds; favour p h b l). Distractor pool per checkpoint = gameDistractors filtered to words that begin with none of the checkpoint's taught sounds (plus sh excluded when s is taught, th when t or s is taught, and per-sound `avoid` rules already in the data); require at least 12 distractors per checkpoint and validate. Words that must leave the pool as sounds are taught include: tiger, table, tree, tent, fan, fish, fork, fox, duck, deer, dog, door, dolphin, goat, gate, igloo, nut, nose, necklace, nest, pig, panda, pumpkin, pot, hat, hand, hippo, hen, horse, baby, banana, ball, bear, bus, leaf, leg, ladder, light; plenty remain (camel, candy, king, koala, cat, egg, jet, jump, queen, quack, quilt, rabbit, rocket, robot, van, vest, volcano, wagon, window, worm, yarn, yellow, yoyo, zebra, zoo, zipper, octopus, umbrella, up, chair, cheese, chick).

## The home map (the one real code job)
13 lessons plus 4 checkpoint stones do not fit a fixed map. Rebuild it as a longer winding path that scrolls: vertical scroll in portrait (lesson 1 at the bottom, newest at the top), horizontal in landscape; stones data-driven from curriculum.json (lessons and checkpoints interleaved by `after`); scene art repeated/extended (hills, fence, trees, flowers, the house at the start, at most the two existing butterflies); opens scrolled so the current stone is in view (smooth scroll on load; new child starts at the start); locked stones muted; tapping a stone works while scrollable and a scroll gesture never counts as a tap; first-run card, Grownups pill and fullscreen button stay fixed on top; bubbles never collide with the pill (flip a bubble below its stone when the stone is near the top; shift stones if needed); render only transform/opacity animations, stagger only the visible stones; smooth at 17 stones. Map tests: states, tap targets 48 px, no overlap, every stone reachable by scrolling, current stone visible on load, landscape, pull-to-refresh disabled still true.

## Grownups and progress
Grownups lists all lessons and checkpoints compactly (the lessons list must not bury Reset; the sounds reference card list collapsed by default as in round 2). Unlock: lesson N needs N-1 got-it; checkpoints unlock when their `after` lesson is got-it and never block the next lesson.

## Tests and validation (generalised, derived from the data)
check-content for ALL lessons: letters taught so far; no banned s-says-z words; no letter names; glyph exists for every taught letter; stretch rules for clipped sounds (no "ttt" etc. anywhere in scripts); distractor rules; confusable lists; tile existence, size under 70 KB, .webp; startWords begin with the sound; checkpoint config and pool size; every field present. Play-through tests for lessons 4, 8 and 13 (all tasks) and the hunt, trace and quick check of every lesson; checkpoints c2 to c4 played; map tests; old-state upgrade; accent contrast check by computation in check-content (glyph colour on white at least 3:1). Keep all existing suites green.

## Docs, version, screenshots
Update PLAN.md (5.1 data, 6.1 map, section 15: "lessons 4 to 13 are t f d g i n p h b l in Mentava order") and README decisions in a few lines each. Bump CACHE_VERSION and APP_VERSION to 1.4.0. At most 8 screenshots in docs/screenshots/: the map (portrait top/bottom, landscape), New Letter for d and n, Letter Writing for g and p, the lesson 13 overview.

## Order and commits (push after each)
1. gen-lessons script + data for lessons 4 to 8 + glyphs/accents for t f d g i + check-content; play-through lessons 4 and 8. 2. Data for lessons 9 to 13 + glyphs/accents for n p h b l; play-through lesson 13. 3. Checkpoints c2 to c4. 4. The scrolling map and map tests. 5. Docs, version bump, final full run (`npm test` and one complete `node test/smoke.mjs`), commit and push.
Commit trailer lines on every commit:
Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Snz7WaaKpAYXCzF6JbUKmc
Report: commit hash; per step done/skipped; final test lines; decisions where the spec left choices (list them, e.g. compounds chosen, tile decisions, accents); anything unverified.
