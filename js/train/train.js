// The train: a red engine with a navy boiler and sun-yellow trim, Pip in the cab, and one open wagon per completed lesson
// in that sound's accent colour with its letter on both sides. place(s) puts the engine's middle at distance s along the
// line and the wagons behind it; roll(distance) turns the wheels; puffs of steam rise from the funnel.
import { THREE, PAL, block } from './world.js';
import { buildPip } from './pip3d.js';
import { drawGlyph } from './stations.js';

const ENGINE_FRONT = 1.5, ENGINE_BACK = 1.35, CAR_HALF = 0.95, GAP = 0.22, WHEEL_R = 0.3, CAR_WHEEL_R = 0.25;

function wheel(bag, r, color) {
  const g = new THREE.Group();
  const tyre = new THREE.Mesh(bag.geo(`wheel${r}`, () => new THREE.CylinderGeometry(r, r, 0.14, 20)), bag.paint(color));
  tyre.rotation.z = Math.PI / 2; tyre.castShadow = true;
  const hub = new THREE.Mesh(bag.geo(`hub${r}`, () => new THREE.CylinderGeometry(r * 0.42, r * 0.42, 0.18, 12)), bag.paint(PAL.sun));
  hub.rotation.z = Math.PI / 2;
  const spoke = new THREE.Mesh(bag.box(0.2, r * 1.5, 0.12, 0.04, 1), bag.paint(PAL.sun));
  g.add(tyre, hub, spoke);
  return g;
}

function glyphTexture(bag, glyph, accent) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#FFF8EC'; g.beginPath(); g.roundRect(4, 4, 120, 120, 26); g.fill();
  drawGlyph(g, glyph, 64, 64, 96, accent);
  const t = bag.add(new THREE.CanvasTexture(c));
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

// A small flat gold star (one extruded shape, shared), for the engine's upgrades.
function goldStar(bag, r = 0.2) {
  const m = new THREE.Mesh(bag.geo('goldstar', () => {
    const sh = new THREE.Shape();
    for (let i = 0; i < 10; i++) { const k = i % 2 ? 0.45 : 1, a = Math.PI / 2 + (i * Math.PI) / 5; if (i) sh.lineTo(Math.cos(a) * k, Math.sin(a) * k); else sh.moveTo(Math.cos(a) * k, Math.sin(a) * k); }
    sh.closePath();
    const g = new THREE.ExtrudeGeometry(sh, { depth: 0.1, bevelEnabled: false });
    g.center();
    return g;
  }), bag.paint(PAL.sun, { emissive: '#F0A93B', emissiveIntensity: 0.25, roughness: 0.4 }));
  m.scale.set(r, r, r);
  return m;
}

// The brass plate on the boiler: the letters of the first world the child finished (drawn into a canvas texture once).
function plateTexture(bag, letters) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 96;
  const g = c.getContext('2d');
  g.fillStyle = '#D9A441'; g.beginPath(); g.roundRect(0, 0, 256, 96, 18); g.fill();
  g.strokeStyle = '#FFE3A0'; g.lineWidth = 6; g.beginPath(); g.roundRect(5, 5, 246, 86, 14); g.stroke();
  g.fillStyle = PAL.navy; g.font = '800 54px Nunito, system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(letters.join(' '), 128, 52, 232);
  const t = bag.add(new THREE.CanvasTexture(c));
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

// The engine's upgrades, one per finished world and cumulative (a few primitives each, nothing animated):
// 1 a gold stripe along the boiler, a brass plate with that world's letters and a gold star on the cab side; 2 a brass bell;
// 3 a big round headlamp; 4 gold wheel rims; 5 a taller chimney with a gold band; 6 a small flag on the cab; each later world adds one more gold star.
function upgradeEngine(bag, e, level, letters) {
  const { group: g } = e;
  const add = (m, x, y, z) => { m.position.set(x, y, z); g.add(m); return m; };
  const gold = () => bag.paint('#E8B341', { roughness: 0.35, metalness: 0.15 });
  const stars = Math.max(0, level - 5); // star 1 comes with upgrade 1
  if (level >= 1) {
    add(new THREE.Mesh(bag.box(0.12, 0.05, 1.5, 0.02, 1), gold()), 0, 1.74, 0.5);
    const plateMat = bag.add(new THREE.MeshStandardMaterial({ map: plateTexture(bag, letters), roughness: 0.45, metalness: 0.1 }));
    for (const side of [-1, 1]) {
      const pl = add(new THREE.Mesh(bag.geo('engplate', () => new THREE.PlaneGeometry(0.9, 0.34)), plateMat), side * 0.49, 1.3, 0.5);
      pl.rotation.y = side * Math.PI / 2;
    }
  }
  const starSpots = [[-0.84, 1.12], [-0.52, 1.12], [-1.16, 1.12], [-0.84, 0.86], [-0.52, 0.86], [-1.16, 0.86]];
  if (level >= 1) for (let i = 0; i < Math.min(1 + stars, starSpots.length); i++) {
    for (const side of [-1, 1]) { const st = goldStar(bag, 0.16); st.position.set(side * 0.7, starSpots[i][1], starSpots[i][0]); st.rotation.y = side * Math.PI / 2; g.add(st); }
  }
  if (level >= 2) { // a brass bell on a little bracket above the boiler, by the cab
    add(new THREE.Mesh(bag.box(0.08, 0.3, 0.08, 0.02, 1), gold()), 0, 1.9, 0.0);
    add(new THREE.Mesh(bag.geo('engbell', () => new THREE.ConeGeometry(0.17, 0.26, 16, 1, true)), bag.paint('#E8B341', { roughness: 0.3, metalness: 0.2, side: THREE.DoubleSide })), 0, 2.05, 0.0);
  }
  if (level >= 3) { // a big round headlamp on the smokebox
    const lamp = add(new THREE.Mesh(bag.geo('enghead', () => new THREE.CylinderGeometry(0.22, 0.22, 0.2, 20)), gold()), 0, 1.78, 1.12);
    lamp.rotation.x = Math.PI / 2;
    add(new THREE.Mesh(bag.geo('engheadglass', () => new THREE.SphereGeometry(0.17, 16, 10)), bag.paint('#FFF6D6', { emissive: '#FFE3A0', emissiveIntensity: 0.6 })), 0, 1.78, 1.24);
  }
  if (level >= 4) e.wheels.forEach((w) => { const r = new THREE.Mesh(bag.geo('engrim', () => new THREE.TorusGeometry(WHEEL_R, 0.035, 8, 20)), gold()); r.rotation.y = Math.PI / 2; for (const x of [-0.075, 0.075]) { const c = r.clone(); c.position.x = x; w.add(c); } });
  if (level >= 5) { // a taller chimney with a gold band
    add(new THREE.Mesh(bag.geo('engstack', () => new THREE.CylinderGeometry(0.19, 0.24, 0.45, 18)), bag.paint(PAL.navy)), 0, 2.5, 0.95);
    add(new THREE.Mesh(bag.geo('engstackband', () => new THREE.CylinderGeometry(0.245, 0.245, 0.07, 18)), gold()), 0, 2.45, 0.95);
    e.funnelTop.position.y += 0.45;
  }
  if (level >= 6) { // a small flag on the cab roof
    add(new THREE.Mesh(bag.box(0.04, 0.6, 0.04, 0.01, 1), bag.paint(PAL.woodLight)), 0.58, 2.35, -1.25);
    const flag = add(new THREE.Mesh(bag.geo('engflag', () => new THREE.PlaneGeometry(0.34, 0.22)), bag.paint(PAL.sun, { side: THREE.DoubleSide })), 0.58 + 0.19, 2.52, -1.25);
    flag.rotation.y = Math.PI / 2;
  }
}

function buildEngine(bag, upgrades = 0, letters = []) {
  const g = new THREE.Group();
  g.name = 'engine';
  const wheels = [];
  const add = (m, x, y, z) => { m.position.set(x, y, z); g.add(m); return m; };
  add(block(bag, 1.1, 0.28, 2.6, PAL.navy), 0, 0.5, 0.05);
  add(block(bag, 1.38, 0.2, 2.75, PAL.red, { r: 0.08 }), 0, 0.72, 0.05);
  const boiler = add(new THREE.Mesh(bag.geo('boiler', () => new THREE.CylinderGeometry(0.47, 0.47, 1.55, 28)), bag.paint(PAL.navy, { roughness: 0.5 })), 0, 1.25, 0.5);
  boiler.rotation.x = Math.PI / 2; boiler.castShadow = true;
  for (const z of [0.0, 0.55, 1.05]) { const b = add(new THREE.Mesh(bag.geo('band', () => new THREE.CylinderGeometry(0.5, 0.5, 0.08, 28)), bag.paint(PAL.sun)), 0, 1.25, z); b.rotation.x = Math.PI / 2; }
  const front = add(new THREE.Mesh(bag.geo('smokebox', () => new THREE.CylinderGeometry(0.42, 0.42, 0.1, 24)), bag.paint('#3A3D78')), 0, 1.25, 1.32);
  front.rotation.x = Math.PI / 2;
  add(new THREE.Mesh(bag.geo('lamp', () => new THREE.SphereGeometry(0.12, 14, 10)), bag.paint(PAL.sun, { emissive: '#FFC94D', emissiveIntensity: 0.6 })), 0, 1.25, 1.4);
  const funnel = add(new THREE.Mesh(bag.geo('funnel', () => new THREE.CylinderGeometry(0.26, 0.17, 0.62, 18)), bag.paint(PAL.navy)), 0, 1.95, 0.95);
  funnel.castShadow = true;
  add(new THREE.Mesh(bag.geo('funnelrim', () => new THREE.TorusGeometry(0.25, 0.05, 8, 18)), bag.paint(PAL.sun)), 0, 2.26, 0.95).rotation.x = Math.PI / 2;
  add(new THREE.Mesh(bag.geo('dome', () => new THREE.SphereGeometry(0.21, 16, 12)), bag.paint(PAL.sun, { roughness: 0.4 })), 0, 1.7, 0.3);
  const catcher = add(block(bag, 1.05, 0.34, 0.34, PAL.sun, { r: 0.08 }), 0, 0.5, 1.45);
  catcher.rotation.x = 0.5;
  // the cab: open at the top so Pip can be seen, a front wall with two round windows and a sun-yellow rim
  add(block(bag, 1.36, 0.6, 1.05, PAL.red, { r: 0.1 }), 0, 1.08, -0.82);
  add(block(bag, 1.36, 0.62, 0.16, PAL.red, { r: 0.06 }), 0, 1.66, -0.33);
  for (const x of [-0.32, 0.32]) { const win = add(new THREE.Mesh(bag.geo('cabwin', () => new THREE.CircleGeometry(0.13, 16)), bag.paint('#FFF6D6', { emissive: '#FFE3A0', emissiveIntensity: 0.3 })), x, 1.72, -0.425); win.rotation.y = Math.PI; }
  for (const [w, d, x, z] of [[1.44, 0.1, 0, -1.33], [0.1, 1.0, -0.7, -0.84], [0.1, 1.0, 0.7, -0.84]]) add(block(bag, w, 0.08, d, PAL.sun, { r: 0.03 }), x, 1.4, z).name = 'cab-rim';
  add(block(bag, 1.44, 0.08, 0.22, PAL.sun, { r: 0.03 }), 0, 2.0, -0.33).name = 'cab-rim-top';
  for (const z of [0.85, 0.1, -0.7]) for (const x of [-0.7, 0.7]) { const w = wheel(bag, WHEEL_R, PAL.red); w.position.set(x, WHEEL_R + 0.05, z); g.add(w); wheels.push(w); }
  add(new THREE.Mesh(bag.geo('coupler', () => new THREE.CylinderGeometry(0.07, 0.07, 0.4, 8)), bag.paint(PAL.navy)), 0, 0.55, -1.45).rotation.x = Math.PI / 2;
  const funnelTop = new THREE.Object3D();
  funnelTop.position.set(0, 2.35, 0.95);
  g.add(funnelTop);
  const pip = buildPip(bag);
  pip.group.position.set(0, 1.12, -0.86);
  pip.group.rotation.y = -2.55; // looks back toward the camera, a little to the right (the station side)
  pip.group.scale.setScalar(1.22);
  g.add(pip.group);
  const engine = { group: g, wheels, funnelTop, pip };
  if (upgrades > 0) upgradeEngine(bag, engine, upgrades, letters);
  return engine;
}

function buildCar(bag, glyph, accent) {
  const g = new THREE.Group();
  g.name = 'wagon';
  const wheels = [];
  const add = (m, x, y, z) => { m.position.set(x, y, z); g.add(m); return m; };
  add(block(bag, 0.95, 0.2, 1.75, PAL.navy), 0, 0.46, 0);
  add(block(bag, 1.26, 0.66, 1.8, accent, { r: 0.12 }), 0, 0.9, 0);
  for (const [w, d, x, z] of [[1.3, 0.1, 0, 0.86], [1.3, 0.1, 0, -0.86], [0.1, 1.8, 0.61, 0], [0.1, 1.8, -0.61, 0]]) add(block(bag, w, 0.08, d, PAL.sun, { r: 0.03 }), x, 1.25, z);
  const tex = glyphTexture(bag, glyph, accent);
  // its cargo: a cream toy block with the letter on top, readable from the camera above and behind
  add(block(bag, 0.86, 0.5, 0.86, '#FFF3DD', { r: 0.1 }), 0, 1.36, 0.1);
  const top = add(new THREE.Mesh(bag.geo('cargotop', () => new THREE.PlaneGeometry(0.74, 0.74)), bag.add(new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, transparent: true }))), 0, 1.625, 0.1);
  top.rotation.set(-Math.PI / 2, 0, Math.PI);
  const panelMat = bag.add(new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, transparent: true }));
  for (const side of [-1, 1]) {
    const p = add(new THREE.Mesh(bag.geo('panel', () => new THREE.PlaneGeometry(0.66, 0.66)), panelMat), side * 0.64, 0.9, 0);
    p.rotation.y = side * Math.PI / 2;
  }
  for (const z of [0.55, -0.55]) for (const x of [-0.6, 0.6]) { const w = wheel(bag, CAR_WHEEL_R, PAL.navy); w.position.set(x, CAR_WHEEL_R + 0.06, z); g.add(w); wheels.push(w); }
  add(new THREE.Mesh(bag.geo('coupler', () => new THREE.CylinderGeometry(0.07, 0.07, 0.4, 8)), bag.paint(PAL.navy)), 0, 0.5, -1.0).rotation.x = Math.PI / 2;
  return { group: g, wheels };
}

// A level's special car: the same chassis, wheels and coupler as a letter wagon, with its own body (docs/PLAN-v1.9.md, Levels).
const SPECIAL_COLORS = { sky: '#7DB8F5', mint: '#5FE3B0', lilac: '#CDC4F8', pale: '#EDE8FF', cream: '#FFF6D6' };
function buildSpecial(bag, kind) {
  const g = new THREE.Group();
  g.name = 'special-' + kind;
  const wheels = [];
  const add = (m, x, y, z) => { m.position.set(x, y, z); g.add(m); return m; };
  add(block(bag, 0.95, 0.2, 1.75, PAL.navy), 0, 0.46, 0);
  if (kind === 'caboose') {
    add(block(bag, 1.26, 0.72, 1.8, PAL.red, { r: 0.12 }), 0, 0.95, 0);
    add(block(bag, 1.34, 0.08, 1.88, PAL.sun, { r: 0.03 }), 0, 1.34, 0);
    add(block(bag, 0.8, 0.46, 0.9, '#C93A40', { r: 0.1 }), 0, 1.62, -0.1);
    add(block(bag, 0.9, 0.07, 1.0, PAL.sun, { r: 0.03 }), 0, 1.88, -0.1);
    for (const side of [-1, 1]) {
      add(block(bag, 0.06, 0.26, 0.3, SPECIAL_COLORS.cream, { r: 0.02 }), side * 0.41, 1.62, -0.1);
      for (const z of [-0.45, 0.45]) add(block(bag, 0.06, 0.28, 0.3, SPECIAL_COLORS.cream, { r: 0.02 }), side * 0.64, 1.0, z);
    }
  } else if (kind === 'coach') {
    add(block(bag, 1.26, 0.8, 1.8, SPECIAL_COLORS.sky, { r: 0.14 }), 0, 1.0, 0);
    add(block(bag, 1.32, 0.08, 1.86, PAL.sun, { r: 0.03 }), 0, 1.44, 0);
    for (const side of [-1, 1]) for (const z of [-0.55, 0, 0.55]) add(block(bag, 0.06, 0.32, 0.36, SPECIAL_COLORS.cream, { r: 0.03 }), side * 0.64, 1.06, z);
  } else if (kind === 'flatbed') {
    add(block(bag, 1.26, 0.14, 1.8, PAL.navy, { r: 0.05 }), 0, 0.64, 0);
    add(block(bag, 1.3, 0.05, 1.84, PAL.sun, { r: 0.02 }), 0, 0.73, 0);
    add(block(bag, 0.95, 0.72, 1.0, PAL.wood, { r: 0.08 }), 0, 1.12, 0);
    add(block(bag, 1.0, 0.07, 1.05, PAL.woodLight, { r: 0.03 }), 0, 1.5, 0);
    for (const z of [-0.28, 0.28]) add(block(bag, 1.0, 0.76, 0.07, '#A87B4F', { r: 0.02 }), 0, 1.12, z);
  } else if (kind === 'tanker') {
    add(block(bag, 1.26, 0.14, 1.8, PAL.navy, { r: 0.05 }), 0, 0.64, 0);
    const tank = add(new THREE.Mesh(bag.geo('tank', () => new THREE.CylinderGeometry(0.58, 0.58, 1.7, 28)), bag.paint(SPECIAL_COLORS.mint, { roughness: 0.45 })), 0, 1.3, 0);
    tank.rotation.x = Math.PI / 2; tank.castShadow = true;
    for (const z of [-0.55, 0.55]) { const b = add(new THREE.Mesh(bag.geo('tankband', () => new THREE.CylinderGeometry(0.6, 0.6, 0.07, 28)), bag.paint(PAL.sun)), 0, 1.3, z); b.rotation.x = Math.PI / 2; }
    add(new THREE.Mesh(bag.geo('tankcap', () => new THREE.CylinderGeometry(0.14, 0.14, 0.14, 12)), bag.paint(PAL.sun)), 0, 1.92, 0);
  } else { // dome
    add(block(bag, 1.26, 0.7, 1.8, SPECIAL_COLORS.lilac, { r: 0.12 }), 0, 0.95, 0);
    add(block(bag, 1.32, 0.08, 1.86, PAL.sun, { r: 0.03 }), 0, 1.3, 0);
    const dome = add(new THREE.Mesh(bag.geo('cardome', () => new THREE.SphereGeometry(0.62, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2)), bag.paint(SPECIAL_COLORS.pale, { roughness: 0.3, transparent: true, opacity: 0.92 })), 0, 1.34, 0);
    dome.scale.set(1, 0.8, 1.45); dome.castShadow = true;
    for (const side of [-1, 1]) for (const z of [-0.5, 0.5]) add(block(bag, 0.06, 0.26, 0.34, SPECIAL_COLORS.cream, { r: 0.03 }), side * 0.64, 0.98, z);
  }
  for (const z of [0.55, -0.55]) for (const x of [-0.6, 0.6]) { const w = wheel(bag, CAR_WHEEL_R, PAL.navy); w.position.set(x, CAR_WHEEL_R + 0.06, z); g.add(w); wheels.push(w); }
  add(new THREE.Mesh(bag.geo('coupler', () => new THREE.CylinderGeometry(0.07, 0.07, 0.4, 8)), bag.paint(PAL.navy)), 0, 0.5, -1.0).rotation.x = Math.PI / 2;
  return { group: g, wheels, kind };
}

const JOIN_BACK = 2.6, JOIN_S = 0.9;

// cars: [{ glyph, accent }] in lesson order, the first right behind the engine. specials: kinds of special car, in train
// order, coupled behind the letter wagons (the caboose last).
// opts.upgrades: how many worlds the child has finished (the engine's upgrades, above); opts.letters: the first world's letters.
export function buildTrain(sceneBag, line, cars, specials = [], opts = {}) {
  // The train has its own materials (so a fade-in never touches the stations), still disposed with the scene's bag.
  const bag = Object.create(sceneBag);
  bag.paint = (c, o = {}) => sceneBag.paint(c, { ...o, name: 'train' });
  const group = new THREE.Group();
  const engine = buildEngine(bag, opts.upgrades || 0, opts.letters || []);
  group.add(engine.group);
  const wagons = cars.map((c) => { const w = buildCar(bag, c.glyph, c.accent); group.add(w.group); return w; });
  const extras = specials.map((k) => { const w = buildSpecial(bag, k); group.add(w.group); return w; });
  const everyCar = [...wagons, ...extras];
  const joins = new Map(); // kind -> start time (seconds): that car glides in from behind
  // steam: a few soft white puffs, reused
  const puffMat = [];
  const puffs = Array.from({ length: 28 }, () => {
    const m = bag.add(new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 0.45, roughness: 1, transparent: true, opacity: 0, depthWrite: false }));
    puffMat.push(m);
    const s = new THREE.Mesh(bag.geo('puff', () => new THREE.SphereGeometry(0.3, 14, 10)), m);
    s.visible = false;
    group.add(s);
    return { mesh: s, mat: m, born: -1 };
  });
  const p = {}, tmp = new THREE.Vector3();
  let at = 0, rolled = 0, bounce = null, lastT = 0, released = null;
  const STEP = 2 * CAR_HALF + GAP;
  const offsets = () => everyCar.map((_, i) => ENGINE_BACK + GAP + CAR_HALF + i * STEP);
  const DETACH_S = 1.2; // the special cars close up behind the engine over this long once the letter wagons are left behind

  function put(obj, s, lift = 0) {
    line.at(s, p);
    obj.position.set(p.x, lift, p.z);
    obj.rotation.y = p.heading;
  }
  return {
    group, engine, pip: engine.pip,
    get at() { return at; },
    upgrades: opts.upgrades || 0,
    wagonCount: wagons.length,
    // Uncouple the letter wagons (the crossing): they stay where they stand while the engine drives on, and the special cars
    // glide up behind it. place() keeps working as before for the engine and the special cars.
    detach(t) { if (!released) released = { t, s: at }; },
    get detached() { return !!released; },
    get length() { return ENGINE_FRONT + ENGINE_BACK + everyCar.length * (2 * CAR_HALF + GAP); },
    specials: extras.map((e) => e.kind),
    // The group of a special car (the celebration hides it until the car rolls up), and join(kind, t): it starts 2.6 units
    // further back and glides to its place over 0.9 s (ease-out); `joined` is true once every join has finished.
    specialGroup: (kind) => (extras.find((e) => e.kind === kind) || {}).group,
    join(kind, t) { joins.set(kind, t); },
    get joined() { return joins.size === 0 || [...joins.values()].every((t0) => lastT - t0 >= JOIN_S); },
    // The engine's middle at s; the wagons follow along the line behind it. t (seconds) drives the new wagon's bounce.
    place(s, t = 0) {
      at = s; lastT = t;
      put(engine.group, s);
      offsets().forEach((o, i) => {
        let lift = 0, back = 0;
        if (released && i < wagons.length) { put(everyCar[i].group, released.s - o, 0); return; }
        if (released) { const k = Math.min(1, Math.max(0, (t - released.t) / DETACH_S)); o -= wagons.length * STEP * (k * k * (3 - 2 * k)); }
        if (bounce && i === wagons.length - 1) { const k = (t - bounce) / 0.5; lift = k >= 0 && k < 1 ? Math.sin(k * Math.PI) * 0.18 : 0; }
        const car = everyCar[i];
        if (car.kind && joins.has(car.kind)) { const k = Math.min(1, Math.max(0, (t - joins.get(car.kind)) / JOIN_S)); back = JOIN_BACK * Math.pow(1 - k, 3); }
        put(car.group, s - o - back, lift);
      });
    },
    bounceLast(t) { bounce = t; },
    roll(d) {
      rolled += d;
      engine.wheels.forEach((w) => { w.rotation.x = rolled / WHEEL_R; });
      everyCar.forEach((c) => c.wheels.forEach((w) => { w.rotation.x = rolled / CAR_WHEEL_R; }));
    },
    // A puff of steam from the funnel (world position), and the puffs' rise and fade at time t. Returns whether any is alive.
    // big: the reward puff while the child rides to the next station: bigger, higher and lasting longer.
    puff(t, big = false) {
      const free = puffs.find((q) => q.born < 0) || puffs.reduce((a, b) => (a.born < b.born ? a : b));
      engine.funnelTop.getWorldPosition(tmp);
      free.mesh.position.copy(tmp); free.origin = tmp.clone(); free.born = t; free.big = big; free.mesh.visible = true;
    },
    steam(t) {
      let alive = false;
      for (const q of puffs) {
        if (q.born < 0) continue;
        const big = q.big, k = (t - q.born) / (big ? 2 : 1.4);
        if (k >= 1 || k < 0) { q.born = -1; q.mesh.visible = false; q.mat.opacity = 0; continue; }
        alive = true;
        q.mesh.position.set(q.origin.x, q.origin.y + k * (big ? 2.2 : 1.3), q.origin.z + k * (big ? 0.2 : 0.4));
        q.mesh.scale.setScalar(big ? 0.8 + k * 2.1 : 0.5 + k * 1.3);
        q.mat.opacity = (big ? 0.95 : 0.85) * (1 - k) * Math.min(1, k * 6);
      }
      return alive;
    },
    setOpacity(o) {
      group.traverse((m) => { if (m.isMesh && !puffMat.includes(m.material)) { m.material.transparent = o < 1; m.material.opacity = o; } });
    },
  };
}

// The letter wagons parked on a siding (a finished world's Home): cars [{ glyph, accent }] stand on the line's far side, offset
// `off` from the centre line, the first with its middle at s0 and the rest behind it. Static: returns a group.
export function buildParked(bag, line, cars, s0, off) {
  const group = new THREE.Group();
  group.name = 'parked-wagons';
  const p = {};
  cars.forEach((c, i) => {
    const w = buildCar(bag, c.glyph, c.accent);
    line.at(s0 - i * (2 * CAR_HALF + GAP), p);
    w.group.position.set(p.x + p.nx * off, 0, p.z + p.nz * off);
    w.group.rotation.y = p.heading;
    group.add(w.group);
  });
  return group;
}
