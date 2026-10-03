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

function buildEngine(bag) {
  const g = new THREE.Group();
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
  for (const x of [-0.32, 0.32]) { const win = add(new THREE.Mesh(bag.geo('cabwin', () => new THREE.CircleGeometry(0.13, 16)), bag.paint('#FFF6D6', { emissive: '#FFE3A0', emissiveIntensity: 0.3 })), x, 1.72, -0.415); win.rotation.y = Math.PI; }
  for (const [w, d, x, z] of [[1.44, 0.1, 0, -1.33], [0.1, 1.0, -0.7, -0.84], [0.1, 1.0, 0.7, -0.84]]) add(block(bag, w, 0.08, d, PAL.sun, { r: 0.03 }), x, 1.4, z);
  add(block(bag, 1.44, 0.08, 0.22, PAL.sun, { r: 0.03 }), 0, 2.0, -0.33);
  for (const z of [0.85, 0.1, -0.7]) for (const x of [-0.7, 0.7]) { const w = wheel(bag, WHEEL_R, PAL.red); w.position.set(x, WHEEL_R + 0.05, z); g.add(w); wheels.push(w); }
  add(new THREE.Mesh(bag.geo('coupler', () => new THREE.CylinderGeometry(0.07, 0.07, 0.4, 8)), bag.paint(PAL.navy)), 0, 0.55, -1.45).rotation.x = Math.PI / 2;
  const funnelTop = new THREE.Object3D();
  funnelTop.position.set(0, 2.35, 0.95);
  g.add(funnelTop);
  const pip = buildPip(bag);
  pip.group.position.set(0, 0.78, -0.86);
  pip.group.rotation.y = -2.55; // looks back toward the camera, a little to the right (the station side)
  pip.group.scale.setScalar(1.22);
  g.add(pip.group);
  return { group: g, wheels, funnelTop, pip };
}

function buildCar(bag, glyph, accent) {
  const g = new THREE.Group();
  const wheels = [];
  const add = (m, x, y, z) => { m.position.set(x, y, z); g.add(m); return m; };
  add(block(bag, 0.95, 0.2, 1.75, PAL.navy), 0, 0.46, 0);
  add(block(bag, 1.26, 0.66, 1.8, accent, { r: 0.12 }), 0, 0.9, 0);
  for (const [w, d, x, z] of [[1.3, 0.1, 0, 0.86], [1.3, 0.1, 0, -0.86], [0.1, 1.8, 0.61, 0], [0.1, 1.8, -0.61, 0]]) add(block(bag, w, 0.08, d, PAL.sun, { r: 0.03 }), x, 1.25, z);
  add(block(bag, 1.05, 0.06, 1.6, '#7A5C45', { r: 0.02, shadow: false }), 0, 1.2, 0);
  const tex = glyphTexture(bag, glyph, accent);
  // its cargo: a cream toy block with the letter on top, readable from the camera above and behind
  add(block(bag, 0.86, 0.5, 0.86, '#FFF3DD', { r: 0.1 }), 0, 1.36, 0.1);
  const top = add(new THREE.Mesh(bag.geo('cargotop', () => new THREE.PlaneGeometry(0.74, 0.74)), bag.add(new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, transparent: true }))), 0, 1.615, 0.1);
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

// cars: [{ glyph, accent }] in lesson order, the first right behind the engine.
export function buildTrain(sceneBag, line, cars) {
  // The train has its own materials (so a fade-in never touches the stations), still disposed with the scene's bag.
  const bag = Object.create(sceneBag);
  bag.paint = (c, o = {}) => sceneBag.paint(c, { ...o, name: 'train' });
  const group = new THREE.Group();
  const engine = buildEngine(bag);
  group.add(engine.group);
  const wagons = cars.map((c) => { const w = buildCar(bag, c.glyph, c.accent); group.add(w.group); return w; });
  // steam: a few soft white puffs, reused
  const puffMat = [];
  const puffs = Array.from({ length: 8 }, () => {
    const m = bag.add(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, transparent: true, opacity: 0, depthWrite: false }));
    puffMat.push(m);
    const s = new THREE.Mesh(bag.geo('puff', () => new THREE.SphereGeometry(0.3, 14, 10)), m);
    s.visible = false;
    group.add(s);
    return { mesh: s, mat: m, born: -1 };
  });
  const p = {}, tmp = new THREE.Vector3();
  let at = 0, rolled = 0, bounce = null;
  const offsets = () => wagons.map((_, i) => ENGINE_BACK + GAP + CAR_HALF + i * (2 * CAR_HALF + GAP));

  function put(obj, s, lift = 0) {
    line.at(s, p);
    obj.position.set(p.x, lift, p.z);
    obj.rotation.y = p.heading;
  }
  return {
    group, engine, pip: engine.pip,
    get at() { return at; },
    length: ENGINE_FRONT + ENGINE_BACK + wagons.length * (2 * CAR_HALF + GAP),
    // The engine's middle at s; the wagons follow along the line behind it. t (seconds) drives the new wagon's bounce.
    place(s, t = 0) {
      at = s;
      put(engine.group, s);
      offsets().forEach((o, i) => {
        let lift = 0;
        if (bounce && i === wagons.length - 1) { const k = (t - bounce) / 0.5; lift = k >= 0 && k < 1 ? Math.sin(k * Math.PI) * 0.18 : 0; }
        put(wagons[i].group, s - o, lift);
      });
    },
    bounceLast(t) { bounce = t; },
    roll(d) {
      rolled += d;
      engine.wheels.forEach((w) => { w.rotation.x = rolled / WHEEL_R; });
      wagons.forEach((c) => c.wheels.forEach((w) => { w.rotation.x = rolled / CAR_WHEEL_R; }));
    },
    // A puff of steam from the funnel (world position), and the puffs' rise and fade at time t. Returns whether any is alive.
    puff(t) {
      const free = puffs.find((q) => q.born < 0) || puffs.reduce((a, b) => (a.born < b.born ? a : b));
      engine.funnelTop.getWorldPosition(tmp);
      free.mesh.position.copy(tmp); free.origin = tmp.clone(); free.born = t; free.mesh.visible = true;
    },
    steam(t) {
      let alive = false;
      for (const q of puffs) {
        if (q.born < 0) continue;
        const k = (t - q.born) / 1.4;
        if (k >= 1 || k < 0) { q.born = -1; q.mesh.visible = false; q.mat.opacity = 0; continue; }
        alive = true;
        q.mesh.position.set(q.origin.x, q.origin.y + k * 1.3, q.origin.z + k * 0.4);
        q.mesh.scale.setScalar(0.5 + k * 1.3);
        q.mat.opacity = 0.85 * (1 - k) * Math.min(1, k * 6);
      }
      return alive;
    },
    setOpacity(o) {
      group.traverse((m) => { if (m.isMesh && !puffMat.includes(m.material)) { m.material.transparent = o < 1; m.material.opacity = o; } });
    },
  };
}
