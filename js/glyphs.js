// Our own lowercase letter shapes for m, a and s. The taught letters are never drawn from a font,
// because phone fonts use a two-story "a". Each glyph is a list of centre-line strokes in
// handwriting order on a 100 by 100 box (baseline y=80, x-height top y=38). The same strokes
// drive the big letters, the slide track, the word rows and the trace guide.
import { h, animate, reduced } from './dom.js';
import { letterUnits, blendAtUnits, BLENDS } from './order.js';

export const STROKE_WIDTH = 11.5;
export const BASELINE = 80;
export const XHEIGHT_TOP = 38;

export const GLYPHS = {
  m: {
    strokes: [
      { d: 'M22 39 L22 80', start: [22, 39] },
      { d: 'M22 58 C22 45 29 39 37 39 C46 39 50 46 50 56 L50 80', start: [22, 58] },
      { d: 'M50 56 C50 45 57 39 65 39 C74 39 78 46 78 56 L78 80', start: [50, 56] },
    ],
    minX: 15, maxX: 85, minY: 39, maxY: 80,
  },
  a: {
    // Round bowl drawn counter-clockwise from about two o'clock, then the straight stem down.
    strokes: [
      { d: 'M62.2 48.5 A21 21 0 0 0 25.8 69.5 A21 21 0 0 0 62.2 48.5', start: [62.2, 48.5] },
      { d: 'M65 38 L65 80', start: [65, 38] },
    ],
    minX: 16, maxX: 72, minY: 38, maxY: 80,
  },
  s: {
    strokes: [
      { d: 'M67 47 C63 41 57 38.5 50 38.5 C41 38.5 34 43 34 50 C34 57 41 59 50 61 C59 63 67 66 67 72 C67 78 59 80 50 80 C42 80 35 78 31 72', start: [67, 47] },
    ],
    minX: 24, maxX: 74, minY: 38.5, maxY: 80,
  },
  // Round bowl and stem like our a; the stem is tall, clearly above the x-height, so d is never mistaken for a.
  d: {
    strokes: [
      { d: 'M62.2 48.5 A21 21 0 0 0 25.8 69.5 A21 21 0 0 0 62.2 48.5', start: [62.2, 48.5] },
      { d: 'M65 14 L65 80', start: [65, 14] },
    ],
    minX: 16, maxX: 72, minY: 14, maxY: 80,
  },
  // Down stroke with a small turn at the foot, then the crossbar left to right.
  t: {
    strokes: [
      { d: 'M42 20 L42 68 C42 76 46 80 55 80', start: [42, 20] },
      { d: 'M28 40 L58 40', start: [28, 40] },
    ],
    minX: 22, maxX: 62, minY: 20, maxY: 80,
  },
  // Curve over the top and down, then the crossbar.
  f: {
    strokes: [
      { d: 'M60 24 C58 18 53 15 47 15 C41 15 38 20 38 28 L38 80', start: [60, 24] },
      { d: 'M25 40 L56 40', start: [25, 40] },
    ],
    minX: 19, maxX: 66, minY: 15, maxY: 80,
  },
  // Single-story: the bowl, then the stem down the right side and a hook to the left below the baseline.
  g: {
    strokes: [
      { d: 'M62.2 48.5 A21 21 0 0 0 25.8 69.5 A21 21 0 0 0 62.2 48.5', start: [62.2, 48.5] },
      { d: 'M65 38 L65 82 C65 91 58 94 49 94 C42 94 36 92 32 87', start: [65, 38] },
    ],
    minX: 16, maxX: 72, minY: 38, maxY: 94,
  },
  // A short stem, then the dot as a tiny second stroke.
  i: {
    strokes: [
      { d: 'M50 38 L50 80', start: [50, 38] },
      { d: 'M50 19 L50 21', start: [50, 20] },
    ],
    minX: 41, maxX: 59, minY: 19, maxY: 80,
  },
  // Down stroke, then back up and over the arch.
  n: {
    strokes: [
      { d: 'M22 39 L22 80', start: [22, 39] },
      { d: 'M22 58 C22 45 29 39 39 39 C49 39 56 46 56 56 L56 80', start: [22, 58] },
    ],
    minX: 15, maxX: 63, minY: 39, maxY: 80,
  },
  // Down stroke below the baseline, then back up the stem a little way and round the bowl clockwise.
  p: {
    strokes: [
      { d: 'M24 38 L24 94', start: [24, 38] },
      { d: 'M24 58 C24 46 32 38 44 38 C56 38 65 47 65 59 C65 71 56 80 43 80 C34 80 27 76 24 71', start: [24, 58] },
    ],
    minX: 17, maxX: 72, minY: 38, maxY: 94,
  },
  // Tall stem down, then up and over the arch.
  h: {
    strokes: [
      { d: 'M24 14 L24 80', start: [24, 14] },
      { d: 'M24 58 C24 45 31 39 41 39 C51 39 58 46 58 56 L58 80', start: [24, 58] },
    ],
    minX: 17, maxX: 65, minY: 14, maxY: 80,
  },
  // Tall stem down, then the bowl from the stem, clockwise. (Mirror of d: the stem is on the left.)
  b: {
    strokes: [
      { d: 'M24 14 L24 80', start: [24, 14] },
      { d: 'M24 58 C24 46 32 38 44 38 C56 38 65 47 65 59 C65 71 56 80 43 80 C34 80 27 76 24 71', start: [24, 58] },
    ],
    minX: 17, maxX: 72, minY: 14, maxY: 80,
  },
  // One tall stem, one stroke.
  l: {
    strokes: [
      { d: 'M44 14 L44 80', start: [44, 14] },
    ],
    minX: 37, maxX: 51, minY: 14, maxY: 80,
  },
  // Phase B letters. o: the round bowl of a, d and g, drawn on its own, counter-clockwise from about two o'clock.
  o: {
    strokes: [
      { d: 'M62.2 48.5 A21 21 0 0 0 25.8 69.5 A21 21 0 0 0 62.2 48.5', start: [62.2, 48.5] },
    ],
    minX: 16, maxX: 72, minY: 38, maxY: 80,
  },
  // c: the same bowl, left open on the right.
  c: {
    strokes: [
      { d: 'M62.2 48.5 A21 21 0 1 0 62.2 69.5', start: [62.2, 48.5] },
    ],
    minX: 16, maxX: 69, minY: 38, maxY: 80,
  },
  // k: a tall stem, then the arm in towards the stem, then the leg out from the arm.
  k: {
    strokes: [
      { d: 'M24 14 L24 80', start: [24, 14] },
      { d: 'M60 38 L24 63', start: [60, 38] },
      { d: 'M29 59 L63 80', start: [29, 59] },
    ],
    minX: 17, maxX: 69, minY: 14, maxY: 80,
  },
  // u: down and round the bottom and up to the right, then the right-hand stem down.
  u: {
    strokes: [
      { d: 'M24 38 L24 62 C24 74 32 80 42 80 C51 80 57 76 60 70', start: [24, 38] },
      { d: 'M60 38 L60 80', start: [60, 38] },
    ],
    minX: 17, maxX: 66, minY: 38, maxY: 80,
  },
  // r: a short stem, then back up it and over a small arm.
  r: {
    strokes: [
      { d: 'M24 38 L24 80', start: [24, 38] },
      { d: 'M24 58 C24 46 31 39 42 39 C48 39 52 41 55 44', start: [24, 58] },
    ],
    minX: 17, maxX: 62, minY: 38, maxY: 80,
  },
  // World 3 letters (lessons 18 to 25). e: the bar left to right, then round counter-clockwise and a little way in at the bottom right.
  e: {
    strokes: [
      { d: 'M26 59 L64 59 C64 46 55 38 44 38 C32 38 24 47 24 59 C24 71 32 80 44 80 C52 80 59 76 63 70', start: [26, 59] },
    ],
    minX: 17, maxX: 71, minY: 38, maxY: 80,
  },
  // j: the stem down and round a hook below the baseline, then the dot.
  j: {
    strokes: [
      { d: 'M52 38 L52 84 C52 92 47 95 40 95 C36 95 33 94 30 91', start: [52, 38] },
      { d: 'M52 19 L52 21', start: [52, 20] },
    ],
    minX: 22, maxX: 60, minY: 19, maxY: 95,
  },
  // w: down, up, down, up in one zigzag.
  w: {
    strokes: [
      { d: 'M14 38 L27 80 L40 38 L53 80 L66 38', start: [14, 38] },
    ],
    minX: 7, maxX: 73, minY: 38, maxY: 80,
  },
  // v: down to a point and up.
  v: {
    strokes: [
      { d: 'M18 38 L38 80 L58 38', start: [18, 38] },
    ],
    minX: 11, maxX: 65, minY: 38, maxY: 80,
  },
  // y: the short arm down to a point, then the long stroke from the top right down through it, below the baseline.
  y: {
    strokes: [
      { d: 'M18 38 L38 80', start: [18, 38] },
      { d: 'M58 38 L33 96', start: [58, 38] },
    ],
    minX: 11, maxX: 65, minY: 38, maxY: 96,
  },
  // z: across, the slanted stroke down, across.
  z: {
    strokes: [
      { d: 'M22 38 L58 38 L22 80 L60 80', start: [22, 38] },
    ],
    minX: 15, maxX: 67, minY: 38, maxY: 80,
  },
  // x: two crossing strokes.
  x: {
    strokes: [
      { d: 'M20 38 L60 80', start: [20, 38] },
      { d: 'M60 38 L20 80', start: [60, 38] },
    ],
    minX: 13, maxX: 67, minY: 38, maxY: 80,
  },
  // q is one unit of two letters (qu says kw), so its glyph is "qu" drawn as one letter: the round bowl and the stem below the baseline,
  // then a narrow u. Everything (cards, games, tracing, word rows) treats it as one letter; wordSvg skips the u that follows a q.
  q: {
    strokes: [
      { d: 'M46.2 48.5 A21 21 0 0 0 9.8 69.5 A21 21 0 0 0 46.2 48.5', start: [46.2, 48.5] },
      { d: 'M49 38 L49 94', start: [49, 38] },
      { d: 'M62 38 L62 62 C62 74 68 80 75 80 C81 80 85 77 88 71', start: [62, 38] },
      { d: 'M88 38 L88 80', start: [88, 38] },
    ],
    minX: 0, maxX: 95, minY: 38, maxY: 94,
  },
};

// ---- Digraphs (World 4): two letters, one sound, one unit. Each is built from the strokes of its two letters, set side by side, a little
// squeezed sideways so it fits the same 100-wide box as every other glyph, and joined by a thin bar under the baseline (`link`: drawn, never
// traced), so it reads as one linked tile. Doubled letters (ff, ll, ss, zz) are built the same way from one letter twice.
const mapPath = (d, sx, dx) => d.replace(/([MLCA])([^MLCA]*)/g, (_, cmd, args) => {
  const n = args.trim().split(/[\s,]+/).map(Number);
  if (cmd === 'A') { n[0] *= sx; n[5] = n[5] * sx + dx; } else for (let i = 0; i < n.length; i += 2) n[i] = n[i] * sx + dx;
  return cmd + n.map((v) => +v.toFixed(2)).join(' ') + ' ';
}).trim();
function digraph(a, b) {
  const A = GLYPHS[a], B = GLYPHS[b], gap = 8, total = (A.maxX - A.minX) + gap + (B.maxX - B.minX);
  const sx = Math.min(1, 88 / total), pad = (100 - total * sx) / 2;
  const at = [pad - A.minX * sx, pad + ((A.maxX - A.minX) + gap) * sx - B.minX * sx];
  const strokes = [[A, at[0]], [B, at[1]]].flatMap(([g, dx]) => g.strokes.map((s) => ({ d: mapPath(s.d, sx, dx), start: [s.start[0] * sx + dx, s.start[1]] })));
  const x0 = pad - 2, x1 = 100 - pad + 2;
  return { strokes, link: `M${x0} 89 L${x1} 89`, minX: x0 - 2, maxX: x1 + 2, minY: Math.min(A.minY, B.minY), maxY: Math.max(A.maxY, B.maxY, 89) };
}
for (const pair of ['sh', 'ch', 'th', 'wh', 'ck', 'ng', 'nk', 'ff', 'll', 'ss', 'zz']) GLYPHS[pair] = digraph(pair[0], pair[1]);
// Blends (World 5) are NOT one sound: each letter keeps its own sound, so a blend pair is two plain letters side by side with NO bar between them (a digraph has one).
// It exists only as the glyph of a lesson key or a card in a blend lesson; words are still drawn letter by letter (letterUnits never joins a blend).
for (const pair of Object.values(BLENDS).flat()) { const g = digraph(pair[0], pair[1]); delete g.link; g.minY = Math.min(g.minY, 38); g.maxY = Math.min(g.maxY, 96); g.blend = true; GLYPHS[pair] = g; }
GLYPHS.mix = GLYPHS.st; // the mixed review (lesson 42) wears the st badge on the path, the lesson list and the finish card; the letter games never deal it (order.js NO_GLYPH)

const SPACING = 4;
export const hasGlyph = (ch) => !!GLYPHS[ch];

// viewBox that hugs the x-height band but leaves room for the stroke and a little air.
export const TIGHT_VIEWBOX = '0 24 100 66';
const BAND_TOP = 24, BAND_BOTTOM = 90, BAND_H = BAND_BOTTOM - BAND_TOP;

// The band every letter shares, grown only as far as a tall letter (d, t, f ...) or a letter with a tail (g, p) needs.
// The width is always 100 units, so every letter has the same size at the same CSS width.
export function glyphView(ch) {
  const g = GLYPHS[ch];
  const top = Math.min(BAND_TOP, g.minY - STROKE_WIDTH / 2 - 3), bottom = Math.max(BAND_BOTTOM, g.maxY + STROKE_WIDTH / 2 + 3);
  return { top, bottom, h: bottom - top };
}

function strokePath(d, color, extra = {}) {
  return h('path', { d, fill: 'none', stroke: color, 'stroke-width': STROKE_WIDTH, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', ...extra });
}

const linkPath = (d, color) => h('path', { d, fill: 'none', stroke: color || 'currentColor', 'stroke-width': 4.5, 'stroke-linecap': 'round', class: 'glyph-link', opacity: 0.55 });

// One letter as an <svg>. opts: color, tight (crop to the x-height band), label.
export function glyphSvg(ch, opts = {}) {
  const g = GLYPHS[ch];
  const v = glyphView(ch);
  // --vh: how much taller than the x-height band this letter's box is, so fixed-height spots can scale to match.
  const svg = h('svg', { class: 'glyph ' + (opts.class || ''), viewBox: opts.tight === false ? '0 0 100 100' : `0 ${v.top} 100 ${v.h}`, role: 'img', 'aria-label': opts.label || 'letter', dataset: { letter: ch }, style: { '--vh': (v.h / BAND_H).toFixed(3) } });
  const grp = h('g', { class: 'glyph-strokes' });
  g.strokes.forEach((s, i) => grp.append(strokePath(s.d, opts.color || 'currentColor', { class: 'stroke', 'data-i': i })));
  if (g.link) grp.append(linkPath(g.link, opts.color)); // a digraph's bar under the two letters
  svg.append(grp);
  return svg;
}

// Letters without a glyph of ours are drawn from the font (Nunito 800) in the same svg, sized so the x-height matches
// the glyphs: 87 units of font size gives an x-height of 42, the glyphs' own (baseline 80, top 38).
const TEXT_SIZE = 87;
// Where a font letter reaches (centre of nothing: the glyph's own scale), so a word with tall letters or tails is not clipped.
const FONT_TALL = 'bdfhijklt', FONT_TAIL = 'gjpqy';
const extent = (ch) => (GLYPHS[ch] ? { top: GLYPHS[ch].minY, bottom: GLYPHS[ch].maxY } : { top: FONT_TALL.includes(ch) ? 17 : 38, bottom: FONT_TAIL.includes(ch) ? 96 : 80 });
let measurer = null;
const advance = (ch, reading = false) => {
  try {
    measurer = measurer || document.createElement('canvas').getContext('2d');
    measurer.font = reading ? READING_FONT : `800 ${TEXT_SIZE}px Nunito, system-ui, sans-serif`;
    return Math.max(reading ? 18 : 24, measurer.measureText(ch).width);
  } catch { return reading ? 46 : 52; }
};

// Story text: one clean, even weight. The stroke glyphs only exist for the taught lowercase letters, so a line such as "Sam sat."
// mixed our strokes with Nunito 800 for the capital and the full stop, which looked uneven and heavy. With opts.font every letter
// and mark of a word is drawn from the house reading font (Andika 700, single-story a), so a sentence has one weight throughout.
const READING_SIZE = 80;
const READING_FONT = `700 ${READING_SIZE}px Andika, Nunito, system-ui, sans-serif`;
try { if (typeof document !== 'undefined' && document.fonts && document.fonts.load) document.fonts.load(READING_FONT); } catch { /* the font loads when first used */ }
const readingExtent = (ch) => ({ top: [...ch].some((x) => FONT_TALL.includes(x)) || /[A-Z0-9]/.test(ch) ? 20 : 38, bottom: [...ch].some((x) => FONT_TAIL.includes(x)) ? 98 : 82 + (ch.length > 1 ? 6 : 0) });

// A row of letters as one <svg>; each letter is its own <g class="glyph-letter"> for sweeps and highlights.
// Our own glyphs draw every taught letter; opts.all adds the font for every other letter (without it only taught letters are drawn).
export function wordSvg(word, opts = {}) {
  let x = 0;
  const reading = !!opts.font;
  // the u after a q is part of q's glyph ("qu" is one unit), except in the reading font where every letter is its own
  // opts.level (a lesson number) joins the digraphs taught by then into one unit (sh, ch ... as one linked tile); a font word keeps them as one group too.
  const letters = (reading ? (opts.level != null ? letterUnits(word, opts.level, true) : [...word]) : letterUnits(word, opts.level)).filter((c) => opts.all || reading || hasGlyph(c));
  const groups = [];
  for (const ch of letters) {
    if (reading || !hasGlyph(ch)) {
      const w = advance(ch, reading);
      const grp = h('g', { class: 'glyph-letter', transform: `translate(${x} 0)`, dataset: { letter: ch, x0: String(x), x1: String(x + w) } });
      const pop = h('g', { class: 'glyph-pop' }, h('text', { class: 'glyph-text', x: w / 2, y: BASELINE, 'text-anchor': 'middle', fill: opts.color || 'currentColor' }, ch));
      grp.append(h('ellipse', { class: 'glyph-halo', cx: w / 2, cy: 59, rx: w / 2 + 2, ry: 31 }), pop);
      if (ch.length > 1) grp.append(h('path', { d: `M3 ${BASELINE + 9} L${w - 3} ${BASELINE + 9}`, class: 'glyph-link', fill: 'none', stroke: opts.color || 'currentColor', 'stroke-width': 4, 'stroke-linecap': 'round', opacity: 0.55 })); // a digraph's bar
      groups.push({ grp });
      x += w + SPACING;
      continue;
    }
    const g = GLYPHS[ch];
    const grp = h('g', { class: 'glyph-letter', transform: `translate(${x - g.minX} 0)`, dataset: { letter: ch } });
    // A soft halo behind the letter and an inner group for the pop, so Saying Sounds can light a letter by
    // class alone (the outer group already carries its own translate).
    const pop = h('g', { class: 'glyph-pop' });
    g.strokes.forEach((s) => pop.append(strokePath(s.d, opts.color || 'currentColor', { class: 'stroke' })));
    if (g.link) pop.append(linkPath(g.link, opts.color));
    grp.append(h('ellipse', { class: 'glyph-halo', cx: (g.minX + g.maxX) / 2, cy: 59, rx: (g.maxX - g.minX) / 2 + 6, ry: 31 }), pop);
    groups.push({ grp, x0: x, x1: x + (g.maxX - g.minX) });
    grp.dataset.x0 = String(x); grp.dataset.x1 = String(x + (g.maxX - g.minX));
    x += g.maxX - g.minX + SPACING;
  }
  const width = Math.max(1, x - SPACING);
  // World 5: a blend is two letters that each keep their sound, shown as two plain letters under one soft bracket (never joined like a digraph).
  const marks = opts.level != null && !reading ? blendAtUnits(letters, opts.level).filter((i) => groups[i + 1]) : [];
  for (const i of marks) {
    const x0 = Number(groups[i].grp.dataset.x0), x1 = Number(groups[i + 1].grp.dataset.x1), y = BASELINE + 13;
    groups[i].grp.classList.add('in-blend'); groups[i + 1].grp.classList.add('in-blend');
    const mark = h('path', { d: `M${x0 + 2} ${y - 6} L${x0 + 2} ${y} L${x1 - 2} ${y} L${x1 - 2} ${y - 6}`, class: 'blend-mark', fill: 'none', stroke: opts.color || 'currentColor', 'stroke-width': 4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: 0.55 });
    groups[i].mark = mark;
  }
  const half = STROKE_WIDTH / 2 + 3;
  const ext = reading ? readingExtent : extent;
  const top = Math.min(BAND_TOP, ...letters.map((c) => ext(c).top - (reading ? 2 : half))), bottom = Math.max(BAND_BOTTOM, marks.length ? BASELINE + 19 : 0, ...letters.map((c) => ext(c).bottom + (reading ? 2 : half)));
  const svg = h('svg', { class: 'glyph word-glyphs ' + (reading ? 'reading-font ' : '') + (opts.class || ''), viewBox: `0 ${top} ${width} ${bottom - top}`, role: 'img', 'aria-label': opts.label || 'letters' });
  groups.forEach((g) => svg.append(g.grp));
  groups.forEach((g) => { if (g.mark) svg.append(g.mark); });
  svg.dataset.width = String(width);
  svg.dataset.height = String(bottom - top);
  return svg;
}

// Draw the strokes on one after another in handwriting order, then let the letter settle.
export function drawIn(svg, { per = 480, delay = 0 } = {}) {
  const paths = [...svg.querySelectorAll('path.stroke')];
  if (reduced()) return Promise.resolve();
  let t = delay;
  const anims = paths.map((p) => {
    const len = p.getTotalLength();
    p.style.strokeDasharray = `${len}`;
    const a = animate(p, [{ strokeDashoffset: len }, { strokeDashoffset: 0 }], { duration: per * Math.min(1, 0.45 + len / 160), delay: t, easing: 'cubic-bezier(.4,0,.2,1)' });
    t += per * Math.min(1, 0.45 + len / 160) + 40;
    a.finished.then(() => { p.style.strokeDasharray = ''; p.style.strokeDashoffset = ''; a.cancel(); }).catch(() => {});
    return a;
  });
  const settle = animate(svg, [{ transform: 'scale(1)' }, { transform: 'scale(1.06)', offset: 0.5 }, { transform: 'scale(1)' }], { duration: 420, delay: t, easing: 'cubic-bezier(.34,1.56,.64,1)' });
  return Promise.all([...anims.map((a) => a.finished), settle.finished]).catch(() => {});
}

// Points along a stroke, used for arrows on the trace guide and the moving dot in "Show me".
export function strokePoints(letter, samples = 60) {
  const ns = 'http://www.w3.org/2000/svg';
  return GLYPHS[letter].strokes.map((s) => {
    const p = document.createElementNS(ns, 'path');
    p.setAttribute('d', s.d);
    const len = p.getTotalLength();
    const pts = [];
    for (let i = 0; i <= samples; i++) { const q = p.getPointAtLength((len * i) / samples); pts.push([q.x, q.y]); }
    return { pts, len, start: s.start };
  });
}
