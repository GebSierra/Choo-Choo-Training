// Depth and Pip geometry of the 3D train (v1.6.1): no two differently coloured faces share a plane (z-fighting),
// Pip has two brows and sits above the cab rim, and the camera's near plane keeps depth precision. Run alone: `node test/depth.mjs`.
import { startServer, loadPlaywright, launch, VIEWPORTS, newPage, SEEN } from './lib.mjs';

const seedState = (state) => `if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded','1'); localStorage.setItem('reading.v1', ${JSON.stringify(JSON.stringify(state))}); }`;

export async function depthChecks({ browser, url, ok }) {
  const { ctx, page, errors } = await newPage(browser, VIEWPORTS[0]);
  await page.addInitScript(seedState({ schema: 1, lessons: {}, settings: { seenScripts: SEEN }, firstRunDone: true }));
  await page.goto(url + '#/grownups');
  await page.waitForTimeout(400);
  const r = await page.evaluate(async () => {
    const { THREE, makeBag, makeLine } = await import('/js/train/world.js');
    const { buildTrain } = await import('/js/train/train.js');
    const { createScene } = await import('/js/train/scene.js');
    const bag = makeBag();
    const t = buildTrain(bag, makeLine(3), [{ glyph: 'm', accent: '#3B7DD8' }, { glyph: 'a', accent: '#E5484D' }]);
    t.group.updateMatrixWorld(true);
    const inside = (o, root) => { for (let p = o; p; p = p.parent) if (p === root) return true; return false; };
    const tilted = (o, root) => {
      for (let p = o; p && p !== root.parent; p = p.parent) {
        for (const a of ['x', 'y', 'z']) { const q = p.rotation[a] / (Math.PI / 2); if (Math.abs(q - Math.round(q)) > 1e-6) return true; }
      }
      return false;
    };
    const hex = (m) => m.material.color ? m.material.color.getHexString() : '?';
    const roots = t.group.children.filter((c) => c.name === 'wagon' || c.name === 'engine');
    const hits = [];
    for (const root of roots) {
      const meshes = [];
      root.traverse((o) => { if (o.isMesh && !inside(o, t.pip.group) && !tilted(o, root)) meshes.push(o); });
      const boxes = meshes.map((m) => ({ m, b: new THREE.Box3().setFromObject(m) }));
      const AX = ['x', 'y', 'z'];
      for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
        const A = boxes[i], B = boxes[j];
        if (A.m.material.uuid === B.m.material.uuid) continue;
        for (const a of AX) {
          const others = AX.filter((x) => x !== a);
          const overlap = others.every((o) => Math.min(A.b.max[o], B.b.max[o]) - Math.max(A.b.min[o], B.b.min[o]) > 0.25);
          if (!overlap) continue;
          for (const side of ['min', 'max']) {
            if (Math.abs(A.b[side][a] - B.b[side][a]) < 0.008) hits.push(`${root.name}: ${hex(A.m)}@${A.m.position.toArray().map((n) => n.toFixed(2))} vs ${hex(B.m)}@${B.m.position.toArray().map((n) => n.toFixed(2))} (${a} ${side} ${A.b[side][a].toFixed(3)})`);
          }
        }
      }
    }
    const brown = [];
    for (const root of roots) if (root.name === 'wagon') root.traverse((o) => { if (o.isMesh && hex(o) === '7a5c45') brown.push(o.name || 'mesh'); });
    const named = (n) => { const out = []; t.group.traverse((o) => { if (o.name === n) out.push(o); }); return out; };
    const wbox = (o) => new THREE.Box3().setFromObject(o);
    const worldPos = (o) => o.getWorldPosition(new THREE.Vector3());
    const brows = named('pip-brow').map(worldPos);
    const local = named('pip-brow').map((o) => o.position.toArray());
    const hair = named('pip-hair').map((o) => o.position.toArray());
    const rimTop = Math.max(...named('cab-rim').map((o) => wbox(o).max.y));
    const skull = named('pip-skull')[0], shirt = named('pip-shirt')[0];
    const near = createScene().camera.near;
    bag.dispose();
    return { hits, brown, near, brows: local.length, browSum: local.length ? local.reduce((s, p) => s + p[0], 0) : null, browYZ: local.map((p) => [p[1], p[2]]), hair, rimTop, skullMin: skull ? wbox(skull).min.y : null, shirtMin: shirt ? wbox(shirt).min.y : null, rims: named('cab-rim').length };
  });
  ok(r.hits.length === 0, `no coplanar faces of different colours in the engine or wagons: ${r.hits.join(' | ')}`);
  ok(r.brown.length === 0, `no wagon uses the brown floor plank (${r.brown.length})`);
  ok(r.near >= 2, `camera near plane is at least 2 (${r.near})`);
  ok(r.brows === 2, `Pip has exactly two eyebrows (${r.brows})`);
  ok(r.brows === 2 && Math.abs(r.browSum) < 1e-6 && r.browYZ[0][0] === r.browYZ[1][0] && r.browYZ[0][1] === r.browYZ[1][1], 'the two brows are mirrored (x sums to 0, same y and z)');
  ok(r.hair.length === 0, `Pip has no hair tufts at the temples, which read as sideburns in 3D (${r.hair.length})`);
  ok(r.rims > 0 && r.skullMin !== null && r.skullMin > r.rimTop + 0.02, `Pip's skull is above the cab rim (${r.skullMin} vs ${r.rimTop})`);
  ok(r.shirtMin !== null && r.shirtMin > r.rimTop, `Pip's shirt is above the cab rim (${r.shirtMin} vs ${r.rimTop})`);
  ok(errors.length === 0, 'depth: console errors ' + errors.join(' | '));
  await ctx.close();
}

if (process.argv[1] && process.argv[1].endsWith('depth.mjs')) {
  let failures = 0, checks = 0;
  const ok = (c, m) => { checks++; if (!c) { failures++; console.error('FAIL: ' + m); } };
  const { server, url } = await startServer();
  const browser = await launch(await loadPlaywright());
  await depthChecks({ browser, url, ok });
  await browser.close(); server.close();
  console.log(`depth: ${checks - failures}/${checks} checks passed`);
  process.exit(failures ? 1 : 0);
}
