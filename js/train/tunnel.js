// The tunnel portal: a tall, sunny, faceted mountain with a stone arch of chunky blocks set in its foot, flowers on the slopes,
// and a warm golden tunnel with the track running in toward the light. It is the world's end on the Home (a permanent portal a
// short way past the last station, with a soft tint of the next world's colour and a signpost beside it), the tunnel the train
// rolls out of at the start of a later world (mirrored, no sign, a softer glow), and the level celebration's tunnel. The train
// rolls in until the engine is inside, toots, and backs out (level) or goes on into the next world (crossing).
// Everything is made through the scene's bag (disposed with Home), nothing in it moves and no light is added (the glow is
// emissive and unlit), so it adds no frames of its own. About 20 draw calls for one portal.
import { THREE, PAL, rng, block } from './world.js';

export const TUNNEL_AT = 4.8; // the mountain's middle, this far past the current stop's middle
export const IN = 4.6;        // how far the engine rolls in from its resting place
const LENGTH = 3.8;
export const HILL = LENGTH;   // the portal's length along the line: its mouth stands HILL / 2 before the middle
const MOUTH_W = 1.0, MOUTH_H = 1.75;   // the arch's half width and height
const ZF = -LENGTH / 2;                // the mouth plane (local z) of the end the camera sees

export const SIGN_AT = TUNNEL_AT - 1.7; // the signpost stands in front of the mountain's shoulder, a little before the mouth, on the platforms side (the far side runs off the screen)

const SUN = PAL.sun, SKY = '#6EC6FF', PINK = '#FF9EC4';

// ---- helpers ----
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const gradient = (out, y, top, low, high, shade = 1) => out.copy(low).lerp(high, Math.pow(clamp01(y / top), 0.85)).multiplyScalar(shade);

function geoFrom(bag, pos, col) {
  const g = bag.add(new THREE.BufferGeometry());
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals(); // not indexed: every face keeps its own normal (a faceted look)
  return g;
}

// A faceted peak: a low-detail icosahedron pulled into a mountain (pointed top, wide foot), its vertices jittered by a seeded
// random so it looks hand-made, painted by height from `low` to `high`. Its triangles go into `acc` (merged into one mesh).
function addPeak(acc, o) {
  const { cx, cz, rx, ry, rz, yaw = 0, seed, jit = 0.22, low, high, fix } = o;
  const R = rng(seed), cache = new Map();
  const g = new THREE.IcosahedronGeometry(1, 1), pa = g.getAttribute('position');
  const jitter = (x, y, z) => { const k = `${x.toFixed(3)},${y.toFixed(3)},${z.toFixed(3)}`; let j = cache.get(k); if (!j) { j = [R() - 0.5, R() - 0.5, R() - 0.5]; cache.set(k, j); } return j; };
  const cs = Math.cos(yaw), sn = Math.sin(yaw), pts = [];
  for (let i = 0; i < pa.count; i++) {
    const ux = pa.getX(i), uy = pa.getY(i), uz = pa.getZ(i), j = jitter(ux, uy, uz);
    let x = ux, y = uy * 0.25, z = uz;
    if (uy > 1e-4) { const hr = Math.hypot(ux, uz), k = hr > 1e-6 ? Math.pow(1 - uy, 0.85) / hr : 0; x = ux * k; z = uz * k; y = uy; }
    x *= rx; y *= ry; z *= rz;
    x += j[0] * jit * rx; z += j[2] * jit * rz; if (uy > 1e-4) y += j[1] * jit * ry * 0.5;
    const wx = cx + x * cs + z * sn, wz = cz - x * sn + z * cs, v = [wx, y, wz];
    if (fix) fix(v);
    pts.push(v);
  }
  const c = new THREE.Color(), a = new THREE.Vector3(), b = new THREE.Vector3(), n = new THREE.Vector3();
  for (let t = 0; t < pts.length; t += 3) {
    const shade = 0.93 + R() * 0.14, [p0, p1, p2] = [pts[t], pts[t + 1], pts[t + 2]];
    for (const p of [p0, p1, p2]) { gradient(c, p[1], ry * 0.85, low, high, shade); acc.pos.push(p[0], p[1], p[2]); acc.col.push(c.r, c.g, c.b); }
    a.set(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]); b.set(p2[0] - p0[0], p2[1] - p0[1], p2[2] - p0[2]); n.crossVectors(a, b).normalize();
    acc.faces.push({ p0, p1, p2, n: n.clone(), top: ry });
  }
}

// A point on a triangle, nudged out along its normal.
function onFace(R, f, lift = 0.05) {
  let u = R(), v = R(); if (u + v > 1) { u = 1 - u; v = 1 - v; }
  const w = 1 - u - v;
  return { x: f.p0[0] * w + f.p1[0] * u + f.p2[0] * v + f.n.x * lift, y: f.p0[1] * w + f.p1[1] * u + f.p2[1] * v + f.n.y * lift, z: f.p0[2] * w + f.p1[2] * u + f.p2[2] * v + f.n.z * lift };
}

const inPoly = (poly, x, y) => { let inside = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside; } return inside; };

// The cliff the arch is set in: a faceted hill-spur cut straight along the line, with the arch-shaped tunnel through it. The
// outside is painted like the mountain; the tunnel's walls go into `inner` (drawn emissive, amber at the mouth, glowing at the far end).
function buildSpur(bag, L, R, low, high) {
  const outline = [[-3.3, -0.6], [-3.5, 0.4], [-3.1, 1.4], [-2.4, 2.3], [-1.4, 2.9], [-0.2, 3.2], [1.0, 3.0], [2.0, 2.5], [2.9, 1.7], [3.5, 0.6], [3.3, -0.6]]
    .map(([x, y]) => [x + (y > -0.5 ? (R() - 0.5) * 0.25 : 0), y + (y > -0.5 ? (R() - 0.5) * 0.25 : 0)]);
  const shape = new THREE.Shape(outline.map(([x, y]) => new THREE.Vector2(x, y)));
  const hole = new THREE.Path();
  hole.moveTo(-MOUTH_W, -0.3); hole.lineTo(-MOUTH_W, 0);
  for (let i = 1; i < 14; i++) { const th = Math.PI - Math.PI * i / 14; hole.lineTo(Math.cos(th) * MOUTH_W, Math.sin(th) * MOUTH_H); }
  hole.lineTo(MOUTH_W, 0); hole.lineTo(MOUTH_W, -0.3); hole.lineTo(-MOUTH_W, -0.3);
  shape.holes.push(hole);
  const g = new THREE.ExtrudeGeometry(shape, { depth: L, bevelEnabled: false, steps: 1 });
  g.translate(0, 0, ZF);
  const pa = g.getAttribute('position'), outer = { pos: [], col: [] }, inner = { pos: [], col: [] }, roof = [];
  const c = new THREE.Color(), amber = new THREE.Color('#F0A23A'), light = new THREE.Color('#FFDF8E');
  const triGroup = (t) => { for (const gr of g.groups) if (t * 3 >= gr.start && t * 3 < gr.start + gr.count) return gr.materialIndex; return 0; };
  const a = new THREE.Vector3(), b = new THREE.Vector3(), n = new THREE.Vector3();
  for (let t = 0; t < pa.count / 3; t++) {
    const v = [0, 1, 2].map((k) => [pa.getX(t * 3 + k), pa.getY(t * 3 + k), pa.getZ(t * 3 + k)]);
    const cxm = (v[0][0] + v[1][0] + v[2][0]) / 3, cym = (v[0][1] + v[1][1] + v[2][1]) / 3;
    const isInner = triGroup(t) === 1 && Math.abs(cxm) <= MOUTH_W + 0.02 && cym <= MOUTH_H + 0.02 && cym > -0.31;
    const shade = 0.95 + R() * 0.1;
    for (const p of v) {
      if (isInner) { const k = Math.pow(clamp01((p[2] - ZF) / L), 0.9); c.copy(amber).lerp(light, k); inner.pos.push(...p); inner.col.push(c.r, c.g, c.b); }
      else { gradient(c, p[1], 3.2, low, high, shade); outer.pos.push(...p); outer.col.push(c.r, c.g, c.b); }
    }
    if (!isInner) {
      a.set(v[1][0] - v[0][0], v[1][1] - v[0][1], v[1][2] - v[0][2]); b.set(v[2][0] - v[0][0], v[2][1] - v[0][1], v[2][2] - v[0][2]); n.crossVectors(a, b).normalize();
      if (n.y > 0.45 && cym > 0.8) roof.push({ p0: v[0], p1: v[1], p2: v[2], n: n.clone() });
    }
  }
  g.dispose();
  return { outer: geoFrom(bag, outer.pos, outer.col), inner: geoFrom(bag, inner.pos, inner.col), roof, outline };
}

function discCanvas() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d'), grad = g.createRadialGradient(64, 64, 2, 64, 64, 64);
  grad.addColorStop(0, '#FFF3CC'); grad.addColorStop(0.45, '#FFDC8A'); grad.addColorStop(1, '#F6B547');
  g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
  return c;
}
function haloCanvas() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d'), grad = g.createRadialGradient(64, 64, 4, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,214,120,0.7)'); grad.addColorStop(0.45, 'rgba(255,190,90,0.26)'); grad.addColorStop(1, 'rgba(255,170,70,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
  return c;
}

// One end of the portal, built facing -z with its mouth plane at z = ZF; the other end (a start tunnel's camera side) is this
// group turned half way round. L: how deep the golden tunnel runs. Returns { group, samples } (spots for flowers).
function buildEnd(bag, { L, soft, tint, seed, low, high }) {
  const R = rng(seed), group = new THREE.Group(), samples = [];
  const spur = buildSpur(bag, L, R, low, high);
  const outer = new THREE.Mesh(spur.outer, bag.paint('#ffffff', { roughness: 0.9, vertexColors: true, flatShading: true }));
  outer.castShadow = true; outer.receiveShadow = true;
  const inner = new THREE.Mesh(spur.inner, bag.add(new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false, side: THREE.DoubleSide })));
  group.add(outer, inner);
  for (const f of spur.roof) for (let k = 0; k < 1 + (R() < 0.4 ? 1 : 0); k++) if (R() < 0.5) samples.push({ ...onFace(R, f, 0.05), roof: true });

  // the far end of the tunnel: a glowing disc in warm gold-white (an unlit picture, no light is added), a thin tint ring of the
  // next world's colour round its rim, and a soft halo of sunshine spilling out of the mouth
  const tex = bag.add(new THREE.CanvasTexture(discCanvas())); tex.colorSpace = THREE.SRGBColorSpace;
  const zEnd = ZF + L - 0.03;
  const disc = new THREE.Mesh(bag.geo('portaldisc', () => new THREE.CircleGeometry(1, 28, 0, Math.PI)), bag.add(new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, color: soft ? '#E8D9B4' : '#FFFFFF' })));
  disc.scale.set(MOUTH_W, MOUTH_H, 1); disc.rotation.y = Math.PI; disc.position.set(0, 0, zEnd);
  group.add(disc);
  if (tint) {
    const ring = new THREE.Mesh(bag.geo('portaltint', () => new THREE.TorusGeometry(1, 0.035, 6, 28, Math.PI)), bag.add(new THREE.MeshBasicMaterial({ color: tint, toneMapped: false, transparent: true, opacity: 0.55 })));
    ring.scale.set(MOUTH_W * 0.97, MOUTH_H * 0.97, 0.4); ring.rotation.y = Math.PI; ring.position.set(0, 0, zEnd - 0.03);
    group.add(ring);
  }
  const htex = bag.add(new THREE.CanvasTexture(haloCanvas())); htex.colorSpace = THREE.SRGBColorSpace;
  const halo = new THREE.Mesh(bag.geo('portalhalo', () => new THREE.PlaneGeometry(1, 1)), bag.add(new THREE.MeshBasicMaterial({ map: htex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, opacity: soft ? 0.4 : 0.6 })));
  halo.scale.set(4.6, 4.4, 1); halo.rotation.y = Math.PI; halo.position.set(0, 1.0, ZF - 0.35);
  group.add(halo);

  // the arch: chunky grey stone blocks round the mouth, the keystone on top, little green bushes growing along it
  const N = 13, A = MOUTH_W + 0.27, B = MOUTH_H + 0.27;
  const stones = new THREE.InstancedMesh(bag.box(1, 1, 1, 0.16, 2), bag.paint('#ffffff', { roughness: 0.95 }), N);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), s = new THREE.Vector3(), col = new THREE.Color();
  for (let i = 0; i < N; i++) {
    const th = Math.PI * i / (N - 1), key = i === (N - 1) / 2, foot = i === 0 || i === N - 1;
    const x = A * Math.cos(th), y = Math.max(foot ? 0.32 : 0, B * Math.sin(th));
    const phi = Math.atan2(B * Math.cos(th), -A * Math.sin(th));
    const len = (foot ? 0.7 : key ? 0.72 : 0.56 + R() * 0.14), thick = key ? 0.66 : 0.46 + R() * 0.12, depth = key ? 0.7 : 0.5 + R() * 0.12;
    q.setFromEuler(e.set((R() - 0.5) * 0.1, (R() - 0.5) * 0.14, phi + (R() - 0.5) * 0.1));
    stones.setMatrixAt(i, m.compose(v.set(x, y, ZF + 0.05 - (key ? 0.04 : 0)), q, s.set(len, thick, depth)));
    stones.setColorAt(i, col.set(key ? '#C4C8CF' : '#A7ABB3').multiplyScalar(0.88 + R() * 0.2));
  }
  stones.castShadow = true; stones.receiveShadow = true;
  group.add(stones);
  const bushPts = [];
  for (const th of [0.28, 0.75, 1.25, 1.9, 2.4, 2.86]) bushPts.push([(A + 0.42) * Math.cos(th), (B + 0.42) * Math.sin(th) - 0.05]);
  bushPts.push([-(A + 0.5), 0.2], [A + 0.55, 0.15], [-(A + 1.0), 0.15], [A + 1.05, 0.2]);
  const bush = new THREE.InstancedMesh(bag.geo('portalbush', () => new THREE.IcosahedronGeometry(1, 0)), bag.paint('#ffffff', { roughness: 0.9, flatShading: true }), bushPts.length);
  bushPts.forEach(([x, y], i) => {
    const r = 0.2 + R() * 0.14;
    bush.setMatrixAt(i, m.compose(v.set(x, y, ZF - 0.1), q.identity(), s.set(r, r * 0.85, r)));
    bush.setColorAt(i, col.set(PAL.greens[i % 3]).multiplyScalar(1.08));
    if (i % 2 === 0) samples.push({ x: x + (R() - 0.5) * 0.3, y: y + r * 0.7, z: ZF - 0.28, ground: false });
  });
  bush.castShadow = true;
  group.add(bush);

  // the sandy clearing where the track meets the portal, and a few rounded rocks
  const sandGeo = bag.add(new THREE.CircleGeometry(1, 16).rotateX(-Math.PI / 2));
  const sp = sandGeo.getAttribute('position');
  for (let i = 1; i < sp.count; i++) { const k = 0.88 + R() * 0.24; sp.setXYZ(i, sp.getX(i) * k, 0, sp.getZ(i) * k); }
  const sand = new THREE.Mesh(sandGeo, bag.paint('#E9D3A4', { roughness: 1, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }));
  sand.scale.set(3.3, 1, 2.0); sand.position.set(0, 0.014, ZF - 1.25);
  sand.receiveShadow = true;
  group.add(sand);
  const rocks = new THREE.InstancedMesh(bag.geo('portalrock', () => new THREE.DodecahedronGeometry(1, 0)), bag.paint('#ffffff', { roughness: 0.95, flatShading: true }), 4);
  [[-2.15, -3.35, 0.42], [2.2, -3.05, 0.34], [2.95, -2.5, 0.26], [-2.9, -2.55, 0.28]].forEach(([x, z, r], i) => {
    rocks.setMatrixAt(i, m.compose(v.set(x, r * 0.5, z), q.setFromEuler(e.set(0, R() * 3, 0)), s.set(r * 1.15, r * 0.8, r)));
    rocks.setColorAt(i, col.set(['#CFC7B3', '#BBB4A1', '#D9D1BE', '#C4BDA9'][i]));
  });
  rocks.castShadow = true; rocks.receiveShadow = true;
  group.add(rocks);
  // flowers in the sand's edge and at the feet of the arch
  for (const [x, z] of [[-1.95, -2.55], [1.9, -2.3], [-3.0, -1.9], [3.0, -1.7], [-2.6, -3.9], [2.7, -3.7]]) samples.push({ x, y: 0.12, z, ground: true });
  return { group, samples };
}

// s: the distance along the line of the portal's middle. Returns { group, length }.
// flip: the mouth faces forward along the line instead of back (a tunnel the train rolls out of, at the start of a world).
// opts.rear: the camera's side has a golden mouth too (the start tunnel: the camera looks at its far end). opts.glow: a colour;
// a thin ring of it round the golden light (the next world's colour). No light is added.
export function buildTunnel(bag, line, s, flip = false, opts = {}) {
  const group = new THREE.Group();
  group.name = 'tunnel';
  const p = line.at(s);
  const rear = !!opts.rear;
  const low = new THREE.Color('#62C34C'), high = new THREE.Color('#D2EC68');
  const lowS = new THREE.Color('#58BE55'), highS = new THREE.Color('#A9DE5E');
  // the mountain and its shoulders, merged into one mesh. Where the golden tunnel runs in, the mountain's foot is held back
  // behind the glowing disc, so nothing covers it.
  // (eased out over a wide margin, so no big triangle can swing across the mouth)
  const sm = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  const hold = (v) => (1 - sm(2.6, 4.2, Math.abs(v[0]))) * (1 - sm(3.0, 4.4, v[1]));
  const fix = rear ? (v) => { const a = Math.abs(v[2]); if (a > 1.3) v[2] -= Math.sign(v[2]) * (a - 1.3) * hold(v); }
    : (v) => { if (v[2] < 0.55) v[2] += (0.55 - v[2]) * hold(v); };
  const acc = { pos: [], col: [], faces: [] };
  const cz = rear ? 0 : 0.7, back = rear ? -1 : 1; // (the camera's end of a start tunnel is +z, so its far shoulders go the other way)
  addPeak(acc, { cx: 0, cz, rx: 3.7, ry: 6.3, rz: rear ? 2.9 : 2.8, seed: 5, low, high, fix });
  const sh = { pos: [], col: [], faces: [] };
  const side = [
    { cx: -5.0, cz: cz - 0.3, rx: 2.6, ry: 3.1, rz: 2.3, seed: 21, yaw: 0.4 },
    { cx: 5.1, cz: cz - 0.1, rx: 2.7, ry: 2.5, rz: 2.2, seed: 33, yaw: -0.3 },
    { cx: -2.4, cz: cz + 2.5 * back, rx: 2.4, ry: 3.6, rz: 2.0, seed: 47, yaw: 0.2 },
    { cx: 3.4, cz: cz + 2.4 * back, rx: 2.3, ry: 3.0, rz: 2.0, seed: 59, yaw: 0.9 },
    { cx: -7.4, cz: cz + 0.4, rx: 2.2, ry: 1.7, rz: 2.0, seed: 71, yaw: 0.1 },
  ];
  for (const o of side) addPeak(acc, { ...o, low: lowS, high: highS, fix });
  const hill = new THREE.Mesh(geoFrom(bag, acc.pos, acc.col), bag.paint('#ffffff', { roughness: 0.9, vertexColors: true, flatShading: true }));
  hill.castShadow = true; hill.receiveShadow = true;
  group.add(hill);

  const R = rng(97), samples = [];
  // flowers on the slopes (faces that look toward the camera or up, clear of the cliff the arch is set in)
  const cand = acc.faces.filter((f) => f.n.y > 0.25 && f.n.z < 0.7 && f.p0[1] + f.p1[1] + f.p2[1] > 1.0 && (f.p0[1] + f.p1[1] + f.p2[1]) / 3 < 0.78 * f.top
    && !(Math.abs((f.p0[0] + f.p1[0] + f.p2[0]) / 3) < 3.4 && (f.p0[2] + f.p1[2] + f.p2[2]) / 3 < 0.7 && (f.p0[1] + f.p1[1] + f.p2[1]) / 3 < 3.4));
  const want = 34;
  for (let k = 0; k < want && cand.length; k++) { const f = cand[Math.floor(R() * cand.length)]; const o = onFace(R, f, 0.06); samples.push({ ...o, slope: true }); }

  const ends = rear ? [-1, 1] : [-1];
  for (const end of ends) {
    const e = buildEnd(bag, { L: rear ? 0.5 : 2.4, soft: rear, tint: opts.glow, seed: end < 0 ? 13 : 17, low, high });
    if (end > 0) { e.group.rotation.y = Math.PI; for (const sp of e.samples) { sp.x = -sp.x; sp.z = -sp.z; } }
    group.add(e.group);
    samples.push(...e.samples);
  }

  // the flowers: one instanced mesh per colour, little clusters of three
  const cols = [SUN, '#FFFFFF', SKY, PINK], lists = cols.map(() => []);
  samples.forEach((sp, i) => {
    const k = i % 4;
    const n = sp.slope ? 3 : sp.roof ? 2 : 2;
    for (let j = 0; j < n; j++) lists[(k + j) % 4].push([sp.x + (j ? (R() - 0.5) * 0.34 : 0), sp.y + (sp.slope && j ? (R() - 0.3) * 0.12 : 0), sp.z + (j ? (R() - 0.5) * 0.3 : 0), 0.8 + R() * 0.5]);
  });
  const mm = new THREE.Matrix4(), qq = new THREE.Quaternion(), vv = new THREE.Vector3(), ss = new THREE.Vector3();
  cols.forEach((c, k) => {
    if (!lists[k].length) return;
    const mesh = new THREE.InstancedMesh(bag.geo('portalflower', () => new THREE.IcosahedronGeometry(0.1, 0)), bag.paint(c, { roughness: 0.6, emissive: c, emissiveIntensity: 0.3, flatShading: true }), lists[k].length);
    lists[k].forEach(([x, y, z, sc], i) => mesh.setMatrixAt(i, mm.compose(vv.set(x, y, z), qq.identity(), ss.set(sc * 1.4, sc * 1.2, sc * 1.4))));
    group.add(mesh);
  });

  group.position.set(p.x, 0, p.z);
  group.rotation.y = p.heading + (flip ? Math.PI : 0);
  return { group, length: LENGTH };
}

// The wooden signpost by the portal: a post with a board that reads "<next world> <-" (drawn once into a canvas texture, in
// the house font and palette). The post stands behind the board, so the lettering is whole. s: where along the line; side:
// which side of the track (1 = the stations' side, -1 = the far side).
export function buildSignpost(bag, line, s, world, side = 1) {
  const group = new THREE.Group();
  group.name = 'signpost';
  const p = line.at(s);
  const W = 3.0, H = 1.4, Y = 4.0;
  const post = block(bag, 0.24, Y + H / 2 + 0.25, 0.24, PAL.woodLight, { r: 0.06 });
  post.position.set(0, (Y + H / 2 + 0.25) / 2, 0.2); // behind the board
  group.add(post);
  const tex = bag.add(new THREE.CanvasTexture(boardCanvas(world, 768, Math.round(768 * H / W))));
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const frame = block(bag, W + 0.22, H + 0.22, 0.14, PAL.wood, { r: 0.07 });
  frame.position.set(0, Y, 0);
  group.add(frame);
  const face = new THREE.Mesh(bag.geo('boardface', () => new THREE.PlaneGeometry(W, H)), bag.add(new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7, metalness: 0 })));
  face.rotation.y = Math.PI; // the board faces back along the line, toward the camera
  face.position.set(0, Y, -0.075);
  group.add(face);
  group.position.set(p.x + p.nx * side * 3.5, 0, p.z + p.nz * side * 3.5);
  group.rotation.y = p.heading;
  return { group, face, w: W, h: H };
}

function boardCanvas(world, w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = '#FFF8EC'; g.beginPath(); g.roundRect(0, 0, w, h, 34); g.fill();
  g.fillStyle = world.color; g.fillRect(0, 0, w, 26); // a stripe in the next world's colour
  g.fillStyle = PAL.navy; g.textBaseline = 'middle';
  const words = String(world.name).split(' ');
  const lines = words.length > 2 ? [words.slice(0, Math.ceil(words.length / 2)).join(' '), words.slice(Math.ceil(words.length / 2)).join(' ')] : words.length === 2 ? words : [words[0]];
  const size = lines.length === 1 ? 150 : 128;
  const arrowW = 150, textW = w - arrowW - 70, cx = 36 + arrowW + textW / 2, cy = 26 + (h - 26) / 2;
  let font = size;
  const setFont = (n) => { g.font = `800 ${n}px Nunito, system-ui, sans-serif`; };
  setFont(font);
  while (font > 36 && Math.max(...lines.map((l) => g.measureText(l).width)) > textW) { font -= 4; setFont(font); }
  g.textAlign = 'center';
  lines.forEach((l, i) => g.fillText(l, cx, cy + (i - (lines.length - 1) / 2) * font * 1.02));
  // the arrow: a thick bar and a head, pointing at the tunnel (the board stands on its right, so it points left)
  const ax = 36 + arrowW / 2;
  g.strokeStyle = world.color === '#FFD166' ? '#E5A73A' : world.color; g.lineWidth = 30; g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(ax + 58, cy); g.lineTo(ax - 58, cy); g.moveTo(ax - 8, cy - 52); g.lineTo(ax - 60, cy); g.lineTo(ax - 8, cy + 52); g.stroke();
  return c;
}
