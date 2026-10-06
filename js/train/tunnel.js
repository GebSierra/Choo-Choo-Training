// The level tunnel: a grass-green hill with a stone arch, built only while a level celebration plays. It stands on the
// line ahead of the current stop; the train rolls in until the engine is inside, toots, and backs out. Everything is made
// through the scene's bag (disposed with Home) and nothing in it moves, so it adds no frames of its own.
import { THREE, PAL } from './world.js';

export const TUNNEL_AT = 4.8; // the hill's middle, this far past the current stop's middle
export const IN = 4.6;        // how far the engine rolls in from its resting place
const WIDTH = 3.0, HEIGHT = 3.0, LENGTH = 3.8; // the hill, in world units
const MOUTH_W = 1.0, MOUTH_H = 1.75;           // the arch's half width and height

// s: the distance along the line of the hill's middle. Returns { group }.
export function buildTunnel(bag, line, s) {
  const group = new THREE.Group();
  group.name = 'tunnel';
  const p = line.at(s);
  const grass = bag.paint(PAL.grassDark, { roughness: 0.85 });
  // the hill: half a cylinder lying along the line (round side up, its flat face below the ground), scaled to an arch-shaped mound
  const body = new THREE.Mesh(bag.geo('tunnelhill', () => { const g = new THREE.CylinderGeometry(1, 1, 1, 32, 1, false, 0, Math.PI); g.rotateZ(Math.PI / 2); g.rotateY(Math.PI / 2); return g; }), grass);
  body.scale.set(WIDTH / 2, HEIGHT, LENGTH);
  body.position.y = -0.05;
  body.castShadow = true; body.receiveShadow = true;
  group.add(body);
  // the dark mouth facing back along the line, with a stone ring around it
  const mouth = new THREE.Mesh(bag.geo('tunnelmouth', () => new THREE.CircleGeometry(1, 28, 0, Math.PI)), bag.paint(PAL.navy, { roughness: 1 }));
  mouth.scale.set(MOUTH_W, MOUTH_H, 1); mouth.rotation.y = Math.PI; mouth.position.set(0, 0.02, -LENGTH / 2 - 0.02);
  group.add(mouth);
  const ring = new THREE.Mesh(bag.geo('tunnelring', () => new THREE.TorusGeometry(1, 0.13, 10, 28, Math.PI)), bag.paint(PAL.locked, { roughness: 0.9 }));
  ring.scale.set(MOUTH_W + 0.12, MOUTH_H + 0.12, 1.3); ring.rotation.y = Math.PI; ring.position.set(0, 0.02, -LENGTH / 2 - 0.03); ring.castShadow = true;
  group.add(ring);
  for (const side of [-1, 1]) { // the stones at the feet of the arch
    const foot = new THREE.Mesh(bag.box(0.34, 0.34, 0.4, 0.08), bag.paint(PAL.locked, { roughness: 0.9 }));
    foot.position.set(side * (MOUTH_W + 0.12), 0.17, -LENGTH / 2 - 0.05); foot.castShadow = true;
    group.add(foot);
  }
  group.position.set(p.x, 0, p.z);
  group.rotation.y = p.heading;
  return { group };
}
