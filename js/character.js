// The child's figure: the choices and how they are cleaned. No DOM here. Kept on the device only (state.character),
// never sent anywhere and never passed to text to speech.
export const SKINS = ['#F6D3B8', '#E8B48F', '#C98E62', '#8F5A36', '#5C3A22'];
export const HAIR_COLORS = ['#20160F', '#5A3A22', '#9A6A3A', '#E0B866', '#B5532E'];
export const HAIR_STYLES = ['short', 'curly', 'puffs', 'ponytail', 'bun', 'long', 'braids', 'afro', 'bob', 'buzz'];
export const HAIR_NAMES = { short: 'Short hair', curly: 'Curly hair', puffs: 'Two puffs', ponytail: 'Ponytail', bun: 'Bun', long: 'Long wavy hair', braids: 'Braids', afro: 'Big round curls', bob: 'Bob', buzz: 'Buzz cut' };
// What the figure wears. `top` is the shirt (and the sleeves), `legs` the trousers (null: bare legs, for the dress). The
// first one is the original look and the default for every saved character that has no `outfit` yet.
export const OUTFITS = [
  { id: 'star', name: 'Blue shirt with a star', top: '#4FB0E8', legs: '#2F6F8F' },
  { id: 'red', name: 'Red T-shirt', top: '#E5484D', legs: '#2F6F8F' },
  { id: 'green', name: 'Green T-shirt', top: '#3DB46D', legs: '#3A4A7A' },
  { id: 'stripes', name: 'Striped shirt', top: '#FFFFFF', stripe: '#3F6FD8', legs: '#2F6F8F' },
  { id: 'hoodie', name: 'Orange hoodie', top: '#F28C38', legs: '#3A4A7A' },
  { id: 'dress', name: 'Pink dress', top: '#F472B6', legs: null },
  { id: 'overalls', name: 'Overalls', top: '#FFD166', bib: '#2B6CB0', legs: '#2B6CB0' },
  { id: 'vest', name: 'Conductor vest', top: '#FFF0D8', vest: '#2B2D5C', legs: '#3B3F73' },
  { id: 'sweater', name: 'Purple sweater with a star', top: '#9B5DE5', legs: '#2F6F8F' },
];
export const OUTFIT_IDS = OUTFITS.map((o) => o.id);
export const outfitOf = (id) => OUTFITS.find((o) => o.id === id) || OUTFITS[0];
export const mixHex = (a, b, k) => {
  const p = (x) => [1, 3, 5].map((i) => parseInt(x.slice(i, i + 2), 16));
  const [r, g, bl] = p(a).map((v, i) => Math.round(v + (p(b)[i] - v) * k));
  return '#' + [r, g, bl].map((v) => v.toString(16).padStart(2, '0')).join('');
};
export const OUTFIT = { tee: '#4FB0E8', star: '#FFD166', trousers: '#2F6F8F', shoe: '#FFFFFF', sole: '#D9DDE8', band: '#E5484D' };
const idx = (v, n, d) => (Number.isInteger(v) && v >= 0 && v < n ? v : d);
export const cleanCharacter = (c) => ({
  name: typeof c?.name === 'string' ? c.name.replace(/[^\p{L} '\-]/gu, '').trim().slice(0, 16) : '',
  skin: idx(c?.skin, SKINS.length, 2), hair: HAIR_STYLES.includes(c?.hair) ? c.hair : 'short',
  hairColor: idx(c?.hairColor, HAIR_COLORS.length, 1), outfit: OUTFIT_IDS.includes(c?.outfit) ? c.outfit : 'star', made: c?.made === true,
});
