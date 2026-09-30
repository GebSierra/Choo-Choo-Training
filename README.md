# Reading (KDDash)

A personal reading app for one child. Stage 1 teaches three letter sounds (m, a, s) the Mentava way, in Reading.com's lesson shape. Static files, no build step, no runtime dependencies, installable on an Android phone (Chrome or Edge) and usable offline.

Private personal build. Contains material from Mentava and Reading.com. Not for publication or sale without their permission.

The app speaks but never listens. It never asks for the microphone. Only `tools/record.html` does, and nothing in the app links to it.

## Where it runs

GitHub Pages serves this repo from `main` at the root. After you enable Pages (Settings, Pages, Branch: main, Folder: / (root)) the app is at:

    https://gebsierra.github.io/KDDash/

(Check the exact address on the Pages settings page.)

## Install on an Android phone

1. Open the address above in Chrome or Edge.
2. Chrome: menu (three dots), Add to Home screen, Install. Edge: menu, Add to phone, Install.
3. Open it from the new icon: it runs full screen. It works offline after the first visit.
4. First time: tap Start on the welcome card. That tap also lets the phone speak.

## Run locally

    python3 -m http.server 8080
    # open http://localhost:8080/

Debug pages (not linked from the app): `#/glyphs` (letter shapes with stroke starts), `#/lab` (speech, slide track and trace pad playground).

## Test

    node test/check-content.mjs   # curriculum.json against the teaching rules
    node test/smoke.mjs           # Playwright walkthrough at three Android viewports (takes about three minutes)

The smoke test starts its own server, uses the preinstalled Chromium, fails on any console error, and saves screenshots to `_test/` (ignored by git). `tools/screenshots.mjs` refreshes the pictures in `docs/screenshots/`. `npm install` is only needed if Playwright is not already installed globally; the app itself has no dependencies.

## Recording the sound clips

Isolated sounds (mmm, a as in apple, sss) are never made by the phone voice. They play from audio files:

    assets/audio/sounds/m.mp3   a.mp3   s.mp3

For each sound the app tries the `.mp3` first and a `.webm` with the same name second.

To use your own voice instead:

1. On a laptop with Chrome or Edge, open `tools/record.html` (double-click it, or visit `/tools/record.html` on the Pages address).
2. For each sound press Record, say it (hold mmm and sss for about a second; say the short a of "apple"), press Stop, listen, then Download. Never say "muh", "suh" or a letter name.
3. Put the downloaded `m.webm`, `a.webm`, `s.webm` into `assets/audio/sounds/` and delete the matching `.mp3` files so yours are found first.
4. Commit and push. In `sw.js` bump `CACHE_VERSION` so phones pick up the change, and add the `.webm` names to `OPTIONAL_FILES` if you want them available offline.

If a clip is missing, the app skips that part and shows a small yellow dot on the speaker button. Grownups shows which clips are found.

## Reset progress

Grownups (press and hold the pill on Home for 1.5 seconds), then "Reset all progress". It keeps your voice settings. Grownups can also unlock any lesson.

## What stage 2 adds

More sounds in `data/curriculum.json` (the format already allows 120 lessons), the readiness check, a clipped-sound animation on the slide track, more Mentava pictures for m and s (emoji for now), Books, Games and Videos tabs, and exporting or importing progress as a file. See PLAN.md section 14.

## Attribution

Letter sound clips are derived from Wikipedia's IPA vowel and consonant chart recordings, CC BY-SA 3.0, obtained via github.com/joshstephenson/PhoneticFlashCards, trimmed and loudness-normalized.

Fonts: Nunito (SIL Open Font License), self-hosted. Pictures for the sound "a": Mentava's "Alphabet Sounds" (see the private-use notice above).

## Decisions made during build

The plan left these open or made them impossible to follow literally. Each is the simplest choice consistent with the plan.

- Fonts: one variable Nunito file (`nunito-latin.woff2`) covers weights 400, 700 and 800, instead of three files.
- WebP: the bundled ffmpeg has no WebP encoder, so `tools/make-webp.mjs` converts the 26 tiles with Chromium's canvas encoder (512 px, all under 60 KB). The PNG originals stay and are not precached.
- Every "a" a child reads is drawn from our own single-story glyph, including inside words such as "apple" or "catfish" (`js/letters.js`), not only the big taught letters.
- Task numbers in the URL are positions in that lesson's task list, so lesson 1 has tasks 0 to 5 (no Letter Review) and lessons 2 and 3 have 0 to 6.
- Back always goes to the parent screen (task to lesson overview to Home), so it is predictable and animates in reverse.
- Grownups opens only through the hold gate on Home and expires after ten minutes; typing `#/grownups` bounces to Home. The hold keeps its full 1.5 seconds even with reduced motion on.
- Reset all progress keeps the voice, speed and auto-speak settings and returns Home to its first-run card.
- Parent scripts are read aloud by their small speaker: mmm, aaammm and sss become recorded clips, and a stretch we have no clip for (for example "mmmoon") is shown but not spoken. A standalone single letter is never sent to text to speech.
- For picture-only words in Saying Sounds the script stretches held sounds only (mmmoon, never "ppp"), following the clipped-consonant rule.
- Quick Check answer cards are shuffled on each visit. Tapping one lifts it; nothing says right or wrong, and the choice can be changed.
- The Start lesson button continues at the first unfinished task, and reads "Do it again" once all tasks are done.
- A missing clip makes the browser log its own 404 in the console; the smoke test ignores that one known message.
- Sound clips: `curriculum.json` lists the `.mp3` path. The app tries `.mp3` first, `.webm` second. `sw.js` precaches only the three `.mp3` clips (optional, so a missing file never breaks install) and never `assets/audio/ipa/`.
- Alphabet song: an optional row above the task cards opens https://youtu.be/qKQAQc2NEuk behind the same hold gate. It is not a task, never counts toward progress or ticks, and the page says nothing about its contents beyond "alphabet song". The video was not viewed; if it says letter names, use it or skip it as you see fit.
- The smoke test's fixed viewports use Playwright's Chromium, which stands in for Chrome and Edge on Android. Real speech voices and real touch feel cannot be checked there.
