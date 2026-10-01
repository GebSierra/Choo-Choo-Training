// Our own lowercase letter shapes for m, a and s. The taught letters are never drawn from a font,
// because phone fonts use a two-story "a". Each glyph is a list of centre-line strokes in
// handwriting order on a 100 by 100 box (baseline y=80, x-height top y=38). The same strokes
// drive the big letters, the slide track, the word rows and the trace guide.
import { h, animate, reduced } from './dom.js';

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
};

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

// One letter as an <svg>. opts: color, tight (crop to the x-height band), label.
export function glyphSvg(ch, opts = {}) {
  const g = GLYPHS[ch];
  const v = glyphView(ch);
  // --vh: how much taller than the x-height band this letter's box is, so fixed-height spots can scale to match.
  const svg = h('svg', { class: 'glyph ' + (opts.class || ''), viewBox: opts.tight === false ? '0 0 100 100' : `0 ${v.top} 100 ${v.h}`, role: 'img', 'aria-label': opts.label || 'letter', dataset: { letter: ch }, style: { '--vh': (v.h / BAND_H).toFixed(3) } });
  const grp = h('g', { class: 'glyph-strokes' });
  g.strokes.forEach((s, i) => grp.append(strokePath(s.d, opts.color || 'currentColor', { class: 'stroke', 'data-i': i })));
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
const advance = (ch) => {
  try { measurer = measurer || document.createElement('canvas').getContext('2d'); measurer.font = `800 ${TEXT_SIZE}px Nunito, system-ui, sans-serif`; return Math.max(24, measurer.measureText(ch).width); } catch { return TEXT_SIZE * 0.6; }
};

// A row of letters as one <svg>; each letter is its own <g class="glyph-letter"> for sweeps and highlights.
// Our own glyphs draw every taught letter; opts.all adds the font for every other letter (without it only taught letters are drawn).
export function wordSvg(word, opts = {}) {
  let x = 0;
  const letters = [...word].filter((c) => opts.all || hasGlyph(c));
  const groups = [];
  for (const ch of letters) {
    if (!hasGlyph(ch)) {
      const w = advance(ch);
      const grp = h('g', { class: 'glyph-letter', transform: `translate(${x} 0)`, dataset: { letter: ch, x0: String(x), x1: String(x + w) } });
      const pop = h('g', { class: 'glyph-pop' }, h('text', { class: 'glyph-text', x: w / 2, y: BASELINE, 'text-anchor': 'middle', fill: opts.color || 'currentColor' }, ch));
      grp.append(h('ellipse', { class: 'glyph-halo', cx: w / 2, cy: 59, rx: w / 2 + 2, ry: 31 }), pop);
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
    grp.append(h('ellipse', { class: 'glyph-halo', cx: (g.minX + g.maxX) / 2, cy: 59, rx: (g.maxX - g.minX) / 2 + 6, ry: 31 }), pop);
    groups.push({ grp, x0: x, x1: x + (g.maxX - g.minX) });
    grp.dataset.x0 = String(x); grp.dataset.x1 = String(x + (g.maxX - g.minX));
    x += g.maxX - g.minX + SPACING;
  }
  const width = Math.max(1, x - SPACING);
  const half = STROKE_WIDTH / 2 + 3;
  const top = Math.min(BAND_TOP, ...letters.map((c) => extent(c).top - half)), bottom = Math.max(BAND_BOTTOM, ...letters.map((c) => extent(c).bottom + half));
  const svg = h('svg', { class: 'glyph word-glyphs ' + (opts.class || ''), viewBox: `0 ${top} ${width} ${bottom - top}`, role: 'img', 'aria-label': opts.label || 'letters' });
  groups.forEach((g) => svg.append(g.grp));
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
