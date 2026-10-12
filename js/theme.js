import { soundOfLetter } from './order.js';
// Accent colours, one per taught letter (the same list is in css/app.css as --m, --a ... and their -fill and -tint).
// t is the spec's orange darkened slightly so the glyph on white reaches 3:1 (check-content computes it).
export const ACCENT = {
  m: '#3B7DD8', a: '#E5484D', s: '#2FB37A', t: '#D57C1C', f: '#14A3A8', d: '#8A5CF0', g: '#E0559C',
  i: '#B9770E', n: '#2B6CB0', p: '#C2417A', h: '#7A5C3E', b: '#5B6CFF', l: '#6B8E23',
  o: '#9B3FC4', c: '#0E7FA8', u: '#E0603A', r: '#3C9D3C',
  e: '#B3472F', j: '#6A4FC4', w: '#1F7A8C', v: '#A33B7A', y: '#8A6D00', z: '#2E7D32', x: '#C2410C', q: '#3F51B5', // World 3, lessons 18 to 25 // lessons added in phase B (k is the second spelling of c and takes its colour)
};
export const accentOf = (g) => ACCENT[g] || ACCENT[soundOfLetter(g)] || '#6C5CE7';
