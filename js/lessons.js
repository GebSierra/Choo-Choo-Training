// Turns a lesson in curriculum.json into its ordered task list. Nothing here hardcodes lesson content.
export const TASK_TYPES = {
  review:  { name: 'Letter Review', color: 'sky',    dark: true,  blurb: 'Slide each letter you already know and say its sound.', label: "Today we'll review" },
  newLetter: { name: 'New Letter',  color: 'violet', dark: false, blurb: 'Meet the new letter and the sound it makes.', label: "Today we'll learn" },
  story:   { name: 'Sound Story',   color: 'coral',  dark: false, blurb: 'Watch the video for this sound together.', label: "Today we'll hear" },
  words:   { name: 'Saying Words',  color: 'sun',    dark: true,  blurb: 'Put two parts together to make a word.', label: "Today we'll say" },
  sounds:  { name: 'Saying Sounds', color: 'mint',   dark: true,  blurb: 'Stretch the sounds, then say the word.', label: "Today we'll stretch" },
  writing: { name: 'Letter Writing', color: 'lilac', dark: true,  blurb: 'Trace the letter with a finger.', label: "Today we'll write" },
  check:   { name: 'Quick Check',   color: 'blue',   dark: true,  blurb: 'A quick look at what stuck.', label: "Today we'll check" },
};

export function tasksFor(lesson) {
  const list = [];
  if (lesson.review && lesson.review.length) list.push('review');
  list.push('newLetter', 'story', 'words', 'sounds', 'writing', 'check');
  return list.map((type, index) => ({ type, index, ...TASK_TYPES[type] }));
}

export const lessonByNumber = (curriculum, n) => curriculum.lessons.find((l) => l.number === Number(n));

// What each task practices, as chips: {glyph} for a taught letter or {text} for a word.
export function targetsFor(task, lesson) {
  switch (task.type) {
    case 'review': return lesson.review.map((g) => ({ glyph: g }));
    case 'newLetter': case 'writing': case 'check': return [{ glyph: lesson.sound }];
    case 'story': return [{ glyph: lesson.sound }];
    case 'words': return lesson.sayingWords.slice(0, 2).map((w) => ({ text: w.word }));
    case 'sounds': return lesson.sayingSounds.slice(0, 3).map((w) => ({ text: w.word }));
    default: return [];
  }
}

// Sound cards are built from the sounds table: "This letter says mmm. Hold it. Do not say muh."
export function soundCardLines(sound) {
  const lines = [`This letter says ${sound.sayItLike}.`];
  if (sound.hold) lines.push('Hold it.');
  if (sound.doNotSay) lines.push(`Do not say ${sound.doNotSay}.`);
  return lines;
}
