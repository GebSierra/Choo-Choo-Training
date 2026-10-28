// Data rules shared by the tap games and tools/gen-lessons.mjs. No DOM here.
import { soundOfLetter, spellingsOf, lettersOfSounds, letterUnits, isReadable, NO_GLYPH } from './order.js';
export const LOOKALIKE = ['da','db','dp','dq','dg','bp','bq','bh','pq','pg','nm','nh','nr','nu','hb','hk','hl','li','lt','lj','lf','tf','fi','oc','oa','rn','rh','kh','kb','kl','ec','eo','ea','es','ji','jl','jt','jg','jy','wm','wv','wu','vy','vu','yu','yg','yj','zs','zn','xk','xz','xy','qg','qp','qa','qd','qb'];
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
// A sound with two spellings (c and k) never offers either spelling as an "other": `target` may be a key or one of its letters.
export function otherLetters(curriculum, n, target, count) {
  const taught = order(curriculum).slice(0, n).reverse();
  const pad = curriculum.games.hunt.distractors[curriculum.lessons[n - 1].sound] || [];
  const key = soundOfLetter(target), mine = spellingsOf(key);
  const out = [];
  for (const k of [...taught, ...pad]) if (out.length < count && !NO_GLYPH.includes(k) && soundOfLetter(k) !== key && !mine.some((m) => looksLike(k, m)) && !out.includes(k)) out.push(k);
  return out;
}
// The letter a round shows for a sound: its spellings take turns (c, k, c ...), so a child sees both. `turn` counts the sound's rounds.
export const spellingFor = (key, turn = 0) => { const l = spellingsOf(key); return l[turn % l.length]; };
// A parade: `size` wagons in a loop, `hits` of them the target, the rest from `others` in turn; no two targets side by side.
export function parade(target, others, { size = 8, hits = 3, rng = Math.random } = {}) {
  const slots = Array.from({ length: size }, (_, i) => i).filter((i) => i % 2 === 0);
  const at = new Set(); while (at.size < hits) at.add(slots[Math.floor(rng() * slots.length)]);
  return Array.from({ length: size }, (_, i) => (at.has(i) ? target : others[i % others.length]));
}

// Short real words for Station Board: every letter keeps its basic sound; no names, no s said as z. The digraph words (sh ch th ck ff ll ss zz wh ng nk, World 4) only
// appear once their digraph is taught (isReadable): until then no ng/nk/ck word can be read.
// tools/gen-lessons.mjs keeps only the words spelt with taught sounds, so later lessons pick up more by themselves.
export const WORD_BANK = `am an at it in if us up on ox ax
sat sit set sap sip sad sag sun sum six sis
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
cat cap can cab cot cop cod cut cup cub
kit kid keg
rat ran rag ram rap rip rib rid rim rob rod rot rub rug run red
wag wig win wit wet web wed wax wag
jet jig jog jot jug
van vat vet
yam yap yes yet yum
zap zip fizz buzz
quit quiz
mast mist must fast fist last list lost past pest test rest nest best vest west
sand band land hand bend send lend mend fund pond
lamp camp damp limp bump jump lump pump
milk silk gift lift soft left raft
help held melt felt belt
spin spot spit spat stop step stem slip slap slim slid sled flat flap flip flag frog grab grin drip drop drum plan plum snap snip snug swim twin trip trap trot glad clap clip club crab crib
stamp stand twist`.split(/\s+/).filter(Boolean);
// World 4 words (lessons 26 on): digraphs and doubled letters. Kept apart so lessons 1 to 25 never gain a word (a double-letter word such as hill is readable earlier).
export const DOCKS_BANK = `ship shop shed shut shin fish dish wish mash cash rush
chip chop chat chin chug much such rich
that this then them thin thud bath moth math path
back sack pack neck deck sick kick pick sock rock duck luck
puff huff cuff off bell tell sell hill bill kiss moss buzz jazz
when whip whiz whim
ring sing king wing rang sang song long hung rung gong
bank sank tank pink sink link honk junk bunk`.split(/\s+/).filter(Boolean);
const dist = (a, b) => {
  if (a.length === b.length) { let d = 0; for (let i = 0; i < a.length; i++) d += a[i] !== b[i]; return d; }
  const m = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) m[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + (a[i - 1] !== b[j - 1]));
  return m[a.length][b.length];
};
const once = (w, k, n) => letterUnits(w, n).filter((c) => soundOfLetter(c) === k).length === 1; // k is a sound key: c and k count together
// The words of lesson n: up to 4 letters, all taught; each round's target sound appears exactly once in its word; each
// next word is the closest to the last one (fewest letters changed; ties go to the bank order). Null when a round has no word.
export function boardWords(order, n, rounds = 4) {
  const taught = lettersOfSounds(order.slice(0, n));
  const pool = [...WORD_BANK, ...(n >= 26 ? DOCKS_BANK : [])].filter((w) => w.length <= 4 && isReadable(w, taught));
  const out = []; let prev = null; const turns = {};
  for (const k of roundTargets(order, n, rounds)) {
    let c = pool.filter((w) => once(w, k, n) && !out.some((o) => o.word === w));
    // A sound with two spellings (c, k): its rounds take them in turn, so both letters are met (a c word, then a k word ...).
    const spell = spellingFor(k, turns[k] || 0), spelt = c.filter((w) => w.includes(spell));
    turns[k] = (turns[k] || 0) + 1;
    if (spellingsOf(k).length > 1 && spelt.length) c = spelt;
    if (!c.length) return null;
    const pick = prev ? c.reduce((best, w) => (dist(prev, w) < dist(prev, best) ? w : best), c[0]) : (c.find((w) => w.length === 3) || c[0]);
    out.push({ word: pick, target: k }); prev = pick;
  }
  return out;
}

// The middle of a lesson: what sits between the opening (Letter Review, New Sound, Watch My Mouth) and the ending (closing review,
// Ticket Check). Owner-approved activities only: Saying Sounds ('sounds', the blending slide), Track Tracing ('writing'), Letter Hunt
// ('hunt') and the three train games ('signals', 'wagons', 'board'). Every middle holds 'sounds' (blending and reading words) and
// 'writing', and no two neighbouring lessons share the same list. The table has 17 patterns; a lesson past it (World 3, 18 to 25) repeats it from the top, and EXTRA_MIDDLES overrides one lesson.
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
  ['signals', 'writing', 'sounds', 'board'],
  ['writing', 'sounds', 'wagons', 'hunt'],
  ['board', 'sounds', 'writing', 'signals'],
  ['hunt', 'writing', 'sounds', 'wagons'],
];
// Lesson 20 (w): its name, double-u, does not contain its sound, so it gets one more game than the other lessons.
// World 5 (34 to 42): a blend is no new sound, so the middle swaps the Station Board (it finds one letter's sound in a word) for Add a Car ('chains': a letter car makes a new word).
export const EXTRA_MIDDLES = { 20: ['hunt', 'sounds', 'wagons', 'board', 'writing'],
  34: ['sounds', 'chains', 'writing', 'hunt'], 35: ['writing', 'sounds', 'wagons', 'chains'], 36: ['sounds', 'hunt', 'chains', 'writing'], 37: ['chains', 'sounds', 'writing', 'wagons'],
  38: ['hunt', 'sounds', 'writing', 'chains'], 39: ['sounds', 'chains', 'wagons', 'writing'], 40: ['writing', 'chains', 'sounds', 'hunt'], 41: ['sounds', 'writing', 'chains', 'wagons'],
  42: ['sounds', 'chains', 'writing'] };
export const TAP_GAMES = ['signals', 'wagons', 'board'];
// The middle of lesson n: its pattern, with a game the lesson cannot hold (Green Light needs a second sound; Station Board needs
// its words) swapped for Letter Hunt or Wagon Parade, whichever is not already there.
export function middleFor(order, n) {
  const pattern = EXTRA_MIDDLES[n] || MIDDLES[(n - 1) % MIDDLES.length];
  const ok = { signals: n >= 2, wagons: true, board: !!boardWords(order, n, 4) };
  const out = [];
  for (const t of pattern) {
    if (t in ok && !ok[t]) out.push(['hunt', 'wagons'].find((x) => !pattern.includes(x) && !out.includes(x)) || t); else out.push(t);
  }
  return out;
}

// ---- Tricky Sounds (checkpoint kind "contrast": Two Tunnels and Which One?). Data only; the screens are js/screens/tasks/tunnels.js and which.js. ----
const mix = (list, rng) => { const a = [...list]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
// No more than two in a row with the same key (a shuffle that avoids the same tunnel or the same pair three times running).
const spread = (list, key, rng) => { for (let t = 0; t < 40; t++) { const a = mix(list, rng); if (!a.some((x, i) => i > 1 && key(x) === key(a[i - 1]) && key(x) === key(a[i - 2]))) return a; } return list; };
// Two Tunnels: six rounds, the first two a letter (one for each tunnel), then four words (two for each). Each round: { kind: 'letter' | 'word', value, side }.
export function tunnelRounds(ck, rng = Math.random) {
  // A side with `variants` (the h stop: a, o, i) shows one variant per round; the other side's words then follow that variant
  // (hat with a, hot with o, hit with i) when it lists `byVariant` words.
  const vs = ck.sides[1].variants;
  if (vs) {
    const order = mix(vs.map((_, i) => i), rng);
    const pick = (i) => order[i % order.length];
    const out = [];
    mix([0, 1], rng).forEach((side, i) => { const v = pick(i); out.push({ kind: 'letter', side, variant: v, value: side ? vs[v].letters[0] : mix(ck.sides[0].letters, rng)[0] }); });
    for (let i = 0; i < 4; i++) {
      const v = pick(i + 2), side = i % 2;
      const pool = side ? vs[v].words : ((ck.sides[0].byVariant && ck.sides[0].byVariant[vs[v].letters[0]]) || ck.sides[0].words);
      out.push({ kind: 'word', side, variant: v, value: mix(pool, rng)[0] });
    }
    return out;
  }
  const letters = mix([0, 1], rng).map((side) => ({ kind: 'letter', side, value: mix(ck.sides[side].letters, rng)[0] }));
  const words = [0, 1].flatMap((side) => mix(ck.sides[side].words, rng).slice(0, 2).map((value) => ({ kind: 'word', side, value })));
  return [...letters, ...spread(words, (r) => r.side, rng)];
}
// Which One?: six rounds. Leading `ck.whichLetters` rounds show the two letters (the grown-up says the sound); the rest show a minimal pair, every word of the
// pairs taking a turn as the target. Each round: { kind, word, target, cards: [{ value, key?, image? }, { ... }] }; `target` indexes cards.
export function whichRounds(ck, rng = Math.random, n = 6) {
  const out = [];
  const turn = mix([0, 1], rng);
  for (let i = 0; i < (ck.whichLetters || 0); i++) out.push({ kind: 'letter', word: null, target: turn[i % 2], cards: ck.pair.map((k) => ({ key: k, value: spellingFor(k, i) })) });
  let pool = [];
  while (out.length < n && ck.pairs.length) {
    if (!pool.length) pool = spread(ck.pairs.flatMap((p, pi) => [{ p, pi, t: 0 }, { p, pi, t: 1 }]), (x) => x.pi, rng);
    const { p, t } = pool.shift();
    const words = mix([p.a, p.b], rng), word = t ? p.b : p.a;
    out.push({ kind: 'word', word, target: words.indexOf(word), cards: words.map((w) => ({ value: w, ...(p.images ? { image: p.images[w] } : {}) })) });
  }
  return out;
}
