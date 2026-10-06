// Pip in 3D: the same toddler conductor as js/art/pip.js, built as a toy from spheres, cylinders and capsules in the same
// colours (PIP). About 1 unit tall, his head and cap a little over half of that. He sits in the engine's cab.
//   const pip = buildPip(bag); pip.group; pip.tick(t) (breathing, blinking, glancing); pip.wave(on); pip.lean(k)
import { THREE } from './world.js';
import { PIP } from '../art/pip.js';

export function buildPip(bag) {
  const mat = (c, o) => bag.paint(c, { roughness: 0.6, ...o });
  const sph = (r, c, seg = 20) => new THREE.Mesh(bag.geo(`sph${r},${seg}`, () => new THREE.SphereGeometry(r, seg, Math.round(seg * 0.7))), mat(c));
  const cylm = (rt, rb, h, c, seg = 20) => new THREE.Mesh(bag.geo(`pcyl${rt},${rb},${h},${seg}`, () => new THREE.CylinderGeometry(rt, rb, h, seg)), mat(c));
  const caps = (r, l, c) => new THREE.Mesh(bag.geo(`cap${r},${l}`, () => new THREE.CapsuleGeometry(r, l, 4, 10)), mat(c));
  const shadowy = (o) => { o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); return o; };

  const group = new THREE.Group();   // Pip's feet at y 0, facing +z
  const lean = new THREE.Group();    // leans out of the cab
  const body = new THREE.Group();    // breathes
  group.add(lean); lean.add(body);

  // overalls and shirt
  const torso = cylm(0.2, 0.24, 0.42, PIP.overalls);
  torso.position.y = 0.26;
  body.add(torso);
  const shirt = cylm(0.17, 0.2, 0.14, PIP.shirt);
  shirt.name = 'pip-shirt';
  shirt.position.y = 0.5;
  body.add(shirt);
  for (const x of [-0.09, 0.09]) { const b = sph(0.028, PIP.button, 10); b.position.set(x, 0.38, 0.2); body.add(b); }
  const scarf = cylm(0.0, 0.13, 0.16, PIP.scarf, 3);
  scarf.rotation.x = Math.PI; scarf.position.set(0, 0.52, 0.1); scarf.scale.set(1.3, 1, 0.6);
  body.add(scarf);

  // arms: a cream sleeve and a round hand, pivoting at the shoulder
  const arm = (side) => {
    const g = new THREE.Group();
    g.position.set(side * 0.21, 0.5, 0);
    const sleeve = caps(0.065, 0.2, PIP.shirt);
    sleeve.position.y = -0.14;
    const hand = sph(0.075, PIP.skin, 14);
    hand.position.y = -0.3;
    g.add(sleeve, hand);
    g.rotation.z = side * 0.25;
    body.add(g);
    return g;
  };
  const armL = arm(1), armR = arm(-1); // +x is Pip's left (he faces +z)

  // the head
  const head = new THREE.Group();
  head.position.y = 0.82;
  head.rotation.x = -0.55; // looking up, so the camera above sees his face
  body.add(head);
  const skull = sph(0.33, PIP.skin, 28);
  skull.name = 'pip-skull';
  head.add(skull);
  for (const x of [-0.32, 0.32]) { const e = sph(0.08, PIP.skinShade, 12); e.position.set(x, -0.02, 0); head.add(e); }
  const eyes = new THREE.Group();
  head.add(eyes);
  // big eyes, as on the 2D Pip: dark, a warm brown iris, a pupil and two sparkles
  const glintMat = bag.paint('#ffffff', { emissive: '#ffffff', emissiveIntensity: 0.6 });
  for (const x of [-0.125, 0.125]) {
    const e = sph(0.078, PIP.eye, 16); e.scale.set(0.85, 1.05, 0.55); e.position.set(x, -0.005, 0.285); eyes.add(e);
    const iris = sph(0.052, '#5A3626', 14); iris.scale.set(0.85, 1.05, 0.3); iris.position.set(x + 0.004, -0.018, 0.316); eyes.add(iris);
    const pupil = sph(0.03, PIP.eye, 10); pupil.scale.set(0.85, 1.05, 0.3); pupil.position.set(x + 0.004, -0.018, 0.324); eyes.add(pupil);
    const glint = new THREE.Mesh(bag.geo('glint', () => new THREE.SphereGeometry(0.026, 8, 6)), glintMat);
    glint.position.set(x + 0.026, 0.034, 0.326); eyes.add(glint);
    const glint2 = new THREE.Mesh(bag.geo('glint2', () => new THREE.SphereGeometry(0.012, 6, 5)), glintMat);
    glint2.position.set(x - 0.026, -0.04, 0.326); eyes.add(glint2);
  }
  for (const x of [-0.2, 0.2]) { const c = sph(0.06, PIP.cheek, 12); c.scale.set(1.1, 0.7, 0.3); c.position.set(x, -0.11, 0.27); c.material = bag.paint(PIP.cheek, { transparent: true, opacity: 0.75 }); head.add(c); }
  const nose = sph(0.035, PIP.skinShade, 10); nose.position.set(0, -0.07, 0.33); head.add(nose);
  const mouth = new THREE.Mesh(bag.geo('mouth', () => new THREE.TorusGeometry(0.06, 0.014, 6, 14, Math.PI)), mat(PIP.mouth));
  mouth.rotation.z = Math.PI; mouth.position.set(0, -0.14, 0.3); head.add(mouth);
  // the cap, a size too big, tipped a little
  const cap = new THREE.Group();
  cap.position.set(0, 0.2, -0.04); cap.rotation.set(-0.22, 0, 0.08);
  head.add(cap);
  const crown = sph(0.35, PIP.cap, 26); crown.scale.set(1, 0.6, 0.95); crown.position.set(0, 0.05, -0.04);
  const band = cylm(0.34, 0.35, 0.09, PIP.capDark, 26); band.position.set(0, 0.0, -0.03);
  const brim = cylm(0.3, 0.3, 0.035, PIP.capDark, 22); brim.scale.set(1, 1, 0.55); brim.position.set(0, -0.03, 0.27);
  const badge = cylm(0.07, 0.07, 0.02, PIP.badge, 16); badge.rotation.x = Math.PI / 2 - 0.5; badge.position.set(0, 0.14, 0.31);
  badge.material = bag.paint(PIP.badge, { emissive: '#B07A10', emissiveIntensity: 0.2, roughness: 0.4 });
  cap.add(crown, band, brim, badge);
  // a little engine on the badge (boiler, cab, chimney), and a button on top of the cap
  const engine = new THREE.Group(); engine.rotation.x = -0.5; engine.position.set(0, 0.14, 0.322); cap.add(engine);
  const ebox = (w, h, x, y) => { const m = new THREE.Mesh(bag.geo(`pe${w},${h}`, () => new THREE.BoxGeometry(w, h, 0.012)), mat(PIP.cap)); m.position.set(x, y, 0); engine.add(m); };
  ebox(0.06, 0.03, -0.012, -0.004); ebox(0.034, 0.056, 0.03, 0.008); ebox(0.014, 0.026, -0.028, 0.024);
  const top = sph(0.035, PIP.capLight, 10); top.position.set(0, 0.26, -0.04); cap.add(top);
  // two eyebrows and a tuft of hair at each temple, mirrored (as on the 2D Pip)
  for (const side of [-1, 1]) {
    const brow = new THREE.Mesh(bag.geo('brow', () => new THREE.CapsuleGeometry(0.016, 0.07, 3, 8)), mat(PIP.hair));
    brow.name = 'pip-brow'; brow.rotation.z = Math.PI / 2 - side * 0.12; brow.position.set(side * 0.12, 0.1, 0.295); head.add(brow);
    const tuft = sph(0.06, PIP.hair, 10); tuft.name = 'pip-hair'; tuft.scale.set(0.8, 1.2, 0.8); tuft.position.set(side * 0.28, 0.06, 0.14); head.add(tuft);
  }
  shadowy(group);

  let waving = false, leanK = 0, waveStart = 0, lastLookSwitch = 0, lookTo = 0;
  return {
    group,
    // t in seconds. breathing, a blink every few seconds, and a slow glance around.
    tick(t, still = false) {
      body.scale.y = still ? 1 : 1 + Math.sin(t * 2.4) * 0.012;
      const blink = (t % 4.3) < 0.13;
      eyes.scale.y = !still && blink ? 0.15 : 1;
      if (!still && t - lastLookSwitch > 2.6) { lastLookSwitch = t; lookTo = [0, 0.35, 0, -0.3][Math.floor(t / 2.6) % 4]; }
      head.rotation.y += ((still ? 0 : lookTo) - head.rotation.y) * 0.12;
      head.rotation.x = -0.55;
      if (waving) {
        const w = t - waveStart;
        armR.rotation.z = -2.5 + Math.sin(w * 9) * 0.35;
        armL.rotation.z = 0.25;
      } else { armR.rotation.z = -0.25; armL.rotation.z = 0.25; }
      lean.rotation.x = leanK * 0.35; lean.position.z = leanK * 0.16;
    },
    wave(on, t = 0) { waving = on; waveStart = t; },
    lean(k) { leanK = k; },
    get waving() { return waving; },
  };
}
