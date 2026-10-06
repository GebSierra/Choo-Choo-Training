# Choo Choo Training: How Your Child Learns to Read

**Curriculum, scope and sequence.** Version 0.9, draft for the owner's approval, October 2026.

> **How to read this document.** Most of it is written for parents and for our website: what we teach, in what order,
> and the research behind it. Sections marked **Builder notes (internal)** are for the people building the app and are
> removed from the public version. Features marked **(coming)** are planned but not in the app yet; the public version
> keeps the mark until they ship. When this draft is approved it becomes the authority for the app and replaces
> docs/CURRICULUM-DRAFT.md.

---

## 1. Design principles

Choo Choo Training takes children from hearing sounds to reading real stories in 10 stages and 54 units, organized
around how the brain actually learns to read. It teaches sounds one at a time in a planned order, groups related
patterns into families, moves high-value skills earlier, and turns most "sight words" into patterns children can sound
out.

**From learning science** (Barbara Oakley's summaries of cognitive research):

- **Chunking.** Children build small chunks and link them into bigger ones: sound, then letter, then word, then phrase,
  then sentence, then story. Related patterns are taught as one family (er, ir and ur all say the same sound), so one
  chunk unlocks many words.
- **Retrieval practice.** Children produce the answer (say the sound, read the word, build the spelling) instead of only
  watching or recognizing it. Recognition alone can feel like learning without being learning.
- **Spaced repetition.** Everything learned comes back later, at growing intervals, so it moves into long-term memory.
- **Interleaving.** A new pattern is first practiced alone, then mixed with look-alike patterns (cap/cape, pin/pen) so
  children learn to tell them apart. Mixed practice feels harder, so we balance it with plenty of success.
- **Short, frequent sessions.** Lessons take 5 to 15 minutes. Sleep helps lock in learning, so the app encourages short
  daily sessions rather than long ones.
- **Fluency.** Reading has to become automatic. Practice continues past "got it right once" until it is quick and easy.

**From the science of reading:**

- **Systematic, explicit phonics.** Every sound and spelling is taught directly, in a planned order, from simple to
  complex.
- **Sound awareness, linked to letters.** Children blend and break apart sounds every day, using letter tiles as soon as
  they know the letters, because practice with letters works noticeably better.
- **Orthographic mapping.** Children connect each sound to its letters, which is how words become instantly
  recognizable. That is why "sight words" become **heart words** here: sound out the regular parts and learn only the
  tricky part "by heart."
- **Reading and spelling together.** Every lesson pairs reading a pattern with spelling it. **(coming)**
- **Decodable text.** Early stories use only the sounds and heart words already taught, so children read by sounding
  out, not by guessing from pictures.
- **Language comprehension.** Vocabulary and meaning checks are built into the stories, because reading is decoding
  times understanding (the Simple View of Reading). **(coming)**

## 2. Research foundations

The strongest, most replicated findings support explicit systematic phonics, sound awareness taught with letters,
spelling practice, and repeated oral reading with feedback. The evidence for decodable books and for reading apps in
general is real but weaker. The table rates each finding, so our design rests on the strongest evidence first.

| Finding | Key evidence | Strength | What the app does |
| --- | --- | --- | --- |
| Systematic, explicit phonics beats unsystematic or no phonics | National Reading Panel (2000) meta-analysis: mean effect 0.44; later syntheses report similar effects (about 0.4 to 0.5). Critics' reanalyses found smaller effects, still favoring phonics | Strong | A fixed, cumulative sequence; every sound and spelling taught directly |
| Sound awareness works best when tied to letters | Ehri et al. (2001), 52 studies: effects on reading noticeably larger when taught with letters (about 0.67 vs. 0.38). A 2024 dosage meta-analysis (Erbeli et al.) found gains peaked at about 10 hours of instruction overall, and at about 16 hours when letters were part of it | Strong | Oral-only sound play is brief (Stage 1); sound activities then use letter tiles |
| Words become instant "sight words" through letter-sound connections, not visual memory | Ehri (2014), orthographic mapping: helped by teaching how sounds are made in the mouth and by pictures built into letter shapes | Strong theory, well supported | Letter-embedded picture cues; heart words instead of whole-word memorizing; mouth-shape pictures **(coming)** |
| Spelling practice improves reading | Graham and Santangelo (2014), 53 studies: spelling instruction improved reading (0.44) and phonological awareness (0.51) | Strong | A "build the word" spelling step in every lesson **(coming)** |
| Reading comprehension = word reading x language comprehension | Simple View of Reading (Gough and Tunmer, 1986); Scarborough's Reading Rope shows the sub-skills | Strong | A language strand: vocabulary, listening to rich stories, meaning questions **(coming)** |
| Guessing words from pictures or context is a poor-reader habit | Skilled readers process every letter (Castles, Rastle and Nation, 2018); no direct evidence that teaching three-cueing improves reading (Shanahan) | Strong consensus | Hints never say "look at the picture" or "what makes sense" (see the rules) |
| Read connected text daily, with feedback | IES practice guide (2016): moderate evidence for daily connected-text reading; strong evidence for sound awareness linked to letters and for decoding instruction | Moderate to strong | Stories now at story stops; a sentence or mini-story in every lesson **(coming)** |
| Repeated reading builds fluency and comprehension | Therrien (2004), 18 studies: fluency 0.75, comprehension 0.73 for students with learning disabilities; reading with a fluent adult model worked better than reading without one | Strong for fluency | Listen to a model, then reread the same story over a few days **(coming)** |
| Decodable books help early practice, but evidence is thin | Research is limited and mixed; benefit is most plausible through about the middle of first grade | Weak to moderate | Decodable stories early, then a planned shift to less-controlled text from Stage 6 |
| Flexibly fixing a near-miss pronunciation predicts word reading | "Set for variability" explained substantial unique variance (about 15 to 16 percent) in grade 2 to 5 word reading, while phonemic awareness added almost nothing once it was included (Steacy et al.); training studies are early | Emerging | A "fix the word" activity for heart words **(coming)** |
| Spacing practice over time improves long-term learning | The spacing effect is long established; Vlach and Sandhofer (2012) confirmed it for learning in 5- to 7-year-olds (science concepts, not reading) | Strong | Earlier sounds and words come back in later lessons |
| Reading apps help, modestly | Kim et al. (2021), 36 studies: +0.31; a 2026 working paper by the same group (141 studies): +0.40. Both cover reading and math together; effects are larger on researcher-made tests, and evidence at scale is limited | Moderate | We plan to measure with standardized tests, not only in-app progress **(coming)** |
| Story games and tap-hotspots can distract young readers | Takacs, Swart and Bus (2015), 43 studies, 2,147 children: story-matched animation, music and sound helped; hotspots, games and dictionaries distracted, and disadvantaged children were most sensitive to both | Moderate | A story tap never replaces reading: the child reads the word first, and taps belong to the story |
| Speech-recognition reading feedback is promising but imperfect | A Dutch study of 525 first graders using a speech-recognition reading tutor: all groups gained accuracy, and explicit feedback helped more for sentence reading (Bai et al., 2025); recognizing children's speech is still error-prone | Emerging | Today a grown-up listens and confirms; optional speech recognition for sentence reading **(coming)** |

A note on the learning-science principles: chunking, retrieval and spacing draw on general cognitive research. Spacing
has direct evidence in young children (above); interleaving and short "focused and diffuse" sessions were not verified
with young readers in this review, so we treat them as design choices to test.

> **Builder notes (internal).** Every figure was fact-checked on 2026-10-06 and corrected where the sources differed (a
> claimed 2025 phonics review was the wrong paper and is removed; "twice as large" became the actual 0.67 vs. 0.38;
> the dosage, spelling, set-for-variability, app and pace figures were tightened). Still to confirm against the
> primary page before publishing: the Hasbrouck and Tindal norms (29/60, 84/100, from secondary summaries) and the
> exact Head Start wording; the Ehri spelling comparison was dropped because it could not be confirmed.

## 3. Rules the app follows

These guardrails keep the app aligned with the science of reading and away from guessing habits. Every lesson, story,
hint and feedback message follows them.

1. **No guessing prompts.** Hints never say "look at the picture," "what would make sense," or "what letter does it
   start with, then guess." The only hint is to sound it out: hear a letter's sound, then blend.
2. **No predictable or patterned books** ("I see a cat. I see a dog.") as reading practice; they train memorizing and
   guessing. Patterned books may be read *to* the child, for language and fun.
3. **No whole-word memorizing of decodable words.** A word is taught as a heart word only if part of it is truly
   irregular, and even then the regular letters are sounded out.
4. **Every word in a child-read story is decodable or a taught heart word,** until the planned move to less-controlled
   text in Stage 6.
5. **Correct errors right away and specifically.** Point to the exact letters that were misread, model the right sounds,
   and have the child reread the word. Never just "try again."
6. **Taps never replace reading.** In stories, the child reads the word first; a tap that animates the story comes with
   or after the reading and belongs to the story, never a surprise hidden in the picture. Rewards come after reading.
7. **Accuracy before speed.** Speed goals start only after a pattern is read accurately.
8. **Letter sounds come from a real voice.** Every letter sound and blended sound the child hears is a recording of a
   person. The phone's synthetic voice may read whole words and sentences, never an isolated letter sound.

## 4. How we teach blending

Blending is taught as one smooth, connected stream of sound, never as chopped sounds, and words get harder in a
planned order. In a kindergarten study, children taught connected blending ("sssaaannn") learned to decode new words better than
children taught to pause between sounds, and did better even on a later test with words beginning with stop sounds
(Gonzalez-Frey and Ehri, 2021).

1. **Hear it first (Stage 1).** A grown-up or a recording says a word slowly and smoothly ("mmmaaat"); the child picks
   the matching picture.
2. **Two-sound words with stretchy sounds:** am, at, it. The child slides a finger under the letters while saying one
   unbroken sound.
3. **Three-sound words starting with a stretchy sound:** Sam, sat, mat, sit, map. The stop sound, if any, comes last.
4. **Words starting with a stop sound:** tap, pit, pat. The child says the stop quickly and attaches it straight to the
   vowel ("ta...p"), never "tuh."
5. **Word chains every lesson (coming).** Change one letter at a time, in the first, middle or last position (sat, sit,
   sip, tip, tap, map). This makes the child look at every letter, especially vowels.
6. **Fade the support.** Letters light up one by one as the child sounds them out; in time the child whisper-reads, then
   reads the whole word on the first try.
7. **Blends and longer words.** Two consonants stay joined with no "uh" between them ("sssnap," not "suh-nap").
   Two-syllable words are split, each part is read, then the parts are glued: nap + kin.

**When a child gets stuck:** first replay the smooth model. If the child is still stuck, build the word from the start
(s, sa, sat), so the child holds only one growing chunk.

**How to correct a misread word** (used everywhere in the app, and taught to grown-ups):

1. Point to the exact letter that was misread.
2. Say its sound: "This says /i/."
3. Have the child blend the whole word again.
4. Have the child reread the whole sentence, so the corrected word is practiced in context.
5. Bring the word or sound back in the next review.

## 5. Universal pronunciation rules

These apply to every recording in the app and to how grown-ups say sounds at home.

- **Stretchy sounds** can be held: /a/, /e/, /i/, /o/, /u/, /m/, /s/, /f/, /n/, /l/, /r/, /v/, /z/, /sh/, /th/. Say them
  long and smooth: "mmm," not "muh"; "sss," not "suh."
- **Bouncy sounds** are short and clipped: /t/, /p/, /k/, /b/, /d/, /g/, /j/, /ch/. Say "t," not "tuh." Never add an
  "uh" after a consonant, because "buh-a-tuh" doesn't blend into "bat."
- **Buzzing and quiet pairs:** some sounds come in pairs made with the same mouth shape, one with the voice buzzing and
  one quiet (/v/ and /f/, /z/ and /s/, the two /th/ sounds). Children can check by touching their throat.
- **Blending style:** stretch continuously ("mmmaaat"), never chop ("m... a... t"). This is easiest when words start with
  a stretchy sound, which is why the first words do.

## 6. Trouble spots and how the app handles them

Most early reading errors come from a short, predictable list. The letter order in Stage 2 and the blending method are
designed around it.

| Trouble spot | Why it trips children up | How the app teaches around it |
| --- | --- | --- |
| Adding "uh" to bouncy sounds ("tuh," "puh") | "Tuh-a-puh" doesn't blend into "tap." Stop sounds can't be stretched, so children pad them with a vowel | All recordings use clipped stop sounds. Words where the stop comes **last** (at, sat, map) come before words where it comes **first** (tap, pit) |
| Forgetting the first sound while blending | Pausing between sounds ("sss... aaa... nnn") overloads memory | Connected blending only: sounds are stretched and joined without a break ("sssaaannn") |
| Mirror letters: b, d, p, q | The visual system treats mirror images as the same object; reversals are a normal stage, common through about age 7 (second grade), and not a sign of dyslexia on their own | p is taught early and alone; d comes 2 units later; b waits 3 more units; q comes last. Each gets its own picture cue and tracing practice. b/d contrast drills start only once both are secure |
| Look-alike letters: m/n, n/u/h, f/t, i/l | Letters that differ little in shape are harder to learn | Look-alikes are taught apart: m (2.1) and n (2.5); n (2.5) and u (2.7) |
| Sound-alike pairs: t/d, p/b, f/v, s/z, k/g, m/n, f/th | The sounds differ only in voicing or one small mouth movement | The second sound of each pair is taught as the "buzzing partner" of the first, with a touch-your-throat check and minimal pairs (tip/dip, fan/van, fin/thin) |
| Short e vs. short i | They sound very close and are commonly confused | Taught far apart (i in 2.2, e in 2.9), each with a strong picture anchor, then contrasted: pin/pen, bit/bet |
| Letter names that mislead | w's name leads children to /d/, y's name to /w/, and h's name has no /h/ in it | The app uses letter **sounds** in all reading tasks; w, y and h get extra practice; y is contrasted with w (yet/wet) |
| Vowel letters read with their names | "a" is read as /ay/ because that's the letter's name | Short-vowel picture anchors (a for apple) and sounds, not names, during reading |
| Reading the first letter and guessing the rest | Beginners decode the start of a word and stop looking | Daily word chains that change one letter in any position **(coming)** |
| Dropping the second consonant in clusters | Children hear "st" as one unit and read "stop" as "sop" | Clusters are built with separate letter tiles, and chains add a sound: sap, snap |
| Dropping n or m before a final stop | In "sand," the n melts into the vowel, so children read "sad" | st and ft come first; nd, mp and nt after, with contrast pairs: sad/sand, cap/camp |
| Still-developing speech sounds (/r/, /l/, /th/) | Many young children can't yet say these clearly, which can be mistaken for a reading error | The grown-up judges the word, not the articulation |

## 7. The daily lesson loop

Every lesson takes about 5 to 15 minutes and follows the same pattern, so children spend their energy on reading, not
on figuring out what to do next.

1. **Sound warm-up (1 min).** Blend spoken sounds into a word and break a word into sounds, then do the same with letter
   tiles. Sound play without letters is used only in Stage 1.
2. **Quick review (2 min).** Sounds and words from earlier lessons. The child says the sound or reads the word before
   hearing the answer.
3. **New sound (2 min).** One new sound and spelling, taught explicitly: hear it, see the letter drawn into a picture that
   starts with that sound, then say it. A picture of the mouth shape helps **(coming)**. One new idea per lesson.
4. **Blend it together (2 min).** The app models blending ("I do"), then blends with the child ("we do"). We call it
   "demonstrate, then imitate."
5. **Read it alone (2 min).** The child reads words with the new sound mixed with review sounds ("you do").
6. **Build it (2 min) (coming).** Hear a word, then tap or drag letter tiles to spell it.
7. **Read real text (2 to 3 min) (coming in every lesson).** A sentence or mini-story using only taught sounds and heart
   words, read aloud with the grown-up's correction, then one meaning question. Stories are reread on later days.
8. **Celebrate and rest.** A reward moment, then the session ends. Short sessions leave time for the brain to
   consolidate.

**Practice games** (Letter Hunt, Green Light, Wagon Parade, Station Board) are warm-ups inside the loop: the child says
the sound out loud first, then taps.

**Language strand (coming, 2 to 3 times a week):** a richer story the child can't yet read alone is read aloud, with 2
to 3 new words and talk-about-it questions.

**Text progression:** child-read stories are fully decodable through Stage 5. From Stage 6, up to about 1 in 10 words may
use a pattern not yet taught, and the app pre-teaches those words first. By Stages 9 and 10, children read lightly
controlled, natural-sounding text.

> **Builder notes (internal).** Today's lessons have 9 to 11 tasks (new letter, story, practicing words, sounds, writing,
> a game slot, practice, ticket check, review). The prototype lesson (docs/CURRICULUM-REVIEW.md, prototype 4) maps them
> onto the 8 steps; build it once, get the owner's approval, then regenerate every lesson with tools/gen-lessons.mjs.

## 8. Mastery and review

A child moves on when the sounds, words and spellings of a unit are secure, and everything learned keeps coming back.

**Ready for the next unit:**

- About 9 in 10 right on the unit's sounds, words and spellings.
- Each sound said within about 2 seconds, and familiar words read without sounding out every letter (by the end of the
  stage).
- Once children read stories: one decodable story read with 1 or fewer errors per sentence.
- **The grown-up decides.** Parents are the biggest influence in a child's reading life. The app explains these signs to
  the grown-up, who confirms when the child is ready.
- Not ready yet: the app adds practice on the missed items, then checks again.

**Spaced review:** earlier sounds and words come back in later lessons, mixed with new ones. The ideal schedule is 1, 3,
7, 14 and 30 days after each correct answer, and back to 1 day after a miss; the app approximates it with review steps
inside lessons rather than a strict calendar.

**Mixed practice:** after a pattern's first 2 lessons, it is always practiced together with earlier look-alike patterns.
Each stage ends with a mixed review unit.

**Fluency (from Stage 3, coming):** hear a fluent model of a short passage, read it aloud, get word-level corrections, and
reread it on later days, 3 to 4 reads in all.

> **Builder notes (internal).** Owner decision 6A: the grown-up is the judge (a right / try-again tap after the child
> reads); no speech recognition yet. The "ready" signs are shown to the grown-up at the end of a unit; the grown-up's
> "ready" moves the child on. Speed (2 seconds) is described to the grown-up, not timed by the app.

## 9. The journey: worlds and the journey board

The railway is the child's map. Each **world** is one stretch of track with its own stations, one station per lesson.
At the end of a world the train rolls into a tunnel and out into the next world, where new stations wait.

- **The tunnel is a celebration:** a short ride, Pip dancing, a new special car for the train and a gold star.
- **While the train is in the tunnel,** a short card shows the grown-up a "Did you know?" tip (section 13).
- **The journey board** appears after a unit is finished and at the end of a world, not after every lesson: a row of
  world badges, with the current world opened up to show its units as stations, the finished ones ticked.
- **Grownups** shows the whole path grouped by world and unit, the current lesson, and the grade label (section 10).

> **Builder notes (internal).** Owner decision 10A. Only the current world's track and stations are built in the 3D Home
> (built in 1.9.14: the line ends in a tunnel portal with a signpost to the next world, and the train crosses through it once
> a world is done), which keeps the scene small (heat) and loading short; earlier worlds can be revisited from the journey board.
> Proposed worlds (names are placeholders for the owner to choose):
>
> | World | Contents | Ends with |
> | --- | --- | --- |
> | 1 | Stage 1 (3 sound-play lessons) and units 2.1 to 2.3 (m, a, s, i, t, p) | Level one (the tunnel built in 1.9.4); end of Pre-K |
> | 2 | Units 2.4 to 2.8 (f, o, n, d, c/k, h, u, g, l, r, b) | First story unlock |
> | 3 | Units 2.9 to 2.11 (e, j, w, v, y, z, x, qu) and the Stage 2 review | End of Stage 2 |
> | 4 to 11 | One world per stage, Stages 3 to 10 | End of each stage |
>
> Owner decision 9A becomes "a celebration at the end of every world", since worlds 1 to 3 split Stage 2. Each
> celebration adds a special car (the five built so far, then new ones) and a gold star. The journey board replaces the
> star board as the full view; the star chip on Home stays as a small summary.

## 10. Grade-level map

The curriculum is grouped into 4 reading levels matched to U.S. grade expectations. Levels are matched to the Common
Core foundational reading standards and the Head Start preschool outcomes, with fluency targets from national
oral-reading norms.

| Level | Typical age | Stages and units | What the standards expect by the end of the level | End-of-level benchmark in the app |
| --- | --- | --- | --- | --- |
| **Pre-K** | 4 to 5 | Stage 1; units 2.1 to 2.3 (m, a, s, i, t, p) | Head Start (by about age 5): says the first sound of a spoken word; names many letters, including those in their own name | Hears and says first sounds; knows the sounds of m, a, s, i, t, p; blends 2- and 3-sound words; reads "Sam sat" |
| **Kindergarten** | 5 to 6 | Units 2.4 to 2.11; early heart words; unit 3.1 | Common Core K: the main sound for every consonant; short and long sounds for the 5 vowels; common high-frequency words (the, of, to, you, she, my, is, are, do, does); telling apart words that differ by one letter; reading beginning-reader texts | Reads short-vowel words and decodable sentences; knows the K heart words; reads a short decodable story with 1 or fewer errors per sentence |
| **Grade 1** | 6 to 7 | Units 3.2 to 7.4: digraphs, blends, endings, 2-syllable words, open vowels, silent e, common vowel teams | Common Core 1: digraphs; regular one-syllable words; silent e and common vowel teams; syllables; inflectional endings; grade-level irregular words | About 60 words correct per minute on an unpracticed passage (the national middle for spring of Grade 1; 29 in winter) |
| **Grade 2** | 7 to 8 | Units 7.5 to 10.6: more vowel teams, bossy R, sliding vowels, tricky patterns, prefixes and suffixes | Common Core 2: long vs. short vowels; more vowel teams; 2-syllable words with long vowels; common prefixes and suffixes; irregular words | About 100 words correct per minute (spring of Grade 2; 84 in winter) |

A note on long vowels in kindergarten: the K standard includes long vowel sounds. Children meet them in kindergarten
through the open-vowel words (he, me, go, no, so, we, my) in units 2.9 to 3.1, and learn long vowels fully in Stage 6.

**How the levels work:**

- **Levels are labels, not gates.** Children move by mastery, not by age. A 4-year-old can be at the Kindergarten level
  and a 7-year-old at Pre-K; the app never shows a child a "below grade level" message.
- **Placement check (coming).** A calm check of under five minutes, led by the grown-up while the child answers aloud and it
  feels like a game ("Let's see what you already know!"). It adapts in four steps and starts the child at the right
  lesson; it can be retaken from Grownups. (1) Letter sounds, one at a time, in the order the lessons teach them; a sound
  the child does not know yet gets a quick teach card and comes back once, to see how fast the child learns. (2) For
  beginners who know fewer than four sounds: first sounds in words and blending spoken sounds into words, with no letters.
  (3) For children who know ten or more sounds: made-up words, which show real sounding out and not memory. (4) For strong
  readers: a few real words and one short sentence. A quick re-check of letter sounds alone (about a minute) can be run
  every few weeks to see growth.
- **Grown-up view.** The level label, the current unit, and the grade benchmark appear only in Grownups.
- **Fluency targets start in Grade 1,** where national norms begin; earlier levels use accuracy only.
- **Rereading for meaning is allowed, guessing is not.** From Grade 1, after the child has sounded out a word, the app may
  ask "Does that make sense? Read it again." Never instead of sounding it out.
- **Beyond Grade 2.** Grade 3 work (longer multisyllable words, more prefixes and suffixes) is a natural next step.

## 11. The stages

### Stage 1: Sound Play (Pre-K) (coming)
Children learn that words are made of sounds and that we read left to right, before letters appear. It lasts only 2 to
3 sessions, because sound practice without letters pays off less than practice with letters.

| Unit | Focus | Example activities | Teaching and pronunciation notes |
| --- | --- | --- | --- |
| 1.1 | Left-to-right tracking | Follow a row of pictures left to right; tap them in order to tell a mini picture story | Practices the eye movement of reading before decoding |
| 1.2 | First sounds | "Where is mmmilk?": which picture starts with /m/? | Stretchy sounds first (/m/, /s/, /f/), they are easiest to hear, plus /a/ as in "at," a key vowel |
| 1.3 | Oral blending and segmenting | Hear "sssaaat" and pick the picture of "sat"; tap a dot for each sound in "mat" | Model smooth blending. Start with 2 sounds, then 3 |

### Stage 2: First Words (Pre-K for 2.1 to 2.3, then Kindergarten)
Children learn all 5 short vowels and the single consonants, reading real words from the first unit and growing from
2-word phrases to their first story. The first 6 sounds are fixed: **m, a, s, i, t, p**. The rest are ordered to keep
known trouble spots apart: mirror letters (p, d, b) are spread over 5 units, look-alikes (m/n, n/u) are separated,
short e comes late and far from short i, and letters whose names mislead (h, w, y) get extra practice. At about 3 new
letter-sounds a week (a study of at-risk kindergartners introduced 2 to 4 a week and found about 3 worked best), Stage 2 takes roughly
8 weeks.

| Unit | New sounds | Example words | Heart words | Teaching and pronunciation notes |
| --- | --- | --- | --- | --- |
| 2.1 | /m/, /a/ as in "at" (short a), /s/ | am, Sam, mass | a | /m/ is "mmm," not "muh." /s/ is "sss," not "suh." All three are stretchy, so the first blends are one smooth stream: "Sssaaammm." Start with the 2-sound word "am" |
| 2.2 | /i/ as in "it" (short i), /t/ | it, at, sit, sat, mat, Tim | I, is | /t/ is a quick "t," not "tuh." t comes at the **end** of words first (at, sit, mat). First 2-word phrase: "Sam sat." In "is," the s says /z/. Vowel contrast: sat/sit |
| 2.3 | /p/ | map, sip, sap, tip, tap, pat, pit | the | /p/ is a quick puff of air, not "puh." Ending-p words first (map, sip), then starting-p words (pat, pit). p is taught alone, long before b, d and q. 2-word sentences with p: "Pat sat." Completes the starter set: m, a, s, i, t, p |
| 2.4 | /f/, /o/ as in "mop" (short o) | if, fit, fat, mop, top, pot, Tom | | /f/ is stretchy ("fff"): top teeth on bottom lip. Third vowel, far from short e. Vowel contrasts: tip/top, pat/pot |
| 2.5 | /n/, /d/ | nap, pan, fan, tin, not, nod, dad, did, sad | to | n comes 4 units after m; contrast man/nap. /d/ is quick, not "duh"; it's the buzzing partner of /t/ (touch your throat): tip/dip. **3-word sentences**: "Tim did it." |
| 2.6 | /k/ spelled c and k, /h/ | cat, cap, cot, can, kit, kid, hat, hit, hot, him | | One sound, two letters: usually c before a, o, u and k before i, e. /h/ is just a breath, not "huh." Its name ("aitch") has no /h/ in it, so h gets extra practice |
| 2.7 | /u/ as in "fun" (short u), /g/, /l/ | up, cup, sun, fun, mud, hug, gum, dig, log, lip, lid | | u is a flipped n, so it comes 2 units after n, with contrast drills. /g/ is the hard sound as in "gap" and the buzzing partner of /k/. /l/ is stretchy. **4-word sentences**: "Tom had a cup." |
| 2.8 | /r/, /b/ | rat, rip, run, rug, bat, bib, big, bud, cab, rob | | b comes 3 units after d and 5 after p, with its own picture cue and tracing practice. b/d contrast only after both are secure: bad/dad, bud/dud. /r/ is stretchy; many young children are still learning to say it. **First story** unlocks |
| 2.9 | /e/ as in "bed" (short e) | bed, red, pen, net, leg, ten, get, hen | he, me, be, go, no, so | Taught alone and last of the vowels, because short e and short i sound so alike. Contrast drills: pin/pen, bit/bet, pat/pet |
| 2.10 | /j/, /w/, /v/ | jam, job, jug, jet, wig, web, wet, van, vet | want, was, we | w's name ("double-u") doesn't contain /w/ and can lead children to /d/, so w gets extra practice. /v/ is the buzzing partner of /f/: fan/van |
| 2.11 | /y/ as in "yes," /z/, /x/, /qu/ | yes, yet, yum, zip, zap, fox, six, box, quit, quiz | my, you, of, said, do, does, are | y's name starts with /w/, so children often say /w/ for y; contrast yet/wet. /z/ is the buzzing partner of /s/. /x/ is two sounds, /k/ + /s/. q comes with u and says /kw/. Ends with a mixed review of all short vowels |

The phrases "I want" and "I want to" become available once "want" and "to" are taught, giving children early sentences
about themselves.

> **Builder notes (internal).** Owner decision 1A: one sound per lesson, in this order, so lessons 1 to 6 (m a s i t p)
> stay as they are and lessons 7 on are regenerated by tools/gen-lessons.mjs: f, o, n, d, c/k, h, u, g, l, r, b, e, j,
> w, v, y, z, x, qu (19 lessons, 25 in Stage 2 in all). Saved progress past lesson 6 needs a one-time mapping by sound
> in store.load(). The WORD_BANK, Station Board words, book stops (b1, b2) and level `needs` follow the new order.

### Stage 3: Digraphs (late Kindergarten to Grade 1)
Children learn that two letters can team up to make one new sound. The app shows digraph letters as one linked tile.

| Unit | New sounds | Example words | Heart words | Teaching and pronunciation notes |
| --- | --- | --- | --- | --- |
| 3.1 | /sh/ as in "ship," /ch/ as in "chip" | ship, shop, fish, mash, chip, chop, much | she | /sh/ is stretchy ("shhh"); /ch/ is a quick sneeze sound, not "chuh" |
| 3.2 | /th/ buzzing as in "that," /th/ quiet as in "thin" | **Buzzing:** that, this, them, then. **Quiet:** thin, moth, with, bath, math | they | Taught together as a pair. Tongue peeks out between the teeth for both; touch your throat: "that" buzzes, "thin" doesn't. Quiet /th/ is often mixed up with /f/: fin/thin. Once th is known, "this" is fully decodable |
| 3.3 | ck as in "back"; ff, ll, ss, zz as in "puff," "bell," "miss," "buzz"; wh | back, sick, duck, lock, puff, bell, miss, buzz, when, which | what, where | ck and doubled ff, ll, ss, zz usually come right after a short vowel at the end of a one-syllable word, and the two letters make one sound. wh says /w/ in most American speech. In "what," the a says /u/ |
| 3.4 | ng as in "long," nk as in "bank" | rang, sing, long, hung, thing, bank, pink, honk, junk, thank | | Taught as sound chunks: -ang, -ing, -ong, -ung and -ank, -ink, -onk, -unk. The vowel sounds a little different before ng and nk, so children learn the whole chunk |
| 3.5 | Mixed review | Mixed digraph and short-vowel words | | Contrast sets: ship/chip, sack/shack, thin/tin |

### Stage 4: Blends (Grade 1)
Blends are two sounds side by side, each still heard, unlike digraphs, which make one new sound.

| Unit | New patterns | Example words | Heart words | Teaching and pronunciation notes |
| --- | --- | --- | --- | --- |
| 4.1 | Ending blends: st, ft, then nd, mp, nt | lost, best, soft, gift, and, hand, lamp, jump, tent | | Ending blends come first because the start of the word reads normally. st and ft before nd, mp, nt: in those the n or m melts into the vowel, so the app highlights it and drills sad/sand, cap/camp, bet/bent |
| 4.2 | s-blends: st, sp, sk, sn, sw, sm, sl | stick, stop, spot, spin, skip, skin, snack, snap, swim, smash, slip | | Hold the s and slide into the next sound: "ssstop," not "suh-top." Chains add the missing sound: sap, snap; top, stop |
| 4.3 | l-blends: bl, cl, fl, pl, gl | block, black, clam, clap, flap, flag, plum, plan, glad | | Glide the first sound straight into /l/: "block," not "buh-lock" |
| 4.4 | r-blends: br, tr, cr, dr, fr, gr | brush, brag, trip, trap, crab, crib, drop, drum, frog, fret, grin | | Glide into /r/: "trip," not "tuh-rip." tr often sounds close to "chr" and dr close to "jr"; that's normal speech |
| 4.5 | Mixed review: blends at both ends | stamp, crust, blend, frost, plant | | The longest short-vowel words yet (5 sounds). Mixed with digraphs: crash, flesh, think |

### Stage 5: Word Endings and Bigger Words (Grade 1)
Endings change meaning, and long words are short words glued together. This comes early because it multiplies the words
children can read with short vowels alone.

| Unit | New patterns | Example words | Heart words | Teaching and pronunciation notes |
| --- | --- | --- | --- | --- |
| 5.1 | -s and -es | cats, maps, dogs, bugs, runs, boxes, wishes | | s says /s/ after quiet sounds (cats), /z/ after buzzing sounds (dogs). -es adds a beat after s, x, sh, ch: box-es |
| 5.2 | -ing | jumping, fishing, singing, resting | | Find the base word first, then add the ending, taught as one chunk |
| 5.3 | -ed, three sounds | **/t/:** jumped, wished. **/d/:** filled, spilled. **/ed/:** landed, rested | | The spelling is always -ed; the sound is /t/ after quiet sounds, /d/ after buzzing sounds, and a whole beat /ed/ after t or d |
| 5.4 | Compound and 2-syllable short-vowel words | sunset, catfish, bathtub, napkin, rabbit, picnic | | Split between the two consonants, read each chunk, then glue: nap + kin. Clap the beats first |
| 5.5 | Mixed review | Endings and 2-syllable words | | Stories grow to several short pages |

### Stage 6: Long Vowels, Part 1: Open Vowels and Silent E (Grade 1)
The first two ways a vowel "says its name": alone at the end of a word, and with help from a silent e. Every silent-e
pattern is taught with its short-vowel partner.

| Unit | New patterns | Example words | Heart words | Teaching and pronunciation notes |
| --- | --- | --- | --- | --- |
| 6.1 | Open vowels: ending e and o; ending y says long i | we, me, he, be, she, go, no, so, hi, my, by, fly | bye | When a vowel is last, it usually says its name. "Bye" adds a silent e |
| 6.2 | a_e as in "bake" | bake, make, cape, game, lane, shade | | The silent e makes the vowel say its name. Contrast: cap/cape, man/mane |
| 6.3 | i_e as in "bike," o_e as in "rope" | bike, ride, hike, time, hole, rope, home, stone | | Contrast: kit/kite, pin/pine, hop/hope, rod/rode |
| 6.4 | u_e as in "cute" and "tube"; e_e as in "theme" | cube, cute, use, tube, flute, tune, eve, theme, Pete | | u_e has two sounds: /yoo/ (cute) and /oo/ (tube): try one, then the other, and pick the real word. e_e is rare |
| 6.5 | Mixed review: all silent-e patterns | hike, rope, make, tune, eve, plus contrast pairs | have, give, live | English words don't end in v, so these get an e that doesn't change the vowel |

### Stage 7: Long Vowels, Part 2: Vowel Teams (Grade 1 for 7.1 to 7.4, then Grade 2)
Vowel teams are grouped by the sound they make, so "long a can be spelled ai, ay or a_e" is one chunk.

| Unit | Sound family | Example words | Heart words | Teaching and pronunciation notes |
| --- | --- | --- | --- | --- |
| 7.1 | **Long a:** ai, ay, ey | rain, train, paint, hay, play, day, hey, today, away | again | ai in the middle, ay at the end. ey says long a in a few words (hey, they). In "again," the ai says short e |
| 7.2 | **Long e:** ee, ea, ending y | keep, tree, see, read, sea, eat, happy, funny | | Ending y says long e in longer words (happy), long i in short words (my). ea sometimes says short e (bread), taught later as a second sound |
| 7.3 | **Long o:** oa, ow, oe | coat, road, boat, snow, blow, grow, toe, goes | | oa in the middle, ow at the end |
| 7.4 | **Long i:** ie, igh | pie, tie, lie, high, night, light, bright | | igh is a 3-letter team: the gh is silent. ie also says long e in a few words (cookie, field), taught as a second sound in 7.6 |
| 7.5 | **oo and long u:** oo (food, good), ue, ew | food, moon, good, book, cooked, blue, glue, flew, news, few | | oo has two sounds: try both and pick the real word. "Hooray" is now decodable |
| 7.6 | Mixed review of vowel teams | rain/play, sea/road/blow, played, cooked, cookie | | Helper rule for ai, ay, ea, oa, ee, ie and oe: "when two vowels team up, the first one usually does the talking." It doesn't work for oo, ew, ou or oi, so it's a helper, not a law |

### Stage 8: Bossy R (Grade 2)
An r after a vowel changes the vowel's sound. er, ir and ur are taught together, since all three make the same sound.

| Unit | New patterns | Example words | Heart words | Teaching and pronunciation notes |
| --- | --- | --- | --- | --- |
| 8.1 | ar | car, star, farm, park, shark | father | /ar/ as one chunk, like the letter name r. In "father," the a says /ah/ |
| 8.2 | or, ore | for, fork, corn, horse, short, more, store | | "Horse" is now decodable: or + a silent e |
| 8.3 | er, ir, ur | her, fern, bird, dirt, girl, turn, burn, hurt, work, word, worth | were | Three spellings, one sound. After w, or often says this sound too: work, word, worth |
| 8.4 | air, are | air, hair, chair, airport, airplane, fare, hare, share, care | | "Are" on its own is a heart word (2.11), while fare, hare and share follow the pattern |
| 8.5 | Mixed review: bossy R and silent e | star, fork, her, dirt, burn, cart/care, hop/hope/horn | | |

### Stage 9: Sliding Vowels (Grade 2)
The mouth slides from one shape to another during the sound. Each unit pairs two spellings of one sound.

| Unit | New patterns | Example words | Heart words | Teaching and pronunciation notes |
| --- | --- | --- | --- | --- |
| 9.1 | ou, ow (how) | out, shout, shouted, house, mouse, our, how, cow, down | | ou in the middle, ow often at the end. ow has two sounds (snow, how): try both and pick the real word |
| 9.2 | oi, oy | coin, oil, point, boy, toy, joy | | oi in the middle, oy at the end |
| 9.3 | aw, al, alk | saw, draw, ball, tall, walk, talk, chalk | | In alk, the l is silent: "walk" sounds like "wawk" |

### Stage 10: Tricky Patterns, Silent Letters and Word Parts (Grade 2)
Most "weird" words belong to small families. Grouping them turns dozens of memorized words into a handful of patterns.

| Unit | New patterns | Example words | Heart words | Teaching and pronunciation notes |
| --- | --- | --- | --- | --- |
| 10.1 | Silent letters: kn, wr | knight, knot, knee, write, wrap, wrong | who, whole | kn says /n/, wr says /r/. In "who" and "whole," wh says /h/ |
| 10.2 | Soft g, soft c | giraffe, gem, page, cage, city, face, nice | | Before e, i or y, g usually says /j/ and c says /s/ |
| 10.3 | Ending -le | little, table, able, apple, puddle | | -le is its own beat: lit-tle, ta-ble. Clap, read each part, then glue |
| 10.4 | "o says /u/" and "u says /oo/" families | other, mother, brother, some, come, done, love, from; put, push, pull | one, oh | In "brother," "some" and "from," the o says short u. In "put," the u says /oo/ as in "good." "One" starts with an unwritten /w/ |
| 10.5 | Heart word families | could, would, should; any, many, anywhere; here, there, where | your, friend, eyes | ould says /ood/. In "any" and "many," the a says short e. In "friend," the ie says short e |
| 10.6 | Prefixes and suffixes; 2-syllable words with long vowels | unlock, redo, helpful, homeless, quickly, faster, fastest; rainbow, baby, tiger, music, tomorrow | | Find the base word, then the word part: un + lock. When a syllable ends with a vowel, it usually says its name: ba-by, ti-ger. "Tomorrow" splits as to-mor-row. Final mixed review and fluency stories |

## 12. Heart words

Only 38 words are true heart words. 27 more words often taught as "sight words" are taught here as patterns children can
sound out.

**True heart words (learn the marked part by heart):**

| Word | Unit | The tricky part |
| --- | --- | --- |
| a | 2.1 | a says /uh/ |
| I | 2.2 | A one-letter word that says long i; always a capital letter |
| is | 2.2 | s says /z/ |
| the | 2.3 | e says /uh/ (th is regular after Stage 3) |
| to | 2.5 | o says /oo/ |
| want | 2.10 | a says /o/ after w |
| was | 2.10 | a says /u/, s says /z/ |
| said, you, of, do, does | 2.11 | ai says short e; ou says /oo/; f says /v/; in "do," o says /oo/; in "does," oe says short u and s says /z/ |
| are | 2.11 | The whole word says /ar/ (the regular "are" pattern comes in 8.4) |
| they | 3.2 | ey says long a |
| what | 3.3 | a says /u/ |
| where | 3.3 | ere says /air/ |
| bye | 6.1 | Silent e at the end |
| have, give, live | 6.5 | Final e is silent and doesn't change the vowel |
| again | 7.1 | ai says short e |
| father | 8.1 | a says /ah/ |
| were | 8.3 | ere says /er/ |
| who, whole | 10.1 | wh says /h/; in "who," o says /oo/ |
| one | 10.4 | Starts with an unwritten /w/ |
| oh | 10.4 | Silent h |
| could, would, should | 10.5 | ould says /ood/ |
| any, many, anywhere | 10.5 | a says short e |
| there, here | 10.5 | ere says /air/ in "there" and /eer/ in "here" |
| your | 10.5 | our says /or/ |
| friend | 10.5 | ie says short e |
| eyes | 10.5 | eye says long i |

**Former sight words taught as patterns:**

| Word | Decodable from | Pattern |
| --- | --- | --- |
| he, me, be, go, no, so, we, my, she | 6.1 (met as early heart words in 2.9 to 3.1, for the kindergarten standard) | A vowel at the end of a word says its name |
| this | 3.2 | th + short i + s |
| today, away | 7.1 | ay as in "play" |
| hooray | 7.5 | oo + ay |
| horse | 8.2 | or + silent e |
| worth | 8.3 | or says /er/ after w |
| air, airport, airplane | 8.4 | air family and compound words |
| house, mouse, our | 9.1 | ou as in "out" |
| able, table | 10.3 | -le |
| some, done | 10.4 | o says short u |
| put | 10.4 | u says /oo/ |
| tomorrow | 10.6 | syllable splitting |

Heart words appear in stories only after they're taught, and come back in review like every other pattern. Each heart
word also gets a "fix the word" activity **(coming)**: the app reads it the way it's spelled ("said" as "sayd"), and the
child picks or says the real word. This builds the flexibility, called set for variability, that predicts reading of
irregular words.

## 13. Did you know? Tips for parents

Short tips that turn the research into something to try at home. They appear in the app on a calm card while the app
opens and between a lesson and the railway, and inside each activity's "Say this" sheet, where they match the activity.
Each is short enough for a card or a social post.

1. **Did you know?** Teaching letter sounds step by step is one of the most tested ideas in education. Decades of
   studies agree that systematic phonics helps children learn to read, and Choo Choo Training is built on it.
2. **Did you know?** Frequent, short practice beats occasional long sessions. Find a regular time each day for a lesson.
3. **Did you know?** Speaking is the foundation of reading. When your child answers with one word ("milk," "play"), ask
   for a whole sentence, and model it: "I want milk." "I want to play."
4. **Did you know?** Children learn best by seeing or hearing it done first. If your child is stuck on a sound, say it
   first, then invite them: "You try!"
5. **Did you know?** Strong readers look at every letter in a word. When your child gets stuck, say "Let's sound it out."
6. **Did you know?** Children blend better when sounds are stretched together ("mmmaaat") than chopped apart
   ("m... a... t"). Chopping makes them forget the first sound by the time they reach the last.
7. **Did you know?** Say /m/ as "mmm," not "muh." Extra "uh" sounds make blending harder: "buh-a-tuh" doesn't sound like
   "bat." Keep stop sounds short and crisp, like a tiny hiccup.
8. **Did you know?** Sound games work noticeably better when letters are involved. Say "sun," then have your child
   find the letter that makes the first sound.
9. **Did you know?** Spelling practice makes children better readers, not just better spellers. Say "map" and have your
   child build it with magnet letters.
10. **Did you know?** Mixing up b and d is a normal stage of learning to read, common through about age 7. On its own,
    it isn't a sign of dyslexia. If it continues into third grade, mention it to the teacher.
11. **Did you know?** Letter names can mislead. "W" is called "double-u," so some children think it says /d/. When
    reading, use letter sounds ("this says /w/") instead of names.
12. **Did you know?** Short e (bed) and short i (big) sound so alike that many children mix them up. Play "pin or pen?"
    and "bit or bet?" Listening for the difference helps reading too.
13. **Did you know?** Children often read the first letter and guess the rest. Try the "change one letter" game: sat,
    sit, sip, tip, tap. It trains them to look at every letter.
14. **Did you know?** Short, spaced practice beats long sessions. Ten to fifteen minutes a day works better than an hour
    on the weekend.
15. **Did you know?** Rereading the same short story builds fluency. Read a page aloud first, then let your child read it
    3 or 4 times over a few days.
16. **Did you know?** Most "sight words" are only partly tricky. In "said," only the "ai" is unusual. Sound out the
    regular letters together, and learn just the tricky part by heart.
17. **Did you know?** How you correct matters. Point to the exact letter, say its sound, and have your child reread the
    word. That works better than a general "try again."
18. **Did you know?** Reading is two skills: sounding out words and understanding language. Reading aloud to your child
    builds the second. Read books above their level and chat about new words.
19. **Did you know?** A typical child reads about 60 words a minute at the end of first grade and 100 by the end of
    second. These are averages, not deadlines; steady progress is what matters.

> **Builder notes (internal).** Owner decision 8A. The open card shows one tip for a few seconds and never blocks; tips
> rotate without repeating until all have shown. The "Say this" sheet already shows a "Grown-up tip" (js/guide.js);
> map each activity to the matching tip. No privacy or recording warnings (standing rule).

## 14. Builder notes (internal): how the app implements this plan

**Owner decisions (2026-10-06), from docs/CURRICULUM-REVIEW.md:** 1A one sound per lesson in this order; 2A Stage 1 and a
placement check; 3C story taps stay (rule 6 above); 4A games as warm-ups with say-it-first; 5A the owner records the key
sounds and connected blends, the phone's voice reads whole words and sentences; 6A the grown-up judges reading; 7B this
one document with internal parts marked; 8A tips on the open card and in the "Say this" sheet; 9A a celebration at each
world's end; 10A worlds with a gateway and a journey board at milestones.

**Prototypes first.** Each new kind of screen is built once as a prototype and approved by the owner before it is
copied to every lesson. Order: (1) this plan; (2) the world gateway, loading card, journey board and grouped Grownups
list; (3) the recording studio; (4) one lesson in the new daily loop, for f; (5) a heart-word step ("the") with "fix the
word"; (6) a Stage 1 sound-play lesson and the placement check.

**Voice.** Recordings for every letter sound and connected blend (the recording studio lists them from this plan). The
phone's voice may read whole words, sentences and instructions; it never says an isolated sound (rule 8). A hired voice
can replace the owner's recordings later at the same file paths.

**Placement check (prototype, `js/screens/proto-placement.js`).** Stop rules and branches:
- Step 1, letter sounds: the lessons' sounds in teaching order (`curriculum.lessons[].sound`); stop after 3 "Not yet" in a row or at
  the end. Teach-and-retest: the first "Not yet" opens a teach card ("Say: mmm. Ask your child to say it with you.", the
  recording if one exists, else the prompt, never the phone's voice); that letter is asked once more 2 letters later, or at the end
  of step 1 if it stopped first. The retest never changes the start; it only adds a note ("Learned m quickly — a good sign.").
- Step 2, only if fewer than 4 sounds were known: three first-sound items and three oral blending items (emoji pictures); 2 or fewer
  of 6 right adds "Start with Sound play" and a link. Steps 3 and 4 are skipped.
- Step 3, only if 10 or more sounds were known: three CVC made-up words from known sounds, seeded per check (`makeUpWords`), never in
  WORD_BANK, `REAL_CVC` or `BLOCKED` (rude or unfortunate combinations, over-excluded on purpose), consonants chosen so the word reads
  one way (no s, h, j, v, z, l or r at the end; no soft g). "Reads it" means the whole word was blended.
- Step 4, only if 2 of the 3 made-up words were read: up to four real VC/CVC words from WORD_BANK, then one decodable sentence from
  known sounds and the heart words a, I, is, the (`pickSentence`). Stop after 2 word misses (no sentence).
- Result: the start is the lesson of the first sound not known (the last lesson when all are known). If 1 or fewer of the 3 made-up
  words were read, the start moves back to the first lesson whose sound is in a missed made-up word, with "Practise blending first".
  One plain line says why; notes carry the retest and sound-awareness advice. The real version will unlock earlier lessons and keep
  the first lesson's review step.
- "Quick re-check: letter sounds only" runs step 1 alone and shows how many of the sounds are known.

**Standing rules that still apply:** the heat rule in docs/NEXT.md (cheap idle animation allowed: CSS transform/opacity loops, 3D idle at most 10 fps through one shared ticker, stopping when hidden, after 2 minutes without a touch and under reduced motion); no privacy or recording warnings;
the YouTube links and the jingle cut-off stay as they are; plans by Opus, building by Sonnet.

**What changed from the source program.** The source's core ideas are all kept (short vowels first, digraphs before
blends, silent e, vowel teams, bossy R, sentence-length milestones, the pronunciation notes); the structure, grouping,
sequence, example words and teaching notes are rebuilt:
- Activity numbers became 10 stages and 54 mastery-based units.
- Heart words moved earlier ("I," "the," "to," "want" in Stage 2), so children read meaningful sentences sooner.
- 27 former sight words are taught as patterns; the rest mark only the tricky part.
- Patterns are grouped into families: blends by type, both th sounds as a pair, er/ir/ur as one sound, vowel teams by
  the sound they make.
- Word endings and 2-syllable words moved earlier.
- Look-alikes are separated and contrasted.
- Added: x, z, qu, wh, aw, soft c, said/you/of/should/give/live, and daily spelling practice.
- "/ae/ as in fae" became ey as in "hey"; the u_e note became the two u_e sounds (cute, tube).
- The source unlocked six published picture books; those are copyrighted, so the app unlocks original decodable stories
  instead, and may recommend real books as "read with a grown-up" suggestions.

**Corrections made to the owner's draft** (docs/CURRICULUM-REVIEW.md, Part 1): /a/ added to 2.1; thing and thank moved
from 3.2 to 3.4; "from" moved from 4.4 to 10.4; "cookie" moved from 7.2 to 7.4 and 7.6 as ie's second sound;
"tomorrow" moved from 10.3 to 10.6; "worth" moved to the pattern list (38 heart words, 27 patterns); 19 tips; the 2.2
and 2.3 sentence milestones made consistent; a kindergarten long-vowel note added; formatting cleaned up.

## Sources

- National Reading Panel (2000), phonics meta-analysis: [ASHA evidence summary](https://apps.asha.org/EvidenceMaps/Articles/ArticleSummary/286a03c7-4785-4862-90de-62437ed45f82)
- Stuebing et al. (2008), response to NRP reanalyses: [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC3024599/)
- Camilli et al. (2003) reanalysis: [Education Week](https://www.edweek.org/teaching-learning/analysis-calls-phonics-findings-into-question/2003/05)
- Ehri et al. (2001), phonemic awareness meta-analysis: [ERIC](https://eric.ed.gov/?id=EJ629253); [ProQuest](https://www.proquest.com/docview/212125469); [Reading Rockets summary](https://www.readingrockets.org/topics/phonological-and-phonemic-awareness/articles/phonemic-awareness-instruction)
- Optimal dosage of phonemic awareness instruction (2024): [Iowa Reading Research Center](https://irrc.education.uiowa.edu/node/2121)
- Ehri (2014), orthographic mapping: [Reading Rockets](https://www.readingrockets.org/research-by-topic/orthographic-mapping-acquisition-sight-word-reading-spelling-memory-and-vocabulary)
- Graham and Santangelo (2014), spelling instruction meta-analysis: [Reading and Writing](https://link.springer.com/doi/10.1007/s11145-014-9517-0)
- Simple View of Reading and Scarborough's Rope: [Reading Rockets](https://www.readingrockets.org/reading-101/how-children-learn-read/models-reading)
- Castles, Rastle and Nation (2018), Ending the Reading Wars: [APS](https://www.psychologicalscience.org/publications/ending-the-reading-wars-reading-acquisition-from-novice-to-expert.html)
- Shanahan on three-cueing: [Shanahan on Literacy](https://shanahanonliteracy.com/blog/three-cueing-and-the-law)
- IES practice guide (2016), foundational skills K to 3: [Reading Rockets](https://www.readingrockets.org/guides/foundational-skills-support-reading-understanding-kindergarten-through-3rd-grade)
- Therrien (2004), repeated reading meta-analysis: [ASHA evidence summary](https://apps.asha.org/EvidenceMaps/Articles/ArticleSummary/903ec865-92fd-4ca5-9cea-8534b161420a)
- Decodable text evidence: [Shanahan on Literacy](https://shanahanonliteracy.com/blog/should-we-teach-with-decodable-text-1)
- Steacy et al., set for variability: [Reading Research Quarterly](https://cris.huji.ac.il/en/publications/set-for-variability-as-a-critical-predictor-of-word-reading-poten-2/)
- Vlach and Sandhofer (2012), spacing effect in children: [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC3399982)
- Kim et al. (2021), educational apps meta-analysis: [Reach Every Reader](https://reacheveryreader.gse.harvard.edu/?p=1896); 2026 replication: [EdWorkingPapers](https://edworkingpapers.com/ai26-1579)
- Takacs, Swart and Bus (2015), technology-enhanced storybooks: [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC4647204)
- Speech-recognition reading tutors: [Bai et al., first-grade feedback study](https://pmc.ncbi.nlm.nih.gov/articles/PMC13526040/); [ASR accuracy with child speech](https://arxiv.org/pdf/2306.04190)
- Gonzalez-Frey and Ehri (2021), connected vs. segmented blending: [ERIC](https://eric.ed.gov/?id=EJ1295469); [Reading Rockets](https://www.readingrockets.org/research-by-topic/connected-phonation-more-effective-segmented-phonation-teaching-beginning-readers)
- McCandliss, Beck, Sandak and Perfetti (2003), Word Building: [Scientific Studies of Reading](https://sites.pitt.edu/~perfetti/PDF/Focusing%20attention%20decoding%20children%20with%20poor%20reading-%20MCandlis%20et%20al..pdf)
- Treiman et al. (2008), letter names and letter-sound learning: [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC2267370)
- Pace of letter-sound introduction (Vadasy and Sanders, 2021): [ERIC](https://eric.ed.gov/?id=EJ1306388); [Iowa Reading Research Center](https://irrc.education.uiowa.edu/node/821)
- Mirror letters and reversals in typical development: [Frontiers in Communication](https://www.frontiersin.org/journals/communication/articles/10.3389/fcomm.2021.719652/full)
- Consonant-cluster and nasal-cluster spelling errors: [PMC](https://pmc.ncbi.nlm.nih.gov/articles/pmid/22473834)
- Common Core foundational reading standards: [Kindergarten](https://www.thecorestandards.org/ELA-Literacy/RF/K/), [Grade 1](https://www.thecorestandards.org/ELA-Literacy/RF/1/), [Grade 2](https://www.thecorestandards.org/ELA-Literacy/RF/2/)
- Head Start Early Learning Outcomes Framework, preschool literacy: [Head Start](https://headstart.gov/school-readiness/article/literacy-preschool); [interactive framework](https://eclkc.ohs.acf.hhs.gov/interactive-head-start-early-learning-outcomes-framework-ages-birth-five)
- Hasbrouck and Tindal (2017), oral reading fluency norms: [Reading Rockets](https://www.readingrockets.org/topics/fluency/articles/fluency-norms-chart-2017-update); [technical report](https://files.eric.ed.gov/fulltext/ED594994.pdf)
- Mirror reversals and dyslexia, for parents: [Understood](https://www.understood.org/en/articles/faqs-about-reversing-letters-writing-letters-backwards-and-dyslexia)
