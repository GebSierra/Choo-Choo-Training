// The tunnel portal: a grass-green hill with a stone arch. It is the world's end on the Home (a permanent portal a short way
// past the last station, with a soft glow in the next world's colour and a signpost beside it), the tunnel the train rolls
// out of at the start of a later world (flipped, no sign), and the level celebration's tunnel. The train rolls in until the
// engine is inside, toots, and backs out (level) or goes on into the next world (crossing). Everything is made through the
// scene's bag (disposed with Home) and nothing in it moves, so it adds no frames of its own.
import { THREE, PAL, block } from './world.js';

export const TUNNEL_AT = 4.8; // the hill's middle, this far past the current stop's middle
export const IN = 4.6;        // how far the engine rolls in from its resting place
const WIDTH = 3.0, HEIGHT = 3.0, LENGTH_DEFAULT = 3.8;
export const HILL = LENGTH_DEFAULT; // the hill's length along the line // the hill, in world units
const MOUTH_W = 1.0, MOUTH_H = 1.75;           // the arch's half width and height

export const SIGN_AT = TUNNEL_AT + 1.4; // the signpost stands beside the hill, a little past its middle (clear of the last station sign), on the platforms side (the far side runs off the screen)

// s: the distance along the line of the hill's middle. Returns { group }.
// flip: the mouth faces forward along the line instead of back (a tunnel the train rolls out of, at the start of a world).
// opts.rear: the far face has an arch too. opts.glow: a colour; the arch's dark mouth then
// shows a soft glow of it (a still picture, no light is added).
export function buildTunnel(bag, line, s, flip = false, opts = {}) {
  const LENGTH = LENGTH_DEFAULT;
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
  // the dark mouth with a stone ring around it: on the back face (toward the camera on a world's end portal), and with
  // opts.rear on the far face as well (the start tunnel: the camera looks at its far end, so that is the arch it sees)
  const face = (end) => {
    const z = end * (LENGTH / 2), ry = end < 0 ? Math.PI : 0;
    const mouth = new THREE.Mesh(bag.geo('tunnelmouth', () => new THREE.CircleGeometry(1, 28, 0, Math.PI)), bag.paint(PAL.navy, { roughness: 1 }));
    mouth.scale.set(MOUTH_W, MOUTH_H, 1); mouth.rotation.y = ry; mouth.position.set(0, 0.02, z + end * 0.02);
    group.add(mouth);
    const ring = new THREE.Mesh(bag.geo('tunnelring', () => new THREE.TorusGeometry(1, 0.13, 10, 28, Math.PI)), bag.paint(PAL.locked, { roughness: 0.9 }));
    ring.scale.set(MOUTH_W + 0.12, MOUTH_H + 0.12, 1.3); ring.rotation.y = ry; ring.position.set(0, 0.02, z + end * 0.03); ring.castShadow = true;
    group.add(ring);
    for (const side of [-1, 1]) { // the stones at the feet of the arch
      const foot = new THREE.Mesh(bag.box(0.34, 0.34, 0.4, 0.08), bag.paint(PAL.locked, { roughness: 0.9 }));
      foot.position.set(side * (MOUTH_W + 0.12), 0.17, z + end * 0.05); foot.castShadow = true;
      group.add(foot);
    }
  };
  face(-1);
  if (opts.rear) face(1);
  if (opts.glow) {
    // light at the end of the tunnel: the half disc is brightest at the foot of the arch and fades to nothing at its rim
    const tex = bag.add(new THREE.CanvasTexture(glowCanvas(opts.glow)));
    tex.colorSpace = THREE.SRGBColorSpace;
    const glow = new THREE.Mesh(bag.geo('tunnelmouth', () => new THREE.CircleGeometry(1, 28, 0, Math.PI)), bag.add(new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })));
    glow.scale.set(MOUTH_W * 0.97, MOUTH_H * 0.97, 1); glow.rotation.y = Math.PI; glow.position.set(0, 0.02, -LENGTH / 2 - 0.035);
    group.add(glow);
  }
  group.position.set(p.x, 0, p.z);
  group.rotation.y = p.heading + (flip ? Math.PI : 0);
  return { group, length: LENGTH };
}

function glowCanvas(color) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d'), grad = g.createRadialGradient(64, 64, 2, 64, 64, 64);
  const col = new THREE.Color(color);
  const rgb = (a) => `rgba(${Math.round(col.r * 255)},${Math.round(col.g * 255)},${Math.round(col.b * 255)},${a})`;
  grad.addColorStop(0, rgb(0.92)); grad.addColorStop(0.55, rgb(0.5)); grad.addColorStop(1, rgb(0.04));
  g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
  return c;
}

// The wooden signpost by the portal: a post with a board that reads "<next world> ->" (drawn once into a canvas texture, in
// the house font and palette). s: where along the line; side: which side of the track (1 = the stations' side, -1 = the far side).
export function buildSignpost(bag, line, s, world, side = 1) {
  const group = new THREE.Group();
  group.name = 'signpost';
  const p = line.at(s);
  const post = block(bag, 0.2, 2.5, 0.2, PAL.woodLight, { r: 0.05 });
  post.position.y = 1.25;
  group.add(post);
  const W = 2.9, H = 1.3;
  const tex = bag.add(new THREE.CanvasTexture(boardCanvas(world, 512, Math.round(512 * H / W))));
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const frame = block(bag, W + 0.2, H + 0.2, 0.14, PAL.wood, { r: 0.07 });
  frame.position.set(0, 2.55, 0);
  group.add(frame);
  const face = new THREE.Mesh(bag.geo('boardface', () => new THREE.PlaneGeometry(W, H)), bag.add(new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7, metalness: 0 })));
  face.rotation.y = Math.PI; // the board faces back along the line, toward the camera
  face.position.set(0, 2.55, -0.075);
  group.add(face);
  group.position.set(p.x + p.nx * side * 3.3, 0, p.z + p.nz * side * 3.3);
  group.rotation.y = p.heading;
  return { group, face, w: W, h: H };
}

function boardCanvas(world, w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = '#FFF8EC'; g.beginPath(); g.roundRect(0, 0, w, h, 26); g.fill();
  g.fillStyle = world.color; g.fillRect(0, 0, w, 22); // a stripe in the next world's colour
  g.fillStyle = PAL.navy; g.textBaseline = 'middle';
  const words = String(world.name).split(' ');
  const lines = words.length > 2 ? [words.slice(0, Math.ceil(words.length / 2)).join(' '), words.slice(Math.ceil(words.length / 2)).join(' ')] : words.length === 2 ? words : [words[0]];
  const size = lines.length === 1 ? 96 : 84, step = size * 1.02;
  const arrowW = 100, textW = w - arrowW - 60, cx = 30 + arrowW + textW / 2, cy = 22 + (h - 22) / 2;
  let font = size;
  const setFont = (n) => { g.font = `800 ${n}px Nunito, system-ui, sans-serif`; };
  setFont(font);
  while (font > 30 && Math.max(...lines.map((l) => g.measureText(l).width)) > textW) { font -= 4; setFont(font); }
  g.textAlign = 'center';
  lines.forEach((l, i) => g.fillText(l, cx, cy + (i - (lines.length - 1) / 2) * Math.min(step, font * 1.02)));
  // the arrow: a thick bar and a head, pointing at the tunnel (the board stands on its right, so it points left)
  const ax = 30 + arrowW / 2;
  g.strokeStyle = world.color === '#FFD166' ? '#E5A73A' : world.color; g.lineWidth = 22; g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(ax + 44, cy); g.lineTo(ax - 44, cy); g.moveTo(ax - 6, cy - 40); g.lineTo(ax - 46, cy); g.lineTo(ax - 6, cy + 40); g.stroke();
  return c;
}
