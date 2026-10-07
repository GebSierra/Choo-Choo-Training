// The props of the themed worlds (js/train/themes.js): W3 Sunny Hills (golden farmland) and W4 Digraph Docks (a seaside
// harbour). Soft low-poly, flat shaded, warm and uncluttered, in the same faceted style as the portal mountain.
// Draw calls stay low: every still piece is baked (positions, normals and a colour per vertex) into two meshes, one flat shaded
// and one smooth, and everything that repeats a lot is one InstancedMesh per part (sunflower stems, heads and centres, grass
// tufts, wave crests, gulls). Nothing here moves and no light is added. Built through the scene's bag, disposed with Home.
import { THREE, PAL, rng } from './world.js';

const TAU = Math.PI * 2;

// ---------------------------------------------------------------- baking
// Collects pieces (a geometry, where it stands and a colour) into at most two meshes.
class Bake {
  constructor(bag) {
    this.bag = bag;
    this.sets = { flat: { pos: [], nor: [], col: [] }, smooth: { pos: [], nor: [], col: [] } };
    this.o = new THREE.Object3D();
    this.c = new THREE.Color();
    this.a = new THREE.Vector3(); this.b = new THREE.Vector3(); this.d = new THREE.Vector3();
  }
  // o: { p: [x,y,z], r: [rx,ry,rz], s: [sx,sy,sz], color, smooth, colorFn(centroid, triangleIndex) -> colour }
  add(geo, { p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1], color = '#ffffff', smooth = false, colorFn = null } = {}) {
    const o = this.o;
    o.position.set(p[0], p[1], p[2]); o.rotation.set(r[0], r[1], r[2], 'YXZ'); o.scale.set(s[0], s[1], s[2]); o.updateMatrix();
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    g.applyMatrix4(o.matrix);
    if (!smooth || !g.getAttribute('normal')) g.computeVertexNormals();
    const set = this.sets[smooth ? 'smooth' : 'flat'], pa = g.getAttribute('position'), na = g.getAttribute('normal');
    const base = new THREE.Color(color);
    for (let t = 0; t < pa.count; t += 3) {
      let col = base;
      if (colorFn) {
        this.a.set(0, 0, 0);
        for (let k = 0; k < 3; k++) this.a.add(this.b.set(pa.getX(t + k), pa.getY(t + k), pa.getZ(t + k)));
        this.a.multiplyScalar(1 / 3);
        col = this.c.set(colorFn(this.a, t / 3) || color);
      }
      for (let k = 0; k < 3; k++) {
        set.pos.push(pa.getX(t + k), pa.getY(t + k), pa.getZ(t + k));
        set.nor.push(na.getX(t + k), na.getY(t + k), na.getZ(t + k));
        set.col.push(col.r, col.g, col.b);
      }
    }
    g.dispose();
  }
  // The merged meshes (castShadow / receiveShadow on), added to `group`.
  finish(group, { shadow = true } = {}) {
    const out = [];
    for (const key of ['flat', 'smooth']) {
      const set = this.sets[key];
      if (!set.pos.length) continue;
      const g = this.bag.add(new THREE.BufferGeometry());
      g.setAttribute('position', new THREE.Float32BufferAttribute(set.pos, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(set.nor, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(set.col, 3));
      const mesh = new THREE.Mesh(g, this.bag.paint('#ffffff', { roughness: 0.88, vertexColors: true, flatShading: key === 'flat', side: THREE.DoubleSide }));
      mesh.castShadow = shadow; mesh.receiveShadow = true;
      group.add(mesh); out.push(mesh);
    }
    return out;
  }
}

// A faceted blob: an icosahedron with its corners nudged by a seeded random (shared corners move together), so it looks hand-made.
function blobGeo(bag, key, seed, { detail = 1, jit = 0.18 } = {}) {
  return bag.geo(key, () => {
    const R = rng(seed), cache = new Map();
    const g = new THREE.IcosahedronGeometry(1, detail), pa = g.getAttribute('position');
    for (let i = 0; i < pa.count; i++) {
      const x = pa.getX(i), y = pa.getY(i), z = pa.getZ(i), k = `${x.toFixed(3)},${y.toFixed(3)},${z.toFixed(3)}`;
      let j = cache.get(k); if (!j) { j = [R() - 0.5, R() - 0.5, R() - 0.5]; cache.set(k, j); }
      pa.setXYZ(i, x + j[0] * jit, y + j[1] * jit, z + j[2] * jit);
    }
    return g;
  });
}

const lerpHex = (a, b, t) => new THREE.Color(a).lerp(new THREE.Color(b), Math.max(0, Math.min(1, t)));

// ---------------------------------------------------------------- helpers shared by both worlds
// stops: the stations' distances, then the portal's and the start tunnel's (stationCount tells them apart): nearStop is about a
// station, nearExtra about a portal or tunnel.
function helpers(line, stops, stationCount) {
  const p = {};
  // A frame on the ground beside the line: the point `off` to the right of distance s, with its axes.
  const frame = (s, off) => {
    line.at(s, p);
    return { x: p.x + p.nx * off, z: p.z + p.nz * off, dx: p.dx, dz: p.dz, nx: p.nx, nz: p.nz, heading: p.heading };
  };
  // u metres along the line and v metres across it, from a frame.
  const at = (f, u, v) => [f.x + f.dx * u + f.nx * v, f.z + f.dz * u + f.nz * v];
  const nearStop = (s, d) => stops.slice(0, stationCount).some((t) => Math.abs(s - t) < d);
  const nearExtra = (s, d) => stops.slice(stationCount).some((t) => Math.abs(s - t) < d);
  return { frame, at, nearStop, nearExtra };
}

const box = (bag, w, h, d) => bag.geo(`rb${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d));
const cyl = (bag, rt, rb, h, seg = 10) => bag.geo(`rc${rt},${rb},${h},${seg}`, () => new THREE.CylinderGeometry(rt, rb, h, seg));
const cone = (bag, r, h, seg = 10) => bag.geo(`rn${r},${h},${seg}`, () => new THREE.ConeGeometry(r, h, seg));
const ball = (bag, w = 12, hh = 8) => bag.geo(`rs${w},${hh}`, () => new THREE.SphereGeometry(1, w, hh));

// A prism roof: a triangle in x/y extruded along z (centred), width w, rise h, length l.
const prism = (bag, w, h, l) => bag.geo(`rp${w},${h},${l}`, () => {
  const s = new THREE.Shape([new THREE.Vector2(-w / 2, 0), new THREE.Vector2(w / 2, 0), new THREE.Vector2(0, h)]);
  const g = new THREE.ExtrudeGeometry(s, { depth: l, bevelEnabled: false });
  g.translate(0, 0, -l / 2);
  return g;
});

// A faceted hill (flat bottom sunk into the ground), coloured from `low` at its foot to `high` on its top, by a seeded random.
function addHill(bake, bag, { x, z, rx, ry, rz, yaw, seed, low, high, kind = 0 }) {
  const geo = blobGeo(bag, `hillblob${kind}`, 300 + kind * 17, { detail: 1, jit: 0.22 });
  bake.add(geo, {
    p: [x, -ry * 0.28, z], r: [0, yaw, 0], s: [rx, ry, rz],
    colorFn: (c) => lerpHex(low, high, Math.pow(Math.max(0, (c.y + ry * 0.28) / (ry * 1.2)), 0.8)).multiplyScalar(0.95 + ((Math.sin(c.x * 12.9 + c.z * 78.2 + seed) * 43758.5) % 1 + 1) % 1 * 0.1),
  });
}

// ---------------------------------------------------------------- W3 Sunny Hills
// Far side (the left): a wooden fence along the track, then sunflower fields, hay and orchards in turn, with rolling hills behind.
// Stations' side (the right, beyond the platforms and their signs): a red barn, an orchard, a field, hay. Nothing stands within
// reach of a station sign or the portal.
function sunnyHills({ bag, line, stops, stationCount, group, sky, R }) {
  const { frame, at, nearExtra } = helpers(line, stops, stationCount);
  const bake = new Bake(bag);
  const L0 = line.start + 6, L1 = line.end - 8, span = L1 - L0;
  const wood = '#C99A5B', woodDark = '#A87B4F';
  const real = stops.length; void real;

  // rolling hills, far and near, in a few golden greens
  const lows = ['#6DBE48', '#5FB646', '#7BC44A', '#68BC47'], highs = ['#BCD95A', '#AED45A', '#CADB62', '#B6D65C'];
  let hills = 0;
  for (let i = 0; i < 34 && hills < 22; i++) {
    const far = i % 2 === 0, s = L0 - 4 + (i / 34) * (span + 8) + R() * 3, off = (far ? -1 : 1) * (far ? 10 + R() * 9 : 11 + R() * 10);
    if (nearExtra(s, 7) && Math.abs(off) < 18) continue;
    const f = frame(s, off), ry = 1.5 + R() * 1.9;
    addHill(bake, bag, { x: f.x, z: f.z, rx: 4.4 + R() * 3.6, ry, rz: 3.6 + R() * 3, yaw: R() * 3, seed: i, low: lows[i % 4], high: highs[(i >> 1) % 4], kind: i % 3 });
    hills++;
  }

  // a big red barn with a white-trim X door, a loft window, a trimmed gambrel-style roof and a tall silo beside it, on the stations'
  // side between two stations, its gable and door toward the track
  {
    const f = frame((stops[1] + stops[2]) / 2 + 0.2, 5.3), hd = f.heading, c = Math.cos(hd), sn = Math.sin(hd);
    const lp = (lx, ly, lz) => [f.x + lx * c + lz * sn, ly, f.z - lx * sn + lz * c]; // local +x points at the track, +z along the line
    const RED = '#D9483B', TRIM = '#FFF8EC', ROOF = '#7E3B35', D = 3.0, W = 2.7, H = 2.0, k = 1.3;
    const R0 = [0, hd, 0];
    bake.add(box(bag, D, H, W), { p: lp(0, H / 2, 0), r: R0, color: RED });
    for (let i = -3; i <= 3; i++) bake.add(box(bag, D + 0.02, H, 0.05), { p: lp(0, H / 2, i * 0.42), r: R0, color: '#C73D31' }); // board lines
    bake.add(box(bag, D + 0.05, 0.16, W + 0.05), { p: lp(0, 0.08, 0), r: R0, color: '#8F2F28' }); // foot
    bake.add(prism(bag, W + 0.6, 1.5, D + 0.6), { p: lp(0, H, 0), r: [0, hd + Math.PI / 2, 0], color: ROOF });
    for (const s of [-1, 1]) bake.add(box(bag, D + 0.7, 0.1, 0.12), { p: lp(0, H + 0.04, s * (W / 2 + 0.3)), r: R0, color: TRIM }); // eave trim
    // the gable's white trim lines up the roof edges
    for (const s of [-1, 1]) bake.add(box(bag, 0.1, 0.1, 1.9), { p: lp(D / 2 + 0.3, H + 0.74, s * (W / 4 + 0.08)), r: [0, hd, s * 0.0], color: TRIM });
    // the door, white frame, X braces
    bake.add(box(bag, 0.07, 1.6 * k / 1.3 + 0.2, 1.7), { p: lp(D / 2 + 0.03, 0.9, 0), r: R0, color: TRIM });
    bake.add(box(bag, 0.09, 1.5, 1.45), { p: lp(D / 2 + 0.05, 0.82, 0), r: R0, color: '#B8392F' });
    for (const a of [0.78, -0.78]) bake.add(box(bag, 0.11, 0.11, 2.0), { p: lp(D / 2 + 0.1, 0.82, 0), r: [a, hd, 0], color: TRIM });
    bake.add(box(bag, 0.07, 0.62, 0.62), { p: lp(D / 2 + 0.03, H + 0.55, 0), r: R0, color: TRIM });
    bake.add(box(bag, 0.09, 0.42, 0.42), { p: lp(D / 2 + 0.05, H + 0.55, 0), r: R0, color: '#5C3028' });
    for (const lx of [-D / 2, D / 2]) for (const lz of [-W / 2, W / 2]) bake.add(box(bag, 0.15, H, 0.15), { p: lp(lx, H / 2, lz), r: R0, color: TRIM });
    // the silo: a pale blue-grey drum with bands and a rounded cap, beside the barn
    const sx = -0.4, sz = W / 2 + 1.0;
    bake.add(cyl(bag, 0.62, 0.66, 3.4, 14), { p: lp(sx, 1.7, sz), color: '#C9D3DC', smooth: true });
    for (const y of [0.7, 1.7, 2.7]) bake.add(cyl(bag, 0.665, 0.665, 0.07, 14), { p: lp(sx, y, sz), color: '#8E9BA8', smooth: true });
    bake.add(ball(bag, 14, 6), { p: lp(sx, 3.4, sz), s: [0.64, 0.5, 0.64], color: '#D9483B', smooth: true });
  }

  // round haystacks: a drum with a rounded top and a band
  const hay = (f0, u, v, r, ht) => {
    const [x, z] = at(f0, u, v);
    bake.add(cyl(bag, r, r * 1.03, ht, 14), { p: [x, ht / 2, z], color: '#E7BC4E', smooth: true });
    bake.add(ball(bag, 14, 6), { p: [x, ht, z], s: [r, r * 0.62, r], color: '#EFC65A', smooth: true });
    bake.add(cyl(bag, r * 1.05, r * 1.05, 0.1, 14), { p: [x, ht * 0.45, z], color: '#C9953A', smooth: true });
  };
  const hayGroup = (s, off) => { const f = frame(s, off); hay(f, 0, 0, 0.66, 0.8); hay(f, 1.45, 0.55, 0.52, 0.64); hay(f, -0.4, 1.5, 0.46, 0.56); };

  // round trees with red apples
  const appleP = [];
  const tree = (x, z, sc, ci) => {
    bake.add(cyl(bag, 0.1 * sc, 0.15 * sc, 0.8 * sc, 7), { p: [x, 0.4 * sc, z], color: '#9A6B4A' });
    bake.add(ball(bag, 14, 10), { p: [x, 1.35 * sc, z], s: [0.95 * sc, 0.88 * sc, 0.95 * sc], color: ['#74C04C', '#86C954', '#69B947'][ci % 3], smooth: true });
    for (let k = 0; k < 5; k++) {
      const a = R() * TAU, e = 0.3 + R() * 0.9;
      appleP.push([x + Math.cos(a) * 0.95 * sc * Math.cos(e) * 0.98, 1.35 * sc + Math.sin(e) * 0.88 * sc * 0.98 - 0.05, z + Math.sin(a) * 0.95 * sc * Math.cos(e) * 0.98]);
    }
  };
  const grove = (s, off, n) => {
    const f = frame(s, off), dir = off < 0 ? -1 : 1;
    for (let k = 0; k < n; k++) { const [x, z] = at(f, (k % 3) * 2.1 - 2.1 + (R() - 0.5) * 0.5, dir * ((k >> 1) * 2.0 + (k % 2) * 0.5)); tree(x, z, 0.95 + R() * 0.3, k); }
  };

  // sunflower fields (soil, stems, petals, centres)
  const flowers = [];
  const field = (sMid, offMid, len, wid) => {
    const f = frame(sMid, offMid);
    bake.add(box(bag, wid + 0.7, 0.05, len + 0.7), { p: [f.x, 0.025, f.z], r: [0, f.heading, 0], color: '#CBA45C' });
    const cols = Math.max(2, Math.floor(wid / 0.95)), rows = Math.floor(len / 0.85);
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      const [x, z] = at(f, (j - (rows - 1) / 2) * 0.85 + (R() - 0.5) * 0.25, (i - (cols - 1) / 2) * 0.95 + (R() - 0.5) * 0.25);
      flowers.push([x, z, 0.85 + R() * 0.45, R() * TAU]);
    }
  };

  // the far side, block by block along the line
  const kinds = ['field', 'orchard', 'field', 'hay', 'field', 'orchard', 'field'];
  for (let i = 0, s = L0 + 3; s < L1 - 3; i++, s += 9.5) {
    if (nearExtra(s, 7)) continue;
    const k = kinds[i % kinds.length];
    if (k === 'field') field(s, -3.7, 7.6, 3.2);
    else if (k === 'orchard') grove(s - 1, -4.6, 5);
    else { hayGroup(s, -3.7); field(s + 4.2, -5.0, 4.0, 2.6); }
  }
  // the stations' side, beyond the signs
  grove(stops[3] + 3.4, 7.0, 4);
  field(stops[5] + 4.5, 7.4, 7.4, 3.6);
  hayGroup(stops[Math.min(6, stops.length - 1)] + 4.5, 6.2);
  hayGroup(stops[0] + 4.5, 5.9);
  tree(...at(frame(stops[2] + 4.5, 5.6), 0, 0), 1.0, 1);
  tree(...at(frame(stops[4] + 4.5, 5.8), 0, 0), 0.9, 2);
  tree(...at(frame(stops[7] - 4.5, 5.8), 0, 0), 1.0, 0);

  if (appleP.length) {
    const m = new THREE.InstancedMesh(bag.geo('apple', () => new THREE.IcosahedronGeometry(0.1, 0)), bag.paint('#E5484D', { roughness: 0.5, flatShading: true }), appleP.length);
    const mm = new THREE.Matrix4();
    appleP.forEach((a, i) => m.setMatrixAt(i, mm.makeTranslation(a[0], a[1], a[2])));
    m.castShadow = false;
    group.add(m);
  }

  // a wooden fence along the far side, in long runs that follow the track's curve
  const post = box(bag, 0.12, 0.62, 0.12);
  for (const [sA, sB] of [[line.start + 8, stops[2] - 1], [stops[3] + 1, stops[5] - 1], [stops[6] + 1, stops[7] + 4]]) {
    let prev = null;
    for (let s = Math.max(line.start + 2, sA); s <= sB; s += 1.3) {
      const f = frame(s, -1.95);
      bake.add(post, { p: [f.x, 0.31, f.z], r: [0, f.heading, 0], color: woodDark });
      if (prev) {
        const dx = f.x - prev.x, dz = f.z - prev.z, len = Math.hypot(dx, dz), yaw = Math.atan2(dx, dz);
        for (const y of [0.24, 0.46]) bake.add(box(bag, 0.07, 0.08, len), { p: [(f.x + prev.x) / 2, y, (f.z + prev.z) / 2], r: [0, yaw, 0], color: wood });
      }
      prev = f;
    }
  }

  if (flowers.length) {
    const n = flowers.length, mm = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3();
    const stems = new THREE.InstancedMesh(bag.geo('sfstem', () => cyl(bag, 0.035, 0.05, 1, 5)), bag.paint('#5FAE4B', { roughness: 0.8 }), n);
    const leaves = new THREE.InstancedMesh(bag.geo('sfleaf', () => new THREE.IcosahedronGeometry(0.16, 0)), bag.paint('#4DA64A', { roughness: 0.8, flatShading: true }), n);
    const petals = new THREE.InstancedMesh(bag.geo('sfpetal', () => {
      const sh = new THREE.Shape();
      for (let i = 0; i < 20; i++) { const r = i % 2 ? 0.2 : 0.34, a = (i * TAU) / 20; if (i) sh.lineTo(Math.cos(a) * r, Math.sin(a) * r); else sh.moveTo(r, 0); }
      sh.closePath();
      const g = new THREE.ExtrudeGeometry(sh, { depth: 0.05, bevelEnabled: false });
      g.translate(0, 0, -0.025);
      return g;
    }), bag.paint('#FFC531', { roughness: 0.6, emissive: '#FFB400', emissiveIntensity: 0.18, flatShading: true }), n);
    const hearts = new THREE.InstancedMesh(bag.geo('sfheart', () => new THREE.CylinderGeometry(0.15, 0.15, 0.09, 10).rotateX(Math.PI / 2)), bag.paint('#7A4A24', { roughness: 0.9 }), n);
    const tilt = Math.atan2(0.5, 0.85); // the heads look up toward the camera
    flowers.forEach(([x, z, k, yaw], i) => {
      const h = 0.95 * k;
      stems.setMatrixAt(i, mm.compose(v.set(x, h / 2, z), q.identity(), sc.set(1, h, 1)));
      leaves.setMatrixAt(i, mm.compose(v.set(x + Math.cos(yaw) * 0.14, h * 0.42, z + Math.sin(yaw) * 0.14), q.setFromEuler(e.set(0.4, yaw, 0.5)), sc.set(1.3, 0.35, 0.7)));
      q.setFromEuler(e.set(-tilt * 0.9, 0, 0));
      petals.setMatrixAt(i, mm.compose(v.set(x, h + 0.03, z), q, sc.set(k, k, k)));
      hearts.setMatrixAt(i, mm.compose(v.set(x, h + 0.03 + 0.045 * 0.85 * k, z + 0.045 * 0.5 * k), q, sc.set(k, k, k)));
    });
    for (const mesh of [stems, leaves, petals, hearts]) { mesh.castShadow = mesh === petals || mesh === stems; mesh.receiveShadow = true; group.add(mesh); }
  }
  bake.finish(group);

  // a striped hot-air balloon floating over the hills (it hangs in the sky beside the camera's look point like the clouds do);
  // idle-motion candidate: a slow bob
  const bal = new Bake(bag);
  const stripe = ['#FFD166', '#FFFFFF', '#FF8A5B', '#FFFFFF'];
  const env = bag.geo('balloon', () => {
    const g = new THREE.SphereGeometry(1, 16, 10).toNonIndexed(), pa = g.getAttribute('position');
    for (let i = 0; i < pa.count; i++) { const y = pa.getY(i); if (y < 0) { const k = 1 - 0.58 * Math.pow(-y, 1.25); pa.setX(i, pa.getX(i) * k); pa.setZ(i, pa.getZ(i) * k); } }
    g.computeVertexNormals();
    return g;
  });
  bal.add(env, { p: [0, 1.6, 0], s: [1.35, 1.55, 1.35], smooth: true, colorFn: (c) => stripe[Math.floor(((Math.atan2(c.z, c.x) / TAU + 1) % 1) * 8) % 4] });
  bal.add(box(bag, 0.46, 0.34, 0.46), { p: [0, -0.45, 0], color: '#B9874C' });
  for (const [x, z] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) bal.add(cyl(bag, 0.012, 0.012, 0.95, 4), { p: [x * 0.85, 0.05 + 0.1, z * 0.85], r: [z * 0.5, 0, -x * 0.5], color: '#6B5A4A' });
  bal.add(cone(bag, 0.5, 0.18, 12), { p: [0, 0.18, 0], r: [Math.PI, 0, 0], color: '#FFD166' });
  const balGroup = new THREE.Group();
  bal.finish(balGroup, { shadow: false });
  balGroup.position.set(-3.4, 6.4, -3.5); balGroup.scale.setScalar(0.72); balGroup.rotation.y = 0.5;
  sky.add(balGroup);
  void PAL;
}

// ---------------------------------------------------------------- W4 Digraph Docks
const EDGE = 2.6; // how far the quay's edge stands from the track's centre, on the far side

function docks({ bag, line, stops, stationCount, group, sky, R, W }) {
  const { frame, at, nearStop, nearExtra } = helpers(line, stops, stationCount);
  const bake = new Bake(bag);
  const L0 = line.start + 4, L1 = line.end - 6, span = L1 - L0;
  const wood = '#C99A5B', woodDark = '#9A6B4A', woodLight = '#E3BC84';
  const S = line.samples;

  // the sea: a flat light-blue plane on the far side of the quay, with a white foam edge
  const edgePts = [];
  for (let k = 0; k < S.xs.length; k += 4) { const f = frame(S.len[k], -EDGE); edgePts.push([f.x, f.z]); }
  const first = edgePts[0], last = edgePts[edgePts.length - 1], zN = 30, zF = -line.end - 48, xFar = -W / 2 + 1.2;
  const shape = new THREE.Shape();
  shape.moveTo(xFar, -zN);
  shape.lineTo(first[0], -zN);
  shape.lineTo(first[0], -first[1]);
  for (const [x, z] of edgePts) shape.lineTo(x, -z);
  shape.lineTo(last[0], -zF); shape.lineTo(xFar, -zF); shape.closePath();
  const seaGeo = bag.add(new THREE.ShapeGeometry(shape));
  seaGeo.rotateX(-Math.PI / 2);
  const sea = new THREE.Mesh(seaGeo, bag.paint('#46C5FF', { roughness: 0.4, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  sea.position.y = 0.03; sea.receiveShadow = true;
  group.add(sea);
  // foam: a pale ribbon along the edge
  {
    const pos = [], idx = [];
    edgePts.forEach(([x, z], i) => {
      const k = Math.min(S.xs.length - 1, i * 4), f = frame(S.len[k], -EDGE);
      pos.push(f.x + f.nx * 0.12, 0.045, f.z + f.nz * 0.12, f.x - f.nx * 0.55, 0.045, f.z - f.nz * 0.55);
      void x; void z;
      if (i) { const a = (i - 1) * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    });
    const g = bag.add(new THREE.BufferGeometry());
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    const foam = new THREE.Mesh(g, bag.paint('#F6FCFF', { roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3, side: THREE.DoubleSide }));
    foam.receiveShadow = true;
    group.add(foam);
  }
  // white wave crests: tiny slivers lying on the water, parallel to the shore
  {
    const n = 170, m = new THREE.InstancedMesh(bag.geo('crest', () => box(bag, 0.5, 0.02, 0.1)), bag.paint('#FFFFFF', { roughness: 0.5, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }), n);
    const mm = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      const s = L0 + R() * span, f = frame(s, -(EDGE + 1.3 + R() * 22));
      q.setFromEuler(e.set(0, f.heading + Math.PI / 2 + (R() - 0.5) * 0.3, 0));
      m.setMatrixAt(i, mm.compose(v.set(f.x, 0.062, f.z), q, sc.set(0.7 + R() * 0.8, 1, 1)));
    }
    group.add(m);
  }

  // the quay's rim, a low wooden kerb along the edge
  for (let s = line.start + 1; s < line.end - 1; s += 1.0) {
    const f = frame(s, -EDGE + 0.12), f2 = frame(s + 1.0, -EDGE + 0.12), len = Math.hypot(f2.x - f.x, f2.z - f.z) + 0.04;
    bake.add(box(bag, 0.34, 0.26, len), { p: [(f.x + f2.x) / 2, 0.13, (f.z + f2.z) / 2], r: [0, Math.atan2(f2.x - f.x, f2.z - f.z), 0], color: s % 2 < 1 ? '#B98B55' : '#C99A5B' });
  }

  // piers: a plank deck out over the water on posts, with a bollard and a rope coil at its root
  const piers = [];
  const pierS = [stops[1] + 4.5, stops[3] + 4.5, stops[5] + 4.5, stops[Math.max(0, stops.length - 1)] - 4.5].filter((s, i, a) => s > line.start + 6 && s < line.end - 24 && a.indexOf(s) === i);
  for (const s of pierS.slice(0, 3)) {
    const f = frame(s, -EDGE), len = 6.4;
    piers.push({ s, f });
    const place = (u, v, y) => { const [x, z] = at(f, u, -v); return [x, y, z]; }; // v positive = out over the water
    for (let k = 0; k < 8; k++) bake.add(box(bag, 1.5, 0.11, 0.78), { p: place(0, 0.25 + k * 0.8, 0.43), r: [0, f.heading, 0], color: k % 2 ? woodLight : wood });
    for (let k = 0; k < 4; k++) for (const u of [-0.74, 0.74]) bake.add(cyl(bag, 0.085, 0.095, 0.95, 7), { p: place(u, 0.4 + k * 1.95, 0.35), color: woodDark });
    void len;
    bake.add(box(bag, 1.7, 0.1, 0.12), { p: place(0, len + 0.15, 0.4), r: [0, f.heading, 0], color: woodDark });
  }
  // bollards with rope coils and stacks of crates and barrels along the quay
  const bollard = (f, u, v) => {
    const [x, z] = at(f, u, v);
    bake.add(cyl(bag, 0.15, 0.2, 0.42, 9), { p: [x, 0.21, z], color: '#4A4F66', smooth: true });
    bake.add(cyl(bag, 0.24, 0.24, 0.07, 9), { p: [x, 0.45, z], color: '#5C6280', smooth: true });
    bake.add(bag.geo('coil', () => new THREE.TorusGeometry(0.3, 0.075, 6, 14).rotateX(Math.PI / 2)), { p: [x, 0.1, z], color: '#E2C58A', smooth: true });
    bake.add(bag.geo('coil2', () => new THREE.TorusGeometry(0.3, 0.075, 6, 14).rotateX(Math.PI / 2)), { p: [x, 0.2, z], color: '#D8B878', smooth: true });
  };
  const crate = (f, u, v, y, sz, rot, col) => { const [x, z] = at(f, u, v); bake.add(box(bag, sz, sz, sz), { p: [x, y + sz / 2, z], r: [0, f.heading + rot, 0], color: col }); bake.add(box(bag, sz * 1.02, sz * 0.12, sz * 1.02), { p: [x, y + sz * 0.5, z], r: [0, f.heading + rot, 0], color: '#8A5A35' }); };
  const barrel = (f, u, v, col) => {
    const [x, z] = at(f, u, v);
    bake.add(cyl(bag, 0.26, 0.26, 0.58, 10), { p: [x, 0.29, z], color: col, smooth: true });
    for (const y of [0.14, 0.44]) bake.add(cyl(bag, 0.275, 0.275, 0.06, 10), { p: [x, y, z], color: '#5A4A3A', smooth: true });
  };
  for (const { s, f } of piers) {
    bollard(f, -1.3, 0.2); bollard(f, 1.3, 0.2);
    const g2 = frame(s - 2.6, -(EDGE - 0.95));
    crate(g2, 0, 0, 0, 0.62, 0.1, '#C99A5B'); crate(g2, 0.7, 0.05, 0, 0.55, -0.2, '#D4A769'); crate(g2, 0.3, 0.02, 0.62, 0.5, 0.35, '#B98B55');
    barrel(g2, -0.75, 0.15, '#B77A4A'); barrel(g2, -0.4, 0.65, '#C28A55');
  }
  // a rope-coil bollard or two between the piers too
  for (const sIdx of [0.5, 2.5, 4.5, 6.5]) { const s = stops[Math.min(stops.length - 1, Math.floor(sIdx))] + (sIdx % 1 ? 9 * 0.5 : 0); if (!nearStop(s, 1.5)) bollard(frame(s, -(EDGE - 0.5)), 0, 0); }

  // the boats: a sailboat with a triangular sail, a fishing boat, and a small rowing boat, each beside a pier, sitting still
  const hullGeo = (key, pts, depth) => bag.geo(key, () => {
    const g = new THREE.ExtrudeGeometry(new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y))), { depth, bevelEnabled: false });
    g.translate(0, 0, -depth / 2);
    return g;
  });
  const boat = (f, u, v, yaw, kind) => {
    const [x, z] = at(f, u, -v), Y = 0.0;
    const r = [0, f.heading + yaw, 0];
    // the hull's long axis is local x; the extrusion's width is z
    const place = (lx, ly, lz) => { const c = Math.cos(f.heading + yaw), sn = Math.sin(f.heading + yaw); return [x + lx * c + lz * sn, Y + ly, z - lx * sn + lz * c]; };
    if (kind === 'sail') {
      bake.add(hullGeo('hullA', [[-1.25, 0.62], [1.1, 0.62], [1.75, 0.58], [1.0, 0.0], [-0.95, 0.0]], 0.95), { p: place(0, 0, 0), r, color: '#F7F1E4' });
      bake.add(hullGeo('hullA2', [[-1.2, 0.38], [1.45, 0.38], [1.4, 0.52], [-1.22, 0.52]], 0.97), { p: place(0, 0, 0), r, color: '#3F7CC4' });
      bake.add(cyl(bag, 0.05, 0.06, 4.0, 6), { p: place(0.1, 2.6, 0), r: [0, 0, 0], color: '#8A5A35' });
      bake.add(bag.geo('sail', () => { const g = new THREE.ExtrudeGeometry(new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(2.0, 0), new THREE.Vector2(0, 3.6)]), { depth: 0.04, bevelEnabled: false }); g.translate(0, 0, -0.02); return g; }), { p: place(0.22, 0.75, 0), r, color: '#FFFFFF' });
      bake.add(bag.geo('jib', () => { const g = new THREE.ExtrudeGeometry(new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(-1.25, 0), new THREE.Vector2(0, 2.5)]), { depth: 0.04, bevelEnabled: false }); g.translate(0, 0, -0.02); return g; }), { p: place(-0.05, 0.8, 0), r, color: '#FFD9D6' });
      bake.add(bag.geo('flag', () => new THREE.ExtrudeGeometry(new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(0.5, 0.12), new THREE.Vector2(0, 0.28)]), { depth: 0.03, bevelEnabled: false })), { p: place(0.1, 4.55, 0), r, color: '#E5484D' });
    } else if (kind === 'fish') {
      bake.add(hullGeo('hullB', [[-1.5, 0.7], [1.3, 0.7], [2.0, 0.66], [1.2, 0.0], [-1.25, 0.0]], 1.1), { p: place(0, 0, 0), r, color: '#E5484D' });
      bake.add(hullGeo('hullB2', [[-1.46, 0.5], [1.7, 0.5], [1.75, 0.66], [-1.48, 0.7]], 1.12), { p: place(0, 0, 0), r, color: '#FFFFFF' });
      bake.add(box(bag, 1.0, 0.75, 0.8), { p: place(-0.55, 1.05, 0), r, color: '#FFF8EC' });
      bake.add(box(bag, 1.15, 0.12, 0.95), { p: place(-0.55, 1.47, 0), r, color: '#3F7CC4' });
      bake.add(box(bag, 0.34, 0.3, 0.02), { p: place(-0.55, 1.08, 0.42), r, color: '#8FD0F0' });
      bake.add(box(bag, 0.34, 0.3, 0.02), { p: place(-0.55, 1.08, -0.42), r, color: '#8FD0F0' });
      bake.add(cyl(bag, 0.04, 0.04, 1.7, 6), { p: place(0.75, 1.3, 0), color: '#8A5A35' });
      bake.add(cyl(bag, 0.04, 0.04, 1.3, 6), { p: place(0.4, 1.7, 0), r: [0, 0, 1.1], color: '#8A5A35' });
      for (const [lx, lz] of [[-1.3, 0.62], [-1.3, -0.62], [0.95, 0.6]]) bake.add(ball(bag, 8, 6), { p: place(lx, 0.82, lz), s: [0.14, 0.14, 0.14], color: '#FF9F1C', smooth: true });
    } else {
      bake.add(hullGeo('hullC', [[-0.9, 0.42], [0.8, 0.42], [1.2, 0.4], [0.7, 0.0], [-0.7, 0.0]], 0.7), { p: place(0, 0, 0), r, color: '#FFD166' });
      bake.add(box(bag, 0.12, 0.05, 0.66), { p: place(0.0, 0.45, 0), r, color: '#8A5A35' });
      bake.add(box(bag, 0.9, 0.04, 0.12), { p: place(0.2, 0.62, 0.4), r: [0, f.heading + yaw, -0.15], color: '#B98B55' });
    }
  };
  const bp = (i) => (piers[i] ? piers[i] : piers[0]);
  if (piers.length) {
    boat(bp(0).f, 3.2, 1.5, Math.PI / 2 - 0.95, 'sail');
    boat(bp(1).f, -3.2, 1.6, -Math.PI / 2 + 0.3, 'fish');
    boat(bp(2).f, 3.0, 1.3, Math.PI / 2, 'row');
    boat(bp(0).f, -3.0, 4.4, 1.2, 'row');
  }

  // a striped red-and-white lighthouse on a rocky point, out in the bay
  {
    const sL = Math.min(stops[2] + 6, L1 - 20), f = frame(sL, -(EDGE + 3.0));
    const place = (lx, lz) => at(f, lx, -lz);
    const [x, z] = place(0, 0);
    // the rocky point: a few faceted grey-blue boulders
    const rock = blobGeo(bag, 'rockblob', 733, { detail: 1, jit: 0.3 });
    for (const [dx, dz, sx, sy, sz, col] of [[0, 0, 2.3, 1.5, 2.1, '#8FA2B8'], [1.6, 1.4, 1.3, 0.9, 1.2, '#A6B6C8'], [-1.8, 0.9, 1.2, 0.8, 1.1, '#9DAEC1'], [0.4, 1.9, 1.1, 0.7, 1.0, '#8FA2B8']]) {
      const [rx, rz] = place(dx, dz);
      bake.add(rock, { p: [rx, sy * 0.18, rz], r: [0, dx * 2, 0], s: [sx, sy, sz], colorFn: (c) => lerpHex(col, '#C5D2DF', Math.max(0, (c.y - 0.1) / (sy * 1.1))) });
    }
    bake.add(blobGeo(bag, 'rockcap', 911, { detail: 1, jit: 0.2 }), { p: [x, 1.2, z], s: [1.9, 0.5, 1.7], color: '#86C86A' });
    const stripes = ['#FFFFFF', '#E5484D', '#FFFFFF', '#E5484D'];
    for (let k = 0; k < 4; k++) bake.add(cyl(bag, 0.78 - k * 0.09 - 0.09, 0.78 - k * 0.09, 1.1, 14), { p: [x, 1.5 + 0.55 + k * 1.1, z], color: stripes[k], smooth: true });
    bake.add(cyl(bag, 0.8, 0.8, 0.14, 14), { p: [x, 6.0, z], color: '#2B2D5C', smooth: true });
    bake.add(cyl(bag, 0.38, 0.4, 0.62, 12), { p: [x, 6.4, z], color: '#FFF2A8', smooth: true });
    bake.add(cone(bag, 0.62, 0.55, 12), { p: [x, 6.98, z], color: '#E5484D', smooth: true });
    bake.add(ball(bag, 8, 6), { p: [x, 7.3, z], s: [0.1, 0.1, 0.1], color: '#FFD166', smooth: true });
  }

  // a few palm-free beach grasses: little tufts of pale blades (one instanced mesh)
  {
    const tuft = bag.geo('tuft', () => {
      const parts = [[0, 0, 0.55, 0], [0.09, 0.03, 0.4, 0.35], [-0.09, -0.02, 0.45, -0.3]], pos = [], nor = [];
      for (const [px, pz, h, lean] of parts) { const c = new THREE.ConeGeometry(0.05, h, 4).toNonIndexed(); c.rotateZ(lean); c.translate(px, h / 2, pz); const a = c.getAttribute('position'), n = c.getAttribute('normal'); for (let i = 0; i < a.count; i++) { pos.push(a.getX(i), a.getY(i), a.getZ(i)); nor.push(n.getX(i), n.getY(i), n.getZ(i)); } c.dispose(); }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
      return g;
    });
    const n = 90, m = new THREE.InstancedMesh(tuft, bag.paint('#ffffff', { roughness: 0.9, flatShading: true }), n);
    const mm = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const s = L0 + R() * span, near = R() < 0.6, off = near ? 4.6 + R() * 7 : -(1.75 + R() * 0.5);
      if (nearStop(s, 3) && near) { m.setMatrixAt(i, mm.makeScale(0, 0, 0)); continue; }
      const f = frame(s, off), k = 1.1 + R() * 0.8;
      m.setMatrixAt(i, mm.compose(v.set(f.x, 0, f.z), q.setFromEuler(e.set(0, R() * 6, 0)), sc.set(k, k, k)));
      m.setColorAt(i, col.set(['#A9CC6E', '#BBD87E', '#97BF62'][i % 3]));
    }
    m.castShadow = false;
    group.add(m);
  }
  // the landward side: a little harbour village on the stations' side, one thing in each gap between stations (beyond the signs):
  // four colourful cottages, a fish shack with a striped awning, buoys, lobster pots and a net-drying rack, a beach umbrella and a rowing boat
  {
    const rock = blobGeo(bag, 'rockblob', 733, { detail: 1, jit: 0.3 });
    const TRIM = '#FFF8EC';
    // a local frame at the middle of gap i: +x points at the track, +z along the line
    const gap = (i, off) => { const s = stops[Math.min(i, stationCount - 1)] + 4.5; if (i >= stationCount - 1 || nearExtra(s, 6)) return null; const f = frame(s, off), c = Math.cos(f.heading), sn = Math.sin(f.heading); return { f, hd: f.heading, lp: (lx, ly, lz) => [f.x + lx * c + lz * sn, ly, f.z - lx * sn + lz * c] }; };
    const cottage = (g, wall, roof, door) => {
      const { lp, hd } = g, R0 = [0, hd, 0], D = 2.0, W = 2.2, H = 1.35;
      bake.add(box(bag, D, H, W), { p: lp(0, H / 2, 0), r: R0, color: wall });
      bake.add(box(bag, D + 0.04, 0.14, W + 0.04), { p: lp(0, 0.07, 0), r: R0, color: '#B7A98F' });
      bake.add(prism(bag, W + 0.45, 0.95, D + 0.5), { p: lp(0, H, 0), r: [0, hd + Math.PI / 2, 0], color: roof });
      bake.add(box(bag, 0.08, 0.1, 0.1), { p: lp(0, 0, 0), r: R0, color: roof });
      bake.add(box(bag, 0.3, 0.55, 0.3), { p: lp(-0.5, H + 0.7, -0.5), r: R0, color: '#9A6B4A' }); // chimney
      bake.add(box(bag, 0.07, 0.92, 0.52), { p: lp(D / 2 + 0.03, 0.46, -0.45), r: R0, color: door });
      bake.add(box(bag, 0.07, 0.5, 0.5), { p: lp(D / 2 + 0.03, 0.82, 0.55), r: R0, color: TRIM });
      bake.add(box(bag, 0.09, 0.36, 0.36), { p: lp(D / 2 + 0.05, 0.82, 0.55), r: R0, color: '#8FD0F0' });
      bake.add(box(bag, 0.09, 0.05, 0.62), { p: lp(D / 2 + 0.05, 0.56, 0.55), r: R0, color: roof }); // sill
      bake.add(box(bag, 0.5, 0.5, 0.07), { p: lp(0.1, 0.8, W / 2 + 0.03), r: R0, color: TRIM });
      bake.add(box(bag, 0.36, 0.36, 0.09), { p: lp(0.1, 0.8, W / 2 + 0.05), r: R0, color: '#8FD0F0' });
    };
    [['#F9B8C6', '#B9484C', '#4F86C6'], ['#9FD8DD', '#3F6E9A', '#F2B94B'], ['#FFE08A', '#C0594A', '#3C9C8A'], ['#B8E3A2', '#8A4F7D', '#E5484D']].forEach((c, i) => { const g = gap(i, 5.7); if (g) cottage(g, ...c); });
    // the fish shack: weathered blue boards, a counter, a red-and-white striped awning, a sign
    {
      const g = gap(4, 5.6);
      if (g) {
        const { lp, hd } = g, R0 = [0, hd, 0];
        bake.add(box(bag, 1.7, 1.2, 2.4), { p: lp(0, 0.6, 0), r: R0, color: '#8FB4C9' });
        bake.add(box(bag, 1.95, 0.12, 2.65), { p: lp(0.05, 1.28, 0), r: [0, hd, 0.0], color: '#6B7F93' });
        for (let k = -3; k <= 3; k++) bake.add(box(bag, 0.5, 0.06, 0.34), { p: lp(1.2, 1.12 - 0.0, k * 0.34), r: [0, hd, -0.5], color: k % 2 ? '#FFFFFF' : '#E5484D' });
        bake.add(box(bag, 0.6, 0.12, 2.2), { p: lp(1.05, 0.62, 0), r: R0, color: '#C99A5B' });
        bake.add(box(bag, 0.06, 0.4, 1.2), { p: lp(0.86, 0.92, 0), r: R0, color: TRIM });
        bake.add(box(bag, 0.5, 0.4, 0.5), { p: lp(1.3, 0.2, 0.7), r: R0, color: '#B98B55' });
        for (const z of [-0.3, 0.1]) bake.add(ball(bag, 8, 6), { p: lp(1.3, 0.45, z + 0.7), s: [0.2, 0.08, 0.1], color: '#9FB6C8', smooth: true });
      }
    }
    // buoys, lobster pots and a net-drying rack
    {
      const g = gap(5, 5.4);
      if (g) {
        const { lp, hd } = g, R0 = [0, hd, 0];
        [[0.3, 0.3], [1.0, 0.5], [0.6, 1.0]].forEach(([u, v], i) => { const col = i === 1 ? '#FFFFFF' : '#E5484D'; bake.add(ball(bag, 12, 8), { p: lp(u, 0.3, v), s: [0.3, 0.3, 0.3], color: col, smooth: true }); bake.add(cyl(bag, 0.305, 0.305, 0.1, 12), { p: lp(u, 0.3, v), color: i === 1 ? '#E5484D' : '#FFFFFF', smooth: true }); });
        for (const [u, v] of [[0.0, -0.9], [0.6, -1.0]]) { bake.add(box(bag, 0.55, 0.38, 0.45), { p: lp(u, 0.19, v), r: R0, color: '#B98B55' }); bake.add(box(bag, 0.6, 0.05, 0.5), { p: lp(u, 0.4, v), r: R0, color: '#8A5A35' }); }
        for (const z of [-0.5, 1.9]) bake.add(cyl(bag, 0.06, 0.06, 1.6, 6), { p: lp(-1.2, 0.8, z), color: '#8A5A35' });
        bake.add(box(bag, 0.07, 0.07, 2.6), { p: lp(-1.2, 1.55, 0.7), r: R0, color: '#8A5A35' });
        bake.add(box(bag, 0.05, 0.9, 2.2), { p: lp(-1.2, 1.05, 0.7), r: R0, color: '#6FB1C8' });
        for (let k = 0; k < 4; k++) bake.add(box(bag, 0.07, 0.9, 0.04), { p: lp(-1.2, 1.05, -0.3 + k * 0.6), r: R0, color: '#4E8FA8' });
        for (let k = 0; k < 3; k++) bake.add(box(bag, 0.07, 0.04, 2.2), { p: lp(-1.2, 0.8 + k * 0.25, 0.7), r: R0, color: '#4E8FA8' });
      }
    }
    // a striped beach umbrella and a rowing boat pulled up on the sand
    {
      const g = gap(6, 5.6);
      if (g) {
        const { lp } = g;
        bake.add(cyl(bag, 0.04, 0.04, 1.7, 6), { p: lp(0, 0.85, 0), r: [0, 0, 0.12], color: '#F4F0E6' });
        bake.add(bag.geo('umbr', () => new THREE.ConeGeometry(1.0, 0.45, 8)), { p: lp(-0.1, 1.75, 0), color: '#E5484D', smooth: false, colorFn: (c, t) => (t % 4 < 2 ? '#E5484D' : '#FFFFFF') });
        bake.add(box(bag, 0.7, 0.03, 1.4), { p: lp(0.9, 0.03, 0.3), r: [0, g.hd + 0.3, 0], color: '#5AC8FA' });
        boat(g.f, 1.6, -2.0, 0.5, 'row');
      }
    }
    for (let i = 0; i < 8; i++) {
      const s = L0 + R() * span, off = 8.0 + R() * 4, f = frame(s, off);
      if (nearExtra(s, 6)) continue;
      const k = 0.4 + R() * 0.45;
      bake.add(rock, { p: [f.x, k * 0.2, f.z], r: [0, R() * 3, 0], s: [k * 1.2, k * 0.75, k], color: ['#B8C2CC', '#C8CFD6', '#A9B6C3'][i % 3] });
    }
  }
  bake.finish(group);

  // seagulls: tiny white V shapes high in the sky (static; one instanced mesh); idle-motion candidate: a slow glide
  {
    const vee = bag.geo('gull', () => {
      const pos = [];
      const wing = (sx) => { const x1 = 0.34 * sx, y1 = 0.1; pos.push(0, 0, 0.05, x1, y1, 0.05, 0, 0, -0.05, x1, y1, 0.05, x1, y1, -0.05, 0, 0, -0.05); };
      wing(-1); wing(1);
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.computeVertexNormals();
      return g;
    });
    const n = 7, m = new THREE.InstancedMesh(vee, bag.paint('#FFFFFF', { roughness: 1, emissive: '#FFFFFF', emissiveIntensity: 0.5, side: THREE.DoubleSide }), n);
    const mm = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3();
    const spots = [[-4.5, 7.4, -7], [-6.4, 8.2, -11], [-2.8, 8.8, -12.5], [4.6, 7.8, -9], [6.5, 6.9, -5], [-8, 6.6, -3], [2.4, 9, -15]];
    spots.forEach(([x, y, z], i) => { const k = 1.2 + (i % 3) * 0.45; m.setMatrixAt(i, mm.compose(v.set(x, y, z), q.setFromEuler(e.set(0.35, (i - 3) * 0.4, (i % 2 ? 0.1 : -0.12))), sc.set(k, k, k))); });
    m.castShadow = false; m.receiveShadow = false;
    sky.add(m);
  }
}

export const REGION_BUILDERS = { sunny: sunnyHills, docks };
export { EDGE as DOCKS_EDGE };
