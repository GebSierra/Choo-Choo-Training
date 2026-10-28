import { soundOfLetter, spellingsOf } from './order.js';
// Turns a lesson in curriculum.json into its ordered task list. Nothing here hardcodes lesson content.
export const TASK_TYPES = {
  review:  { name: 'Letter Review', color: 'sky',    dark: true,  label: "Today we'll review" },
  newLetter: { name: 'New Sound',   color: 'violet', dark: false, label: "Today we'll learn" },
  mouth:   { name: 'Watch My Mouth', color: 'coral', dark: false, label: "Today we'll watch" },
  heart:   { name: 'Heart Word', color: 'sun', dark: true, label: "Today we'll learn" },
  sounds:  { name: 'Saying Sounds', color: 'mint',   dark: true,  label: "Today we'll stretch" },
  writing: { name: 'Track Tracing', color: 'lilac', dark: true,  label: "Today we'll write" },
  hunt:    { name: 'Letter Hunt',   color: 'sky',    dark: true,  label: "Today we'll practice" },
  signals: { name: 'Green Light', color: 'mint', dark: true, label: "Today we'll listen" },
  wagons:  { name: 'Wagon Parade', color: 'sun', dark: true, label: "Today we'll tap" },
  board:   { name: 'Station Board', color: 'lilac', dark: true, label: "Today we'll find" },
  practice: { name: 'Practicing Words', color: 'mint', dark: true, label: "Today we'll match" },
  read:    { name: 'Read a Word', color: 'sun', dark: true, label: "Today we'll read" }, // the first Review Stop's ma and mama
  tunnels: { name: 'Two Tunnels', color: 'sky', dark: true, label: "Today we'll sort" }, // Tricky Sounds (checkpoint kind contrast)
  which:   { name: 'Which One?', color: 'sun', dark: true, label: "Today we'll listen" },
  chains:  { name: 'Add a Car', color: 'sun', dark: true, label: "Today we'll build" }, // World 5: a letter car makes a new word (top, stop)
  couple:  { name: 'Couple a Car', color: 'sun', dark: true, label: "Today we'll couple" }, // World 6: an ending car or a word car couples on to make a new word (jump, jumping; sun, sunset)
  split:   { name: 'Clap, Split, Glue', color: 'lilac', dark: true, label: "Today we'll split" }, // World 6: clap the beats, split a bigger word in two, glue it back (nap-kin)
  check:   { name: 'Ticket Check',   color: 'blue',   dark: true,  label: "Today we'll check" },
};

// The frame every lesson shares, so the child knows what to expect (docs/LESSON-REBUILD.md):
//   OPENING  Letter Review (lesson 1 has nothing to review, so it opens with New Sound), New Sound, Watch My Mouth, and Heart Word when the lesson teaches one
//   MIDDLE   lesson.middle: 2 to 4 of Saying Sounds, Track Tracing, Letter Hunt, Green Light, Wagon Parade, Station Board
//   ENDING   Practicing Words (a short review of today's sound and the earlier ones), then Ticket Check, always last
export function tasksFor(lesson) {
  const list = [];
  if (lesson.review && lesson.review.length) list.push('review');
  list.push('newLetter', 'mouth', ...(lesson.heart && lesson.heart.length ? ['heart'] : []), ...(lesson.middle || ['sounds', 'writing', 'hunt']), 'practice', 'check');
  // A blend lesson (World 5): New Sound is New Blend. A blend is not a new sound: each letter keeps its own. A word-part lesson (World 6) is New Ending, or Bigger Words: an ending is not a sound either.
  const newName = lesson.part === 'ending' ? 'New Ending' : lesson.part ? 'Bigger Words' : lesson.blend ? 'New Blend' : null;
  return list.map((type, index) => ({ type, index, ...TASK_TYPES[type], ...(type === 'newLetter' && newName ? { name: newName } : {}) }));
}

// Spoken lines have a quiet variant for when the grown up says the sound (the default). Both live in curriculum.json.
export const introParts = (lesson, store) => (store.settings.playSounds ? lesson.intro : lesson.introQuiet);
export const checkPrompt = (q, store) => (store.settings.playSounds ? { parts: q.prompt, text: q.promptText } : { parts: q.promptQuiet, text: q.promptTextQuiet });

export const lessonByNumber = (curriculum, n) => curriculum.lessons.find((l) => l.number === Number(n));

// What each task practices, as chips: {glyph} for a taught letter or {text} for a word.
export function targetsFor(task, lesson) {
  switch (task.type) {
    case 'review': return lesson.review.map((g) => ({ glyph: g }));
    case 'newLetter': case 'mouth': case 'writing': case 'hunt': case 'signals': case 'wagons': case 'board': case 'practice': case 'check': case 'chains': case 'couple': case 'split': return spellingsOf(lesson.sound).map((g) => ({ glyph: g }));
    case 'heart': return (lesson.heart || []).map((w) => ({ text: w }));
    case 'sounds': return lesson.sayingSounds.slice(0, 3).map((w) => ({ text: w.word }));
    default: return [];
  }
}

// How a parent says a sound: "mmm", or "a as in apple". Never a bare "a" (a parent would say its name).
export const soundPhrase = (s) => (s.asIn ? `${s.sayItLike} as in ${s.asIn}` : s.sayItLike);

// The compact script bar shows a gist of at most 28 characters: the first option that fits, else the last (the shortest).
export const GIST_MAX = 28;
export const fit = (...options) => options.find((o) => o.length <= GIST_MAX) || options[options.length - 1];

// Sound cards are built from the sounds table: "This letter says mmm. Hold it. Do not say muh."
export const spellings = (sound) => [sound.glyph, ...(sound.alt || [])];
// World 6: an ending is a word part, not a new sound. The first line of its card.
export const PART_LINE = { ending: 'A word ending, not a new sound. Find the base word first, then the ending.', chunk: 'Bigger words are built from smaller pieces. Clap the beats, split, read each chunk, glue.', mix: 'Endings and bigger words, all together.' };
// Two letters, one sound: sh ch th ck wh ng nk, qu (key q) and the doubled letters (ff ll ss zz). c and k keep their own wording.
export const isTwoLetterSound = (sound) => !sound.blend && !sound.part && (sound.glyph.length > 1 || sound.glyph === 'q'); // a blend is two sounds, each letter keeps its own
export const sayLine = (sound) => (sound.part ? PART_LINE[sound.part] : sound.blend ? `Each letter keeps its sound. Glide them together: ${sound.pairs.map((p) => p.say).join(', ')}.` : sound.glyph === 'ff' ? `Two of the same letter make one sound: ${sound.sayItLike}${sound.asIn ? `, as in ${sound.asIn}` : ''}.` : isTwoLetterSound(sound) ? `These two letters make one sound: ${sound.sayItLike}${sound.asIn ? `, as in ${sound.asIn}` : ''}.` : sound.alt && sound.alt.length ? `The letters ${spellings(sound).join(' and ')} make the same sound: ${soundPhrase(sound)}.` : `This letter says ${soundPhrase(sound)}.`);
export function soundCardLines(sound) {
  const lines = [sayLine(sound)];
  if (sound.hold && !sound.blend && !sound.part) lines.push('Hold it.');
  if (sound.doNotSay) lines.push(`Do not say ${sound.doNotSay}.`);
  return lines;
}

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

// ---- Sound Sack data ----
// The wrong cards of a checkpoint: words that begin with none of the sounds taught so far. A "sh" word counts as an s word
// and a "th" word as a t or s word, so neither is used once s (or t) is taught.
export function sackPool(curriculum, ck) {
  const taught = ck.sounds; // sound keys; a word starting with k belongs to the sound c
  return (curriculum.gameDistractors || []).filter((w) => !taught.includes(soundOfLetter(w.word[0]))
    && !(taught.includes('s') && w.word.startsWith('sh')) && !((taught.includes('t') || taught.includes('s')) && w.word.startsWith('th')));
}
// The sounds a checkpoint's rounds may be about, and how many rounds each can take: no more than its start words.
export const roundCaps = (curriculum, ck) => Object.fromEntries(ck.sounds.map((k) => [k, (curriculum.sounds[k].startWords || []).length]));

// The heart words taught by the end of lesson n (the lesson's own words included), as written in the data.
export const heartTaught = (curriculum, n) => curriculum.lessons.slice(0, n).flatMap((L) => L.heart || []);
