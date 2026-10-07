// One look per world (docs/TRAIN-WORLD.md, "Regions"). A theme is plain data read by scene.js (sky, fog, light), scenery.js
// (ground, patches and the world's own props, built in regions.js), track.js (the bed under the sleepers) and tunnel.js
// (the portal mountain). W1 and W2 share the default theme, which is exactly the look the Home always had, so their pictures
// do not change. A world with no entry here also gets the default.
//
// Idle motion (the later shared <= 10 fps ticker, NOT built yet): candidates are the balloon's bob (W3), the boats' rocking
// and the gulls' glide (W4). Nothing in a theme animates today: every piece is static and drawn only when something else
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
  sounds: null,
};

const SUNNY = {
  ...DEFAULT_THEME,
  id: 'sunny-hills',
  decor: 'sunny',
  skyCss: 'linear-gradient(to bottom, #B8E1FF 0%, #E3F0EE 28%, #FFF1CC 60%, #FFF1CC 100%)',
  fog: '#FFF1CC',
  hemiSky: '#E6F2FF', hemiGround: '#D8D676', sun: '#FFE6B0', across: 9.6, sidePortrait: 1.8,
  ground: '#BADA52', patch: '#B1D44C', bed: '#F6E9CC',
  // a golden-ochre mountain with sunflowers on its slopes
  mountain: { low: '#C58F2E', high: '#F6E08A', lowS: '#B9C94E', highS: '#E6DC7A', cap: null, flowers: 'sunflowers' },
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

export const THEMES = { W1: DEFAULT_THEME, W2: DEFAULT_THEME, W3: SUNNY, W4: DOCKS };
export const themeOf = (worldId) => THEMES[worldId] || DEFAULT_THEME;

// The sounds a world teaches, in the order of its stations, for a world that has no lessons yet (the region preview builds
// one locked placeholder station for each). A spelling with spaces is a group shown on one sign (ff ll ss zz).
// W3 comes from curriculum.units (2.9 to 2.11); the Stage 3 units are not in the curriculum data yet, so W4 is listed here.
export const WORLD_SOUNDS = {
  W4: ['sh', 'ch', 'th', 'ck', 'ff ll ss zz', 'wh', 'ng', 'nk'],
};
export function worldSounds(curriculum, worldId) {
  const w = (curriculum.worlds || []).find((x) => x.id === worldId);
  const fromUnits = w ? w.units.flatMap((id) => ((curriculum.units || []).find((u) => u.id === id) || { sounds: [] }).sounds) : [];
  return fromUnits.length ? fromUnits : WORLD_SOUNDS[worldId] || [];
}
