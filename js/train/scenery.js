// The island the railway runs across: a soft green tabletop with two-tone grass, rounded hills, toy trees, little
// flowers, a river under a wooden bridge, a water tower, a windmill, a tunnel through one hill and a few slow clouds.
// Everything repeated is instanced, and everything is placed from a seeded random, so the island never changes.
import { THREE, PAL, rng, block } from './world.js';

function noiseTexture(bag) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d'), r = rng(3);
  const img = g.createImageData(128, 128);
  for (let i = 0; i < img.data.length; i += 4) { const v = 238 + Math.floor(r() * 17); img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 255; }
  g.putImageData(img, 0, 0);
  const t = bag.add(new THREE.CanvasTexture(c));
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(24, 70);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// stops: the distances of the stations along the line (scenery keeps clear of them).
export function buildScenery(bag, line, stops) {
  const group = new THREE.Group();
  const R = rng(11), p = {};
  const zNear = 30, zFar = -line.end - 50, W = 80;
  // the island: a big rounded slab with soft bevelled edges
  const shape = new THREE.Shape();
  const x0 = -W / 2, x1 = W / 2, r = 6;
  shape.moveTo(x0 + r, zFar); shape.lineTo(x1 - r, zFar); shape.quadraticCurveTo(x1, zFar, x1, zFar + r);
  shape.lineTo(x1, zNear - r); shape.quadraticCurveTo(x1, zNear, x1 - r, zNear); shape.lineTo(x0 + r, zNear);
  shape.quadraticCurveTo(x0, zNear, x0, zNear - r); shape.lineTo(x0, zFar + r); shape.quadraticCurveTo(x0, zFar, x0 + r, zFar);
  const slabGeo = bag.add(new THREE.ExtrudeGeometry(shape, { depth: 2, bevelEnabled: true, bevelThickness: 0.8, bevelSize: 0.8, bevelSegments: 3, curveSegments: 6 }));
  slabGeo.rotateX(Math.PI / 2); // the shape's y becomes z, and the slab hangs below y = 0
  const slab = new THREE.Mesh(slabGeo, bag.add(new THREE.MeshStandardMaterial({ color: PAL.grass, roughness: 0.9, metalness: 0, map: noiseTexture(bag) })));
  slab.position.y = -0.8; // the bevel's top sits at y = 0
  slab.receiveShadow = true;
  group.add(slab);

  const nearStop = (s, d) => stops.some((t) => Math.abs(s - t) < d);
  const sideOf = (s, off) => { line.at(s, p); return [p.x + p.nx * off, p.z + p.nz * off]; };

  // two-tone grass patches
  const patchGeo = bag.geo('patch', () => new THREE.CircleGeometry(1, 28).rotateX(-Math.PI / 2));
  const patches = new THREE.InstancedMesh(patchGeo, bag.paint(PAL.grassDark, { roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }), 60);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3(), e = new THREE.Euler();
  for (let i = 0; i < 60; i++) {
    const s = line.start + (i / 60) * (line.end - line.start), off = (R() < 0.5 ? -1 : 1) * (3 + R() * 18);
    const [x, z] = sideOf(s, off);
    patches.setMatrixAt(i, m.compose(v.set(x, 0.012, z), q.setFromEuler(e.set(0, R() * 3, 0)), sc.set(2 + R() * 4, 1, 1.5 + R() * 3)));
  }
  patches.receiveShadow = true;
  group.add(patches);

  // rounded hills, away from the line
  const hillGeo = bag.geo('hill', () => new THREE.SphereGeometry(1, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2));
  for (let i = 0; i < 16; i++) {
    const s = line.start + 6 + i * ((line.end - line.start) / 16) + R() * 4, off = (i % 2 ? 1 : -1) * (13 + R() * 10);
    const [x, z] = sideOf(s, off);
    const hill = new THREE.Mesh(hillGeo, bag.paint(i % 3 ? '#5CCB86' : '#47B873', { roughness: 0.9 }));
    hill.scale.set(5 + R() * 4, 1.6 + R() * 1.6, 4 + R() * 3);
    hill.position.set(x, -0.05, z);
    hill.receiveShadow = true; hill.castShadow = true;
    group.add(hill);
  }

  // the river crosses the line between the second and third stops, under a wooden bridge
  const riverS = (stops[1] + stops[2]) / 2 || stops[0] + 4.5;
  line.at(riverS, p);
  const riverZ = p.z, riverX = p.x;
  const riverShape = [];
  for (let x = -W / 2; x <= W / 2; x += 2) riverShape.push(new THREE.Vector2(x, riverZ + Math.sin(x * 0.12) * 2.2 - Math.sin(riverX * 0.12) * 2.2));
  const ribbon = (width, y, color) => {
    const pos = [], idx = [];
    riverShape.forEach((pt, i) => { pos.push(pt.x, y, pt.y - width / 2, pt.x, y, pt.y + width / 2); if (i) { const a = (i - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } });
    const g = bag.add(new THREE.BufferGeometry());
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    const mesh = new THREE.Mesh(g, bag.paint(color, { roughness: color === PAL.water ? 0.25 : 0.9, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, side: THREE.DoubleSide }));
    mesh.receiveShadow = true;
    return mesh;
  };
  group.add(ribbon(4.6, 0.02, PAL.cream), ribbon(3.4, 0.035, PAL.water));
  // the bridge: a plank deck and two low rails, across the river under the track
  const bridge = new THREE.Group();
  bridge.position.set(riverX, 0, riverZ);
  bridge.rotation.y = p.heading;
  for (let k = -2.4; k <= 2.4; k += 0.42) { const pl = block(bag, 2.9, 0.12, 0.36, k % 0.84 ? '#C99A5B' : '#B98A4E', { r: 0.04 }); pl.position.set(0, 0.07, k); bridge.add(pl); }
  for (const x of [-1.5, 1.5]) {
    const railing = block(bag, 0.12, 0.12, 5.2, '#A87B4F', { r: 0.04 });
    railing.position.set(x, 0.62, 0); bridge.add(railing);
    for (const z of [-2.4, -0.8, 0.8, 2.4]) { const post = block(bag, 0.14, 0.6, 0.14, '#A87B4F', { r: 0.04 }); post.position.set(x, 0.32, z); bridge.add(post); }
  }
  group.add(bridge);

  // trees: round crowns on short trunks in three greens, and a few stacked-cone pines; flowers in small clusters
  const spots = [];
  for (let s = line.start + 2; s < line.end; s += 1.2) {
    for (const side of [-1, 1]) {
      if (R() < 0.35) continue;
      const near = R() < 0.55;
      const off = side * (near ? 4.6 + R() * 4 : 8.6 + R() * 12);
      if (Math.abs(off) < 7 && nearStop(s, 3.2)) continue;
      const [x, z] = sideOf(s, off);
      if (Math.abs(z - riverZ - Math.sin(x * 0.12) * 2.2 + Math.sin(riverX * 0.12) * 2.2) < 3.2) continue;
      spots.push([x, z, R()]);
    }
  }
  const rounds = spots.filter((sp) => sp[2] < 0.72), pines = spots.filter((sp) => sp[2] >= 0.72);
  const trunkMesh = new THREE.InstancedMesh(bag.geo('trunk', () => new THREE.CylinderGeometry(0.12, 0.17, 0.9, 8)), bag.paint(PAL.trunk), spots.length);
  const crownMesh = new THREE.InstancedMesh(bag.geo('crown', () => new THREE.SphereGeometry(0.75, 12, 8)), bag.paint('#ffffff', { roughness: 0.8 }), rounds.length);
  const pineMesh = new THREE.InstancedMesh(bag.geo('pine', () => { const a = new THREE.ConeGeometry(0.7, 1.1, 8); a.translate(0, 0.3, 0); return a; }), bag.paint('#ffffff', { roughness: 0.8 }), pines.length * 2);
  const col = new THREE.Color();
  spots.forEach(([x, z, k], i) => {
    const s = 0.8 + ((k * 7) % 1) * 0.6;
    trunkMesh.setMatrixAt(i, m.compose(v.set(x, 0.45 * s, z), q.identity(), sc.set(s, s, s)));
  });
  rounds.forEach(([x, z, k], i) => {
    const s = 0.8 + ((k * 7) % 1) * 0.6;
    crownMesh.setMatrixAt(i, m.compose(v.set(x, 1.3 * s, z), q.identity(), sc.set(s, s * 1.05, s)));
    crownMesh.setColorAt(i, col.set(PAL.greens[i % 3]));
  });
  pines.forEach(([x, z, k], i) => {
    const s = 0.8 + ((k * 7) % 1) * 0.6;
    pineMesh.setMatrixAt(i * 2, m.compose(v.set(x, 0.9 * s, z), q.identity(), sc.set(s, s, s)));
    pineMesh.setMatrixAt(i * 2 + 1, m.compose(v.set(x, 1.55 * s, z), q.identity(), sc.set(s * 0.72, s * 0.85, s * 0.72)));
    pineMesh.setColorAt(i * 2, col.set('#2C9A58')); pineMesh.setColorAt(i * 2 + 1, col.set('#36A963'));
  });
  for (const mesh of [trunkMesh, crownMesh, pineMesh]) { mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh); }

  const flowerCols = ['#FFFFFF', PAL.sun, '#FF8A8A', '#C9B6FF'];
  const flowers = new THREE.InstancedMesh(bag.geo('flower', () => new THREE.SphereGeometry(0.11, 6, 4)), bag.paint('#ffffff', { roughness: 0.7 }), 260);
  for (let i = 0; i < 260; i++) {
    const cluster = Math.floor(i / 5), s = line.start + 4 + (cluster / 52) * (line.end - line.start - 8);
    const off = (cluster % 2 ? 1 : -1) * (3.6 + ((cluster * 37) % 11));
    const [x, z] = sideOf(s, off);
    flowers.setMatrixAt(i, m.compose(v.set(x + (R() - 0.5) * 1.4, 0.1, z + (R() - 0.5) * 1.4), q.identity(), sc.set(1, 0.7, 1)));
    flowers.setColorAt(i, col.set(flowerCols[cluster % flowerCols.length]));
  }
  group.add(flowers);

  // a water tower by the fifth stop and a windmill by the tenth, on the far side from the platforms
  const landmark = (i, off) => { const s = stops[Math.min(i, stops.length - 1)] - 1; const [x, z] = sideOf(s, off); return new THREE.Vector3(x, 0, z); };
  const tower = new THREE.Group();
  for (const [x, z] of [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]]) { const leg = block(bag, 0.16, 2.2, 0.16, '#A87B4F', { r: 0.05 }); leg.position.set(x, 1.1, z); tower.add(leg); }
  const tank = new THREE.Mesh(bag.geo('tank', () => new THREE.CylinderGeometry(1.0, 1.0, 1.3, 24)), bag.paint(PAL.red)); tank.position.y = 2.75; tank.castShadow = true; tower.add(tank);
  const tankRoof = new THREE.Mesh(bag.geo('tankroof', () => new THREE.ConeGeometry(1.15, 0.6, 24)), bag.paint(PAL.navy)); tankRoof.position.y = 3.7; tankRoof.castShadow = true; tower.add(tankRoof);
  const band = new THREE.Mesh(bag.geo('tankband', () => new THREE.CylinderGeometry(1.03, 1.03, 0.14, 24)), bag.paint(PAL.sun)); band.position.y = 2.5; tower.add(band);
  tower.position.copy(landmark(5, -4.4));
  group.add(tower);
  const mill = new THREE.Group();
  const millBody = new THREE.Mesh(bag.geo('mill', () => new THREE.CylinderGeometry(0.7, 1.1, 3, 16)), bag.paint('#FFF3E0')); millBody.position.y = 1.5; millBody.castShadow = true; mill.add(millBody);
  const millCap = new THREE.Mesh(bag.geo('millcap', () => new THREE.ConeGeometry(0.95, 1, 16)), bag.paint(PAL.red)); millCap.position.y = 3.5; millCap.castShadow = true; mill.add(millCap);
  const blades = new THREE.Group(); blades.position.set(0, 3.0, 0.85);
  for (let k = 0; k < 4; k++) { const b = block(bag, 0.36, 1.7, 0.06, '#FFFFFF', { r: 0.03 }); b.position.y = 0.95; const arm = new THREE.Group(); arm.rotation.z = k * Math.PI / 2 + 0.4; arm.add(b); blades.add(arm); }
  const hubBall = new THREE.Mesh(bag.geo('hubball', () => new THREE.SphereGeometry(0.16, 10, 8)), bag.paint(PAL.sun)); blades.add(hubBall);
  mill.add(blades);
  mill.position.copy(landmark(9, -6));
  group.add(mill);

  // the tunnel: a long low hill over the line between two stops further on, with a stone arch at each end
  const tunnelS = stops.length > 13 ? (stops[12] + stops[13]) / 2 : null;
  if (tunnelS !== null) {
    line.at(tunnelS, p);
    const hill = new THREE.Mesh(hillGeo, bag.paint('#53C27F', { roughness: 0.9 }));
    hill.scale.set(4.2, 2.3, 3.2);
    hill.position.set(p.x, -0.1, p.z);
    hill.rotation.y = p.heading;
    hill.castShadow = true; hill.receiveShadow = true;
    group.add(hill);
    for (const end of [-1, 1]) {
      line.at(tunnelS + end * 3.0, p);
      const portal = new THREE.Group();
      portal.position.set(p.x, 0, p.z); portal.rotation.y = p.heading;
      const arch = new THREE.Mesh(bag.geo('arch', () => new THREE.TorusGeometry(1.15, 0.28, 10, 20, Math.PI)), bag.paint('#E9DCC6'));
      arch.position.y = 1.0; arch.castShadow = true;
      const dark = new THREE.Mesh(bag.geo('archdark', () => new THREE.CircleGeometry(1.0, 20, 0, Math.PI)), bag.paint('#3A2E2A', { roughness: 1 }));
      dark.position.set(0, 1.0, -end * 0.05);
      if (end < 0) dark.rotation.y = Math.PI;
      for (const x of [-1.15, 1.15]) { const pier = block(bag, 0.56, 1.0, 0.5, '#E9DCC6', { r: 0.1 }); pier.position.set(x, 0.5, 0); portal.add(pier); }
      const darkLow = block(bag, 2.0, 1.0, 0.02, '#3A2E2A', { r: 0.005, shadow: false }); darkLow.position.set(0, 0.5, -end * 0.05);
      portal.add(arch, dark, darkLow);
      group.add(portal);
    }
  }

  // clouds: a few puffy white lumps floating low over the island to either side of the line (the screen keeps them
  // beside the camera's look point), drifting very slowly to and fro in their own lane, so they never cover the track
  const clouds = new THREE.Group();
  const cloudMat = bag.paint('#FFFFFF', { roughness: 1, emissive: '#FFF6E5', emissiveIntensity: 0.45, transparent: true, opacity: 0.94 });
  const puff = bag.geo('cloudpuff', () => new THREE.SphereGeometry(1, 16, 12));
  for (let i = 0; i < 6; i++) {
    const c = new THREE.Group();
    for (let k = 0; k < 4; k++) { const b = new THREE.Mesh(puff, cloudMat); b.position.set((k - 1.5) * 0.9, (k % 2) * 0.35, (k % 3) * 0.2); b.scale.setScalar(0.75 + (k % 3) * 0.25); c.add(b); }
    const side = i % 2 ? 1 : -1;
    c.userData.base = side * (8.5 + R() * 6);
    c.userData.phase = R() * 6;
    c.position.set(c.userData.base, 6.2 + R() * 1.8, -4 - i * 3.2 - R() * 2);
    c.scale.set(1, 0.8, 0.8);
    clouds.add(c);
  }
  return { group, clouds, blades };
}
