// Turns a lesson in curriculum.json into its ordered task list. Nothing here hardcodes lesson content.
export const TASK_TYPES = {
  review:  { name: 'Letter Review', color: 'sky',    dark: true,  label: "Today we'll review" },
  newLetter: { name: 'New Sound',   color: 'violet', dark: false, label: "Today we'll learn" },
  story:   { name: 'Sound Story',   color: 'coral',  dark: false, label: "Today we'll hear" },
  words:   { name: 'Word Cars',  color: 'sun',    dark: true,  label: "Today we'll say" },
  sounds:  { name: 'Saying Sounds', color: 'mint',   dark: true,  label: "Today we'll stretch" },
  writing: { name: 'Track Tracing', color: 'lilac', dark: true,  label: "Today we'll write" },
  hunt:    { name: 'Letter Hunt',   color: 'sky',    dark: true,  label: "Today we'll practice" },
  barn:    { name: 'Barn Doors',    color: 'coral',  dark: false, label: "Today we'll practice" },
  practice: { name: 'Practicing Words', color: 'mint', dark: true, label: "Today we'll find" },
  check:   { name: 'Ticket Check',   color: 'blue',   dark: true,  label: "Today we'll check" },
};

export function tasksFor(lesson) {
  const list = [];
  if (lesson.review && lesson.review.length) list.push('review');
  list.push('newLetter', 'story', 'words', 'sounds', 'writing', 'hunt', 'barn', 'practice', 'check');
  return list.map((type, index) => ({ type, index, ...TASK_TYPES[type] }));
}

// Spoken lines have a quiet variant for when the grown up says the sound (the default). Both live in curriculum.json.
export const introParts = (lesson, store) => (store.settings.playSounds ? lesson.intro : lesson.introQuiet);
export const checkPrompt = (q, store) => (store.settings.playSounds ? { parts: q.prompt, text: q.promptText } : { parts: q.promptQuiet, text: q.promptTextQuiet });

export const lessonByNumber = (curriculum, n) => curriculum.lessons.find((l) => l.number === Number(n));

// What each task practices, as chips: {glyph} for a taught letter or {text} for a word.
export function targetsFor(task, lesson) {
  switch (task.type) {
    case 'review': return lesson.review.map((g) => ({ glyph: g }));
    case 'newLetter': case 'writing': case 'hunt': case 'barn': case 'practice': case 'check': return [{ glyph: lesson.sound }];
    case 'story': return [{ glyph: lesson.sound }];
    case 'words': return lesson.sayingWords.slice(0, 2).map((w) => ({ text: w.word }));
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
export function soundCardLines(sound) {
  const lines = [`This letter says ${soundPhrase(sound)}.`];
  if (sound.hold) lines.push('Hold it.');
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
  const taught = ck.sounds;
  return (curriculum.gameDistractors || []).filter((w) => !taught.includes(w.word[0])
    && !(taught.includes('s') && w.word.startsWith('sh')) && !((taught.includes('t') || taught.includes('s')) && w.word.startsWith('th')));
}
// The sounds a checkpoint's rounds may be about, and how many rounds each can take: no more than its start words.
export const roundCaps = (curriculum, ck) => Object.fromEntries(ck.sounds.map((k) => [k, (curriculum.sounds[k].startWords || []).length]));

// ---- Smooth Ride data ----
// The words of a ride stop: those spelt only with sounds taught by `after`, where every letter but the last is a held sound
// (the voice can stay on up to a clipped last sound). Two-letter words first, then three, then longer; cut to `rounds`.
export function rideWords(curriculum, ck) {
  const taught = new Set(taughtBy(curriculum, ck.after));
  const fits = (w) => [...w].every((ch) => taught.has(ch)) && [...w].slice(0, -1).every((ch) => curriculum.sounds[ch].hold === true);
  const words = (ck.words || []).filter(fits);
  return [...words.filter((w) => w.length === 2), ...words.filter((w) => w.length === 3), ...words.filter((w) => w.length > 3)].slice(0, ck.rounds);
}
