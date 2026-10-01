// Accent colours, one per taught letter (the same list is in css/app.css as --m, --a ... and their -fill and -tint).
// t is the spec's orange darkened slightly so the glyph on white reaches 3:1 (check-content computes it).
export const ACCENT = {
  m: '#3B7DD8', a: '#E5484D', s: '#2FB37A', t: '#D57C1C', f: '#14A3A8', d: '#8A5CF0', g: '#E0559C',
  i: '#B9770E', n: '#2B6CB0', p: '#C2417A', h: '#7A5C3E', b: '#5B6CFF', l: '#6B8E23',
};
export const accentOf = (g) => ACCENT[g] || '#6C5CE7';
