// Data rules shared by the tap games and tools/gen-lessons.mjs. No DOM here.
export const LOOKALIKE = ['da','db','dp','dq','dg','bp','bq','bh','pq','pg','nm','nh','nr','nu','hb','hk','hl','li','lt','lj','lf','tf','fi'];
export const looksLike = (a, b) => LOOKALIKE.includes(a + b) || LOOKALIKE.includes(b + a);
export const order = (curriculum) => curriculum.lessons.map((L) => L.sound);
// Round targets: this lesson's sound on rounds 1, 3, 5 ...; the others take earlier sounds, newest first, cycling.
export function roundTargets(order, n, rounds) {
  const own = order[n - 1], earlier = order.slice(0, n - 1).reverse(), out = [];
  for (let r = 0, e = 0; r < rounds; r++) out.push(r % 2 === 0 || !earlier.length ? own : earlier[e++ % earlier.length]);
  return out;
}
// How many rounds a game plays: the long count alone in the slot, the short count when it shares it.
export const ROUNDS = { signals: [5, 3], wagons: [3, 2], board: [4, 3] };
export const roundsFor = (lesson, type) => ROUNDS[type][(lesson.games || []).length > 1 ? 1 : 0];
// The letters a round shows besides the target: other taught sounds first (newest first), then the lesson's Letter
// Hunt distractors; never the target, never a lookalike of it, no repeats. Deterministic: callers shuffle for display.
export function otherLetters(curriculum, n, target, count) {
  const taught = order(curriculum).slice(0, n).reverse();
  const pad = curriculum.games.hunt.distractors[curriculum.lessons[n - 1].sound] || [];
  const out = [];
  for (const k of [...taught, ...pad]) if (out.length < count && k !== target && !looksLike(k, target) && !out.includes(k)) out.push(k);
  return out;
}
