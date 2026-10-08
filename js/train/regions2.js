// The props of the next three themed worlds (js/train/themes.js): W5 Blend Bay (a cosy seaside bay), W6 Endings Junction (a little
// railway junction town) and W7 Silent E Summit (alpine foothills under a snowy peak). Same method and quality bar as
// js/train/regions.js (Sunny Hills, Digraph Docks): soft low-poly, flat shaded, every still piece baked (positions, normals, a colour
// per vertex) into two meshes, repeated things as one InstancedMesh per part, nothing animated, no light added, built through the
// scene's bag and disposed with Home. The camera sees only about four units to the far side of the track in portrait, so the
// landmarks stand close to it (the far side from -1.8 to -5, the stations' side beyond the signs from +5.4) and the large
// backdrop pieces stand behind them. Nothing tall stands near a station sign (signs: local x -3.05, z +1.25 of each stop).
//
// Idle-motion candidates for the later shared <= 10 fps ticker (NOTHING here moves today): W5 the kites' tails, the ferry's gentle
// bob, the bell's swing, wave crests; W6 the signal lamps' blink, the turntable's slow turn, chimney smoke, the crossing gates' lift;
// W7 the cable car's slide along its line, the waterfall's shimmer, snow puffs from the pine tops.
import { THREE, PAL, rng } from './world.js';
import { Bake, blobGeo, lerpHex, helpers, box, cyl, cone, ball, prism, addHill, TAU } from './regions.js';

// ---------------------------------------------------------------- shared pieces
// Local frame of a building beside the line. far: on the far (left) side. In the local frame +x points at the track, +z runs along
// the line's side that faces the camera as little as possible (so z = camZ * 1 is the face the camera sees), y is up.
function local(f, far) {
  const hd = f.heading, c = Math.cos(hd), sn = Math.sin(hd);
  if (far) return { th: hd + Math.PI, camZ: 1, lp: (lx, ly, lz) => [f.x - lx * c - lz * sn, ly, f.z + lx * sn - lz * c] };
  return { th: hd, camZ: -1, lp: (lx, ly, lz) => [f.x + lx * c + lz * sn, ly, f.z - lx * sn + lz * c] };
}
const poly = (bag, key, pts, depth) => bag.geo(key, () => {
  const g = new THREE.ExtrudeGeometry(new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y))), { depth, bevelEnabled: false });
  g.translate(0, 0, -depth / 2);
  return g;
});
const TRIM = '#FFF8EC';

// A cottage-like building in a local frame: walls, a gable roof facing the track, a door on the track face, windows on the track
// face and the camera face, a chimney. o: { D (along x), W (along z), H, wall, roof, door, trim, chimney, stilts }.
function cottage(bake, bag, L, o) {
  const { D = 2, W = 2.2, H = 1.35, wall, roof, door = '#4F86C6', trim = TRIM, y0 = 0, chimney = true, rise = 0.95 } = o;
  const R0 = [0, L.th, 0], { lp, camZ } = L;
  bake.add(box(bag, D, H, W), { p: lp(0, y0 + H / 2, 0), r: R0, color: wall });
  bake.add(box(bag, D + 0.05, 0.12, W + 0.05), { p: lp(0, y0 + 0.06, 0), r: R0, color: '#B7A98F' });
  bake.add(prism(bag, W + 0.45, rise, D + 0.5), { p: lp(0, y0 + H, 0), r: [0, L.th + Math.PI / 2, 0], color: roof });
  bake.add(box(bag, D + 0.58, 0.09, 0.1), { p: lp(0, y0 + H + 0.03, W / 2 + 0.2), r: R0, color: trim });
  bake.add(box(bag, D + 0.58, 0.09, 0.1), { p: lp(0, y0 + H + 0.03, -W / 2 - 0.2), r: R0, color: trim });
  if (chimney) bake.add(box(bag, 0.3, 0.55, 0.3), { p: lp(-D * 0.25, y0 + H + 0.62, -camZ * W * 0.2), r: R0, color: '#9A6B4A' });
  // the door and a window on the track face
  bake.add(box(bag, 0.07, 0.95, 0.56), { p: lp(D / 2 + 0.03, y0 + 0.5, -0.4 * camZ), r: R0, color: door });
  bake.add(box(bag, 0.05, 0.05, 0.64), { p: lp(D / 2 + 0.03, y0 + 1.0, -0.4 * camZ), r: R0, color: trim });
  bake.add(box(bag, 0.07, 0.5, 0.5), { p: lp(D / 2 + 0.03, y0 + 0.85, 0.5 * camZ), r: R0, color: trim });
  bake.add(box(bag, 0.09, 0.34, 0.34), { p: lp(D / 2 + 0.05, y0 + 0.85, 0.5 * camZ), r: R0, color: '#8FD0F0' });
  // two windows on the camera face
  for (const x of [-D * 0.22, D * 0.22]) {
    bake.add(box(bag, 0.5, 0.5, 0.07), { p: lp(x, y0 + 0.85, camZ * (W / 2 + 0.03)), r: R0, color: trim });
    bake.add(box(bag, 0.34, 0.34, 0.09), { p: lp(x, y0 + 0.85, camZ * (W / 2 + 0.05)), r: R0, color: '#8FD0F0' });
    bake.add(box(bag, 0.62, 0.05, 0.12), { p: lp(x, y0 + 0.58, camZ * (W / 2 + 0.06)), r: R0, color: roof });
  }
}

// A round beach-style umbrella: a pole and a striped cone.
function umbrella(bake, bag, x, z, a, b, lean = 0.1, h = 1.7) {
  bake.add(cyl(bag, 0.04, 0.04, h, 6), { p: [x, h / 2, z], r: [0, 0, lean], color: '#F4F0E6' });
  bake.add(bag.geo('umbr8', () => new THREE.ConeGeometry(1.0, 0.45, 8)), { p: [x - Math.sin(lean) * h * 0.5 - 0.02, h + 0.03, z], colorFn: (c, t) => (t % 4 < 2 ? a : b) });
}

// ---------------------------------------------------------------- W5 Blend Bay
// A cosy bay. Far side: sand, a curved boardwalk with lamps and bunting, then the turquoise bay with colourful beach huts on
// stilts, a pier with a bell and a little ferry alongside it, a lifeguard tower and buoys. Stations' side beyond the signs: palms,
// an ice-cream kiosk, a rack of surfboards, umbrellas, a sandcastle and dunes. Kites hang in the sky beside the camera's look point.
export const BAY = { boardwalk: (s) => -(2.0 + 0.42 * Math.sin(0.13 * s + 0.8)) };
function blendBay({ bag, line, stops, stationCount, group, sky, R, W }) {
  const { frame, at, nearExtra } = helpers(line, stops, stationCount);
  const bake = new Bake(bag);
  const S = line.samples;
  const L0 = line.start + 4, L1 = line.end - 6, span = L1 - L0;
  const bw = BAY.boardwalk, shore = (s) => bw(s) - 0.62;
  const wood = '#C99A5B', woodDark = '#9A6B4A', woodLight = '#E3BC84';
  const gapS = (i) => stops[Math.min(i, stationCount - 1)] + 4.5;
  const usable = (s) => !nearExtra(s, 7);

  // ---- the bay: a turquoise plane beyond the shoreline, a wet-sand ribbon and a foam ribbon along it
  const edgePts = [];
  for (let k = 0; k < S.xs.length; k += 4) { const f = frame(S.len[k], shore(S.len[k])); edgePts.push([f.x, f.z]); }
  const first = edgePts[0], last = edgePts[edgePts.length - 1], zN = 30, zF = -line.end - 48, xFar = -W / 2 + 1.2;
  const shape = new THREE.Shape();
  shape.moveTo(xFar, -zN); shape.lineTo(first[0], -zN); shape.lineTo(first[0], -first[1]);
  for (const [x, z] of edgePts) shape.lineTo(x, -z);
  shape.lineTo(last[0], -zF); shape.lineTo(xFar, -zF); shape.closePath();
  const seaGeo = bag.add(new THREE.ShapeGeometry(shape)); seaGeo.rotateX(-Math.PI / 2);
  const sea = new THREE.Mesh(seaGeo, bag.paint('#47CDCB', { roughness: 0.4, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  sea.position.y = 0.03; sea.receiveShadow = true; group.add(sea);
  const ribbon = (o1, o2, y, color, off) => {
    const pos = [], idx = [];
    edgePts.forEach((_, i) => {
      const k = Math.min(S.xs.length - 1, i * 4), s = S.len[k], f1 = frame(s, shore(s) + o1), f2 = frame(s, shore(s) + o2);
      pos.push(f1.x, y, f1.z, f2.x, y, f2.z);
      if (i) { const a = (i - 1) * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    });
    const g = bag.add(new THREE.BufferGeometry());
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, bag.paint(color, { roughness: 0.6, polygonOffset: true, polygonOffsetFactor: off, polygonOffsetUnits: off, side: THREE.DoubleSide }));
    m.receiveShadow = true; group.add(m);
  };
  ribbon(0.0, 1.1, 0.02, '#EBCB98', -1); // wet sand
  ribbon(-0.38, 0.06, 0.045, '#F6FCFF', -3); // foam
  // white wave crests, in short rows
  {
    const n = 150, m = new THREE.InstancedMesh(bag.geo('crest', () => box(bag, 0.5, 0.02, 0.1)), bag.paint('#FFFFFF', { roughness: 0.5, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }), n);
    const mm = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3();
    for (let i = 0; i < n; i++) { const s = L0 + R() * span, f = frame(s, shore(s) - (2.4 + R() * 20)); q.setFromEuler(e.set(0, f.heading + Math.PI / 2 + (R() - 0.5) * 0.3, 0)); m.setMatrixAt(i, mm.compose(v.set(f.x, 0.062, f.z), q, sc.set(0.7 + R() * 0.8, 1, 1))); }
    group.add(m);
  }

  // ---- the curved boardwalk: planks across the path, a low rail on the sea side with posts, lamps with bunting
  const P = (s, v = 0) => frame(s, bw(s) + v);
  const planks = [];
  for (let s = line.start + 1; s < line.end - 1; s += 0.42) planks.push(s);
  for (const s of planks) {
    const a = P(s - 0.2), b = P(s + 0.2), f = P(s), yaw = Math.atan2(b.x - a.x, b.z - a.z), k = Math.round(s / 0.42);
    bake.add(box(bag, 1.0, 0.1, 0.36), { p: [f.x, 0.07, f.z], r: [0, yaw + Math.PI / 2 * 0 + (k % 7 === 0 ? 0.02 : 0), 0], color: [wood, woodLight, '#D4A769', wood][k % 4] });
  }
  // the long rails and the posts between
  let prevA = null, prevB = null;
  for (let s = line.start + 1; s < line.end - 1; s += 1.26) {
    const sea1 = P(s, -0.53), land = P(s, 0.53);
    bake.add(cyl(bag, 0.05, 0.06, 0.62, 6), { p: [sea1.x, 0.38, sea1.z], color: woodDark });
    if (prevA) {
      for (const [p0, p1, y, c] of [[prevA, sea1, 0.66, '#F4F0E6']]) {
        const dx = p1.x - p0.x, dz = p1.z - p0.z, len = Math.hypot(dx, dz);
        bake.add(box(bag, 0.07, 0.07, len + 0.05), { p: [(p0.x + p1.x) / 2, y, (p0.z + p1.z) / 2], r: [0, Math.atan2(dx, dz), 0], color: c });
      }
    }
    if (prevB) {
      const dx = land.x - prevB.x, dz = land.z - prevB.z, len = Math.hypot(dx, dz);
      bake.add(box(bag, 0.12, 0.1, len + 0.04), { p: [(land.x + prevB.x) / 2, 0.1, (land.z + prevB.z) / 2], r: [0, Math.atan2(dx, dz), 0], color: '#B98B55' }); // kerb on the land side
    }
    prevA = sea1; prevB = land;
  }
  // lamps with a glowing lantern, and bunting strung between them
  const lampS = [];
  for (let s = line.start + 3; s < line.end - 3; s += 5.2) lampS.push(s);
  const flagCols = ['#F0556A', '#FFD166', '#4FC9E8', '#7ED957', '#B79CF5', '#FF9F6B'];
  lampS.forEach((s, i) => {
    const f = P(s, -0.53);
    bake.add(cyl(bag, 0.05, 0.07, 1.75, 7), { p: [f.x, 0.88, f.z], color: '#3F8F9A', smooth: true });
    bake.add(ball(bag, 10, 8), { p: [f.x, 1.86, f.z], s: [0.17, 0.2, 0.17], color: '#FFE7A0', smooth: true });
    bake.add(cone(bag, 0.22, 0.16, 8), { p: [f.x, 2.06, f.z], color: '#2F6F7C', smooth: true });
    if (i) {
      const a = P(lampS[i - 1], -0.53), top = (p, d) => [p.x, 1.74 - d, p.z];
      const N = 9;
      for (let k = 0; k < N; k++) {
        const t0 = k / N, t1 = (k + 1) / N, sag = (t) => 0.3 * Math.sin(Math.PI * t);
        const p0 = [a.x + (f.x - a.x) * t0, 1.74 - sag(t0), a.z + (f.z - a.z) * t0], p1 = [a.x + (f.x - a.x) * t1, 1.74 - sag(t1), a.z + (f.z - a.z) * t1];
        const mid = [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2 - 0.26, (p0[2] + p1[2]) / 2];
        bake.tri(p0, p1, mid, flagCols[(i + k) % flagCols.length]);
      }
      void top;
    }
  });

  // ---- a beach hut on stilts over the water, a jetty to the boardwalk
  const hut = (s, wall, roof, door, flag) => {
    const f = frame(s, shore(s) - 1.0), L = local(f, true), { lp, th } = L, R0 = [0, th, 0];
    for (const [x, z] of [[-0.62, -0.62], [0.62, -0.62], [-0.62, 0.62], [0.62, 0.62]]) bake.add(cyl(bag, 0.075, 0.08, 1.15, 7), { p: lp(x, 0.4, z), color: woodDark });
    bake.add(box(bag, 1.95, 0.12, 1.85), { p: lp(0, 0.92, 0), r: R0, color: woodLight });
    cottage(bake, bag, L, { D: 1.45, W: 1.35, H: 1.0, wall, roof, door, y0: 0.98, rise: 0.8, chimney: false });
    // striped awning over the door, on the track face
    for (let k = 0; k < 5; k++) bake.add(box(bag, 0.5, 0.05, 0.28), { p: lp(1.08, 1.82, -0.62 + k * 0.28 + 0.03), r: [0, th, 0.45 * 0], color: k % 2 ? '#FFFFFF' : roof });
    // a ladder down to the water, a pennant on the roof
    bake.add(box(bag, 0.06, 0.8, 0.06), { p: lp(1.0, 0.5, 0.95), r: R0, color: woodDark });
    bake.add(cyl(bag, 0.02, 0.02, 0.5, 5), { p: lp(0, 3.0, 0), color: '#8A5A35' });
    const a = lp(0.0, 3.2, 0), b = lp(0.0, 3.0, 0.0);
    bake.tri([a[0], 3.25, a[2]], [a[0] + 0.0, 3.05, a[2]], lp(0, 3.15, -L.camZ * 0.45), flag);
    // a jetty of planks from the hut back to the boardwalk (along local x)
    void b;
    for (let k = 0; k < 4; k++) bake.add(box(bag, 0.3, 0.07, 0.8), { p: lp(1.12 + k * 0.3, 0.78, -0.4 * L.camZ), r: R0, color: k % 2 ? woodLight : wood });
  };
  hut(gapS(0) - 0.5, '#F78C7C', '#2FB5B0', '#FFF8EC', '#FFD166');
  hut(gapS(0) + 2.7, '#B79CF5', '#FFD166', '#6C5CE7', '#F0556A');
  hut(gapS(2) - 0.2, '#8FE0C0', '#F0556A', '#FFF8EC', '#6C5CE7');
  hut(gapS(3) + 1.6, '#FFE08A', '#6C5CE7', '#F0556A', '#4FC9E8');
  hut(gapS(4) - 1.2, '#8EC9FF', '#F0556A', '#FFD166', '#F0556A');
  hut(gapS(5) + 0.8, '#F9B8C6', '#2FB5B0', '#6C5CE7', '#FFD166');

  // ---- the landing stage with the bell, and the ferry moored beside it
  {
    const s = gapS(1) + 0.3, f = frame(s, bw(s) - 1.45), { lp, th } = local(f, true), R0 = [0, th, 0];
    // a square landing deck on posts, planked, with a white rail on its sea sides and a bollard
    for (let k = 0; k < 7; k++) bake.add(box(bag, 1.95, 0.1, 0.4), { p: lp(0, 0.55, -1.2 + k * 0.4), r: R0, color: k % 2 ? woodLight : wood });
    for (const x of [-0.85, 0.85]) for (const z of [-1.1, 1.1]) bake.add(cyl(bag, 0.1, 0.11, 1.2, 7), { p: lp(x, 0.0, z), color: woodDark });
    for (const z of [-1.1, 1.1]) { bake.add(box(bag, 1.95, 0.07, 0.07), { p: lp(0, 1.0, z), r: R0, color: '#F4F0E6' }); }
    bake.add(box(bag, 0.07, 0.07, 2.35), { p: lp(-0.92, 1.0, 0), r: R0, color: '#F4F0E6' });
    for (const [x, z] of [[-0.92, -1.1], [-0.92, 0], [-0.92, 1.1], [0.0, -1.1], [0.0, 1.1], [0.92, -1.1], [0.92, 1.1]]) bake.add(cyl(bag, 0.045, 0.05, 0.5, 6), { p: lp(x, 0.8, z), color: woodDark });
    // the bell frame: two posts, a cross beam, a little red roof, a brass bell on a bracket, a rope
    const hx = -0.3;
    for (const z of [-0.62, 0.62]) bake.add(box(bag, 0.16, 2.6, 0.16), { p: lp(hx, 1.85, z), r: R0, color: '#8A5A35' });
    bake.add(box(bag, 0.2, 0.2, 1.7), { p: lp(hx, 3.05, 0), r: R0, color: '#8A5A35' });
    for (const z of [-0.62, 0.62]) bake.add(box(bag, 0.1, 0.1, 0.55), { p: lp(hx, 2.65, z * 0.62), r: [0.8 * Math.sign(z), th, 0], color: '#8A5A35' });
    bake.add(prism(bag, 2.1, 0.65, 1.1), { p: lp(hx, 3.15, 0), r: [0, th + Math.PI / 2, 0], color: '#E5484D' });
    bake.add(box(bag, 0.5, 0.06, 0.5), { p: lp(hx, 2.88, 0), r: R0, color: '#8A5A35' });
    bake.add(cyl(bag, 0.03, 0.03, 0.34, 5), { p: lp(hx, 2.88, 0), color: '#3A2A1A' });
    bake.add(bag.geo('bellb', () => new THREE.SphereGeometry(1, 14, 8, 0, TAU, 0, Math.PI * 0.62)), { p: lp(hx, 2.28, 0), s: [0.46, 0.64, 0.46], color: '#F4B73A', smooth: true });
    bake.add(cyl(bag, 0.5, 0.5, 0.07, 14), { p: lp(hx, 2.3, 0), color: '#D99A1E', smooth: true });
    bake.add(ball(bag, 8, 6), { p: lp(hx, 2.15, 0), s: [0.1, 0.1, 0.1], color: '#6B4A1E', smooth: true });
    bake.add(cyl(bag, 0.018, 0.018, 0.9, 4), { p: lp(hx, 1.7, 0), color: '#E8D8B0' });
    bake.add(box(bag, 0.1, 0.1, 0.1), { p: lp(hx, 1.2, 0), r: R0, color: '#F0556A' });
    // a lantern on the landing's corner
    bake.add(cyl(bag, 0.04, 0.05, 1.3, 6), { p: lp(0.8, 1.2, 1.0), color: '#3F8F9A', smooth: true });
    bake.add(ball(bag, 10, 8), { p: lp(0.8, 1.95, 1.0), s: [0.16, 0.19, 0.16], color: '#FFE7A0', smooth: true });
    // the ferry, moored beside the landing with its long side to the boardwalk (bow toward the camera)
    const ff = frame(s + 3.9, bw(s + 3.9) - 1.8), FL = local(ff, true), t2 = FL.th - Math.PI / 2;
    const hull = poly(bag, 'ferryhull', [[-2.3, 0.62], [1.9, 0.62], [2.55, 0.5], [1.7, 0.0], [-2.0, 0.0]], 1.5);
    const place = (lx, ly, lz) => { const c = Math.cos(t2), sn = Math.sin(t2); return [ff.x + lx * c + lz * sn, ly, ff.z - lx * sn + lz * c]; };
    const RY = [0, t2, 0];
    bake.add(hull, { p: place(0, 0, 0), r: RY, color: '#FFFFFF' });
    bake.add(poly(bag, 'ferrystripe', [[-2.2, 0.3], [1.75, 0.3], [2.05, 0.42], [-2.25, 0.42]], 1.52), { p: place(0, 0, 0), r: RY, color: '#2FB5B0' });
    bake.add(poly(bag, 'ferrybottom', [[-2.0, 0.0], [1.7, 0.0], [1.84, 0.3], [-2.15, 0.3]], 1.52), { p: place(0, 0, 0), r: RY, color: '#E5484D' });
    bake.add(box(bag, 3.1, 0.62, 1.2), { p: place(-0.25, 0.93, 0), r: RY, color: '#FFF8EC' });
    bake.add(box(bag, 2.4, 0.5, 1.0), { p: place(-0.45, 1.5, 0), r: RY, color: '#FFFFFF' });
    bake.add(box(bag, 2.7, 0.08, 1.15), { p: place(-0.4, 1.78, 0), r: RY, color: '#6C5CE7' });
    for (let k = 0; k < 6; k++) for (const z of [0.61, -0.61]) bake.add(box(bag, 0.28, 0.24, 0.03), { p: place(-1.35 + k * 0.48, 0.98, z), r: RY, color: '#7EC8F0' });
    for (let k = 0; k < 4; k++) for (const z of [0.51, -0.51]) bake.add(box(bag, 0.28, 0.2, 0.03), { p: place(-1.4 + k * 0.5, 1.52, z), r: RY, color: '#7EC8F0' });
    bake.add(cyl(bag, 0.28, 0.32, 0.8, 10), { p: place(-0.7, 2.25, 0), r: RY, color: '#E5484D', smooth: true });
    bake.add(cyl(bag, 0.3, 0.3, 0.14, 10), { p: place(-0.7, 2.4, 0), r: RY, color: '#2B2D5C', smooth: true });
    bake.add(bag.geo('lifering', () => new THREE.TorusGeometry(0.2, 0.07, 6, 14)), { p: place(0.9, 1.1, 0.62), r: RY, color: '#FF8A3D', smooth: true });
    bake.add(cyl(bag, 0.02, 0.02, 1.1, 4), { p: place(1.7, 1.2, 0), r: RY, color: '#8A5A35' });
    bake.tri(place(1.7, 1.75, 0), place(1.7, 1.55, 0), place(2.1, 1.65, 0), '#F0556A');
  }

  // ---- a lifeguard tower on stilts on the beach side of the boardwalk, striped like a deckchair
  {
    const s = gapS(3) - 1.6, f = frame(s, 6.2), L = local(f, false), { lp, th } = L, R0 = [0, th, 0];
    for (const [x, z] of [[-0.45, -0.45], [0.45, -0.45], [-0.45, 0.45], [0.45, 0.45]]) bake.add(cyl(bag, 0.07, 0.09, 1.5, 6), { p: lp(x, 0.75, z), color: '#F4F0E6' });
    bake.add(box(bag, 1.3, 0.1, 1.3), { p: lp(0, 1.5, 0), r: R0, color: '#E3BC84' });
    bake.add(box(bag, 1.0, 0.8, 1.0), { p: lp(0, 1.95, 0), r: R0, color: '#FFF8EC' });
    for (let k = 0; k < 4; k++) bake.add(box(bag, 1.04, 0.2, 1.04), { p: lp(0, 1.65 + k * 0.2, 0), r: R0, color: k % 2 ? '#FFF8EC' : '#F0556A' });
    bake.add(prism(bag, 1.5, 0.5, 1.5), { p: lp(0, 2.4, 0), r: [0, th + Math.PI / 2, 0], color: '#F0556A' });
    bake.add(box(bag, 0.06, 0.5, 0.06), { p: lp(0.55, 2.0, 0.5 * L.camZ), r: R0, color: '#2B2D5C' });
    // a ladder on the track face
    for (let k = 0; k < 4; k++) bake.add(box(bag, 0.06, 0.06, 0.5), { p: lp(0.7, 0.3 + k * 0.38, 0), r: R0, color: woodDark });
  }
  // buoys floating in the bay
  for (const [s, v, c] of [[gapS(0) + 5.2, -2.2, '#F0556A'], [gapS(2) + 3.5, -2.5, '#FFD166'], [gapS(4) + 2.5, -2.0, '#F0556A'], [gapS(5) - 2.5, -2.6, '#FFD166'], [gapS(1) - 3.6, -2.3, '#F0556A']]) {
    const f = frame(s, shore(s) + v);
    bake.add(ball(bag, 12, 8), { p: [f.x, 0.14, f.z], s: [0.26, 0.26, 0.26], color: c, smooth: true });
    bake.add(cyl(bag, 0.265, 0.265, 0.09, 12), { p: [f.x, 0.14, f.z], color: '#FFFFFF', smooth: true });
    bake.add(cyl(bag, 0.03, 0.03, 0.28, 5), { p: [f.x, 0.44, f.z], color: '#3A2A1A' });
  }

  // ---- the stations' side, beyond the signs: dunes, palms, an ice-cream kiosk, surfboards, umbrellas, a sandcastle
  const dunes = ['#F2D49B', '#EFCB8C', '#F6DDAA'];
  for (let i = 0, s = L0; s < L1; i++, s += 6.5 + R() * 2) {
    if (!usable(s)) continue;
    const f = frame(s, 9.5 + R() * 5);
    addHill(bake, bag, { x: f.x, z: f.z, rx: 4 + R() * 3, ry: 0.9 + R() * 0.9, rz: 3 + R() * 2.5, yaw: R() * 3, seed: i, low: dunes[i % 3], high: '#FCEBC6', kind: i % 3 });
  }
  const palm = (x, z, k = 1, lean = 0.3, yaw = 0) => {
    // trunk: five slim tapered segments curving over, a crown of eight drooping fronds and a few coconuts
    let px = x, py = 0, pz = z;
    const dx = Math.cos(yaw) * lean, dz = Math.sin(yaw) * lean;
    for (let i = 0; i < 5; i++) {
      const t = i / 5, t2 = (i + 1) / 5, segH = 0.62 * k, bend = (u) => u * u;
      const nx = x + dx * k * bend(t2) * 2.2, nz = z + dz * k * bend(t2) * 2.2, ny = py + segH;
      const cx = (px + nx) / 2, cz = (pz + nz) / 2, cy = (py + ny) / 2;
      const len = Math.hypot(nx - px, ny - py, nz - pz);
      const g = bag.geo('palmseg', () => new THREE.CylinderGeometry(0.1, 0.13, 1, 7));
      const ax = Math.atan2(nz - pz, ny - py), az = -Math.atan2(nx - px, ny - py);
      bake.add(g, { p: [cx, cy, cz], r: [ax, 0, az], s: [k * (1 - t * 0.35), len, k * (1 - t * 0.35)], color: i % 2 ? '#B58355' : '#A8754A' });
      void t2; px = nx; py = ny; pz = nz;
    }
    const frond = bag.geo('frond', () => poly(bag, 'frondshape', [[0, 0], [0.5, 0.18], [1.2, 0.1], [1.9, -0.32], [1.2, -0.04], [0.5, -0.1]], 0.02));
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU + yaw;
      bake.add(frond, { p: [px, py, pz], r: [0, a, 0.0], s: [k * 1.0, k, k * 2.6], color: i % 2 ? '#3FB86B' : '#52C97C', colorFn: (c) => lerpHex('#2F9D5A', '#6FD58A', Math.min(1, Math.hypot(c.x - px, c.z - pz) / (1.9 * k))) });
    }
    for (const [ox, oz] of [[0.14, 0.1], [-0.12, 0.14], [0.02, -0.16]]) bake.add(ball(bag, 8, 6), { p: [px + ox * k, py - 0.14 * k, pz + oz * k], s: [0.12 * k, 0.12 * k, 0.12 * k], color: '#6B4A28', smooth: true });
  };
  // palms and umbrellas in the gaps beside the signs' side, an ice-cream kiosk first
  {
    const g0 = (i, off) => { const s = gapS(i); return usable(s) ? local(frame(s, off), false) : null; };
    const k0 = g0(0, 6.1);
    if (k0) {
      const { lp, th } = k0, R0 = [0, th, 0];
      bake.add(box(bag, 1.8, 1.3, 2.0), { p: lp(0, 0.65, 0), r: R0, color: '#8FE0C0' });
      bake.add(box(bag, 1.84, 0.12, 2.04), { p: lp(0, 0.06, 0), r: R0, color: '#B7A98F' });
      bake.add(box(bag, 2.0, 0.12, 2.2), { p: lp(0.05, 1.34, 0), r: R0, color: '#F0556A' });
      for (let k = -3; k <= 3; k++) bake.add(box(bag, 0.62, 0.06, 0.3), { p: lp(1.3, 1.02, k * 0.3), r: [0, th, -0.5 * 0], color: k % 2 ? '#FFFFFF' : '#F0556A' });
      bake.add(box(bag, 0.5, 0.08, 2.1), { p: lp(1.0, 0.7, 0), r: R0, color: '#E3BC84' }); // counter
      bake.add(box(bag, 0.07, 0.5, 0.9), { p: lp(0.91, 0.95, 0), r: R0, color: '#FFF8EC' }); // window
      bake.add(box(bag, 0.09, 0.34, 0.7), { p: lp(0.94, 0.97, 0), r: R0, color: '#8FD0F0' });
      // the big cone on the roof: a waffle cone upside down and two scoops
      bake.add(cone(bag, 0.34, 0.9, 10), { p: lp(0, 1.4 + 0.45 + 0.0, 0), r: [Math.PI, 0, 0], color: '#E8B26A', smooth: true });
      bake.add(ball(bag, 12, 8), { p: lp(0, 2.55, 0), s: [0.4, 0.38, 0.4], color: '#FF9EC4', smooth: true });
      bake.add(ball(bag, 12, 8), { p: lp(0, 2.95, 0), s: [0.33, 0.32, 0.33], color: '#FFF2C6', smooth: true });
      bake.add(ball(bag, 8, 6), { p: lp(0, 3.3, 0), s: [0.1, 0.1, 0.1], color: '#E5484D', smooth: true });
    }
    const sb = g0(2, 6.2);
    if (sb) {
      // a rack of surfboards: an A-frame of timber with six boards leaning in it, in bright colours with a stripe
      const { lp, th } = sb, R0 = [0, th, 0];
      for (const z of [-1.5, 1.5]) { bake.add(box(bag, 0.12, 1.9, 0.12), { p: lp(0.3, 0.95, z), r: [0, th, 0.2], color: woodDark }); bake.add(box(bag, 0.12, 1.9, 0.12), { p: lp(-0.5, 0.95, z), r: [0, th, -0.2], color: woodDark }); }
      bake.add(box(bag, 0.1, 0.1, 3.2), { p: lp(-0.1, 1.5, 0), r: R0, color: wood });
      bake.add(box(bag, 0.1, 0.1, 3.2), { p: lp(-0.1, 0.7, 0), r: R0, color: wood });
      const cols = ['#F0556A', '#FFD166', '#4FC9E8', '#6C5CE7', '#7ED957', '#FF9F6B'];
      const board = bag.geo('board', () => { const g = new THREE.SphereGeometry(1, 12, 8); g.scale(0.28, 1, 0.05); return g; });
      cols.forEach((c, i) => {
        bake.add(board, { p: lp(-0.12, 1.15, -1.25 + i * 0.5), r: [0, th, 0.06 + (i % 2) * 0.04], s: [1, 1.15, 1], color: c });
        bake.add(board, { p: lp(-0.08, 1.15, -1.25 + i * 0.5), r: [0, th, 0.06 + (i % 2) * 0.04], s: [1.02, 0.5, 1.4], color: '#FFFFFF' });
      });
    }
    // palms by the signs' side between the stations (clear of the signs at +3.05)
    for (const [i, off, k, lean, yaw] of [[0, 8.2, 1.15, 0.4, 3.1], [1, 6.4, 1.0, 0.35, 3.3], [1, 8.9, 1.3, 0.3, 2.9], [3, 6.3, 1.1, 0.4, 3.0], [4, 7.4, 1.2, 0.35, 3.2], [5, 6.6, 1.0, 0.4, 2.9], [6, 7.2, 1.2, 0.3, 3.1], [2, 9.4, 1.2, 0.3, 3.0]]) {
      const s = gapS(i) + (off > 8 ? 2.0 : -1.8);
      if (!usable(s)) continue;
      const f = frame(s, off);
      palm(f.x, f.z, k, lean, yaw + f.heading * 0);
    }
    // umbrellas with a towel, and a sandcastle
    const um = (i, du, off, a, b) => { const s = gapS(i) + du; if (!usable(s)) return; const f = frame(s, off), [x, z] = at(f, 0, 0); umbrella(bake, bag, x, z, a, b, 0.1); const tw = at(f, 0.4, -0.7); bake.add(box(bag, 0.7, 0.03, 1.2), { p: [tw[0], 0.03, tw[1]], r: [0, f.heading + 0.4, 0], color: b === '#FFFFFF' ? a : '#FFFFFF' }); };
    um(1, 2.6, 5.9, '#F0556A', '#FFFFFF'); um(3, 2.4, 5.8, '#4FC9E8', '#FFFFFF'); um(5, 2.4, 5.8, '#FFD166', '#FFFFFF'); um(0, 2.9, 5.9, '#6C5CE7', '#FFFFFF'); um(6, 2.2, 5.7, '#F0556A', '#FFD166');
    {
      const s = gapS(4) + 2.0; if (usable(s)) {
        const f = frame(s, 5.7), [x, z] = at(f, 0, 0);
        bake.add(cyl(bag, 0.55, 0.62, 0.34, 10), { p: [x, 0.17, z], color: '#EBCB8F', smooth: true });
        bake.add(cyl(bag, 0.4, 0.46, 0.32, 10), { p: [x, 0.5, z], color: '#E7C381', smooth: true });
        bake.add(cyl(bag, 0.26, 0.3, 0.3, 10), { p: [x, 0.8, z], color: '#EBCB8F', smooth: true });
        bake.add(cone(bag, 0.26, 0.3, 10), { p: [x, 1.1, z], color: '#E7C381', smooth: true });
        bake.add(cyl(bag, 0.015, 0.015, 0.5, 4), { p: [x, 1.45, z], color: '#8A5A35' });
        bake.tri([x, 1.68, z], [x, 1.5, z], [x + 0.28, 1.6, z], '#F0556A');
        for (const a of [0, 1.6, 3.1, 4.7]) bake.add(cyl(bag, 0.13, 0.15, 0.3, 7), { p: [x + Math.cos(a) * 0.82, 0.15, z + Math.sin(a) * 0.82], color: '#EBCB8F', smooth: true });
      }
    }
  }
  bake.finish(group);

  // ---- beach grass tufts (one instanced mesh)
  {
    const tuft = bag.geo('tuft', () => {
      const parts = [[0, 0, 0.55, 0], [0.09, 0.03, 0.4, 0.35], [-0.09, -0.02, 0.45, -0.3]], pos = [], nor = [];
      for (const [px, pz, h, lean] of parts) { const c = new THREE.ConeGeometry(0.05, h, 4).toNonIndexed(); c.rotateZ(lean); c.translate(px, h / 2, pz); const a = c.getAttribute('position'), n = c.getAttribute('normal'); for (let i = 0; i < a.count; i++) { pos.push(a.getX(i), a.getY(i), a.getZ(i)); nor.push(n.getX(i), n.getY(i), n.getZ(i)); } c.dispose(); }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
      return g;
    });
    const n = 34, m = new THREE.InstancedMesh(tuft, bag.paint('#ffffff', { roughness: 0.9, flatShading: true }), n);
    const mm = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const s = L0 + R() * span, off = R() < 0.7 ? 4.6 + R() * 8 : -(1.5 + R() * 0.15);
      if (!usable(s) || (off > 0 && off < 7 && stops.slice(0, stationCount).some((t) => Math.abs(s - t) < 3))) { m.setMatrixAt(i, mm.makeScale(0, 0, 0)); continue; }
      const f = frame(s, off), k = 0.8 + R() * 0.5;
      m.setMatrixAt(i, mm.compose(v.set(f.x, 0, f.z), q.setFromEuler(e.set(0, R() * 6, 0)), sc.set(k, k * 0.8, k)));
      m.setColorAt(i, col.set(['#B9CC6E', '#C9D87E', '#A5BF62'][i % 3]));
    }
    m.castShadow = false;
    group.add(m);
  }

  // ---- kites in the sky beside the look point (like the clouds): diamond panels in four colours, a tail of bows, a spar
  {
    const kb = new Bake(bag);
    const kite = (x, y, z, rot, cols, tail) => {
      const rz = (px, py) => [x + px * Math.cos(rot) - py * Math.sin(rot), y + (px * Math.sin(rot) + py * Math.cos(rot)) * 0.84, z + (py * 0.55)];
      const top = rz(0, 0.95), bot = rz(0, -0.95), l = rz(-0.62, 0.1), r = rz(0.62, 0.1), c = rz(0, 0.1);
      kb.tri(top, l, c, cols[0]); kb.tri(top, c, r, cols[1]); kb.tri(l, bot, c, cols[2]); kb.tri(c, bot, r, cols[3]);
      // the tail: a wavy string with little bows
      let prev = bot;
      for (let i = 1; i <= tail; i++) {
        const p = rz(Math.sin(i * 1.3) * 0.28, -0.95 - i * 0.42);
        kb.tri([prev[0] - 0.02, prev[1], prev[2]], [prev[0] + 0.02, prev[1], prev[2]], [p[0], p[1], p[2]], '#8A5A35');
        const bc = i % 2 ? '#FFD166' : '#F0556A';
        kb.tri([p[0], p[1], p[2]], [p[0] - 0.2, p[1] - 0.12, p[2]], [p[0] - 0.2, p[1] + 0.12, p[2]], bc);
        kb.tri([p[0], p[1], p[2]], [p[0] + 0.2, p[1] - 0.12, p[2]], [p[0] + 0.2, p[1] + 0.12, p[2]], bc);
        prev = p;
      }
    };
    kite(-4.4, 10.2, -6.5, 0.3, ['#F0556A', '#FFD166', '#FFD166', '#F0556A'], 5);
    kite(3.2, 12.0, -9.5, -0.25, ['#6C5CE7', '#B79CF5', '#4FC9E8', '#6C5CE7'], 4);
    kite(-1.6, 14.0, -13, 0.15, ['#7ED957', '#FFFFFF', '#FF9F6B', '#7ED957'], 4);
    kb.finish(sky, { shadow: false });
  }
}

// ---------------------------------------------------------------- W6 Endings Junction
// A little railway junction town on warm gravel. Far side: a passing siding with wagons under a signal gantry, a turntable with a
// fan-shaped roundhouse, a water tower, semaphore signals, telegraph poles. Stations' side, beyond the signs: a warehouse with a
// painted (wordless) sign and a loading dock, the clock-tower station hall, a level crossing with striped gates, terrace houses,
// a second warehouse with a different painted sign.
const BRICK = '#C75B4A', BRICK_D = '#A9473A', CREAM = '#F4E6CF', SLATE = '#5B6B8C', SLATE_D = '#46547A', MUSTARD = '#E9B949', NAVY = '#2B2D5C';

function endingsJunction({ bag, line, stops, stationCount, group, sky, R, W }) {
  const { frame, at, nearStop, nearExtra } = helpers(line, stops, stationCount);
  const bake = new Bake(bag);
  const L0 = line.start + 4, L1 = line.end - 6, span = L1 - L0;
  const gapS = (i) => stops[Math.min(i, stationCount - 1)] + 4.5;
  const usable = (s) => !nearExtra(s, 7);
  const wood = '#C99A5B', woodDark = '#8A5A35';
  const yawOf = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);

  // ---- a piece of track along a path (offset from the line as a function of s): sleepers, two rails, a ballast ribbon
  const railPath = (offFn, s0, s1) => {
    let prev = null;
    for (let s = s0; s <= s1 + 1e-6; s += 0.5) {
      const f = frame(s, offFn(s)), nx = frame(s + 0.25, offFn(s + 0.25)), pv = frame(s - 0.25, offFn(s - 0.25)), yaw = yawOf(pv, nx);
      bake.add(box(bag, 1.5, 0.06, 0.2), { p: [f.x, 0.05, f.z], r: [0, yaw, 0], color: '#B8926A' });
      if (prev) {
        const dx = f.x - prev.x, dz = f.z - prev.z, len = Math.hypot(dx, dz), my = Math.atan2(dx, dz);
        bake.add(box(bag, 1.2, 0.025, len + 0.04), { p: [(f.x + prev.x) / 2, 0.02, (f.z + prev.z) / 2], r: [0, my, 0], color: '#C9BFA6' });
        for (const k of [-0.46, 0.46]) bake.add(box(bag, 0.07, 0.1, len + 0.03), { p: [(f.x + prev.x) / 2 + Math.cos(my) * k, 0.13, (f.z + prev.z) / 2 - Math.sin(my) * k], r: [0, my, 0], color: '#8A6E5A' });
      }
      prev = f;
    }
  };
  // ---- a wagon on a path point (long axis along the line)
  const wagon = (s, off, kind, body, accent) => {
    const f = frame(s, off), L = local(f, false), { lp, th } = L, R0 = [0, th, 0];
    bake.add(box(bag, 1.0, 0.14, 2.4), { p: lp(0, 0.28, 0), r: R0, color: '#3A3D52' });
    for (const x of [-0.46, 0.46]) for (const z of [-0.8, 0.8]) { bake.add(cyl(bag, 0.19, 0.19, 0.08, 10), { p: lp(x, 0.19, z), r: [0, th, Math.PI / 2], color: '#2A2C40', smooth: true }); }
    for (const z of [-1.28, 1.28]) bake.add(box(bag, 0.5, 0.08, 0.12), { p: lp(0, 0.3, z), r: R0, color: '#8A6E5A' });
    if (kind === 'box') {
      bake.add(box(bag, 0.98, 0.95, 2.2), { p: lp(0, 0.82, 0), r: R0, color: body });
      bake.add(prism(bag, 1.1, 0.28, 2.3), { p: lp(0, 1.3, 0), r: R0, color: accent });
      for (const x of [-0.5, 0.5]) { bake.add(box(bag, 0.04, 0.8, 0.9), { p: lp(x * 1.02, 0.8, 0), r: R0, color: CREAM }); bake.add(box(bag, 0.05, 0.05, 0.9), { p: lp(x * 1.03, 0.82, 0), r: R0, color: '#6B4A38' }); }
      for (const z of [-0.95, 0.95]) bake.add(box(bag, 1.0, 0.95, 0.06), { p: lp(0, 0.82, z), r: R0, color: accent });
    } else if (kind === 'tank') {
      bake.add(cyl(bag, 0.5, 0.5, 2.2, 14), { p: lp(0, 0.88, 0), r: [Math.PI / 2, th, 0], color: body, smooth: true });
      for (const z of [-0.7, 0.7]) bake.add(cyl(bag, 0.515, 0.515, 0.1, 14), { p: lp(0, 0.88, z), r: [Math.PI / 2, th, 0], color: accent, smooth: true });
      bake.add(cyl(bag, 0.16, 0.18, 0.2, 8), { p: lp(0, 1.45, 0), color: '#3A3D52', smooth: true });
      bake.add(box(bag, 0.07, 0.07, 1.9), { p: lp(0, 1.48, 0), r: R0, color: '#3A3D52' });
    } else {
      for (const [x, z, h, c] of [[-0.2, -0.6, 0.55, wood], [0.22, -0.55, 0.5, '#D4A769'], [-0.15, 0.0, 0.5, '#B98B55'], [0.25, 0.2, 0.55, wood], [0.0, 0.75, 0.6, '#D4A769']]) {
        bake.add(box(bag, 0.5, h, 0.5), { p: lp(x, 0.35 + h / 2, z), r: [0, th + x * 2, 0], color: c });
        bake.add(box(bag, 0.52, 0.06, 0.52), { p: lp(x, 0.35 + h * 0.5, z), r: [0, th + x * 2, 0], color: '#8A5A35' });
      }
      for (const z of [-1.0, 1.0]) bake.add(box(bag, 1.0, 0.04, 0.06), { p: lp(0, 0.38, z), r: R0, color: accent });
    }
  };

  // ---- a painted, wordless sign on a wall that faces the camera: a cream frame, a coloured board, a bold pictogram (crate, barrel, sacks)
  const paintedSign = (L, ox, oy, oz, kind, bg) => {
    const { lp, th, camZ } = L, R0 = [0, th, 0], o = camZ * 0.06, P = (x, y, d = 0) => lp(ox + x, oy + y, oz + camZ * (0.04 + d));
    bake.add(box(bag, 2.15, 1.3, 0.08), { p: P(0, 0, 0), r: R0, color: '#FFF8EC' });
    bake.add(box(bag, 1.97, 1.12, 0.1), { p: P(0, 0, 0.02), r: R0, color: bg });
    void o;
    if (kind === 'crate') {
      bake.add(box(bag, 0.8, 0.8, 0.12), { p: P(0, 0, 0.05), r: R0, color: '#E8A653' });
      for (const a of [Math.PI / 4, -Math.PI / 4]) bake.add(box(bag, 0.1, 1.05, 0.14), { p: P(0, 0, 0.08), r: [0, th, a], color: '#7A4A24' });
      for (const y of [-0.4, 0.4]) bake.add(box(bag, 0.86, 0.08, 0.14), { p: P(0, y, 0.08), r: R0, color: '#7A4A24' });
      for (const x of [-0.4, 0.4]) bake.add(box(bag, 0.08, 0.86, 0.14), { p: P(x, 0, 0.08), r: R0, color: '#7A4A24' });
    } else if (kind === 'barrel') {
      bake.add(cyl(bag, 0.42, 0.42, 0.12, 16), { p: P(0, 0, 0.05), r: [Math.PI / 2, th, 0], color: '#E8A653', smooth: true });
      bake.add(box(bag, 0.7, 0.9, 0.12), { p: P(0, 0, 0.05), r: R0, color: '#E8A653' });
      for (const y of [-0.3, 0.3]) bake.add(box(bag, 0.74, 0.09, 0.14), { p: P(0, y, 0.08), r: R0, color: '#6B3A1E' });
      bake.add(box(bag, 0.06, 0.9, 0.14), { p: P(0, 0, 0.08), r: R0, color: '#F7D9A0' });
    } else {
      for (const [x, y, c] of [[-0.55, -0.22, '#E8D08A'], [0.0, -0.22, '#F1DCA0'], [0.55, -0.22, '#E8D08A'], [-0.27, 0.24, '#F1DCA0'], [0.28, 0.24, '#E8D08A']]) {
        bake.add(ball(bag, 10, 8), { p: P(x, y, 0.1), s: [0.27, 0.22, 0.12], color: c, smooth: true });
        bake.add(box(bag, 0.2, 0.07, 0.14), { p: P(x, y + 0.2, 0.12), r: R0, color: '#A9473A' });
      }
    }
  };
  const shed = (s, off, kind, bg, wall) => {
    const f = frame(s, off), L = local(f, false), { lp, th, camZ } = L, R0 = [0, th, 0], D = 2.7, Wd = 4.2, H = 1.7;
    bake.add(box(bag, D, H, Wd), { p: lp(0, H / 2, 0), r: R0, color: wall });
    bake.add(box(bag, D + 0.06, 0.2, Wd + 0.06), { p: lp(0, 0.1, 0), r: R0, color: '#7C6A5C' });
    for (let k = 0; k < 6; k++) bake.add(box(bag, D + 0.02, 0.05, Wd + 0.02), { p: lp(0, 0.45 + k * 0.22, 0), r: R0, color: wall === BRICK ? BRICK_D : '#C6B99E' });
    bake.add(prism(bag, D + 0.7, 0.85, Wd + 0.5), { p: lp(0, H, 0), r: R0, color: SLATE });
    bake.add(box(bag, 0.3, 0.55, 0.3), { p: lp(-0.7, H + 0.75, 1.0), r: R0, color: BRICK_D });
    // big doors on the track face, a dark rail over them, a loading dock in front, crates on it
    bake.add(box(bag, 0.08, 1.15, 1.3), { p: lp(D / 2 + 0.03, 0.78, 1.0 * camZ), r: R0, color: CREAM });
    bake.add(box(bag, 0.08, 1.15, 0.06), { p: lp(D / 2 + 0.07, 0.78, 1.0 * camZ), r: R0, color: '#3A3D52' });
    bake.add(box(bag, 0.08, 0.08, 1.9), { p: lp(D / 2 + 0.05, 1.45, 0.9 * camZ), r: R0, color: '#3A3D52' });
    bake.add(box(bag, 0.9, 0.45, Wd - 0.3), { p: lp(D / 2 + 0.5, 0.225, 0), r: R0, color: '#B7A98F' });
    bake.add(box(bag, 0.95, 0.07, Wd - 0.25), { p: lp(D / 2 + 0.5, 0.48, 0), r: R0, color: wood });
    for (const [z, h] of [[-0.3 * camZ, 0.5], [0.4 * camZ, 0.42], [1.5 * camZ, 0.55]]) { bake.add(box(bag, 0.5, h, 0.5), { p: lp(D / 2 + 0.55, 0.52 + h / 2, z), r: [0, th + z, 0], color: '#D4A769' }); bake.add(box(bag, 0.52, 0.05, 0.52), { p: lp(D / 2 + 0.55, 0.52 + h / 2, z), r: [0, th + z, 0], color: '#8A5A35' }); }
    // the painted sign on the wall that faces the camera, a bold pictogram on a coloured board
    paintedSign(L, 0, 0.95, Wd / 2 * camZ, kind, bg);
    // a lamp over the door
    bake.add(box(bag, 0.18, 0.18, 0.18), { p: lp(D / 2 + 0.15, 1.3, 0.2 * camZ), r: R0, color: '#FFE7A0' });
  };

  // ---- telegraph poles along the far side, with three wires between them
  const poleS = [];
  for (let s = line.start + 2; s < line.end - 2; s += 8.5) if (!nearExtra(s, 12)) poleS.push(s); // none near the portal or the start tunnel (it would stand in front of the arch in the close-up)
  poleS.forEach((s, i) => {
    const f = frame(s, -1.95), L = local(f, true), { lp, th } = L, R0 = [0, th, 0];
    bake.add(box(bag, 0.12, 3.1, 0.12), { p: lp(0, 1.55, 0), r: R0, color: '#8A5A35' });
    bake.add(box(bag, 0.1, 0.1, 1.0), { p: lp(0, 2.9, 0), r: R0, color: '#6B4A38' });
    bake.add(box(bag, 0.1, 0.1, 0.8), { p: lp(0, 2.55, 0), r: R0, color: '#6B4A38' });
    for (const [y, z] of [[2.98, -0.42], [2.98, 0.42], [2.63, -0.32], [2.63, 0.32]]) bake.add(ball(bag, 6, 4), { p: lp(0, y, z), s: [0.06, 0.07, 0.06], color: '#A9D6D0', smooth: true });
    if (i && s - poleS[i - 1] < 10) {
      const a = frame(poleS[i - 1], -1.95), Ln = local(a, true);
      for (const [y, z] of [[2.98, -0.42], [2.98, 0.42]]) {
        const A = Ln.lp(0, y, z), B = lp(0, y, z), N = 4;
        for (let k = 0; k < N; k++) {
          const t0 = k / N, t1 = (k + 1) / N, sg = (t) => 0.22 * Math.sin(Math.PI * t);
          const p0 = [A[0] + (B[0] - A[0]) * t0, A[1] - sg(t0), A[2] + (B[2] - A[2]) * t0], p1 = [A[0] + (B[0] - A[0]) * t1, A[1] - sg(t1), A[2] + (B[2] - A[2]) * t1];
          const dx = p1[0] - p0[0], dy = p1[1] - p0[1], dz = p1[2] - p0[2], len = Math.hypot(dx, dy, dz);
          bake.add(box(bag, 0.016, 0.016, len), { p: [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2, (p0[2] + p1[2]) / 2], r: [-Math.asin(dy / len), Math.atan2(dx, dz), 0], color: '#3A3D52' });
        }
      }
    }
  });

  // ---- far side, gap 0: a passing siding under a signal gantry, with a box car and a tank car
  {
    const sC = gapS(0), off = -3.3, ease = (t) => t * t * (3 - 2 * t);
    const offFn = (s) => -3.3 * ease(Math.max(0, Math.min(1, (s - (sC - 8.5)) / 3.2))) * (1 - ease(Math.max(0, Math.min(1, (s - (sC + 4.8)) / 3.2))));
    railPath(offFn, sC - 8.6, sC + 8.2);
    wagon(sC - 2.4, off, 'box', BRICK, SLATE);
    wagon(sC + 0.35, off, 'tank', MUSTARD, '#3A3D52');
    wagon(sC + 2.9, off, 'flat', '#3F7CC4', '#E9B949');
    // the signal gantry over the siding's start: two lattice legs, a beam, three signal heads (red, amber, green)
    const f = frame(sC - 5.2, 0), L = local(f, true), { lp, th } = L, R0 = [0, th, 0];
    for (const x of [-2.0, -5.0]) {
      for (const z of [-0.14, 0.14]) bake.add(box(bag, 0.12, 3.5, 0.1), { p: lp(x, 1.75, z), r: R0, color: '#6D758F' });
      for (let k = 0; k < 3; k++) bake.add(box(bag, 0.07, 0.07, 0.34), { p: lp(x, 0.5 + k * 1.05, 0), r: R0, color: '#6D758F' });
    }
    bake.add(box(bag, 3.4, 0.22, 0.3), { p: lp(-3.5, 3.55, 0), r: R0, color: '#4A4F66' });
    for (let i = 0; i < 3; i++) {
      const x = -2.65 - i * 0.85, cols = ['#E5484D', '#FFB81C', '#3CC55E'], lit = i === 2 ? 2 : 0;
      bake.add(box(bag, 0.4, 0.95, 0.3), { p: lp(x, 4.15, 0), r: R0, color: NAVY });
      bake.add(box(bag, 0.52, 0.06, 0.42), { p: lp(x, 4.66, 0), r: R0, color: '#3A3D52' });
      for (let k = 0; k < 3; k++) bake.add(cyl(bag, 0.1, 0.1, 0.06, 10), { p: lp(x, 4.45 - k * 0.3, 0.16 * L.camZ), r: [Math.PI / 2, th, 0], color: k === lit ? cols[k] : '#555A74', smooth: true });
    }
  }
  // ---- far side, gap 1: a turntable with a fan-shaped roundhouse behind it
  {
    const sC = gapS(1), offT = -3.6, cT = frame(sC, offT), L = local(cT, true), { lp, th } = L, R0 = [0, th, 0];
    // a lead track along the line to the turntable (the siding of the gap before ends beside the main line, this one is the lead)
    railPath(() => offT, sC - 7.4, sC - 1.55);
    // the pit: a dark ring, a lighter rim and the bridge across it (aligned along the line)
    bake.add(cyl(bag, 1.62, 1.62, 0.05, 28), { p: lp(0, 0.03, 0), color: '#4A4F66', smooth: true });
    bake.add(cyl(bag, 1.78, 1.78, 0.06, 28), { p: lp(0, 0.0, 0), color: '#B7A98F', smooth: true });
    bake.add(cyl(bag, 1.5, 1.5, 0.07, 28), { p: lp(0, 0.04, 0), color: '#6A6F88', smooth: true });
    bake.add(box(bag, 0.5, 0.26, 3.1), { p: lp(0, 0.26, 0), r: R0, color: NAVY });
    for (const x of [-0.17, 0.17]) bake.add(box(bag, 0.07, 0.07, 3.1), { p: lp(x, 0.42, 0), r: R0, color: '#8A6E5A' });
    for (let k = -3; k <= 3; k++) bake.add(box(bag, 0.6, 0.05, 0.14), { p: lp(0, 0.4, k * 0.44), r: R0, color: '#B8926A' });
    bake.add(cyl(bag, 0.22, 0.22, 0.2, 12), { p: lp(0, 0.4, 0), color: '#3A3D52', smooth: true });
    bake.add(box(bag, 0.34, 0.5, 0.34), { p: lp(0.38, 0.62, 0.0), r: R0, color: MUSTARD }); // the operator's little cab
    bake.add(box(bag, 0.4, 0.07, 0.4), { p: lp(0.38, 0.9, 0.0), r: R0, color: BRICK });
    // the roundhouse: five gabled bays in a fan beyond the far edge (angle 0 = straight ahead, away from the camera)
    const Rb = 3.55;
    [-60, -30, 0, 30, 60].forEach((deg, i) => {
      const t = deg * Math.PI / 180, px = Rb * Math.sin(t), pz = -Rb * Math.cos(t), yawB = th + Math.PI / 2 - t, yawR = th + Math.PI - t;
      bake.add(box(bag, 0.8, 1.45, 1.75), { p: lp(px, 0.725, pz), r: [0, yawB, 0], color: BRICK });
      bake.add(box(bag, 0.84, 0.12, 1.8), { p: lp(px, 0.06, pz), r: [0, yawB, 0], color: '#8A7C6C' });
      bake.add(prism(bag, 1.95, 0.7, 1.15), { p: lp(px, 1.45, pz), r: [0, yawR, 0], color: SLATE });
      // the arched door on the face toward the turntable: cream arch, dark opening
      const fx = Rb - 0.43;
      bake.add(box(bag, 0.09, 0.98, 0.98), { p: lp(fx * Math.sin(t), 0.5, -fx * Math.cos(t)), r: [0, yawB, 0], color: CREAM });
      bake.add(cyl(bag, 0.5, 0.5, 0.09, 14), { p: lp(fx * Math.sin(t), 1.0, -fx * Math.cos(t)), r: [0, yawB, Math.PI / 2], color: CREAM, smooth: true });
      const gx = fx - 0.05;
      bake.add(box(bag, 0.1, 0.9, 0.78), { p: lp(gx * Math.sin(t), 0.46, -gx * Math.cos(t)), r: [0, yawB, 0], color: '#2F3350' });
      bake.add(cyl(bag, 0.39, 0.39, 0.1, 14), { p: lp(gx * Math.sin(t), 0.92, -gx * Math.cos(t)), r: [0, yawB, Math.PI / 2], color: '#2F3350', smooth: true });
      // a stub rail from the turntable's rim into the bay
      for (let r = 1.75; r < 3.0; r += 0.45) bake.add(box(bag, 0.7, 0.05, 0.14), { p: lp(r * Math.sin(t), 0.04, -r * Math.cos(t)), r: [0, yawB, 0], color: '#B8926A' });
      for (const k of [-0.2, 0.2]) { const mid = 2.4; bake.add(box(bag, 1.4, 0.07, 0.07), { p: lp(mid * Math.sin(t) + Math.cos(t) * k * 0, 0.11, -mid * Math.cos(t)), r: [0, yawB, 0], color: '#8A6E5A' }); }
    });
    // vents on the roofs, and a chimney with a puff (static)
    bake.add(cyl(bag, 0.18, 0.2, 0.7, 8), { p: lp(0, 2.9, -Rb - 0.4), color: '#6B4A38', smooth: true });
    bake.add(cyl(bag, 0.26, 0.2, 0.12, 8), { p: lp(0, 3.3, -Rb - 0.4), color: '#3A3D52', smooth: true });
    for (const [dy, r, dx] of [[0.0, 0.26, 0], [0.35, 0.34, 0.2], [0.75, 0.4, 0.45]]) bake.add(ball(bag, 10, 8), { p: lp(dx, 3.8 + dy, -Rb - 0.4), s: [r, r * 0.85, r], color: '#FFFFFF', smooth: true });
  }
  // ---- far side, gap 2: a water tower and semaphore signals
  {
    const sC = gapS(2) + 2.2, f = frame(sC, -5.0), L = local(f, true), { lp, th } = L, R0 = [0, th, 0];
    for (const [x, z] of [[-0.65, -0.65], [0.65, -0.65], [-0.65, 0.65], [0.65, 0.65]]) bake.add(box(bag, 0.16, 3.4, 0.16), { p: lp(x, 1.7, z), r: R0, color: woodDark });
    for (const y of [1.0, 2.2]) for (const a of [0, Math.PI / 2]) bake.add(box(bag, 1.45, 0.07, 0.07), { p: lp(0, y, a === 0 ? 0.65 : -0.65), r: [0, th + a * 0, 0], color: '#6B4A38' });
    for (const y of [1.0, 2.2]) for (const x of [-0.65, 0.65]) bake.add(box(bag, 0.07, 0.07, 1.45), { p: lp(x, y, 0), r: R0, color: '#6B4A38' });
    for (const [x, z, rz, rx] of [[0, 0.66, 0.0, 0.62], [0, -0.66, 0.0, -0.62], [0.66, 0, 0.62, 0], [-0.66, 0, -0.62, 0]]) bake.add(box(bag, 0.06, 2.5, 0.06), { p: lp(x, 1.7, z), r: [rx, th, rz], color: '#6B4A38' });
    bake.add(cyl(bag, 1.1, 1.1, 1.5, 18), { p: lp(0, 4.15, 0), color: '#B8604F', smooth: true });
    for (const y of [3.6, 4.7]) bake.add(cyl(bag, 1.13, 1.13, 0.12, 18), { p: lp(0, y, 0), color: '#4A4F66', smooth: true });
    for (let k = 0; k < 9; k++) bake.add(box(bag, 0.07, 1.5, 0.05), { p: lp(Math.sin(k / 9 * TAU) * 1.1, 4.15, Math.cos(k / 9 * TAU) * 1.1), r: [0, th + k / 9 * TAU, 0], color: '#9A4A3C' });
    bake.add(cone(bag, 1.3, 0.85, 18), { p: lp(0, 5.35, 0), color: SLATE, smooth: true });
    bake.add(ball(bag, 8, 6), { p: lp(0, 5.82, 0), s: [0.1, 0.1, 0.1], color: MUSTARD, smooth: true });
    // the spout: a pipe from the tank's side down to a swivel arm over the siding
    bake.add(cyl(bag, 0.09, 0.09, 2.6, 7), { p: lp(1.25, 2.9, 0.4), color: '#3A3D52', smooth: true });
    bake.add(cyl(bag, 0.11, 0.11, 1.5, 7), { p: lp(1.95, 1.7, 0.4), r: [0, th, Math.PI / 2 - 0.35], color: '#3A3D52', smooth: true });
    bake.add(box(bag, 0.07, 3.0, 0.07), { p: lp(1.5, 1.5, -0.9), r: R0, color: '#6B4A38' }); // a ladder rail
    // a semaphore signal on the main line's far side: a post, a red arm with a white stripe and a lamp
    const g = frame(gapS(2) - 3.5, -1.95), Lg = local(g, true);
    bake.add(box(bag, 0.12, 2.8, 0.12), { p: Lg.lp(0, 1.4, 0), r: [0, Lg.th, 0], color: '#E8E4DA' });
    bake.add(box(bag, 0.07, 0.34, 1.2), { p: Lg.lp(0.1, 2.75, 0.5 * Lg.camZ), r: [0, Lg.th, 0.0], color: '#E5484D' });
    bake.add(box(bag, 0.08, 0.1, 0.7), { p: Lg.lp(0.12, 2.75, 0.5 * Lg.camZ), r: [0, Lg.th, 0], color: '#FFFFFF' });
    bake.add(box(bag, 0.3, 0.38, 0.3), { p: Lg.lp(0, 2.35, 0), r: [0, Lg.th, 0], color: NAVY });
    bake.add(cyl(bag, 0.08, 0.08, 0.06, 8), { p: Lg.lp(0.16, 2.35, 0), r: [0, Lg.th, Math.PI / 2], color: '#E5484D', smooth: true });
  }
  // ---- far side, gap 3: a second siding with a coal heap and a handcar
  {
    const sC = gapS(3), ease = (t) => t * t * (3 - 2 * t);
    if (stationCount > 4) {
      const offFn = (s) => -3.3 * ease(Math.max(0, Math.min(1, (s - (sC - 7)) / 3))) * (1 - ease(Math.max(0, Math.min(1, (s - (sC + 3.5)) / 3))));
      railPath(offFn, sC - 7.1, sC + 6.6);
      wagon(sC - 1.8, -3.3, 'box', MUSTARD, BRICK);
      wagon(sC + 0.8, -3.3, 'flat', '#5B8F5E', '#3A3D52');
      // a goods crane beside the siding: a base, a yellow post, a jib out over the siding, a rope and a hanging crate
      const f = frame(sC + 3.4, -4.7), L = local(f, true), { lp, th, camZ } = L, R0 = [0, th, 0];
      bake.add(box(bag, 0.95, 0.3, 0.95), { p: lp(0, 0.15, 0), r: R0, color: '#6D758F' });
      bake.add(box(bag, 0.24, 3.0, 0.24), { p: lp(0, 1.8, 0), r: R0, color: MUSTARD });
      bake.add(box(bag, 0.2, 0.2, 2.7), { p: lp(0, 3.35, 0.6 * camZ), r: R0, color: MUSTARD });
      bake.add(box(bag, 0.12, 0.12, 1.5), { p: lp(0, 3.0, 0.45 * camZ), r: [-0.75 * camZ, th, 0], color: '#C99422' });
      bake.add(box(bag, 0.4, 0.4, 0.4), { p: lp(0, 3.0, -0.95 * camZ), r: R0, color: '#4A4F66' }); // counterweight
      bake.add(cyl(bag, 0.02, 0.02, 1.3, 4), { p: lp(0, 2.65, 1.7 * camZ), color: '#2F3350' });
      bake.add(box(bag, 0.55, 0.5, 0.55), { p: lp(0, 1.75, 1.7 * camZ), r: R0, color: '#D4A769' });
      bake.add(box(bag, 0.58, 0.07, 0.58), { p: lp(0, 1.75, 1.7 * camZ), r: R0, color: '#8A5A35' });
      bake.add(box(bag, 0.6, 0.1, 0.6), { p: lp(0, 0.65, 1.0 * camZ), r: R0, color: wood });
    }
  }

  // ---- stations' side, beyond the signs
  // gap 0: a warehouse with a painted crate sign
  if (usable(gapS(0))) shed(gapS(0) + 0.2, 5.65, 'crate', '#E9B949', BRICK);
  // gap 1: the clock-tower station hall
  if (usable(gapS(1))) {
    const f = frame(gapS(1) + 0.2, 5.55), L = local(f, false), { lp, th, camZ } = L, R0 = [0, th, 0], D = 2.5, Wd = 4.6, H = 1.8;
    bake.add(box(bag, D, H, Wd), { p: lp(0, H / 2, 0), r: R0, color: '#D95F4D' });
    bake.add(box(bag, D + 0.08, 0.2, Wd + 0.08), { p: lp(0, 0.1, 0), r: R0, color: '#8A7C6C' });
    bake.add(box(bag, D + 0.12, 0.16, Wd + 0.12), { p: lp(0, H, 0), r: R0, color: CREAM });
    bake.add(prism(bag, D + 0.7, 0.9, Wd + 0.5), { p: lp(0, H + 0.08, 0), r: R0, color: SLATE });
    for (let k = -2; k <= 2; k++) {
      if (k === 0) continue;
      const z = k * 0.95;
      bake.add(box(bag, 0.07, 0.9, 0.55), { p: lp(D / 2 + 0.03, 0.95, z), r: R0, color: CREAM });
      bake.add(cyl(bag, 0.275, 0.275, 0.07, 10), { p: lp(D / 2 + 0.03, 1.4, z), r: [0, th, Math.PI / 2], color: CREAM, smooth: true });
      bake.add(box(bag, 0.09, 0.8, 0.4), { p: lp(D / 2 + 0.05, 0.92, z), r: R0, color: '#8FD0F0' });
      bake.add(cyl(bag, 0.2, 0.2, 0.09, 10), { p: lp(D / 2 + 0.05, 1.32, z), r: [0, th, Math.PI / 2], color: '#8FD0F0', smooth: true });
      bake.add(box(bag, 0.5, 0.5, 0.07), { p: lp(0, 1.0, camZ * (Wd / 2 + 0.03)), r: R0, color: CREAM });
    }
    // the main doors in the middle of the track face
    bake.add(box(bag, 0.09, 1.2, 0.9), { p: lp(D / 2 + 0.04, 0.7, 0), r: R0, color: CREAM });
    bake.add(box(bag, 0.11, 1.05, 0.72), { p: lp(D / 2 + 0.06, 0.62, 0), r: R0, color: NAVY });
    bake.add(box(bag, 1.1, 0.07, 1.3), { p: lp(D / 2 + 0.55, 1.3, 0), r: R0, color: '#E9B949' }); // a little canopy
    for (const z of [-0.55, 0.55]) bake.add(cyl(bag, 0.045, 0.045, 1.25, 6), { p: lp(D / 2 + 1.05, 0.65, z), color: '#4A4F66', smooth: true });
    // the clock tower, rising from the middle of the hall
    const tx = 0.85, TH = 4.1, TW = 1.35;
    bake.add(box(bag, TW, TH, TW), { p: lp(tx, TH / 2 + 0.9, 0), r: R0, color: '#D95F4D' });
    for (const y of [1.6, 3.2]) bake.add(box(bag, TW + 0.1, 0.1, TW + 0.1), { p: lp(tx, y, 0), r: R0, color: CREAM });
    bake.add(box(bag, TW + 0.28, 0.2, TW + 0.28), { p: lp(tx, 5.0, 0), r: R0, color: CREAM });
    bake.add(bag.geo('towerroof', () => new THREE.ConeGeometry(0.98, 1.3, 4).rotateY(Math.PI / 4)), { p: lp(tx, 5.75, 0), r: R0, color: SLATE_D });
    bake.add(cyl(bag, 0.03, 0.03, 0.6, 5), { p: lp(tx, 6.7, 0), color: '#E9B949' });
    bake.add(ball(bag, 8, 6), { p: lp(tx, 6.4, 0), s: [0.1, 0.1, 0.1], color: '#E9B949', smooth: true });
    bake.tri(lp(tx, 7.0, 0), lp(tx, 6.7, 0), lp(tx, 6.85, -camZ * 0.5), '#E5484D');
    // the clock faces: one toward the track, one toward the camera (white disc, navy rim and hands showing ten past ten)
    const hand = (center, plane, len, ang, w, c) => {
      const [cx, cy, cz] = center;
      if (plane === 'x') bake.add(box(bag, 0.04, len, w), { p: lp(cx + 0.06, cy + Math.cos(ang) * len / 2, cz + Math.sin(ang) * len / 2), r: [ang, th, 0], color: c });
      else bake.add(box(bag, w, len, 0.04), { p: lp(cx + Math.sin(ang) * len / 2, cy + Math.cos(ang) * len / 2, cz + camZ * 0.06), r: [0, th, -ang], color: c });
    };
    const cx0 = tx + TW / 2 + 0.01, cy0 = 4.15, cz0 = camZ * (TW / 2 + 0.01);
    bake.add(cyl(bag, 0.5, 0.5, 0.05, 20), { p: lp(cx0, cy0, 0), r: [0, th, Math.PI / 2], color: NAVY, smooth: true });
    bake.add(cyl(bag, 0.43, 0.43, 0.07, 20), { p: lp(cx0, cy0, 0), r: [0, th, Math.PI / 2], color: '#FFFFFF', smooth: true });
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; bake.add(box(bag, 0.08, 0.08, 0.06), { p: lp(cx0 + 0.04, cy0 + Math.cos(a) * 0.35, Math.sin(a) * 0.35), r: [0, th, 0], color: NAVY }); }
    hand([cx0, cy0, 0], 'x', 0.3, -1.05 * camZ, 0.06, NAVY); hand([cx0, cy0, 0], 'x', 0.4, 0.5 * camZ * -1, 0.045, NAVY);
    bake.add(cyl(bag, 0.5, 0.5, 0.05, 20), { p: lp(tx, cy0, cz0), r: [Math.PI / 2, th, 0], color: NAVY, smooth: true });
    bake.add(cyl(bag, 0.43, 0.43, 0.07, 20), { p: lp(tx, cy0, cz0), r: [Math.PI / 2, th, 0], color: '#FFFFFF', smooth: true });
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; bake.add(box(bag, 0.08, 0.08, 0.06), { p: lp(tx + Math.sin(a) * 0.35, cy0 + Math.cos(a) * 0.35, cz0 + camZ * 0.04), r: [0, th, 0], color: NAVY }); }
    hand([tx, cy0, cz0], 'z', 0.3, -1.05, 0.06, NAVY); hand([tx, cy0, cz0], 'z', 0.4, 0.5, 0.045, NAVY);
  }
  // gap 2: a level crossing, a road across the line with striped gates, a crossbuck and flashing lamps; terrace houses beyond it
  {
    const s = gapS(2) - 0.4, f0 = frame(s, 0), pr = frame(s, 0);
    const tilt = f0.heading;
    // the road: a dark strip across the line, long enough to reach the sea of gravel on both sides, with a dashed centre line
    const along = (v) => at(frame(s, 0), 0, v);
    for (let v = -7.0; v < 9.6; v += 0.8) {
      const [x, z] = along(v + 0.4);
      bake.add(box(bag, 0.8, 0.03, 2.0), { p: [x, 0.025, z], r: [0, tilt, 0], color: '#6E7288' });
      if (Math.abs(v + 0.4) > 1.5 && Math.round((v + 7) / 0.8) % 2) bake.add(box(bag, 0.34, 0.04, 0.12), { p: [x, 0.05, z], r: [0, tilt, 0], color: '#F4E6CF' });
    }
    for (const side of [-1, 1]) {
      const [x, z] = along(side * 1.95), Ls = local(frame(s, side * 1.95), side < 0), { lp, th } = Ls;
      // post, a striped gate arm lowered across the lane (long axis along the line), a counterweight, two red lamps, a crossbuck
      bake.add(cyl(bag, 0.08, 0.1, 1.0, 8), { p: lp(0, 0.5, 1.15 * Ls.camZ), color: '#EDEAE0', smooth: true });
      bake.add(box(bag, 0.18, 0.2, 0.2), { p: lp(0, 0.98, 1.15 * Ls.camZ), r: [0, th, 0], color: '#2F3350' });
      for (let k = 0; k < 7; k++) bake.add(box(bag, 0.1, 0.1, 0.32), { p: lp(0, 0.95, (1.15 - 0.16 - k * 0.32) * Ls.camZ), r: [0, th, 0], color: k % 2 ? '#FFFFFF' : '#E5484D' });
      bake.add(box(bag, 0.12, 0.12, 0.3), { p: lp(0, 1.05, (1.15 + 0.3) * Ls.camZ), r: [0, th, 0], color: '#E5484D' });
      bake.add(cyl(bag, 0.04, 0.04, 2.6, 6), { p: lp(0.28, 1.3, 1.15 * Ls.camZ), color: '#EDEAE0', smooth: true });
      for (const a of [0.78, -0.78]) bake.add(box(bag, 0.05, 0.12, 1.1), { p: lp(0.28, 2.3, 1.15 * Ls.camZ), r: [a, th, 0], color: '#FFFFFF' });
      bake.add(box(bag, 0.07, 0.07, 0.07), { p: lp(0.28, 2.3, 1.15 * Ls.camZ), r: [0, th, 0], color: '#E5484D' });
      for (const dz of [-0.25, 0.25]) bake.add(cyl(bag, 0.1, 0.1, 0.06, 10), { p: lp(0.28, 1.85, 1.15 * Ls.camZ + dz), r: [0, th, Math.PI / 2], color: '#E5484D', smooth: true });
      void x; void z;
    }
    // terrace houses beyond the road on the stations' side, in brick, mustard, cream
    [[2.7, BRICK, SLATE], [5.1, '#EEC96B', '#C75B4A'], [7.5, '#F2E4CC', SLATE_D]].forEach(([u, wall, roof], i) => {
      const ff = frame(s + u + 0.6, 6.6), L = local(ff, false);
      cottage(bake, bag, L, { D: 2.1, W: 2.0, H: 1.9, wall, roof, door: i % 2 ? '#3F7CC4' : '#2F8F6B', rise: 1.0 });
    });
  }
  // gap 3: a second warehouse, a painted barrel sign
  if (stationCount > 4 && usable(gapS(3))) shed(gapS(3) + 0.2, 5.65, 'barrel', '#8FB9F0', '#E8DDC6');
  // trees: a few tall poplars and round trees behind the stations' side, and hedges
  {
    for (let i = 0, s = L0 + 2; s < L1; i++, s += 5.4 + R() * 2) {
      if (!usable(s)) continue;
      const f = frame(s, 10.5 + R() * 4), big = i % 3 === 0;
      bake.add(cyl(bag, 0.1, 0.14, 0.8, 7), { p: [f.x, 0.4, f.z], color: '#8A5A35' });
      if (big) bake.add(cone(bag, 0.7, 3.2, 7), { p: [f.x, 2.2, f.z], color: ['#3F9E5A', '#4FAE66'][i % 2] });
      else bake.add(ball(bag, 12, 9), { p: [f.x, 1.5, f.z], s: [1.0, 0.95, 1.0], color: ['#6FBF5A', '#5BB15A', '#80C95F'][i % 3], smooth: true });
    }
  }
  bake.finish(group);
  void nearStop; void W; void sky; void span;
}

// ---------------------------------------------------------------- W7 Silent E Summit
// Alpine foothills. Far side: a valley cable-car station, a line of pylons and two cabins climbing toward a rock shelf, a cliff
// with a (static) waterfall into a pool, a stream under a stone arch bridge, pine forests. Stations' side, beyond the signs: a
// chalet with a balcony and flower boxes, a wood pile, pines, boulders with snow, a hay hut. Snowy peaks stand behind everything.
const SNOW = '#FFFFFF', STONE = '#B9B5AA', STONE_D = '#9C988E';

// A pointed faceted peak (unit size: base radius 1, height 1), jittered by a seeded random and shared per key.
function peakGeo(bag, key, seed) {
  return bag.geo(key, () => {
    const Rn = rng(seed), cache = new Map();
    const g = new THREE.IcosahedronGeometry(1, 1), pa = g.getAttribute('position');
    for (let i = 0; i < pa.count; i++) {
      const ux = pa.getX(i), uy = pa.getY(i), uz = pa.getZ(i), k = `${ux.toFixed(3)},${uy.toFixed(3)},${uz.toFixed(3)}`;
      let j = cache.get(k); if (!j) { j = [Rn() - 0.5, Rn() - 0.5, Rn() - 0.5]; cache.set(k, j); }
      let x = ux, y = uy * 0.25, z = uz;
      if (uy > 1e-4) { const hr = Math.hypot(ux, uz), kk = hr > 1e-6 ? Math.pow(1 - uy, 0.85) / hr : 0; x = ux * kk; z = uz * kk; y = uy; }
      pa.setXYZ(i, x + j[0] * 0.24, y + (uy > 1e-4 ? j[1] * 0.1 : 0), z + j[2] * 0.24);
    }
    return g;
  });
}

function silentESummit({ bag, line, stops, stationCount, group, sky, R, W }) {
  const { frame, at, nearStop, nearExtra } = helpers(line, stops, stationCount);
  const bake = new Bake(bag);
  const L0 = line.start + 4, L1 = line.end - 6, span = L1 - L0;
  const gapS = (i) => stops[Math.min(i, stationCount - 1)] + 4.5;
  const usable = (s) => !nearExtra(s, 7);
  const wood = '#B9803F', woodDark = '#7A4A24', woodLight = '#D9A662', ROOF = '#8F3F34';
  const nearSign = (s, off) => off > 0 && off < 7.5 && stops.slice(0, stationCount).some((t) => Math.abs(s - t) < 3.4);
  const ease = (t) => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };

  // ---- the snowy peaks behind: pointed, faceted, green foot, grey rock, white above the snow line (jagged by a seeded random)
  {
    const peaks = [[-17, 0.0, 7, 9.5, 5.5], [15, 4, 7.5, 8, 6], [-19, 15, 8, 10.5, 6], [18, 18, 8, 9.5, 6.5], [-16, 31, 7, 8.5, 5.5], [17, 33, 7.5, 9, 6], [-20, 45, 8, 10, 6], [19, 47, 8, 9.5, 6.5], [-17, 58, 7, 9, 5.5]];
    peaks.forEach(([off, sAt, rx, ry, rz], i) => {
      const s = L0 + sAt, f = frame(s, off);
      if (nearExtra(s, 5) && Math.abs(off) < 14) return;
      const snowFrom = 0.46 + (i % 3) * 0.05;
      bake.add(peakGeo(bag, 'summitpeak' + (i % 3), 600 + (i % 3) * 13), {
        p: [f.x, -0.3, f.z], r: [0, i * 1.3, 0], s: [rx, ry, rz],
        colorFn: (c, t) => {
          const y = (c.y + 0.3) / ry, n = (Math.sin(t * 12.9898 + i * 4.1) * 43758.5453) % 1, shade = 0.94 + Math.abs(n) * 0.12;
          const col = y > snowFrom + (Math.abs(n) - 0.5) * 0.12 ? new THREE.Color(SNOW) : y > 0.2 ? lerpHex('#8C8AA6', '#B9B6CC', y * 1.2) : lerpHex('#5E9B6F', '#7DB07E', y * 4);
          return col.multiplyScalar(shade);
        },
      });
    });
  }
  // low green foothills in front of the peaks
  const lows = ['#7FBF6E', '#6FB566', '#8CC774'];
  for (let i = 0, s = L0; s < L1; i++, s += 7 + R() * 3) {
    for (const sgn of [-1, 1]) {
      if (!usable(s)) continue;
      const f = frame(s + (sgn > 0 ? 3 : 0), sgn * (10.5 + R() * 4));
      addHill(bake, bag, { x: f.x, z: f.z, rx: 4 + R() * 3, ry: 1.2 + R() * 1.8, rz: 3.5 + R() * 2.5, yaw: R() * 3, seed: i + sgn * 7, low: lows[i % 3], high: '#C9E3A2', kind: i % 3 });
    }
  }
  // snow patches on the high ground
  for (let i = 0, s = L0 + 2; s < L1; i++, s += 8 + R() * 3) {
    const f = frame(s, -(8.5 + R() * 3));
    addHill(bake, bag, { x: f.x, z: f.z, rx: 1.6 + R() * 1.4, ry: 0.22, rz: 1.2 + R() * 1.0, yaw: R() * 3, seed: 90 + i, low: '#F3F8FB', high: '#FFFFFF', kind: 0 });
  }

  // ---- pines: a trunk and three stacked cones, some with a white cap of snow on each tier
  const pine = (x, z, k = 1, snowy = false) => {
    bake.add(cyl(bag, 0.09 * k, 0.13 * k, 0.5 * k, 6), { p: [x, 0.25 * k, z], color: '#7A4A24' });
    const tiers = [[0.78, 0.95, 0.62], [0.6, 0.85, 1.12], [0.4, 0.75, 1.55]];
    tiers.forEach(([r, h, y], i) => {
      bake.add(cone(bag, r * k, h * k, 7), { p: [x, y * k, z], color: ['#2F7D4F', '#3A8F5B', '#46A168'][i] });
      if (snowy) bake.add(cone(bag, r * 0.62 * k, h * 0.5 * k, 7), { p: [x, (y + h * 0.27) * k, z], color: SNOW });
    });
  };
  const forest = (s, off, n, spread = 2.4) => {
    for (let i = 0; i < n; i++) {
      const f = frame(s + (R() - 0.5) * spread * 2.2, off + (R() - 0.5) * spread);
      if (nearSign(s, off)) continue;
      pine(f.x, f.z, 0.85 + R() * 0.7, R() < 0.45);
    }
  };

  // ---- the cable car: a valley station, two pylons climbing, two cabins, the cable, a summit station on a stone pillar
  {
    const s0 = gapS(2) - 1.0, off = -2.9;
    const cabLine = [{ s: s0, y: 2.7 }, { s: s0 + 4.8, y: 3.8 }, { s: s0 + 9.6, y: 4.9 }, { s: s0 + 14.4, y: 6.0 }];
    const P = (s, y, x = off) => { const f = frame(s, 0), L = local(f, true); return L.lp(x, y, 0); };
    // the valley station: a timber hall with a red roof and snow, a big drive wheel on top, a ticket window and door on the track face
    {
      const f = frame(s0, 0), L = local(f, true), { lp, th, camZ } = L, R0 = [0, th, 0], cx = off - 0.15;
      bake.add(box(bag, 2.1, 1.5, 2.0), { p: lp(cx, 0.75, 0), r: R0, color: wood });
      bake.add(box(bag, 2.18, 0.3, 2.08), { p: lp(cx, 0.15, 0), r: R0, color: STONE_D });
      for (let k = 0; k < 4; k++) bake.add(box(bag, 2.12, 0.04, 2.02), { p: lp(cx, 0.55 + k * 0.28, 0), r: R0, color: woodDark });
      bake.add(prism(bag, 2.7, 0.85, 2.5), { p: lp(cx, 1.5, 0), r: R0, color: ROOF });
      bake.add(prism(bag, 2.4, 0.16, 2.55), { p: lp(cx, 2.22, 0), r: R0, color: SNOW });
      bake.add(box(bag, 0.08, 0.5, 0.7), { p: lp(cx + 1.05, 0.95, 0.5 * camZ), r: R0, color: '#FFF8EC' });
      bake.add(box(bag, 0.1, 0.36, 0.55), { p: lp(cx + 1.05, 0.95, 0.5 * camZ), r: R0, color: '#8FD0F0' });
      bake.add(box(bag, 0.08, 1.0, 0.6), { p: lp(cx + 1.05, 0.5, -0.5 * camZ), r: R0, color: ROOF });
      bake.add(box(bag, 0.5, 0.5, 0.07), { p: lp(cx, 0.95, camZ * 1.03), r: R0, color: '#FFF8EC' });
      bake.add(box(bag, 0.36, 0.36, 0.09), { p: lp(cx, 0.95, camZ * 1.05), r: R0, color: '#8FD0F0' });
      // the drive wheel on the roof's ridge, with spokes, and the cable running to it
      bake.add(cyl(bag, 0.62, 0.62, 0.2, 16), { p: lp(cx, 2.85, 0), r: [Math.PI / 2, th, 0], color: '#4A4F66', smooth: true });
      bake.add(cyl(bag, 0.16, 0.16, 0.3, 8), { p: lp(cx, 2.85, 0), r: [Math.PI / 2, th, 0], color: '#E9B949', smooth: true });
      for (let k = 0; k < 6; k++) { const ang = k * Math.PI / 3; bake.add(box(bag, 0.06, 0.62, 0.1), { p: lp(cx + Math.sin(ang) * 0.31, 2.85 + Math.cos(ang) * 0.31, camZ * 0.04), r: [0, th, -ang], color: '#8A90A8' }); }
      bake.add(box(bag, 0.14, 0.7, 0.14), { p: lp(cx, 2.55, 0), r: R0, color: woodDark });
    }
    // the pylons: two leaning legs, a cross beam, braces and two sheave wheels, the cable resting on top
    cabLine.slice(1, 3).forEach(({ s, y }) => {
      const f = frame(s, 0), L = local(f, true), { lp, th } = L, R0 = [0, th, 0], H = y - 0.35, a = Math.atan2(0.5, H);
      for (const sg of [-1, 1]) {
        bake.add(box(bag, 0.2, H / Math.cos(a), 0.2), { p: lp(off + sg * 0.4, H / 2, 0), r: [0, th, sg * a], color: '#6D758F' });
        bake.add(box(bag, 0.4, 0.24, 0.4), { p: lp(off + sg * 0.66, 0.12, 0), r: R0, color: STONE });
      }
      bake.add(box(bag, 1.0, 0.12, 0.12), { p: lp(off, H * 0.4, 0), r: R0, color: '#6D758F' });
      bake.add(box(bag, 1.6, 0.2, 0.46), { p: lp(off, H, 0), r: R0, color: '#E5484D' });
      for (const z of [-0.14, 0.14]) bake.add(cyl(bag, 0.15, 0.15, 0.08, 10), { p: lp(off, H + 0.25, z), r: [0, th, Math.PI / 2], color: '#2F3350', smooth: true });
    });
    // the summit station: a stone pillar with strata under a timber hut, a snowy roof and a drive wheel
    {
      const top = cabLine[3], f = frame(top.s, 0), L = local(f, true), { lp, th, camZ } = L, R0 = [0, th, 0], H = top.y - 0.4;
      bake.add(box(bag, 1.9, H, 1.9), { p: lp(off, H / 2, 0), r: R0, color: '#8C8AA6' });
      for (let k = 0; k < 6; k++) bake.add(box(bag, 1.94, 0.12, 1.94), { p: lp(off, 0.5 + k * (H - 0.8) / 5, 0), r: R0, color: k % 2 ? '#A19FB8' : '#7B7994' });
      bake.add(box(bag, 2.3, 0.2, 2.3), { p: lp(off, H, 0), r: R0, color: '#B9B5AA' });
      bake.add(box(bag, 1.7, 1.0, 1.7), { p: lp(off, H + 0.6, 0), r: R0, color: wood });
      bake.add(prism(bag, 2.2, 0.7, 2.2), { p: lp(off, H + 1.1, 0), r: R0, color: ROOF });
      bake.add(prism(bag, 1.95, 0.14, 2.25), { p: lp(off, H + 1.75, 0), r: R0, color: SNOW });
      bake.add(box(bag, 0.07, 0.4, 0.5), { p: lp(off + 0.86, H + 0.7, 0.4 * camZ), r: R0, color: '#8FD0F0' });
      bake.add(cyl(bag, 0.45, 0.45, 0.2, 14), { p: lp(off + 0.3, H + 1.9, 0), r: [Math.PI / 2, th, 0], color: '#4A4F66', smooth: true });
    }
    // the cable (thin dark boxes between the points) and two cabins hanging from it
    const cable = (A, B) => { const dx = B[0] - A[0], dy = B[1] - A[1], dz = B[2] - A[2], len = Math.hypot(dx, dy, dz); bake.add(box(bag, 0.06, 0.06, len), { p: [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2, (A[2] + B[2]) / 2], r: [-Math.asin(dy / len), Math.atan2(dx, dz), 0], color: '#2F3350' }); };
    for (let i = 1; i < cabLine.length; i++) cable(P(cabLine[i - 1].s, cabLine[i - 1].y + (i === 1 ? 0.15 : 0.1), off + (i === 1 ? 0 : 0)), P(cabLine[i].s, cabLine[i].y + (i === 3 ? 1.5 : 0.1)));
    const cabin = (seg, t, body, roof) => {
      const a = cabLine[seg], b = cabLine[seg + 1], s = a.s + (b.s - a.s) * t, y = a.y + (b.y - a.y) * t + 0.12 + (seg === 2 ? 0.7 * t : 0);
      const f = frame(s, 0), L = local(f, true), { lp, th } = L, R0 = [0, th, 0], cy = y - 1.9, K = 1.55;
      bake.add(box(bag, 0.07, 0.75, 0.07), { p: lp(off, y - 0.35, 0), r: R0, color: '#2F3350' });
      bake.add(box(bag, 0.22, 0.22, 0.34), { p: lp(off, y - 0.02, 0), r: R0, color: '#2F3350' });
      bake.add(box(bag, 0.9 * K, 0.7 * K, 0.9 * K), { p: lp(off, cy + 0.4 * K, 0), r: R0, color: body });
      bake.add(box(bag, 0.94 * K, 0.22 * K, 0.94 * K), { p: lp(off, cy + 0.11 * K, 0), r: R0, color: '#FFF8EC' });
      bake.add(box(bag, 0.94 * K, 0.26 * K, 0.94 * K), { p: lp(off, cy + 0.5 * K, 0), r: R0, color: '#8FD0F0' });
      for (const [x, z] of [[0.47, 0], [-0.47, 0], [0, 0.47], [0, -0.47]]) bake.add(box(bag, x ? 0.04 : 0.06, 0.3 * K, z ? 0.04 : 0.06), { p: lp(off + x * K, cy + 0.5 * K, z * K), r: R0, color: '#FFF8EC' });
      bake.add(prism(bag, 1.1 * K, 0.28 * K, 1.1 * K), { p: lp(off, cy + 0.75 * K, 0), r: R0, color: roof });
    };
    cabin(0, 0.6, '#E5484D', '#FFFFFF');
    cabin(2, 0.4, '#FFB81C', '#E5484D');
  }

  // ---- the waterfall: a layered cliff with a white fall into a pool, a stream, a stone arch bridge
  {
    const s0 = gapS(0) + 8.5, f = frame(s0, 0), L = local(f, true), { lp, th } = L, R0 = [0, th, 0];
    const cx = -6.6, depth = 2.4, Hc = 4.9;
    // the cliff: a ragged silhouette extruded across, painted in rock layers, a grass top, boulders at the foot
    const sil = [[-2.5, 0], [-2.7, 1.6], [-2.2, 3.3], [-1.3, 4.2], [-0.5, 4.9], [0.5, 4.5], [1.3, 4.8], [2.3, 3.6], [2.7, 2.0], [2.5, 0]];
    const cliffG = poly(bag, 'summitcliff', sil, depth);
    bake.add(cliffG, { p: lp(cx, 0, 0), r: [0, th + Math.PI / 2, 0], colorFn: (c, t) => { const y = c.y; return lerpHex(['#8C8AA6', '#A19FB8', '#7B7994'][Math.floor(y / 0.55) % 3], '#C8C5D9', Math.max(0, (y - 3.8) / 2.5)).multiplyScalar(0.94 + ((Math.sin(t * 7.3) * 4375.5) % 1 + 1) % 1 * 0.1); } });
    bake.add(blobGeo(bag, 'cliffcap', 812, { detail: 1, jit: 0.25 }), { p: lp(cx, Hc - 0.2, 0.1), s: [1.4, 0.55, 2.4], color: '#7DB86A' });
    bake.add(blobGeo(bag, 'cliffsnow', 813, { detail: 1, jit: 0.25 }), { p: lp(cx - 0.2, Hc + 0.25, -0.9), s: [0.9, 0.4, 1.3], color: SNOW });
    for (const [dz, r] of [[-2.2, 0.8], [2.0, 0.7], [-0.6, 0.55]]) bake.add(blobGeo(bag, 'rockblob', 733, { detail: 1, jit: 0.3 }), { p: lp(cx + depth / 2 + 0.2, r * 0.25, dz), s: [r, r * 0.8, r], color: '#A6A3B8' });
    const face = cx + depth / 2; // the cliff's face toward the track
    // the fall: white water over the lip, down the face, in a few streaks, mist at the foot
    bake.add(box(bag, 0.5, 0.2, 1.0), { p: lp(face - 0.1, 3.72, 0.0), r: R0, color: '#E7F6FF' });
    bake.add(box(bag, 0.13, 3.55, 0.84), { p: lp(face + 0.05, 1.9, 0.0), r: R0, color: '#F3FBFF' });
    for (const dz of [-0.26, 0.0, 0.28]) bake.add(box(bag, 0.15, 3.3, 0.1), { p: lp(face + 0.07, 1.8, dz), r: R0, color: '#BFE6FA' });
    for (const [dz, dy, r] of [[-0.35, 0.18, 0.4], [0.3, 0.12, 0.45], [0.0, 0.3, 0.5]]) bake.add(ball(bag, 10, 8), { p: lp(face + 0.55, dy, dz), s: [r, r * 0.6, r], color: '#F3FBFF', smooth: true });
    // the pool and the stream running toward the camera and the track
    const sv = (t) => [s0 - 0.5 - 9.5 * t, -(4.5 - 1.7 * ease(t * 1.7))];
    const pts = [];
    for (let t = 0; t <= 1.0001; t += 0.04) { const [s, v] = sv(t); pts.push(frame(s, v)); }
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i], dx = b.x - a.x, dz = b.z - a.z, len = Math.hypot(dx, dz), yaw = Math.atan2(dx, dz);
      bake.add(box(bag, 1.15, 0.03, len + 0.05), { p: [(a.x + b.x) / 2, 0.04, (a.z + b.z) / 2], r: [0, yaw, 0], color: '#C7B98F' }); // wet banks
      bake.add(box(bag, 0.85, 0.04, len + 0.05), { p: [(a.x + b.x) / 2, 0.06, (a.z + b.z) / 2], r: [0, yaw, 0], color: i % 3 ? '#6EC6F0' : '#8AD3F5' });
    }
    const pl = frame(s0 - 0.2, -(5.0)), Lp = local(pl, true);
    bake.add(cyl(bag, 1.15, 1.15, 0.05, 18), { p: [pl.x, 0.07, pl.z], color: '#6EC6F0', smooth: true });
    bake.add(cyl(bag, 1.3, 1.3, 0.04, 18), { p: [pl.x, 0.04, pl.z], color: '#C7B98F', smooth: true });
    void Lp;
    // the stone arch bridge across the stream: two abutments, an arch ring of blocks round a dark opening, a deck with parapets
    {
      const t = 0.5, [bs, bv] = sv(t), bf = frame(bs, bv), Lb = local(bf, true), { lp: bl, th: bt } = Lb, RB = [0, bt, 0];
      const N = 13, A = 0.95, B2 = 0.95, Y0 = 0.02;
      bake.add(box(bag, 2.1, 1.3, 1.2), { p: bl(0, 0.65 + Y0, 0), r: RB, color: STONE });
      bake.add(box(bag, 1.9, 0.95, 1.26), { p: bl(0, 0.5, 0), r: RB, color: '#3C4560' }); // the dark opening under the arch
      bake.add(box(bag, 0.9, 0.04, 1.3), { p: bl(0, 0.06, 0), r: RB, color: '#6EC6F0' }); // water running through
      for (let i = 0; i < N; i++) {
        const a = Math.PI * i / (N - 1), x = A * Math.cos(a), y = B2 * Math.sin(a) + 0.35, key = i === (N - 1) / 2;
        bake.add(box(bag, 0.34, key ? 0.4 : 0.32, 1.28), { p: bl(x * 1.02, y, 0), r: [0, bt, -(Math.PI / 2 - a) * 0], color: key ? '#E4E0D4' : i % 2 ? STONE : '#CFCABD' });
      }
      bake.add(box(bag, 3.1, 0.2, 1.3), { p: bl(0, 1.5, 0), r: RB, color: '#D2CEC2' });
      for (const z of [-0.58, 0.58]) { bake.add(box(bag, 3.2, 0.42, 0.18), { p: bl(0, 1.82, z), r: RB, color: STONE_D }); bake.add(box(bag, 3.25, 0.08, 0.26), { p: bl(0, 2.07, z), r: RB, color: '#E4E0D4' }); }
      for (const sg of [-1, 1]) { bake.add(box(bag, 1.0, 0.75, 1.26), { p: bl(sg * 1.45, 0.37, 0), r: RB, color: STONE }); bake.add(box(bag, 1.0, 0.06, 1.3), { p: bl(sg * 1.45, 0.76, 0), r: RB, color: '#B7B2A6' }); }
      for (const [dx, dz] of [[-2.5, 0.5], [-3.1, 0.9], [2.5, -0.4], [3.1, -0.8]]) bake.add(cyl(bag, 0.22, 0.24, 0.06, 8), { p: bl(dx, 0.05, dz), color: '#C8C5BB', smooth: true });
    }
  }

  // ---- the chalet with a balcony, on the stations' side, a wood pile beside it
  if (usable(gapS(1))) {
    const f = frame(gapS(1) + 0.1, 6.0), L = local(f, false), { lp, th, camZ } = L, R0 = [0, th, 0], D = 2.9, Wd = 3.3;
    bake.add(box(bag, D, 1.15, Wd), { p: lp(0, 0.575, 0), r: R0, color: '#F2E8D2' });
    bake.add(box(bag, D + 0.08, 0.22, Wd + 0.08), { p: lp(0, 0.11, 0), r: R0, color: STONE_D });
    bake.add(box(bag, D + 0.1, 0.14, Wd + 0.1), { p: lp(0, 1.22, 0), r: R0, color: woodDark });
    bake.add(box(bag, D - 0.04, 1.1, Wd - 0.04), { p: lp(0, 1.82, 0), r: R0, color: wood });
    for (let k = 0; k < 4; k++) bake.add(box(bag, D - 0.0, 0.04, Wd - 0.0), { p: lp(0, 1.4 + k * 0.25, 0), r: R0, color: woodDark });
    // the roof: low gable, big overhang over the balcony, with snow on top
    bake.add(prism(bag, Wd + 0.9, 1.0, D + 1.7), { p: lp(0.45, 2.37, 0), r: [0, th + Math.PI / 2, 0], color: ROOF });
    bake.add(prism(bag, Wd + 0.62, 0.26, D + 1.75), { p: lp(0.45, 3.22, 0), r: [0, th + Math.PI / 2, 0], color: SNOW });
    bake.add(box(bag, 0.34, 0.9, 0.34), { p: lp(-0.8, 3.0, -0.6 * camZ), r: R0, color: STONE_D });
    bake.add(box(bag, 0.42, 0.1, 0.42), { p: lp(-0.8, 3.46, -0.6 * camZ), r: R0, color: SNOW });
    // the balcony on the track face of the upper floor: a floor, a rail of balusters, flower boxes, two posts to the roof
    bake.add(box(bag, 0.85, 0.1, Wd - 0.2), { p: lp(D / 2 + 0.42, 1.28, 0), r: R0, color: woodLight });
    bake.add(box(bag, 0.06, 0.1, Wd - 0.2), { p: lp(D / 2 + 0.84, 1.95, 0), r: R0, color: woodDark });
    bake.add(box(bag, 0.85, 0.08, 0.08), { p: lp(D / 2 + 0.42, 1.95, Wd / 2 - 0.1), r: R0, color: woodDark });
    bake.add(box(bag, 0.85, 0.08, 0.08), { p: lp(D / 2 + 0.42, 1.95, -Wd / 2 + 0.1), r: R0, color: woodDark });
    for (let k = 0; k < 9; k++) bake.add(box(bag, 0.05, 0.62, 0.05), { p: lp(D / 2 + 0.84, 1.62, -1.4 + k * 0.35), r: R0, color: '#FFF8EC' });
    for (const z of [-Wd / 2 + 0.12, Wd / 2 - 0.12]) bake.add(box(bag, 0.12, 1.2, 0.12), { p: lp(D / 2 + 0.84, 1.9, z), r: R0, color: woodDark });
    for (const z of [-0.9, 0.9]) {
      bake.add(box(bag, 0.22, 0.2, 0.9), { p: lp(D / 2 + 0.92, 1.95, z), r: R0, color: '#2F8F6B' });
      for (let k = 0; k < 4; k++) bake.add(ball(bag, 6, 5), { p: lp(D / 2 + 0.92, 2.1, z - 0.3 + k * 0.2), s: [0.11, 0.11, 0.11], color: k % 2 ? '#E5484D' : '#FF8FA3', smooth: true });
    }
    // doors and windows with shutters
    bake.add(box(bag, 0.08, 0.95, 0.6), { p: lp(D / 2 + 0.03, 0.55, 0.0), r: R0, color: woodDark });
    bake.add(cyl(bag, 0.3, 0.3, 0.08, 10), { p: lp(D / 2 + 0.03, 1.02, 0.0), r: [0, th, Math.PI / 2], color: woodDark, smooth: true });
    bake.add(box(bag, 0.08, 0.95, 0.65), { p: lp(D / 2 + 0.05, 1.82, 0.0), r: R0, color: '#FFF8EC' });
    bake.add(box(bag, 0.1, 0.8, 0.5), { p: lp(D / 2 + 0.06, 1.82, 0.0), r: R0, color: '#8FD0F0' });
    for (const z of [-0.9, 0.9]) bake.add(box(bag, 0.08, 0.5, 0.5), { p: lp(D / 2 + 0.03, 0.62, z), r: R0, color: '#FFF8EC' });
    for (const z of [-0.9, 0.9]) bake.add(box(bag, 0.1, 0.36, 0.36), { p: lp(D / 2 + 0.05, 0.62, z), r: R0, color: '#8FD0F0' });
    for (const x of [-0.6, 0.6]) {
      bake.add(box(bag, 0.5, 0.5, 0.07), { p: lp(x, 1.82, camZ * (Wd / 2 + 0.03)), r: R0, color: '#FFF8EC' });
      bake.add(box(bag, 0.36, 0.36, 0.09), { p: lp(x, 1.82, camZ * (Wd / 2 + 0.05)), r: R0, color: '#8FD0F0' });
      for (const dx of [-0.34, 0.34]) bake.add(box(bag, 0.16, 0.5, 0.06), { p: lp(x + dx, 1.82, camZ * (Wd / 2 + 0.05)), r: R0, color: dx > 0 ? '#E5484D' : '#FFFFFF' });
      bake.add(box(bag, 0.5, 0.5, 0.07), { p: lp(x, 0.7, camZ * (Wd / 2 + 0.03)), r: R0, color: '#FFF8EC' });
      bake.add(box(bag, 0.36, 0.36, 0.09), { p: lp(x, 0.7, camZ * (Wd / 2 + 0.05)), r: R0, color: '#8FD0F0' });
    }
    // a stacked wood pile at the side
    for (let r = 0; r < 3; r++) for (let k = 0; k < 4 - r; k++) bake.add(cyl(bag, 0.13, 0.13, 1.1, 7), { p: lp(-0.1 + (k + r * 0.5) * 0.27 - 0.4, 0.14 + r * 0.24, camZ * (Wd / 2 + 0.9)), r: [0, th, Math.PI / 2], color: r % 2 ? '#C99A5B' : '#B98B55', smooth: true });
    pine(...at(frame(gapS(1) - 3.4, 7.4), 0, 0), 1.25, true);
  }
  // ---- more of the stations' side: a hay hut, boulders with snow caps, pines
  if (usable(gapS(3))) {
    const f = frame(gapS(3) + 0.3, 6.4), L = local(f, false), { lp, th } = L, R0 = [0, th, 0];
    bake.add(box(bag, 2.0, 1.2, 2.4), { p: lp(0, 0.6, 0), r: R0, color: woodLight });
    for (let k = 0; k < 4; k++) bake.add(box(bag, 2.02, 0.04, 2.42), { p: lp(0, 0.3 + k * 0.28, 0), r: R0, color: woodDark });
    bake.add(prism(bag, 2.7, 0.85, 2.4), { p: lp(0, 1.2, 0), r: [0, th + Math.PI / 2, 0], color: '#C7A25A' });
    bake.add(prism(bag, 2.4, 0.18, 2.5), { p: lp(0, 1.98, 0), r: [0, th + Math.PI / 2, 0], color: SNOW });
    bake.add(box(bag, 0.08, 0.95, 1.0), { p: lp(1.03, 0.5, 0.0), r: R0, color: woodDark });
    bake.add(box(bag, 0.07, 0.6, 0.6), { p: lp(1.02, 1.5, 0.0), r: R0, color: '#6B4A38' });
  }
  const boulder = (s, off, k) => {
    const f = frame(s, off);
    bake.add(blobGeo(bag, 'rockblob', 733, { detail: 1, jit: 0.3 }), { p: [f.x, k * 0.2, f.z], r: [0, s, 0], s: [k * 1.2, k * 0.8, k], color: '#A6A3B8' });
    bake.add(blobGeo(bag, 'cliffsnow', 813, { detail: 1, jit: 0.25 }), { p: [f.x, k * 0.78, f.z], s: [k * 0.8, k * 0.3, k * 0.7], color: SNOW });
  };
  [[gapS(0) + 2.4, 8.4, 0.8], [gapS(2) + 1.0, 6.9, 0.7], [gapS(3) - 2.5, 7.6, 0.9], [gapS(4) + 0.6, 6.7, 0.7], [gapS(0) - 1.6, -6.4, 0.9], [gapS(3) + 1.2, -6.8, 0.8], [gapS(4) - 2.0, -5.2, 0.7]].forEach(([s, off, k]) => { if (usable(s)) boulder(s, off, k); });
  // pine forests: on the stations' side beyond the signs, and a deep forest on the far side
  [[gapS(0) - 4.0, -3.6, 4, 1.4], [gapS(0) + 2.0, 6.8, 4, 1.6], [gapS(2) - 1.2, 6.6, 4, 1.6], [gapS(3) - 1.5, 7.2, 5, 1.8], [gapS(4) + 1.0, 6.6, 4, 1.6], [gapS(1) + 4.2, -3.6, 5, 1.8], [gapS(1) + 7.6, -4.0, 3, 1.4], [gapS(4) + 0.5, -3.6, 7, 2.2], [gapS(4) - 3.0, -3.4, 5, 1.8], [gapS(1) - 3.0, 9.5, 5, 2.0]].forEach(([s, off, n, sp]) => { if (usable(s)) forest(s, off, n, sp); });
  for (let s = L0 + 1; s < L1; s += 3.4) { if (!usable(s)) continue; const f = frame(s, -(9.5 + R() * 5)); pine(f.x, f.z, 1.2 + R() * 0.8, R() < 0.5); }
  bake.finish(group);

  // alpine flowers: one instanced mesh of tiny heads in four colours (white, yellow, violet, pink), in clumps beyond the stations
  {
    const n = 220, m = new THREE.InstancedMesh(bag.geo('flower6', () => new THREE.IcosahedronGeometry(0.1, 0)), bag.paint('#ffffff', { roughness: 0.7, flatShading: true }), n);
    const mm = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color();
    const cols = ['#FFFFFF', '#FFD166', '#B79CF5', '#FF8FA3'];
    for (let i = 0; i < n; i++) {
      const c = Math.floor(i / 5), s = L0 + (c / (n / 5)) * span + R() * 1.2, off = (c % 3 === 0 ? -1 : 1) * (4.2 + ((c * 37) % 9)) * (c % 3 === 0 ? 0.7 : 1);
      const f = frame(s, off + (R() - 0.5) * 1.2);
      if (!usable(s) || nearSign(s, off) || (off < 0 && off > -2.4)) { m.setMatrixAt(i, mm.makeScale(0, 0, 0)); continue; }
      m.setMatrixAt(i, mm.compose(v.set(f.x + (R() - 0.5) * 0.8, 0.1, f.z + (R() - 0.5) * 0.8), q.identity(), sc.set(1, 0.8, 1)));
      m.setColorAt(i, col.set(cols[c % 4]));
    }
    group.add(m);
  }
  void W; void sky; void nearStop;
}

export const REGION_BUILDERS = { bay: blendBay, junction: endingsJunction, summit: silentESummit };
