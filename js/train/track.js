// The wooden toy track along the line: a cream bed, wooden sleepers and two dark wooden rails, plus buffer stops at both ends.
import { THREE, PAL, block } from './world.js';

// A flat strip (or a low bar, with sides) of the given width along the line, offset sideways by `off`.
function ribbon(line, from, to, { width, off = 0, y, height = 0, step = 0.5 }) {
  const pos = [], idx = [], p = {};
  const rows = [];
  for (let s = from; s <= to + 1e-6; s += step) {
    line.at(s, p);
    const cx = p.x + p.nx * off, cz = p.z + p.nz * off;
    rows.push([cx + p.nx * width / 2, cz + p.nz * width / 2, cx - p.nx * width / 2, cz - p.nz * width / 2]);
  }
  const top = y + height;
  rows.forEach(([rx, rz, lx, lz]) => { pos.push(lx, top, lz, rx, top, rz); });
  for (let i = 0; i < rows.length - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  if (height > 0) {
    const base = pos.length / 3;
    rows.forEach(([rx, rz, lx, lz]) => { pos.push(lx, y, lz, lx, top, lz, rx, y, rz, rx, top, rz); });
    for (let i = 0; i < rows.length - 1; i++) {
      const a = base + i * 4, b = a + 4;
      idx.push(a, a + 1, b, a + 1, b + 1, b);             // left side, facing out
      idx.push(a + 2, b + 2, a + 3, a + 3, b + 2, b + 3); // right side, facing out
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export function buildTrack(bag, line) {
  const group = new THREE.Group();
  const from = line.start + 1, to = line.end - 1;
  const bed = new THREE.Mesh(bag.add(ribbon(line, from, to, { width: 2.5, y: 0.02, height: 0.06 })), bag.paint(PAL.cream, { roughness: 0.8 }));
  bed.receiveShadow = true;
  group.add(bed);
  // Sleepers: one instanced mesh.
  const gap = 0.72, count = Math.floor((to - from - 0.4) / gap);
  const sleepers = new THREE.InstancedMesh(bag.box(1.7, 0.12, 0.36, 0.05, 2), bag.paint(PAL.sleeper, { roughness: 0.7 }), count);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1), p = {};
  for (let i = 0; i < count; i++) {
    line.at(from + 0.2 + i * gap, p);
    q.setFromEuler(e.set(0, p.heading, 0));
    sleepers.setMatrixAt(i, m.compose(v.set(p.x, 0.14, p.z), q, one));
  }
  sleepers.receiveShadow = true; sleepers.castShadow = false;
  group.add(sleepers);
  for (const off of [-0.5, 0.5]) {
    const rail = new THREE.Mesh(bag.add(ribbon(line, from, to, { width: 0.16, off, y: 0.2, height: 0.12, step: 0.35 })), bag.paint(PAL.rail, { roughness: 0.55 }));
    rail.castShadow = true; rail.receiveShadow = true;
    group.add(rail);
  }
  // Buffer stops at both ends: a little red block with a sun-yellow bumper.
  for (const [s, flip] of [[from + 0.3, Math.PI], [to - 0.3, 0]]) {
    line.at(s, p);
    const stop = new THREE.Group();
    const body = block(bag, 1.4, 0.6, 0.5, PAL.red);
    body.position.set(0, 0.45, 0);
    stop.add(body);
    const bump = block(bag, 1.1, 0.24, 0.2, PAL.sun);
    bump.position.set(0, 0.55, -0.32);
    stop.add(bump);
    stop.position.set(p.x, 0, p.z);
    stop.rotation.y = p.heading + flip;
    group.add(stop);
  }
  return group;
}
