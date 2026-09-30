import { h } from '../dom.js';
import { glyphSvg, hasGlyph } from '../glyphs.js';

// A letter for the games. m, a and s come from our own glyphs (so "a" is single-story);
// any other lowercase letter is drawn from the font at the same size and weight.
export function letterFace(ch, color) {
  return hasGlyph(ch)
    ? glyphSvg(ch, { color, label: 'letter' })
    : h('span', { class: 'font-letter', style: { color }, 'aria-hidden': 'true' }, ch);
}

export function tintLetter(face, color) {
  if (face.classList.contains('font-letter')) face.style.color = color;
  else face.querySelectorAll('path.stroke').forEach((p) => p.setAttribute('stroke', color));
}
