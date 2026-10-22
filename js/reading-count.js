import { ORDER_SOUNDS, lettersOfSounds } from './order.js';
// How much a child can read, counted one way everywhere (Grownups, the keepsakes): the sound keys of the lessons actually done (result got-it,
// placed ones included), the letters those sounds are written with, and W, the words of data/words-decodable.json that use only those letters
// (the same rule tools/gen-lessons.mjs uses for a Review Stop). Nothing is typed; everything is counted from the data.
let listP = null;
export const loadWordList = () => listP || (listP = fetch('data/words-decodable.json').then((r) => r.json()).then((j) => j.words || []).catch(() => { listP = null; return []; }));
export const soundKeysDone = (store, curriculum) => curriculum.lessons.filter((l) => store.isDone(l.number)).map((l) => l.sound || ORDER_SOUNDS[l.number - 1]).filter(Boolean);
export const countReadable = (words, keys) => { const taught = lettersOfSounds(keys); return words.filter((w) => [...w].every((ch) => taught.has(ch))).length; };
// Chips: one per sound; c/k is one chip, qu is one chip.
export const chipsOf = (keys) => keys.map((k) => (k === 'c' ? 'c/k' : k === 'q' ? 'qu' : k));
// Heart words are counted apart (never inside the "can read N words" number: those are words a child sounds out): H, how many the done lessons teach.
export const heartCount = (curriculum, lessons) => lessons.reduce((n, l) => n + ((l.heart || []).length), 0);
export async function readingProgress(store, curriculum, lessonNumbers = null) {
  const keys = lessonNumbers ? lessonNumbers.map((n) => (curriculum.lessons.find((l) => l.number === n) || {}).sound).filter(Boolean) : soundKeysDone(store, curriculum);
  const words = await loadWordList();
  const lessons = curriculum.lessons.filter((l) => (lessonNumbers ? lessonNumbers.includes(l.number) : store.isDone(l.number)));
  return { sounds: keys.length, words: countReadable(words, keys), hearts: heartCount(curriculum, lessons), chips: chipsOf(keys) };
}
