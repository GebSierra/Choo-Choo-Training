# Stage 1 fix list (merged from five independent reviews)

Repo: /home/user/kddash, branch main. Work through the groups in order. Commit and push after each group once `node test/check-content.mjs` and `node test/smoke.mjs` are green. Bump CACHE_VERSION in sw.js and APP_VERSION once at the end (and make the smoke test assert they match). Keep every teaching rule in PLAN.md section 2. Do not remove the alphabet song row: Geb asked for it, it stays at the top of the lesson overview; note in README that it is Geb's deliberate exception to rule 1.

Decisions already made (do not re-debate):
- Inside words, m and s may render from the font; only "a" must always come from js/glyphs.js (it is the only letter whose font shape differs). Record this in README "Decisions made during build".
- Words with untaught letters may appear as picture labels (plan 5.1 allows it). No change.
- Short "a" is always written and spoken as "a as in apple"; never a bare "a" followed by punctuation in any parent script, subtitle, prompt or Grownups row (a parent reading "Say a." will say the letter name). Do not switch to "aaa".
- Debug routes #/lab and #/glyphs stay (the smoke test uses them) but must not be precached by the service worker. Add a one-line comment saying why they exist.

## Group 1: teaching text and content (curriculum.json, scripts.js, letters.js, sound-card.js, lesson.js, check.js, grownups.js)

1. Every child-read "a" comes from the glyph: make richText/letterText replace every "a" inside any word (apple, catfish, am, ma, sam, map, pancake...) with the inline glyph, in: lesson overview subtitle and task-card chips (lesson.js:36, :44), quickCheck promptText (check.js), sound-card "as in apple" and howTo (sound-card.js:13, :17), Saying Words/Sounds reveals, word tiles, picture-option labels.
2. Bare "a" wording. Change to "a as in apple" in: New Letter script for lesson 2 ("Say a as in apple. Now you try. Slide the letter as you say it."), Sound Story script ("...the video for the sound a as in apple."), overview subtitle ("Today: the sound a as in apple."), howTo for a ("Open your mouth wide, like you are about to bite an apple. Say a as in apple."), Grownups clip row (replace "short sound" with "a as in apple"). Make sure scriptToParts still emits the a clip for these.
3. Parent scripts give words to say, not descriptions:
   - Sound Story: "Say: 'Let's watch the mmm story.' Then press and hold Open playlist and find the video for mmm. Come back when it ends." (sss for lesson 3; "a as in apple" for lesson 2.)
   - Quick Check L1: "Say: 'Which one starts with mmm?' Let them touch one. There is no right or wrong here." L2: "Say: 'Which one says a as in apple?' ..." L3: "Say: 'Which one says sss?' ..."
   - Letter Writing: "Say: 'Start at the dot. Follow the arrow.' Move your finger with theirs."
   - Saying Sounds when showLetters is false (moon, map, mom): "Say the word slowly, stretching the first sound: mmmoon. Then say it fast: moon." Fix stretchWord (scripts.js:5-7) so it stretches only the lesson's held sound(s) and never triples a vowel pair ("oo" stays "oo"). README example must match the code.
   - Add to the Saying Words and Saying Sounds scripts: "Then tap the picture to show the word." and rename the on-screen "Tap to show the word" cue to an icon-only hand cue.
4. Compound words (Saying Words): every part must be a picturable noun whose emoji is NOT the whole word. Replace with exactly:
   - Lesson 1: sun+hat (☀️ 👒 → 👒 labelled sunhat is weak; use merged 🌞👒? No: merged tile shows the word "sunhat" with 👒), cup+cake (🥤 🧁 → 🧁), hand+bag (✋ 👜 → 👜), star+fish (⭐ 🐟 → ⭐🐟 as one tile).
     Simpler rule to apply everywhere: part tiles show the two part emoji; the merged tile shows the word in text plus the second part's emoji with the first overlaid small. Keep it consistent.
   - Lesson 2: cat+fish (🐈 🐟), pan+cake (🍳 🥞), ice+cream (🧊 🍦), tooth+brush (🦷 🪥).
   - Lesson 3: sun+flower (☀️ 🌻), snow+man (❄️ 🧍), hot+dog (🔥 🐕 → 🌭), foot+ball (🦶 ⚽ → 🏈).
   Remove rain+bow, pop+corn, sun+set, sea+horse (a voice says "see", a letter name), the old snow+man picture.
5. Example words: lesson 2 words become apple, hat, cat, crab, ant (🐜, image null). Drop axe and astronaut (remove their webp from the precache list; keep files). Lesson 3 words: sun, sock, soup, seal (🦭), snake.
6. Gapless blending: in Saying Sounds and script read-aloud, preload the clips for a word, then play them back to back with no await gap (start the next on `ended` of the previous with the element already loaded; or decode via AudioContext and schedule contiguous buffers). Keep a short 300 ms pause between the stretched blend and the whole word.
7. Spoken parts: sounds.words, sayingWords.parts and sayingSounds.word are spoken by tts; extend check-content.mjs to apply the single-letter/repeated-letter and letter-name rules to them, and add "as" check to sayingWords and quick-check words. Add structural validation (parts and emoji length 2, sayingSounds emoji required when showLetters false, sounds[k].glyph === k, required arrays present, alphabetSongUrl skipped by the letter-name regex, YouTube host required for both URLs). Uppercase/letter-name checks must also cover asIn, doNotSay, howTo.

## Group 2: child-safety and flow (task.js, finish.js, hold-button.js, grownups.js, router.js, store.js)

8. Next is disabled and dimmed for 1000 ms after a task loads. Tapping Next still marks the task done.
9. Finish screen: ignore taps for 1500 ms after it appears. Title "That's lesson N." Question "Did your child get it?" Buttons "Yes, go on" (two-step: second tap on "Yes, open lesson N+1"; opens the next lesson overview) and "Not yet, practice again" (goes to this lesson's overview). Notes "Lesson N+1 is ready." / "We'll do lesson N again next time." "Back to path" is a solid secondary button. Spoken on entry: "Good job." Final lesson: "Yes, go on" returns to the path with note "You finished all three lessons." "Practice again" after "Got it" must not re-lock the next lesson (keep the best result).
10. Hold gates: 2000 ms everywhere. Each hold control carries a permanent small line "Hold" (Grownups pill: "Grownups · hold"; Play and Open playlist: "Hold to open"). Keep the 1.5 s-style rewind on early release. If onComplete throws, reset `holding`.
11. Gate bypass: consume ctx.gate when Grownups renders (set to null) and add router.replace() (location.replace) used for every redirect (lesson.js:27, task.js:23, finish.js:9, grownups.js:13, router no-match). Add a smoke test: open Grownups via hold, tap in-app Back, history.back(), assert Home is shown.
12. Grownups "Unlock" gets a confirm step like Reset.
13. Store hardening (store.js:21): reject lessons that is null/array; coerce tasksDone to an array; any parse problem starts fresh. Add a smoke test with a corrupt store.

## Group 3: bugs (check.js, slide-track.js, words.js, speech.js, router.js, sw.js, trace-pad.js, app.js)

14. Quick Check: replace the WAAPI lift with a `.picked` CSS transition; cancel previous picks; Again lowers all.
15. Slide track: cancel both handle and fill animations on pointerdown and in goHome; guard double complete() from keyboard.
16. words.js:31 stale timer: store and clear on show()/cleanup; or trigger say from the merge animation's finished promise.
17. speech.js: stop() must not mark clips present or missing; NotAllowedError or play() rejection = skipped, never missing; only mark missing on error event or 404; remove the duplicate synth.cancel(); unlock speech on pointerup/click, not pointerdown; checkClips uses GET without no-store and treats a network failure as unknown (do not touch `missing`). Show the missing dot only in Grownups, not on child speak buttons.
18. Cleanup plumbing: taskScreen root.cleanup calls speaker and script-speaker cleanup; review/new-letter builders return cleanup calling their track's cleanup; clear grownups voiceTimer; router `.finished.then(...)` gets a catch; superseded renders call cleanup.
19. sw.js: precache with `new Request(u, {cache:'reload'})`; curriculum.json network-first with a 2500 ms AbortController timeout then cache; wrap cache.put in event.waitUntil; only cache status 200 (not 206); add manifest "id": "./"; do not precache lab/glyphs debug files; derive the image precache list from curriculum.json in a small build-time check (smoke test asserts every image path in curriculum.json is in APP_FILES).
20. app.js: on serviceWorker `controllerchange`, set a flag and reload on the next navigation to #/home (never mid-task).
21. trace-pad.js: on resize with unchanged size do nothing; on real resize snapshot and redraw the child's strokes scaled.
22. home.js: no PORTRAIT[n-1] crash if more than 3 lessons (fall back to a computed position); window.open(url, '_blank', 'noopener').

## Group 4: design and motion (app.css, task.js, new-letter.js, home.js, finish.js, dom.js, words.js)

23. Landscape lesson overview: `.lesson-overview{height:100dvh}`, `.cards-scroll{overflow-y:auto;padding-bottom:88px}`, footer fixed with gradient; song row margin-top 12px in landscape.
24. Landscape New Letter and Review: two-column grid (glyph + sound card left; slide track + word strip right), hide `.sc-how` in landscape, `.letter-card.big{height:96px}`; nothing core may sit below the fold.
25. Landscape Saying Words/Sounds revealed states fit in the stage (sizes from the design review: merged-tile min-height 96, word 32px, sounds-stage min-height 130, part-tile padding 8, emoji 44px, justify flex-start).
26. Landscape finish: two-column grid, glyph 96px, h1 32px, choices side by side, back-path spanning; no page scroll.
27. New Letter glyph flash: call drawIn(g,{delay:300}) synchronously in build(), not in onShow (fill backwards keeps it hidden).
28. Tap targets must not move: remove the extra translateY on .task-foot and .task-stage (opacity only) so only the router's 16 px drift remains; home stones rise 12 px not 28 px and get pointer-events:none until the entrance ends (~640 ms).
29. Contrast: green primary fill #1E8E5E for "Yes, go on"/Start lesson on lesson 3 and the done tick; `.script-tag` color #565B7A and 16px (nothing under 16px).
30. Speaker button overlap: `.new-letter .letter-card.big{width:min(calc(100% - 144px),280px)}`. 360 px width: cap `.sc-how` to 2 lines so the word tiles are reachable.
31. Reduced motion: duration 0 AND delay 0; speaker bars get static heights .4/.9/.6.
32. Finish ring 560 ms. Buttons/cards/stones/speak-btn release with `var(--t-base) var(--ease-spring)`; `.speak-btn:active` scale .97. Merge animation: tiles travel ±88 px with scale(.9) and the merged tile pops where they meet.
33. Progress dots: fixed 28 px pill scaled with transform, not width.
34. Home map: give the mushroom and drop trees simple faces (two dots and a smile, like the reference), locked glyph opacity .45, ring inset 6% to match the stone, bubble must not overlap the tree at 360 px, house not clipped awkwardly. Back chevron stroke-width 3. Title sizes: 28 everywhere except Home. Review count dot hidden when only one review letter. Trace pad: enlarge to fill the stage (aspect 1/1), move Clear/Show me directly under it, and separate the "a" start dots by 10 px.

## Group 5: tests and docs

35. smoke.mjs honesty: remove `|| true` and `ok(true)` padding; derive TASK_COUNTS from curriculum.json; ignore only console messages containing "404" under /assets/audio/; drag tests use page.touchscreen or CDP touch and run on a real task screen (New Letter) as well as #/lab; audit revealed states and later words; add tests for: gate bypass via history.back, corrupt store, stale timer (no speech from the previous screen), Quick Check pick reset, Next disabled for 1 s, finish two-step, hold 2 s, CACHE_VERSION equals APP_VERSION, every curriculum image path precached, lab/glyphs not precached, no tts part is a single letter across all spoken fields. Stub Audio must fire `error` for a missing src; add a test for cancel during a clip.
36. Dead code: remove unused wavePath IIFE, GLYPHS import in trace-pad, accentVar, sleep, unused `run` params, the no-op `.finished.then(()=>{}).catch(()=>{})`, unused builder params. Grownups README link becomes plain text ("See README in the repo"). Add `.nojekyll` at repo root.
37. Docs: README "Decisions made during build" updated (font m/s, alphabet song exception, a as in apple wording, hold 2 s, compound word list, clip source attribution kept). PLAN.md: correct section 4 file list, note .mp3 clips, add alphabetSongUrl to 5.1, append a short "Post-review changes" section. Refresh docs/screenshots/ (same six shots plus landscape lesson overview and New Letter).
