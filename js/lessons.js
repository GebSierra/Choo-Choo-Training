// Turns a lesson in curriculum.json into its ordered task list. Nothing here hardcodes lesson content.
export const TASK_TYPES = {
  review:  { name: 'Letter Review', color: 'sky',    dark: true,  blurb: 'Slide each letter you already know and say its sound.', label: "Today we'll review" },
  newLetter: { name: 'New Letter',  color: 'violet', dark: false, blurb: 'Meet the new letter and the sound it makes.', label: "Today we'll learn" },
  story:   { name: 'Sound Story',   color: 'coral',  dark: false, blurb: 'Watch the video for this sound together.', label: "Today we'll hear" },
  words:   { name: 'Saying Words',  color: 'sun',    dark: true,  blurb: 'Put two parts together to make a word.', label: "Today we'll say" },
  sounds:  { name: 'Saying Sounds', color: 'mint',   dark: true,  blurb: 'Stretch the sounds, then say the word.', label: "Today we'll stretch" },
  writing: { name: 'Letter Writing', color: 'lilac', dark: true,  blurb: 'Trace the letter with a finger.', label: "Today we'll write" },
  hunt:    { name: 'Letter Hunt',   color: 'sky',    dark: true,  blurb: 'Find the letter in the sky and help the sheep home.', label: "Today we'll practice" },
  barn:    { name: 'Barn Doors',    color: 'coral',  dark: false, blurb: 'Open the barn doors and touch the letter.', label: "Today we'll practice" },
  check:   { name: 'Quick Check',   color: 'blue',   dark: true,  blurb: 'A quick look at what stuck.', label: "Today we'll check" },
};

export function tasksFor(lesson) {
  const list = [];
  if (lesson.review && lesson.review.length) list.push('review');
  list.push('newLetter', 'story', 'words', 'sounds', 'writing', 'hunt', 'barn', 'check');
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
    case 'newLetter': case 'writing': case 'hunt': case 'barn': case 'check': return [{ glyph: lesson.sound }];
    case 'story': return [{ glyph: lesson.sound }];
    case 'words': return lesson.sayingWords.slice(0, 2).map((w) => ({ text: w.word }));
    case 'sounds': return lesson.sayingSounds.slice(0, 3).map((w) => ({ text: w.word }));
    default: return [];
  }
}

// How a parent says a sound: "mmm", or "a as in apple". Never a bare "a" (a parent would say its name).
export const soundPhrase = (s) => (s.asIn ? `${s.sayItLike} as in ${s.asIn}` : s.sayItLike);

// Sound cards are built from the sounds table: "This letter says mmm. Hold it. Do not say muh."
export function soundCardLines(sound) {
  const lines = [`This letter says ${soundPhrase(sound)}.`];
  if (sound.hold) lines.push('Hold it.');
  if (sound.doNotSay) lines.push(`Do not say ${sound.doNotSay}.`);
  return lines;
}
