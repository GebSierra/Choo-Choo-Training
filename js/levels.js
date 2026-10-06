// Levels (curriculum.levels): earned when the `after` lesson is done. The count is recorded when Home opens, so a
// celebration plays once; the first look (no count yet) only records it.
export const NUMBER_WORDS = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
export const builtLevels = (curriculum) => (curriculum.levels || []).filter((v) => v.after !== null);
export const earnedLevels = (curriculum, store) => builtLevels(curriculum).filter((v) => store.isDone(v.after));
export function dueLevel(store, curriculum) {
  const earned = earnedLevels(curriculum, store), seen = store.levels().seen;
  const now = new Date().toISOString();
  const add = Object.fromEntries(earned.filter((v) => !store.levels().earned[v.id]).map((v) => [v.id, now]));
  if (seen !== earned.length || Object.keys(add).length) store.setLevels({ seen: earned.length, earned: add });
  return seen === null || earned.length <= seen ? null : earned[earned.length - 1];
}
export const bannerText = (v) => `Level ${NUMBER_WORDS[v.n - 1]} complete!`;
// Special cars in train order: coach, flatbed, tanker, dome, then the caboose last.
const CAR_ORDER = ['coach', 'flatbed', 'tanker', 'dome', 'caboose'];
export const carsOf = (levels) => CAR_ORDER.filter((k) => levels.some((v) => v.car === k));
