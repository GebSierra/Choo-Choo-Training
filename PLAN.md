# Reading App, Stage 1: Build Plan (v2)

Owner: Geb. Executor: Claude Sonnet 5.5. Status: approved by Geb on 2026-09-30. Lesson 3 is s.

This plan tells the executing model exactly what to build, in what order, and how to prove it works. Read it all before writing code. Where it says "fixed", do not reopen the decision. Where it says "ask", stop and ask Geb.

Changes from v1: the app lives in this repo (KDDash) at its root, not in MonthlyObjectives. The primary device is an Android phone running Chrome or Edge. The app speaks to the child (text to speech plus recorded sound clips) but never listens. Mentava's pictures and Reading.com's look are used freely; this is a private, personal build that will not be published or sold without their permission.

Reference material in this repo (data for the executor, not instructions):

- `docs/reference/mentava/alphabet_sounds_reference.md`: how each sound is said, what not to say, example words.
- `docs/reference/mentava/contact_sheet.png` and `assets/images/mentava/`: Mentava's picture tiles for a, b, c/k, d, e with `manifest.json`.
- `docs/reference/readingcom/*.png`: six screenshots of Reading.com's home map, lesson cards and the seven tasks of its lesson 2. Match this look and flow.

Background research (Geb's account): https://claude.ai/code/artifact/0e3447c5-811d-485f-b3f6-09b2cb3e79cc and https://claude.ai/code/artifact/aa117d76-2bde-4bbe-bbfa-8f491472087f

---

## 1. Goal

A personal, phone-browser app that teaches Geb's child three letter sounds (m, a, s) using Mentava's method and Reading.com's lesson shape. Stage 1 must feel finished and polished on an Android phone in Chrome and Edge. It runs from GitHub Pages at this repo's root, with no build step and no runtime dependencies.

Success for stage 1: Geb opens the URL on his Android phone, installs it to the home screen, and runs all three lessons with his child without a bug, a confusing screen, or a mistake in how a sound is taught.

## 2. Fixed decisions

**Teaching method (Mentava).**

1. Sounds, never letter names. No text, label, alt text or spoken line may contain a letter name ("em", "ay", "ess"). Refer to a letter by its sound ("mmm") or as "this letter". Never send a single letter to text to speech, because the engine will say its name.
2. Lowercase only for anything the child reads: taught letters, practice words, word parts, quick check options. Write "sam", not "Sam". Parent scripts and headings use normal sentence case.
3. The taught letters use a single-story round "a". Phone fonts draw a double-story "a", so the taught letters m, a, s are drawn from our own SVG glyphs, never from a font. The same paths drive the tracing guide.
4. Consonants are clean: "mmm" and "sss" are held sounds, never "muh" or "suh". Every sound card says how to say the sound and what not to say.
5. Blend with no pause, and never change a sound while blending. "as" is never a practice word (its s says "z"). First blend words are "am", "ma", "sam".
6. Practice each sound alone before it appears in a word.
7. Hearing comes before saying. Never correct the child's pronunciation; the app only instructs.
8. Neutral American accent in all wording and in the chosen speech voice.

**App principles (Geb).**

9. The app speaks but never listens. No microphone permission is ever requested by the app. The parent says every letter sound; the app does not pronounce them. The browser's text to speech reads words, prompts and instructions. Recorded clips for isolated letter sounds (see 7.5) stay in the project but play only if the parent turns on "Play recorded letter sounds" in Grownups (setting `playSounds`, off by default). With it off, a clip part in any spoken line is skipped silently and never replaced by text to speech, and the lines that would end in a clip have quiet variants in `curriculum.json`. The parent's live voice is the teacher; the app's voice supports it.
10. An adult sits with the child. Every task shows a short parent script.
11. Progress is decided by the parent, who taps "Got it" or "Practice again" at the end of each lesson. No automatic pass or fail.
12. Lesson flow copies the seven Reading.com tasks in order: Letter Review, New Letter, Sound Story, Saying Words, Saying Sounds, Letter Writing, Quick Check, with two games of our own inserted before Quick Check (see 6.4): Letter Hunt and Barn Doors. Lesson 1 has nothing to review and so has eight tasks; lessons 2 and 3 have nine.
13. Sound Story opens this YouTube playlist in a new tab and tells the parent to find the video for the lesson's sound: https://m.youtube.com/playlist?list=PL2hNdtrsO2hIINInfmEb55IpwTw0IrQZW
14. Lesson order: 1 = m, 2 = a, 3 = s.
15. Pictures: Mentava's tiles where they exist (a has six). For m and s, no tiles exist yet; use emoji until Geb extracts them from the book PDF (ask him; see section 15). Reading.com's layout, colors and card style are copied closely; its characters are not reproduced, since we only have screenshots. Add a line to `README.md`: "Private personal build. Contains material from Mentava and Reading.com. Not for publication or sale without their permission."

**Engineering.**

16. Static files at the repo root, served by GitHub Pages from `main`. Vanilla HTML, CSS and JavaScript ES modules. No framework, no bundler, no runtime npm dependencies, no CDN at runtime. Fonts and images are self-hosted. All paths are relative so the app works at `/KDDash/`.
17. Primary targets: Android Chrome and Android Edge (both Chromium). Secondary: iOS Safari should not break, but no time is spent polishing it.
18. Installable PWA that works offline after the first load. Speech falls back gracefully offline (see 7.4).
19. Progress and settings are stored in `localStorage` on the device. No accounts, no server, no analytics.
20. Work on branch `main`. The repo is empty; the first commit creates it. Commit in small steps with clear messages. Push when a step's verify gate passes. Do not open a pull request unless Geb asks.

## 3. Out of scope for stage 1

Do not build these. Leave clean seams for them.

- Lessons beyond m, a, s. The data format must allow 120 levels; only three ship.
- Readiness check (dogfish/fishdog).
- Reading.com's Books, Games, Videos tabs and Placement Assessment.
- Sound comparison pages.
- Any speech recognition.
- Uppercase letters.
- Dark mode.

## 4. Architecture

```
/
  index.html              app shell, loads js/app.js as a module
  manifest.webmanifest    name, id, icons, standalone, portrait-primary
  sw.js                   service worker: precache app shell and assets, cache-first, curriculum.json network-first
  .nojekyll               tells GitHub Pages to serve the files as they are
  package.json            npm scripts for the tests; the only dependency is Playwright for development
  css/app.css             tokens and all styles
  js/app.js               boot, router wiring, store init, first-tap unlock for speech, update reload on Home
  js/router.js            hash router: #/home, #/lesson/1, #/lesson/1/task/2, #/lesson/1/finish, #/grownups, #/lab, #/glyphs
  js/store.js             localStorage read/write, versioned schema, repairs corrupt data
  js/speech.js            say(parts): text to speech plus recorded clips, voice choice, queue, cancel
  js/glyphs.js            SVG path data for lowercase m, a, s; render and trace helpers
  js/letters.js           child-read text: every "a" drawn from the glyph
  js/lessons.js           task list per lesson, sound phrases, sound card lines
  js/scripts.js           parent scripts to speech parts, stretched words
  js/dom.js, theme.js, version.js   tiny DOM helper and animation wrapper, accent colors, APP_VERSION
  js/components/slide-track.js
  js/components/trace-pad.js
  js/components/hold-button.js
  js/components/speak-button.js   the round speaker button used on every task
  js/components/sound-card.js
  js/screens/home.js
  js/screens/lesson.js
  js/screens/task.js              the task shell around the seven tasks
  js/screens/tasks/*.js           one file per task type (seven)
  js/screens/finish.js
  js/screens/grownups.js
  js/screens/lab.js, glyphs-debug.js   debug routes #/lab and #/glyphs; loaded on demand, not precached
  data/curriculum.json    all content; code never hardcodes lesson content
  assets/fonts/           Nunito variable woff2 (covers 400, 700, 800), self-hosted
  assets/images/mentava/  Mentava tiles as shipped (PNG) plus web-sized copies (WebP, 512 px)
  assets/audio/sounds/    recorded clips m.mp3, a.mp3, s.mp3 (a .webm next to one is tried second; see 7.5)
  assets/audio/ipa/       source recordings the clips were cut from (not precached)
  icons/                  icon-192.png, icon-512.png, maskable-512.png, apple-touch-icon.png, icon.svg
  tools/record.html       stand-alone page for Geb to record sound clips on a laptop (not linked from the app)
  tools/                  make-icons.mjs, make-webp.mjs, screenshots.mjs
  test/smoke.mjs          Playwright walkthrough at Android viewports, screenshots, assertions
  test/check-content.mjs  validates curriculum.json against the fixed decisions
  test/lib.mjs, stubs.mjs, audit.mjs   shared server and browser helpers, speech stub, per-screen audits
  docs/                   reference material, screenshots, FIXES-round1.md (the review fix list)
  README.md               how to run, test, deploy, record clips, and the private-use notice
  PLAN.md                 this file
```

Rules:

- `index.html` opens directly from GitHub Pages; the router uses the URL hash.
- `sw.js` precaches every app file and every asset used by the three lessons, with a version string bumped on each content change. Total precache under 12 MB is acceptable for a personal app; convert Mentava PNGs to 512 px WebP with the Playwright ffmpeg at `/opt/pw-browsers/ffmpeg-1011/ffmpeg-linux` and ship the WebP copies (keep the PNG originals in the repo but do not precache them).
- Screens are plain functions returning a DOM element and taking `{store, router, curriculum, speech}`. No global state except the store.

## 5. Data model

### 5.1 `curriculum.json`

Speech is written as parts so that isolated sounds always come from a clip, never from text to speech. A part is `{"tts": "text"}` or `{"clip": "m"}`. If a clip is missing on the device, `speech.js` skips it (see 7.4).

```json
{
  "version": 2,
  "playlistUrl": "https://m.youtube.com/playlist?list=PL2hNdtrsO2hIINInfmEb55IpwTw0IrQZW",
  "alphabetSongUrl": "https://youtu.be/qKQAQc2NEuk",
  "sounds": {
    "m": {
      "glyph": "m",
      "sayItLike": "mmm",
      "hold": true,
      "doNotSay": "muh",
      "howTo": "Press your lips together and hum. Hold it: mmm.",
      "asIn": null,
      "clip": "assets/audio/sounds/m.mp3",
      "words": [
        {"word": "moon",   "image": null, "emoji": "🌙"},
        {"word": "map",    "image": null, "emoji": "🗺️"},
        {"word": "milk",   "image": null, "emoji": "🥛"},
        {"word": "monkey", "image": null, "emoji": "🐵"},
        {"word": "mouse",  "image": null, "emoji": "🐭"}
      ]
    },
    "a": {
      "glyph": "a",
      "sayItLike": "a",
      "hold": true,
      "doNotSay": null,
      "howTo": "Say a as in apple. Open your mouth wide.",
      "asIn": "apple",
      "clip": "assets/audio/sounds/a.mp3",
      "words": [
        {"word": "apple",     "image": "assets/images/mentava/web/a/apple.webp",     "emoji": "🍎"},
        {"word": "hat",       "image": "assets/images/mentava/web/a/hat.webp",       "emoji": "👒"},
        {"word": "cat",       "image": "assets/images/mentava/web/a/cat.webp",       "emoji": "🐈"},
        {"word": "crab",      "image": "assets/images/mentava/web/a/crab.webp",      "emoji": "🦀"},
        {"word": "astronaut", "image": "assets/images/mentava/web/a/astronaut.webp", "emoji": "🧑‍🚀"},
        {"word": "axe",       "image": "assets/images/mentava/web/a/axe.webp",       "emoji": "🪓"}
      ]
    },
    "s": {
      "glyph": "s",
      "sayItLike": "sss",
      "hold": true,
      "doNotSay": "suh",
      "howTo": "Teeth close together, push air out like a snake. Hold it: sss.",
      "asIn": null,
      "clip": "assets/audio/sounds/s.mp3",
      "words": [
        {"word": "sun",   "image": null, "emoji": "☀️"},
        {"word": "sock",  "image": null, "emoji": "🧦"},
        {"word": "snake", "image": null, "emoji": "🐍"},
        {"word": "soup",  "image": null, "emoji": "🍲"},
        {"word": "swan",  "image": null, "emoji": "🦢"}
      ]
    }
  },
  "lessons": [
    {
      "number": 1,
      "sound": "m",
      "review": [],
      "intro": [{"tts": "Today we learn a new sound:"}, {"clip": "m"}],
      "sayingWords": [
        {"parts": ["sun", "set"],  "word": "sunset",  "emoji": ["☀️", "🌇"]},
        {"parts": ["cup", "cake"], "word": "cupcake", "emoji": ["☕", "🧁"]},
        {"parts": ["pop", "corn"], "word": "popcorn", "emoji": ["💥", "🌽"]},
        {"parts": ["rain", "bow"], "word": "rainbow", "emoji": ["🌧️", "🌈"]}
      ],
      "sayingSounds": [
        {"word": "moon", "emoji": "🌙", "showLetters": false},
        {"word": "map",  "emoji": "🗺️", "showLetters": false},
        {"word": "mom",  "emoji": "👩", "showLetters": false}
      ],
      "quickCheck": {
        "prompt": [{"tts": "Which picture starts with"}, {"clip": "m"}],
        "promptText": "Which picture starts with mmm?",
        "kind": "picture",
        "options": [
          {"emoji": "🌙", "word": "moon",  "correct": true},
          {"emoji": "🍎", "word": "apple", "correct": false},
          {"emoji": "☀️", "word": "sun",   "correct": false}
        ]
      }
    },
    {
      "number": 2,
      "sound": "a",
      "review": ["m"],
      "intro": [{"tts": "Today we learn a new sound:"}, {"clip": "a"}, {"tts": "as in apple."}],
      "sayingWords": [
        {"parts": ["cat", "fish"],  "word": "catfish",  "emoji": ["🐈", "🐟"]},
        {"parts": ["pan", "cake"],  "word": "pancake",  "emoji": ["🍳", "🥞"]},
        {"parts": ["hand", "bag"],  "word": "handbag",  "emoji": ["✋", "👜"]},
        {"parts": ["star", "fish"], "word": "starfish", "emoji": ["⭐", "🐟"]}
      ],
      "sayingSounds": [
        {"word": "am", "emoji": null, "showLetters": true},
        {"word": "ma", "emoji": null, "showLetters": true},
        {"word": "map", "emoji": "🗺️", "showLetters": false}
      ],
      "quickCheck": {
        "prompt": [{"tts": "Which letter says"}, {"clip": "a"}, {"tts": "as in apple?"}],
        "promptText": "Which letter says a, as in apple?",
        "kind": "letter",
        "options": [
          {"glyph": "a", "correct": true},
          {"glyph": "m", "correct": false}
        ]
      }
    },
    {
      "number": 3,
      "sound": "s",
      "review": ["m", "a"],
      "intro": [{"tts": "Today we learn a new sound:"}, {"clip": "s"}],
      "sayingWords": [
        {"parts": ["sun", "flower"], "word": "sunflower", "emoji": ["☀️", "🌻"]},
        {"parts": ["snow", "man"],   "word": "snowman",   "emoji": ["❄️", "⛄"]},
        {"parts": ["sea", "horse"],  "word": "seahorse",  "emoji": ["🌊", "🐴"]},
        {"parts": ["foot", "ball"],  "word": "football",  "emoji": ["🦶", "🏈"]}
      ],
      "sayingSounds": [
        {"word": "sam", "emoji": null, "showLetters": true},
        {"word": "am",  "emoji": null, "showLetters": true},
        {"word": "ma",  "emoji": null, "showLetters": true}
      ],
      "quickCheck": {
        "prompt": [{"tts": "Which letter says"}, {"clip": "s"}],
        "promptText": "Which letter says sss?",
        "kind": "letter",
        "options": [
          {"glyph": "s", "correct": true},
          {"glyph": "m", "correct": false},
          {"glyph": "a", "correct": false}
        ]
      }
    }
  ]
}
```

The sample shows the shape of the data; the current word lists are in `data/curriculum.json`. `alphabetSongUrl` is Geb's optional alphabet-song row on the lesson overview (not a task, never counts toward progress). Clip paths name the `.mp3` files that ship; a `.webm` with the same name, recorded with `tools/record.html`, is tried second.

Rules enforced by `test/check-content.mjs`:

- Every `showLetters: true` word uses only the lesson's sound and its `review` sounds.
- No word anywhere is "as".
- No uppercase letter in any child-read field: `glyph`, `sayItLike`, `word`, `parts`, `sayingSounds[].word`, `quickCheck.options[]`.
- No string, spoken or shown, contains a letter name. Whole-word match against: ay, bee, cee, see, dee, ee, ef, gee, aitch, eye, jay, kay, el, em, en, oh, pee, cue, ar, ess, tee, you, vee, double, ex, wye, zee.
- No `tts` part is a single letter or a run of one repeated letter ("m", "mmm", "sss"). Isolated sounds are always `clip` parts.
- Every `image` path that is not `null` exists on disk. Every `clip` path is listed, whether or not the file exists yet.
- `lessons[i].number === i + 1`.
- Both URLs are https YouTube links. Spoken fields (`sounds[].words`, `sayingWords`, `sayingSounds`) obey the single-letter rule and never hold "as". `parts` and `emoji` of a saying word have exactly two items; a saying sound without letters has an emoji.

### 5.2 `localStorage` schema

Key `reading.v1`:

```json
{
  "schema": 1,
  "lessons": {
    "1": {"tasksDone": [0, 1, 2], "result": null, "completedAt": null}
  },
  "settings": {"voiceURI": null, "rate": 0.9, "autoSpeak": true, "playSounds": false},
  "lastOpened": "2026-10-03T14:12:00Z"
}
```

- `result` is `"got-it"`, `"practice-again"` or `null`.
- A lesson is unlocked if it is lesson 1 or the previous lesson has `result === "got-it"`. The parent can unlock any lesson from Grownups.
- All reads are wrapped in try/catch. If storage is missing or corrupt, start fresh without crashing.

## 6. Screens

Every screen: portrait first, works in landscape; safe-area insets respected; no horizontal scroll; every tap target at least 48 by 48 CSS pixels; text never smaller than 16 px; no pinch zoom; back navigation always available; nothing on a child screen leads outside the app except the Sound Story button, which sits behind the parent gate.

Every task screen has a round speaker button (7.3). Tapping it speaks the task's child-facing line. When `settings.autoSpeak` is on, the line is also spoken on entry to the task, provided the user has already tapped somewhere in the app this session (Chromium requires a user gesture before speech). The parent script card is never auto-spoken; it has its own small speaker icon.

### 6.1 Home (`#/home`)

Match `docs/reference/readingcom/01-home-map.png` in spirit: a bright, friendly landscape with numbered stones on a path and a "Grownups" pill top left.

- Three round stones, numbered 1, 2, 3, each carrying its letter glyph in the lesson's accent color, along a curving path from bottom left to top right.
- States: done (glyph plus a check), current (pulsing ring, larger, a small speech bubble that speaks "Tap to start" when tapped), locked (muted, small padlock; tapping wobbles it, nothing more).
- "Grownups" pill behind the hold gate.
- First run: one parent card ("Sit with your child. You say the sounds; the app helps. Tap a stone to start.") with a "Start" button. This tap also unlocks speech for the session.

Accept: all three states render; tapping current opens `#/lesson/N`; locked does not navigate.

### 6.2 Lesson overview (`#/lesson/N`)

Match `02-lesson-cards.png`: a row of tall colored cards, one per task, with a big number and a friendly illustration area.

- Header: back arrow, "Lesson N", a one-line summary: "Today: the sound mmm." Speaker button speaks the lesson `intro` parts.
- Task cards in a horizontal scroll (portrait) or grid (landscape). Each card: number, task name, a "Today we'll practice" line with the target letters or words, a done tick when finished. Tapping a card jumps to that task.
- Big "Start lesson" button that opens the first unfinished task.

Accept: cards show correct targets from `curriculum.json` for all three lessons; done ticks reflect the store.

### 6.3 Task shell

Match the dark list style of `03` to `06` for the task detail header, and keep the card colors for the activity area.

- Top: progress dots, one per task in this lesson, current lit. Back arrow. Task name.
- Middle: the activity, with the speaker button at its top right.
- Bottom: parent script card (grey, adult icon, small speaker icon) with the exact words to say, then two buttons: "Again" and "Next". Next marks the task done and advances. The last task's Next opens the finish screen.
- Transitions: 250 ms slide, honoring `prefers-reduced-motion`.

### 6.4 The tasks

Every lesson runs these in order (Letter Review only when there is something to review): Letter Review, New Letter, Sound Story, Saying Words, Saying Sounds, Letter Writing, Letter Hunt, Barn Doors, Quick Check. Tasks are numbered by position in the lesson; the headings below keep the original seven numbers and add the two games, so the headings read 1 to 9 and lesson 1 skips Letter Review. The spoken lines below assume `playSounds` is off, which is the default: the clip parts they mention play only when the parent turns the switch on, and each line that ends in a clip has a quiet variant (`introQuiet`, `promptQuiet`, `promptTextQuiet`).

**Task 1: Letter Review.** For each review sound: glyph on a slide track (7.1), sound card beneath. Speaker button speaks the sound's first example word via text to speech (and plays that sound's clip first when `playSounds` is on). "Next" moves through the review letters. Parent script: "Slide the letter and say its sound: mmm."

**Task 2: New Letter.** Big glyph fades in and settles. Speech on entry: `introQuiet` ("Today we learn a new letter. Your grown up will say its sound."), or `intro` with its clip when `playSounds` is on. The sound card ("This letter says mmm. Hold it. Do not say muh." plus `howTo`) is the main instruction, drawn large, because the parent carries the sound. Below it: the slide track, then the example words as a horizontal strip of picture tiles (Mentava image when present, else emoji) with the word beneath in lowercase, the target letter tinted. Tapping a tile speaks its word. Parent script: "Say mmm. Now you try. Slide the letter as you say it."

**Task 3: Sound Story.** Card: "Time for the sound story." Speech: "Time for the sound story." Parent text: "Open the playlist and find the video for the sound mmm. Come back when it ends." One large hold button "Open playlist" opens `playlistUrl` in a new tab. Nothing else navigates away.

**Task 4: Saying Words.** Two emoji tiles with a plus sign, then a merged tile. Speaker: speaks "sun" then a beat then "set". Tapping the merged tile reveals the whole emoji and word and speaks "sunset". Parent script: "I say two parts. You put them together. sun ... set. What word?" "Next word" cycles the list.

**Task 5: Saying Sounds.** If `showLetters` is true: the word's glyphs in a row with a slow left-to-right sweep (about 2 seconds, looping) so the parent stretches the sounds in time. Speaker: plays each letter's clip in order with no gap, then speaks the whole word. If `showLetters` is false: emoji only; speaker speaks the whole word. Parent script: "I stretch the sounds. You say the word. aaammm ... am." Tap to reveal the word.

**Task 6: Letter Writing.** Trace pad (7.2) with the lesson's glyph. Numbered start dots and arrows. Finger draws in the accent color. Buttons: "Clear", "Show me" (animates stroke order). Speech on entry: "Start at the dot. Follow the arrow." Parent script says the same.

**Task 7: Letter Hunt.** A storybook farm scene: sunny sky, rolling hills, a white picket fence, all own SVG. About fourteen small lowercase letters float in the sky, four or five of them the target; the rest come from `games.hunt.distractors` for the lesson's sound. A "Find this" card at the top left shows the target glyph in its accent colour (the child matches shapes; the parent says the sound). Letters are ink-coloured until touched, so colour is never a clue. m, a and s are drawn from `glyphs.js`, every other letter from the font at the same size. Touch targets are 56 px, at least 12 px apart, and bob slowly (vertical only, 4 px, paused while a finger is on that letter). A right touch pops the letter in its accent colour with a small sparkle, refills the slot after 500 ms (at least three targets always stay in the sky) and the sheep trots one step toward the barn. Five right touches take it across; it hops, waves a hoof and a bigger sparkle plays. A wrong touch gives the letter a small shake and nothing else. Five small rings under the scene fill with gold stars. No score, no sound effects, no timer. Spoken line (text to speech): `games.hunt.say`. Parent script: "Say: 'Find the letter that says mmm. Touch it.' Then say mmm together." Again resets the sheep and refreshes the sky.

**Task 8: Barn Doors.** The same farm with a big red barn and white X doors. The doors swing open from their outer edges (400 ms) on a dark interior with one big letter on a warm lit tile (about 40% of the barn width). Rounds 1 and 2 always show the target. After that about one round in three shows a distractor (never two in a row). On a target round the doors stay open and the letter breathes until it is touched: it turns to its accent colour and pops with a sparkle, the barn hops, a star fills, the doors close 600 ms later and the next round opens 900 ms after that. On a distractor round the letter shakes if touched and the doors close on their own after 2.5 s. Five stars end the game: a bigger sparkle, the barn hops twice and the doors stay open. With reduced motion the doors swap by opacity and nothing hops. Spoken line: `games.barn.say`. Parent script: "Say: 'Watch the doors. When you see the letter that says mmm, touch it.' Then say mmm together."

**Task 9: Quick Check.** `promptTextQuiet` shown and `promptQuiet` spoken ("Listen to your grown up. Then touch the letter." or "...the picture that starts the same."); with `playSounds` on, `promptText` and `prompt` (with its clip) instead. Options as large cards (picture or glyph). Child taps one; the card lifts. Nothing says right or wrong to the child. Parent script: "Ask the question. Let them tap." Then the finish screen.

### 6.5 Lesson finish

Calm, no confetti: large glyph, "Lesson N done", speech: "Lesson done. Well done." Parent question: "How did it go?" with "Got it" and "Practice again", then "Back to path".

### 6.6 Grownups (`#/grownups`)

Behind the hold gate. Shows: each lesson with result and date; "Unlock" per lesson; "Reset all progress" with confirm; the three sound cards as a reference; voice settings (voice picker from `speechSynthesis.getVoices()` filtered to `en-US`, rate slider 0.7 to 1.1, auto-speak toggle, a "Test voice" button that speaks "moon, apple, sun"); clip status for m, a, s (found or missing) with a link to `README.md` instructions for recording; the playlist link; app version; install hint for Chrome and Edge on Android.

## 7. Components

### 7.1 Slide track

The signature interaction.

- Horizontal rounded track; glyph in a round handle at the left; the child drags it right. Pointer events, `touch-action: none` on the track so the page never scrolls during a drag.
- While dragging: glyph scales to 1.15, the track fills in the accent color behind it, and for a held sound a soft wave ripples along the fill.
- At the end: gentle snap, `navigator.vibrate(20)` if available, a short bloom, then it eases back after 600 ms.
- Silent (changed after Geb's first phone test): the track plays no sound and speaks nothing. The child says the sound. At the end a burst of about 18 small stars sparkles, then the handle resets and can be grabbed again, even while it glides home.

Accept: a Playwright mouse drag reaches the end state; `scrollY` does not change during the drag.

### 7.2 Trace pad

- `<canvas>` sized to its container at device pixel ratio; the glyph drawn as a light guide underneath from `glyphs.js`, with numbered start dots and small arrows along each stroke.
- Finger draws a smooth, rounded, accent-colored line (quadratic smoothing). Width about 6% of pad width.
- "Show me" animates a dot along each stroke in order. "Clear" wipes only the child's strokes. No scoring.

### 7.3 Speak button

- Round, 56 px, speaker icon, accent color. Pressed state shows animated sound bars while speech is playing. Tapping while speaking cancels. Used on every task and on lesson overview.

### 7.4 `speech.js`

- `say(parts)` runs a queue: `tts` parts use `speechSynthesis` with the chosen voice, `rate` from settings, `lang: "en-US"`; `clip` parts play an `HTMLAudioElement` from `sounds[x].clip`. Each part waits for the previous to end. `cancel()` stops both.
- Voice choice: on first run, pick the first `en-US` voice whose name contains "Google" (Android Chrome) or "Microsoft" or "Natural" (Edge); otherwise the first `en-US` voice; otherwise the default. Persist `voiceURI`. Voices load asynchronously; listen for `voiceschanged` and retry once.
- Missing clip: if the audio file fails to load, skip that part and continue the queue. Show a small "recorded sound missing" dot on the speaker button so Geb knows. Never substitute text to speech for an isolated sound.
- Offline: text to speech on Android Chrome uses on-device Google voices and works offline for `en-US` if the voice pack is installed; Edge's neural voices may need the network. If `speak()` errors or never starts within 2 seconds, resolve the part and move on. The screen must never wait on speech.
- Gesture rule: do not call `speak()` until a user tap has happened in this page session. `app.js` records the first `pointerdown`.

### 7.5 Recorded sound clips

Isolated sounds must be exact, and text to speech cannot say "mmm" or "sss" reliably, so they are recorded once and shipped as files.

- Format: the shipped clips are `assets/audio/sounds/m.mp3`, `a.mp3`, `s.mp3`, each about one second, the sound held for the held sounds. A recording made with `tools/record.html` is `audio/webm` (Opus) from `MediaRecorder` and is named `m.webm`, `a.webm`, `s.webm`; the app tries the `.mp3` first and the `.webm` second.
- `tools/record.html` is a stand-alone page, not linked from the app, that Geb opens on a laptop to record each clip, hear it back, and download it. It asks for the microphone; the app itself never does. Instructions live in `README.md`, including the Mentava wording for each sound.
- Until the files exist, the app works without them (7.4). The executor commits the app with the three paths declared and the files absent, and tells Geb in the handoff what to record.

### 7.6 Glyphs

- `glyphs.js` exports SVG path data for lowercase m, a (single-story: round bowl plus right stem), s, on a 100 by 100 box with a shared baseline and x-height, plus a `strokes` array per glyph in correct handwriting order (m: down stroke, then two humps left to right; a: counter-clockwise bowl from about 2 o'clock, then the stem; s: one stroke from top right). Used for all large taught letters and the trace guide.

### 7.7 Hold button

Press and hold 2 seconds; a ring fills; release early cancels. Used for Grownups, the playlist button and the alphabet song. Every hold control carries a permanent small line saying so.

## 8. Design system

Warm, bright, tactile, close to Reading.com's cheer without copying its characters.

- **Color tokens.** Background: soft cream `#FFF8EC` for app chrome; the home map uses Reading.com-style greens and blues (`#3DD68C` grass, `#5AC8FA` water, `#6C5CE7` house). Ink `#1E2140`. Muted `#6E7391`. Card white. Accent per sound: m ocean `#3B7DD8`, a apple `#E5484D`, s leaf `#2FB37A`, each with a 12% tint. Task card colors follow the screenshots: sky `#5DE0F0`, violet `#5A4BD6`, coral `#F0556A`, sun `#FFD166`, mint `#5FE3B0`, lilac `#CDC4F8`, blue `#7DB8F5`.
- **Type.** Nunito (self-hosted woff2, weights 400, 700, 800), fallback `system-ui, Roboto, sans-serif`. Sizes: display 40, title 28, body 18, script 17, caption 15. Line height 1.35. Taught letters never use the font (7.6).
- **Shape.** Radius 24 on cards, 999 on pills and stones. Soft shadow `0 6px 20px rgba(60,40,20,.12)`.
- **Motion.** See 8.1. Honor `prefers-reduced-motion` everywhere by cutting durations to 0 and removing loops.
- **Touch.** 48 px minimum targets, 12 px gaps, active scale 0.97.
- **Icons.** Inline SVG, stroke 2, rounded caps.
- **App icon.** Cream circle with the three glyphs in their accents, drawn from `glyphs.js`; export 192, 512, maskable 512 and 180 via a Playwright screenshot of an SVG page.

### 8.1 Motion: the A-class bar

Animation is how the app feels alive without noise. Every animation must have a reason a child or parent would feel, and none may delay a tap. Use CSS transitions and the Web Animations API; no animation library.

Timing tokens: `--t-fast: 160ms`, `--t-base: 260ms`, `--t-slow: 480ms`; easing `--ease-out: cubic-bezier(.2,.8,.2,1)`, `--ease-spring: cubic-bezier(.34,1.56,.64,1)` for small pops only.

Required moments:

- **Screen change.** Outgoing screen fades and drifts 12 px; incoming fades and settles from 16 px, `--t-base`, staggered 60 ms. Back navigation reverses direction.
- **Home path.** On load, stones rise into place one after another (80 ms stagger, `--t-slow`, ease-out). The current stone breathes: a soft ring scales 1 to 1.12 and fades over 2.2 s, looping. A locked stone wobbles 6 degrees and back over `--t-base` when tapped. Butterflies or leaves drift slowly in the background at very low contrast, no more than two moving elements at once.
- **Cards and buttons.** Press: scale 0.97 over `--t-fast`. Release: spring back. Cards enter a list with a 40 ms stagger, fade plus 8 px rise. A done tick draws itself with a stroke-dashoffset animation over `--t-base`.
- **New Letter reveal.** The glyph draws itself along its stroke path (stroke-dashoffset, `--t-slow` per stroke, in handwriting order), then fills and settles with a tiny spring. Repeat on tapping the glyph.
- **Slide track.** The handle follows the finger with no lag. The fill trails 40 ms behind the handle. For held sounds a sine wave ripples along the fill while the finger moves and stills when it stops. At the end: a bloom ring expands and fades over `--t-slow`; the handle glides home over 600 ms with ease-in-out.
- **Saying Sounds sweep.** A soft highlight glides left to right across the glyphs over 2 s, pauses 600 ms, repeats. It stops when the word is revealed, and the whole word lifts 6 px and settles.
- **Saying Words merge.** The two tiles slide together and the merged tile pops in with `--ease-spring`, scale 0.8 to 1.
- **Trace pad.** The child's stroke has a slight round cap that grows in over 80 ms at the start of each stroke. "Show me" moves a glowing dot along the stroke at a steady pace, leaving a fading trail.
- **Speak button.** While speaking, three bars bounce at different phases. On cancel they collapse over `--t-fast`.
- **Progress dots.** The active dot widens into a pill over `--t-base` when the task changes.
- **Finish screen.** The glyph scales in with a spring, then a single ring pulses once. No confetti, no fireworks.
- **Hold button.** The ring fills linearly over 1.5 s. Releasing early rewinds it over `--t-fast`.

Never: bounce loops on idle screens other than the current stone's breath; parallax; animations longer than 600 ms except the deliberate slow loops named above; motion that moves a tap target while a finger might be heading for it.

Performance: animate only `transform` and `opacity` where possible; `will-change` on the handle and the sweep; keep 60 fps on a mid-range Android phone, checked by eye in the Playwright trace and by avoiding layout-triggering properties.

## 9. Engineering rules

- ES modules with `type="module"`. Target current Android Chrome and Edge.
- No `innerHTML` with content strings; build DOM with a tiny `h()` helper and `textContent`.
- All content comes from `data/curriculum.json`, fetched at boot, cached by the service worker. Friendly retry card if the first fetch fails.
- `sw.js`: explicit precache list, versioned cache name, cache-first for same-origin, network-first for `curriculum.json` with cache fallback, delete old caches on activate. Audio files are precached too.
- `manifest.webmanifest`: `name` and `short_name` "Reading", `display: standalone`, `orientation: portrait-primary`, `start_url: "./index.html#/home"`, `scope: "./"`, cream `background_color` and `theme_color`, icons with a maskable entry. Add `theme-color` meta and Apple meta tags as a courtesy.
- Handle `visibilitychange` so returning from YouTube lands on the same task, and cancel speech when the page is hidden.
- Prevent double-tap zoom and long-press callouts on child surfaces (`touch-action: manipulation`, `-webkit-touch-callout: none`, `user-select: none` on interactive surfaces only).
- Write code that reads plainly. Comments only where the why is not obvious.

## 10. Verification

Run from the repo root.

- **Local server:** `python3 -m http.server 8080` and open `http://localhost:8080/`.
- **Content check:** `node test/check-content.mjs` exits non-zero on any rule in 5.1.
- **Smoke test:** `node test/smoke.mjs` uses Playwright with the preinstalled Chromium (`executablePath: '/opt/pw-browsers/chromium'` if the default lookup fails; Edge on Android is Chromium, so this covers both targets). It must:
  - run at Pixel 7 (412 by 915, DPR 2.6) portrait and landscape, and a small Android (360 by 780, DPR 3);
  - start a local static server on a free port;
  - fail on any console error or unhandled rejection;
  - visit Home, each Lesson, every Task of every lesson (20 in all), the Finish screen and Grownups;
  - drag the slide track to the end and assert the end state class, and that `scrollY` did not change;
  - draw a stroke on the trace pad and assert pixels changed;
  - stub `speechSynthesis.speak` and assert it is called with the expected text for one task, and never with a single letter;
  - assert the playlist hold button opens a popup (Playwright `page.waitForEvent('popup')`);
  - assert no horizontal overflow and every `button, a, [role=button]` is at least 48 by 48;
  - assert no child-facing text node matches the letter-name list;
  - assert the service worker registers and, on second load with network offline, Home still renders;
  - save screenshots to `_test/` (gitignored), named by screen and viewport.
- **Manual pass on the phone** (Geb): section 12.

## 11. Work order

Each step ends with a verify gate. Do not start the next step until it passes. Commit at each gate.

1. **Scaffold.** Folder tree, `index.html`, tokens in `app.css`, router, store, empty screens rendering their names, `.gitignore` (`_test/`, `node_modules/`), `README.md` with run instructions and the private-use notice. Gate: local server shows Home; smoke skeleton passes the no-console-error check at all viewports.
2. **Assets.** Download Nunito woff2 (400, 700, 800) into `assets/fonts/` with an `@font-face` block. Convert Mentava PNGs to 512 px WebP under `assets/images/mentava/web/` with ffmpeg. Gate: fonts render offline; WebP files exist for all 26 tiles and each is under 60 KB.
3. **Content and checker.** `curriculum.json` as in 5.1; `check-content.mjs`. Gate: checker passes; break a rule on purpose, see it fail, fix it.
4. **Glyphs.** `glyphs.js` with m, a, s and strokes; debug route `#/glyphs`. Gate: screenshot at 412 px reviewed by eye: single-story "a", aligned baselines, strokes start at the right places.
5. **Speech.** `speech.js`, speak button, gesture unlock, voice picker logic, missing-clip handling; debug route `#/lab` with buttons to speak a word, play a clip, and run a mixed sequence. Gate: in Playwright with a stubbed `speechSynthesis`, the queue runs parts in order and skips a missing clip without error.
6. **Home and Lesson overview.** With real state. Gate: smoke covers both; locked stone does not navigate.
7. **Slide track and trace pad** on `#/lab`. Gate: drag reaches end; canvas pixels change; no page scroll.
8. **Seven tasks and finish screen.** Gate: smoke walks all 20 tasks; done ticks and unlocking behave; popup asserted; `speak` never called with a single letter.
9. **Grownups, hold gate, voice settings.** Gate: gate blocks a short tap and opens on hold; reset returns Home to first run; voice choice persists.
10. **Recorder tool.** `tools/record.html` records, plays back and downloads a `.webm` clip. Gate: manual check in headed Chromium is not possible here, so verify the page loads without console errors in Playwright and that `MediaRecorder` code paths are guarded when unsupported.
11. **PWA.** Manifest, icons, service worker, meta tags. Gate: offline reload passes; manifest validates (no console warnings about it).
12. **Polish pass.** Re-read sections 8 and 8.1 and every screen at 412 by 915 and 915 by 412 against the Reading.com screenshots. Fix spacing, type, motion. Gate: the screenshots would not embarrass a professional designer. If in doubt, simplify.
13. **Adversarial review.** Read the whole diff as a critic: any letter name or capital on a child screen or in a `tts` string; any `showLetters: true` word using an untaught letter; any target under 48 px; page scroll during drag; any external request other than the playlist link and none at runtime for fonts; a crash when `localStorage` throws; speech called before a gesture; the screen waiting on speech that never starts. Fix everything. Gate: checker and smoke green; push.
14. **Handoff.** Update `README.md`: the Pages URL, install steps for Chrome and Edge on Android, how to record the three clips and where to put them, how to reset progress, what stage 2 adds. Push. Tell Geb the URL, the recording steps, and the manual checklist.

## 12. Manual phone checklist for Geb (Android, Chrome and Edge)

- Open the URL. Install to the home screen from the browser menu. Open from the icon: full screen, no browser bars.
- Turn on airplane mode. Reopen. It still works. Tap a speaker: words still speak (or fail silently without freezing).
- Home shows three stones; only lesson 1 is open.
- Run lesson 1 end to end with your child. Note every place the wording or the voice is unclear.
- The slide track moves under a small finger without the page moving. If clips are recorded, the sound plays on drag.
- Tracing is smooth.
- The playlist button needs a hold, opens YouTube, and returning lands on the same task.
- "Got it" unlocks lesson 2. Lesson 2 reviews m before teaching a.
- Grownups is not reachable by a quick tap. The voice picker changes the voice.
- Rotate the phone during a task: nothing breaks.
- Repeat the first three items in the other browser.

## 13. Deployment

GitHub Pages must be enabled on this repo for branch `main`, folder `/` (Geb does this in Settings, Pages). The app then appears at `https://gebsierra.github.io/KDDash/` (check the exact URL in that settings page). No other hosting is needed.

Note for now: pushes from Claude's cloud sessions to this repo are refused until Geb reconnects GitHub at https://claude.ai/connect-github and installs the Claude GitHub App on the repository. Commits made before then stay local and push later.

## 14. Stage 2 seams

Design for these without building them: more sounds in `curriculum.json` (single letters, then pairs); readiness check as a first-run step; clipped-sound animation on the slide track (a short pop instead of a wave); more Mentava tiles as Geb extracts them; Reading.com-style Books, Games and Videos tabs; a Books milestone list; export and import of progress as a file.

## 15. Decisions confirmed at approval

Already decided by Geb:

- The app speaks; it never listens. No microphone in the app.
- Android phone, Chrome and Edge, is the target.
- Seven Reading.com tasks per lesson; one playlist link for every Sound Story.
- Lessons 1 and 2 are m and a.
- Mentava's pictures and Reading.com's look may be used; private build, not for publication or sale without permission.

Defaults in this plan, taken as approved unless Geb says otherwise:

- Lesson 3 is s. If Geb prefers t, swap the sound entry and change the `sayingSounds` words to "at", "am", "mat".
- Isolated letter sounds come from clips Geb records once with `tools/record.html` on a laptop. Until then the app runs without them. Alternative: Geb extracts sound audio from another source and drops it in the same paths.
- Pictures for m and s are emoji until Geb extracts those tiles from the Mentava PDF, the same way the a to e tiles were extracted (the manifest shows page and xref per image).
- Nunito is the app font, self-hosted.

Decided by Geb in round 2 (see section 17):

- The app does not pronounce letter sounds; the parent says them. The recorded clips stay behind the Grownups switch "Play recorded letter sounds", off by default.
- Each lesson gets two games of our own, Letter Hunt (a sheep crosses a field) and Barn Doors, modelled on the example screenshots in `docs/reference/`. They are silent, never score and never say wrong.

## 16. Post-review changes

Five independent reviews produced `docs/FIXES-round1.md` (37 numbered fixes in five groups). All are applied. What changed, in short:

- **Teaching text.** Every "a" a child reads comes from the glyph, inside words too. The short a is always written and said "a as in apple", never a bare "a" (a parent would say its name). Parent scripts give words to say. Compound words are picturable nouns; example words for a and s were replaced. Blends play from preloaded clips with no gap, then a 300 ms pause before the whole word. The content checker also covers spoken parts and structure.
- **Child safety.** Next is dimmed for one second; the finish screen ignores taps for 1.5 seconds and "Yes, go on" takes two taps; hold gates are 2 seconds and labelled; the Grownups gate is consumed on entry and redirects replace history; Unlock asks first; corrupt saved data is repaired.
- **Bugs.** Speech treats a refused play() as skipped and cancel as neutral; cleanup plumbing; the service worker precaches fresh files, never caches partial or failed responses, gives content a 2.5 second network timeout and leaves the debug screens out; updates reload only on Home; the trace pad keeps its strokes on resize.
- **Design and motion.** Landscape layouts for every screen with nothing core below the fold, opacity-only entrances so tap targets never move, darker green for white text, spring release on pressables, reduced motion without delays, one sliding progress pill, faces on the home trees, a larger trace pad, 28 px titles.
- **Tests and docs.** The smoke test lost its padded assertions, derives task counts from the curriculum, drags by real touch, audits revealed states and later words, and checks that `CACHE_VERSION` equals `APP_VERSION`. README "Decisions made during build" records the choices below.

Decisions fixed by Geb in that round: inside words m and s may render from the font (only "a" always comes from `glyphs.js`); words with untaught letters may appear as picture labels; the alphabet song row stays, as Geb's deliberate exception to the letters-not-names rule; the debug routes stay but are not precached.


## 17. Round 2: quiet sounds and two games (v1.3.0)

Specified in `docs/ROUND2-games.md`; Geb's example screenshots are in `docs/reference/`.

- **Quiet sounds.** The app no longer pronounces letter sounds. `playSounds` (Grownups, off by default) brings the recorded clips back. `speech.say` skips clip parts silently when it is off. Quiet variants of the lines that ended in a clip live in `curriculum.json`. Parent scripts read aloud only their framing sentences: any sentence that contains a sound is left out.
- **Two games per lesson**, Letter Hunt and Barn Doors (6.4), inserted before Quick Check, so Quick Check stays last. Lesson 1 has eight tasks, lessons 2 and 3 have nine. They never score, never say wrong, never play a sound effect and never time the child out. `games.hunt` and `games.barn` in `curriculum.json` hold the spoken line and the distractor letters per taught sound. Art is our own inline SVG in `js/art.js`; the sparkle burst is shared in `js/components/sparkle.js`.
- **Tests.** `test/games.mjs` drives both games by real touch at the three viewports (overlap, sizes, wrong and right touches, done state, Again, reduced motion, no clip or speech during play); `test/smoke.mjs` runs it.
