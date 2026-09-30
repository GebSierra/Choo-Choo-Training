import { h } from '../dom.js';
import { GLYPHS, glyphSvg, wordSvg, XHEIGHT_TOP, BASELINE } from '../glyphs.js';

// Debug route #/glyphs: letters with baseline, x-height and numbered stroke starts.
export function glyphsDebug() {
  const wrap = h('div', { class: 'debug' }, h('h1', {}, 'Glyphs'));
  
  for (const ch of Object.keys(GLYPHS)) {
    const svg = h('svg', { viewBox: '0 0 100 100', class: 'debug-glyph' });
    svg.append(h('line', { x1: 0, x2: 100, y1: BASELINE, y2: BASELINE, stroke: '#c33', 'stroke-width': 0.5 }));
    svg.append(h('line', { x1: 0, x2: 100, y1: XHEIGHT_TOP, y2: XHEIGHT_TOP, stroke: '#39c', 'stroke-width': 0.5 }));
    GLYPHS[ch].strokes.forEach((s) => svg.append(h('path', { d: s.d, fill: 'none', stroke: `var(--${ch})`, 'stroke-width': 11.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })));
    GLYPHS[ch].strokes.forEach((s, i) => {
      svg.append(h('circle', { cx: s.start[0], cy: s.start[1], r: 4.5, fill: '#1E2140' }));
      const t = h('text', { x: s.start[0], y: s.start[1] + 1.6, 'text-anchor': 'middle', 'font-size': 6, fill: '#fff', 'font-weight': 800 });
      t.textContent = String(i + 1);
      svg.append(t);
    });
    wrap.append(svg);
  }
  const row = h('div', { class: 'debug-row' });
  for (const w of ['sam', 'am', 'ma']) row.append(wordSvg(w, { color: 'var(--ink)' }));
  wrap.append(row, h('div', { class: 'debug-row' }, glyphSvg('m', { color: 'var(--m)' }), glyphSvg('a', { color: 'var(--a)' }), glyphSvg('s', { color: 'var(--s)' })));
  return wrap;
}
