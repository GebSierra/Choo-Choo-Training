# Choo Choo Training: plan for v1.8.0 to v1.8.3

The planner (Opus) wrote this plan for the builder (Sonnet). Read the whole file once, then do one phase at a time, in order.
Each phase can ship on its own: after any phase the app works and the tests named in that phase pass. If the usage limit
is near, stop after a phase. The next session starts at the next phase.

| Phase | What | Version |
|---|---|---|
| A | Rename the app to "Choo Choo Training" | 1.8.0 |
| B | New sound order m a s i t p n f d h g b l: a one-time progress reset, all lessons rebuilt, and a content proof | 1.8.1 |
| C | Storybook look: Story 1 rebuilt as a real picture book (cover, paper, page turns, spread) | 1.8.2 |
| D | Character creator: the child's figure on the platform, the finish screens and in the books | 1.8.3 |

The order is the owner's, with Story 2 deferred. There is no hard dependency that forces a different order. D comes after C
because D puts the figure into the new book cover and pages.

The owner's final decisions are recorded here and are not open questions: the new name, the progress reset, Smooth Ride
unchanged, Story 2 deferred, idle CSS animation allowed on storybook pages (with the limits in rule 12), and music deferred.

---

## 0. Execution rules for Sonnet (read first, follow in every phase)

1. **Start state.** Before Phase A, run `git -C /home/user/kddash pull -q origin main`, `git -C /home/user/kddash status --short` and `git -C /home/user/kddash log -1 --oneline`. The only file allowed to be uncommitted is `docs/PLAN-v1.8.md` (this plan); commit it with Phase A. If anything else is uncommitted, stop and tell the owner. Do not commit someone else's work, and do not build on top of it.
2. **Playwright.** It is installed globally at `/opt/node22/lib/node_modules`, and Chromium is at `/opt/pw-browsers/chromium`. `test/lib.mjs` already finds both. Never run `npx playwright install` or `npm install`.
3. **Versions.** `CACHE_VERSION` in `sw.js` must equal `'reading-v' + APP_VERSION`, where `APP_VERSION` is in `js/version.js`. In each phase, bump both of these and `"version"` in `package.json` once, to the version in the table above. Keep the `reading-v` cache prefix and the localStorage key `reading.v1`, even though the app is renamed. Renaming either one would orphan old caches or lose saved data.
4. **Precache.** Every new file the app loads goes into `APP_FILES` in `sw.js`. That includes fonts, JSON under `data/books/` and new JS modules. Debug-only screens are the only exception.
5. **Long suites.** Run any Playwright suite in the background, writing to a log, then wait on the log. Example: `node test/book.mjs > _test/book.log 2>&1; echo EXIT $? >> _test/book.log` with `run_in_background`, then use Monitor or poll with `tail -3 _test/book.log` until `EXIT` shows. Never run two browser suites at once. The full `npm test` takes about 40 minutes. Run it **once**, in the background, at the end of the last phase you finish in a session, before that phase's push. Otherwise run only the suites the phase names.
6. **Store in tests.** The store reads localStorage once and then keeps state in memory. A test that rewrites `localStorage` must call `page.reload()` before it checks the result. Use the existing `seedState` pattern, which seeds through `addInitScript` plus a `sessionStorage` flag.
7. **Welcome card.** On first run the welcome card covers the app. Tests skip it with `.wc-skip`, or seed `firstRunDone: true`. From Phase D on, the character creator follows the welcome card; tests close it with `.meet-later`.
8. **Frame time.** In every requestAnimationFrame callback you add, use `dt = Math.max(0, (t - last) / 1000)`. A frame timestamp can come slightly before the previous one, which would give a negative dt.
9. **Do not change** the YouTube links in `data/curriculum.json` (`playlistUrl` and `alphabetSongUrl`), the jingle cut-off in `js/sfx.js`, or anything about Smooth Ride except what Phase B says (Smooth Ride needs no code or data change at all).
10. **Commit and push to `main` after each phase.** Use the commit message given in the phase. Every commit message ends with these two lines:
    ```
    Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
    Claude-Session: https://claude.ai/code/session_01Snz7WaaKpAYXCzF6JbUKmc
    ```
11. **Letter sounds and names.** The app never speaks letter sounds or letter names. Parent text writes sounds as `mmm` (held) or `d-` (clipped), using the helpers in `js/scripts.js` (`soundText`, `slowSounds`, `firstSoundOut`). Never write a sound out by hand in code.
12. **Heat (updated by the owner for v1.8).**
    - The v1.6.0 measurements showed that the main heat cost was a three.js render loop running at about 24 fps while idle.
    - The rule now: no JavaScript requestAnimationFrame loop, no repeating timer, and no canvas or WebGL redraw while a screen sits still. JavaScript runs only during a page turn, a drag, a tap reaction or an arrival.
    - Small idle animations are allowed on storybook pages. Each must be a CSS animation of `transform` or `opacity` only (never layout, `box-shadow`, `filter` or blur). There may be at most 6 running at once on a page, and they pause when the tab is hidden and are switched off under reduced motion.
    - The 3D Home keeps its rule (`heatChecks` in `test/train.mjs`: at most 2 frames in 3 s of idle, and no endless animation). It must stay green.
13. **Docs.** There is no CLAUDE.md. README.md is the project doc, and `docs/TRAIN-WORLD.md` is the train spec. In each phase, add one short "Decisions" bullet to the README for what changed. Do not write other doc files. `docs/PLAN-v1.7.md` and the other older plans are a historical record: do not edit them.
14. **Pronouns.** UI text and docs say "your child" or "the child". Books use the character's name (or "Pip's friend"), never he or she, for the friend.

### Things in the repo that differ from the requests (decisions already made)
- The finish screens do not show the app name today, so the rename has nothing to replace there. No name is added: the child-facing screens stay light on words.
- PLAN-v1.7 Phase E gave lesson 5 (t) a letter Quick Check. `check-content` requires even lessons to use a letter check and odd lessons a picture check. The table in Phase B fixes the parity for every lesson.
- Smooth Ride (`r1`, after lesson 4) needs no change. `rideWords()` keeps only the words that use taught sounds. Under the new order (m a s i by lesson 4) that is `am, ma, sam, sis, miss`, exactly its 5 rounds. The words `at, sat, mat, sit` drop out by themselves.
- Book 1 moves from after lesson 8 to after lesson 4, with no code change: gen writes `after` from `needs`.
- The 3D Pip and every figure on the Home keep the v1.6 rule: nothing moves while idle there.

---

## Phase A: rename to "Choo Choo Training" (v1.8.0)

### Decisions
- Full name: "Choo Choo Training". Home-screen label (`short_name` and `apple-mobile-web-app-title`): "Choo Choo". Launchers cut labels off at about 12 characters, and "Choo Choo Training" is 18.
- The welcome card's first page title becomes "Welcome to Choo Choo Training". Its body is unchanged.
- Pip stays the mascot. `package.json` `"name"` (`kddash-reading`), the cache prefix and the storage key stay as they are (rule 3).

### Exact changes
1. `manifest.webmanifest`: `"name": "Choo Choo Training"`, `"short_name": "Choo Choo"`.
2. `index.html`: `<title>Choo Choo Training</title>` and `<meta name="apple-mobile-web-app-title" content="Choo Choo">`.
3. `js/guide.js`: change `WELCOME[0].title` to `'Welcome to Choo Choo Training'`.
4. `js/screens/grownups.js` line about 139: `` `Choo Choo Training version ${APP_VERSION}` ``.
5. `README.md`:
   - Change the title to `# Choo Choo Training (KDDash)`.
   - Add a Decisions bullet: "v1.8.0: renamed to Choo Choo Training (home-screen label "Choo Choo"); Pip stays the mascot; the cache prefix and storage key are unchanged."
   - Do not rewrite the older Decisions bullets: they record history.
6. `docs/TRAIN-WORLD.md` line 43: append " Renamed to Choo Choo Training in v1.8.0."
7. `docs/NEXT.md`: mark item 3 done ("done in v1.8.0"). Mark item 1 "kept as is" and item 2 "planned in PLAN-v1.8 Phase C".
8. Tests:
   - `test/sack.mjs` lines 97 to 111: the title is `Choo Choo Training`, the manifest name and short name are `Choo Choo Training` / `Choo Choo`, and Grownups shows `Choo Choo Training version`.
   - `test/smoke.mjs` line 580: `man.name === "Choo Choo Training"`.
   - `test/guide.mjs` line 25: `'Welcome to Choo Choo Training'`.
9. Check that no old name is left: `grep -rn "Reading Train\|Pip's Train" --exclude-dir=.git --exclude-dir=_test --exclude=PLAN-v1.7.md .` must print only README Decisions history lines.

### Suites
`node test/sack.mjs`, `node test/guide.mjs`.

### Commit
`Rename to Choo Choo Training` plus attribution. This commit also adds `docs/PLAN-v1.8.md`.

### Done when
- [ ] The manifest, title, welcome card, Grownups, README and tests say Choo Choo Training
- [ ] The grep in step 9 is clean
- [ ] Suites green, version 1.8.0, commit and push

---

## Phase B: new sound order, one-time reset, content proof (v1.8.1)

### Decisions
- **Order:** m a s i t p n f d h g b l.
  - Lessons 1 to 3 (m a s) do not change.
  - `tools/gen-lessons.mjs` rebuilds lessons 4 to 13 from its `TABLE`, so no lesson is edited by hand.
  - Each letter keeps its `say`, `how`, `tiles`, `start`, `practice`, `compounds`, `hunt` and `asIn` fields. Only the fields in the table below change.
- **Checkpoints:**
  - Gen writes each book's `after` from `needs`.
  - Smooth Ride `r1` keeps `after: 4`. Story 1 `b1` becomes `after: 4`.
  - The array order stays `[r1, b1]`, so Smooth Ride comes just before Story 1 on the line.
  - Story 2 is deferred (see "Later").
- **One-time progress reset (the owner approved it).**
  - The store gets a field `order` with the value `'masitpnfdhgbl'`. When a saved state has no `order` field, or a different one, its lesson progress is cleared once.
  - Cleared: `lessons`, `checkpoints`, `settings.trainAt` (so the train starts at the first stop), and every `settings.seenScripts` key that starts with `lesson:`. A first-time lesson script belongs to a lesson number, and those numbers now teach different letters.
  - Kept: all other settings and seen flags (task types, tips, `book`, `ride`), `character`, `firstRunDone`, `trainIntroDone`.
  - The parent sees the normal start: Home with lesson 1 glowing. There is no message.
  - **Real installs only.** The reset runs only when the saved state also has a string `lastOpened`. `app.js` calls `store.touch()` on every open, so every real install has one. Test seeds never set it, so the dozen existing seeds keep their progress and no test needs editing.
  - The migrated state is saved at once, so the reset cannot repeat.
- **Content proof.** check-content gains one explicit pass that collects every word the child reads and checks each one against the sounds taught by then:
  - Lesson Saying Sounds letter words.
  - Quick Check letter options.
  - Every book's `child`, `slider` and review `words`.
  - Smooth Ride's chosen words.
  - It allows only the sight words `is`, `I` and `It` (compared in lowercase). The character name is never in child-read text (an existing check already bans `{name}` there).
  - On success it prints the count.
  - It also asserts the order, and that no page which names `{name}` uses he, she, him, his, her or hers.

### Exact changes
1. `tools/gen-lessons.mjs`:
   - Update the header comment to say "lessons 4 to 13 (i t p n f d h g b l)".
   - Reorder the `TABLE` rows to i, t, p, n, f, d, h, g, b, l, with `n` from 4 to 13. Change only these fields:

   | n | k | words | pic | qc |
   |---|---|---|---|---|
   | 4 | i | `['sis', 'miss', 'am']` | igloo | `{ kind: 'letter', others: ['m', 's'] }` |
   | 5 | t | `['at', 'sit', 'mat']` | table | `{ kind: 'picture', word: 'table', others: ['wagon', 'camel'] }` |
   | 6 | p | `['pat', 'tip', 'map']` | pig | `{ kind: 'letter', others: ['s', 't'] }` |
   | 7 | n | `['man', 'pin', 'tan']` | nut | `{ kind: 'picture', word: 'nut', others: ['window', 'chair'] }` |
   | 8 | f | `['fan', 'fit', 'fin']` | fish | `{ kind: 'letter', others: ['m', 'a'] }` (t, i and l look like f) |
   | 9 | d | `['dad', 'sad', 'dip']` | duck | `{ kind: 'picture', word: 'duck', others: ['robot', 'yarn'] }` |
   | 10 | h | `['hat', 'him', 'hid']` | hippo | `{ kind: 'letter', others: ['m', 's'] }` |
   | 11 | g | `['tag', 'dig', 'pig']` | goat | `{ kind: 'picture', word: 'goat', others: ['rabbit', 'van'] }` |
   | 12 | b | `['bat', 'bad', 'big']` | ball | `{ kind: 'letter', others: ['m', 't'] }` |
   | 13 | l | `['lap', 'lip', 'lid']` | leaf | `{ kind: 'picture', word: 'leaf', others: ['umbrella', 'van'] }` |

   - After the lessons loop, before `writeFileSync`, add:
     ```js
     // Each stop that needs sounds sits after the first lesson by which all of them are taught.
     const taughtAt = (s) => { const i = c.lessons.findIndex((L) => L.sound === s); if (i < 0) throw new Error('untaught sound ' + s); return i + 1; };
     for (const k of c.checkpoints) if (Array.isArray(k.needs)) k.after = Math.max(...k.needs.map(taughtAt));
     ```
   - Run `node tools/gen-lessons.mjs`. Check that `git diff data/curriculum.json` shows `b1` `"after": 4` and `r1` unchanged. Gen also rewrites the picture list in `sw.js`; keep that change.
2. New `js/order.js` (no DOM; the store and check-content can both import it): `export const ORDER = 'masitpnfdhgbl'; // the sound order of the lessons; a saved state with another order is reset once (js/store.js)`. Add it to `APP_FILES`.
3. `js/store.js`:
   - `import { ORDER } from './order.js';`
   - `fresh()` gains `order: ORDER`.
   - In `load()`, after `p` is parsed and validated:
     ```js
     // v1.8.1 changed the sound order: a real install (it has been opened, so it has lastOpened) saved under another order starts its lessons again once. Settings, seen task scripts, the name and the welcome stay.
     const reorder = p.order !== ORDER && typeof p.lastOpened === 'string';
     ```
     When `reorder` is true:
     - `lessons = {}` and `checkpoints = {}`.
     - `settings` drops `trainAt`.
     - `settings.seenScripts` drops the keys matching `/^lesson:/`.
     - Set a closure flag `migrated = true`.
   - Return `{ ...f, ...p, order: ORDER, lessons, checkpoints, ... }`.
   - In `createStore`: `let migrated = false; let state = load(); if (migrated) save();`.
   - `resetAll` keeps `order` (it comes from `fresh()`).
4. New `test/store.mjs`: a fast Node test with no browser. Add it to `package.json` "test" right after `check-content.mjs`.
   - Stub `globalThis.localStorage` with a Map-backed `{ getItem, setItem, removeItem }`, then `import { createStore } from '../js/store.js'`.
   - Case 1, an old real install: `{ schema: 1, lastOpened: '2026-09-01T00:00:00Z', lessons: {1..6 got-it}, checkpoints: { r1: { result: 'got-it' } }, settings: { rate: 1.0, trainAt: 5, trainIntroDone: true, seenScripts: { 'lesson:4': true, newLetter: true, 'tip:1:newLetter': true } }, character: { name: 'Lily' }, firstRunDone: true }`. Expect:
     - `lessons` and `checkpoints` are empty.
     - `rate` is 1 and `trainIntroDone` is true; `trainAt` is undefined.
     - `seenScripts` has `newLetter` and `tip:1:newLetter` but not `lesson:4`.
     - The name is Lily, `firstRunDone` is true, and `currentLesson(13) === 1`.
     - The stored JSON already has `order === 'masitpnfdhgbl'`.
   - Case 2: the same state with `order: 'masitpnfdhgbl'` keeps its lessons.
   - Case 3: the same state with no `lastOpened` (a test seed) keeps its lessons.
   - Case 4: `resetAll()` keeps `order`.
   - Print `store: n/n checks passed` and exit 1 on failure, like the other tests.
5. `test/check-content.mjs`:
   - `import { ORDER } from '../js/order.js';`. Add `if ((c.lessons || []).map((L) => L.sound).join('') !== ORDER) err('lessons must teach m a s i t p n f d h g b l in order (js/order.js)')`.
   - Export a new `childReadProof(c, root)` and call it from `checkCurriculum` (or from main, next to it). It builds a list of `{ where, word, after }`:
     - Each lesson's `sayingSounds` with `showLetters`; `after = L.number`.
     - Each lesson's `quickCheck` letter options (`o.glyph`); `after = L.number`.
     - For each book stop: every space-separated token of `child`, `slider` and review `words`, with punctuation stripped; `after = k.after`.
     - For each ride stop: `rideWords(c, k)`; `after = k.after`.
     - For each entry: lowercase the word, then pass it if it is in `SIGHT = ['is', 'i', 'it']` or if every letter is among the sounds of lessons 1 to `after`. Otherwise `err(`proof: ${where} "${word}" is not readable by lesson ${after}`)`.
     - Also check that every book's `sight` list, lowercased, is a subset of `SIGHT`.
     - Then for every book page whose `read` or `after` contains `{name}`, check that it does not match `/\b(he|she|him|his|her|hers)\b/i`. Message: "use the name, not he or she".
     - Return the count. The CLI success line becomes `check-content: OK (... , N child-read words proven readable)`.
6. Docs:
   - README: replace the sentence "Lessons 4 to 13 are t f d g i n p h b l in Mentava's order" (line about 299) with "Lessons 4 to 13 are i t p n f d h g b l (the v1.8.1 order m a s i t p n f d h g b l)". Fix any other lesson table or list that `grep -n "t f d g" README.md` finds.
   - Add a Decisions bullet: the new order; the one-time reset and its `lastOpened` rule; Story 1 and Smooth Ride after lesson 4; the proof.
   - `test/round3.mjs` line 1 comment: "(lessons 4 to 13: i t p n f d h g b l)".
   - `docs/NEXT.md` item 5: the order is done.
7. `sw.js`: add `'js/order.js'`.

### Suites
- `node tools/gen-lessons.mjs`, then `node test/check-content.mjs` and `node test/store.mjs`.
- Then, one at a time in the background: `node test/round3.mjs`, `node test/newletter.mjs`, `node test/book.mjs`, `node test/ride.mjs`, `node test/map.mjs`, `node test/games.mjs`.

### Commit
`New sound order m a s i t p n f d h g b l; one-time lesson reset; child-read content proof` plus attribution.

### Done when
- [ ] The order is asserted; the proof passes and prints its count
- [ ] r1 and b1 are after lesson 4 (r1 first)
- [ ] An old real install starts at lesson 1 and keeps its settings and name; test seeds keep their progress
- [ ] Suites green, version 1.8.1, commit and push

---

## Phase C: the storybook (v1.8.2), with Story 1 rebuilt in it

### Decisions
- **Technique: CSS 3D transforms on DOM pages, not canvas.**
  - Every page holds live, interactive DOM: the child's words, the slide band, the train drag track, the tap buttons and the review tiles.
  - A canvas would have to rasterise that DOM (the web platform has no API for it) and rebuild every interactive part, and it redraws every frame.
  - With CSS 3D:
    - The page that turns is a "leaf" element that holds static clones of the pages. It rotates around the spine with `rotateY` under `perspective`.
    - The shading is a gradient layer whose opacity follows the angle, and the leaf is clipped by its own box.
    - Every turn animation is WAAPI on `transform` and `opacity`, which runs on the compositor.
    - JavaScript runs only to set up a turn and, during a finger drag, to set the angle once per pointer move. Nothing runs while the book is still.
  - It is a rigid page flip with curl shading, not a mesh curl. The owner allowed "a page curl or flip".
- **Typeface: Andika** (SIL, OFL-1.1), self-hosted and precached, at 400 and 700, about 38 KB.
  - Andika was designed for beginning readers. Its single-storey a and g match the app's own glyphs.
  - It is used only inside the book (the parent text, the cover title and the page numbers). The child's words stay drawn with `wordSvg`, as now.
  - The font is fetched once at build time from the npm registry, which is reachable directly. At run time it comes from the service worker cache only.
  - Fallback if the download fails: Nunito (already precached) at the same sizes, and say so in the commit message.
- **Book flow:**
  - The stop opens on a closed cover: red cloth, the title with the name, Pip waving, and "Tap to open".
  - A tap on the cover, or a swipe left on it, opens it: the cover swings open around the spine.
  - At the end, the shell's "Finish" closes the book (the cover swings shut over the pages), then the existing two-tap parent finish screen shows. Its "Yes" returns to the line.
  - The finish screen stays because it is how every stop records progress and how the parent confirms it. "Close the book and return to the line" is the cover closing, then that finish screen, then the line.
- **Turning:**
  - Swipe left or right (both directions), drag the page with a finger, tap the bottom corners (`.book-corner`), or use the existing "Next page" and "Back" buttons. On a keyboard, ArrowRight and ArrowLeft also turn the page.
  - A drag commits when it has turned the page more than 50° or flicks faster than 0.35 px/ms. Otherwise it springs back.
  - A swipe never starts on an interactive part (`button, input, .slide-band, .slide-track, .book-word[data-slider], .book-tile`). So the slider, the train drag, the taps and the review tiles keep working exactly as before.
- **Layout:**
  - Portrait (and any layout without room for a spread): one page at a time. The book edge shows as stacked page edges on the right, with the cloth board behind, and a gutter shadow on the spine side.
  - A two-page spread when the stage is at least 1.3 times as wide as it is tall, each page would be at least 300 px wide, and the stage is at least 260 px tall. (The landscape phone 915×412 gets a spread; the portrait phone does not.)
  - In a spread, the left page carries the parent text (and the Back button). The right page carries the picture, the child's word with its slider, the train track or the review tiles, and the "Next page" button. Text on the left and pictures on the right is the classic picture-book layout.
  - Re-checked by a ResizeObserver on the stage. When it changes, the current page re-renders without a turn.
- **Paper:**
  - Cream paper `#FBF3E2` with a static grain: a tiled SVG `feTurbulence` data-URI background at low opacity, rasterised once and never animated.
  - A gutter shadow gradient on the spine side, and a page number (`.book-folio`, the page index + 1, on the right page or on the single page).
  - The picture sits in a plate: a cream mat, a thin warm-ink frame and slightly rounded corners.
  - Warm ink `#3B2F2A` for the parent text. The parent text is no longer a card: it is printed on the paper in Andika, 19 to 22 px, line-height 1.45.
  - The child's word sits on a soft highlighter band (`#FFF1C2`), so it still reads as "the child reads this".
- **Idle life (rule 12), at most 6 running at once:**
  - A dog-ear hint on the next corner (a scale pulse every 4 s, infinite).
  - A gentle bob on the page's tappable item (translateY, 3.2 s, infinite).
  - One drifting puff of smoke over the funnel on train pages (opacity and transform, 3 s, infinite).
  - Pip and the friend blink (an infinite blink on the eyes only). Their other idle motions (breathe, look) are off in the book, and the pose animations (wave, cheer) stay finite.
  - All of these pause under `.book.is-paused` (set on `visibilitychange` while the tab is hidden) and are switched off under `prefers-reduced-motion`.
- **Reduced motion:**
  - A page change is a 220 ms cross-fade: the old page's clone fades out over the new live page. No leaf is made.
  - The cover fades instead of swinging.
- **Kept exactly:**
  - The child-reads words, the slider (`slideBlend`, `placeBand`, `startSweep`, `handCue`), tap-to-animate, the train-drag page, the sound-only page, the review page and the parent-only lines.
  - The shell (header, dots, script bar, Finish).
  - Silence: no text to speech, and the name is never sent.
  - The Book 1 data does not change.

### Getting the font (build time, once)
```sh
S=/tmp/claude-0/andika && mkdir -p $S && cd $S
curl -sS -o andika.tgz https://registry.npmjs.org/@fontsource/andika/-/andika-5.3.0.tgz
tar xzf andika.tgz package/LICENSE package/files/andika-latin-400-normal.woff2 package/files/andika-latin-700-normal.woff2
cp package/files/andika-latin-400-normal.woff2 package/files/andika-latin-700-normal.woff2 /home/user/kddash/assets/fonts/
cp package/LICENSE /home/user/kddash/assets/fonts/ANDIKA-OFL.txt
```
Expected sizes: 19208 and 19472 bytes. Add a README credit line: "Andika by SIL International, SIL Open Font License 1.1 (assets/fonts/ANDIKA-OFL.txt)".

### DOM structure (what `bookBuild` renders into `.book-stage`)
```
.book-stage[data-page][data-kind]              (existing; still the element tests read)
  .book[data-state=closed|opening|open|turning|closing][data-spread=0|1][tabindex=0]
    .book-block                                  (touch-action: none; the pointer handlers live here)
      .book-sheet.is-left.is-live                (spread only)
      .book-sheet.is-right.is-live               (always; in portrait it is the only page)
        ... page content, .book-folio
      .book-corner.prev (button, "Previous page", bottom-left; hidden on page 1)
      .book-corner.next (button, "Next page", bottom-right; hidden on the last page)
      .book-under (during a turn only: a static clone that covers a live page until the leaf lands)
      .book-leaf  (during a turn only)
        .leaf-face.leaf-front  (a clone)  > .leaf-shade
        .leaf-face.leaf-back   (a clone, or blank paper)  > .leaf-shade
      .book-cast  (during a turn only: the shadow the leaf casts on the page beneath)
    .book-cover (button, absolutely over .book-block, transform-origin: left center)
      .cover-front: .cover-title (Andika 700, cream on red cloth), .cover-pip (pipSvg wave), .cover-hint "Tap to open"
      .cover-back:  endpaper (a cream and red repeating pattern), rotateY(180deg), backface hidden
```
- Content per sheet:
  - Portrait: one live sheet, in this order: `.book-read`, then `.book-art`, `.book-drag` or `.book-tiles`, then `.book-child`, then `.book-nav` with both buttons, then the folio.
  - Spread: the left sheet gets `.book-read` and a `.book-nav` with Back. The right sheet gets the art, track or tiles, the child word, a `.book-nav` with "Next page", and the folio.
- The slide band is appended to the live right sheet (not the stage), and `placeBand(band, sheet, row)` measures against that sheet. The live sheets are never transformed, so the measurements are true even during a turn.

### CSS (add to `css/app.css`, replacing the `.book-*` block at lines about 863 to 907 where it overlaps)
```css
@font-face { font-family: 'Andika'; font-weight: 400; font-style: normal; font-display: swap; src: url(../assets/fonts/andika-latin-400-normal.woff2) format('woff2'); }
@font-face { font-family: 'Andika'; font-weight: 700; font-style: normal; font-display: swap; src: url(../assets/fonts/andika-latin-700-normal.woff2) format('woff2'); }
.book-stage { --paper: #FBF3E2; --paper-dark: #EFE2C6; --ink-warm: #3B2F2A; --cloth: #C8423F; --cloth-dark: #8E2B2A;
  --grain: url("data:image/svg+xml,...feTurbulence baseFrequency .9, numOctaves 2, a 160×160 rect at opacity .07..."); perspective: 1800px; padding: 10px 12px 12px; }
.book { position: relative; flex: 1; min-height: 0; display: flex; }
.book-block { position: relative; flex: 1; min-height: 0; display: grid; grid-template-columns: minmax(0, 1fr); margin: 0 9px 0 2px; touch-action: none; transform-style: preserve-3d; }
.book[data-spread="1"] .book-block { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
/* the cloth board behind the pages and the stacked page edges on the right: static, never animated */
.book-block::before { content: ''; position: absolute; inset: -5px -9px -5px -4px; border-radius: 8px 12px 12px 8px; background: var(--cloth-dark); box-shadow: 0 4px 10px rgba(60,30,20,.28); z-index: -1; }
.book-block::after { content: ''; position: absolute; top: 4px; bottom: 4px; right: -7px; width: 7px; border-radius: 0 5px 5px 0; background: repeating-linear-gradient(90deg, #FFF8EA 0 1px, #E3D2B0 1px 2px); }
.book-sheet { position: relative; min-height: 0; overflow: hidden; display: flex; flex-direction: column; gap: 10px; padding: 14px 16px 30px 22px;
  background-color: var(--paper); background-image: var(--grain), linear-gradient(90deg, rgba(70,45,20,.20), rgba(70,45,20,0) 26px);
  border-radius: 3px 8px 8px 3px; color: var(--ink-warm); font-family: 'Andika', 'Nunito', system-ui, sans-serif; }
.book-sheet.is-left { background-image: var(--grain), linear-gradient(270deg, rgba(70,45,20,.22), rgba(70,45,20,0) 30px); border-radius: 8px 3px 3px 8px; padding: 14px 22px 30px 16px; }
.book-folio { position: absolute; left: 0; right: 0; bottom: 6px; text-align: center; font-size: 14px; color: #9A8466; pointer-events: none; }
.book-read { background: none; box-shadow: none; padding: 0; font-size: clamp(19px, 4.8vw, 22px); line-height: 1.45; font-weight: 400; }
.book-title { font-weight: 700; color: #A8573F; }
.book-art { border-radius: 6px; border: 5px solid #FFF8EA; outline: 1.5px solid rgba(59,47,42,.55); }
.book-child { background: #FFF1C2; box-shadow: none; border-radius: 14px; }
.book-leaf { position: absolute; top: 0; bottom: 0; z-index: 10; transform-style: preserve-3d; will-change: transform; pointer-events: none; }
.book-leaf.hinge-left { transform-origin: left center; } .book-leaf.hinge-right { transform-origin: right center; }
.leaf-face { position: absolute; inset: 0; backface-visibility: hidden; -webkit-backface-visibility: hidden; overflow: hidden; }
.leaf-back { transform: rotateY(180deg); }
.leaf-shade { position: absolute; inset: 0; pointer-events: none; opacity: 0; background: linear-gradient(90deg, rgba(40,25,10,0) 40%, rgba(40,25,10,.28)); }
.book-under { position: absolute; top: 0; bottom: 0; z-index: 9; pointer-events: none; }
.book-cast { position: absolute; top: 0; bottom: 0; z-index: 9; pointer-events: none; opacity: 0; background: linear-gradient(90deg, rgba(40,25,10,.30), rgba(40,25,10,0) 45%); }
.book-cover { position: absolute; inset: -5px -9px -5px -4px; z-index: 20; border: 0; padding: 0; transform-origin: left center; transform-style: preserve-3d; background: none; cursor: pointer; }
.cover-front, .cover-back { position: absolute; inset: 0; border-radius: 8px 12px 12px 8px; backface-visibility: hidden; -webkit-backface-visibility: hidden; }
.cover-front { display: grid; place-items: center; align-content: center; gap: 14px; padding: 24px; color: #FFF3DA;
  background: var(--grain), repeating-linear-gradient(45deg, rgba(255,255,255,.04) 0 2px, rgba(0,0,0,.04) 2px 4px), linear-gradient(90deg, var(--cloth-dark) 0 14px, var(--cloth) 14px); }
.cover-title { font-family: 'Andika', 'Nunito', sans-serif; font-weight: 700; font-size: clamp(30px, 8vw, 44px); line-height: 1.15; text-align: center; }
.cover-back { transform: rotateY(180deg); background: repeating-linear-gradient(135deg, #F6E6C6 0 10px, #EAD3A8 10px 20px); }
.book-corner { position: absolute; bottom: 0; width: 56px; height: 56px; z-index: 6; border: 0; padding: 0; background: none; touch-action: manipulation; }
.book-corner.next { right: 0; } .book-corner.prev { left: 0; }
.book-corner.next::before { content: ''; position: absolute; right: 0; bottom: 0; width: 30px; height: 30px; border-radius: 0 0 8px 0;
  background: linear-gradient(315deg, transparent 50%, #F3E4C4 50%); transform-origin: 100% 100%; animation: book-corner 4s ease-in-out infinite; }
@keyframes book-corner { 0%, 78%, 100% { transform: scale(1); } 86% { transform: scale(1.4); } }
.book-sheet .book-tap { animation: book-bob 3.2s ease-in-out infinite; }
@keyframes book-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
.book-smoke { position: absolute; width: 22px; height: 22px; border-radius: 50%; background: #fff; opacity: 0; pointer-events: none; animation: book-smoke 3s ease-out infinite; }
@keyframes book-smoke { 0% { transform: translate(0, 0) scale(.5); opacity: 0; } 20% { opacity: .8; } 100% { transform: translate(-16px, -34px) scale(1.5); opacity: 0; } }
/* in the book, Pip and the friend only blink while idle */
.book-sheet .pip .pip-fig, .book-sheet .pip .pip-look { animation: none; }
.book-sheet .pip .pip-eyes { animation: pip-blink 4.7s ease-in-out infinite; }
.book.is-paused, .book.is-paused * { animation-play-state: paused !important; }
@media (prefers-reduced-motion: reduce) { .book, .book * { animation: none !important; transition: none !important; } }
```
- Keep the existing `.book-train`, `.book-pip`, `.book-emoji`, `.book-tile`, `.book-drag` and `.book-track` rules. Adapt the landscape `@media` block at line about 894: in a spread, each sheet is a flex column, so the old two-column grid rules for `.book-stage` go.
- `.book-art` keeps its sky-and-grass background.
- Size `--cap` so that the portrait and spread pages fit: portrait 78 px; spread 56 px, as in the current landscape rules.

### JS structure
1. New `js/components/page-turn.js` exports `pageTurner({ block, spread, reducedMotion })`, where `spread()` returns a boolean. It owns the leaf, the under layer and the cast shadow, and never renders pages itself. API:
   - `turn(dir, renderTarget)`: `dir` is `1` (forward) or `-1` (back). `renderTarget()` re-renders the live sheets to the target page (synchronously). Returns a Promise that resolves when the turn has finished and the clones are removed.
   - `drag(dir, renderTarget)`: returns `{ move(k), release(commit) }`. `k` runs from 0 to 1. `release` returns a Promise; on cancel it calls the `renderBack()` passed as `release(false, renderBack)`.
   - `finish()`: jumps a running turn to its end (`anim.finish()` on its animations). It is used when a new turn is asked for mid-turn, on resize and on cleanup.
   - `busy`: getter.
   - `cleanup()`.

   The algorithm, shared by `turn` and `drag`:
   ```
   snap(el)   = clone = el.cloneNode(true); clone.classList.remove('is-live'); clone.classList.add('leaf-face' or 'book-under');
                clone.inert = true; clone.setAttribute('aria-hidden', 'true'); return clone
                (ids are left alone: Pip's gradient ids in a clone resolve to identical definitions)
   const sp = spread(); const L = block.querySelector('.is-left.is-live'), R = block.querySelector('.is-right.is-live');
   oldR = snap(R); oldL = sp ? snap(L) : null;
   renderTarget();                                      // the live sheets now show the target page
   R2 = live right after render; newR = snap(R2); newL = sp ? snap(live left) : null;
   reducedMotion(): under = oldR (and oldL) laid over the live sheets, animate opacity 1 -> 0 over 220 ms, remove, done.
   forward (dir 1):  leaf over the right sheet, hinge-left; front = oldR; back = sp ? newL : blankPaper(); under = sp ? oldL over the left sheet : none
                     angles 0 -> -180
   back, spread:     leaf over the left sheet, hinge-right; front = oldL; back = newR; under = oldR over the right sheet; angles 0 -> 180
   back, portrait:   leaf over the sheet, hinge-left; front = newR; back = blankPaper(); under = oldR over the sheet; angles -180 -> 0
   place leaf/under/cast with left/width taken from the sheet's offsetLeft/offsetWidth (the block is not transformed)
   animation: leaf.animate([{ transform: `rotateY(${a0}deg)` }, { transform: `rotateY(${mid}deg) translateZ(1px)`, offset: .5 }, { transform: `rotateY(${a1}deg)` }],
              { duration: sp ? 760 : 650, easing: 'cubic-bezier(.45,.05,.35,1)', fill: 'forwards' })
              front .leaf-shade opacity [0, .55, 0] for the lift; back .leaf-shade opacity [.55, 0]; .book-cast opacity [0, .6, 0] over the page beneath
   on finish: remove the leaf, under and cast; book.dataset.state = 'open'
   ```
   - Drag:
     - `move(k)` stores `k` and asks for one `requestAnimationFrame` (only if none is pending). In that frame it sets `leaf.style.transform = rotateY(a0 + (a1 - a0) * k)`, and the shade and cast opacity in proportion.
     - `release(true)` animates from the current angle to `a1` with `duration = remaining fraction × full duration` (minimum 120 ms).
     - `release(false)` animates back to `a0`, then calls `renderBack()` (the original page re-renders live under the leaf), then removes the clones.
     - No frame is asked for unless a pointer moved.
2. `js/screens/book.js`:
   - Keep `loadBook`, `TAP_ANIMS`, `scene`, `child`, `tapAnim` and `mountSlider`. Change `mountSlider` so that its `host` is the live right sheet.
   - `render(n)` is split in two:
     - `paint(n)`: tears down the old page (`teardown()` as now), builds the content, fills the live sheet or sheets for the current `spread` (see DOM structure), sets `stage.dataset.page` and `dataset.kind`, `setProgress(n)`, calls `setDone(true)` on the review page, calls `refresh()`, and shows or hides the corners.
     - `start()`: runs after the turn (or at once with no turn). It mounts the slider and starts its sweep and hand cue, and adds the `.book-smoke` span on train pages, positioned with percentages from `FUNNEL_TOP` inside `.book-train`. Measurement happens once here, never in a loop.
   - `go(n, how)`: if `n` is out of range, or the book is not `open`, return. If `turner.busy`, call `turner.finish()` first. Set `book.dataset.state = 'turning'`, then `await turner.turn(Math.sign(n - i), () => paint(n))`, then `start()` and set `book.dataset.state = 'open'`.
   - The buttons `.book-next` and `.book-back`, the corners and ArrowRight/ArrowLeft on `.book` call `go(i ± 1)`.
   - Pointer on `.book-block`:
     - `pointerdown` (primary pointer only, not on `INTERACTIVE`, not while `state !== 'open'`) records the start.
     - `pointermove`: once `|dx| > 12` and `|dx| > 1.4 |dy|`, it starts `turner.drag(dx < 0 ? 1 : -1, () => paint(target))`, as long as the target exists (otherwise it ignores the move). Then `k = clamp(|dx| / sheetWidth, 0, 1)`.
     - `pointerup`/`pointercancel`: commit if `k > 50/180` or the velocity exceeds 0.35 px/ms in the turn's direction. Then `start()`. On cancel, call `paint(i)` again and `start()`.
     - Use pointer capture on the block.
   - Cover:
     - `book.dataset.state = 'closed'` at build. Page 1 is painted under the cover (and `start()` is deferred until the cover is open).
     - A tap on `.book-cover`, or a leftward swipe of more than 40 px that starts on it, calls `openCover()`: `cover.animate([{ transform: 'rotateY(0)' }, { transform: 'rotateY(-180deg)' }], { duration: 800, easing: 'cubic-bezier(.4,.1,.3,1)', fill: 'forwards' })`, then `cover.hidden = true`, `state = 'open'` and `start()`.
     - Under reduced motion it is a 200 ms opacity fade.
     - The cover's aria-label is `Open the book: ${book.title}`.
   - `close()` returns a Promise: it sets `cover.hidden = false` and `state = 'closing'`, then animates `rotateY(-180deg) -> rotateY(0)` over 700 ms (a fade under reduced motion).
   - Spread: a `ResizeObserver` on the stage computes `spread`. When the value changes: `turner.finish()`, set `book.dataset.spread`, `paint(i)`, `start()`.
   - Visibility: `document.addEventListener('visibilitychange', onVis)` toggles `.book.is-paused` from `document.hidden`. Remove the listener in cleanup.
   - Pip in the book: `pipSvg({ pose, still: false })`, so the blink runs; the CSS above turns the rest off. `engineSvg` stays `still: true`.
   - Return the same object as now, plus `close`. `again()` = `setDone(false); go to page 0 with no animation (paint(0); start())`. `cleanup` = teardown + `turner.cleanup()` + `ro.disconnect()` + remove the listeners.
3. `js/screens/checkpoint.js`, book branch:
   - Before building, wait for the font, bounded: `await Promise.race([document.fonts.load('700 20px Andika'), new Promise((r) => setTimeout(r, 600))]).catch(() => {})`.
   - `const done = () => current.close().then(() => router.go(`/checkpoint/${ck.id}/finish`))` for books only.
4. `sw.js`: add `'js/components/page-turn.js'`, `'assets/fonts/andika-latin-400-normal.woff2'` and `'assets/fonts/andika-latin-700-normal.woff2'`.
5. README: add a Decisions bullet (technique and why, Andika, spread rule, idle rules, the end flow). Add the font credit line.

### Tests: `test/book.mjs` (rewrite the walk; keep its structure and exports)
- Add these init scripts:
  - A timer counter: `window.__timerCalls = 0;` wrapping `setTimeout` and `setInterval` (each call adds one).
  - The existing `RAF_COUNTER`.
- Opening:
  - `.book[data-state="closed"]` and `.book-cover` are visible, and the cover title is `Pip Meets Lily`.
  - Click `.book-cover`. `.book[data-state="open"]` appears within 1.5 s, and the cover is hidden.
- `next()` helper: click `.book-next`, then `waitForFunction` for `data-page === n + 1` and no `.book-leaf` in the document.
- During one forward turn (page 1 to 2): 150 ms after the click, `.book-leaf` exists and its computed `transform` is not `none`. After it, `.book-leaf` and `.book-under` are gone, and `.book-read` appears exactly once.
- Swipe: on page 2, `touchDrag` from 85% to 15% of the live sheet's width, at the height of `.book-read`. The page becomes 3. A swipe the other way goes back to 2. A short drag (10% of the width, slow) springs back: the page stays the same and no leaf is left after 1 s.
- Corner: `.book-corner.next` turns forward; `.book-corner.prev` turns back.
- Keep every existing per-page check: letters drawn, slider lights, the page-1 tap toots with a puff, the drag track completes, the sound page shows only the picture, review tiles light, Finish.
- Paper:
  - `getComputedStyle(.book-read).fontFamily` starts with `Andika`, and `document.fonts.check('20px Andika')` is true.
  - `.book-folio` text equals the page number.
  - `getComputedStyle(.book-block, '::after').width === '7px'` (the book edge).
  - Portrait: `data-spread="0"` and one live sheet.
- Idle (heat), on page 1 after the cover opens and on page 3 (slider), each after 1 s of settle:
  - Reset the counters, then wait 3 s.
  - `__raf` delta must be 0, and `__timerCalls` delta must be 0.
  - `document.getAnimations().filter((a) => a.playState === 'running')` has at most 6 entries. The keyframe properties of every one of them are only `transform` and `opacity`, with no `filter` and no `box-shadow` (copy the property extraction from `test/map.mjs` line 82).
- Hidden: `Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange'))` makes `.book` get `is-paused`. Undo it the same way.
- End: on the review page, click `.task-buttons .next` (Finish). `.book[data-state="closing"]` appears, then the URL ends with `/finish` and the finish heading checks follow as now.
- Silence and privacy checks stay.
- Landscape (`VIEWPORTS[1]`, 915×412):
  - `data-spread="1"`, two live sheets, `.book-read` in the left sheet and `.book-art` in the right one.
  - On every page, each live sheet has `scrollHeight <= clientHeight + 1`.
  - A forward turn shows a `.book-leaf.hinge-left` over the right half.
- Reduced motion (a new context with `reducedMotion: 'reduce'`): clicking `.book-next` never creates `.book-leaf` (poll for 400 ms) and the page changes. The cover opens with no rotate (the `.book-cover` animations contain no `rotateY`). `document.getAnimations()` has no running infinite animation.
- `test/sack.mjs` (`sackMapChecks`, `SCREEN.book`): after opening the book stop, it still waits for `.book-stage`; that element is there under the cover. No change is needed unless it clicks into the page; if it does, click `.book-cover` first.

### Suites
`node test/check-content.mjs`, then in the background `node test/book.mjs`, then `node test/sack.mjs`.
Take screenshots with `shot` in book.mjs (portrait cover, page 1, mid-turn, landscape spread). Look at them before committing: the paper, the edge, the gutter and the frame must read as a book.

### Commit
`Storybook: Story 1 as a real picture book (cover, paper, page turns, spread)` plus attribution.

### Done when
- [ ] The cover opens; pages turn by swipe both ways, by drag, by corner and by button; the spread works in landscape
- [ ] Every interactive part of Story 1 still works; the book is silent
- [ ] Idle: 0 rAF calls, 0 timer calls, at most 6 running CSS animations (transform/opacity only); paused when hidden; a cross-fade under reduced motion
- [ ] Finish closes the book, then the finish screen, then the line
- [ ] Suites green, version 1.8.2, commit and push

---

## Phase D: character creator (v1.8.3)

### Decisions
- **Data**, on the device only, in `state.character`: `{ name, skin, hair, hairColor, made }`.
  - Five skin tones: `#F6D3B8 #E8B48F #C98E62 #8F5A36 #5C3A22`. Default index 2.
  - Five hair styles: `short`, `curly`, `puffs`, `ponytail`, `bun`. Default `short`.
  - Five hair colours: `#20160F #5A3A22 #9A6A3A #E0B866 #B5532E`. Default index 1.
  - `made` is true once the creator has been closed.
  - It is never sent anywhere and never passed to text to speech.
- **When the creator shows.** A top-level store flag `meetDue`.
  - `fresh()` sets it to true, so a new install shows the welcome card and then the creator, before the first lesson.
  - `load()` takes the saved boolean. If there is none, it is true only when the save has a string `lastOpened` (a real install from before v1.8.3), so the owner's device shows it once. Test seeds (no `lastOpened`) get false, and no existing test changes.
  - The creator is a card in the same `.first-run` overlay on Home (both the 3D and the 2D Home). It shows after the welcome card closes, or straight away when `firstRunDone && meetDue`.
  - "All aboard!" saves and closes. "Later" closes with the defaults.
  - Both set `made: true` and `meetDue: false`. Grownups can change everything later.
- **Who picks what.** The child taps the big swatches (skin, hair style, hair colour) and watches the live figure. The grown-up types the name. Heading: "Who is riding with Pip?". The name label reads "Name (the grown-up types it)".
- **Style.**
  - 2D SVG in the same flat style and 120×150 box as `pipSvg`: a sky-blue tee (`#4FB0E8`) with a yellow star (`#FFD166`), teal trousers (`#2F6F8F`) and white shoes.
  - No conductor cap: the cap is Pip's.
  - No gradients, so no ids. Clones in the page turner stay clean.
  - The 3D toy is built from spheres and capsules like `pip3d.js`.
- **Where it shows:**
  - (1) 3D Home: standing on the current stop's platform (at a book or ride stop, on the ground by the shed door), facing the track. The kid waves when the train arrives, together with Pip, and is still otherwise. No idle loop.
  - (2) 2D map: beside the current stone, waving once.
  - (3) Both finish screens, beside Pip.
  - (4) The books: on the cover beside Pip, and wherever `art.friend` is. This replaces the 🧒.
- **Names in books:**
  - `{name}` is replaced by the name, or by "Pip's friend" when none is set. This is unchanged.
  - The pronoun check from Phase B keeps he and she away from the friend.
  - The 2D figure's `aria-label` is the name, or "Pip's friend".

### Exact changes
1. New `js/character.js` (no DOM):
   ```js
   export const SKINS = ['#F6D3B8', '#E8B48F', '#C98E62', '#8F5A36', '#5C3A22'];
   export const HAIR_COLORS = ['#20160F', '#5A3A22', '#9A6A3A', '#E0B866', '#B5532E'];
   export const HAIR_STYLES = ['short', 'curly', 'puffs', 'ponytail', 'bun'];
   export const HAIR_NAMES = { short: 'Short hair', curly: 'Curly hair', puffs: 'Two puffs', ponytail: 'Ponytail', bun: 'Bun' };
   export const OUTFIT = { tee: '#4FB0E8', star: '#FFD166', trousers: '#2F6F8F', shoe: '#FFFFFF', sole: '#D9DDE8', band: '#E5484D' };
   const idx = (v, n, d) => (Number.isInteger(v) && v >= 0 && v < n ? v : d);
   export const cleanCharacter = (c) => ({
     name: typeof c?.name === 'string' ? c.name.replace(/[^\p{L} '\-]/gu, '').trim().slice(0, 16) : '',
     skin: idx(c?.skin, SKINS.length, 2), hair: HAIR_STYLES.includes(c?.hair) ? c.hair : 'short',
     hairColor: idx(c?.hairColor, HAIR_COLORS.length, 1), made: c?.made === true,
   });
   ```
2. `js/store.js`:
   - Import `cleanCharacter` from `./character.js` and delete the local one.
   - `fresh()`: `character: cleanCharacter({})` and `meetDue: true`.
   - `load()`: `meetDue: typeof p.meetDue === 'boolean' ? p.meetDue : typeof p.lastOpened === 'string'`.
   - New method `finishMeet(patch = {}) { state.character = cleanCharacter({ ...state.character, ...patch, made: true }); state.meetDue = false; save(); }`.
   - `resetAll` keeps `character` and `meetDue`, as now.
3. New `js/art/kid.js`: `kidSvg({ skin = 2, hair = 'short', hairColor = 1, pose = 'idle', still = false, label = null } = {})`.
   - Root: `svg.kid.pose-<pose>` (+ `still`), viewBox `0 0 120 150`. It is `aria-hidden` unless `label` is given; then it gets `role="img"` and `aria-label`.
   - Shade colour: `mix(hex, '#000', .14)` (a small local helper).
   - Layers, back to front:
     - `g.kid-hair-back`
     - legs: two rounded rects in the trousers colour, x 47 to 58 and 62 to 73, y 116 to 138
     - shoes: ellipses at (52,141) and (68,141), rx 9, ry 5, with the sole line
     - `g.kid-hop > g.kid-fig`: the tee body path (shoulders from x 38 to 82 at y 92, hem at y 120, rounded) and a star at (60,106) r 6
     - `g.kid-arm-l` and `g.kid-arm-r`: a tee sleeve and a skin hand circle r 6.5. Arms down at rest, like `ARMS.idle` in pip.js.
     - neck
     - head circle (60,58) r 30, with ears at (30,60) and (90,60) r 6
     - `g.kid-eyes`: ellipses at (49,60) and (71,60), rx 3.4, ry 4.2, `#2A1E1A`, with white glints
     - cheeks `#F28B82` at opacity .55, and a smile path
     - `g.kid-hair-front`
   - Hair, built from the hair colour (`HAIR_COLORS[hairColor]`) and its shade:
     - `short`: front = a cap from (29,60) over the crown to (91,60), with a three-point fringe dipping to y 44. Back: none.
     - `curly`: front = 9 circles r 8 to 10 on an arc of radius 30 around (60,58), angles 200° to 340°, plus 3 on top. Back = 4 circles down the sides to y 72.
     - `puffs`: front = a thin cap to y 42. Back = circles r 14 at (28,34) and (92,34), with bands.
     - `ponytail`: front = a cap with a side part. Back = a teardrop from (86,40) curving out to (102,88), with a band at (90,42).
     - `bun`: front = a cap. Back = a circle r 14 at (60,22), with a band.
   - Poses:
     - `idle`: arms down.
     - `wave`: right arm up, rotating about (80,96).
     - `cheer`: both arms up.
   - CSS reuses Pip's keyframes:
     ```css
     .kid .kid-eyes { transform-origin: 60px 60px; animation: pip-blink 4.7s ease-in-out 3; }
     .kid.pose-wave .kid-arm-r { transform-origin: 80px 96px; animation: pip-wave 3.2s ease-in-out 2; }
     .kid.pose-cheer .kid-hop { animation: pip-hop 760ms cubic-bezier(.3,.7,.4,1) 300ms backwards; }
     .kid.still, .kid.still * { animation: none !important; }
     .book-sheet .kid .kid-eyes { animation: pip-blink 4.7s ease-in-out infinite; }
     ```
4. New `js/train/kid3d.js`: `buildKid(bag, character)` returns `{ group, tick(t, still), wave(on, t) }`. The `group.name` is `'kid'`.
   - About 1.15 units tall, feet at y 0, facing +z.
   - Built with the same helpers as `buildPip`:
     - torso: a tee cylinder
     - legs: trouser capsules
     - shoes: white flattened spheres
     - arms: a group pivoting at the shoulder, with a sleeve capsule and a skin hand sphere
     - head: a skin sphere r 0.3, tilted back `-0.45` so the camera above sees the face, with eye spheres
   - Hair per style:
     - `short`: a scaled sphere cap.
     - `curly`: 10 small spheres.
     - `puffs`: a cap plus two spheres.
     - `ponytail`: a cap plus a capsule behind, angled down.
     - `bun`: a cap plus a sphere on top-back.
   - `tick` only moves the waving arm (`-2.5 + sin(w*9)*0.35`, as Pip does). There is no breathing and no blinking, because ticks run only during arrivals.
5. `js/train/stations.js`: export `kidSpot(node)`, which returns a local `{ x, y, z, ry }`.
   - Lesson stop: `{ x: OUT * 1.6, y: 0.4, z: 0.6, ry: -OUT * Math.PI / 2 + OUT * 0.5 }`: on the platform, facing the track, turned partly toward the camera.
   - Depot: `{ x: OUT * 1.0, y: 0, z: 0.9, ry: the same }`.
   - Tune both from a screenshot (`node tools/train-screenshots.mjs`). The kid must not hide the sign, the bench or Pip.
6. `js/screens/home3d.js`:
   - After `built` is made: `const kid = buildKid(bag, store.character()); const spot = kidSpot(stops[currentIndex]); kid.group.position.set(spot.x, spot.y, spot.z); kid.group.rotation.y = spot.ry; built[currentIndex].group.add(kid.group);`.
   - In `step`, where Pip waves at the end of the arrival: also `kid.wave(true, t)`. Where `waveUntil` ends: `kid.wave(false)`. Call `kid.tick(t, still)` next to `train.pip.tick`.
   - `debug.kid = { index: currentIndex, get waving() { return kid.waving; } }` (add a `waving` getter to `buildKid`).
   - Nothing else changes: the kid adds no frames.
7. `js/screens/home.js`, in `stone()` for `state === 'current'`: append `h('span', { class: 'stone-kid', 'aria-hidden': 'true' }, kidSvg({ ...store.character(), pose: 'wave' }))`.
   - Pass `store` in, or the character as an argument.
   - CSS: `.stone-kid { position: absolute; width: 58%; left: -52%; bottom: 8%; pointer-events: none; }`, mirrored to the right in landscape if it would leave the scene.
   - `test/map.mjs` must stay green, including the overlap and animation checks.
8. Finish screens: `finishView` takes `character`. Add `h('span', { class: 'finish-kid' }, kidSvg({ ...character, pose: 'cheer' }))` inside `.finish-glyph`, opposite `.finish-pip`, and pass `store.character()` from both screens. CSS: mirror `.finish-pip`'s rule to the other side.
9. Books (`js/screens/book.js`):
   - `art.friend` renders `kidSvg({ ...store.character(), pose: page.tap?.on === 'friend' ? 'idle' : 'wave', label: name })` in `.book-part.book-friend`. This replaces the 🧒.
   - The cover adds the kid beside Pip (`.cover-kid`).
10. New `js/components/character-picker.js`: `characterPicker({ store, mode: 'first' | 'grownups', onDone })` returns an element (`.cp`):
    - `h2` "Who is riding with Pip?" (first mode only). Then the preview `.cp-preview` (a large `kidSvg`, re-made on every change with pose `wave`).
    - The name input: `input.cp-name.gu-name`, maxlength 16, `autocomplete=off`, label "Name (the grown-up types it)".
    - Three rows, each a `role="group"` with a visible label ("Skin", "Hair", "Hair colour"):
      - `.cp-skin` has 5 round swatch buttons with `aria-pressed` and `aria-label` "Skin tone 1" to "Skin tone 5".
      - `.cp-hair` has 5 buttons, each with a small still `kidSvg` head and the `aria-label` from `HAIR_NAMES`.
      - `.cp-hair-color` has 5 swatches with `aria-label` "Hair colour 1" to "Hair colour 5".
    - Every button is at least 56 px and has `touch-action: manipulation`.
    - First mode: `button.btn.primary.cp-done` "All aboard!" calls `store.finishMeet(picks)` and `sfx.play('toot')`, then `onDone()`. `button.cp-later` "Later" calls `store.finishMeet({})`, then `onDone()`.
    - Grownups mode: `button.btn.small.cp-save` "Save" calls `store.setCharacter(picks)` and shows "Saved".
    - The note under both: "Saved only on this device. Never sent anywhere, never spoken."
11. `js/components/welcome-card.js`: add `export function firstRunOverlay({ store, root })`. Both homes call it in place of their duplicated first-run blocks (`home.js` line about 228, `home3d.js` line about 115).
    - If `!firstRunDone`, it shows `welcomeCard`. Its `onDone` calls `store.setFirstRunDone()`, then, if `store.state.meetDue`, swaps the card for `characterPicker({ mode: 'first' })` in the same `.first-run` overlay. Otherwise it closes.
    - If `firstRunDone && meetDue`, it shows the picker directly.
    - Keep the existing fade in and fade out.
    - The 3D Home builds the kid before this runs, so a figure chosen on first run shows on the next Home visit. Do not rebuild the 3D scene.
12. `js/screens/grownups.js`: the "Your child" section becomes `characterPicker({ store, mode: 'grownups' })`. Replace `nameIn`, `nameSave` and `nameNote`. Keep the existing note.
13. `sw.js`: add `js/character.js`, `js/art/kid.js`, `js/train/kid3d.js` and `js/components/character-picker.js`.
14. Tests:
    - `test/smoke.mjs` line 690 and `test/guide.mjs`, wherever the welcome card is finished or skipped: then click `.meet-later` (wait for `.cp`).
      - `guide.mjs` adds one check: after the welcome's Start, `.cp` shows and its heading is "Who is riding with Pip?".
    - `test/store.mjs` adds:
      - Bad values (`skin: 99, hair: '<b>', hairColor: -1, made: 'yes'`) clean to `2, 'short', 1, false`.
      - `meetDue` is true for a fresh store, true for an old real save without the field, and false for a seed without `lastOpened`.
      - `finishMeet({ skin: 4 })` sets `made` and clears `meetDue`.
    - New `test/character.mjs` (add it to npm test after `book.mjs`). Exports `characterChecks`. Checks:
      - First run: a fresh page shows the welcome card. After Skip, `.cp` shows. Pick skin 4 (`.cp-skin button` nth 3), `puffs`, colour 3, type "Lily", then "All aboard!". Reload: the stored character is `{ name: 'Lily', skin: 3, hair: 'puffs', hairColor: 3, made: true }` and `meetDue` is false. No overlay shows.
      - Grownups: change hair to `bun` and save; reload; it is stored.
      - The finish screen (`#/lesson/1/finish` with lesson 1 unlocked) shows `.finish-kid .kid` whose skin fill is `SKINS[3]`.
      - Book 1: the cover has `.cover-kid .kid`, and page 2 shows `.book-friend .kid` with `aria-label` "Lily".
      - 2D map (seed `trainWorld: false`): `.stone-kid .kid` is next to the current stone.
      - 3D Home (seed `trainAt` one stop back so the train arrives; copy `openHome` and `state` from `test/train.mjs` and export them there if needed): `window.__train.kid.index === window.__train.currentIndex`, `kid.waving` becomes true at the end of the arrival and false 3 s later, and the scene has an object named `kid` (expose it through `debug.kidName = kid.group.name`).
      - Privacy: no request URL or body contains "Lily", and `window.__spoken` never contains it.
      - Heat: Home idle after the arrival uses at most 2 frames in 3 s (as in `heatChecks`).
15. README: add a Decisions bullet (the data, when the creator shows and why `lastOpened`, where the figure appears, privacy). `docs/TRAIN-WORLD.md`: add one line on the figure on the platform. `docs/NEXT.md` item 5: the creator is done.

### Suites
`node test/store.mjs`, then in the background: `node test/character.mjs`, `node test/guide.mjs`, `node test/book.mjs`, `node test/map.mjs`, `node test/train.mjs`. Then the full `npm test` once (background), because this is the last phase.

### Commit
`Character creator: the child's figure on the platform, the finish screens and in the stories` plus attribution.

### Done when
- [ ] New installs: welcome, then the creator, then lesson 1. The owner's device shows the creator once. Grownups can edit it.
- [ ] Values are cleaned and survive a reload; the name is never sent or spoken
- [ ] The figure shows on the 3D platform (it waves on arrival), the 2D map, both finish screens, the book cover and pages
- [ ] Heat stays green; full npm test green; version 1.8.3; commit and push

---

## Later (recorded, not planned for building)

### Story 2, "Pip and the Map"
- Its text is already approved, as written in PLAN-v1.7 Phase D (12 pages; the child reads map, tip, sit, mat, pat, sip, tap and "It is").
- Under the new order it belongs after lesson 6 (m a s i t p): `{ "id": "b2", "kind": "book", "title": "Story 2", "book": "book-2", "needs": ["m","a","s","i","t","p"] }`. Gen will write `after: 6`.
- Build it from the PLAN-v1.7 Phase D page list, inside the Phase C storybook. Add `data/books/book-2.json` to `APP_FILES`, and loop `test/book.mjs` over every book stop.
- The Phase B proof and the pronoun check already cover it. Page 10 uses `{name}` with no pronoun.

### Music (owner's spec, from docs/NEXT.md)
- Music plays when the app opens (after the first tap, because browsers block audio before a tap), on the railway Home, while browsing letters, and while choosing an activity.
- It never plays during an exercise. It fades out when an exercise opens and fades back in on return.
- A theme loop plus short stings (startup, transition, success) that share one motif, built on the toot whistle interval (G5 to E5, sol-mi).
- Soft volume, so the parent can talk over it. It obeys the existing sound setting.
- The audio files will come from the owner as MP3 or OGG. Precache them and watch the total size. A synthesized placeholder is optional.

Hook points in the code today:
- **First tap:** `js/app.js`, the `pointerup`/`click` capture listener that calls `speech.unlock(); sfx.unlock();`. Start music there (once).
- **Scene changes:** `js/router.js` `render()`, after a route matches. Map routes to scenes:
  - `/home` → railway (music on)
  - `/lesson/:n` (the activity cards in `js/screens/lesson.js`) → activity choice (on)
  - `/grownups` → on, quiet
  - `/lesson/:n/task/:i`, `/checkpoint/:id` (book, ride, sack) → exercise (fade out)
  - finish screens → off, so the success sting and the existing "Good job." jingle (`js/sfx.js`, `sfx.play('lesson')`) do not clash
  - Smooth Ride must be fully silent, because it listens to the microphone.
- **Letter browsing:** the stops on the Home are the only letter browsing today (`js/screens/home.js` stones and `js/screens/home3d.js` stops). Any future letter gallery hooks in the same way.
- **The sound setting:** `store.settings.sfx` (on or off) and `store.settings.sfxVolume`, read the way `js/sfx.js` reads them (`enabled()` and `volume()`). Music is a fraction of that volume (about 0.35).
- **Visibility:** `document.visibilitychange` in `js/app.js` already cancels speech. Pause the music there too.
- **Heat:** use one `<audio>` element or a WebAudio buffer source. No animation, and no polling for fades (use `AudioParam` ramps).

---

## Questions for the owner
None that change what gets built. Flags, not questions:
- Lesson 4 (i) still has only "igloo" as a Practicing Words picture, and many small children don't know the word.
- `l` is still treated as clipped (`l-`). If the owner wants `llleaf`, it is one field in `tools/gen-lessons.mjs`.
- If the Andika download fails, the book uses Nunito and the commit message says so.
