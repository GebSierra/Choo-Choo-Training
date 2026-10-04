# Pip's Reading Train: plan for v1.6.1 to v1.7.5

Written by the planner (Opus) for the builder (Sonnet). Read this whole file once, then do one phase at a time, in order.
Each phase is shippable alone: after any phase the app works and the tests named in that phase pass. Stop after any phase
if the usage limit is near; the next session starts at the next phase.

Phases (priority order):

| Phase | What | Version |
|---|---|---|
| A | Fix the 3D train glitch (z-fighting) and the 3D Pip in the cab (one "eyebrow", sunk too low) | 1.6.1 |
| B | Renames, plus "Practicing Words" as an in-lesson task; the Sound Station stops leave the line | 1.7.0 |
| C | Book reader, plus Book 1 as a stop on the line | 1.7.1 |
| C2 | "Smooth Ride": the blending station that listens to the microphone, placed before the first book | 1.7.2 |
| D | Book 2 (draft text below, needs the owner's OK) | 1.7.3 |
| E | LATER (approved, not yet built): new sound order m a s i t p n f d h g b l | 1.7.4 |
| F | LATER (approved, not yet built): character creator | 1.7.5 |

Phase C2 was added after the first draft. It keeps the letter "C2" so that D, E and F keep the names the owner already knows.

---

## 0. Execution rules for Sonnet (read first, follow in every phase)

1. **Start state.** Another agent is finishing v1.6.0 in this repo. Before Phase A, run `git -C /home/user/kddash status --short` and `git -C /home/user/kddash log -1 --oneline`. If the working tree still has v1.6.0 changes that are not committed (for example `js/train/camera.js`, `sw.js`, `PLAN.md`), stop and tell the owner. Do not commit someone else's work, and do not build on top of it.
2. **Playwright.** It is installed globally at `/opt/node22/lib/node_modules`, and Chromium is at `/opt/pw-browsers/chromium`. `test/lib.mjs` already finds both. Never run `npx playwright install` or `npm install`.
3. **Versions.** `CACHE_VERSION` in `sw.js` must equal `'reading-v' + APP_VERSION`, where `APP_VERSION` is in `js/version.js`. Bump both, and `"version"` in `package.json`, once per phase, to the version in the table above. Keep the `reading-v` cache prefix and the localStorage key `reading.v1`, even though the app is renamed. Renaming either one would orphan old caches or lose the child's progress.
4. **Precache.** Every new file the app loads goes into `APP_FILES` in `sw.js`, including JSON under `data/books/`. Debug-only screens are the only exception.
5. **Long suites.** Run any Playwright suite in the background, writing to a log, then wait on the log. Example: `node test/train.mjs > _test/train.log 2>&1; echo EXIT $? >> _test/train.log` with `run_in_background`, then use Monitor or poll with `tail -3 _test/train.log` until `EXIT` shows. Never run two browser suites at once. The full `npm test` takes about 40 minutes. Run it **once**, in the background, at the end of the last phase you finish in a session, before that phase's push. In every other case, run only the suites the phase names.
6. **Store in tests.** The store reads localStorage once and then keeps settings in memory. A test that rewrites `localStorage` must `page.reload()` before it checks the result. Use the existing `seedState` pattern, which seeds through `addInitScript` plus a `sessionStorage` flag.
7. **Welcome card.** On first run the welcome card covers the app. Tests skip it with `.wc-skip`, or seed `firstRunDone: true`.
8. **Frame time.** In every requestAnimationFrame loop you add, use `dt = Math.max(0, (t - last) / 1000)`. Frame timestamps can come slightly before the previous frame's timestamp, which gives a negative dt.
9. **Do not change** the YouTube links in `data/curriculum.json` (`playlistUrl` and `alphabetSongUrl`), and do not touch the jingle cut-off in `js/sfx.js`.
10. **Commit and push to `main` after each phase.** Use the commit message given in the phase. Every commit message ends with these two lines:
    ```
    Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
    Claude-Session: https://claude.ai/code/session_01Snz7WaaKpAYXCzF6JbUKmc
    ```
11. **Letter sounds and names.** The app never speaks letter sounds or letter names. Parent text writes sounds as `mmm` (held) or `d-` (clipped), using the helpers in `js/scripts.js` (`soundText`, `slowSounds`, `firstSoundOut`). Never write a sound out by hand in code.
12. **Heat.** Add nothing that animates or polls while idle. Every new animation is either one-shot or tied to something the user is doing. The v1.6.0 heat test (`heatChecks` in `test/train.mjs`) must stay green.
13. **Docs.** There is no CLAUDE.md. README.md is the project doc, and `docs/TRAIN-WORLD.md` is the train spec. In each phase, add one short "Decisions" bullet to the README for what changed. Do not write other doc files.

### Things in the repo that contradict the requests (decisions already made)
- `docs/TRAIN-WORLD.md` section 5 says to keep the "Sound Sack" title until Geb picks names. He has now picked them, so Phase B supersedes that line.
- Book 1 says "Book stop after lesson 4 (sounds m a s i)". In the **current** order, `i` is lesson 8, so until Phase E ships, Book 1 sits after lesson 8. The stop's position comes from the data (`needs`), so Phase E moves it to after lesson 4 with no code change.
- The owner asked for a "stretched initial sound" in every Practicing Words prompt. The app's rule (`soundText` in `js/scripts.js`) never stretches the clipped sounds t p d h g b l, because stretching them adds "uh". Those prompts use the short form (`Find the d-uck.`). Only m a s i n f are stretched.
- `l` is a continuous sound, but the app's data marks it clipped (`hold: false`, `l-`). The plan follows the data. If the owner wants `llleaf`, change `hold` to true for `l` in `tools/gen-lessons.mjs` (one field).

---

## Phase A: z-fighting fix and 3D Pip fix (v1.6.1)

### Root cause of the flicker (found in code)
`js/train/train.js`, `buildCar()`:
- The wagon body is `block(bag, 1.26, 0.66, 1.8, accent)` at y 0.9, so its flat top face is at **y = 0.9 + 0.33 = 1.23**.
- The brown floor plank is `block(bag, 1.05, 0.06, 1.6, '#7A5C45')` at y 1.2, so its top face is at **y = 1.2 + 0.03 = 1.23**.
- These are two different-coloured faces in exactly the same plane, overlapping over about 1.0 x 1.56 units, right around the cargo block. No depth buffer can order them. As the camera moves, the winner changes per pixel, so the "background behind the letter block" flickers between the accent colour and brown. That is blue (#3B7DD8) on the m wagon and red (#E5484D) on the a wagon, which matches the owner's report exactly.
- Two smaller near-coplanar decals, which can flicker on phones with 16-bit depth:
  - The letter on top of the cargo block is a plane at y 1.615, and the block's top is at 1.61 (a 0.005 gap).
  - The cab windows are circles at z -0.415, and the cab front wall's back face is at z -0.41 (a 0.005 gap).
- Depth precision is also wasted: `createScene()` in `js/train/scene.js` uses a near plane of 0.5. The camera is never closer than about 7 units to anything (its distance is at least 12, pitched 38 degrees). Raising the near plane to 2 makes depth precision about 4 times better, at no cost.

### Root cause of the Pip problem (found in code)
`js/train/pip3d.js` has **no eyebrows at all**. What looks like "one eyebrow" is the single hair tuft:
`tuft = sph(0.06, PIP.hair)` scaled (1.4, 0.8, 0.8) at (-0.16, 0.12, 0.26). It is a dark brown dash on one side of the forehead.
For height: `train.js` puts Pip at `pip.group.position.set(0, 0.78, -0.86)` with scale 1.22. The cab block's top is at y 1.38, and the yellow cab rims reach y 1.44. Pip's skull bottom is at 0.78 + (0.82 - 0.33) x 1.22 = **1.38**, and his shirt is at 0.78 + 0.5 x 1.22 = 1.39. So the whole body, and the chin, are inside the solid cab block or level with its rim.

### Decisions
- **Remove the brown plank** instead of raising it. The owner says the background should be the wagon's colour. Removing it also takes one mesh per wagon out of the scene, so the GPU does slightly less work.
- **Separate the two decals by 0.015** instead of using polygonOffset. Moving them costs nothing, and polygonOffset would need tuning on each material.
- **Near plane from 0.5 to 2.** It is free.
- **No logarithmicDepthBuffer.** It writes depth per fragment and disables early depth rejection, which would raise GPU load on the phone that already ran hot.
- **Pip:** add two mirrored brows, replace the one forehead tuft with two mirrored side tufts at the temples (the same as 2D Pip in `js/art/pip.js`, which has hair on both sides), and raise Pip to y 1.12.
  - Skull bottom becomes 1.12 + 0.598 = 1.72, which is above the rim top of 1.44.
  - Shirt bottom becomes 1.12 + 0.43 x 1.22 = 1.64.
  - Cap top becomes about 2.68.

### Exact changes
1. `js/train/train.js`, `buildCar()`:
   - Delete the line `add(block(bag, 1.05, 0.06, 1.6, '#7A5C45', { r: 0.02, shadow: false }), 0, 1.2, 0);`.
   - Change the cargo top plane's y from `1.615` to `1.625`.
2. `js/train/train.js`, `buildEngine()`:
   - In the cab window loop, change z `-0.415` to `-0.425`.
   - Give each yellow cab rim block a name. The loop `for (const [w, d, x, z] of [[1.44, 0.1, 0, -1.33], ...]) add(block(...), x, 1.4, z);` becomes `add(...).name = 'cab-rim';`, and also name the top rim at y 2.0 `'cab-rim-top'`.
   - Change `pip.group.position.set(0, 0.78, -0.86)` to `pip.group.position.set(0, 1.12, -0.86)`.
3. `js/train/scene.js`: `new THREE.PerspectiveCamera(35, 1, 0.5, 140)` becomes `new THREE.PerspectiveCamera(35, 1, 2, 140)`.
4. `js/train/pip3d.js`:
   - `skull.name = 'pip-skull';` and `shirt.name = 'pip-shirt';`
   - Delete the `tuft` line. Add:
     ```js
     // two eyebrows and a tuft of hair at each temple, mirrored (as on the 2D Pip)
     for (const side of [-1, 1]) {
       const brow = new THREE.Mesh(bag.geo('brow', () => new THREE.CapsuleGeometry(0.016, 0.07, 3, 8)), mat(PIP.hair));
       brow.name = 'pip-brow'; brow.rotation.z = Math.PI / 2 - side * 0.12; brow.position.set(side * 0.12, 0.1, 0.295); head.add(brow);
       const tuft = sph(0.06, PIP.hair, 10); tuft.name = 'pip-hair'; tuft.scale.set(0.8, 1.2, 0.8); tuft.position.set(side * 0.28, 0.06, 0.14); head.add(tuft);
     }
     ```
     Keep the `shadowy(group)` call after these lines.
5. Look once at `_test/train-pixel7-*.png` after running `test/train.mjs`. Both brows should show under the cap brim. If the brim hides them, lower both brows to y 0.085. Change nothing else.

### New test: `test/depth.mjs` (fast, one browser page; add it to `package.json` "test" right after `check-content.mjs`)
Open `url + '#/grownups'` with `seedState` (lessons {}, `firstRunDone: true`). Then in `page.evaluate`:
```js
const { THREE, makeBag, makeLine } = await import('/js/train/world.js');
const { buildTrain } = await import('/js/train/train.js');
const { createScene } = await import('/js/train/scene.js');
const bag = makeBag();
const t = buildTrain(bag, makeLine(3), [{ glyph: 'm', accent: '#3B7DD8' }, { glyph: 'a', accent: '#E5484D' }]);
t.group.updateMatrixWorld(true);   // do NOT call place(): groups stay axis-aligned at the origin
```
1. **Coplanar check.** For the engine group, skipping everything under `t.pip.group`, and for each wagon group (`t.group.children` that are wagons; tag them in `buildCar` with `g.name = 'wagon'` and the engine with `'engine'`), collect meshes.
   - Skip any mesh where it, or an ancestor up to the wagon or engine group, has a rotation component that is not a multiple of pi/2 (within 1e-6). This leaves out the cow-catcher, which is tilted 0.5.
   - For each mesh, take `new THREE.Box3().setFromObject(mesh)` and its `material.uuid`.
   - For every pair with different materials, on each axis a, for side in [min, max]: report the pair if `|A[side][a] - B[side][a]| < 0.008`, and the two boxes overlap by more than 0.25 on both other axes.
   - Return the list, with each mesh's colour hex and position.
   - Assert the list is empty.
   - Before the fix, this must report brown `7a5c45` against the wagon colour (y max 1.23), the cargo top plane against the cream block, and the cab windows against the red wall.
   - **Run the test before making the fix and confirm it fails exactly like that.** If it reports other pairs, check each one. A real coplanar pair gets fixed by moving one face by 0.015. A false hit from a curved part gets its mesh name added to a short skip list, with a comment saying why.
2. No mesh in any wagon uses colour `#7a5c45`.
3. `createScene().camera.near >= 2`.
4. **Pip.**
   - Exactly 2 meshes named `pip-brow`. Their `position.x` values sum to 0 (within 1e-6), with equal y and z.
   - Meshes named `pip-hair` come in mirrored pairs.
   - World box of `pip-skull`: `min.y` > the max `max.y` of the `cab-rim` boxes + 0.02.
   - World box of `pip-shirt`: `min.y` > the rim top.
5. `bag.dispose()` at the end. No console errors.

**Honesty note for the owner.** SwiftShader is deterministic, so a headless render of coplanar faces does not flicker; it just picks one colour. A pixel test therefore cannot reliably fail before the fix. The proof is geometric: the test shows the two faces share a plane before the fix and are apart after it. The flicker itself can only be seen on a real screen. Ask the owner to pan the line on his phone once.

### Suites to run
`node test/depth.mjs`, then `node test/train.mjs` (in the background). The train suite covers renders, taps, the arrival, disposal and heat.

### Commit
`Fix train flicker (coplanar wagon floor) and 3D Pip: two brows, raised in the cab` plus the two attribution lines.

### Done when
- [ ] depth.mjs fails on the old code for the brown floor, and passes after the fix
- [ ] train.mjs is green, including heatChecks
- [ ] The screenshot shows both brows and Pip's chest above the cab rim
- [ ] Version 1.6.1 is set in all three places, then commit and push

---

## Phase B: renames, plus Practicing Words in each lesson (v1.7.0)

### Decisions
- **Internal ids stay.** Task types `newLetter`, `words`, `writing`, `hunt` and `check` keep their ids. Saved `tasksDone`, routes and tests key on them, so only display names change. The new task type id is `practice`.
- **Name mapping:**

  | id | Old name | New name |
  |---|---|---|
  | newLetter | New Letter | New Sound |
  | words | Saying Words | Word Cars |
  | writing | Letter Writing | Track Tracing |
  | hunt | Letter Hunt | Letter Hunt |
  | practice (new) | Sound Station | Practicing Words |
  | check | Quick Check | Ticket Check |

  `review` (Letter Review), `story` (Sound Story), `sounds` (Saying Sounds) and `barn` (Barn Doors) keep their names. **Word Cars is mapped to Saying Words** (two words couple like two cars: sun + hat). This is owner question 1.
- **App name.** `<title>` and the manifest `name` become "Pip's Reading Train". `short_name` and `apple-mobile-web-app-title` become "Pip's Train", because home-screen labels cut off after about 12 characters. Grownups shows "Pip's Reading Train version X".
- **Task order:** review, newLetter, story, words, sounds, writing, hunt, barn, **practice**, check. This follows the owner's list (Practicing Words, then Ticket Check). Indices come from list position, so `check` moves up by one. Tests look indices up by type, so they are unaffected. On a device with a lesson half done, a saved "check done" index now means "practice done". That is harmless: unlocking uses `result`, not `tasksDone`. No migration.
- **Rounds:** 3 per lesson, fixed and not random, so they can be tested.
  - First, this lesson's sound: up to 2 of its `practice` words, or 3 in lesson 1.
  - Then the earlier sounds, newest first, one unused `practice` word each, cycling until there are 3 rounds.
  - Wrong crates: `sackPool` over the sounds taught so far, as now.
- **Prompt** is parent-facing only: `Say: 'Find the ${firstSoundOut(word, curriculum.sounds)}.' Let them drag it into the wagon. There is no right or wrong here.` In quiet mode (the default), `scriptToParts` drops every sentence that contains a sound, so the prompt is never spoken.
- **Pictures stay swappable.** Each round uses the word's entry in `sounds[k].startWords`, which holds `{word, image}`. Swapping a Mentava picture later means changing one `image` path in curriculum.json.

### Parent prompts for the 13 letters (first round of that letter's lesson)
| Letter | Prompt | Practice words (in order) | Flag |
|---|---|---|---|
| m | Find the mmmilk. | milk, map, moon | |
| a | Find the aaapple. | apple | **astronaut is left out**: long, abstract, hard to picture at 2 to 5. a has only one good word, so rounds 2 and 3 come from m. |
| s | Find the sssnake. | snake, sun, sock | |
| i | Find the iiigloo. | igloo | **Weak**: igloo is the only i picture, and many 2 to 5 year olds don't know it. Recreate an "insect" or "itch" picture later (Mentava has none). |
| t | Find the t-iger. | tiger, table, tent | **tree is left out**: it starts with the blend "tr". |
| p | Find the p-ig. | pig, pot, panda | |
| n | Find the nnnose. | nose, nut, nest | |
| f | Find the fffish. | fish, fan, fox | |
| d | Find the d-uck. | duck, dog, door | |
| h | Find the h-at. | hat, hand, horse | |
| g | Find the g-oat. | goat, gate | Only 2 pictures. |
| b | Find the b-all. | ball, bus, banana | |
| l | Find the l-eaf. | leaf, leg, ladder | Clipped by the app's rule (see section 0). |

### Exact changes
1. `data/curriculum.json` and `tools/gen-lessons.mjs`:
   - Add `"practice": [...]` (the list above) to each sound. For m, a and s, edit curriculum.json by hand, because gen keeps those three as they are. For t to l, add `practice: [...]` to each `TABLE` row in gen-lessons, and in the sound object it builds, add `practice: e.practice`.
   - In gen-lessons:
     - Replace `c.checkpoints = c.checkpoints.slice(0, 1);` with `c.checkpoints = (c.checkpoints || []).filter((k) => k.kind);` (this keeps future book and ride stops).
     - Delete the `CHECKPOINTS` table and the loop that pushes Sound Station checkpoints.
     - Change `games.sack.say` nowhere (it stays).
   - Run `node tools/gen-lessons.mjs`. `git diff data/curriculum.json` must show only the added `practice` arrays and `"checkpoints": []`. The m, a and s `practice` lists are added by hand first, so gen keeps them.
2. `js/lessons.js`:
   - In `TASK_TYPES`, set the new names. Add `practice: { name: 'Practicing Words', color: 'mint', dark: true, label: "Today we'll find" }`.
   - In `tasksFor`, add `'practice'` before `'check'`.
   - In `targetsFor`, add `case 'practice':` to the group that returns `[{ glyph: lesson.sound }]`.
   - Add:
     ```js
     export const taughtBy = (curriculum, n) => curriculum.lessons.slice(0, n).map((L) => L.sound);
     // Practicing Words: three rounds, this lesson's sound first, then earlier sounds, newest first. [{ key, word }]
     export function practiceRounds(curriculum, lesson, n = 3) {
       const own = curriculum.sounds[lesson.sound].practice || [];
       const out = own.slice(0, lesson.number === 1 ? n : 2).map((word) => ({ key: lesson.sound, word }));
       const earlier = taughtBy(curriculum, lesson.number - 1).reverse();
       const next = Object.fromEntries(earlier.map((k) => [k, 0]));
       for (let guard = 0; out.length < n && guard < 50 && earlier.length; guard++) {
         const k = earlier[guard % earlier.length], list = curriculum.sounds[k].practice || [];
         if (next[k] < list.length) out.push({ key: k, word: list[next[k]++] });
       }
       return out;
     }
     ```
3. New `js/screens/tasks/practice.js`:
   ```js
   import { build as sack } from '../sack.js';
   import { practiceRounds, taughtBy } from '../../lessons.js';
   // Task 9: Practicing Words. The Loading Dock game inside a lesson: the grown-up says "Find the mmmilk".
   export function build(ctx) {
     const plan = practiceRounds(ctx.curriculum, ctx.lesson);
     return sack({ ...ctx, checkpoint: { id: `practice-${ctx.lesson.number}`, sounds: taughtBy(ctx.curriculum, ctx.lesson.number), rounds: plan.length, plan }, setProgress: () => {} });
   }
   ```
4. `js/screens/sack.js` (keep checkpoint behaviour for `plan`-less calls):
   - `pickOrder`: `checkpoint.plan ? checkpoint.plan.map((r) => r.key) : roundSounds(...)`.
   - `pickWord(key)`: if `checkpoint.plan`, return `curriculum.sounds[key].startWords.find((w) => w.word === checkpoint.plan[round].word)`.
   - Keep `let rightWord` set in `renderRound`.
   - `script`: if `checkpoint.plan`, use the prompt above. `gist`: `fit(\`Say: Find the ${firstSoundOut(rightWord.word, curriculum.sounds)}\`, \`Find the ${firstSoundOut(rightWord.word, curriculum.sounds)}\`)`. Import `firstSoundOut` from `../scripts.js`.
   - Update the header comment.
5. `js/screens/task.js`: import practice, and add `practice` to `BUILDERS`.
6. `js/screens/lesson.js`: in `illustration()`, add `case 'practice': wrap.append(h('span', { class: 'art-crate' }, crateSvg())); break;` and import `crateSvg` from `../art/train2d.js`. In `css/app.css`, add `.art-crate` to the two `.art-train, .art-barn` rules (lines about 588 and 589).
7. **Renames:**
   - `index.html` (`<title>` and the apple title)
   - `manifest.webmanifest` (`name` and `short_name`)
   - `js/screens/grownups.js` (the `Reading version` string)
   - The comments that name tasks in `js/lessons.js` and `js/components/sound-card.js`
   - README title and task list
   - `docs/TRAIN-WORLD.md` section 7: one line saying the names are decided
   - Do not rename files.
8. `test/lib.mjs`: add `practice: true, book: true, ride: true` to `SEEN_BASE`.
9. `test/check-content.mjs`:
   - Every sound has `practice`, a non-empty array. Each word is in that sound's `startWords` and starts with the sound's letter.
   - For every lesson, `practiceRounds(c, L).length === 3`, with no repeated word.
   - In the checkpoint loop, only run the Sound Station checks for checkpoints without `kind`.
   - Delete the `wantAfter` check (lines about 209 to 211).
10. **Tests that opened `#/checkpoint/c1`.** Switch them to `#/lesson/3/task/${idx(3,'practice')}` (seed lessons 1 and 2 done):
    - `test/script.mjs` lines about 138 and 285. Expected text: `Find the `.
    - `test/sfx.mjs` about line 153. 3 rounds instead of 6; the jingle check stays at 13 bells.
    - `test/train.mjs` `heatChecks`: the label `'Sound Station'` becomes `'Practicing Words'`.
    - `test/round2.mjs` about line 407: leave as is; the list is now empty.
    - `test/map.mjs`:
      - Line about 165: the expected done count is `3`, because there is no c1 stop any more. Use `3 + (CUR.checkpoints.some((k) => k.id === 'c1') && Object.keys(extra).length ? 1 : 0)`.
      - Line about 168: use `tasksFor(CUR.lessons[3]).length` instead of `9`, and update the message.
11. `test/sack.mjs`: rewrite `sackChecks` as `practiceChecks({ browser, url, ok, CUR, vp, shot })`:
    - Open lesson 3's practice task (lessons 1 and 2 done). Check `.sack-game`.
    - The script text includes `Find the ${firstSoundOut(plan[0].word)}`.
    - For each of the 3 rounds, `dataset.sound === plan[r].key` and the right crate's `data-word === plan[r].word`.
    - Drag each right crate into the wagon. `state` is `done`.
    - Next goes to `.../task/${idx(3,'check')}`, not to the finish screen.
    - `window.__spoken` contains no stretched sound (`/([a-z])\1{2,}|\b[a-z]-/`).
    - `sackMapChecks` and `sackGrownupsChecks`: at the top, add `if (!CUR.checkpoints.length) return;`. Phase C points them at the book stop.
    - Add `renameChecks`:
      - `document.title === "Pip's Reading Train"`
      - The manifest's `name` (fetched)
      - Lesson 3's `.task-card .card-name` texts equal `['Letter Review','New Sound','Sound Story','Word Cars','Saying Sounds','Track Tracing','Letter Hunt','Barn Doors','Practicing Words','Ticket Check']`
      - Grownups shows `Pip's Reading Train version`
      - The Home 2D path (`trainWorld: false`) has `CUR.lessons.length` stones and no `.stone-sack`
    - Update `smoke.mjs` lines 257 to 259 to call `practiceChecks` for `VIEWPORTS[0]` and `renameChecks` once (edit only; smoke runs at release).
12. `sw.js`: add `'js/screens/tasks/practice.js'`.

### Suites to run (background, one at a time)
`node test/check-content.mjs`, `node test/sack.mjs`, `node test/map.mjs`, `node test/script.mjs`, `node test/sfx.mjs`, `node test/train.mjs`.

### Commit
`Rename to Pip's Reading Train; Practicing Words in every lesson replaces the Sound Station stops` plus attribution.

### Done when
- [ ] Every lesson has 10 tasks, with Practicing Words before Ticket Check, and the prompt reads "Find the mmmilk." (lesson 1)
- [ ] No Sound Station stop on either Home (3D or 2D). Old saved data with `checkpoints.c1` still loads.
- [ ] The listed suites are green, at version 1.7.0, then commit and push

---

## Phase C: book reader plus Book 1 (v1.7.1)

### Decisions
- **A book is a checkpoint** with `kind: "book"`. This reuses unlocking (`after`), the `checkpoints` store entry, the Home stop (3D depot and 2D stone), Grownups unlock, the `/checkpoint/:id` route and the two-tap finish. Store schema is unchanged.
  - Entry: `{ "id": "b1", "kind": "book", "title": "Story 1", "book": "book-1", "needs": ["m","a","s","i"], "after": 8 }`.
  - `after` is written in the data, and check-content checks that it equals the first lesson by which every `needs` sound is taught. It is 8 today, and becomes 4 once Phase E's gen run writes it again.
- **The stop is called "Story 1".** Story stays unchanged as a word, per the owner. The number keeps screen-reader labels unique.
- **Books are silent.** The grown-up reads the story. Page text is never sent to text-to-speech: `parts: () => []`. So the child's name never reaches a speech engine, which may be online on Android. No letter sound is ever played.
- **{name}** comes from `store.state.character.name`, set in Grownups ("Your child's name, for the stories"). If it is empty, the books use "Pip's friend", which fits every Book 1 and Book 2 sentence grammatically. Phase F extends the same `character` object; no migration.
- **Art is a swappable slot per page:** `art: { train?, pip?, friend?, emoji?: [] , image? }`. For now pages use the 2D Pip (`pipSvg`), the 2D engine (`engineSvg`) and emoji. The friend is shown as 🧒 until Phase F. A later `image: "assets/books/b1-p3.webp"` replaces the scene with no code change.
- **Child words** are drawn with `wordSvg(word, { all: true })`. Lowercase letters come from our glyphs, and capitals (S in Sam, I, P in Pip) come from the font. The slider page uses `slideBlend` on that svg, which works because `all: true` gives every letter `data-x0/x1`.
- **Navigation:** the book uses the checkpoint shell with `steps = pages.length` and `stepNoun: 'Page'`, plus its own big "Next page" and "Back" buttons inside the stage. It calls `setProgress(i)` and `refresh()`. It calls `setDone(true)` on the review page, so the shell's button reads Finish.

### Book 1 data: create `data/books/book-1.json` with exactly this content
Source: the owner's approved text (`book-1.md`). Copy it verbatim.
```json
{
  "id": "book-1",
  "title": "Pip Meets {name}",
  "needs": ["m", "a", "s", "i"],
  "sight": ["is", "I"],
  "pages": [
    { "read": "Toot toot! Here comes a little train. The driver is a tiny conductor named Pip.", "art": { "train": true, "pip": "wave" }, "tap": { "on": "train", "anim": "toot", "label": "Pip's whistle" } },
    { "read": "The train stops at a station. Who is waiting there? It is {name}!", "art": { "friend": true }, "tap": { "on": "friend", "anim": "wave", "label": "{name}" } },
    { "read": "Pip leans out and says, \"Hop on! I ...\"", "child": "am", "after": "\"... Pip!\"", "slider": "am", "art": { "pip": "point" } },
    { "read": "Then a boy runs up the hill. He has a red hat. \"Wait for me!\" he calls. His name ...", "child": "is Sam", "slider": "Sam", "art": { "emoji": ["👦", "🧢"] } },
    { "read": "Sam has a baby sister. He holds her hand. Sam calls her ...", "child": "sis", "art": { "emoji": ["👧"] }, "tap": { "on": "emoji", "anim": "giggle", "label": "Sis" } },
    { "kind": "drag", "read": "Off they go! Up the hill and down the hill." },
    { "read": "Oh no! A cow is standing on the track. The cow says ...", "sound": "mmmm", "after": "Pip toots. The cow walks away.", "art": { "emoji": ["🐄"] }, "tap": { "on": "emoji", "anim": "walk", "label": "the cow" } },
    { "read": "A snake is in the grass by the track. The snake says ...", "sound": "sssss", "art": { "emoji": ["🐍"] } },
    { "read": "Sis throws a ball to {name}. {name} reaches for it ... oops! It is a ...", "child": "miss", "art": { "emoji": ["⚽"] }, "tap": { "on": "emoji", "anim": "bounce", "label": "the ball" } },
    { "read": "The train pulls into the station. Pip blows the whistle. \"You are my friend,\" says Pip. And {name} says, \"I ...\"", "child": "am", "after": "The end. Toot toot!", "art": { "train": true, "pip": "cheer", "friend": true } },
    { "kind": "review", "read": "Read them all!", "words": ["am", "is", "Sam", "sis", "miss"] }
  ]
}
```
**Field meanings:**
- `read` and `after`: grown-up text. It is shown in a cream card at the top and is not spoken.
- `child`: shown big, highlighted, for the child to read.
- `slider`: a word that is in `child`, with the slide-to-blend band under it.
- `sound`: a sound-only page. The parent card adds "Your child says: mmmm". The stage shows only the picture. Nothing is spoken.
- `tap`: a one-shot animation on `on` ∈ `train|friend|emoji|pip`. `anim` ∈ `toot` (a puff plus `sfx.play('toot')`), `wave`, `giggle`, `bounce`, `walk`. Each is a WAAPI `animate()` of at most 900 ms, with no loop.
- `kind`: `page` (the default), `drag` (drag the train along a track), or `review` (the words as big tiles; a tap lights a tile).

### Exact changes
1. `data/curriculum.json`: `"checkpoints": [ { "id": "b1", "kind": "book", "title": "Story 1", "book": "book-1", "needs": ["m","a","s","i"], "after": 8 } ]`.
2. `js/store.js`:
   - `fresh()` gains `character: { name: '' }`.
   - In `load()`: `character: cleanCharacter(p.character)`. Define `cleanCharacter = (c) => ({ name: typeof c?.name === 'string' ? c.name.replace(/[^\p{L} '\-]/gu, '').trim().slice(0, 16) : '' })`. Phase F extends it.
   - Methods: `character: () => state.character`, and `setCharacter(patch) { state.character = cleanCharacter({ ...state.character, ...patch }); save(); }`.
   - `resetAll` keeps `character`, like settings.
3. New `js/screens/book.js`:
   - `export async function bookBuild({ checkpoint, curriculum, store, refresh, setProgress, setDone, sfx })`.
   - Fetch `data/books/${checkpoint.book}.json`. Substitute `{name}` in `title`, `read`, `after` and `tap.label` with `store.character().name || "Pip's friend"`.
   - Render one page at a time into `.book-stage`:
     - `.book-read` (parent card: `read`, then `after`, and for a sound page "Your child says: <b>mmmm</b>")
     - `.book-art` (scene)
     - `.book-child` (wordSvg words, ink colour, large)
     - an optional `.slide-band` (copy how `js/screens/tasks/sounds.js` lines 30 to 40 wire `slideBlend`, `placeBand` and `startSweep`)
     - `.book-nav` with `button.book-back` and `button.book-next`
   - Drag page: reuse `slideTrack` from `js/components/slide-track.js`. Add an optional `handle` element parameter: when it is given, the knob shows that element instead of `glyphSvg(letter)`, and the accent defaults to `#E5484D`. Pass `engineSvg({ still: true })`. Its `onComplete` plays `sfx.play('toot')`.
   - Return `{ el, flush: true, parts: () => [], script: () => 'Read the page aloud. When you reach the big word, point to it and let your child read it. Do not say letter names.', gist: () => 'Read; your child reads the big word', again: () => go(0), cleanup }`.
   - `el.dataset.page` holds the page index. Clean up every timer and animation in `cleanup`.
4. `js/screens/checkpoint.js`:
   - If `ck.kind === 'book'`: build the shell with `steps: pages count` (read it after the fetch, so make `checkpointScreen` async; the router already awaits screens), `stepNoun: 'Page'`, `seenKeys: ['book']`, `autoOpen: true` and `skipUntilDone: true`. Use `bookBuild` instead of `sack`.
   - Non-book checkpoints keep the current path.
5. **Icons:**
   - `js/art/train2d.js`: add `bookSvg()` (an open book, two cream pages on a red cover, viewBox 0 0 100 100, same style as `crateSvg`). Add `export const stopIcon = (ck) => (ck.kind === 'book' ? bookSvg() : crateSvg());`.
   - Use `stopIcon(ck)` in `js/screens/home.js` (the `stone()` crate), `js/screens/finish.js` (badge) and `js/screens/grownups.js` (row glyph).
   - `js/train/stations.js`: add `drawBook(g, cx, cy, size, color)` beside `drawCrate`. `signTexture` takes `icon` (`'crate'|'book'`) instead of `crate`.
   - `js/screens/home3d.js` `stopsOf`: depot nodes get `icon: c.kind === 'book' ? 'book' : 'crate'`, passed through to stations.
   - The goods shed building stays as it is, for low cost; it can get a library look later.
6. `js/screens/finish.js` `checkpointFinishScreen`: for a book, heading `"That's the end of the story."` and accent `#E5484D`.
7. `js/screens/grownups.js`: a new section "Your child" with a text `input.gu-name` (maxlength 16) and a Save button that calls `store.setCharacter({ name })`. Note under it: "Used only inside the stories on this device. It is never sent anywhere and never spoken by the phone's voice."
8. `sw.js`: add `'js/screens/book.js'` and `'data/books/book-1.json'`.
9. `test/check-content.mjs` book checks: for each `kind: 'book'` checkpoint, read `data/books/<book>.json`.
   - `id` matches. `after` === the first lesson by which every `needs` sound is taught.
   - For every `child`, `slider` and `words` entry, each space-separated token (strip punctuation, lowercase) is in `sight` or uses only letters in `needs`.
   - `slider` appears in `child`. No `{name}` in `child`, `slider` or `words`.
   - `sound` matches `/^([a-z])\1{2,}$/`, its letter is in `needs`, and `sounds[letter].hold === true`.
   - `kind` ∈ {page, drag, review}. The last page is a review. `tap.anim` ∈ the five names.
10. New `test/book.mjs` (add it to npm test after `sack.mjs`). Viewport `VIEWPORTS[0]`, plus one landscape layout pass. Seed lessons done through `ck.after`, `firstRunDone: true`, `seenScripts: SEEN`, and `character: { name: 'Lily' }`. Collect `page.on('request')` URLs and post data.
    - Open `#/checkpoint/b1`. `.book-stage` shows. The dots show 11.
    - Page 2's `.book-read` contains "Lily". `document.body.innerText` never contains `{name}`.
    - Walk with `.book-next`. On each `child` page, the `.book-child .glyph-letter` count equals the letter count.
    - Page 3 has `.slide-band`. A touchDrag across it lights the letters (`.glyph-letter.lit` or the class slideBlend uses; check `js/components/slide-blend.js`).
    - Tap page 1's `.book-tap`: `window.__audioNotes()` gains a `toot` event.
    - Drag page: a touchDrag of `.st-handle` to the right end sets `data-done="1"` on the track.
    - Sound page: no `clip` event in `window.__events`.
    - Review page: 5 tiles. The shell's last button reads Finish.
    - Finish: heading "That's the end of the story."; two taps; reload; `checkpoints.b1.result === 'got-it'`.
    - `window.__spoken` is empty for the whole run. No request URL or body contains "Lily".
    - Landscape: `.book-stage` `scrollHeight <= clientHeight + 1`.
    - Idle 3 s on a page with RAF_COUNTER (copy it from `test/train.mjs` line 319): frames ≤ 2 and no endless animations.
    - No console errors.
11. `test/sack.mjs` `sackMapChecks` and `sackGrownupsChecks`: point them at `CUR.checkpoints[0]` (b1), since the guard from Phase B now lets them run. Locked until lesson `after` is done; its label is "Story 1"; Grownups unlock works. Change the expected crate selectors to accept `.stone-sack` (keep that class on the stone wrapper).

### Suites to run
`node test/check-content.mjs`, `node test/book.mjs`, `node test/sack.mjs`, `node test/map.mjs`, `node test/train.mjs`.

### Commit
`Book reader and Story 1 (Pip Meets {name}) on the line` plus attribution.

### Done when
- [ ] Story 1 stop after lesson 8 (current order), locked until then, on both Homes
- [ ] All 11 pages work: slider, taps, train drag, sound page and review. Silent; the name is never sent or spoken.
- [ ] Suites green, version 1.7.1, commit and push

---

## Phase C2: "Smooth Ride", the blending station (v1.7.2)

### The idea, in our own form
Children often say "m... a... t" and don't hear "mat". Showing them how is not enough; they need instant feedback on the **gaps**. Our version uses the toy train: while the child's voice stays on, the engine rolls and puffs steam. **The moment the voice stops, the steam and the train stop dead.** The grown-up can then say "keep your voice on", and the child knows what that means, because they saw the train stop.

### Name (owner question 2)
Three options: **Smooth Ride**, **Full Steam**, **Keep It Rolling**. The recommendation is **Smooth Ride**: it is short, it says what the child is aiming for, and it fits a train ride. The rest of this phase uses "Smooth Ride" and the stop id `r1`.

### Feedback design (no waveform, no bird, none of the other product's visuals or wording)
- **Scene:** the Letter Hunt backdrop (`huntBackdrop()`). A track runs along the bottom. The engine with Pip is at the left; a small station with the word's accent colour is at the right. The word is drawn big above the track with `wordSvg`, its letters spread along the track's length.
- **Steam gauge** (top left, about 96 px): a round brass dial with a cream face and a red needle. No numbers and no zones. The needle shows the live voice level. It is a gauge, not a trace: no history is drawn.
- **Starting (may ease in):**
  - When the voice comes on, speed ramps from 0 to its target over 120 ms.
  - Target speed = `0.45 + 0.55 * k` of full speed, where `k` is the level above the threshold, scaled to 0 to 1. Full speed crosses the track in 1.3 s.
  - The wheels turn, and a steam puff leaves the funnel every 180 ms and drifts up and back.
  - Each letter lights as the engine passes under it.
  - The needle follows the level with light smoothing on the way up only.
- **Stopping (a hard cut, on the same frame that voice-off is detected):**
  - Speed is set to 0, and the engine stays exactly where it is. No braking, no easing, no coast.
  - The wheels' animation is paused (`anim.pause()`).
  - Steam: emitting stops, and **every existing puff is removed on that frame**. Call `a.cancel()` on each puff's animation, then `puffLayer.replaceChildren()`. Nothing drifts off or fades.
  - The needle jumps to rest (no CSS transition on the needle).
  - Pip switches to pose `point` (looking back).
  - The stop is visible at once. What happens next depends on the verdict (below).
- **After a gap:**
  - Parent bar: "There was a gap. Say: 'Keep your voice on.' Then try again together."
  - After 1.2 s, the engine rolls back to the start. This is a separate, eased glide, clearly after the stop.
- **A smooth ride:** one unbroken voiced stretch of at least 500 ms that ends in silence. When it ends, the engine also cuts to a stop where it is, so the stop always looks the same. Then, after 250 ms, it glides on into the station, the word lifts with a sparkle, the microphone closes, `sfx.play('toot')` plays, and a star fills.
- **Each try:** a big round whistle button "Go". A tap opens the microphone and shows "Ready..." for 300 ms while it calibrates. Then "Say it!" and the engine's lamp glows. The try ends 600 ms after the voice ends, or after 5 s at most. The microphone is closed between tries.
- **Child-facing spoken line** (text-to-speech, `games.ride.say`): "Tap the whistle. Then say the word with your grown-up in one long sound." No letter sounds and no letter names.
- **Parent script per word:** `Say it together, slowly, with no gaps: '${slowSounds(word, sounds)}'. Then say '${word}'. Tell your child: keep your voice on. Say the sounds, not the letter names.` In quiet mode, the sentence containing the stretched sound is dropped from speech, as everywhere else.

### Timing decision: how fast "voice off" is detected
- Levels are read once per animation frame, about every 16.7 ms. Each read uses the last 1024 samples (21 ms at 48 kHz) of the analyser.
- **Voice-off = the level stays below the off threshold for 40 ms (`offHoldMs: 40`).** At 60 fps that is 2 to 3 frames. The visible cut happens on that frame.
- Why 40 ms and not less:
  - A held "sss" or "fff" is noise. Its loudness flickers from one 20 ms window to the next, and single windows can drop below the line.
  - The 5 dB hysteresis (below) removes most of that flicker. The 40 ms hold removes the rest, so the train does not stutter in the middle of a good, stretched sound.
  - Any shorter, and the train stops during good sounds, which would teach the wrong thing.
  - At 40 ms, the stop still appears faster than a person can notice the delay. In practice the child sees "I stopped talking, the train stopped".
- Clicks (a tap on the table, a lip smack) are short loud spikes. To count as voice-on, the level must be above the on threshold for **30 ms** (`onHoldMs: 30`), so a click does not start the train. The cost is a 30 ms delay at the start, which is hidden by the 120 ms ease-in.
- A breath between sounds is a real gap, and stopping on it is correct.
- **Verdict** (a smooth blend or a gap) is separate from the visible cut:
  - A silence of at least **100 ms** (`gapMs: 100`) followed by more voice is a gap.
  - The one exception is a word that ends in a clipped sound, such as the t in "mat". Its closure is a silence of 50 to 150 ms, followed by a short burst. If the voice after the silence lasts **under 120 ms and is the end of the try**, it counts as the final consonant, not a new run.
  - So "mmmaaat" is smooth: the train visibly cuts at the closure, which is right, because the voice did stop for the t. "mmm ... aaa" is a gap.
  - Gaps from 40 to 100 ms stop the train visibly but are not marked as failures. The train starts again (with the 120 ms ease-in) as soon as the voice returns, and the try goes on. This keeps the cut honest without failing children for a hiccup.
- All five numbers live in the stop's data (`offHoldMs`, `onHoldMs`, `gapMs`, `minRunMs: 500`, `endMs: 600`), so the owner's phone test can tune them with no code change.

### Technology decisions
- **Its own AudioContext.** `js/sfx.js` owns one shared AudioContext that suspends itself after each sound, to save power. Feeding the microphone into it would fight that sleep logic. So `js/mic.js` creates a separate AudioContext on the "Go" tap (the tap counts as the user gesture the browser requires) and **closes** it at the end of every try.
  - Chain: `getUserMedia({ audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: false } })`, then `createMediaStreamSource`, then `AnalyserNode` (`fftSize 1024`, `smoothingTimeConstant 0`).
  - It is **not connected to the speakers**.
  - `noiseSuppression` is off because it gates a soft "sss" and creates false stops. `autoGainControl` is off because it lifts the silence during a pause and hides it.
  - No sound effect plays while the microphone is open; the toot plays after `close()`.
- **Permission:** when the station first opens, call `getUserMedia` once. That shows the browser's normal permission prompt, and nothing else. Stop its tracks right away. Each Go tap opens a fresh stream, without a prompt once permission is granted. There are no extra dialogs, no settings switch, and no text about recording.
- **Level:** every animation frame, read `getFloatTimeDomainData`, compute RMS in dBFS, and pass `{ db, t }` to the detector. The loop runs only during a try (at most 5 s), and its frame time is guarded against negative values.
- **Detector:** `js/blend-detect.js`, pure, with no DOM, so it can be tested in node.
  - **Calibration:** the first 300 ms. Noise floor = the median dB. Threshold on = `max(floor + 12, -52)`. Threshold off = on - 5.
  - **Quiet child (internal, nothing on screen):** after two tries in a row with no run of at least 250 ms, lower the on threshold to floor + 8 for this visit.
  - API: `createDetector(opts)` returns `{ push(db, tMs) -> { phase: 'calibrating'|'listening'|'done', voiced, level01, result: null|'smooth'|'gap'|'quiet' } }`. `voiced` flips with the hold times above. The screen reads `voiced` on every frame and cuts or moves on that same frame.
- **Privacy is a build rule, enforced by tests, not shown in the app.**
  - Audio is analysed for loudness only, in memory.
  - Never use `MediaRecorder`, never copy samples into storage (localStorage, IndexedDB, the Cache API), and never send anything over the network (no `fetch`, XHR, `sendBeacon` or WebSocket in `js/mic.js`, `js/blend-detect.js` or `js/screens/ride.js`).
  - No Grownups switch and no privacy or recording text in the UI (owner's decision).
- **Heat:**
  - No loop before Go, between tries, or after leaving.
  - `close()` stops every track (`track.stop()`), disconnects the nodes, calls `ctx.close()`, and cancels the frame.
  - The screen's `cleanup`, the route change and `visibilitychange` (hidden) all call `close()`.

### The one fallback
- **No microphone** (`!navigator.mediaDevices?.getUserMedia`), or **permission denied** (the promise rejects): no Go button and no gauge. Show one plain button, **"That was smooth"**, under the word. Each tap runs the success animation and fills a star. No warning text. The parent bar just says: "Say the word together in one long sound. When it is smooth, tap That was smooth."
- **With a working microphone,** the same button appears only after 3 tries in a row on one word that were not smooth. This keeps a child from getting stuck in a noisy room, without any message about noise. The shell's Skip button also always works.
- **The slide-to-blend slider is always under the word,** in both modes. It is the same `slide-band` as Saying Sounds (`slideBlend`).

### Words and where the stop goes
- **Stop:** `{ "id": "r1", "kind": "ride", "title": "Smooth Ride", "after": 4, "rounds": 5, "offHoldMs": 40, "onHoldMs": 30, "gapMs": 100, "minRunMs": 500, "endMs": 600, "words": ["am","ma","at","sam","sat","mat","sis","miss","sit"] }`. Put it **first** in `checkpoints`, before b1.
- At runtime `rideWords(curriculum, ck)` keeps the words whose letters are all taught by `after`, and where every letter except the last is a held sound (`hold: true`). A clipped sound is allowed only at the end, where the voice can stay on up to it. Two-letter words come first, then three, and the list is cut to `rounds`.
- **Current order** (m a s t f ...), after lesson 4 (m a s t): **am, ma, at, sam, sat**. The stop comes before Story 1 (after lesson 8).
- **New order** (m a s i ...), after lesson 4 (m a s i): **am, ma, sam, sis, miss**. Book 1 is also after lesson 4, and because `r1` is earlier in the array, the ride stop sits **just before** the book stop.
- "as" and "is" are left out: their s says z (the `S_SAYS_Z` rule in check-content).
- Phase E's gen run keeps `r1` (the `filter((k) => k.kind)` already does), with `after: 4`.

### Exact changes
1. New `js/blend-detect.js` (detector, as specified above).
2. New `js/mic.js`:
   - `export async function askPermission()`: getUserMedia, then stop the tracks; returns true or false.
   - `export async function openMic()`: returns `{ readDb(), close() }`, or throws. `close()` is safe to call twice.
   - Sets `window.__ride = { open, ctxState, tracksLive }` for tests.
3. New `js/screens/ride.js`: `rideBuild({ checkpoint, curriculum, store, speech, refresh, setProgress, setDone })`.
   - Scene, gauge, the try state machine, the hard-cut stop, the fallback button and the slider, all as above.
   - Puffs live in one `.ride-puffs` layer, and each puff's Animation is kept in an array so the cut can cancel them all.
   - Return the same object shape as sack (`el`, `parts`, `script`, `gist`, `again`, `cleanup`).
   - `el.dataset`: `round`, `result` (`''|'smooth'|'gap'|'quiet'`), `mode` (`'mic'|'tap'`), `moving` (`'1'|'0'`).
   - For tests, push `{ t, voiced, moving, puffs }` once per frame into `window.__rideFrames` (capped at 600 entries). `puffs` is `.ride-puffs` `childElementCount`.
   - After `rounds` successes, `setDone(true)`.
4. `js/art/train2d.js`: `gaugeSvg()`, a dial with its needle as `.gauge-needle` (rotated by a CSS variable, **no transition**). `stopIcon` returns `gaugeSvg()` for `kind === 'ride'`. `js/train/stations.js`: `drawGauge` for icon `'gauge'`. `home3d.js`: `icon` is `'gauge'` for a ride.
5. `js/screens/checkpoint.js`: for `kind === 'ride'`, `steps: ck.rounds`, `stepNoun: 'Word'`, `seenKeys: ['ride']`, then `rideBuild`. `finish.js`: heading "Smooth ride!" for `kind === 'ride'`.
6. `js/lessons.js`: `rideWords(curriculum, ck)`. `data/curriculum.json`: the `r1` entry, and `games.ride = { "say": "Tap the whistle. Then say the word with your grown-up in one long sound." }`.
7. `css/app.css`: `.ride-*` and `.gauge-*` styles. Touch targets of at least 64 px. Gauge and button must not overlap the track at 360x780 or 915x412. No CSS transitions on the engine position, puffs or needle.
8. `sw.js`: add `js/blend-detect.js`, `js/mic.js` and `js/screens/ride.js`.
9. `test/check-content.mjs` ride checks:
   - `rideWords(c, ck).length === ck.rounds`
   - every word uses only taught letters, has held sounds except the last, and is not in `S_SAYS_Z`
   - `offHoldMs` is between 20 and 80, and `gapMs` is between 60 and 200
10. `test/lib.mjs`: `launch(pw, args = [])` passes `args` to `chromium.launch` (both the normal and the fallback path).
11. New `test/ride.mjs` (add it to npm test after `book.mjs`):
    - **Part 1, node only, no browser (fast):** import `createDetector`, then feed synthetic dB arrays at 10 ms steps, with defaults from the data.
      - (a) 300 ms at -70, 1000 ms at -30, 700 ms at -70: `smooth`, and `voiced` turns false within 40 to 50 ms of the drop.
      - (b) the same with one 10 ms dip to -70: `voiced` never turns false (the hold covers it).
      - (c) a 60 ms dip in the middle: `voiced` turns false (the visible cut), and the result is still `smooth` (below `gapMs`).
      - (d) a 200 ms dip in the middle: result `gap`.
      - (e) 900 ms of voice, 90 ms of silence, 60 ms of voice, then silence (the final t): `smooth`.
      - (f) a 20 ms click at -20 on silence: never `voiced`.
      - (g) the whole run at -60 (10 dB over a -70 floor): `quiet`.
      - (h) a negative time step does not crash or give a negative duration.
    - **Part 2, Chromium fake microphone.** Write two WAV files (16-bit mono 48 kHz, made in the test with a small writer) to `_test/`:
      - `smooth.wav`: 0.4 s of noise at amplitude 0.002, 1.2 s of a 200 Hz tone at 0.3 plus the noise, 3 s of noise.
      - `gap.wav`: 0.4 s noise, 0.5 s tone, 0.35 s noise, 0.5 s tone, 3 s noise.
      - Per file, launch with `['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--use-file-for-fake-audio-capture=' + file]`.
      - Seed lessons done through 4. Open `#/checkpoint/r1`, tap Go, and wait up to 8 s for `dataset.result`.
      - Expect `smooth` or `gap` respectively.
      - Chromium starts the file when capture opens and loops it, so the timing is approximate. If a verdict is wrong because of the fake device and not the code, log it instead of failing, and keep every assert below.
    - **The hard cut, same frame:** in `window.__rideFrames` from the gap run, every frame with `voiced === false` after the first voiced frame has `moving === false` **and** `puffs === 0`. There must be at least one such frame.
    - **Heat and cleanup:**
      - During the try, `window.__ride.open` is true.
      - After the try: `tracksLive === 0` and `ctxState === 'closed'`.
      - After `location.hash = '#/home'`, the same, and the RAF_COUNTER (from `test/train.mjs` line 319) shows ≤ 2 frames in 3 s.
      - Idle 3 s before Go: ≤ 2 frames.
    - **Privacy (code level):**
      - Read `js/mic.js`, `js/blend-detect.js` and `js/screens/ride.js` in node. They contain none of `MediaRecorder`, `fetch(`, `XMLHttpRequest`, `sendBeacon`, `WebSocket`, `localStorage`, `indexedDB` or `caches.`.
      - No file in `js/` contains `MediaRecorder`.
      - During the browser run, every request URL is one of the app's static files.
      - After the run, `localStorage` holds nothing new except the usual `reading.v1` progress keys (no field longer than 2 KB).
    - **No-mic and denied runs:**
      - `getUserMedia` stubbed to reject, and a second run with `navigator.mediaDevices` removed: `mode === 'tap'`, a "That was smooth" button, no Go and no gauge.
      - Five taps lead to Finish.
      - The page text contains none of `record`, `privacy` or `microphone`.
      - No console errors.

### Suites to run
`node test/ride.mjs`, `node test/check-content.mjs`, `node test/sack.mjs` (map and Grownups now see 2 stops), `node test/map.mjs`.

### Commit
`Smooth Ride: a blending station where the voice keeps the train rolling` plus attribution.

### Done when
- [ ] The stop appears before Story 1. It works with the mic, and with the mic denied or missing (tap button and slider).
- [ ] The train and the steam cut on the same frame as voice-off (the frame log proves it), and the detector unit cases pass
- [ ] The mic closes on every exit, with no idle frames. There is no mic switch or privacy text in the UI, and the code-level privacy tests pass.
- [ ] Suites green, 1.7.2, commit and push
- [ ] The phone checklist below is handed to the owner in the phase reply

### What only the phone can prove (owner to try)
1. Say "mmmaaa" smoothly: the train rolls all the way, with no stutter in the middle.
2. Say "m ... a" with a clear stop: the train and steam stop **at once**.
3. "sssaaam" spoken quietly: the soft s must still count as voice.
4. Tap the table while silent: the train must not start.
5. Deny permission once: the "That was smooth" button and the slider appear.
6. After leaving the station, the phone's microphone indicator goes off.
7. The phone stays cool after 5 minutes on the station.

If the train stutters inside good sounds, raise `offHoldMs` to 60 in curriculum.json. If it feels late to stop, lower it to 30.

### Note for the owner (not in the app)
- The core teaching idea, live feedback that shows when a child leaves gaps between sounds, is the same idea as in the article.
- Our expression is different: a train whose motion and steam depend on the voice, a steam gauge instead of a waveform, no flying or falling character, our own wording and art, and a hard stop instead of a falling animation.
- In general, ideas are not protected by copyright, but specific methods can be patented, and the wording and visuals of an app are protected.
- **Before selling,** have an IP lawyer check, including a quick patent search on "speech blending feedback pause detection". Never name or point to the other product in the app or its marketing.
- "Keep your voice on" is a common phrase among reading teachers. If the lawyer flags it, the parent line can change to "Keep the steam going".

---

## Phase D: Book 2 (v1.7.3), needs the owner's OK on the text first (owner question 4)

### Decisions
- Book 2 continues the story of Pip, Sam, Sis and {name}. It uses only **m a s i t p**, plus the allowed sight words "is" and "I" and the name.
- Under the new order (Phase E) that is everything taught by lesson 6. Under the current order, p is lesson 10, so until Phase E the stop sits after lesson 10.
- Book 2 is the second "book stop". The owner asked for the same story, or one that builds on it, for at least the first two book stops; Book 2 builds on Book 1.
- The other two former Sound Station places get book stops later, when Books 3 and 4 are written. Not in this plan.

### Book 2 draft (for owner review; bold = the child reads)
Title: **Pip and the Map**
1. Toot toot! The little train is back. Pip, {name}, Sam and Sis climb on board. *Tap: Pip's whistle.*
2. Pip holds up a big paper with lines and a red X. "Look!" says Pip. "It is a ..." **map**. *Slider on "map".*
3. The red X is at the very top of the hill, right at the ... **tip**. "Tip-top!" says Pip.
4. Sis is tired. She wants to ... **sit**. *Slider on "sit".*
5. Sis sits down on a soft ... **mat**. *Tap: Sis bounces.*
6. Off they go! Up, up, up the big hill. *Drag the train (no reading).*
7. A puppy runs next to the track. Sam gives it a gentle ... **pat**. *Tap: the puppy wiggles.*
8. At the top they find a picnic! Pip takes a big bite. It is so good. Pip says ... *(child says the sound)* **mmmm**.
9. Pip pours a cup of cold water. {name} takes a little ... **sip**. *Tap: the cup bounces.*
10. Sam wants to play a game. He runs to {name} and gives a soft ... **tap**. "You are it!" Everyone laughs. *Tap: {name} waves.*
11. The sun goes down. Everyone climbs back on the train. Pip asks, "Who was the best helper today?" Sam says ... **It is** ... {name}! The end. Toot toot!
12. Review: **map · tip · sit · mat · pat · sip · tap · It is**

Notes for the owner:
- "It" has a capital I (shown in the font, like "Sam" in Book 1).
- "is" is the allowed sight word.
- The name on page 11 is read by the grown-up.

### Exact changes
1. New `data/books/book-2.json` in the Book 1 format. Page objects:
   - p1: train, pip wave, tap toot
   - p2: child "map", slider "map", emoji 🗺️, tap giggle
   - p3: child "tip", after "\"Tip-top!\" says Pip.", emoji ⛰️
   - p4: child "sit", slider "sit", emoji 👧
   - p5: child "mat", emoji 👧, tap bounce, label "Sis"
   - p6: kind drag
   - p7: child "pat", emoji 🐶, tap giggle, label "the puppy"
   - p8: sound "mmmm", emoji 🧺
   - p9: child "sip", emoji 🥤, tap bounce, label "the cup"
   - p10: child "tap", after "\"You are it!\" Everyone laughs.", friend, tap wave, label "{name}"
   - p11: child "It is", after "... {name}! The end. Toot toot!", train, pip cheer, friend
   - p12: review words as above
   - `needs: ["m","a","s","i","t","p"]`, `sight: ["is","I"]`
2. `data/curriculum.json`: add `{ "id": "b2", "kind": "book", "title": "Story 2", "book": "book-2", "needs": ["m","a","s","i","t","p"], "after": 10 }` after b1.
3. `sw.js`: add `data/books/book-2.json`.
4. `test/book.mjs`: run the walk for each book checkpoint (loop over `CUR.checkpoints.filter((k) => k.kind === 'book')`). Page counts come from the JSON.

### Suites
`node test/check-content.mjs`, `node test/book.mjs`, `node test/map.mjs`.

### Commit
`Story 2 (Pip and the Map) on the line` plus attribution.

### Done when
- [ ] The owner approved the text (or his edits are applied)
- [ ] check-content proves every child word uses only m a s i t p or the sight words
- [ ] Suites green, 1.7.3, commit and push

---

## Phase E (LATER, approved, not built yet): new sound order m a s i t p n f d h g b l (v1.7.4)

### Decisions
- Lessons 1 to 3 (m a s) do not change. Lessons 4 to 13 are rebuilt by `tools/gen-lessons.mjs` from its `TABLE`, so no lesson is edited by hand.
- **Saved progress stays by lesson number.** For a child at lesson 3 or earlier, nothing changes. A child past lesson 3 would find different letters behind the lessons already done. Owner question 3: if that applies, add a one-time mapping by sound in `store.load()`.
- Book and ride stops move by themselves: gen writes each book's `after` from `needs`. Expected results: r1 after 4, b1 after 4 (r1 first), b2 after 6.

### Exact changes
1. `tools/gen-lessons.mjs` `TABLE`: reorder the rows to i, t, p, n, f, d, h, g, b, l, and set `n` to 4 through 13. In each row, change only these fields (everything else, such as `say`, `how`, `tiles`, `compounds`, `practice` and `qc`, moves with its letter as it is):

   | n | k | words (letter words, taught letters only) | pic | qc |
   |---|---|---|---|---|
   | 4 | i | `['sis', 'miss', 'am']` | igloo | letter, others `['m','s']` |
   | 5 | t | `['at', 'sit', 'mat']` | table | letter, others `['m','a']` |
   | 6 | p | `['pat', 'tip', 'map']` | pig | letter, others `['s','t']` |
   | 7 | n | `['man', 'pin', 'tan']` | nut | picture nut, others window, chair |
   | 8 | f | `['fan', 'fit', 'fin']` | fish | picture fish, others wagon, camel |
   | 9 | d | `['dad', 'sad', 'dip']` | duck | letter, others `['m','t']` |
   | 10 | h | `['hat', 'him', 'hid']` | hippo | picture hand, others robot, yarn |
   | 11 | g | `['tag', 'dig', 'pig']` | goat | picture goat, others rabbit, van |
   | 12 | b | `['bat', 'bad', 'big']` | ball | letter, others `['m','t']` |
   | 13 | l | `['lap', 'lip', 'lid']` | leaf | picture leaf, others umbrella, van |

   - check-content requires at least one letter word to contain the lesson's sound (line about 255). For lesson 4, "sis" and "miss" do.
   - `review` is worked out by gen (the two previous sounds).
   - Hunt and Barn distractor letters are visual only and stay with their letter.
2. In gen, after building lessons: for each checkpoint with `needs`, set `after` to the first lesson number by which every needed sound is taught. Ride `r1` keeps `after: 4`.
3. Run `node tools/gen-lessons.mjs`. Gen also rewrites the picture list in sw.js.
4. `test/check-content.mjs`:
   - The existing per-lesson rule (`allowed` set, line about 250) already proves that every shown letter word uses only taught sounds. Add the same check for `quickCheck` letter options and for every book word and ride word, against `after`.
   - Assert the order: `c.lessons.map((L) => L.sound).join('') === 'masitpnfdhgbl'`.
5. Update the docs: the README lesson table, and the `test/round3.mjs` header comment (it says "t f d g i n p h b l"). Change any test message that names a specific lesson's letter. Find them with `grep -n "lesson [0-9]* (\|t f d g" test/*.mjs`.

### Suites
`node test/check-content.mjs`, `node test/round3.mjs`, `node test/newletter.mjs`, `node test/book.mjs`, `node test/games.mjs`, `node test/map.mjs`.

### Commit
`New sound order m a s i t p n f d h g b l (lessons 4 to 13 rebuilt)` plus attribution.

### Done when
- [ ] The order is asserted; every word uses only taught sounds
- [ ] r1 and b1 after 4, b2 after 6
- [ ] Suites green, 1.7.4, commit and push

---

## Phase F (LATER, approved, not built yet): character creator (v1.7.5)

### Decisions
- Stored on the device only, in `state.character` (from Phase C):
  - `{ name, skin: 0-5, hair: 'short'|'curly'|'puffs'|'ponytail'|'bun', hairColor: 0-5 }`
  - Six skin tones: `#F6D3B8 #E8B48F #D19A6E #B07A4F #8A5A36 #5E3B22`
  - Six hair colours: `#2B1B12 #5A3A22 #8A5A2B #C98B3A #E3C07A #B5442E`
- `cleanCharacter` whitelists every field and falls back to index 2, `'short'` and index 1.
- It is never sent anywhere (there is no network code) and never passed to text-to-speech.
- **Where it shows:**
  - (1) **Home railway:** the 3D child stands on the platform of the current stop and waves when the train arrives. This needs no change to the train's geometry and adds one small figure, with no idle loop. Owner question 5 asks whether he would rather have the child riding in the train.
  - (2) The lesson and checkpoint **finish screens**, beside Pip.
  - (3) **The books**, replacing the 🧒 placeholder in `art.friend`.

### Exact changes
1. New `js/art/kid.js`: `kidSvg({ skin, hair, hairColor, pose: 'idle'|'wave' })`. Same style and size box as `pipSvg` (120x150), no text, `aria-hidden`, unique gradient ids.
2. New `js/train/kid3d.js`: `buildKid(bag, character)`, from spheres and capsules like `pip3d.js`, with hair shapes per style. `wave(on)` and no `tick` loop (a one-shot WAAPI-free wave driven by the existing arrival frames only).
3. `js/screens/home3d.js`: after the stations are built, add the kid beside the current stop's platform sign. Wave during the arrival only. Dispose it with the bag.
4. `js/screens/finish.js`: append `kidSvg(store.character())` beside Pip in both finish views.
5. `js/screens/book.js`: `art.friend` renders `kidSvg(...)`.
6. `js/screens/grownups.js`: the "Your child" section becomes the creator: the name input (already there), six round skin swatches, five hair-style buttons with mini previews, six hair swatches, and a live `kidSvg` preview. Every control is a `button` with `aria-pressed` and is at least 48 px. Text: "Saved only on this device. Never sent anywhere."
7. `js/store.js`: extend `cleanCharacter`.
8. `sw.js`: add `js/art/kid.js` and `js/train/kid3d.js`.
9. New `test/character.mjs` (add it to npm test):
   - Grownups: set a name, skin 4, hair `'puffs'` and colour 3. Reload; the stored values come back.
   - Bad stored values (`skin: 99`, `hair: '<b>'`) are cleaned.
   - The finish screen shows `.kid` with the chosen skin fill.
   - Book 1 page 2 shows `.kid`.
   - Home 3D has a mesh named `kid` (expose it through `window.__train`).
   - No request URL or body contains the name. `window.__spoken` never contains it.
   - Heat idle check on Home: ≤ 2 frames in 3 s.

### Suites
`node test/character.mjs`, `node test/book.mjs`, `node test/train.mjs`, then the full `npm test` once (background), because this is the last phase.

### Commit
`Character creator: your child on the railway, the finish screen and in the stories` plus attribution.

### Done when
- [ ] The creator works and survives a reload; the values are cleaned
- [ ] Shown on Home, the finish screens and the books
- [ ] No network use or speech of the name; heat stays green
- [ ] Full npm test green, 1.7.5, commit and push

---

## Questions for the owner (only the ones that change what gets built)
1. **Word Cars:** the plan maps it to Saying Words (compound words, sun + hat). Did you mean Saying Sounds (blending m-a-p) instead? Swapping is one string.
2. **Blending station name:** Smooth Ride (recommended), Full Steam, or Keep It Rolling?
3. **Before Phase E:** has your child finished any lesson after lesson 3? If yes, the plan adds a one-time move of progress by sound. If no, nothing is needed.
4. **Book 2 text:** approve or edit the draft above (Phase D waits for this).
5. **Character on Home:** waiting on the current platform (planned), or riding in the train?

Flags, not questions:
- a has only "apple" as a good Practicing Words picture; astronaut is left out.
- i has only "igloo", which many small children don't know.
- tree is left out for t (it starts with "tr").
- l is treated as clipped.
- Have an IP lawyer look at Smooth Ride before selling (see the note at the end of Phase C2).
