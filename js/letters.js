// Child-read text. Phone fonts draw a two-story "a", so the taught letters (a included) are drawn from our own glyphs.
import { h } from './dom.js';
import { GLYPHS, STROKE_WIDTH, XHEIGHT_TOP, BASELINE } from './glyphs.js';
import { accentOf } from './theme.js';

// An inline glyph of ours sized to sit in a line of Nunito: the x-height of the glyph box is .56em tall, a unit is .01047em,
// and a tail below the baseline hangs below the line. Every taught letter is drawn this way in text a child reads.
const UNIT = 0.56 / (BASELINE - XHEIGHT_TOP + STROKE_WIDTH);
function inlineGlyph(ch, color) {
  const g = GLYPHS[ch];
  const half = STROKE_WIDTH / 2;
  const top = g.minY - half, bottom = g.maxY + half;
  const svg = h('svg', { class: 'inline-glyph inline-' + ch, viewBox: `${g.minX - 1} ${top} ${g.maxX - g.minX + 2} ${bottom - top}`, 'aria-hidden': 'true', dataset: { letter: ch },
    style: { height: ((bottom - top) * UNIT).toFixed(3) + 'em', verticalAlign: (-0.03 - (bottom - (BASELINE + half)) * UNIT).toFixed(3) + 'em' } });
  g.strokes.forEach((s) => svg.append(h('path', { d: s.d, fill: 'none', stroke: color || 'currentColor', 'stroke-width': STROKE_WIDTH + 1.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })));
  return svg;
}

// A label is never a single letter: a screen reader would say its name.
const labelOf = (text) => (text.length > 1 ? text : 'this letter');

// letterText("catfish", {tint: "a"}) -> <span aria-label="catfish">c, a, t, f, i, s and h drawn from our glyphs, the rest from the font.
// tint: a taught letter whose occurrences get the accent color. label: false when a wrapper labels the whole sentence.
// only: draw just these letters from glyphs (parent text keeps to the one that needs it, the two-story "a").
export function letterText(text, { tint, label = true, only } = {}) {
  const span = h('span', { class: 'ltext', 'aria-label': label ? labelOf(text) : null, role: label ? 'text' : null });
  let run = '';
  const flush = () => { if (run) { span.append(h('span', { 'aria-hidden': 'true' }, run)); run = ''; } };
  for (const ch of text) {
    const isTint = tint && ch === tint;
    if (GLYPHS[ch] && (!only || only.includes(ch))) { flush(); span.append(inlineGlyph(ch, isTint ? accentOf(ch) : null)); }
    else if (isTint) { flush(); span.append(h('span', { class: 'tint', style: { color: accentOf(tint) }, 'aria-hidden': 'true' }, ch)); }
    else run += ch;
  }
  flush();
  return span;
}

// Text that may contain the taught letter "a" standing alone, for example "Say a as in apple."
// every: true draws every "a" in every word from the glyph (text a child reads).
export function richText(text, { every } = {}) {
  const frag = document.createDocumentFragment();
  if (every) {
    const sentence = h('span', { 'aria-label': labelOf(text), role: 'text' });
    text.split(/(\s+)/).forEach((p) => sentence.append(/\S/.test(p) ? letterText(p, { label: false, only: ['a'] }) : p));
    frag.append(sentence);
    return frag;
  }
  const parts = text.split(/\b(a)\b(?=\s+as in|,|\.|\?|\s*$)/);
  parts.forEach((p, i) => { if (i % 2 === 1) frag.append(inlineGlyph('a')); else if (p) frag.append(p); });
  return frag;
}
