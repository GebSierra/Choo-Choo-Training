// One look per world (docs/TRAIN-WORLD.md, "Regions"). A theme is plain data read by scene.js (sky, fog, light), scenery.js
// (ground, patches and the world's own props, built in regions.js), track.js (the bed under the sleepers) and tunnel.js
// (the portal mountain). W2 is exactly the look the Home always had; W1 is the same look plus a few extra props (details: 'starter'). A world with no entry here also gets the default.
//
// Idle motion (the later shared <= 10 fps ticker, NOT built yet): candidates are the balloon's bob (W3), the boats' rocking
// and the gulls' glide (W4), the kites' tails and the ferry's bob (W5), the signal lamps and the turntable (W6), the cable car's
// slide and the waterfall's shimmer (W7). Nothing in a theme animates today: every piece is static and drawn only when something else
// asks for a frame.
import { PAL } from './world.js';

export const DEFAULT_THEME = {
  id: 'default',
  skyCss: null, // null: the page's own gradient (css/app.css .home3d)
  fog: PAL.horizon, fogNear: 34, fogFar: 78,
  hemiSky: '#CFEFFF', hemiGround: '#8BCF9A', sun: '#FFF1D6',
  ground: PAL.grass, patch: PAL.grassDark, bed: PAL.cream,
  mountain: { low: '#62C34C', high: '#D2EC68', lowS: '#58BE55', highS: '#A9DE5E', cap: null, flowers: 'mixed' },
  decor: null,
  details: null, // 'starter': the extra props of Starter Station (js/train/starter.js), world 1 only
  sounds: null,
};

// World 1 keeps the default look and gets the little extras; world 2 and any world with no entry stay exactly the default.
const STARTER = { ...DEFAULT_THEME, id: 'starter-station', details: 'starter' };

const SUNNY = {
  ...DEFAULT_THEME,
  id: 'sunny-hills',
  decor: 'sunny',
  skyCss: 'linear-gradient(to bottom, #B8E1FF 0%, #E3F0EE 28%, #FFF1CC 60%, #FFF1CC 100%)',
  fog: '#FFF1CC',
  hemiSky: '#E6F2FF', hemiGround: '#A9D183', sun: '#FFEBC4', across: 9.6, sidePortrait: 1.8,
  ground: '#BADA52', patch: '#B1D44C', bed: '#F6E9CC',
  // a golden-ochre mountain with sunflowers on its slopes
  mountain: { low: '#4DB043', high: '#7FCB4C', lowS: '#5BBA48', highS: '#96D04F', cap: { from: 0.8, color: '#F3D562' }, flowers: 'sunflowers', stripe: { from: 0.1, to: 0.5, n: 9, c1: '#E2C650', c2: '#86C94D' } },
};

const DOCKS = {
  ...DEFAULT_THEME,
  id: 'digraph-docks',
  decor: 'docks',
  skyCss: 'linear-gradient(to bottom, #A9DDFF 0%, #D6EEFF 30%, #F1F9FF 62%, #F1F9FF 100%)',
  fog: '#EEF8FF',
  hemiSky: '#DDF1FF', hemiGround: '#F0DEAC', sun: '#FFF3DA',
  ground: '#FFE8A4', patch: '#F6D98E', bed: '#E8CF94', sidePortrait: 0.9, across: 9.6,
  // a grey-blue sea-cliff headland with a green grass top
  mountain: { low: '#6F849D', high: '#B4C4D6', lowS: '#7A8FA8', highS: '#AEBED0', cap: { from: 0.95, color: '#7FCB62' }, flowers: 'thrift' },
};

// W5 Blend Bay: a cosy turquoise bay, warm peach sand, a soft lilac-to-peach sky; the portal is a lilac sea-cliff with a green top.
const BAY = {
  ...DEFAULT_THEME,
  id: 'blend-bay',
  decor: 'bay',
  skyCss: 'linear-gradient(to bottom, #B7CBFF 0%, #DCD8FA 30%, #FBE9EE 62%, #FFEFDF 100%)',
  fog: '#FBEAEA',
  hemiSky: '#E4E2FF', hemiGround: '#F6DDB4', sun: '#FFF0DA',
  ground: '#FBE3BC', patch: '#F4D6A4', bed: '#EBCF9C', sidePortrait: 0.7, across: 9.6,
  mountain: { low: '#A38EE6', high: '#DCD2FA', lowS: '#9A86DE', highS: '#D2C7F4', cap: { from: 0.93, color: '#8FD27A' }, flowers: 'thrift' },
};

// W6 Endings Junction: a little railway town on warm gravel, a clear blue sky; the portal is a brick-red railway cutting.
const JUNCTION = {
  ...DEFAULT_THEME,
  id: 'endings-junction',
  decor: 'junction',
  skyCss: 'linear-gradient(to bottom, #8EC3F7 0%, #BCDDF9 32%, #E6F1FA 64%, #F4F4EE 100%)',
  fog: '#EEF2F1',
  hemiSky: '#DCEBFF', hemiGround: '#CFC6B0', sun: '#FFF1D8',
  ground: '#CFC9B6', patch: '#B9C58F', bed: '#B9AE98', sidePortrait: 0.9, across: 9.6,
  mountain: { low: '#B9695A', high: '#E9C09A', lowS: '#AD6657', highS: '#DDB48F', cap: { from: 0.93, color: '#92C96C' }, flowers: 'mixed' },
};

// W7 Silent E Summit: alpine meadows below a snowy peak; the portal is a grey-violet rock with a snow cap.
const SUMMIT = {
  ...DEFAULT_THEME,
  id: 'silent-e-summit',
  decor: 'summit',
  skyCss: 'linear-gradient(to bottom, #A5D8F2 0%, #CFEBF2 30%, #EAF7F4 62%, #F5FBF8 100%)',
  fog: '#EAF6F3',
  hemiSky: '#DDF0FF', hemiGround: '#B9D9A0', sun: '#FFF4E0',
  ground: '#A9D78F', patch: '#9BCC82', bed: '#E6E0CC', sidePortrait: 0.7, across: 9.6,
  mountain: { low: '#8D8AA8', high: '#DAD6E8', lowS: '#8381A0', highS: '#CFCBE0', cap: { from: 0.6, color: '#FFFFFF' }, flowers: 'mixed' },
};

export const THEMES = { W1: STARTER, W2: DEFAULT_THEME, W3: SUNNY, W4: DOCKS, W5: BAY, W6: JUNCTION, W7: SUMMIT };
export const themeOf = (worldId) => THEMES[worldId] || DEFAULT_THEME;

// The sounds a world teaches, in the order of its stations, for a world that has no lessons yet (the region preview builds
// one locked placeholder station for each). A spelling with spaces is a group shown on one sign (ff ll ss zz).
// W3 comes from curriculum.units (2.9 to 2.11); the units of Stages 3 to 6 are not in the curriculum data yet, so W4 to W7 are listed here.
export const WORLD_SOUNDS = {
  W4: ['sh', 'ch', 'th', 'ck', 'ff ll ss zz', 'wh', 'ng', 'nk'],
  // Stage 4 (docs/CURRICULUM.md): ending blends, then s-, l- and r-blends
  W5: ['st ft', 'nd mp nt', 'sp sk sn', 'sw sm sl', 'bl cl fl', 'pl gl', 'br tr cr', 'dr fr gr'],
  // Stage 5: -s and -es, -ing, -ed, then the 2-syllable words
  W6: ['s es', 'ing', 'ed', 'sun set', 'nap kin'],
  // Stage 6: open vowels, then a_e i_e o_e u_e e_e
  W7: ['we me he', 'a_e', 'i_e', 'o_e', 'u_e', 'e_e'],
};
export function worldSounds(curriculum, worldId) {
  const w = (curriculum.worlds || []).find((x) => x.id === worldId);
  const fromUnits = w ? w.units.flatMap((id) => ((curriculum.units || []).find((u) => u.id === id) || { sounds: [] }).sounds) : [];
  return fromUnits.length ? fromUnits : WORLD_SOUNDS[worldId] || [];
}
