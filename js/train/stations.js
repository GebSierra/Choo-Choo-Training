// Stations (one per lesson) and goods depots (one per checkpoint) beside the track. Each has a round sign on a post that
// faces the camera: the lesson's letter in its accent colour (our own glyph strokes, drawn into a canvas texture), or a
// crate for a depot. Done: bunting under the canopy and a gold star on the sign. Current: the sign glows and bobs a
// little. Locked: the sign is greyed and a small wooden gate closes the platform.
import { THREE, PAL, block } from './world.js';
import { GLYPHS, STROKE_WIDTH } from '../glyphs.js';

const SIGN_R = 0.82;
const OUT = -1; // stations stand on the right of the line (local -x, since local +z runs along the line)
const mix = (a, b, t) => '#' + new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString();

function canvasTexture(bag, w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = bag.add(new THREE.CanvasTexture(c));
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// The letter, drawn from the same centre-line strokes as everywhere else, centred in a box of `size` px.
export function drawGlyph(g, ch, cx, cy, size, color) {
  const def = GLYPHS[ch];
  if (!def) return;
  const half = STROKE_WIDTH / 2;
  const w = def.maxX - def.minX + 2 * half, hgt = def.maxY - def.minY + 2 * half;
  const k = size / Math.max(w, hgt, 60);
  g.save();
  g.translate(cx - ((def.minX + def.maxX) / 2) * k, cy - ((def.minY + def.maxY) / 2) * k);
  g.scale(k, k);
  g.strokeStyle = color; g.lineWidth = STROKE_WIDTH; g.lineCap = 'round'; g.lineJoin = 'round';
  for (const s of def.strokes) g.stroke(new Path2D(s.d));
  g.restore();
}

// A spelling for a region's placeholder sign (the preview of a world with no lessons yet): one letter, a digraph such as sh or qu,
// or a group of spellings separated by spaces ("ff ll ss zz", in two rows). Letters we have strokes for are drawn from them, side
// by side at one size on a shared baseline; the others (e, j, w ... have no strokes yet) are set in Andika, a reading font.
export function drawSpelling(g, text, cx, cy, size, color) {
  const toks = String(text).split(' ').filter(Boolean);
  if (toks.length === 1 && [...toks[0]].length === 1 && GLYPHS[toks[0]]) { drawGlyph(g, toks[0], cx, cy, size, color); return; }
  const word = (w, x, y, boxW, boxH) => {
    const letters = [...w];
    if (letters.every((ch) => GLYPHS[ch])) {
      const defs = letters.map((ch) => GLYPHS[ch]), half = STROKE_WIDTH / 2, gap = 6;
      const ws = defs.map((d) => d.maxX - d.minX + 2 * half), total = ws.reduce((a, b) => a + b, 0) + gap * (defs.length - 1);
      const minY = Math.min(...defs.map((d) => d.minY)) - half, maxY = Math.max(...defs.map((d) => d.maxY)) + half;
      const k = Math.min(boxW / total, boxH / (maxY - minY));
      g.save();
      g.translate(x, y - ((minY + maxY) / 2) * k); g.scale(k, k);
      g.strokeStyle = color; g.lineWidth = STROKE_WIDTH; g.lineCap = 'round'; g.lineJoin = 'round';
      let at = -total / 2;
      defs.forEach((d, i) => { g.save(); g.translate(at + half - d.minX, 0); for (const s of d.strokes) g.stroke(new Path2D(s.d)); g.restore(); at += ws[i] + gap; });
      g.restore();
    } else {
      let px = Math.min(boxH * 1.15, 190);
      g.font = `700 ${px}px Andika, Nunito, system-ui, sans-serif`;
      while (px > 20 && g.measureText(w).width > boxW) { px -= 4; g.font = `700 ${px}px Andika, Nunito, system-ui, sans-serif`; }
      g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
      g.fillText(w, x, y + px * 0.3);
    }
  };
  if (toks.length === 1) word(toks[0], cx, cy, size * 0.95, size * 0.8);
  else {
    const cols = 2, rows = Math.ceil(toks.length / cols);
    toks.forEach((t, i) => word(t, cx + ((i % cols) - 0.5) * size * 0.5, cy + (Math.floor(i / cols) - (rows - 1) / 2) * size * 0.42, size * 0.42, size * 0.34));
  }
}

// A wooden crate seen from the front, for the depot signs.
export function drawCrate(g, cx, cy, size, color = '#B9874C') {
  const s = size, x = cx - s / 2, y = cy - s / 2, r = s * 0.12;
  g.save();
  g.fillStyle = color;
  g.beginPath(); g.roundRect(x, y, s, s, r); g.fill();
  g.strokeStyle = 'rgba(80,50,20,.55)'; g.lineWidth = s * 0.07; g.lineCap = 'round';
  g.beginPath(); g.roundRect(x + s * 0.1, y + s * 0.1, s * 0.8, s * 0.8, r * 0.6); g.stroke();
  g.beginPath(); g.moveTo(x + s * 0.18, y + s * 0.18); g.lineTo(x + s * 0.82, y + s * 0.82); g.moveTo(x + s * 0.82, y + s * 0.18); g.lineTo(x + s * 0.18, y + s * 0.82); g.stroke();
  g.restore();
}

// An open book seen from the front, for a story's depot sign: a red cover with two cream pages.
export function drawBook(g, cx, cy, size, color = '#E5484D') {
  const s = size, x = cx - s / 2, y = cy - s * 0.36, w = s, hgt = s * 0.72;
  g.save();
  g.fillStyle = color; g.beginPath(); g.roundRect(x, y, w, hgt, s * 0.1); g.fill();
  g.fillStyle = '#F3E6CF'; g.beginPath(); g.moveTo(x + w * 0.07, y + hgt * 0.1); g.quadraticCurveTo(x + w * 0.27, y + hgt * 0.02, cx - s * 0.02, y + hgt * 0.16); g.lineTo(cx - s * 0.02, y + hgt * 0.92); g.quadraticCurveTo(x + w * 0.27, y + hgt * 0.82, x + w * 0.07, y + hgt * 0.9); g.closePath(); g.fill();
  g.fillStyle = '#FFF8EC'; g.beginPath(); g.moveTo(x + w * 0.93, y + hgt * 0.1); g.quadraticCurveTo(x + w * 0.73, y + hgt * 0.02, cx + s * 0.02, y + hgt * 0.16); g.lineTo(cx + s * 0.02, y + hgt * 0.92); g.quadraticCurveTo(x + w * 0.73, y + hgt * 0.82, x + w * 0.93, y + hgt * 0.9); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(80,50,20,.4)'; g.lineWidth = s * 0.03; g.lineCap = 'round';
  for (const f of [0.34, 0.5, 0.66]) for (const d of [-1, 1]) { g.beginPath(); g.moveTo(cx + d * s * 0.1, y + hgt * f); g.lineTo(cx + d * s * 0.36, y + hgt * (f - 0.04)); g.stroke(); }
  g.restore();
}

// A round steam gauge seen from the front, for a ride's depot sign: brass ring, cream face, red needle.
export function drawGauge(g, cx, cy, size, locked = false) {
  const r = size / 2;
  g.save();
  g.fillStyle = locked ? '#C4BBAE' : '#E5A73A'; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
  g.strokeStyle = locked ? '#D8D1C6' : '#FFD166'; g.lineWidth = r * 0.12; g.beginPath(); g.arc(cx, cy, r * 0.94, 0, Math.PI * 2); g.stroke();
  g.fillStyle = '#FFF8EC'; g.beginPath(); g.arc(cx, cy, r * 0.78, 0, Math.PI * 2); g.fill();
  g.strokeStyle = locked ? '#C4BBAE' : '#E5484D'; g.lineWidth = r * 0.1; g.lineCap = 'round';
  g.beginPath(); g.moveTo(cx, cy + r * 0.14); g.lineTo(cx + r * 0.3, cy - r * 0.55); g.stroke();
  g.fillStyle = locked ? '#B3ACA1' : '#2B2D5C'; g.beginPath(); g.arc(cx, cy + r * 0.14, r * 0.12, 0, Math.PI * 2); g.fill();
  g.restore();
}

function signTexture(bag, { glyph, accent, locked, icon }) {
  return canvasTexture(bag, 256, 256, (g, w) => {
    g.fillStyle = locked ? '#ECE7DE' : '#FFF8EC';
    g.fillRect(0, 0, w, w);
    g.lineWidth = 16; g.strokeStyle = locked ? '#C9C2B6' : accent;
    g.beginPath(); g.arc(128, 128, 118, 0, Math.PI * 2); g.stroke();
    if (icon === 'gauge') drawGauge(g, 128, 128, 140, locked);
    else if (icon === 'book') drawBook(g, 128, 130, 138, locked ? '#C4BBAE' : '#E5484D');
    else if (icon === 'crate') drawCrate(g, 128, 132, 118, locked ? '#C4BBAE' : '#B9874C');
    else drawSpelling(g, glyph, 128, 128, 170, locked ? '#B3ACA1' : accent);
  });
}

function plateTexture(bag, text) {
  return canvasTexture(bag, 128, 72, (g) => {
    g.fillStyle = PAL.navy; g.beginPath(); g.roundRect(0, 0, 128, 72, 18); g.fill();
    g.fillStyle = '#FFF8EC'; g.font = '800 50px Nunito, system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, 64, 39);
  });
}

function starGeometry() {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) { const r = i % 2 ? 0.13 : 0.3, a = Math.PI / 2 + (i * Math.PI) / 5; if (i) s.lineTo(Math.cos(a) * r, Math.sin(a) * r); else s.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2 });
  g.center();
  return g;
}

// Little triangle flags on a sagging string between two points (local), in vertex colours.
function buntingGeometry(a, b, count = 7) {
  const cols = ['#E5484D', '#FFD166', '#5AC8FA', '#4FC97E', '#B79CF5', '#FF9F6B'].map((c) => new THREE.Color(c));
  const pos = [], col = [];
  const pt = (t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - Math.sin(Math.PI * t) * 0.22, a[2] + (b[2] - a[2]) * t];
  for (let i = 0; i < count; i++) {
    const t0 = (i + 0.15) / count, t1 = (i + 0.85) / count;
    const p0 = pt(t0), p1 = pt(t1), m = pt((t0 + t1) / 2);
    const tri = [p0, [m[0], m[1] - 0.3, m[2]], p1];
    for (const side of [tri, [tri[0], tri[2], tri[1]]]) for (const v of side) { pos.push(...v); const c = cols[i % cols.length]; col.push(c.r, c.g, c.b); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}

const cyl = (bag, r, h, color, seg = 12) => { const m = new THREE.Mesh(bag.geo(`cyl${r},${h},${seg}`, () => new THREE.CylinderGeometry(r, r, h, seg)), bag.paint(color)); m.castShadow = true; m.receiveShadow = true; return m; };
const at = (obj, x, y, z) => { obj.position.set(x, y, z); return obj; };

// The round sign on its post, with the number plate (lessons) and, when done, the gold star on top.
function signPost(bag, { tex, plate, state, rim }) {
  const post = new THREE.Group();
  post.add(at(cyl(bag, 0.08, 2.3, PAL.woodLight), 0, 1.15, 0));
  const sign = new THREE.Group();
  sign.position.y = 2.75;
  const back = cyl(bag, SIGN_R + 0.02, 0.14, rim, 40);
  back.rotation.x = Math.PI / 2;
  sign.add(back);
  const faceMat = bag.add(new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, metalness: 0, emissive: new THREE.Color('#FFE6A0'), emissiveMap: tex, emissiveIntensity: 0 }));
  const face = new THREE.Mesh(bag.geo('signface', () => new THREE.CircleGeometry(SIGN_R - 0.04, 48)), faceMat);
  face.position.z = 0.075;
  sign.add(face);
  const ring = new THREE.Mesh(bag.geo('signring', () => new THREE.TorusGeometry(SIGN_R - 0.01, 0.06, 10, 48)), bag.paint(state === 'current' ? PAL.sun : '#FFFFFF', state === 'current' ? { emissive: '#FFC94D', emissiveIntensity: 0.35 } : {}));
  ring.position.z = 0.07;
  sign.add(ring);
  if (state === 'done') {
    const star = new THREE.Mesh(bag.geo('star', starGeometry), bag.paint(PAL.sun, { emissive: '#F0A93B', emissiveIntensity: 0.25, roughness: 0.4 }));
    star.position.set(0.56, 0.62, 0.12);
    star.rotation.z = -0.2;
    star.castShadow = true;
    sign.add(star);
  }
  post.add(sign);
  if (plate) {
    const pl = new THREE.Mesh(bag.geo('plate', () => new THREE.PlaneGeometry(0.64, 0.36)), bag.add(new THREE.MeshStandardMaterial({ map: plate, roughness: 0.6 })));
    pl.position.set(0, 1.62, 0.09);
    post.add(pl);
    post.add(at(block(bag, 0.7, 0.42, 0.12, PAL.navy), 0, 1.62, 0));
  }
  return { post, sign, faceMat };
}

// node: { kind: 'lesson', number, glyph, accent } or { kind: 'depot', title }. state: done | current | open | locked.
export function buildStop(bag, line, node, s, state) {
  const g = new THREE.Group();
  const p = line.at(s);
  g.position.set(p.x, 0, p.z);
  g.rotation.y = p.heading;
  const locked = state === 'locked';
  const o = OUT;
  if (node.kind === 'lesson') {
    g.add(at(block(bag, 1.5, 0.4, 3.8, PAL.cream, { r: 0.12 }), o * 1.85, 0.2, 0));
    g.add(at(block(bag, 0.14, 0.04, 3.6, PAL.sun, { r: 0.02, shadow: false }), o * 1.17, 0.41, 0));
    for (const z of [-1.25, 1.25]) g.add(at(cyl(bag, 0.07, 1.6, '#FFF8EC'), o * 2.38, 1.2, z));
    const roof = at(block(bag, 1.9, 0.18, 3.1, locked ? mix(node.accent, PAL.locked, 0.65) : node.accent), o * 1.95, 2.05, 0);
    roof.rotation.z = o * -0.12;
    g.add(roof);
    const fascia = at(block(bag, 0.07, 0.2, 3.12, '#FFF8EC', { r: 0.03, shadow: false }), o * 1.03, 1.93, 0);
    g.add(fascia);
    // a bench on the platform
    g.add(at(block(bag, 0.36, 0.1, 0.9, PAL.wood), o * 2.15, 0.62, -0.2));
    g.add(at(block(bag, 0.08, 0.3, 0.9, PAL.wood), o * 2.33, 0.78, -0.2));
    if (state === 'done') {
      const bunt = new THREE.Mesh(bag.add(buntingGeometry([o * 1.2, 1.88, -1.45], [o * 1.2, 1.88, 1.45])), bag.paint('#ffffff', { vertexColors: true, side: THREE.DoubleSide }));
      g.add(bunt);
    }
    if (locked) {
      for (const x of [1.2, 2.5]) g.add(at(cyl(bag, 0.07, 0.75, PAL.wood, 8), o * x, 0.75, -1.95));
      for (const y of [0.66, 0.92]) g.add(at(block(bag, 1.4, 0.09, 0.07, PAL.woodLight, { r: 0.03 }), o * 1.85, y, -1.95));
    }
  } else {
    // the goods shed with its big door, stacked crates and a sack loader
    g.add(at(block(bag, 1.9, 1.35, 3.0, '#E7B97C', { r: 0.12 }), o * 2.3, 0.68, 0));
    for (const side of [-1, 1]) {
      const r = at(block(bag, 1.25, 0.14, 3.3, '#C2553F', { r: 0.06 }), o * 2.3 + side * 0.5, 1.68, 0);
      r.rotation.z = -side * 0.6; // the two halves meet in a ridge
      g.add(r);
    }
    g.add(at(block(bag, 0.06, 0.95, 1.3, '#8A5A35', { r: 0.03 }), o * 1.33, 0.52, 0));
    const crate = (x, y, z) => g.add(at(block(bag, 0.55, 0.55, 0.55, locked ? '#CDBFA9' : '#C99A5B', { r: 0.06 }), x, y, z));
    crate(o * 1.35, 0.28, 1.95); crate(o * 2.0, 0.28, 2.0); crate(o * 1.67, 0.83, 1.97);
    g.add(at(cyl(bag, 0.08, 1.9, PAL.navy, 8), o * 1.3, 0.95, -1.95));
    g.add(at(block(bag, 0.8, 0.1, 0.1, PAL.navy, { r: 0.03 }), o * 0.95, 1.85, -1.95));
    g.add(at(cyl(bag, 0.015, 0.5, '#6B5A4A', 4), o * 0.62, 1.58, -1.95));
    const sack = at(new THREE.Mesh(bag.geo('sack', () => new THREE.SphereGeometry(0.3, 14, 10)), bag.paint('#DDB97E', { roughness: 0.9 })), o * 0.62, 1.2, -1.95);
    sack.scale.set(1, 1.3, 1); sack.castShadow = true;
    g.add(sack);
    if (state === 'done') g.add(new THREE.Mesh(bag.add(buntingGeometry([o * 1.3, 1.45, -1.5], [o * 1.3, 1.45, 1.5])), bag.paint('#ffffff', { vertexColors: true, side: THREE.DoubleSide })));
    if (locked) {
      for (const x of [1.0, 2.2]) g.add(at(cyl(bag, 0.07, 0.75, PAL.wood, 8), o * x, 0.38, -2.5));
      for (const y of [0.3, 0.56]) g.add(at(block(bag, 1.4, 0.09, 0.07, PAL.woodLight, { r: 0.03 }), o * 1.6, y, -2.5));
    }
  }
  const tex = signTexture(bag, { glyph: node.glyph, accent: node.accent || '#B9874C', locked, icon: node.kind === 'lesson' ? null : node.icon || 'crate' });
  const plate = node.kind === 'lesson' && node.number ? plateTexture(bag, String(node.number)) : null; // a region's placeholder station has no lesson number
  const sp = signPost(bag, { tex, plate, state, rim: locked ? '#DDD6CA' : '#FFFFFF' });
  sp.post.position.set(o * 3.05, 0, 1.25);
  sp.post.rotation.y = -p.heading;          // the sign faces the camera, whatever way the line turns
  sp.sign.rotation.x = -0.42;               // and leans back a little toward it
  g.add(sp.post);
  // A soft round shadow under the stop.
  return { group: g, sign: sp.sign, faceMat: sp.faceMat, state, signY: 2.75 };
}

// Where the child's figure stands at a stop, in the stop's local frame: on the platform of a lesson station, at the end the
// train comes from (the roof hides the middle of the platform from the camera above), facing the track and turned a little
// toward the camera; on the ground by the door of a goods depot.
export function kidSpot(node) {
  const ry = -OUT * Math.PI / 2 - OUT * 0.95;
  return node.kind === 'lesson' ? { x: OUT * 1.4, y: 0.4, z: -1.72, ry } : { x: OUT * 1.0, y: 0, z: -1.2, ry };
}
