import { h } from '../dom.js';
import { glyphSvg, hasGlyph, GLYPHS, STROKE_WIDTH } from '../glyphs.js';

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

// The same letter with its box trimmed to the letter's own width, so it sits in the middle of a tile or card (the plain face
// leaves each letter at its place in a 100-unit box, which puts f and p off to one side). Height and scale are unchanged.
export function centerGlyph(face, ch) {
  const g = GLYPHS[ch];
  if (g && face.tagName.toLowerCase() === 'svg') {
    const vb = face.getAttribute('viewBox').split(' ').map(Number), pad = STROKE_WIDTH / 2 + 4;
    face.setAttribute('viewBox', `${g.minX - pad} ${vb[1]} ${g.maxX - g.minX + pad * 2} ${vb[3]}`);
  }
  return face;
}
export const centeredFace = (ch, color) => centerGlyph(letterFace(ch, color), ch);
