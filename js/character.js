// The child's figure: the choices and how they are cleaned. No DOM here. Kept on the device only (state.character),
// never sent anywhere and never passed to text to speech.
export const SKINS = ['#F6D3B8', '#E8B48F', '#C98E62', '#8F5A36', '#5C3A22'];
export const HAIR_COLORS = ['#20160F', '#5A3A22', '#9A6A3A', '#E0B866', '#B5532E'];
export const HAIR_STYLES = ['short', 'curly', 'puffs', 'ponytail', 'bun'];
export const HAIR_NAMES = { short: 'Short hair', curly: 'Curly hair', puffs: 'Two puffs', ponytail: 'Ponytail', bun: 'Bun' };
export const OUTFIT = { tee: '#4FB0E8', star: '#FFD166', trousers: '#2F6F8F', shoe: '#FFFFFF', sole: '#D9DDE8', band: '#E5484D' };
const idx = (v, n, d) => (Number.isInteger(v) && v >= 0 && v < n ? v : d);
export const cleanCharacter = (c) => ({
  name: typeof c?.name === 'string' ? c.name.replace(/[^\p{L} '\-]/gu, '').trim().slice(0, 16) : '',
  skin: idx(c?.skin, SKINS.length, 2), hair: HAIR_STYLES.includes(c?.hair) ? c.hair : 'short',
  hairColor: idx(c?.hairColor, HAIR_COLORS.length, 1), made: c?.made === true,
});
