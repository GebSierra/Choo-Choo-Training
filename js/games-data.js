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
// A parade: `size` wagons in a loop, `hits` of them the target, the rest from `others` in turn; no two targets side by side.
export function parade(target, others, { size = 8, hits = 3, rng = Math.random } = {}) {
  const slots = Array.from({ length: size }, (_, i) => i).filter((i) => i % 2 === 0);
  const at = new Set(); while (at.size < hits) at.add(slots[Math.floor(rng() * slots.length)]);
  return Array.from({ length: size }, (_, i) => (at.has(i) ? target : others[i % others.length]));
}

// Short real words for Station Board: every letter keeps its basic sound; no names, no s said as z, no ng/nk/ck.
// tools/gen-lessons.mjs keeps only the words spelt with taught sounds, so later lessons pick up more by themselves.
export const WORD_BANK = `am an at it in if us up on ox ax
sat sit set sap sip sad sag sob sun sum six sis
mat map mad man mop mom mud mug mix men met mess miss
pat pan pad pal pig pin pit pip pop pot pet pen peg pup pug
tap tan tag tip tin top tub tug ten tell
nap nag nip net nod not nut
fan fat fad fig fin fit fog fox fun fed fell fuss fizz fix
dad dam dab dig dip did dim din dog dot den dug dull
hat had ham hip hit him hid hop hot hog hen hum hut hug hill hiss
gas gap gig get got gum gull
bat bag bad ban bib bit big bin bid bog bob bun bus but bud bug bed bet beg bell bill buzz box
lap lab lad lag lip lit lid log lot leg let led
cat cap can cab cot cop cod cut cup cub cob
kit kid kin keg
rat ran rag ram rap rip rib rid rim rob rod rot rub rug run red
wag wig win wit wet web wed wax
jab jam jet jig jog jot jug
van vat vet
yam yap yes yet yum
zap zip
quit quiz
mast mist must fast fist last list lost past pest test rest nest best vest west
sand band land hand bend send lend mend fund pond
lamp camp damp limp bump jump lump pump
milk silk gift lift soft left raft
help held melt felt belt
spin spot spit spat stop step stem slip slap slim slid sled flat flap flip flag frog grab grin drip drop drum plan plum snap snip snug swim twin trip trap trot glad clap clip club crab crib
stamp stand twist`.split(/\s+/).filter(Boolean);
const dist = (a, b) => {
  if (a.length === b.length) { let d = 0; for (let i = 0; i < a.length; i++) d += a[i] !== b[i]; return d; }
  const m = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) m[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + (a[i - 1] !== b[j - 1]));
  return m[a.length][b.length];
};
const once = (w, k) => [...w].filter((c) => c === k).length === 1;
// The words of lesson n: up to 4 letters, all taught; each round's target sound appears exactly once in its word; each
// next word is the closest to the last one (fewest letters changed; ties go to the bank order). Null when a round has no word.
export function boardWords(order, n, rounds = 4) {
  const taught = new Set(order.slice(0, n));
  const pool = WORD_BANK.filter((w) => w.length <= 4 && [...w].every((c) => taught.has(c)));
  const out = []; let prev = null;
  for (const k of roundTargets(order, n, rounds)) {
    const c = pool.filter((w) => once(w, k) && !out.some((o) => o.word === w));
    if (!c.length) return null;
    const pick = prev ? c.reduce((best, w) => (dist(prev, w) < dist(prev, best) ? w : best), c[0]) : (c.find((w) => w.length === 3) || c[0]);
    out.push({ word: pick, target: k }); prev = pick;
  }
  return out;
}

// The middle of a lesson: what sits between the opening (Letter Review, New Sound, Watch My Mouth) and the ending (closing review,
// Ticket Check). Owner-approved activities only: Saying Sounds ('sounds', the blending slide), Track Tracing ('writing'), Letter Hunt
// ('hunt') and the three train games ('signals', 'wagons', 'board'). Every middle holds 'sounds' (blending and reading words) and
// 'writing', and no two neighbouring lessons share the same list. A lesson past the table repeats it from the top.
export const MIDDLES = [
  ['writing', 'sounds', 'hunt'],
  ['sounds', 'signals', 'writing'],
  ['hunt', 'sounds', 'wagons', 'writing'],
  ['signals', 'sounds', 'writing', 'wagons'],
  ['sounds', 'board', 'writing'],
  ['writing', 'hunt', 'sounds', 'signals'],
  ['sounds', 'wagons', 'writing', 'board'],
  ['hunt', 'writing', 'sounds'],
  ['signals', 'sounds', 'board', 'writing'],
  ['writing', 'sounds', 'wagons'],
  ['board', 'sounds', 'hunt', 'writing'],
  ['writing', 'signals', 'sounds', 'wagons'],
  ['hunt', 'sounds', 'board', 'writing'],
];
export const TAP_GAMES = ['signals', 'wagons', 'board'];
// The middle of lesson n: its pattern, with a game the lesson cannot hold (Green Light needs a second sound; Station Board needs
// its words) swapped for Letter Hunt or Wagon Parade, whichever is not already there.
export function middleFor(order, n) {
  const pattern = MIDDLES[(n - 1) % MIDDLES.length];
  const ok = { signals: n >= 2, wagons: true, board: !!boardWords(order, n, 4) };
  const out = [];
  for (const t of pattern) {
    if (t in ok && !ok[t]) out.push(['hunt', 'wagons'].find((x) => !pattern.includes(x) && !out.includes(x)) || t); else out.push(t);
  }
  return out;
}
