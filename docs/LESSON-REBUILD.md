# Lesson rebuild, phase A

Owner decisions of 2026-10-08. This page is for the owner to read. It lists what changed in the 13 lessons, the new lesson frame,
the new "Watch my mouth" step, and every grown-up line before and after. No version change; nothing is pushed.

Phase A kept the sound order of that time (`m a s i t p n f d h g b l`). Phase B (section 9, at the end) switched to the curriculum's order and added o, c/k, u and r: 17 lessons.

## 1. The lesson frame (the same in every lesson)

| Part | Tasks | Why |
| --- | --- | --- |
| **Opening** | Letter Review, then New Sound, then Watch My Mouth. Lesson 1 has nothing to review, so it opens with New Sound. | The child always starts with something they know, then meets the new sound, then watches how it is made. |
| **Middle** | 2 to 4 of: Saying Sounds, Track Tracing, Letter Hunt, Green Light, Wagon Parade, Station Board. Always Saying Sounds and Track Tracing; the rest changes from lesson to lesson. | Mixed practice keeps it fresh. Blending, reading words and writing are in every lesson. |
| **Ending** | Practicing Words (a short review of today's sound and the earlier ones), then Ticket Check, always last. | The child finishes with a quick check of what they know. |

How it is built: `tasksFor` in `js/lessons.js` builds the frame; `lesson.middle` in `data/curriculum.json` holds the middle; the
patterns are `MIDDLES` in `js/games-data.js` (written to the data by `tools/gen-lessons.mjs`, never by hand). Saying Sounds is the
blending activity and the place where the child reads words (the app's "word reading"); Practicing Words is the loading-dock
review game that mixes today's sound with earlier ones.

## 2. Watch my mouth

A small task right after New Sound, in every lesson.

- **One illustration** (inline SVG, `js/art/grownup.js`): a friendly grown-up, neutral and unspecified gender, looking at the
  viewer, with one finger at the side of the mouth. A soft ring pulses at the mouth corner (CSS opacity and transform only; still
  under reduced motion).
- **The grown-up text** (in the "Say this" sheet, exactly as you wrote it): "It helps your child to see someone else make the
  sound. Put a finger at the side of your mouth (this draws their eyes to your mouth) and ask your child to look at your mouth.
  Make the sound, then have them say it after you." The bar shows the gist "Finger at mouth. Say it."
- **The sound:** the recording if there is one; otherwise the prompt "Say: mmm" for the grown-up, as today. The phone's voice
  never says the sound. Its only words in this step are to the child: "Watch your grown-up's mouth."
- **"How to make this sound"** button: opens a small panel under the picture with this lesson's sound, a "Voice on" or "Voice off"
  badge and one to three short sentences (from CURRICULUM.md sections 5 and 11). The text lives in `curriculum.sounds[k].mouth`.

| Sound | Voice | How to make it |
| --- | --- | --- |
| m | on | Lips together. Hum through your nose. Voice on. |
| a | on | Open your mouth wide, with your jaw down. Keep your tongue low and flat. Voice on. |
| s | off | Teeth close together. Tongue behind your teeth. Blow a thin stream of air. Voice off. |
| i | on | Keep your mouth small and relaxed. Tongue a little forward. Voice on. |
| t | off | Touch your tongue tip just behind your top teeth. Let out a quick puff of air. Voice off. |
| p | off | Lips together, then open them with a quick puff of air. Voice off. |
| n | on | Tongue behind your top teeth. Hum through your nose. Voice on. |
| f | off | Top teeth on your bottom lip. Blow air out. Voice off. |
| d | on | Tap your tongue behind your top teeth, quick and light. Voice on. |
| h | off | Open your mouth a little. Breathe out, as if fogging a mirror. Voice off. |
| g | on | Lift the back of your tongue to the roof of your mouth. Let it drop quickly. Voice on. |
| b | on | Lips together, then pop them open. Voice on. |
| l | on | Touch your tongue tip behind your top teeth. Let the sound flow around it. Voice on. |

## 3. Task lists, before and after

| Lesson | Before | After |
| --- | --- | --- |
| 1 (m) | New Sound, Sound Story, Word Cars, Saying Sounds, Track Tracing, Letter Hunt, Wagon Parade, Practicing Words, Ticket Check | New Sound, Watch My Mouth, Track Tracing, Saying Sounds, Letter Hunt, Practicing Words, Ticket Check |
| 2 (a) | Letter Review, New Sound, Sound Story, Word Cars, Saying Sounds, Track Tracing, Letter Hunt, Green Light, Practicing Words, Ticket Check | Letter Review, New Sound, Watch My Mouth, Saying Sounds, Green Light, Track Tracing, Practicing Words, Ticket Check |
| 3 (s) | Letter Review, New Sound, Sound Story, Word Cars, Saying Sounds, Track Tracing, Letter Hunt, Wagon Parade, Practicing Words, Ticket Check | Letter Review, New Sound, Watch My Mouth, Letter Hunt, Saying Sounds, Wagon Parade, Track Tracing, Practicing Words, Ticket Check |
| 4 (i) | Letter Review, New Sound, Sound Story, Word Cars, Saying Sounds, Track Tracing, Letter Hunt, Green Light, Practicing Words, Ticket Check | Letter Review, New Sound, Watch My Mouth, Green Light, Saying Sounds, Track Tracing, Wagon Parade, Practicing Words, Ticket Check |
| 5 (t) | Letter Review, New Sound, Sound Story, Word Cars, Saying Sounds, Track Tracing, Letter Hunt, Green Light, Wagon Parade, Practicing Words, Ticket Check | Letter Review, New Sound, Watch My Mouth, Saying Sounds, Station Board, Track Tracing, Practicing Words, Ticket Check |
| 6 (p) | Letter Review, New Sound, Sound Story, Word Cars, Saying Sounds, Track Tracing, Letter Hunt, Wagon Parade, Practicing Words, Ticket Check | Letter Review, New Sound, Watch My Mouth, Track Tracing, Letter Hunt, Saying Sounds, Green Light, Practicing Words, Ticket Check |
| 7 (n) | Letter Review, New Sound, Sound Story, Word Cars, Saying Sounds, Track Tracing, Letter Hunt, Station Board, Green Light, Practicing Words, Ticket Check | Letter Review, New Sound, Watch My Mouth, Saying Sounds, Wagon Parade, Track Tracing, Station Board, Practicing Words, Ticket Check |
| 8 (f) | Letter Review, New Sound, Sound Story, Word Cars, Saying Sounds, Track Tracing, Letter Hunt, Green Light, Practicing Words, Ticket Check | Letter Review, New Sound, Watch My Mouth, Letter Hunt, Track Tracing, Saying Sounds, Practicing Words, Ticket Check |
| 9 (d) | Letter Review, New Sound, Sound Story, Word Cars, Saying Sounds, Track Tracing, Letter Hunt, Wagon Parade, Station Board, Practicing Words, Ticket Check | Letter Review, New Sound, Watch My Mouth, Green Light, Saying Sounds, Station Board, Track Tracing, Practicing Words, Ticket Check |
| 10 (h) | Letter Review, New Sound, Sound Story, Word Cars, Saying Sounds, Track Tracing, Letter Hunt, Station Board, Practicing Words, Ticket Check | Letter Review, New Sound, Watch My Mouth, Track Tracing, Saying Sounds, Wagon Parade, Practicing Words, Ticket Check |
| 11 (g) | Letter Review, New Sound, Sound Story, Word Cars, Saying Sounds, Track Tracing, Letter Hunt, Green Light, Wagon Parade, Practicing Words, Ticket Check | Letter Review, New Sound, Watch My Mouth, Station Board, Saying Sounds, Letter Hunt, Track Tracing, Practicing Words, Ticket Check |
| 12 (b) | Letter Review, New Sound, Sound Story, Word Cars, Saying Sounds, Track Tracing, Letter Hunt, Wagon Parade, Practicing Words, Ticket Check | Letter Review, New Sound, Watch My Mouth, Track Tracing, Green Light, Saying Sounds, Wagon Parade, Practicing Words, Ticket Check |
| 13 (l) | Letter Review, New Sound, Sound Story, Word Cars, Saying Sounds, Track Tracing, Letter Hunt, Station Board, Green Light, Practicing Words, Ticket Check | Letter Review, New Sound, Watch My Mouth, Letter Hunt, Saying Sounds, Station Board, Track Tracing, Practicing Words, Ticket Check |

Lessons now have 7 to 9 tasks (they had 9 to 11). Green Light needs a second sound, so it starts in lesson 2; Station Board needs its
words, so it starts in lesson 5. No two neighbouring lessons share a middle (checked by `test/check-content.mjs` and
`test/lesson-rebuild.mjs`).

Saved progress: task numbers changed, so a one-time migration (`settings.layoutA`, in `js/store.js`) clears the saved task ticks of
every lesson that is not finished (result is not got-it). Finished lessons and all results are untouched.

## 4. What was removed, and why

- **Word Cars** (the compound-word picture blending, "cat ... fish"). The white paper's own finding is that sound awareness works
  best when it is tied to letters, and these children are already learning letter sounds. That time now goes to blending with
  letters (Saying Sounds). Stage 1 sound play keeps its own oral blending, where there are no letters yet. The four compound words
  per lesson are gone from the data (`sayingWords`), the screen and its tests are gone. Noted in docs/CURRICULUM.md builder notes.
- **The Sound Story playlist step** and **the Alphabet song row** on the lesson overview.
- **Grownups > Links** (the two YouTube links). Nothing else used them, so the whole section, the number gate that guarded
  outside links (`js/components/grown-gate.js`), and the two addresses in `data/curriculum.json` are gone. The app now opens no
  outside address at all. `test/platform.mjs` and `test/lesson-rebuild.mjs` fail if a YouTube address comes back.

## 5. Grown-up lines, before and after

Rules used: short sentences, one action at a time. **The grown-up models only (a) the very first time something is completely new
(a new sound, a new kind of word, a new activity) and (b) after the child has tried and failed or cannot remember.** So New Sound and
Watch My Mouth (and the first Saying Sounds in lesson 1) are "I do, we do, you do". Letter Review, Saying Sounds from lesson 2 on,
reading words, the games, the closing review and Ticket Check make the child recall first ("Let your child try first"); only if
they are stuck, sound it out together; still stuck, the grown-up says it and the child says it after (`READ_HELP`, unchanged). Letter sounds, not names. Clipped stops stay short ("t-").
The grown-up judges. Gists stay at 28 characters or fewer. The placement check, Stage 1 sound play, the book and Smooth Ride were
not touched.

### Lessons

**New Sound**
- Before: "Say mmm. Now you try. Slide the letter as you say it."
- After: "I do: say mmm. We do: slide a finger under the letter and say it together. You do: your child slides under the letter and says it alone."
- Gist before: "Say mmm. Child slides." After: "I do: say mmm."

**Letter Review** (the answer now stays hidden: the card shows the big letter and the slide track, and a "Show the sound" button for the grown-up; the sound card and the recording appear only when it is tapped, or with Again. The phone only asks "What sound does this letter make?")
- Before: "Say mmm. Now you try. Slide the letter."
- After: "Ask your child to say the sound of this letter. Your child can slide a finger under it. If they are stuck, say the sound together. Still stuck? Say it yourself, then have your child say it after you."
- Gist before: "Say mmm. Child slides." After: "Child says the sound first."

**Watch My Mouth** (new)
- Say this: "It helps your child to see someone else make the sound. Put a finger at the side of your mouth (this draws their eyes to your mouth) and ask your child to look at your mouth. Make the sound, then have them say it after you."
- Gist: "Finger at mouth. Say it." The phone says to the child: "Watch your grown-up's mouth."

**Saying Sounds, a picture word**
- Before: "Say the word slowly, stretching the first sound: sssun. Then say it fast: sun. Then tap the picture to show the word, and slide your finger across the word as you say it slowly."
- After, lesson 1 only (first time): "I do: say the word slowly, stretching the first sound: sssun. Then say it fast: sun. We do: tap the picture. Slide a finger under the word and say it together, slowly. You do: your child slides and says the word. If they are stuck, sound it out together. Still stuck? Say it yourself, then have your child say it after you."
- After, lesson 2 on: "Let your child try first. Tap the picture to show the word. Your child slides a finger under it and says it. If they are stuck, sound it out together. Still stuck? Say it yourself, then have your child say it after you. (Slowly, stretching the first sound: sssun. Then fast: sun.)"

**Saying Sounds, a word with letters**
- Before: "Slide your finger under the word as you say the sounds: sssaaammm. Then say it fast: Sam. Then tap the word to show it."
- After, lesson 1 only: "I do: slide your finger under the word and say it smooth and joined: sssaaammm. Then say it fast: Sam. We do: slide together and say it together. You do: your child slides and says the word. Tap the word to show it. If they are stuck, ..."
- After, lesson 2 on: "Let your child try first: your child slides a finger under the word and says it. Tap the word to show it. If they are stuck, sound it out together. Still stuck? Say it yourself, then have your child say it after you. (Smooth and joined: sssaaammm. Then fast: Sam.)"

**Track Tracing**
- Before: "Draw it first while your child watches, then let them try. Start at the dot and follow the arrow. It's fine if it doesn't look right yet: your child can still move on."
- After: "I do: draw the letter while your child watches. We do: trace it together, one finger each. You do: your child traces it alone. Start at the dot and follow the arrow. It does not have to look right yet. Your child can still move on."

**Letter Hunt**
- Before: "Say: 'Find the letter that says mmm. Touch it.' Then say mmm together."
- After: "Say: 'Find the letter that says mmm.' Your child says the sound first, then touches the letter. If they are stuck, say it together."

**Green Light**
- Before: "Say: 'Listen. Which light says mmm? Tap it.' If no recording plays, say the sound shown at the top."
- After: "Say: 'Listen. Which light says mmm?' The recording plays. If it does not, say the sound shown at the top. Your child taps the light. If they are stuck, say the sound together."

**Wagon Parade**
- Before: "Say: 'Tap every wagon that says mmm.' Every tap plays the sound; say it with them."
- After: "Say: 'Tap every wagon that says mmm.' Your child says the sound first, then taps. Every tap plays the sound. Say it together."

**Station Board**
- Before: "Read the word on the board: 'This is …' Then say the sound shown, and let them tap the letter that makes it."
- After: "Read the word on the board to your child: 'This is …' Then say the sound shown at the top. Your child taps the letter that makes it. If they are stuck, say the sound together."

**Practicing Words** (and the checkpoint sound sack)
- Before (words): "Say: 'Find the mmmilk.' Let them drag it into the wagon. There is no right or wrong here."
- After (words): "Say: 'Find the mmmilk.' Say the first sound the way it is written. Your child drags the picture into the wagon. The app does not say right or wrong. You decide. If it was not the right one, say the first sound together."
- Before (sounds): "Say: 'Which one starts with mmm?' Let them drag it into the wagon. There is no right or wrong here."
- After (sounds): "Say: 'Which one starts with mmm?' Your child drags the picture into the wagon. The app does not say right or wrong. You decide. If it was not the right one, say the sound together."

**Ticket Check**
- Before: "Say: 'Which one says mmm?' Let them touch one. There is no right or wrong here."
- After: "Say: 'Which one says mmm?' Your child touches one card. The app does not say right or wrong. You decide. If it was not the right one, say the sound together."

**Reminders in lessons 1 and 2** (`js/guide.js`)
- Before: "Call this letter mmm, not “em”. When we read, we sound words out, and the name never comes into it."
  After: "Say the sound mmm, not “em”. We read by sounding words out, so the letter name is not needed."
- Before: "Lowercase first. Capital letters can wait: most of what your child will read is lowercase."
  After: "Lowercase first. Most of what your child reads is lowercase. Capital letters can wait."
- Before: "Call this letter aaa (as in apple), not “ay”. Then ma is “maaa”, not “em-ay”."
  After: "Say the sound aaa (as in apple), not “ay”. Then ma is “maaa”, not “em-ay”."
- Before: "Say ma as “maaa”, with no pause between the sounds. Letter names would make it “em-ay”, which is not a word."
  After: "Say ma as “maaa”, with no gap between the sounds. Letter names would make “em-ay”, which is not a word."

**Removed lines**
- Sound Story: "Say: 'Let's watch the mmm story.' Then press and hold Open playlist and find the video for mmm. Come back when it ends." (gist "Say: mmm story. Hold button.")
- Word Cars: "Say the two parts slowly: 'sun ... hat.' Ask: 'What word?' Tap the ? to show it. Then slide your finger across the picture as you say sunhat slowly." (gist "Say: sun ... hat. What word?")
- Lesson overview, Alphabet song row: "Optional: play the alphabet song together, before or after the lesson."
- Grownups > Links: "Sound story playlist", "Alphabet song".

### The f lesson prototype (Grownups > Previews)

| Step | Before | After |
| --- | --- | --- |
| Warm-up, blend | Play the blend, or say it yourself: fffiiit-. Your child slides a finger along under the letters while saying it, smooth and joined with no gaps. Then ask: "What word?" | Play the blend, or say it yourself: fffiiit-. Your child slides a finger under the letters and says it with you, smooth and joined. Then ask, "What word?" Let your child answer first. |
| Warm-up, break it | Say the word slowly: sssaaat-. Your child taps a box for each sound, and the letters appear one by one. | Say the word slowly: sssaaat-. Your child taps a box for each sound, and the letters appear one by one. Let your child try first; if they are stuck, say the sounds together. |
| Quick Review, letters | Your child says the sound before hearing it. Tap Got it, or Help if they are stuck: you say the sound, your child says it back, and the card comes back once at the end. Keep p and t quick and crisp, with no uh. | Your child tries first: they say the sound before the app plays it. Tap Got it if they know it. Stuck? Tap Help, play the sound, and say it together. Still stuck? Say it yourself, then have your child say it after you. The card comes back once at the end. Keep p and t quick, with no uh. |
| Quick Review, words | READ_HELP + "Tap Got it, or Help: tap the letter that was tricky, play its sound, then the whole word, and your child blends it again." | READ_HELP + "Tap Got it if your child read it. Tap Help if not: tap the tricky letter, play its sound, then the whole word. Your child blends it again." |
| Quick Review, wagons | Say: "Say the sound first, then find it!" Your child says the sound of the letter on the card, then taps every wagon with that letter. | Say: "Say the sound first, then find it!" Your child says the sound of the letter on the card. Then your child taps every wagon with that letter. If they are stuck, say the sound together. |
| Quick Review, Help panel | Listen. Your child says it again. This card comes back once at the end. | Listen. Say it together. Then your child says it alone. This card comes back once at the end. |
| New Sound, meet | This is f. The stem, the two leaves and the drooping flower head make the letter. Tap Hear it, then say fff together, a long breath through your teeth. | This is f. The stem, the two leaves and the flower head make the letter. I do: tap Hear it and listen. We do: say fff together, a long breath through your teeth. |
| New Sound, mouth | Say: "Top teeth on your bottom lip, and blow: fff. Not fuh." Let your child try it, and feel the air on a hand. | I do: put your top teeth on your bottom lip and blow: fff. Not fuh. We do: do it together. You do: your child tries it alone. They can feel the air on a hand. |
| New Sound, say it | Your child says the sound three times. Tap a dot after each one. Tap Hear it for the recording. | You do: your child says the sound three times. Tap a dot after each one. Tap Hear it to play the recording. If they are stuck, say it together. |
| New Sound, trace | Draw it first while your child watches, then let them try. Start at the dot and follow the arrow. Say fff as you trace. It's fine if it doesn't look right yet: your child can still move on. | I do: draw the letter while your child watches. Say fff as you trace. We do: trace it together. You do: your child traces it alone. Start at the dot and follow the arrow. It does not have to look right yet. Your child can still move on. |
| Blend It, I do | I do. Say the word slowly and smoothly while the letters light up: fffiiit-. Your child watches and listens. | I do: say the word slowly and smoothly while the letters light up: fffiiit-. Your child watches and listens. |
| Blend It, we do | We do. Slide your fingers along the letters together and say it together: fffiiit-. Then say the whole word fast, and ask: "What word?" | We do: slide your fingers along the letters together and say it together: fffiiit-. Then say the whole word fast and ask, "What word?" |
| Read It | READ_HELP + "Tap Got it, or Help. Help: tap the letter that was tricky, play its sound, then the whole word, and your child blends it again. A missed word comes back once at the end." | READ_HELP + "Tap Got it if your child read it. Tap Help if not: tap the tricky letter, play its sound, then the whole word. Your child blends it again. A missed word comes back once at the end." |
| Build It, first | The phone says the word. Say it slowly with your child: fffaaat-. Your child taps tiles to fill the boxes from left to right. Tap a filled box to send its tile back. | The phone says the word. Say it slowly together: fffaaat-. Then your child taps tiles to fill the boxes from left to right. To send a tile back, tap its box. |
| Build It, chain | Say: "Change one letter to make fit." Do not point to the letter: your child listens for the sound that changed. Children often read the first letter and guess the rest, so this game trains them to look at every letter. | Say: "Change one letter to make fit." Do not point to the letter. Your child listens for the sound that changed. This trains children to look at every letter, not just the first. |
| Read a Story, line | READ_HELP (for a line) + "Tap Got it, or Help: tap the tricky word, play its sounds (you say a heart word whole), then your child reads the whole line again." | READ_HELP (for a line) + "Tap Got it if your child read the line. Tap Help if not: tap the tricky word, play its sounds (you say a heart word whole). Your child reads the whole line again." |
| Read a Story, whole story | Your child can read the whole story again, a little faster. Tap Hear the story to hear it read smoothly first, then reread. Tap Next for a question. | Your child reads the whole story again, a little faster. Tap Hear the story first, to hear it read smoothly. Then your child rereads it. Tap Next for a question. |

Also in the shared reading panel (used by Read It, Read a Story and the heart word):
- "Now say the whole word, then have your child say it after you." becomes "Say the whole word. Then have your child say it after you."
- "Your child blends the tricky word." becomes "Say the tricky word together. Then your child says it alone."

### The heart word prototype (Grownups > Previews)

| Step | Before | After |
| --- | --- | --- |
| Meet | This is a heart word. Most of it sounds out, but one part is tricky: here, the letter e says 'uh'. We learn that part by heart. READ_HELP Then tap "Hear it". | This is a heart word. Most of it sounds out. One part is tricky: here, the letter e says 'uh'. We learn that part by heart. READ_HELP Then tap "Hear it". I do: listen to the word. We do: say it together. You do: your child says it alone. |
| Map it | Your child taps th and says its sound (buzzing, tongue between the teeth), then taps the heart: the letter e says 'uh'. Then slide a finger under the whole word and say it together: the. | We do: your child taps th, and you say its sound together (buzzing, tongue between the teeth). Your child taps the heart, and you say it together: the letter e says 'uh'. Then slide a finger under the whole word and say it together: the. You do: your child slides and says it again alone. |
| Fix the word | Say it the way it's spelled: thee. Ask: what's the real word? Your child says the. This builds flexible reading: when a word sounds odd, try the other sound. | Say it the way it is spelled: thee. Then ask, "What is the real word?" Your child says the. If they are stuck, tap Help. When a word sounds odd, we try the other sound. |
| Spell it | The phone says the word. Your child taps the tiles to fill the boxes from left to right. Tap a filled box to send its tile back. A wrong tile only shakes: we never fix it for them. | The phone says the word. Your child taps the tiles to fill the boxes from left to right. To send a tile back, tap its box. A wrong tile only shakes. Do not fix it for them: your child tries again. |
| Find it | Read the sentence together, then your child taps the heart word "the". READ_HELP Tap Got it if it went smoothly, or Help to read it together one word at a time. | Read the sentence together, then your child taps the heart word "the". READ_HELP Tap Got it if it went well. Tap Help to read it together, one word at a time. |

The phone-speaker versions of the Meet, Map, Fix and Find lines were changed to match (no sounds, no "thee").

## 6. The story text font

In the f lesson's "Read a Story" step the sentence looked funky and uneven in boldness. The cause: our stroke letters exist only for
the taught lowercase letters, so a capital ("Sam") and the full stop were drawn in a different, heavier font next to the thin stroke
letters. Fix: `wordSvg` has a new `font` option; story sentences now draw every letter and mark in one font, the house reading font
(Andika, bold, single-story a), so the whole line has one even weight. It is used in the f story (line cards and the page), in the
shared reading panel for sentences (also used by the heart word "Find it" step), and in the book reader (the child's words and the
review tiles). Single practice words made only of taught letters keep the stroke letters.

## 7. Tests

Changed on purpose: `test/check-content.mjs` (lesson frame, middles, mouth text, no outside links; Word Cars checks removed),
`test/games.mjs`, `test/tap-games.mjs` (the game placement is now each lesson's middle), `test/script.mjs` (task types, gists),
`test/slide.mjs`, `test/round2.mjs`, `test/polish-b.mjs`, `test/practice-world.mjs`, `test/sack.mjs`, `test/smoke.mjs`,
`test/guide.mjs` (task numbers), `test/platform.mjs` (no YouTube allowed, no number gate), `test/lib.mjs` (seen-task keys).
Removed with their features: the Sound Story and Word Cars checks, the alphabet song and playlist checks, the number-gate checks.

New: `test/lesson-rebuild.mjs` (in `npm test`): every lesson opens with Letter Review (lesson 1 New Sound), has Watch My Mouth right
after New Sound, ends with Practicing Words then Ticket Check, has a 2 to 4 activity middle with Saying Sounds and Track Tracing,
no two neighbours share a middle, no Word Cars; each lesson's Watch My Mouth step has the picture, the panel with that sound's
text, and the owner's script; the phone's voice says no isolated sound there (recordings on, off and missing); no YouTube address
in any app file; no song row on the overview; no outside link in Grownups.

## 8. For phase B (done: see section 9)

- Reorder and add o, c/k, u, r: `js/order.js`, the `TABLE` and `MOUTH` in `tools/gen-lessons.mjs`, `MIDDLES` in `js/games-data.js`
  (a lesson past the table repeats it; `middleFor` swaps a game the lesson cannot hold).
- The f prototype still has its own animated "mouth" screen inside New Sound. Phase B can replace it with the grown-up picture.
- Open: Practicing Words is now both the closing review and a "find the picture" game; a reading-focused closing review could
  replace it later.

## 9. Phase B: the curriculum's sound order, 17 lessons

Owner roadmap item 3, second half. No version change here (the reviewer adds it); nothing is pushed.

### What changed

- **The order** (`ORDER_SOUNDS` in `js/order.js`): World 1 Starter Station `m a s i t p` (lessons 1 to 6, unchanged, with the stops r1, b1, b2),
  World 2 Green Valley `f o n d c/k h u g l r b` (lessons 7 to 17). Before: `n f d h g b l` (lessons 7 to 13). The new lessons are o (8),
  c/k (11), u (13) and r (16). Units: 2.4 f o, 2.5 n d, 2.6 c k h, 2.7 u g l, 2.8 r b. World 2 ends at lesson 17, and so does level two
  (the coach car): level two now needs all 17 sounds.
- **Built with the generator**: `TABLE` and `MOUTH` in `tools/gen-lessons.mjs` (lessons 7 to 17), `MIDDLES` in `js/games-data.js` (17 patterns,
  no two neighbours the same), then `node tools/gen-lessons.mjs`. `data/curriculum.json` is generated, never edited by hand. The picture list
  in `sw.js` and the optional sound clips (`assets/audio/sounds/<key>.mp3`: o, c, u, r are new) are written by the same run. The recording
  studio lists the sound as `sound-c` (the c/k lesson).
- **Letters**: new stroke glyphs for o, c, k, u, r (`js/glyphs.js`, drawn in the style of the others: o is the bowl of a, c is the bowl left open,
  k is a tall stem with arm and leg, u and r like n flipped and cut) and four new accent colours (o purple, c/k deep cyan, u coral, r green;
  `js/theme.js` and `css/app.css`).
- **Every word a child reads is decodable** from the sounds taught up to and including its lesson. Saying Sounds' three letter words, the
  Station Board words and the Ticket Check letters are checked by `test/check-content.mjs` and again, from scratch, by `test/phase-b.mjs`.
  A picture word whose letters are not all taught yet (fish, nut, duck, leaf, robot) used to be shown as letters to slide under. It is now
  only said (`sayOnly` in the data): the picture and the grown-up's voice, no letters. A picture word that is decodable (pot, cat, hippo,
  sun, goat, ball) still reveals its letters. Lessons 1 to 6 are unchanged.
- **Wrong cards** (`POOL_ADD` and `AVOID` in the generator): the lesson's own sound never appears among its wrong cards. New avoid rules: g
  words (goat, gate) and "queen" stay out of the c/k rounds (k and g are close, and qu says kw), and w words (worm, wagon, window) stay out of
  the r rounds. Words that start with k count as c words (`kite`, `king`, `koala`).
- **Letter Hunt distractors** are letters that look unlike the target (taught letters first, padded with a few not yet taught: the child
  finds a letter, not a word). New look-alike pairs: o/c, o/a, r/n, r/h, k/h, k/b, k/l.

### c and k: one lesson, one sound, two spellings

- Data: the key is `c`, `sounds.c.alt = ['k']`, `sayItLike` is `k-` (clipped, "do not say kuh"), the clip is `assets/audio/sounds/c.mp3`.
  `SPELLINGS`, `spellingsOf` and `soundOfLetter` in `js/order.js` are the one place that knows k belongs to c.
- The words: pictures camel, candy, cat, king, koala; reading words `cap kit cot` (a c word, a k word, a c word); Station Board `cat sad kid kin`
  (its c rounds take the spellings in turn); Ticket Check "Which picture starts with k-?" (cat).
- The child sees both letters: New Sound (both glyphs in one card, "The letters c and k make the same sound: k-."), Watch My Mouth ("c and k
  make the same sound." and "How to make k-"), the lesson overview ("c and k make the same sound, k-", both letters on the chips and cards),
  Track Tracing (two 56 px letter buttons next to Clear and Show me, c first), the Find card of the games.
- The games: Letter Hunt deals c and k balloons as targets in every sky (never other balloons that are c or k), Green Light and Wagon Parade
  show c and k in turn on the target lamp or wagons, Station Board accepts the c or the k tile. A place that can show only one glyph (the
  slide track, the Home stop) uses c; the journey board's unit list shows c k h.
- The grown-up text writes the sound as `k-` everywhere ("Say: k-", "k-at"): `soundText` in `js/scripts.js` maps c and k to it. The phone never
  says an isolated sound: the prompt is text for the grown-up, or the recording `c.mp3` when it exists (a missing clip shows the prompt).

### Saved progress: mapped by sound, never reset

A save made under the old order (`order: 'masitpnfdhgbl'`, one character per lesson, `LEGACY_ORDER`) is mapped in `store.parse()`:
each saved lesson n teaches the sound `LEGACY_ORDER[n - 1]` and moves to `ORDER_SOUNDS.indexOf(sound) + 1`.

| Old lesson | 1 to 6 | 7 n | 8 f | 9 d | 10 h | 11 g | 12 b | 13 l |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| New lesson | 1 to 6 | 9 | 7 | 10 | 12 | 14 | 17 | 15 |

- Finished lessons (`result: 'got-it'`) keep their result, `completedAt` and `doneAt`. Unfinished mapped lessons keep their result (for
  example practice-again) and get `tasksDone: []`, because the task lists differ by lesson. Lessons that were counted as done only because a
  later one was finished (the old derived rule) are written out as done first.
- The new lessons o, c/k, u and r have no saved entry, so they are still to do. A child who had finished all 13 old lessons now has 4 lessons
  left, and o (8) is the current one.
- `settings.trainAt` and `settings.trainDone` are dropped (Home records fresh counts and plays no spurious ride), and `seenScripts` keys
  that start with `lesson:` are dropped (they are per old lesson number). The checkpoints r1, b1, b2 (World 1, by id, unchanged), the
  character, levels, `worlds.seen`, `savedAt` and the other settings stay. A stop that counted as done because the next lesson was is
  written out as done.
- A save with no `order` field or an unknown order keeps the old rule: a real install (it has `lastOpened`) starts its lessons again once.
- The cloud copy goes through the same `parse()` (`adopt`), so a pull on sign-in is mapped too.
- The localStorage key `reading.v1` is unchanged.

### The lock rule

`isDone(n)` is strict: a lesson's own result is got-it (it no longer counts as done because a later lesson is). A lesson is open when it is
done, a grown-up unlocked it, or every earlier lesson is done (`earlierDone`). The current lesson is the first one that is open and not
done. Example: old n f d done maps to f (7), n (9), d (10) done; o (8) is not done, so o is the current lesson and c/k (11) stays locked
even though d (10) is done. The pace limit's "next new lesson" follows the same rule. A level is earned only when every lesson up to its own is
done (`levelReached` in `js/levels.js`). Developer mode "open all" is unchanged.

### New words per lesson (Green Valley)

| Lesson | Sound | Unit | Saying Sounds letter words | Picture word | Station Board words | Middle | Ticket Check |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 7 | f | 2.4 | fat fit if | fish (said only) | fat pat fit it | sounds, wagons, writing, board | picture: fish |
| 8 | o | 2.4 | top pop sit | pot | mop if mom map | hunt, writing, sounds | letter |
| 9 | n | 2.5 | nap not tin | nut (said only) | man on an fan | signals, sounds, board, writing | picture: nut |
| 10 | d | 2.5 | dad dip sad | duck (said only) | sad sand mad mop | writing, sounds, wagons | letter |
| 11 | c and k | 2.6 | cap kit cot | cat | cat sad kid kin | board, sounds, hunt, writing | picture: cat |
| 12 | h | 2.6 | hat him hot | hippo | hat cat had sad | writing, signals, sounds, wagons | letter |
| 13 | u | 2.7 | mud cup hut | sun | sun hum sum cut | hunt, sounds, board, writing | picture: umbrella |
| 14 | g | 2.7 | tag dig pig | goat | sag sun mug hug | signals, writing, sounds, board | letter |
| 15 | l | 2.7 | lap lip lid | leaf (said only) | pal sag lag mug | writing, sounds, wagons, hunt | picture: leaf |
| 16 | r | 2.8 | rat rip rug | robot (said only) | rat pal ran rag | board, sounds, writing, signals | letter |
| 17 | b | 2.8 | bat big bad | ball | sob rob cob lab | hunt, writing, sounds, wagons | picture: ball |

Ticket Check alternates by lesson number (odd lessons ask for a picture, even lessons for a letter), so the kind of a sound's check can differ
from before. The Watch My Mouth text for the new sounds (`MOUTH`): o "Open your mouth wide and round, like an O. Keep your tongue low and still.
Voice on."; c/k "Lift the back of your tongue to the roof of your mouth. Drop it with a quick puff of air. Voice off."; u "Open your mouth a
little. Keep your jaw and tongue relaxed and low. Voice on."; r "Pull your tongue back and up, without touching the roof. Round your lips a
little. Voice on."

### Tests

Changed because the lessons and the order changed: `store`, `check-content` and every suite that named a lesson by number, a sound by its old
lesson, or "13 lessons" (listed in the phase B report). New: `test/phase-b.mjs` (in `npm test`): the order and the count, decodability of
every reading word, the c/k lesson (both letters in New Sound, Watch My Mouth, the overview, Track Tracing, Letter Hunt, Station Board,
Ticket Check), the mapping of a legacy save and of a cloud copy, the lock rule, World 2 ending at lesson 17.

### Still open

- Record the new sounds (o, c, u, r) with the studio; until then the prompt "Say: k-" shows for the grown-up.
- The f prototype's own animated mouth screen is still separate; Practicing Words is still both the closing review and a "find the picture"
  game (both as in section 8).

## 10. Review Stops and Read It Again

Owner decisions of 2026-10-10 (roadmap items 3c and 6). Built after phase B because both need the final sound order.

### Review Stops (checkpoint kind `review`, ids `v1` to `v5`)

- **What:** a short run of the fun games on letters the child has already met, nothing new: no New Sound, no Watch My Mouth, no Track
  Tracing. The stop is called "Review Stop" (one short, neutral name; its icon is a blue game ticket with a gold star).
- **Where:** after lesson 3 (m a s), 9 (f o n), 12 (d c/k h), 15 (u g l) and 17 (r b). Lesson 6 already has Story 2, so no review there.
- **How the content is picked:** `tools/gen-lessons.mjs` (`REVIEW_PLANS`) lists each stop's activities as `{ task, lesson }`: the game, and
  the lesson whose sound it is about. Every stop is 3 games plus Ticket Check, which is always last and always a letter question (so no
  picture word from a later lesson shows). The plans lean on the three newest sounds (at least half of the activities), with an older sound in
  most stops, and the mix of games differs at every stop. The games are the lesson's own screens (`js/screens/review.js` calls the same
  builders as `js/screens/task.js`), and they already mix the planned sound with the ones before it (`roundTargets`, `otherLetters` in
  `js/games-data.js`). To keep it to taught letters, a review stop also trims every Letter Hunt, Green Light and Wagon Parade filler letter
  to the letters taught by that stop (a lesson's own list holds a few letters that come later). Green Light is not used at v1: three
  sounds cannot fill its four lamps.
- **Parent text:** the games' own scripts, plus one tip on every step: "This is a review. Let your child try first. Only if your child
  misses, say the sound, then have your child say it after you." The child recalls first; the grown-up models only after a miss.
- **On the line:** a review stop next in line holds the train, like Story stops (`checkpointStopIndex` in `js/sequence.js`), and shows on the
  3D line and the 2D path with the ticket icon. It opens when its lesson is done, is done by the grown-up's "Yes" (the checkpoint finish
  screen), and does not lock the next lesson. It is not a new lesson, so it does not count against the daily limit.
- **Saved data:** existing saves have no result for the new stops. `isCheckpointDone` already counts a stop done once the lesson after it is
  done, so a child past lesson 3 or 9 is not sent back, and the stop behind them never holds the train. The ride counter (`trainDone`)
  counts a stop only from its own result, so no ride plays for stops the child never played.

### Read It Again (checkpoint `r1`, kind `reread`; it replaces Smooth Ride)

- **What:** a repeated-reading station after lesson 4. The grown-up reads a tiny story once, pointing to each word; the child then reads it
  back one sentence at a time. After each sentence the grown-up taps a big "Read it!" and the train on the screen pulls one more wagon into
  view. "Again" starts the reading over. At the end Pip waves at the station. Same finish screen as every stop.
- **The story** (only m a s i, plus the heart word "I" that Story 1 already teaches): "I am Sam." "I miss Sis." "Sis! Sis! I am Sam!"
- **Parent script:** (listen) "Read the whole story to your child once, slowly, pointing to each word as you say it. Your child only
  listens. Then tap 'Your child reads'." (read) "Your child reads one sentence at a time. Let your child try first. If your child gets stuck,
  sound the word out together. Still stuck? Read the sentence yourself, then have your child read it after you. After each sentence your child reads,
  tap Read it!" The app judges nothing.
- **Why:** repeated reading with a fluent adult model improves fluency (Therrien 2004, already in the white paper's table).
- **The microphone is gone from the app.** `js/mic.js`, `js/blend-detect.js`, the Smooth Ride screen, its permission card and its tests are
  deleted. Nothing in the app listens or records. The id `r1` is kept so saved results stay valid; the old timings and word list are gone
  from the data.
- **Look:** the storybook cream page and the practice frame; fits 360 x 640, 390 x 844 and 915 x 412; 48 px targets; only CSS transforms and
  opacity move, and nothing runs while the page is idle.

### Tests

New: `test/review-stops.mjs` (placement, content, hold, passed stops, unlock, saved result, no spurious rides, fit, heat) and
`test/read-again.mjs` (replaces `test/ride.mjs`: the story data, the flow, Again, the finish, fit, heat, no microphone anywhere).
Updated: `check-content` (reread and review rules replace the ride rules), `phase-b` (the stop list), `sack`, `lib` (seen flags), `train`,
`platform`, `round2` and `smoke` (the microphone rules now say "nowhere"), and the suites that count stops (see the build report).

## 11. World 3, Sunny Hills: lessons 18 to 25

Owner-approved plan (units 2.9 to 2.11 of docs/CURRICULUM.md). Built with no version change; nothing is pushed. Heart words are not part of it.

### Order, units, world

`ORDER_SOUNDS` gains `e j w v y z x q` at the end (25 lessons). Lessons 1 to 17 keep their numbers. World 3 (Sunny Hills) is lessons 18 to 25:
unit 2.9 = e (18), unit 2.10 = j w v (19 to 21), unit 2.11 = y z x qu (22 to 25). The units list the key `q` for qu.

| Lesson | Sound | Unit | Saying Sounds letter words | Picture word | Station Board words | Middle | Ticket Check |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 18 | e (as in egg) | 2.9 | pin pen bet | egg | set bet met rat | writing, sounds, hunt | letter |
| 19 | j | 2.10 | jet jug jog | jump | jab jet jot sob | sounds, signals, writing | picture: jet |
| 20 | w | 2.10 | wet web wig | wagon (said only) | wag jab web wet | hunt, sounds, wagons, board, writing | letter |
| 21 | v | 2.10 | van vat vet | vest | van wag vat jab | signals, sounds, writing, wagons | picture: van |
| 22 | y | 2.11 | yes yet yam | yarn (said only) | yam van yap wag | sounds, board, writing | letter |
| 23 | z | 2.11 | zip zap buzz | zebra (said only) | zap yap zip van | writing, hunt, sounds, signals | letter |
| 24 | x | 2.11 | six box mix | fox | six zip mix yam | sounds, wagons, writing, board | letter |
| 25 | qu | 2.11 | quit quiz quilt | queen (said only) | quit six quiz zip (not used: no Station Board in lesson 25) | hunt, writing, sounds | letter |

Notes on the choices:
- **e** is the egg anchor ("as in egg", the only e tile that begins with e) and the grown-up is told to compare pin and pen (and later bit and bet).
  The New Sound parent script adds a short `parentNote` (data field on the sound). Lesson 18 reads pin, pen, bet.
- **w** gets one extra game (lesson 20 has five activities: `EXTRA_MIDDLES` in `js/games-data.js`), and a note that the letter's name does not
  contain its sound. **y** carries a note on its name and the yet/wet contrast. **v** and **z** are the buzzing partners of f and s: their notes
  ask the child to say f (or s) first, then v (or z), and their Watch My Mouth says "like f (or s), now turn your voice on".
- **x** is heard at the end of words, so it has no start word: `sounds.x.endOnly`, no start words, no Practicing Words round of its own (that
  lesson's Practicing Words reviews earlier sounds), tiles fox, box, ox (all with the x inside), reading words six box mix. The parent writes x as `ks-`.
- **qu** is one unit of two letters. The data key is `q`; its glyph is "qu" drawn as one 100-wide letter (`GLYPHS.q`: the round bowl, the stem
  below the line, then a narrow u: four strokes), so cards, games, tracing and word rows treat it as one letter. `letterUnits(word)` in
  `js/order.js` drops the u after a q: `quit` is q i t, `quiz` is q i z, `quilt` is q i l t. `wordSvg` skips that u, so Saying Sounds and the slide
  show q as one group; Saying Sounds clips and the Station Board use the units. The parent writes it as `kw-` (`sayItLike`), never read out
  by the phone's voice (`scripts.js` knows kw- and ks- as sound tokens). check-content proves that a q is always followed by u.
- The Ticket Check is a letter question at 23 and 25 as well as at the even lessons: no wrong picture can be found for those two, because
  every first letter is taught by then (wrong pictures must begin with an untaught letter).
- A picture word is shown as letters only when the plain letter sounds say it. wagon, yarn, zebra and queen use only taught letters but are not
  read that way (a schwa, ar, a long e, ee), so they are `sayOnly` (`IRREGULAR_PICTURES` in test/check-content.mjs).
- Practicing Words (the Sound Sack inside a lesson): late in the order too few pool pictures start with an untaught letter, so when fewer than
  two are left, any pool picture that does not begin with the asked sound is used (`js/screens/sack.js`).
- Letters: all eight now have our own stroke glyphs (`js/glyphs.js`), so the single-story look holds for every lesson. Accent colours (theme.js,
  css/app.css, contrast 4.9:1 or more on white): e #B3472F, j #6A4FC4, w #1F7A8C, v #A33B7A, y #8A6D00, z #2E7D32, x #C2410C, q #3F51B5.

Watch My Mouth (`MOUTH`): e "Open your mouth a little, a bit wider than for i. Keep your tongue forward and relaxed. Voice on."; j "Round your
lips a little. Press your tongue up, then let the sound burst out. Voice on."; w "Round your lips like a small O, then open them quickly. Voice
on."; v "Top teeth on your bottom lip, like f. Now turn your voice on and feel the buzz. Voice on."; y "Smile a little. Lift the middle of your
tongue, then let it glide down. Voice on."; z "Teeth close together, like s. Now turn your voice on and feel the buzz. Voice on."; x "Two quick
sounds: tap the back of your tongue up (k), then blow air through your teeth (s). Voice off."; qu "Lift the back of your tongue (k), then round
your lips (w). Say both quickly as one sound. Voice on."

### Pictures

Used from `assets/images/mentava/web`: e egg hen nest tent; j jet jump; w wagon window worm; v van vest volcano; y yarn yoyo; z zebra zipper zoo;
x fox box ox; q quack queen quilt. Not used because they show a misleading picture: j/jam (a knife), e/red (a paint can), y/yellow (a paint bucket).
Missing pictures (prompts added to docs/IMAGE-PROMPTS.md, marked "new, no current file"): e elephant and bed, j jug and jar, w watch and web,
v violin, x xylophone, y yak.

### Stops

Owner rule: **every world ends with a Review Stop.** New stop ids never renumber the old ones (a saved result is keyed by id):

| Stop | After lesson | World | Notes |
| --- | --- | --- | --- |
| v1 | 3 | 1 | unchanged |
| r1, b1 | 4 | 1 | unchanged |
| b2 | 6 | 1 | Story 2, unchanged |
| **v6** | 6 | 1 | new: the end of World 1, right after Story 2 (Story first, then the Review Stop). Plan: Letter Hunt p, Wagon Parade t, Green Light a, Ticket Check p |
| v2 to v5 | 9, 12, 15, 17 | 2 | unchanged; v5 is the end of World 2 |
| **v7** | 20 | 3 | e j w: Wagon Parade w, Letter Hunt j, Green Light i (keeps e and i apart), Ticket Check w |
| **b3** | 22 | 3 | Story 3 (below) |
| **v8** | 23 | 3 | v y z: Station Board z, Green Light y, Wagon Parade f (the unvoiced partner of v), Ticket Check y |
| **v9** | 25 | 3 | the end of World 3, a mix of the five short vowels: Letter Hunt e, Wagon Parade u, Green Light o, Letter Hunt i, Ticket Check a (`mix: 'vowels'` in the data) |

The test rule "half the activities about the three newest sounds" is switched off for v9 (`mix`). Saves: a child already past lesson 6 counts
v6 as passed (the derived rule), so nothing is sent back and no ride plays for it.

**Known behaviour, not changed:** the crossing into the next world plays as soon as the world's last lesson is done, and does not wait for the
stops that follow it (Story 2 and v6 after lesson 6, v5 after lesson 17). They stay in the world just crossed and count as passed once the next
lesson is done. This was already so for Story 2; it now also affects v5 and v6. Making the crossing wait for them is a decision for the owner.

### Story 3 (`data/books/book-3.json`, stop b3 after lesson 22)

"Pip and the Sunny Hills", 10 pages, the child reads one word on five of them; every child-read word uses only letters taught by lesson 22 (plus
the heart word I that Story 1 already uses), the grown-up reads the rest. The child is called by name, never he or she.

1. Toot toot! The little train rolls up into the Sunny Hills. Pip, {name} and Sam look out at the golden fields.
2. Pip wants a picnic at the top of the hill. A shiny silver plane zooms over the fields. Pip points up and says, "Look! It is a ..." **jet**
3. By the fence, a soft brown hen sits on her nest. Under the hen is a round white ... **egg**
4. (drag page) Off they go! Up, up, up the sunny hill.
5. Honk! A little blue ... drives by with a load of hay. The driver gives a big wave. **van**
6. Splash! A little rain falls on the hill. The grass is all ... **wet**
7. At the top, the sun comes back out. Pip spreads a soft blanket. Sam asks, "Can we eat now?" Pip says ... **yes** "Yes! Dig in!"
8. Pip, Sam and {name} eat a big, warm bun. It is so good. Everyone says ... (mmmm)
9. The sun sets over the Sunny Hills. Everyone climbs back on the train. Pip asks, "Did you have fun today?" {name} says ... **I did** "The end. Toot toot!"
10. (review page) Read them all! jet, egg, van, wet, yes, I did

### Levels

Level three (flatbed) is earned after lesson 25, the end of World 3 (one level per world). Levels four and five are placeholders for Digraph Docks
and Blend Bay and say "Coming later". The journey board and the Grownups list show three built levels.

### Saved progress

The 17-sound order string `m a s i t p f o n d c h u g l r b` (stored by 1.9.33 to 1.9.36) is a prefix of the new one; `store.parse()` reads a
save carrying it as the current order (`PRIOR_ORDERS`), so lessons 1 to 17, stops, levels, worlds, settings and the train position stay exactly as
they were, and lesson 18 is the next lesson. The legacy 13-lesson mapping and the unknown-order rule are unchanged.

### Play

The Green Valley to Sunny Hills crossing is the same generic one as World 1 to World 2 (World 3's scenery and theme were already built). Going
back works W3 to W2 to W1 (the visited world's start tunnel is the button). Grownups lists the third world, its units 2.9 to 2.11 and its stops.

### Tests

New: `test/sunny-hills.mjs` (in `npm test`, before smoke). Changed deliberately: `check-content` (sayOnly list, end-only x, 5-activity middle for
lesson 20, the q-then-u rule, letter Ticket Checks at 23 and 25, the mix review, yellow as a misleading picture), `store` (the order string),
`phase-b` (25 lessons, the stop list, level three, the current world at lesson 17 is W3), `review-stops` (nine stops, v6 sharing lesson 6 with
Story 2, v9), `worlds` (World 1 has eleven stops, three worlds with lessons, the siding scene uses a save with Green Valley done), `regions` (W3 is
a real world, not a placeholder), `journey` (three stars, W3 current at lesson 18), `levels` (three built levels), `world-visit` (eleven stops in
World 1, reached worlds), `lib` (sample lessons now include 18 and 25). `train`, `map` and `smoke --fast` needed no change.
