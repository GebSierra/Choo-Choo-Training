// Starter Station's little extras (world 1 only; theme.details === 'starter', js/train/themes.js): a short swag of bunting on each
// station roof, lamp posts at the platforms, a duck pond with two ducks and a lily pad, a bench and a mailbox at the first
// station, and two raised flower beds near the start. Everything still is baked into ONE vertex-coloured mesh plus one water
// mesh, so it costs 2 draw calls in all. Nothing moves and nothing is drawn unless something else asks
// for a frame. The pieces keep clear of every station sign (the signs stand at local x -3.05, z +1.25 on the platform side).
import { THREE, PAL, rng } from './world.js';

const TAU = Math.PI * 2;
const FLAG_COLS = ['#E5484D', '#FFD166', '#5AC8FA', '#4FC97E', '#B79CF5', '#FF9F6B'];

// Collects pieces (geometry + where it stands + a colour) into one merged mesh. Normals are kept from each geometry.
class Bake {
  constructor() { this.pos = []; this.nor = []; this.col = []; this.o = new THREE.Object3D(); this.c = new THREE.Color(); this.tris = 0; }
  // frame: a Matrix4 (a stop's frame) or null. p, r (Euler YXZ), s: the piece's own placement inside the frame.
  add(geo, { frame = null, p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1], color = '#ffffff' } = {}) {
    const o = this.o;
    o.position.set(p[0], p[1], p[2]); o.rotation.set(r[0], r[1], r[2], 'YXZ'); o.scale.set(s[0], s[1], s[2]); o.updateMatrix();
    const m = frame ? new THREE.Matrix4().multiplyMatrices(frame, o.matrix) : o.matrix;
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    g.applyMatrix4(m);
    const pa = g.getAttribute('position'), na = g.getAttribute('normal');
    this.c.set(color);
    for (let i = 0; i < pa.count; i++) {
      this.pos.push(pa.getX(i), pa.getY(i), pa.getZ(i)); this.nor.push(na.getX(i), na.getY(i), na.getZ(i)); this.col.push(this.c.r, this.c.g, this.c.b);
    }
    this.tris += pa.count / 3;
    g.dispose();
  }
  // Raw triangles already in world space (the bunting), one colour each.
  tri(a, b, c, color) {
    this.c.set(color);
    const n = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)).normalize();
    for (const v of [a, b, c]) { this.pos.push(v.x, v.y, v.z); this.nor.push(n.x, n.y, n.z); this.col.push(this.c.r, this.c.g, this.c.b); }
    this.tris++;
  }
  mesh(bag) {
    const g = bag.add(new THREE.BufferGeometry());
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    const m = new THREE.Mesh(g, bag.paint('#ffffff', { roughness: 0.7, vertexColors: true, side: THREE.DoubleSide }));
    m.castShadow = true; m.receiveShadow = true;
    return m;
  }
}

// returns { clear: [{x, z, r}], tris, calls } : the circles the trees and flowers keep out of.
export function buildStarterDetails({ bag, line, stops, kinds = [], group }) {
  const R = rng(31), B = new Bake(), clear = [];
  const n = Math.min(stops.length, kinds.length || stops.length);
  const sph = (k, seg = 12, rows = 8) => bag.geo(`st-sph${k}`, () => new THREE.SphereGeometry(1, seg, rows));
  const cyl = (rt, rb, seg = 10) => bag.geo(`st-cyl${rt},${rb},${seg}`, () => new THREE.CylinderGeometry(rt, rb, 1, seg));
  const cone = bag.geo('st-cone', () => new THREE.ConeGeometry(1, 1, 10));
  const box = (w, h, d, r = 0.03) => bag.box(w, h, d, r);
  // a stop's frame (the same as stations.js: local +z runs along the line, local -x is the platform side)
  const frameAt = (s) => { const p = line.at(s, {}); return new THREE.Matrix4().makeRotationY(p.heading).setPosition(p.x, 0, p.z); };
  const worldOf = (frame, x, y, z) => new THREE.Vector3(x, y, z).applyMatrix4(frame);
  const frames = stops.slice(0, n).map(frameAt);
  const cyP = (f, x, y, z, rt, rb, h, color, seg) => B.add(cyl(rt, rb, seg), { frame: f, p: [x, y, z], s: [1, h, 1], color });

  // ---- a short swag of pennants on the front eave of each lesson station's roof (the end toward the camera; the far end would hide behind the roof) ----
  // The string runs across the roof's end, so the camera, which looks along the line, sees it face-on, tied to the roof at both ends.
  for (let i = 0; i < n; i++) {
    if (kinds[i] !== 'lesson') continue;
    const f = frames[i], A = worldOf(f, -1.1, 2.04, -1.62), Z = worldOf(f, -2.8, 1.87, -1.62), count = 6, sag = 0.3;
    const at = (t) => new THREE.Vector3().lerpVectors(A, Z, t).setY(A.y + (Z.y - A.y) * t - Math.sin(Math.PI * t) * sag);
    const side = new THREE.Vector3().subVectors(Z, A).setY(0).normalize();
    for (let k = 0; k < 10; k++) { // the string: a thin ribbon
      const a = at(k / 10), b = at((k + 1) / 10), w = new THREE.Vector3(0, 0.025, 0);
      B.tri(a.clone().add(w), b.clone().add(w), b.clone().sub(w), '#7A5C3E'); B.tri(a.clone().add(w), b.clone().sub(w), a.clone().sub(w), '#7A5C3E');
    }
    for (let k = 0; k < count; k++) {
      const c = at((k + 0.5) / count), half = side.clone().multiplyScalar(0.15), apex = c.clone().add(new THREE.Vector3(0, -0.42, 0));
      B.tri(c.clone().sub(half), apex, c.clone().add(half), FLAG_COLS[(k + i) % FLAG_COLS.length]);
    }
  }

  // ---- lamp posts at the platforms (the near end of every third station, outside the platform) ----
  const lamp = (f, x, z) => {
    cyP(f, x, 0.09, z, 0.2, 0.24, 0.18, PAL.navy, 12);
    cyP(f, x, 1.1, z, 0.055, 0.07, 2.1, PAL.navy, 8);
    cyP(f, x, 2.14, z, 0.13, 0.13, 0.08, PAL.sun, 10);
    B.add(box(0.36, 0.46, 0.36, 0.1), { frame: f, p: [x, 2.42, z], color: '#FFE08A' });
    B.add(cone, { frame: f, p: [x, 2.78, z], s: [0.33, 0.3, 0.33], color: PAL.navy });
    B.add(sph('lampTip'), { frame: f, p: [x, 2.97, z], s: [0.07, 0.07, 0.07], color: PAL.sun });
  };
  for (let i = 0; i < n; i += 3) if (kinds[i] === 'lesson') lamp(frames[i], -2.9, -2.45);

  // ---- the first station: a park bench and a mailbox just outside the platform ----
  if (n) {
    const f = frames[0];
    // bench facing the track
    const wood = PAL.wood, dark = '#8A5A35';
    B.add(box(0.5, 0.1, 1.5, 0.04), { frame: f, p: [-4.55, 0.62, -1.45], color: wood });
    B.add(box(0.1, 0.62, 1.5, 0.04), { frame: f, p: [-4.84, 0.96, -1.45], r: [0, 0, 0.12], color: wood });
    for (const z of [-2.05, -0.85]) { B.add(box(0.46, 0.08, 0.1, 0.03), { frame: f, p: [-4.55, 0.3, z], color: dark }); B.add(box(0.1, 0.34, 0.1, 0.03), { frame: f, p: [-4.4, 0.45, z], color: dark }); B.add(box(0.1, 0.34, 0.1, 0.03), { frame: f, p: [-4.7, 0.45, z], color: dark }); }
    // mailbox: post, a blue box with a round top, a red flag and a cream envelope slot
    cyP(f, -4.2, 0.62, 0.35, 0.07, 0.07, 1.25, dark, 8);
    B.add(box(0.62, 0.46, 0.46, 0.1), { frame: f, p: [-4.2, 1.42, 0.35], color: '#3B7DD8' });
    B.add(cyl(0.23, 0.23, 14), { frame: f, p: [-4.2, 1.65, 0.35], r: [0, 0, Math.PI / 2], s: [1, 0.62, 1], color: '#3B7DD8' });
    B.add(box(0.06, 0.34, 0.2, 0.02), { frame: f, p: [-3.86, 1.4, 0.35], color: PAL.red });
    B.add(box(0.05, 0.05, 0.3, 0.02), { frame: f, p: [-3.84, 1.58, 0.35], color: PAL.red });
    B.add(box(0.03, 0.22, 0.34, 0.01), { frame: f, p: [-3.89, 1.37, 0.35], color: '#FFF8EC' });
  }

  // ---- two raised flower beds near the start ----
  const bed = (f, x, z, w, d, cols) => {
    B.add(box(w, 0.26, d, 0.07), { frame: f, p: [x, 0.13, z], color: '#B98A4E' });
    B.add(box(w - 0.22, 0.12, d - 0.22, 0.05), { frame: f, p: [x, 0.27, z], color: '#6B4A32' });
    const nx = Math.round(w / 0.42), nz = Math.round(d / 0.42);
    for (let a = 0; a < nx; a++) for (let b = 0; b < nz; b++) {
      const fx = x + ((a + 0.5) / nx - 0.5) * (w - 0.34) + (R() - 0.5) * 0.1, fz = z + ((b + 0.5) / nz - 0.5) * (d - 0.34) + (R() - 0.5) * 0.1, h = 0.34 + R() * 0.2, col = cols[(a + b * 2) % cols.length];
      B.add(cyl(0.025, 0.025, 5), { frame: f, p: [fx, 0.3 + h / 2, fz], s: [1, h, 1], color: '#2FA35E' });
      B.add(sph('bloom', 10, 6), { frame: f, p: [fx, 0.34 + h, fz], s: [0.17, 0.12, 0.17], color: col });
      B.add(sph('bloomEye', 6, 4), { frame: f, p: [fx, 0.4 + h, fz], s: [0.06, 0.05, 0.06], color: col === PAL.sun ? '#E8923A' : PAL.sun });
    }
  };
  if (n) {
    // right of the line, in front of the first platform; and left of the line beside the first station
    bed(frames[0], -3.6, -4.2, 2.1, 1.1, ['#FF8A8A', '#FFFFFF', PAL.sun, '#C9B6FF']);
    bed(frameAt(line.stop(0) - 1.0), 2.9, 0, 1.15, 2.1, [PAL.sun, '#FF8A8A', '#FFFFFF', '#B79CF5']);
    for (const [fi, x, z, r] of [[0, -3.6, -4.2, 1.6], [0, -3.7, 0.2, 1.4]]) { const w = worldOf(frames[fi], x, 0, z); clear.push({ x: w.x, z: w.z, r }); }
    { const w = worldOf(frameAt(line.stop(0) - 1.0), 2.9, 0, 0); clear.push({ x: w.x, z: w.z, r: 1.7 }); }
  }

  // ---- the duck pond: open grass on the far side of the track (left), just before the river, with a stony rim, cattails, a lily pad and two small ducks ----
  const pondS = n > 2 ? line.stop(2) + 0.2 : line.stop(0) + 4.5, pf = frameAt(pondS), PX = 3.0, RX = 1.05, RZ = 1.55;
  B.add(cyl(1, 1, 36), { frame: pf, p: [PX, 0.025, 0], s: [RX + 0.32, 0.05, RZ + 0.3], color: '#D9C79B' });
  for (let k = 0; k < 13; k++) {
    const a = (k / 13) * TAU + 0.2, rs = 0.12 + R() * 0.06;
    B.add(sph('stone', 8, 6), { frame: pf, p: [PX + Math.cos(a) * (RX + 0.28), 0.07, Math.sin(a) * (RZ + 0.26)], s: [rs * 1.5, rs, rs * 1.2], r: [0, a, 0], color: k % 2 ? '#B8B2A6' : '#CFC9BD' });
  }
  for (const [dx, dz, h] of [[1.15, 0.9, 0.95], [1.28, 1.06, 0.78], [1.1, 1.12, 0.7]]) { // cattails at the far corner
    B.add(cyl(0.022, 0.022, 5), { frame: pf, p: [PX + dx, h / 2, dz], s: [1, h, 1], color: '#4FA35E' });
    B.add(cyl(0.06, 0.06, 8), { frame: pf, p: [PX + dx, h + 0.1, dz], s: [1, 0.26, 1], color: '#7A4A2B' });
  }
  const duck = (x, z, ry, k) => { // k scales the whole duck (body about 0.9 k long)
    const at = (dx, dy, dz) => [PX + x + Math.cos(ry) * dx * k + Math.sin(ry) * dz * k, dy * k, z - Math.sin(ry) * dx * k + Math.cos(ry) * dz * k];
    B.add(sph('duckBody', 14, 10), { frame: pf, p: at(0, 0.2, 0), r: [0, ry, 0], s: [0.33 * k, 0.24 * k, 0.46 * k], color: '#FFD84D' });
    B.add(sph('duckTail', 8, 6), { frame: pf, p: at(0, 0.32, -0.4), r: [0.5, ry, 0], s: [0.12 * k, 0.1 * k, 0.17 * k], color: '#FFD84D' });
    for (const sx of [-1, 1]) B.add(sph('duckWing', 10, 8), { frame: pf, p: at(sx * 0.27, 0.26, -0.03), r: [0, ry, sx * 0.1], s: [0.06 * k, 0.15 * k, 0.28 * k], color: '#F2B92E' });
    B.add(sph('duckHead', 12, 10), { frame: pf, p: at(0, 0.53, 0.33), s: [0.21 * k, 0.21 * k, 0.21 * k], color: '#FFD84D' });
    B.add(box(0.2 * k, 0.07 * k, 0.17 * k, 0.03 * k), { frame: pf, p: at(0, 0.5, 0.55), r: [0, ry, 0], color: '#FF8A2B' });
    for (const sx of [-1, 1]) B.add(sph('duckEye', 6, 4), { frame: pf, p: at(sx * 0.1, 0.6, 0.45), s: [0.035 * k, 0.035 * k, 0.035 * k], color: PAL.ink });
  };
  duck(-0.2, 0.45, 0.8, 0.62);
  duck(0.25, -0.5, -2.4, 0.48);
  B.add(cyl(1, 1, 18), { frame: pf, p: [PX + 0.38, 0.065, -0.05], s: [0.3, 0.025, 0.27], color: '#3FAE62' }); // a lily pad with a pink bloom
  B.add(sph('lily', 8, 6), { frame: pf, p: [PX + 0.38, 0.13, -0.05], s: [0.09, 0.06, 0.09], color: '#FF8AB5' });
  { const w = worldOf(pf, PX, 0, 0); clear.push({ x: w.x, z: w.z, r: 2.4 }); }

  group.add(B.mesh(bag));
  // the water: one smooth, shiny ellipse over the pond's sand
  const water = new THREE.Mesh(bag.geo('st-water', () => new THREE.CircleGeometry(1, 40).rotateX(-Math.PI / 2)), bag.paint(PAL.water, { roughness: 0.2, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }));
  water.applyMatrix4(pf); water.translateX(PX); water.translateY(0.06); water.scale.set(RX, 1, RZ);
  water.receiveShadow = true;
  group.add(water);
  return { clear, tris: B.tris };
}
