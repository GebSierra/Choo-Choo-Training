# Lesson rebuild, phase A

Owner decisions of 2026-10-08. This page is for the owner to read. It lists what changed in the 13 lessons, the new lesson frame,
the new "Watch my mouth" step, and every grown-up line before and after. No version change; nothing is pushed.

Phase A keeps today's sound order (`m a s i t p n f d h g b l`, `js/order.js`). Phase B will reorder it and add o, c/k, u and r.

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

A small note on saved progress: a lesson that was half done keeps its saved task numbers, which now point at different tasks. A
lesson that is finished stays finished. Nothing else is touched.

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

**Letter Review**
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

## 8. For phase B

- Reorder and add o, c/k, u, r: `js/order.js`, the `TABLE` and `MOUTH` in `tools/gen-lessons.mjs`, `MIDDLES` in `js/games-data.js`
  (a lesson past the table repeats it; `middleFor` swaps a game the lesson cannot hold).
- The f prototype still has its own animated "mouth" screen inside New Sound. Phase B can replace it with the grown-up picture.
- Open: Practicing Words is now both the closing review and a "find the picture" game; a reading-focused closing review could
  replace it later.
