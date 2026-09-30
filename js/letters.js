// Child-read text. Phone fonts draw a two-story "a", so every "a" is drawn from our own glyph.
import { h } from './dom.js';
import { GLYPHS, STROKE_WIDTH } from './glyphs.js';
import { accentOf } from './theme.js';

// An inline single-story "a" sized to sit in a line of Nunito.
function inlineA(color) {
  const g = GLYPHS.a;
  const half = STROKE_WIDTH / 2;
  const top = 38 - half, bottom = 80 + half;
  const svg = h('svg', { class: 'inline-a', viewBox: `${g.minX - 1} ${top} ${g.maxX - g.minX + 2} ${bottom - top}`, 'aria-hidden': 'true' });
  g.strokes.forEach((s) => svg.append(h('path', { d: s.d, fill: 'none', stroke: color || 'currentColor', 'stroke-width': STROKE_WIDTH + 1.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })));
  return svg;
}

// letterText("catfish", {tint: "a"}) -> <span aria-label="catfish">c<svg a>tfish</span>
// tint: a taught letter whose occurrences get the accent color.
export function letterText(text, { tint } = {}) {
  const span = h('span', { class: 'ltext', 'aria-label': text, role: 'text' });
  let run = '';
  const flush = () => { if (run) { span.append(h('span', { 'aria-hidden': 'true' }, run)); run = ''; } };
  for (const ch of text) {
    const isTint = tint && ch === tint;
    if (ch === 'a') { flush(); span.append(inlineA(isTint ? accentOf('a') : null)); }
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
  if (every) { text.split(/(\s+)/).forEach((p) => frag.append(/\S/.test(p) ? letterText(p) : p)); return frag; }
  const parts = text.split(/\b(a)\b(?=\s+as in|,|\.|\?|\s*$)/);
  parts.forEach((p, i) => { if (i % 2 === 1) frag.append(inlineA()); else if (p) frag.append(p); });
  return frag;
}
