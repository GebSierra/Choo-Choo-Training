// The child's figure in 3D: the same figure as js/art/kid.js, built as a toy from spheres and capsules like Pip
// (js/train/pip3d.js). About 1.2 units tall, feet at y 0, facing +z. It stands on the platform of the current stop and
// waves when the train arrives. It does not breathe or blink: it is drawn only while something else moves.
//   const kid = buildKid(bag, character); kid.group (named 'kid'); kid.tick(t, still); kid.wave(on, t); kid.waving
import { THREE } from './world.js';
import { SKINS, HAIR_COLORS, HAIR_STYLES, OUTFIT } from '../character.js';

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

  // legs and shoes
  for (const x of [-0.1, 0.1]) {
    group.add(place(caps(0.07, 0.22, OUTFIT.trousers), x, 0.24, 0));
    const shoe = sph(0.095, OUTFIT.shoe, 14); shoe.scale.set(1, 0.6, 1.4); group.add(place(shoe, x, 0.06, 0.04));
  }
  // the tee, with a star on the chest
  group.add(place(cylm(0.2, 0.24, 0.36, OUTFIT.tee), 0, 0.55, 0));
  const star = sph(0.06, OUTFIT.star, 10); star.scale.set(1, 1, 0.25); group.add(place(star, 0, 0.58, 0.225));
  // arms pivot at the shoulder
  const arm = (side) => {
    const g = new THREE.Group();
    g.position.set(side * 0.22, 0.68, 0);
    g.add(place(caps(0.06, 0.15, OUTFIT.tee), 0, -0.13, 0), place(sph(0.065, skin, 12), 0, -0.27, 0));
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
  const hair = (r, x, y, z, sx = 1, sy = 1, sz = 1) => { const m = sph(r, hairC, 18); m.scale.set(sx, sy, sz); return head.add(place(m, x, y, z)); };
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
