# Choo Choo Training: plan for v1.9.0 to v1.9.4

The planner (Opus) wrote this plan for the builder (Sonnet). Read the whole file once, then do one phase at a time, in order.
Each phase can ship on its own: after any phase the app works and the tests named in that phase pass. If the usage limit
is near, stop after a phase. The next session starts at the next phase.

| Phase | What | Version |
|---|---|---|
| A1 | Shared tap-game helpers (sound or grown-up prompt, round data) and game 1, **Green Light** | 1.9.0 |
| A2 | Game 2, **Wagon Parade** | 1.9.1 |
| A3 | Game 3, **Station Board**, with its words generated and proven readable | 1.9.2 |
| A4 | The rotation in `tools/gen-lessons.mjs`: the three games take Barn Doors' place in every lesson | 1.9.3 |
| B | Levels with celebrations: tunnel ride, a new special car and a gold star per level | 1.9.4 |

A1 to A3 add the games as task types, but no lesson lists them until A4. Until then the tests reach a game by giving one lesson
a `games` list through a routed copy of `data/curriculum.json` (see "Test harness" in A1). So each phase ships without
changing what the child sees until A4 switches the lessons over.

---

## 0. Execution rules for Sonnet (read first, follow in every phase)

1. **Start state.** Before Phase A1, run `git -C /home/user/Choo-Choo-Training pull -q origin main`, `git -C /home/user/Choo-Choo-Training status --short` and `git -C /home/user/Choo-Choo-Training log -1 --oneline`. The only file allowed to be uncommitted is `docs/PLAN-v1.9.md` (this plan); commit it with Phase A1. If anything else is uncommitted, stop and tell the owner. Do not commit someone else's work, and do not build on top of it.
2. **Playwright.** It is installed globally at `/opt/node22/lib/node_modules`, and Chromium is at `/opt/pw-browsers/chromium`. `test/lib.mjs` already finds both. Never run `npx playwright install` or `npm install`.
3. **Versions.** `CACHE_VERSION` in `sw.js` must equal `'reading-v' + APP_VERSION`, where `APP_VERSION` is in `js/version.js`. In each phase, bump both of these and `"version"` in `package.json` once, to the version in the table above. Keep the `reading-v` cache prefix and the localStorage key `reading.v1`. Renaming either one would orphan old caches or lose saved data.
4. **Precache.** Every new file the app loads goes into `APP_FILES` in `sw.js`. That includes fonts, JSON under `data/books/` and new JS modules. Debug-only screens are the only exception.
5. **Long suites.** Run any Playwright suite in the background, writing to a log, then wait on the log. Example: `node test/book.mjs > _test/book.log 2>&1; echo EXIT $? >> _test/book.log` with `run_in_background`, then use Monitor or poll with `tail -3 _test/book.log` until `EXIT` shows. Never run two browser suites at once. The full `npm test` takes about 40 minutes. Run it **once**, in the background, at the end of the last phase you finish in a session, before that phase's push. Otherwise run only the suites the phase names.
6. **Store in tests.** The store reads localStorage once and then keeps state in memory. A test that rewrites `localStorage` must call `page.reload()` before it checks the result. Use the existing `seedState` pattern, which seeds through `addInitScript` plus a `sessionStorage` flag.
7. **Welcome card.** On first run the welcome card covers the app. Tests skip it with `.wc-skip`, or seed `firstRunDone: true`. The character creator follows the welcome card; tests close it with `.meet-later` (or seed `meetDue: false`).
8. **Frame time.** In every requestAnimationFrame callback you add, use `dt = Math.max(0, (t - last) / 1000)`. A frame timestamp can come slightly before the previous one, which would give a negative dt.
9. **Do not change** the YouTube links in `data/curriculum.json` (`playlistUrl` and `alphabetSongUrl`), the jingle cut-off in `js/sfx.js`, or anything about Smooth Ride.
10. **Commit and push to `main` after each phase.** Use the commit message given in the phase. Every commit message ends with these two lines:
    ```
    Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
    Claude-Session: https://claude.ai/code/session_01Snz7WaaKpAYXCzF6JbUKmc
    ```
11. **Letter sounds and names.** The app never speaks letter sounds or letter names. Parent text writes sounds as `mmm` (held) or `d-` (clipped), using the helpers in `js/scripts.js` (`soundText`, `slowSounds`, `firstSoundOut`) and `soundPhrase` in `js/lessons.js`. Never write a sound out by hand in code.
12. **Heat.**
    - No JavaScript requestAnimationFrame loop, no repeating timer, and no canvas or WebGL redraw while a screen sits still. JavaScript runs only during a tap reaction, a drag, an arrival, or (new in this plan) while Wagon Parade's wagons are actually rolling.
    - Small idle animations must be CSS or WAAPI animations of `transform` or `opacity` only (never layout, `box-shadow`, `filter` or blur), finite (no `Infinity` iterations), and off under reduced motion.
    - The 3D Home keeps its rule (`heatChecks` in `test/train.mjs`: at most 2 frames in 3 s of idle, and no endless animation). It must stay green.
13. **Docs.** There is no CLAUDE.md. README.md is the project doc, and `docs/TRAIN-WORLD.md` is the train spec. In each phase, add one short "Decisions" bullet to the README (a new section "Decisions made during build: v1.9 tap games and levels", created in A1, appended to in each phase). Do not write other doc files. Older plans are a historical record: do not edit them.
14. **Pronouns.** UI text and docs say "your child" or "the child". Books use the character's name (or "Pip's friend"), never he or she, for the friend.
15. **The station-complete sequence takes a few seconds.** On the 3D Home, any test that taps a stop, reads the train's position or counts frames must first wait for `!window.__train.running` (use the `until` helper in `test/train.mjs`; allow up to 20 s when a sequence or, from Phase B, a level celebration is due).
16. **Sound only plays after a tap.** `sfx` and `speech` unlock on the first `pointerup` or `click`. A test that counts sounds (synth notes in `window.__audioNotes()`, or `clip` and `tts` entries in `window.__events`) must unlock first: `await page.mouse.click(3, 300)` on Home, or a first tap on the game, or `page.evaluate(async () => (await import('/js/sfx.js')).sfx.unlock())` for sfx only.
17. **Commit and push as separate, simple commands.** Write the message to `_test/msg.txt` with the Write tool, then run, one per Bash call: `git -C /home/user/Choo-Choo-Training add -A`, `git -C /home/user/Choo-Choo-Training commit -q -F _test/msg.txt`, `git -C /home/user/Choo-Choo-Training push -q origin main`. No `&&` chains, no heredocs inside git commands.
18. **One final report.** Send exactly one report at the end of the session, after the last push. No interim or progress reports, and never repeat a report.

---

## 1. Decisions (made by the planner; not open questions)

### Names (the owner confirms; the builder uses the recommendation)
| Game | Task type key | Recommended name | Alternative | What the child sees |
|---|---|---|---|---|
| 1. Tap the right sound | `signals` | **Green Light** | Signal Lamps | Four signal posts by the track, each lamp with a letter. The right one turns green and the engine rolls one step. |
| 2. Tap every one | `wagons` | **Wagon Parade** | Rolling Wagons | A loop of goods wagons rolls across, each carrying a letter. A right one hops and speeds off ahead; a wrong one gets a soft red X. |
| 3. Find the sound in the word | `board` | **Station Board** | Flip Board | A split-flap station board shows a short word in big flap tiles. The right tile glows and the board flips to the next word. |

All art is our own SVG in the house palette (`js/art/train2d.js`), with our own wording. Nothing is copied from the app the owner saw.

### Which task they replace
- **The three games replace Barn Doors in every lesson.** Barn Doors and Letter Hunt practise the same thing (find the shown letter by sight) with the same five-star arc, and Barn Doors is the last farm-themed game in the train world. The new games add what neither does: matching a heard sound to its letter (games 1 and 2) and finding a sound inside a written word (game 3).
- **Same length.** The game slot holds one or two games. With one game it plays its long round count; with two, each plays its short count. Barn Doors was 5 reveals (about a minute). Long: Green Light 5 rounds, Wagon Parade 3 parades, Station Board 4 words. Short: 3, 2 and 3.
- Barn Doors' code, art, CSS, data and tests are removed in A4 (see A4). Letter Hunt, Practicing Words and Ticket Check stay.
- Task indexes are positions in the list. A lesson that is half done when A4 ships may show a tick on a different task. There is no migration, because the harm is one stray tick.

### Sound playback (all three games)
- "Recorded sounds" today means `curriculum.sounds[k].clip`. `js/speech.js` plays `{ clip: k }` parts only when the Grownups switch "Play recorded letter sounds" (`settings.playSounds`, off by default) is on. It tries `<k>.mp3`, then `<k>.webm` (a parent recording from `tools/record.html`), and adds `k` to `speech.missing` when neither loads. It never falls back to text to speech, and `say()` refuses an isolated sound in a `tts` part.
- The games call a new helper, `saySound(ctx, key, prompt)` (A1). It plays the clip when it can. Otherwise it shows the grown-up prompt **"Say: aaa"** (built with `soundText`, plus "(as in apple)" when the sound has `asIn`) and carries on. The clip path counts as unavailable when `playSounds` is off, when `clip` is null, or when `speech.missing` already includes the key. After a play attempt, if `speech.missing` now includes the key, the prompt shows. The phone's voice never says a sound.
- **Gap fixed in A4:** `gen-lessons` writes `clip: null` for i t p n f d h g b l, so a parent recording of those sounds can never be found. A4 sets `clip: 'assets/audio/sounds/<k>.mp3'` for every generated sound. A missing file is then simply marked missing; the browser's 404 for `/assets/audio/` is already ignored by `test/lib.mjs`. check-content keeps accepting `.mp3` or null.
- **Future professional voice:** it plugs in at `curriculum.sounds[k].clip`, the path the `TABLE` rows in `tools/gen-lessons.mjs` produce. Drop `<k>.mp3` files into `assets/audio/sounds/` and update `CLIP_CREDIT` in `js/screens/grownups.js`. No game code changes. Write this as a comment above `saySound`.
- Words are never synthesized. Station Board shows "Say: This is sad." on the prompt for the grown-up to read.

### Rotation (A4)
- Eligibility comes from the taught sounds. Wagon Parade works from lesson 1. Green Light needs two taught sounds (lesson 2 on). Station Board needs `boardWords(...)` to return a full list of 4 (lesson 5 on; lessons 1 to 4 have at most 3 real words: am, sis, miss).
- Lesson 1 gets **Wagon Parade only**: m wagons among wagons with letters shaped unlike m (from `games.hunt.distractors.m`, minus lookalikes).
- From lesson 2, `CYCLE[(n - 2) % 6]`, where `CYCLE = [['signals'], ['wagons','board'], ['board'], ['signals','wagons'], ['wagons'], ['board','signals']]`. Ineligible games are filtered out; if nothing is left, the slot is `['signals']`.
- Result: 1 W · 2 G · 3 W · 4 G · 5 G+W · 6 W · 7 B+G · 8 G · 9 W+B · 10 B · 11 G+W · 12 W · 13 B+G (G = Green Light, W = Wagon Parade, B = Station Board). Green Light is in 7 lessons, Wagon Parade in 7 and Station Board in 4. Lessons hold 9, 10 or 11 tasks, as before plus at most one.

### Levels (Phase B)
The 13 sounds today are m a s i t p n f d h g b l. The milestones are below. The word counts come from `WORD_BANK`, a curated list of 298 short real words that this plan adds in A3. **The repo has no general word list**, so these are counts over that list, not over a dictionary. Every word is CVC, VC, CCVC or CVCC; each letter keeps its basic sound; there are no names, no s-said-as-z words (as, is, has, his) and no ng, nk or ck. Lesson-by-lesson counts: 0 words at lesson 1, 3 at lesson 4, 10 at 5, 22 at 6, 35 at 7, 55 at 9, 110 at 13.

| Level | Earned when taught | Sounds | Words readable (bank) | Reason | New car |
|---|---|---|---|---|---|
| 1 | m a s i t p (lesson 6) | 6 | 22 | Two vowels plus the first stop sounds t and p: the first real word families (-at, -ap, -it, -ip) open, and the count doubles from lesson 5 (10) to lesson 6 (22). It is close to the first set of the UK "Letters and Sounds" programme (2007), s a t p i n, which is built so that children can blend VC and CVC words early. The exact placement is reasoning, not a cited study. | Caboose |
| 2 | all 13 current sounds (lesson 13) | 13 | 110 | The whole first stretch of the line: two vowels and 11 consonants, five times the words of level 1. Placement is reasoning, not a cited study. | Passenger coach |
| 3 | + o e u (all five short vowels) | 16 or more | 206 (16 sounds); 256 if c k r come in the same stretch | All five short vowels mean almost any short closed-syllable word can be decoded. This matches the full alphabetic phase in Linnea Ehri's phases of word reading, where readers use a full set of letter-sound links. | Flatbed with a big wooden block |
| 4 | every single letter (adds w j v x y z, qu) | about 26 | 298 (the whole bank) | Every single letter has a sound: the single-letter code is complete. Reasoning, not a cited study. | Tanker |
| 5 | first digraphs sh ch th ng ck | about 31 | could not count (the bank has no digraph words, by design) | Two letters, one sound: a new idea, as in "Letters and Sounds" Phase 3. Reasoning, not a cited study. | Observation dome car |

- Spacing: 6 → 13 is 7 sounds. For level 3 to sit 5 or more sounds after level 2, the future order should bring c, k and r in with o, e and u (19 sounds). This is noted in the data comment; it changes nothing built now.
- Research named, and only this: the National Reading Panel (2000) found systematic phonics instruction effective for young children; Ehri's phases of word reading (pre-alphabetic, partial, full and consolidated alphabetic); Share's self-teaching hypothesis (1995), that decoding lets children teach themselves new words. These go in the README bullet, not in the child's UI.
- **When a level is earned:** when its `after` lesson is done (`store.isDone(after)`). Lessons are the spine; checkpoints are optional bonuses, so a skipped book never holds a level back. The "level's last station" is lesson `after`.
- **When it plays:** once, on the first Home visit after the level is earned, right after the station-complete sequence (or straight away when there is no sequence, for example at the end of the line). The count of earned levels is recorded when Home opens, like `trainDone`, so leaving mid-celebration never replays it. The first Home visit with no record (a fresh install, saved data from before 1.9.4, or test seeds without `levels`) only records the count. Levels earned before the update show their car and star without a celebration.
- **The record lives in the state, not the settings:** `state.levels = { seen: null | integer, earned: { L1: isoString } }`. "Reset progress" (`resetAll`) must clear it (`settings.trainDone` survives a reset; that is an existing behaviour, left alone).
- **Star board:** a DOM `.level-stars` chip on the Home top bar (3D and 2D), with one gold star per earned level and an empty outline for each built-but-unearned level. Stars are not drawn in WebGL, so there is no 3D cost.
- **Cars:** each earned level adds its special car behind the letter wagons. The caboose is always last. Order: coach, flatbed, tanker, dome, caboose.
- **Tunnel:** a hill with a stone arch built only while a celebration plays. It stands on the line ahead of the current stop. The train rolls in until the engine is inside, toots, and backs out to its stop. Then Pip dances, the banner shows, confetti bursts, the new car rolls up and couples on, and the star pops onto the star board. The tunnel stays in the scene until Home is left and is not built on later visits.
- **Banner:** "Level one complete!" (number words one to five), with the gold star and the new car's 2D icon. It closes on a tap or after 4.5 s (one `setTimeout`, then a CSS opacity transition).
- **Replay:** Grownups gets a "Levels" fold with a "Play again" button per earned level. It sets `ctx.replayLevel = id` and goes to `/home`, and Home plays that celebration without touching the store.
- **Reduced motion:** no ride, no dance, no confetti. The banner shows still, the star is filled, the car is already in place, and one soft `star` sfx plays. **2D fallback:** the banner (star plus car icon) after the 2D ride, and the star board.

### Owner questions (only ones that change what gets built)
1. Names: Green Light / Wagon Parade / Station Board (alternatives: Signal Lamps / Rolling Wagons / Flip Board). Only strings change, so the builder proceeds with the recommendations.
2. Level 1 at six sounds (lesson 6, 22 words) instead of four (lesson 4, the first book, but only 3 real words). If the owner prefers lesson 4, change only `needs` of L1 in the `LEVELS` table.

---

## Phase A1: shared helpers and Green Light (v1.9.0)

### Files
1. **New `js/games-data.js`** (pure, no DOM, imported by the browser, `tools/gen-lessons.mjs` and the tests):
   ```js
   // Data rules shared by the tap games and tools/gen-lessons.mjs. No DOM here.
   export const LOOKALIKE = ['da','db','dp','dq','dg','bp','bq','bh','pq','pg','nm','nh','nr','nu','hb','hk','hl','li','lt','lj','lf','tf','fi'];
   export const looksLike = (a, b) => LOOKALIKE.includes(a + b) || LOOKALIKE.includes(b + a);
   export const order = (curriculum) => curriculum.lessons.map((L) => L.sound);
   // Round targets: this lesson's sound on rounds 1, 3, 5 ...; the others take earlier sounds, newest first, cycling.
   export function roundTargets(order, n, rounds) {
     const own = order[n - 1], earlier = order.slice(0, n - 1).reverse(), out = [];
     for (let r = 0, e = 0; r < rounds; r++) out.push(r % 2 === 0 || !earlier.length ? own : earlier[e++ % earlier.length]);
     return out;
   }
   // How many rounds a game plays: the long count alone in the slot, the short count when it shares it.
   export const ROUNDS = { signals: [5, 3], wagons: [3, 2], board: [4, 3] };
   export const roundsFor = (lesson, type) => ROUNDS[type][(lesson.games || []).length > 1 ? 1 : 0];
   // The letters a round shows besides the target: other taught sounds first (newest first), then the lesson's Letter
   // Hunt distractors; never the target, never a lookalike of it, no repeats. Deterministic: callers shuffle for display.
   export function otherLetters(curriculum, n, target, count) {
     const taught = order(curriculum).slice(0, n).reverse();
     const pad = curriculum.games.hunt.distractors[curriculum.lessons[n - 1].sound] || [];
     const out = [];
     for (const k of [...taught, ...pad]) if (out.length < count && k !== target && !looksLike(k, target) && !out.includes(k)) out.push(k);
     return out;
   }
   ```
   Put the `LOOKALIKE` list here and make `test/check-content.mjs` import it instead of its own `LOOKALIKE_PAIRS`. Keep the exported name `LOOKALIKE_PAIRS` there as `export const LOOKALIKE_PAIRS = LOOKALIKE;` in case another test imports it; grep first.
   A2 and A3 add to this file.
2. **New `js/components/say-sound.js`:**
   ```js
   import { h } from '../dom.js';
   import { soundText } from '../scripts.js';
   // The tap games say a letter sound with the grown-up's recorded clip (Grownups, "Recorded sounds"), never with the
   // phone's voice. Without a clip they show "Say: aaa" for the grown-up and carry on.
   // A future professional voice plugs in at curriculum.sounds[k].clip (written by tools/gen-lessons.mjs): no change here.
   export const sayLine = (key, sounds) => `Say: ${soundText(key, sounds)}` + (sounds[key].asIn ? ` (as in ${sounds[key].asIn})` : '');
   export function clipReady({ store, curriculum, speech }, key) {
     return !!store.settings.playSounds && !!(curriculum.sounds[key] && curriculum.sounds[key].clip) && !speech.missing.includes(key);
   }
   // The prompt pill: the game puts prompt.el at the top of its scene. show(text) shows it and swells it once; hide().
   export function sayPrompt() {
     const text = h('span', { class: 'say-text' });
     const el = h('div', { class: 'say-prompt', role: 'status', hidden: true }, h('span', { class: 'say-who', 'aria-hidden': 'true' }, 'Grown-up'), text);
     return { el, show(t, key) { text.textContent = t; el.dataset.key = key || ''; el.hidden = false; if (!matchMedia('(prefers-reduced-motion: reduce)').matches) el.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.06)' }, { transform: 'scale(1)' }], { duration: 420 }); }, hide() { el.hidden = true; } };
   }
   // Plays the sound of key; resolves 'clip' when the clip played, else shows the prompt and resolves 'prompt'.
   // lead: text before the sound on the prompt (Station Board: "This is sad."); with a clip only the lead shows.
   export async function saySound(ctx, key, prompt, { lead = '' } = {}) {
     const full = lead ? `Say: ${lead} Tap ${soundText(key, ctx.curriculum.sounds)}.` : sayLine(key, ctx.curriculum.sounds);
     if (clipReady(ctx, key)) {
       if (lead) prompt.show(`Say: ${lead}`, key); else prompt.hide();
       await ctx.speech.say([{ clip: key }]);
       if (!ctx.speech.missing.includes(key)) return 'clip';
     }
     prompt.show(full, key);
     return 'prompt';
   }
   ```
   CSS in `css/app.css`: `.say-prompt` sits top-centre of the game scene (absolute, `top: 10px`, centred, `z-index: 3`, max-width `calc(100% - 32px)`), with a cream pill, ink text, 20px bold, and `.say-who` as a small violet label. `[hidden]` must hide it (add `.say-prompt[hidden] { display: none; }`).
3. **`js/art/train2d.js`:** add `signalSvg()`: a navy post, a rounded lamp housing and a lamp circle (`class: 'lamp'`, fill `#FFE3A3`), plus a green circle on top of it (`class: 'lamp-go'`, fill `#2FB37A`, `opacity: 0`), viewBox `0 0 100 170`. The letter plate is HTML (below). Also make `wagonSvg({ body = '#D65A4A', rib = '#B8463A' } = {})` take optional colours (the default keeps the Loading Dock unchanged).
4. **New `js/screens/tasks/signals.js`, Green Light.** `build(ctx)` with `{ lesson, sound, speech, curriculum, store, setDone }`, in the style of `hunt.js`:
   - Scene: `huntBackdrop()` in a `.farm.signals-scene`, the `say-prompt`, a row `.signal-row` of 4 buttons `.signal` (each `signalSvg()` over an HTML plate `.signal-plate` holding `letterFace(ch, INK)`), the 2D engine `engineSvg()` in `.train-wrap` on the track at the bottom-left, and `starRow(rounds)` under the scene.
   - Size: each `.signal` is at least 84 px wide and 150 px tall (`min(22vw, 110px)` wide), with gaps of at least 8 px. This must fit 360 px wide with 16 px gutters.
   - `rounds = roundsFor(lesson, 'signals')`; `targets = roundTargets(order(curriculum), lesson.number, rounds)`.
   - Each round: letters = `[target, ...otherLetters(curriculum, lesson.number, target, 3)]`, shuffled with `shuffle` from game-kit, re-shuffled until the target's slot differs from the last round's. Buttons get `dataset.letter` and `dataset.target` ('1'/'0'). The el has `dataset.round` (0-based, rounds done) and `dataset.state` ('playing' | 'done').
   - Round start: 400 ms after the round is laid out, `saySound(ctx, target, prompt)`. There is also a round bell button `.signal-hear` (72 px, speaker icon from `icon('speaker', 32)`, `aria-label: 'Hear the sound again'`) at the right of the prompt row, which calls `saySound` again.
   - Right tap: `lamp-go` fades to opacity 1 (CSS transition 200 ms), `sfx.play('pop', { step: round })`, a star fills, and the engine moves one step (`translateX(travel * (round + 1) / rounds)`, CSS transition `transform 700ms`; wheel WAAPI spin as in hunt `chug()`). Taps lock for 900 ms, then the next round. After the last round the engine chugs off right (copy hunt's leave animation in short form: `LEAVE_MS` 1500), `sfx.play('win')` at 1.6 s, then `setDone(true)` and `dataset.state = 'done'`.
   - Wrong tap: `shake()` on that signal, then `saySound` again (it helps the child hear it). No sound effect, nothing red.
   - `idleHints(scene, () => pulse the bell button)`.
   - Returned object: `el, flush: true, parts: () => [{ tts: curriculum.games.signals.say }]`, `gist: () => fit(\`Tap the light for ${soundPhrase(sound)}.\`, \`Light for ${soundPhrase(sound)}.\`, 'Tap the right light.')`, `script: () => \`Say: 'Listen. Which light says ${soundPhrase(sound)}? Tap it.' If no recording plays, say the sound shown at the top.\``, `again` (reset to round 0, with a fresh shuffle), and `cleanup` (timers, hints, watchSize).
   - Reduced motion: no wheel spin and no leave animation; the engine simply stands at the end.
5. **`js/lessons.js`:** add `signals: { name: 'Green Light', color: 'mint', dark: true, label: "Today we'll listen" }` to `TASK_TYPES`. In `tasksFor` replace `'barn'` with `...(lesson.games || ['barn'])`. In `targetsFor` add `'signals'` to the `[{ glyph: lesson.sound }]` case.
6. **`js/screens/task.js`:** import and register `signals` in `BUILDERS`; add `'signals'` to the `autoOpen` exclusion list.
7. **`js/screens/lesson.js`:** in the task-card art switch add `case 'signals':` with a small `signalSvg()` (class `art-signals`).
8. **`tools/gen-lessons.mjs`:** after `c.checkpoints = ...` add `c.games.signals = { say: 'Listen. Then tap the light that makes the sound.' };`. Run `node tools/gen-lessons.mjs` then `node test/check-content.mjs`. check-content's games rule (around line 139) must accept the new key: a `say` string, no distractors needed. If it loops over every key of `games`, limit the distractor check to `hunt` and `barn`.
9. **`sw.js`:** add `js/games-data.js`, `js/components/say-sound.js` and `js/screens/tasks/signals.js` to `APP_FILES`.
10. **`test/lib.mjs`:** add `signals: true` to `SEEN_BASE`.

### Test harness (new `test/tap-games.mjs`, added to `npm test` right after `node test/games.mjs`)
- `open(browser, url, vp, { settings, patch })` does `newPage`, adds `SPEECH_STUB`, and seeds `{schema:1, lessons: DONE_JSON, settings:{seenScripts: SEEN, ...settings}, firstRunDone:true, meetDue:false}`. When `patch` is given it does `page.route('**/data/curriculum.json', async (r) => { const res = await r.fetch(); const c = await res.json(); patch(c); r.fulfill({ response: res, json: c }); })`. The route handler runs in Node, so `patch` is plain data applied there: `{ games: { 2: ['signals'] }, clips: { a: 'assets/audio/sounds/none.mp3' } }` sets `c.lessons[1].games` and `c.sounds.a.clip`.
- The route is `#/lesson/${n}/task/${index}`, where `index = tasksFor(patchedLesson).find((t) => t.type === type).index`, computed in Node from the same patched copy.
- Helpers: `clips = () => page.evaluate(() => window.__events.filter((e) => e.type === 'clip').map((e) => e.src))`, `ttsAll`, and `RAF_COUNT` (copy from `test/train.mjs`).
- `idleCheck(page, tag)`: after `state === 'done'`, wait 1500 ms, read `window.__raf`, wait 3000 ms; expect at most 2 frames and `document.getAnimations().filter((a) => a.playState === 'running' && a.effect.getComputedTiming().endTime === Infinity).length === 0`.
- Run with `node test/tap-games.mjs` (Pixel 7 only for the game flow, plus a layout check at all `VIEWPORTS`).

### Green Light checks
1. Layout at all 3 viewports (lesson 2, games `['signals']`): 4 `.signal` buttons, each at least 72×72 (expect ≥84 wide), inside the scene, not overlapping each other, the prompt or the engine.
2. Exactly one `.signal[data-target="1"]`, and its letter is the round target (round 1 = `a`).
3. Clip path: settings `{ playSounds: true }`, lesson 2. After the first tap on the scene (rule 16), a `clip` event `a.mp3` is logged within 2 s, `.say-prompt` is hidden, and no `tts` entry is a bare sound.
4. Prompt path: settings `{ playSounds: false }`. `.say-prompt` is visible with text `Say: aaa (as in apple)`, `data-key="a"`, and no clip event.
5. Missing recording: `{ playSounds: true }` with patch `clips: { a: 'assets/audio/sounds/none.mp3' }`. The prompt appears after the failed attempt.
6. Wrong tap: the round stays the same and no `pop` note is added (`__audioNotes`). With `playSounds: true` one more `a.mp3` clip event follows.
7. Right taps: each one raises `dataset.round` by one; the target's slot changes between rounds. After 5 rounds (games `['signals']`) `state === 'done'` and the shell's last button reads "Next" or "Finish" (as in `games.mjs` for hunt). With games `['signals','wagons']` there are 3 rounds. **For A1 only**, `wagons` is not yet a type: patch `['signals','hunt']` to test the short count; `roundsFor` only looks at the length.
8. `idleCheck` after done.
9. Reduced motion (`reducedMotion: 'reduce'` context option): done after all rounds, `idleCheck` passes.

Run: `node test/check-content.mjs`, `node test/tap-games.mjs`, `node test/games.mjs` (Barn Doors still works: the fallback `['barn']`) and `node test/script.mjs` (gists).

### Done when
- Green Light plays at `#/lesson/2/task/<i>` when lesson 2 is given `games: ['signals']`, and no real lesson changes yet.
- The suites above pass; the versions are 1.9.0; the README has the new decisions section with an A1 bullet.

Commit message: `Tap games: shared sound-or-prompt helper and Green Light, the signal-lamp game (1.9.0)`

---

## Phase A2: Wagon Parade (v1.9.1)

### Files
1. **`js/games-data.js`:** add
   ```js
   // A parade: `size` wagons in a loop, `hits` of them the target, the rest from `others` in turn; no two targets side by side.
   export function parade(target, others, { size = 8, hits = 3, rng = Math.random } = {}) {
     const slots = Array.from({ length: size }, (_, i) => i).filter((i) => i % 2 === 0);
     const at = new Set(); while (at.size < hits) at.add(slots[Math.floor(rng() * slots.length)]);
     return Array.from({ length: size }, (_, i) => (at.has(i) ? target : others[i % others.length]));
   }
   ```
   (`size` 8 and `hits` 3 mean the even slots 0, 2, 4 and 6, so targets are never side by side.)
2. **New `js/screens/tasks/wagons.js`, Wagon Parade.**
   - Scene: `huntBackdrop()` in `.farm.wagons-scene`, the `say-prompt`, `findCard(target)` at the top-left (the sign showing which letter), the bell button `.wagon-hear` (72 px), the 2D engine at the left end of the track pulling nothing (it waits there, not moving), and a `.parade` layer on the track band. `starRow(rounds)` goes underneath.
   - Wagons: buttons `.wagon` holding `wagonSvg({ body, rib })` (colours cycle through 4 soft accents that never match the target: use the `BALLOONS` idea from hunt, a fixed list) with `letterFace(ch, INK)` in `.wagon-panel`. Size: 104×78 px (≥72 required). Gap: 16 px. `dataset.letter`, `dataset.target`.
   - `rounds = roundsFor(lesson, 'wagons')`; the target is always `lesson.sound`. `others = otherLetters(curriculum, n, target, 3)`. For lesson 1 that gives the hunt distractors of m minus lookalikes (n is dropped).
   - Motion (not reduced): wagons sit in a loop strip of length `L = size * (104 + 16)`. One rAF loop moves `x -= SPEED * dt` (`SPEED = 80` px/s). Each wagon's `transform: translate3d(...)` is set from `((x0 + offset) mod L) - 120`, so a wagon leaving on the left comes back on the right (a loop: a missed target always returns, nothing is timed and nothing fails). The loop runs **only while a parade is rolling**: it starts at the round start, stops (`cancelAnimationFrame`) when the round's targets are all gone, and stops when `document.hidden` (resuming on visible). The rule-8 `dt` applies.
   - Tap: `pointerdown` on `.wagon` (a moving target; a `click` with `e.detail === 0` handles keyboard). **Every tap** calls `saySound(ctx, target, prompt)`.
     - Right: the wagon hops (WAAPI translateY -18 px, 260 ms) and speeds ahead (its own WAAPI `translateX(-W)` 700 ms with fill forwards; it leaves the loop and is removed), `sfx.play('pop', { step })` (it is silent while a clip plays; that is fine), and a star fills on the round's last target.
     - Wrong: a soft red X `.no-x` (an SVG cross in `#E5484D` at 70 % opacity) fades in and out over the wagon (opacity, 600 ms). No sound effect.
   - Round end: when all `hits` targets are gone, the loop stops; after 900 ms the next parade starts with a new `parade(...)`. After the last parade: `sfx.play('win')`, `setDone(true)`, `dataset.state = 'done'`. `dataset.round` counts parades done.
   - Reduced motion: no rAF at all. The 8 wagons stand still in two rows of 4 (wrapping to fit), a right one fades out (opacity 300 ms), and the rest is the same.
   - `parts: () => [{ tts: curriculum.games.wagons.say }]`, gist `fit(\`Tap every ${soundPhrase(sound)}.\`, 'Tap every one.')`, script: `Say: 'Tap every wagon that says ${soundPhrase(sound)}.' Every tap plays the sound; say it with them.`, plus `again` and `cleanup` (which must cancel the rAF).
3. `TASK_TYPES.wagons = { name: 'Wagon Parade', color: 'sun', dark: true, label: "Today we'll tap" }`; `targetsFor` gets the glyph case; `BUILDERS` and the `autoOpen` list in `task.js`; card art `case 'wagons':` with `wagonSvg()` in `lesson.js`; `gen-lessons`: `c.games.wagons = { say: 'Tap every wagon with the sound you hear.' }` (run gen and check-content); `sw.js` gets `js/screens/tasks/wagons.js`; `SEEN_BASE` gets `wagons: true`.

### Checks (added to `test/tap-games.mjs`)
1. Lesson 1 with `games: ['wagons']`: every wagon letter is `m` or in `games.hunt.distractors.m`, never `n`; 3 targets per parade, never two side by side (check `dataset.target` order).
2. Every wagon is at least 72×72.
3. Motion: two reads of a target wagon's `getBoundingClientRect().x` 500 ms apart differ (it moves left).
4. Every tap plays the sound: `{ playSounds: true }`, lesson 1. Each tap (right or wrong, 400 ms apart) adds one `m.mp3` clip event. With `playSounds: false` the prompt shows `Say: mmm`.
5. Wrong tap: `.no-x` shows on that wagon; no `pop` note is added; the round is unchanged.
6. Right taps: read the box and tap at once. A tapped target leaves; after 3 targets `dataset.round` goes up by one. After `rounds` parades (3 alone) `state === 'done'`.
7. rAF stops: during the 900 ms pause between parades, at most 2 frames (RAF_COUNT); after done, `idleCheck`.
8. Reduced motion: wagons do not move (x is the same 1 s apart), at most 2 frames over 3 s mid-round, and done after all parades.

Run: `node test/check-content.mjs`, `node test/tap-games.mjs`, `node test/script.mjs`.

### Done when
Wagon Parade plays when a lesson is given `games: ['wagons']`; the suites pass; the version is 1.9.1; there is a README bullet.

Commit message: `Tap games: Wagon Parade, tap every wagon with the sound (1.9.1)`

---

## Phase A3: Station Board (v1.9.2)

### Files
1. **`js/games-data.js`:** add `WORD_BANK` and `boardWords`. This is the exact list; the planner checked every word (298 words):
   ```js
   // Short real words for Station Board: every letter keeps its basic sound; no names, no s said as z, no ng/nk/ck.
   // tools/gen-lessons.mjs keeps only the words spelt with taught sounds, so later lessons pick up more by themselves.
   export const WORD_BANK = `am an at it in if us up on ox ax
   sat sit set sap sip sad sag sob sun sum six sis
   mat map mad man mop mom mud mug mix men met mess miss
   pat pan pad pal pig pin pit pip pop pot pet pen peg pup pug
   tap tan tag tip tin top tub tug ten tell
   nap nag nip net nod not nut
   fan fat fad fig fin fit fog fox fun fed fell fuss fizz fix
   dad dam dab dig dip did dim din dog dot den dug dull
   hat had ham hip hit him hid hop hot hog hen hum hut hug hill hiss
   gas gap gig get got gum gull
   bat bag bad ban bib bit big bin bid bog bob bun bus but bud bug bed bet beg bell bill buzz box
   lap lab lad lag lip lit lid log lot leg let led
   cat cap can cab cot cop cod cut cup cub cob
   kit kid kin keg
   rat ran rag ram rap rip rib rid rim rob rod rot rub rug run red
   wag wig win wit wet web wed wax
   jab jam jet jig jog jot jug
   van vat vet
   yam yap yes yet yum
   zap zip
   quit quiz
   mast mist must fast fist last list lost past pest test rest nest best vest west
   sand band land hand bend send lend mend fund pond
   lamp camp damp limp bump jump lump pump
   milk silk gift lift soft left raft
   help held melt felt belt
   spin spot spit spat stop step stem slip slap slim slid sled flat flap flip flag frog grab grin drip drop drum plan plum snap snip snug swim twin trip trap trot glad clap clip club crab crib
   stamp stand twist`.split(/\s+/).filter(Boolean);
   const dist = (a, b) => {
     if (a.length === b.length) { let d = 0; for (let i = 0; i < a.length; i++) d += a[i] !== b[i]; return d; }
     const m = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
     for (let j = 1; j <= b.length; j++) m[0][j] = j;
     for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + (a[i - 1] !== b[j - 1]));
     return m[a.length][b.length];
   };
   const once = (w, k) => [...w].filter((c) => c === k).length === 1;
   // The words of lesson n: up to 4 letters, all taught; each round's target sound appears exactly once in its word; each
   // next word is the closest to the last one (fewest letters changed; ties go to the bank order). Null when a round has no word.
   export function boardWords(order, n, rounds = 4) {
     const taught = new Set(order.slice(0, n));
     const pool = WORD_BANK.filter((w) => w.length <= 4 && [...w].every((c) => taught.has(c)));
     const out = []; let prev = null;
     for (const k of roundTargets(order, n, rounds)) {
       const c = pool.filter((w) => once(w, k) && !out.some((o) => o.word === w));
       if (!c.length) return null;
       const pick = prev ? c.reduce((best, w) => (dist(prev, w) < dist(prev, best) ? w : best), c[0]) : (c.find((w) => w.length === 3) || c[0]);
       out.push({ word: pick, target: k }); prev = pick;
     }
     return out;
   }
   ```
   Expected output (this is a test): lesson 5 → sat(t) sit(i) it(t) mist(s); lesson 7 → man(n) map(p) nap(n) tap(t); lesson 9 → sad(d) fad(f) mad(d) man(n); lesson 13 → pal(l) dab(b) lab(l) lag(g); lessons 1 to 4 → null.
2. **`tools/gen-lessons.mjs`:** import `{ boardWords }` from `'../js/games-data.js'`. After the lessons loop, for **every** lesson (1 to 3 included):
   `const b = boardWords(c.lessons.map((L) => L.sound), L.number, 4); if (b) L.board = b; else delete L.board;`. Also add `c.games.board = { say: 'Find the sound in the word.' }`. Run gen, then check-content.
3. **`test/check-content.mjs`:**
   - In `checkCurriculum`: for `L.board`, there are 3 or 4 entries; `word` length 2 to 4, all letters taught by `L.number`, not in `S_SAYS_Z`; `target` taught by then and appearing exactly once in `word`; no word repeats in a lesson.
   - In `childReadProof`: push `{ where: \`lesson ${L.number} board\`, word: w.word, after: L.number }` for each board entry. That reuses the proof.
4. **New `js/screens/tasks/board.js`, Station Board.**
   - Scene: `huntBackdrop()` in `.farm.board-scene`, the `say-prompt`, the bell button `.board-hear` (72 px), and a station board `.flap-board` (navy `#2B2D5C`, radius 18, a sun-yellow top rim, centred) holding one row of tiles. Each tile is a button `.flap-tile` (cream face, a thin dark split line across the middle via a pseudo-element, `letterFace(ch, INK)` inside), at least 76×96 px; four tiles plus three 8 px gaps fit 360 px wide with gutters. Below the board, the 2D engine stands on the track. `starRow(rounds)` goes underneath.
   - `rounds = roundsFor(lesson, 'board')`; the words are `lesson.board.slice(0, rounds)`. If `lesson.board` is missing (a test can patch one in), fall back to `boardWords(order(curriculum), lesson.number, rounds)`.
   - Round start: tiles show `word` (`dataset.letter`; `dataset.target = '1'` on the one tile whose letter is the target). Then `saySound(ctx, target, prompt, { lead: \`This is ${word}.\` })`: recorded → the prompt reads `Say: This is sad.` and the clip plays; not recorded → `Say: This is sad. Tap aaa.` The word is never sent to text to speech.
   - Right tap: the tile tints with the accent (`tintLetter`), `sparkle` at the tile, `sfx.play('pop', { step })`, a star fills. After 600 ms every tile flips: WAAPI `rotateX(0 → -90deg)` (150 ms), swap to the next word's letters, then `rotateX(90deg → 0)` (150 ms), staggered 60 ms per tile. When the next word is longer or shorter, add or remove tiles in the flip. Taps lock until the flip ends. After the last word: `sfx.play('win')`, `setDone(true)`, `state = 'done'`.
   - Wrong tap: `shake()` on that tile. No sound.
   - Reduced motion: no flip (swap the letters at once, with an opacity fade of 150 ms).
   - `parts: () => [{ tts: curriculum.games.board.say }]`, gist `fit(\`Find ${soundPhrase(sound)} in the word.\`, 'Find the sound.')`, script: `Read the word on the board: 'This is …' Then say the sound shown, and let them tap the letter that makes it.`
5. `TASK_TYPES.board = { name: 'Station Board', color: 'lilac', dark: true, label: "Today we'll find" }`; the `targetsFor` glyph case; `BUILDERS`, `autoOpen` list; card art `case 'board':` (a small static `.flap-board` with three blank tiles); `sw.js` gets `js/screens/tasks/board.js`; `SEEN_BASE` gets `board: true`.

### Checks
- In `test/check-content.mjs`'s run (node): import `boardWords` and assert the expected outputs listed in item 1 (lessons 5, 7, 9 and 13, and null for 1 to 4). Print a FAIL line if any differ.
- In `test/tap-games.mjs`, lesson 5 with games `['board']`:
  1. The tiles spell `sat`, each at least 72×72, inside the board and inside the viewport at all 3 viewports.
  2. Prompt path (`playSounds: false`): the prompt reads `Say: This is sat. Tap t-.`; no tts contains `sat`.
  3. Recorded path: `{ playSounds: true }` with patch `clips: { t: 'assets/audio/sounds/t.mp3' }` (the stub plays it). There is a `t.mp3` clip event, and the prompt reads `Say: This is sat.`.
  4. A wrong tap (`s`) leaves the round unchanged; a right tap (`t`) moves on: the tiles then spell `sit`, then `it`, then `mist`. After 4 rounds, done.
  5. `idleCheck`; reduced motion is done with no flip animations (`getAnimations()` holds no rotateX).

Run: `node test/check-content.mjs`, `node test/tap-games.mjs`, `node test/script.mjs`.

### Done when
Lessons 5 to 13 carry `board` words in `curriculum.json`; the proof covers them; Station Board plays when patched in; the suites pass; the version is 1.9.2; there is a README bullet.

Commit message: `Tap games: Station Board, find the sound in a word on a split-flap board; words proven readable (1.9.2)`

---

## Phase A4: rotation and lesson wiring (v1.9.3)

### Files
1. **`js/games-data.js`:** add
   ```js
   export const CYCLE = [['signals'], ['wagons', 'board'], ['board'], ['signals', 'wagons'], ['wagons'], ['board', 'signals']];
   // The game slot of lesson n (Barn Doors' old place): lesson 1 has one sound, so only Wagon Parade fits.
   export function gameSlot(order, n) {
     if (n === 1) return ['wagons'];
     const ok = { signals: n >= 2, wagons: true, board: !!boardWords(order, n, 4) };
     const pick = CYCLE[(n - 2) % CYCLE.length].filter((g) => ok[g]);
     return pick.length ? pick : ['signals'];
   }
   ```
2. **`tools/gen-lessons.mjs`:** in the all-lessons pass from A3, add `L.games = gameSlot(order, L.number)`. In the TABLE loop set `clip: \`assets/audio/sounds/${e.k}.mp3\`` instead of `clip: null` (see "Sound playback"). Stop writing `games.barn`: change `for (const kind of ['hunt', 'barn'])` to `['hunt']` in both places, and add `delete c.games.barn;`. Run gen and check the printed summary.
3. **`js/lessons.js`:** `tasksFor` uses `...(lesson.games || [])` (no barn fallback). Remove `barn` from `TASK_TYPES` and from `targetsFor`.
4. **Remove Barn Doors.** Run `grep -rn "barn" --include=*.js --include=*.mjs --include=*.css --include=*.html /home/user/Choo-Choo-Training --exclude-dir=node_modules --exclude-dir=vendor` and handle every hit:
   - delete `js/screens/tasks/barn.js`; remove it from `task.js` (import, `BUILDERS`, `autoOpen` list) and from `sw.js`;
   - `js/screens/lesson.js`: remove `case 'barn'` and the `barnSvg` import;
   - `js/art.js`: remove `barnSvg` only if nothing else uses it (the grep above shows its only users are barn.js and lesson.js); keep `farmBackdrop` (game-kit uses it);
   - `css/app.css`: remove the `.barn`, `.barn-letter`, `.barn-game` and `.art-barn` rules;
   - `test/check-content.mjs`: drop the barn distractor rules;
   - tests: remove the Barn Doors checks in `test/games.mjs` (its `barnChecks` and the call), `test/sfx.mjs` (the `doors` cases; only barn.js plays `doors`, so also drop `doors` from `SOUNDS` and the header comment in `js/sfx.js`, and leave everything else in sfx.js as it is), `test/round2.mjs`, `test/script.mjs`, `test/smoke.mjs` and `tools/screenshots.mjs`. Replace `barn: true` with nothing in `SEEN_BASE`;
   - `js/screens/tasks/hunt-deal.js` mentions barn only in a comment: fix the comment.
5. **`test/check-content.mjs`:** every lesson has `games`, 1 or 2 entries from `signals`, `wagons`, `board`, equal to `gameSlot(order, n)`; a lesson listing `board` has `L.board`; lesson 1 is `['wagons']`; every sound's `clip` matches `assets/audio/sounds/<k>.mp3` or is null.
6. **`test/tap-games.mjs`:** add `rotationChecks` with **no patch** (the real data):
   - node: `gameSlot` for lessons 1 to 13 equals the table in section 1 (W, G, W, G, G+W, W, B+G, G, W+B, B, G+W, W, B+G);
   - browser: `#/lesson/1` shows a "Wagon Parade" card and no "Barn Doors"; `#/lesson/7` shows "Station Board" then "Green Light", in that order, between "Letter Hunt" and "Practicing Words". In lesson 7, Green Light runs 3 rounds (the short count).

### Run
`node test/check-content.mjs`, `node test/tap-games.mjs`, `node test/games.mjs`, `node test/script.mjs`, `node test/sfx.mjs`, `node test/round2.mjs`. If this is the session's last phase, run the full `npm test` instead (rule 5).

### Done when
- Every lesson's game slot follows the rotation; Barn Doors is gone from code, data, CSS and tests (the grep finds only comments in old plans and the README history).
- Every sound has a clip path, so a parent recording of any sound is found.
- The suites pass; the version is 1.9.3; there is a README bullet with the rotation table.

Commit message: `Lessons: the three tap games rotate in Barn Doors' place, chosen by gen-lessons; every sound can take a recording (1.9.3)`

---

## Phase B: levels with celebrations (v1.9.4)

### Data
1. **`tools/gen-lessons.mjs`:** add a `LEVELS` table and write `c.levels`:
   ```js
   // Milestones (docs/PLAN-v1.9.md). A level is earned when its `after` lesson is done; after is null while a needed sound
   // is not built yet. Keep levels 5 to 15 sounds apart: when o e u are added, bring c k r in the same stretch.
   const ALL13 = ['m','a','s','i','t','p','n','f','d','h','g','b','l'];
   const LEVELS = [
     { id: 'L1', n: 1, car: 'caboose', needs: ['m','a','s','i','t','p'] },
     { id: 'L2', n: 2, car: 'coach',   needs: ALL13 },
     { id: 'L3', n: 3, car: 'flatbed', needs: [...ALL13, 'o','e','u'] },
     { id: 'L4', n: 4, car: 'tanker',  needs: [...ALL13, ...'oeuckrwjvxyzq'] },
     { id: 'L5', n: 5, car: 'dome',    needs: [...ALL13, ...'oeuckrwjvxyzq', 'sh','ch','th','ng','ck'] },
   ];
   const builtAt = (s) => { const i = c.lessons.findIndex((L) => L.sound === s); return i < 0 ? null : i + 1; };
   c.levels = LEVELS.map((v) => { const at = v.needs.map(builtAt); return { ...v, after: at.includes(null) ? null : Math.max(...at) }; });
   ```
   Expected: L1 after 6, L2 after 13, L3 to L5 after null.
2. **`test/check-content.mjs`:** `levels` ids are unique, `n` runs 1, 2, 3 …, each `needs` holds the one before it, `car` is one of `caboose coach flatbed tanker dome` with no repeats, and `after` equals the first lesson by which all `needs` are taught (or null). Built levels are 4 to 15 sounds apart (level 1 counts from 0).

### State and logic
3. **`js/store.js`:** `fresh()` gains `levels: { seen: null, earned: {} }`. `load()` cleans it: `seen` is an integer ≥ 0 or null, and `earned` is an object of id → string. Anything else gives fresh. Add:
   ```js
   levels: () => state.levels,
   setLevels(patch) { state.levels = { ...state.levels, ...patch, earned: { ...state.levels.earned, ...(patch.earned || {}) } }; save(); },
   ```
   `resetAll` already rebuilds from `fresh()`, so levels are cleared; add a store test line for that in `test/store.mjs`.
4. **New `js/levels.js`:**
   ```js
   // Levels (curriculum.levels): earned when the `after` lesson is done. The count is recorded when Home opens, so a
   // celebration plays once; the first look (no count yet) only records it.
   export const NUMBER_WORDS = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
   export const builtLevels = (curriculum) => (curriculum.levels || []).filter((v) => v.after !== null);
   export const earnedLevels = (curriculum, store) => builtLevels(curriculum).filter((v) => store.isDone(v.after));
   export function dueLevel(store, curriculum) {
     const earned = earnedLevels(curriculum, store), seen = store.levels().seen;
     const now = new Date().toISOString();
     const add = Object.fromEntries(earned.filter((v) => !store.levels().earned[v.id]).map((v) => [v.id, now]));
     if (seen !== earned.length || Object.keys(add).length) store.setLevels({ seen: earned.length, earned: add });
     return seen === null || earned.length <= seen ? null : earned[earned.length - 1];
   }
   export const bannerText = (v) => `Level ${NUMBER_WORDS[v.n - 1]} complete!`;
   // Special cars in train order: coach, flatbed, tanker, dome, then the caboose last.
   const CAR_ORDER = ['coach', 'flatbed', 'tanker', 'dome', 'caboose'];
   export const carsOf = (levels) => CAR_ORDER.filter((k) => levels.some((v) => v.car === k));
   ```
   Home calls `dueLevel` once when it opens (3D and 2D), **before** it builds the train. A replay comes from `ctx.replayLevel` (cleared at once); it does not call `setLevels`.
5. **New `js/components/star-board.js`:** `starBoard(curriculum, store)` returns `.level-stars` (`role="img"`, `aria-label="N gold stars"`, `dataset.count`), with one `starSvg()` (from `js/art.js`) per built level, gold when earned (`.on`) and an outline otherwise. `pop(i)` runs a WAAPI scale pop on star i (none under reduced motion). Home puts it in `.home-top` next to the Grownups pill, in both 3D and 2D.
6. **New `js/art/cars2d.js`:** `carSvg(kind)` for the five kinds, viewBox `0 0 200 120`, house palette: caboose red with a cupola, coach sky-blue with 3 windows, flatbed navy with a wooden block, tanker mint with a round tank, dome lilac with a pale dome.
7. **New `js/components/level-banner.js`:** `levelBanner({ level, host, reducedMotion })` appends a `.level-banner` (`role="status"`) with a big gold `starSvg()`, `carSvg(level.car)` (class `car-icon`) and the text `bannerText(level)` (34px bold, ink on cream, sun-yellow border). Without reduced motion: a WAAPI scale-in (300 ms) and two `sparkle(host, ...)` bursts (count 28, then 20 after 600 ms). It closes on a tap or after 4500 ms (one `setTimeout`; a 250 ms opacity fade, then removal). Returns `{ el, close }`. CSS: fixed and centred, max-width `calc(100% - 32px)`, `z-index` above the overlay buttons.

### 3D Home (`js/screens/home3d.js`, `js/train/train.js`, new `js/train/tunnel.js`)
8. **`train.js`:** `buildTrain(sceneBag, line, cars, specials = [])`. Add `buildSpecial(bag, kind)`: the same chassis, wheels and coupler as `buildCar`, with a body per kind (caboose: red block plus a small cupola block and sun trim; coach: a long sky-blue block with three cream window blocks a side; flatbed: a navy deck with a wood-coloured crate; tanker: a mint `CylinderGeometry` lying along the car; dome: a lilac block with a pale half-sphere). Specials follow the letter wagons in the order given. `offsets()` and `length` include them. Add `join(kind, t)`: that special starts 2.6 units further back and glides to its place over 0.9 s (ease-out), applied in `place(s, t)`; `train.joined` is true when it has finished. Expose `specials` (the kinds, in order) for the debug object.
9. **`tunnel.js`:** `buildTunnel(bag, line, s)` returns `{ group }`. It is a grass-green hill (a `SphereGeometry(1, 24, 16)` scaled to about 1.9 high, 2.4 wide, 2.0 long along the line, sunk 0.3 below the ground) with a dark navy arch mouth facing back along the line (a half `CylinderGeometry` disc) and a stone ring (`TorusGeometry` with arc π, `PAL.locked` grey), placed at `line.at(s)` with its heading. Constants: `TUNNEL_AT = 4.8` (past the current stop's centre) and `IN = 4.6` (how far the train rolls in). Check by screenshot that the engine disappears inside and the hill does not cover the next stop's sign; tune only these two constants.
10. **`home3d.js`:**
    - At open: `const due = ctx.replayLevel ? builtLevels(curriculum).find((v) => v.id === ctx.replayLevel) : dueLevel(store, curriculum); ctx.replayLevel = null;`. Specials = `carsOf(earnedLevels(...))`, plus the replayed level's car if it is missing. The new car of `due` starts hidden (`visible = false`) unless motion is reduced.
    - When `due`: build the tunnel at `stopS[currentIndex] + TUNNEL_AT`.
    - `debug.level = { id: due ? due.id : null, phase: '' }`; phases are `'in' | 'hold' | 'out' | 'party' | ''`.
    - Start: if a sequence runs, the celebration starts 600 ms after the sequence's final `arrived(t)` (the one after the hop-off). With no sequence, it starts 900 ms after open (after the hello wave). Under reduced motion it starts at open, after the reduced arrival fade if there is one.
    - In `step()`, a level state machine like `stepSeq`. 'in': the train goes from `restS(cur)` to `restS(cur) + IN` over 1600 ms (ease3), wheels roll, normal puffs, `rig.follow`. 'hold': 600 ms with `sfx.play('toot')` at its start. 'out': back to `restS(cur)` over 1600 ms. 'party': 2600 ms. At its start: `levelBanner(...)` on `root`, `starBoard.pop(n - 1)` and `sfx.play('checkpoint')`, the new car shown and `train.join(kind, t)`, Pip waves, and the kid waves. During it Pip dances: `train.pip.group.position.y = base + Math.abs(Math.sin(k * Math.PI * 4)) * 0.12` and `rotation.z = Math.sin(k * Math.PI * 4) * 0.15`, restored at the end. Then phase `''`, and `busy` becomes false, so drawing stops.
    - Reduced motion: no ride and no dance. The banner (no scale-in, no sparkle), the star set without a pop, the car already there, and `sfx.play('star')`. Exactly one `render()`.
    - Hidden page mid-celebration: the existing visibility handler stops frames; on return the state machine carries on from `now` (the times are relative to `seq.t0`-style starts, so the phases just finish).
11. **2D Home (`js/screens/home.js`, `mapScreen`):** call `dueLevel` (or read the replay) at open. Add the star board to its top bar. Show `levelBanner` 400 ms after the 2D ride ends: where the ride makes `.stone-kid` visible again; or 600 ms after open when there is no ride. No tunnel and no car joining (the icon is in the banner).
12. **Grownups (`js/screens/grownups.js`):** a fold "Levels" placed after "Recorded sounds". For each built level: its star (gold or outline), `bannerText`-style title "Level one", a line with the sounds it needs (`needs.join(' ')`), and, when earned, a button `.level-replay` (`data-level`, ≥48 px) "Play again". Its onclick: `ctx.replayLevel = v.id; router.go('/home')`. Unbuilt levels are listed as "Coming later". A short note: "Each level adds a special car to the train and a gold star."
13. `sw.js`: add `js/levels.js`, `js/components/star-board.js`, `js/components/level-banner.js`, `js/art/cars2d.js` and `js/train/tunnel.js`.

### Tests (new `test/levels.mjs`, added to `npm test` before `node test/smoke.mjs`; reuse `openHome`, `state` and `iL` from `test/train.mjs`, and export `until` and `RAF_COUNT` from there too. Check first that `test/train.mjs` runs its suite only when it is the main script; if it does not, add the same `process.argv[1]` guard that `test/check-content.mjs` uses)
Seed `six = lessons 1..6 done with completedAt '2026-10-0nT10:00:00.000Z', trainAt: iL(6), trainDone: 5, levels: { seen: 0, earned: {} }, character made, meetDue false, firstRunDone true`.
1. **Once at the threshold (3D):** open `six`, then `page.mouse.click(3, 300)` (rule 16). The sequence runs (`kid.phase` 'on'), then `__train.level.phase` passes 'in', 'out' and 'party'. `.level-banner` text is `Level one complete!`; `.level-stars[data-count="1"]`; `__train.specials` includes `caboose`; a `checkpoint` note is in `__audioNotes()`. Wait for `!__train.running` (20 s, rule 15); then at most 2 frames in 3 s and no endless animations. localStorage `levels.seen === 1` and `earned.L1` is a string.
2. **No replay on the next visit:** `page.reload()` (the seed flag keeps the stored state). Over 5 s `__train.level.id === null` and no `.level-banner` appears; the star board still shows 1; the caboose is still on the train.
3. **Not before the threshold:** lessons 1..5 done, `levels.seen: 0`: no celebration and `count 0`. The first look: lessons 1..6 done **without** `levels`: no celebration, and `seen` is recorded as 1.
4. **Reduced motion:** `six` with `reducedMotion: 'reduce'`: the banner shows, `phase` never becomes 'in', a `star` note plays, and at most 2 frames in 3 s after the banner.
5. **2D:** `six` with `trainWorld: false`: after the 2D ride the `.level-banner .car-icon` and the star board count 1 show; the banner is gone after 5 s.
6. **Replay from Grownups:** state after test 1 (seen 1). Open `#/grownups` the way `test/smoke.mjs` reaches it (copy its gate handling). Open the "Levels" fold, tap `.level-replay[data-level="L1"]`: Home plays the celebration (phase 'party' is seen), and afterwards `levels.seen` is still 1.
7. **Store:** in `test/store.mjs`, bad `levels` values load as fresh, and `resetAll` clears levels.
Also run `node test/train.mjs` (heat, sequence and home checks must stay green with the extra cars) and `node test/map.mjs` (2D).

### Done when
- Finishing lesson 6 plays the level one celebration once, after the station-complete sequence: in 3D (tunnel, dance, banner, confetti, the caboose joins, a gold star), with reduced motion, and in 2D. It does not replay on the next visit, it can be replayed from Grownups, and the Home draws 0 idle frames afterwards.
- `levels` in curriculum.json lists 5 levels (2 built). The suites pass, then the full `npm test` once (rule 5). The version is 1.9.4; there is a README bullet naming the milestone reasons and the research above.

Commit message: `Levels: a tunnel celebration, a special car and a gold star at each milestone (level one at six sounds, two at thirteen) (1.9.4)`
