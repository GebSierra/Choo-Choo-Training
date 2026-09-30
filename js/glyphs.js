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
    minX: 15, maxX: 85,
  },
  a: {
    // Round bowl drawn counter-clockwise from about two o'clock, then the straight stem down.
    strokes: [
      { d: 'M62.2 48.5 A21 21 0 0 0 25.8 69.5 A21 21 0 0 0 62.2 48.5', start: [62.2, 48.5] },
      { d: 'M65 38 L65 80', start: [65, 38] },
    ],
    minX: 16, maxX: 72,
  },
  s: {
    strokes: [
      { d: 'M67 47 C63 41 57 38.5 50 38.5 C41 38.5 34 43 34 50 C34 57 41 59 50 61 C59 63 67 66 67 72 C67 78 59 80 50 80 C42 80 35 78 31 72', start: [67, 47] },
    ],
    minX: 24, maxX: 74,
  },
};

const SPACING = 4;
export const hasGlyph = (ch) => !!GLYPHS[ch];

// viewBox that hugs the x-height band but leaves room for the stroke and a little air.
export const TIGHT_VIEWBOX = '0 24 100 66';

function strokePath(d, color, extra = {}) {
  return h('path', { d, fill: 'none', stroke: color, 'stroke-width': STROKE_WIDTH, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', ...extra });
}

// One letter as an <svg>. opts: color, tight (crop to the x-height band), label.
export function glyphSvg(ch, opts = {}) {
  const g = GLYPHS[ch];
  const svg = h('svg', { class: 'glyph ' + (opts.class || ''), viewBox: opts.tight === false ? '0 0 100 100' : TIGHT_VIEWBOX, role: 'img', 'aria-label': opts.label || 'letter', dataset: { letter: ch } });
  const grp = h('g', { class: 'glyph-strokes' });
  g.strokes.forEach((s, i) => grp.append(strokePath(s.d, opts.color || 'currentColor', { class: 'stroke', 'data-i': i })));
  svg.append(grp);
  return svg;
}

// A row of letters as one <svg>; each letter is its own <g class="glyph-letter"> for sweeps and highlights.
export function wordSvg(word, opts = {}) {
  let x = 0;
  const letters = [...word].filter(hasGlyph);
  const groups = [];
  for (const ch of letters) {
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
  const svg = h('svg', { class: 'glyph word-glyphs ' + (opts.class || ''), viewBox: `0 24 ${width} 66`, role: 'img', 'aria-label': opts.label || 'letters' });
  groups.forEach((g) => svg.append(g.grp));
  svg.dataset.width = String(width);
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
