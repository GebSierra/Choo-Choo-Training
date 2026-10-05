// The child's figure in 3D: the same figure as js/art/kid.js, built as a toy from spheres and capsules like Pip
// (js/train/pip3d.js). About 1.2 units tall, feet at y 0, facing +z. It stands on the platform of the current stop and
// waves when the train arrives. It does not breathe or blink: it is drawn only while something else moves.
//   const kid = buildKid(bag, character); kid.group (named 'kid'); kid.tick(t, still); kid.wave(on, t); kid.waving
import { THREE } from './world.js';
import { SKINS, HAIR_COLORS, HAIR_STYLES, OUTFIT, outfitOf, mixHex } from '../character.js';

export function buildKid(bag, character = {}) {
  const skin = SKINS[character.skin] || SKINS[2], hairC = HAIR_COLORS[character.hairColor] || HAIR_COLORS[1];
  const style = HAIR_STYLES.includes(character.hair) ? character.hair : 'short';
  const mat = (c, o) => bag.paint(c, { roughness: 0.6, ...o });
  const sph = (r, c, seg = 18) => new THREE.Mesh(bag.geo(`ksph${r},${seg}`, () => new THREE.SphereGeometry(r, seg, Math.round(seg * 0.7))), mat(c));
  const cylm = (rt, rb, h, c, seg = 18) => new THREE.Mesh(bag.geo(`kcyl${rt},${rb},${h},${seg}`, () => new THREE.CylinderGeometry(rt, rb, h, seg)), mat(c));
  const caps = (r, l, c) => new THREE.Mesh(bag.geo(`kcap${r},${l}`, () => new THREE.CapsuleGeometry(r, l, 4, 10)), mat(c));
  const place = (o, x, y, z) => { o.position.set(x, y, z); return o; };

  const group = new THREE.Group();
  group.name = 'kid';
  group.scale.setScalar(1.15); // a little taller than the toy it stands beside, so it reads from the camera above

  const o = outfitOf(character.outfit), topC = o.top;
  // legs and shoes
  for (const x of [-0.1, 0.1]) {
    group.add(place(caps(0.07, 0.22, o.legs || skin), x, 0.24, 0));
    const shoe = sph(0.095, OUTFIT.shoe, 14); shoe.scale.set(1, 0.6, 1.4); group.add(place(shoe, x, 0.06, 0.04));
  }
  // the shirt, and what goes with it (the torso is a cone: 0.24 wide at y 0.37 and 0.2 at y 0.73)
  group.add(place(cylm(0.2, 0.24, 0.36, topC), 0, 0.55, 0));
  const wr = (y) => 0.24 - ((y - 0.37) / 0.36) * 0.04; // the torso's radius at height y
  const ring = (y, hgt, col, grow = 0.006) => group.add(place(cylm(wr(y + hgt / 2) + grow, wr(y - hgt / 2) + grow, hgt, col, 22), 0, y, 0));
  const chestStar = (y) => { const st = sph(0.06, OUTFIT.star, 10); st.scale.set(1, 1, 0.25); group.add(place(st, 0, y, wr(y) - 0.015)); };
  const btn3 = (x, y, z) => group.add(place(sph(0.017, '#FFD166', 8), x, y, z));
  if (o.id === 'star') chestStar(0.58);
  else if (o.id === 'stripes') for (const y of [0.45, 0.55, 0.65]) ring(y, 0.05, o.stripe);
  else if (o.id === 'hoodie') {
    const hood = sph(0.13, mixHex(topC, '#000000', 0.12), 14); hood.scale.set(1.5, 0.8, 1); group.add(place(hood, 0, 0.74, -0.1));
    const pocket = new THREE.Mesh(bag.geo('kpocket', () => new THREE.BoxGeometry(0.2, 0.09, 0.02)), mat(mixHex(topC, '#000000', 0.15))); group.add(place(pocket, 0, 0.45, wr(0.45) + 0.004));
    for (const x of [-0.04, 0.04]) group.add(place(cylm(0.008, 0.008, 0.1, '#ffffff', 6), x, 0.65, wr(0.65) + 0.004));
  } else if (o.id === 'dress') {
    group.add(place(cylm(0.22, 0.36, 0.26, topC, 24), 0, 0.4, 0));
    ring(0.5, 0.03, mixHex(topC, '#000000', 0.15), 0.008);
  } else if (o.id === 'overalls') {
    ring(0.42, 0.14, o.bib, 0.007);
    const bib = new THREE.Mesh(bag.geo('kbib', () => new THREE.BoxGeometry(0.2, 0.17, 0.02)), mat(o.bib)); group.add(place(bib, 0, 0.58, wr(0.58) + 0.004));
    for (const x of [-0.07, 0.07]) { const strap = new THREE.Mesh(bag.geo('kstrap', () => new THREE.BoxGeometry(0.035, 0.2, 0.03)), mat(o.bib)); strap.rotation.z = -x * 0.8; group.add(place(strap, x, 0.7, 0.19)); btn3(x, 0.63, wr(0.63) + 0.016); }
  } else if (o.id === 'vest') {
    ring(0.55, 0.36, o.vest, 0.01);
    const v = new THREE.Mesh(bag.geo('kvee', () => new THREE.BoxGeometry(0.07, 0.17, 0.02)), mat(topC)); v.rotation.z = 0; group.add(place(v, 0, 0.64, wr(0.64) + 0.02));
    const tie = sph(0.03, '#E5484D', 8); tie.scale.set(1.3, 0.8, 0.5); group.add(place(tie, 0, 0.71, wr(0.71) + 0.022));
    for (const y of [0.5, 0.43]) btn3(0, y, wr(y) + 0.02);
  } else if (o.id === 'sweater') {
    ring(0.4, 0.07, mixHex(topC, '#000000', 0.18), 0.008);
    chestStar(0.58);
  }
  // arms pivot at the shoulder
  const arm = (side) => {
    const g = new THREE.Group();
    g.position.set(side * 0.22, 0.68, 0);
    g.add(place(caps(0.06, 0.15, topC), 0, -0.13, 0), place(sph(0.065, skin, 12), 0, -0.27, 0));
    g.rotation.z = side * 0.22;
    group.add(g);
    return g;
  };
  const armL = arm(1), armR = arm(-1); // +x is the figure's left (it faces +z)
  group.add(place(cylm(0.07, 0.08, 0.1, skin), 0, 0.76, 0));

  // the head, tipped back so the camera above sees the face
  const head = new THREE.Group();
  head.position.y = 0.97; head.rotation.x = -0.45;
  group.add(head);
  head.add(sph(0.27, skin, 26));
  for (const x of [-0.27, 0.27]) head.add(place(sph(0.06, skin, 10), x, -0.02, 0));
  for (const x of [-0.095, 0.095]) {
    const e = sph(0.045, '#2A1E1A', 12); e.scale.set(0.85, 1.1, 0.6); head.add(place(e, x, 0.0, 0.245));
    const glint = new THREE.Mesh(bag.geo('kglint', () => new THREE.SphereGeometry(0.016, 8, 6)), bag.paint('#ffffff', { emissive: '#ffffff', emissiveIntensity: 0.6 }));
    head.add(place(glint, x + 0.018, 0.022, 0.275));
    const c = sph(0.05, '#F28B82', 10); c.scale.set(1.1, 0.7, 0.3); c.material = bag.paint('#F28B82', { transparent: true, opacity: 0.7 }); head.add(place(c, x * 1.9, -0.09, 0.225));
  }
  const mouth = new THREE.Mesh(bag.geo('kmouth', () => new THREE.TorusGeometry(0.05, 0.012, 6, 14, Math.PI)), mat('#7A3B2E'));
  mouth.rotation.z = Math.PI; head.add(place(mouth, 0, -0.12, 0.25));

  // hair, from spheres: a cap over the crown for most styles
  const hair = (r, x, y, z, sx = 1, sy = 1, sz = 1, col = hairC) => { const m = sph(r, col, 18); m.scale.set(sx, sy, sz); return head.add(place(m, x, y, z)); };
  const crown = () => hair(0.285, 0, 0.07, -0.03, 1, 0.85, 1.02);
  if (style === 'curly') {
    const n = 10;
    for (let k = 0; k < n; k++) { const a = Math.PI * (0.05 + (0.9 * k) / (n - 1)); hair(0.1, Math.cos(a) * 0.24, 0.1 + Math.sin(a) * 0.2, -0.04 + (k % 2) * 0.03); }
    hair(0.11, 0, 0.27, -0.02); hair(0.09, -0.12, 0.23, 0.1); hair(0.09, 0.12, 0.23, 0.1);
  } else if (style === 'puffs') {
    crown(); hair(0.13, -0.27, 0.2, -0.04); hair(0.13, 0.27, 0.2, -0.04);
  } else if (style === 'ponytail') {
    crown();
    const tail = new THREE.Mesh(bag.geo('ktail', () => new THREE.CapsuleGeometry(0.06, 0.28, 4, 10)), mat(hairC));
    tail.position.set(0, 0.0, -0.3); tail.rotation.x = -0.9; head.add(tail);
    head.add(place(sph(0.04, OUTFIT.band, 8), 0, 0.12, -0.27));
  } else if (style === 'bun') {
    crown(); hair(0.12, 0, 0.3, -0.12);
    head.add(place(sph(0.035, OUTFIT.band, 8), 0, 0.2, -0.12));
  } else if (style === 'long') {
    crown(); hair(0.3, 0, -0.1, -0.2, 1.0, 1.25, 0.55); hair(0.12, -0.17, -0.3, -0.24, 1, 1.4, 0.7); hair(0.12, 0.17, -0.3, -0.24, 1, 1.4, 0.7); hair(0.12, 0, -0.34, -0.26, 1, 1.4, 0.7);
  } else if (style === 'braids') {
    crown();
    for (const side of [-1, 1]) for (let k = 0; k < 3; k++) hair(0.062 - k * 0.004, side * (0.27 + (k % 2) * 0.012), -0.08 - k * 0.1, -0.06, 1, 1.15, 1);
    for (const side of [-1, 1]) head.add(place(sph(0.035, OUTFIT.band, 8), side * 0.27, -0.38, -0.06));
  } else if (style === 'afro') {
    hair(0.33, 0, 0.12, -0.12, 1, 0.95, 0.9);
    const n = 8; for (let k = 0; k < n; k++) { const a = Math.PI * (0.02 + (0.96 * k) / (n - 1)); hair(0.12, Math.cos(a) * 0.3, 0.1 + Math.sin(a) * 0.27, -0.06 + (k % 2) * 0.02); }
    hair(0.11, -0.12, 0.27, 0.08); hair(0.11, 0.12, 0.27, 0.08); hair(0.11, 0, 0.3, 0.04);
  } else if (style === 'bob') {
    crown(); hair(0.3, 0, -0.07, -0.12, 1.02, 1.0, 0.78);
  } else if (style === 'buzz') {
    hair(0.275, 0, 0.06, -0.03, 1, 0.8, 1.0, mixHex(hairC, skin, 0.45));
  } else { crown(); }
  group.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });

  let waving = false, waveStart = 0;
  return {
    group,
    // t in seconds. Only the waving arm moves; every other part holds still.
    tick(t, still = false) {
      if (waving && !still) armR.rotation.z = -2.5 + Math.sin((t - waveStart) * 9) * 0.35;
      else armR.rotation.z = waving ? -2.5 : -0.22;
      armL.rotation.z = 0.22;
    },
    wave(on, t = 0) { waving = on; waveStart = t; },
    get waving() { return waving; },
  };
}
