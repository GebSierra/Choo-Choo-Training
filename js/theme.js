import { soundOfLetter } from './order.js';
// Accent colours, one per taught letter (the same list is in css/app.css as --m, --a ... and their -fill and -tint).
// t is the spec's orange darkened slightly so the glyph on white reaches 3:1 (check-content computes it).
export const ACCENT = {
  m: '#3B7DD8', a: '#E5484D', s: '#2FB37A', t: '#D57C1C', f: '#14A3A8', d: '#8A5CF0', g: '#E0559C',
  i: '#B9770E', n: '#2B6CB0', p: '#C2417A', h: '#7A5C3E', b: '#5B6CFF', l: '#6B8E23',
  o: '#9B3FC4', c: '#0E7FA8', u: '#E0603A', r: '#3C9D3C',
  e: '#B3472F', j: '#6A4FC4', w: '#1F7A8C', v: '#A33B7A', y: '#8A6D00', z: '#2E7D32', x: '#C2410C', q: '#3F51B5', // World 3, lessons 18 to 25
  sh: '#0B6E99', ch: '#B45309', th: '#6D28D9', ck: '#9D174D', ff: '#047857', wh: '#1D4ED8', ng: '#BE123C', nk: '#4D7C0F', // World 4, lessons 26 to 33 (ll, ss and zz take ff's colour through SPELLINGS)
  st: '#0F766E', nd: '#0E7490', sp: '#7E22CE', sn: '#BE185D', bl: '#1E40AF', pl: '#A16207', br: '#9A3412', dr: '#166534', mix: '#475569', // World 5, lessons 34 to 42 (a blend is no new sound; its pairs take their lesson's colour through SPELLINGS)
  'end-s': '#0369A1', 'end-es': '#A21CAF', 'end-ing': '#15803D', 'end-ed': '#DC2626', 'end-ted': '#0F766E', 'join': '#3F6212', 'beats': '#7C2D12', 'endmix': '#475569', // World 6, lessons 43 to 50 (an ending is a word part, not a sound)
  // lessons added in phase B (k is the second spelling of c and takes its colour)
};
export const accentOf = (g) => ACCENT[g] || ACCENT[soundOfLetter(g)] || '#6C5CE7';
