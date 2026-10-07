// The 3D railway Home (round 4, docs/TRAIN-WORLD.md section 4). The line is built from curriculum.json: a station for each
// lesson and a goods depot for each checkpoint, in the same order as the 2D path. The child's train waits at the
// current stop with one wagon per completed lesson; after a lesson is completed it chugs there from the stop before.
// Rendering happens on demand: only while the camera or the train moves, a sign wobbles, or Pip waves (hello, about
// 2 s, and on arrival). When nothing moves no frame is drawn at all, so a phone left on Home stays cool. Leaving Home
// disposes everything; a hidden page draws nothing.
//
//   home3dScreen(ctx, { canvas, gl, soft }) -> element, or throws (the caller falls back to the 2D map).
import { makeBag, makeLine, THREE } from '../train/world.js';
import { finishedStop } from '../sequence.js';
import { createRenderer, createScene } from '../train/scene.js';
import { buildTrack, buildSiding } from '../train/track.js';
import { buildScenery } from '../train/scenery.js';
import { buildStop, kidSpot } from '../train/stations.js';
import { buildKid } from '../train/kid3d.js';
import { buildTrain, buildParked } from '../train/train.js';
import { buildTunnel, buildSignpost, TUNNEL_AT, IN, SIGN_AT, HILL } from '../train/tunnel.js';
import { createRig } from '../train/camera.js';
import { themeOf, worldSounds } from '../train/themes.js';
import { createOverlay } from '../train/overlay.js';
import { h, animate, reduced } from '../dom.js';
import { holdButton } from '../components/hold-button.js';
import { fullscreenButton } from '../components/fullscreen-button.js';
import { firstRunOverlay } from '../components/welcome-card.js';
import { accentOf } from '../theme.js';
import { sfx } from '../sfx.js';
import { music } from '../music.js';
import { dueLevel, builtLevels, earnedLevels } from '../levels.js';
import { worldAfter, nextWorld, worldDone, lessonsIn } from '../worlds.js';
import { starBoard } from '../components/star-board.js';
import { levelBanner } from '../components/level-banner.js';
import { restCard, moonBadge, devPill, whenShown } from '../components/rest-card.js';

const ARRIVE_MS = 2400, TAP_SLOP = 8;
const TOOT_LEAD_MS = 500, HOP_MS = 650, SEAT = new THREE.Vector3(-0.4, 0.95, -0.95), SEAT_SCALE = 0.82; // the sequence: toot, hop on, ride, hop off
const PARTY_BACK = 10.5, BANNER_AT_MS = 1000; // during the party the camera moves back along the train so the new car is seen coupling on; the banner follows a moment later // during the party the camera moves back along the train so the new car is seen coupling on
const LEVEL_IN_MS = 1600, LEVEL_HOLD_MS = 600, LEVEL_OUT_MS = 1600, LEVEL_PARTY_MS = 2600; // a level celebration: roll into the tunnel, toot, back out, party
const START_MOUTH = 4.9, GATE_OUT_MS = 3000, GATE_IN_MS = 3400, GATE_PAST = IN; // the world crossing: the start tunnel's mouth stands this far before a world's first stop; the train rolls into the end portal as far as the level ride does
const ENGINE_AT = 0.7; // the engine's middle stands this far past its stop's middle, so Pip's cab is by the platform

// The stops in order and which one the train is at, by the same rules as the 2D path (js/screens/home.js).
// worldId (prototype 2): build only that world's lessons and checkpoints; the line is as long as that subset.
export function stopsOf(curriculum, store, worldId = null) {
  const total = curriculum.lessons.length;
  const current = store.currentLesson(total);
  const cks = (curriculum.checkpoints || []).filter((k) => !worldId || k.world === worldId);
  const pending = cks.find((k) => !store.isCheckpointDone(k) && store.isCheckpointUnlocked(k));
  const nodes = curriculum.lessons.filter((l) => !worldId || l.world === worldId).flatMap((l) => [{ lesson: l }, ...cks.filter((c) => c.after === l.number).map((c) => ({ checkpoint: c }))]);
  let currentIndex = -1;
  const stops = nodes.map((n, i) => {
    if (n.checkpoint) {
      const c = n.checkpoint;
      const state = store.isCheckpointDone(c) ? 'done' : !store.isCheckpointUnlocked(c) ? 'locked' : current === null && pending && pending.id === c.id ? 'current' : 'open';
      if (state === 'current') currentIndex = i;
      return { kind: 'depot', checkpoint: c, state, title: c.title, icon: c.kind === 'book' ? 'book' : c.kind === 'ride' ? 'gauge' : 'crate' };
    }
    const l = n.lesson;
    const state = store.isDone(l.number) ? 'done' : !store.isUnlocked(l.number) ? 'locked' : l.number === current ? 'current' : 'open';
    if (l.number === current) currentIndex = i;
    return { kind: 'lesson', lesson: l, number: l.number, glyph: l.sound, accent: accentOf(l.sound), state, resting: state === 'current' && store.isResting(l.number) }; // resting: today's pace limit is reached
  });
  if (currentIndex < 0) currentIndex = stops.length - 1;
  return { stops, currentIndex };
}

// A world with no lessons yet, shown by the region preview (#/world/<id>, js/screens/region.js): one locked placeholder station for
// each sound (or group of sounds) the world will teach, its sign showing the spelling.
const PLACEHOLDER_ACCENTS = ['#3B7DD8', '#E5484D', '#2FB37A', '#D57C1C', '#14A3A8', '#8A5CF0', '#E0559C', '#B9770E'];
function placeholderStops(curriculum, worldId) {
  const stops = worldSounds(curriculum, worldId).map((sp, i) => ({ kind: 'lesson', placeholder: true, glyph: sp, accent: PLACEHOLDER_ACCENTS[i % PLACEHOLDER_ACCENTS.length], state: 'locked' }));
  return { stops, currentIndex: 0 };
}

// The Home builds only one world: plan.world (js/worlds.js planHome; the current world, or the world just finished while its
// crossing is due). The end of the line is a permanent tunnel portal with a signpost naming the next world (none in the last
// world); a later world starts at a tunnel too. plan.cross = { to, gate, onEnter }: after the station-complete ride and any level
// party the train rolls into the portal and calls onEnter (js/screens/crossing.js shows the loading card). plan.arrive = { gate,
// onDone }: the next world's Home, the train waits inside the start tunnel and rolls out when root.gatewayGo() is called.
// gate.active keeps the theme song waiting. preview (Grownups > Previews, the world gateway): { world, mode: 'out' | 'in', onEnter }
// does the same without touching the store. preview.mode 'region' ({ world, mode: 'region' }): the world as a read-only look (the
// region preview): its theme, the train at the start, no Grownups button, a tap on a station only wobbles its sign; a world without
// lessons gets placeholder stations.
export function home3dScreen(ctx, { canvas, gl, soft = false, preview = null, plan = null }) {
  const { store, router, curriculum, speech } = ctx;
  const bag = makeBag();
  const cross = !preview && plan && plan.cross ? plan.cross : null;
  const arrive = !preview && plan && plan.arrive ? plan.arrive : null;
  const gw = preview || (cross ? { mode: 'out', onEnter: cross.onEnter } : arrive ? { mode: 'in', onDone: arrive.onDone } : null);
  const gateHold = cross || arrive ? (cross || arrive).gate : null;
  const inMode = !!gw && gw.mode === 'in';
  const worldId = preview ? preview.world : plan && plan.world ? plan.world.id : null;
  const region = !!preview && preview.mode === 'region';
  const theme = themeOf(worldId);
  const placeholder = region && !!worldId && !lessonsIn(curriculum, worldId).length;
  const nextW = worldId ? worldAfter(curriculum, worldId) : null; // the portal names the world that follows, built or not
  const hasStart = !!worldId && (curriculum.worlds || []).filter((w) => lessonsIn(curriculum, w.id).length)[0].id !== worldId;
  const stopsInfo = placeholder ? placeholderStops(curriculum, worldId) : stopsOf(curriculum, store, worldId);
  const { stops } = stopsInfo;
  const currentIndex = region ? stopsInfo.currentIndex : preview ? (preview.mode === 'in' ? 0 : stops.length - 1) : stopsInfo.currentIndex;
  // A level earned since Home was last open (or one the parent replays from Grownups) celebrates once, after the arrival.
  const replayId = preview ? null : ctx.replayLevel || null;
  if (!preview) ctx.replayLevel = null;
  const due = preview ? null : replayId ? builtLevels(curriculum).find((v) => v.id === replayId) || null : dueLevel(store, curriculum);
  const earnedNow = earnedLevels(curriculum, store);
  // Only the newest level's special car travels with the train (the owner's wagon rule).
  const carLevels = due && !earnedNow.includes(due) ? [...earnedNow, due] : earnedNow;
  const specialKinds = preview || !carLevels.length ? [] : [carLevels[carLevels.length - 1].car];
  // a finished world whose crossing is past: its letter wagons stand on a siding and the train pulls none
  const parked = !!worldId && !cross && worldDone(store, curriculum, worldId) && !!nextWorld(curriculum, worldId);
  const line = makeLine(stops.length);
  const stopS = stops.map((_, i) => line.stop(i));
  const renderer = createRenderer(canvas, gl, soft);
  const { scene, camera, aimLight } = createScene(soft, theme);
  const scenery = buildScenery(bag, line, [...stopS, ...(nextW ? [stopS[stopS.length - 1] + SIGN_AT, stopS[stopS.length - 1] + TUNNEL_AT + 1.2, stopS[stopS.length - 1] + TUNNEL_AT + 4.4] : []), ...(hasStart ? [stopS[0] - START_MOUTH - HILL / 2, stopS[0] - START_MOUTH - HILL] : []), ...(parked ? [-7, -3.5, 0, 3.5].map((d) => stopS[stopS.length - 1] + d) : [])], theme, stopS.length); // the portal and its signpost keep the trees away
  scene.add(scenery.group, scenery.clouds);
  const built = stops.map((s, i) => { const b = buildStop(bag, line, s, stopS[i], s.state); scene.add(b.group); return b; });
  // The one place that decides which wagons the train pulls. The owner's rule: only this world's letter wagons (they grow again from
  // each world's own lessons), and in a finished world whose crossing is past they stand parked on a siding instead. During the
  // crossing itself the train still pulls them and leaves them behind in the portal (train.detach).
  const lw = (curriculum.worlds || []).filter((w) => lessonsIn(curriculum, w.id).length);
  const finishedWs = lw.filter((w) => worldDone(store, curriculum, w.id) && !(cross && w.id === worldId));
  const upgrades = finishedWs.length; // the engine gets one upgrade for every finished world (a reload shows the same engine)
  const upgradeLetters = finishedWs.length ? lessonsIn(curriculum, finishedWs[0].id).map((l) => l.sound) : [];
  const worldLessons = curriculum.lessons.filter((l) => store.isDone(l.number) && (!worldId || l.world === worldId));
  const doneLessons = parked ? [] : worldLessons;
  const asCar = (l) => ({ glyph: l.sound, accent: accentOf(l.sound) });
  const cur0 = built[currentIndex];
  if (cur0 && stops[currentIndex].state === 'current' && !stops[currentIndex].resting) cur0.faceMat.emissiveIntensity = 0.22; // a steady soft glow (no idle animation)
  // the child's figure waits on the platform of the current stop (it adds no frames: it moves only when it waves)
  const kid = buildKid(bag, store.character());
  const KID_SCALE = kid.group.scale.x;
  let kidIndex = currentIndex;
  const kidTo = (i) => { const spot = kidSpot(stops[i]); kid.group.scale.setScalar(KID_SCALE); kid.group.position.set(spot.x, spot.y, spot.z); kid.group.rotation.y = spot.ry; built[i].group.add(kid.group); kidIndex = i; };
  kidTo(currentIndex);
  const train = buildTrain(bag, line, doneLessons.map(asCar), specialKinds, { upgrades, letters: upgradeLetters });
  scene.add(train.group);
  const stillNow = reduced();
  const dueCar = due ? train.specialGroup(due.car) : null;
  if (dueCar && !stillNow) dueCar.visible = false; // it rolls up and couples on during the party
  // the portal at the end of the line (the next world's glow, a signpost beside it) and, in a later world, the tunnel the train
  // came out of: a long hill that swallows the wagons that do not fit on the straight before the first stop
  const lastS = stopS[stops.length - 1], tmpP = {};
  const portal = nextW ? buildTunnel(bag, line, lastS + TUNNEL_AT, false, { glow: nextW.color, theme }) : null;
  const signpost = nextW ? buildSignpost(bag, line, lastS + SIGN_AT, nextW) : null;
  const mouthS = stopS[0] - START_MOUTH;
  const startTunnel = hasStart ? buildTunnel(bag, line, mouthS - HILL / 2, true, { rear: true, theme }) : null;
  if (startTunnel) {
    // the train belongs inside the tunnel behind its mouth: whatever is behind the mouth is not drawn, so a long train never shows
    // wagons sticking out of the hill's back (a clipping plane across the line at the mouth, on the train's own materials)
    line.at(mouthS, tmpP);
    const plane = new THREE.Plane(new THREE.Vector3(tmpP.dx, 0, tmpP.dz), -(tmpP.dx * tmpP.x + tmpP.dz * tmpP.z));
    train.group.traverse((o) => { if (o.isMesh) o.material.clippingPlanes = [plane]; }); // the train's materials are its own (named 'train'), shared by no station
  }
  for (const t of [portal, signpost, startTunnel]) if (t) scene.add(t.group);
  // a finished world: its letter wagons stand on a short siding on the far side of the line, level with the last station
  if (parked) {
    scene.add(buildSiding(bag, line, { from: lastS - 12, to: lastS + 5.4, off: -3.4, curve: 5 }));
    scene.add(buildParked(bag, line, worldLessons.map(asCar), lastS + 4.0, -3.4));
  }
  scene.add(buildTrack(bag, line, { from: startTunnel ? mouthS - HILL + 0.4 : line.start + 1, to: portal ? lastS + TUNNEL_AT + 1.5 : line.end - 1, bufferStart: !startTunnel, bufferEnd: !portal, bed: theme.bed }));
  // the level party's tunnel is the world portal when the train stands at the end of its line, else one built just for the party
  const tunnel = portal && currentIndex === stops.length - 1 ? portal : due && !stillNow ? buildTunnel(bag, line, stopS[currentIndex] + TUNNEL_AT, false, { theme }) : null;
  if (tunnel && tunnel !== portal) scene.add(tunnel.group);
  const stars = starBoard(curriculum, store, { hold: due && !replayId && !stillNow ? due.id : null });

  // ---- where the train comes from ----
  const settings = store.settings;
  const lastAt = Number.isInteger(settings.trainAt) ? settings.trainAt : null;
  let prevLesson = -1;
  for (let i = currentIndex - 1; i >= 0; i--) if (stops[i].kind === 'lesson') { prevLesson = i; break; }
  const finished = preview ? -1 : finishedStop(store, stops.map((s) => { const own = s.kind === 'lesson' ? store.lesson(s.number) : store.checkpoint(s.checkpoint.id); return s.state === 'done' && own.result === 'got-it' ? own.completedAt || null : false; }), currentIndex); // only stops the child finished: ones a later lesson completed never start a ride
  const arriving = !preview && !arrive && ((lastAt !== null && lastAt < currentIndex && prevLesson >= 0) || finished >= 0);
  const fromIndex = finished >= 0 ? finished : arriving ? Math.max(lastAt, prevLesson) : currentIndex;
  if (!preview && settings.trainAt !== currentIndex) store.setSetting('trainAt', currentIndex);
  const restS = (i) => stopS[i] + ENGINE_AT;
  const gateStartS = mouthS - 1.8; // rolling out of a tunnel: the engine starts inside the hill
  train.place(inMode && !stillNow ? gateStartS : restS(fromIndex));
  if (arriving && !reduced()) kidTo(fromIndex); // the figure waits where the train is, and rides from there

  // ---- the camera ----
  const min = stopS[0] - (startTunnel ? 9 : 2), max = lastS + (portal ? 3 : 1); // the end clamp shows the portal and its signpost
  const rig = createRig(camera, line, { min, max, side: parked ? -0.7 : undefined, sidePortrait: theme.sidePortrait, across: theme.across }); // a finished world looks toward its siding on the far side
  const firstVisit = !preview && !arrive && !settings.trainIntroDone;
  if (firstVisit) store.setSetting('trainIntroDone', true);
  const glideIn = firstVisit && currentIndex > 0 && !reduced();
  rig.jump(glideIn ? min : inMode && !stillNow ? gateStartS - ENGINE_AT : stopS[arriving ? fromIndex : currentIndex]);

  // ---- the overlay: the real buttons ----
  let downAt = null, dragged = false, lastMove = 0;
  const wobbles = new Map(); // sign wobble on a locked tap: index -> start time
  const tap = (fn) => (btn, e) => { if (dragged) { dragged = false; return; } fn(btn, e); };
  const overlayStops = stops.map((s, i) => {
    const name = s.placeholder ? `Sound ${s.glyph}` : s.kind === 'lesson' ? `Lesson ${s.number}` : s.title;
    const cls = (s.kind === 'lesson' ? (s.state === 'open' ? 'current' : s.state) : (s.state === 'open' ? 'unlocked' : s.state)) + (s.resting ? ' is-resting' : '');
    return {
      kind: s.kind, cls, anchor: built[i].sign, badge: s.resting ? moonBadge() : null,
      label: `${name}${s.state === 'locked' ? ', locked' : s.state === 'done' ? ', done' : s.resting ? ', resting until tomorrow' : ''}`,
      onTap: tap(() => {
        if (s.state === 'locked' || region) { wobbles.set(i, performance.now()); wake(); return; } // the region preview only wobbles
        if (s.resting) { openRest(s.number); return; }
        router.go(s.kind === 'lesson' ? `/lesson/${s.number}` : `/checkpoint/${s.checkpoint.id}`);
      }),
    };
  });
  const overlay = createOverlay(overlayStops, { bubbleIndex: stops[currentIndex].state === 'current' && !stops[currentIndex].resting ? currentIndex : -1, onBubble: () => speech.say([{ tts: 'Tap to start' }]) });
  // Keyboard focus on a stop brings it into view.
  overlay.buttons.forEach((b, i) => b.addEventListener('focus', () => { if (b.dataset.shown !== '1') { rig.glideTo(stopS[i], 700, performance.now()); wake(); } }));

  const grown = holdButton({ label: 'Grownups · hold', caption: null, hint: 'Press and hold', className: 'pill-hold', onComplete: () => { ctx.gate = { openedAt: Date.now() }; router.go('/grownups'); } });
  const fs = fullscreenButton({ className: 'home-fs' });
  canvas.classList.add('train-canvas');
  canvas.setAttribute('aria-hidden', 'true');
  const root = h('div', { class: 'home home3d', role: 'region', 'aria-label': 'The railway of lessons', dataset: { renderer: 'webgl' } }, canvas, overlay.layer, h('div', { class: 'home-top' }, ...(region ? [] : [grown]), stars.el, region ? null : devPill(store)), ...(fs ? [fs] : []));
  if (theme.skyCss) root.style.background = theme.skyCss;

  if (!region) firstRunOverlay({ store, root });
  // The pace limit's card: a tap on the resting station, or a lesson opened by its address (js/screens/lesson.js leaves ctx.restCard).
  const openRest = (n) => restCard({ host: root, store, onOpenAnyway: () => router.go(`/lesson/${n}`) });
  if (!region && ctx.restCard) { const n = ctx.restCard; ctx.restCard = null; whenShown(root, () => openRest(n)); }

  // ---- state shown to tests (read only) ----
  const debug = { stopS, engineAt: ENGINE_AT, frames: 0, idleFrames: 0, trainS: train.at, focus: rig.focus, arriving, fromIndex, currentIndex, tootAt: null, running: false, disposed: false, glideIn, reduced: reduced(), soft };
  debug.level = { id: due ? due.id : null, phase: '' };
  debug.specials = train.specials;
  debug.tunnel = !!tunnel;
  // which world is built, how many stops it has, and its portals; the crossing's phase is debug.gate.phase (also debug.crossing)
  debug.world = worldId;
  Object.defineProperty(debug, 'scene', { value: scene, enumerable: false }); // read only, for the tests (draw-call profile); not enumerable, so a test copying the debug object stays fast
  debug.fogHex ='#' + scene.fog.color.getHexString(); // a world's look, for the tests
  debug.skyOverride = !!theme.skyCss;
  debug.theme = theme.id;
  debug.region = region;
  debug.placeholder = placeholder;
  debug.nextWorld = nextW ? nextW.id : null;
  debug.signText = nextW ? nextW.name : null;
  debug.portal = !!portal;
  debug.signpost = !!signpost;
  debug.startTunnel = !!startTunnel;
  debug.trainLength = train.length;
  debug.wagons = train.wagonCount; // letter wagons on the train
  debug.parked = parked ? worldLessons.length : 0; // letter wagons standing on the siding
  debug.engineUpgrade = train.upgrades;
  debug.stopCount = stops.length;
  debug.lessonCount = stops.filter((x) => x.kind === 'lesson').length;
  debug.checkpointCount = stops.filter((x) => x.kind === 'depot').length;
  debug.gate = { mode: gw ? gw.mode : null, phase: '' };
  debug.crossing = debug.gate;
  // Brings stop i into view (keyboard focus does the same for a stop that is on screen); tests use it to reach a stop.
  debug.show = (i) => { rig.jump(i < 0 ? stopS[0] + i : stopS[Math.min(stopS.length - 1, i)]); render(); wake(); };
  // Where the portal's mouth and the signpost's board are on the screen (CSS px), for the tests.
  const screenOf = (v) => { camera.updateMatrixWorld(); camera.matrixWorldInverse.copy(camera.matrixWorld).invert(); v.project(camera); return { x: (v.x + 1) / 2 * W, y: (1 - v.y) / 2 * H }; };
  debug.portalSpot = () => (portal ? screenOf(portal.group.localToWorld(new THREE.Vector3(0, 0.9, -HILL / 2))) : null);
  debug.signRect = () => {
    if (!signpost) return null;
    const pts = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => screenOf(signpost.face.localToWorld(new THREE.Vector3(a * signpost.w / 2, b * signpost.h / 2, 0))));
    const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
    return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
  };
  // Test and screenshot helper: the camera moves in close beside the engine (true), or goes back to its place (false).
  debug.closeUp = (on = true) => {
    if (on) {
      const q = {}; line.at(train.at, q);
      camera.position.set(q.x - q.nx * 4.4 - q.dx * 2.0, 3.0, q.z - q.nz * 4.4 - q.dz * 2.0);
      camera.lookAt(q.x, 1.2, q.z);
    } else rig.apply();
    render();
  };
  // Screenshot helper: the camera moves in close in front of the portal (true), or goes back to its place (false).
  debug.portalClose = (on = true, start = false) => {
    const target = start ? startTunnel : portal;
    if (on && target) {
      const g = target.group, k = start ? -1 : 1; g.updateMatrixWorld(true);
      const a = g.localToWorld(new THREE.Vector3(1.4 * k, 3.6, -12.5 * k)), b = g.localToWorld(new THREE.Vector3(0, 2.3, 0));
      camera.position.copy(a); camera.lookAt(b);
    } else rig.apply();
    render();
  };
  debug.kid = { get index() { return kidIndex; }, get waving() { return kid.waving; }, get phase() { return seq ? seq.phase : ''; } };
  debug.startTootAt = null; debug.seqLog = [];
  debug.kidName = kid.group.name;
  root.__train = debug;
  window.__train = debug;

  // ---- the loop ----
  let raf = 0, last = 0, disposed = false, W = 0, H = 0, blockers = [];
  // The Grownups pill and the full screen button, with a margin: no stop button or bubble goes under them.
  const measureBlockers = () => { const o = root.getBoundingClientRect(); blockers = [...root.querySelectorAll('.home-top .hold-btn, .home-top .level-stars, .home-fs')].map((e) => { const r = e.getBoundingClientRect(); return { x: r.x - o.x - 6, y: r.y - o.y - 6, w: r.width + 12, h: r.height + 12 }; }); };
  const t0 = performance.now();
  let arrival = null, waveUntil = 0;
  const still = reduced();

  function render() {
    if (disposed || !W) return;
    aimLight(rig.look.x, rig.look.z);
    scenery.clouds.position.set(rig.look.x, 0, rig.look.z);
    renderer.render(scene, camera);
    overlay.update(camera, W, H, blockers);
    debug.frames++; debug.calls = renderer.info.render.calls; debug.tris = renderer.info.render.triangles;
    debug.trainS = train.at; debug.focus = rig.focus;
  }

  // ---- the station-complete sequence: toot, the figure hops on, the train rides with thick smoke, the figure hops off ----
  let seq = null;
  const arrived = (t) => {
    debug.tootAt = performance.now();
    sfx.play('toot');
    train.pip.wave(true, t); train.pip.lean(1); kid.wave(true, t);
    waveUntil = t + 2.6;
  };
  const ease3 = (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
  // Gets a hop ready: the figure's world pose now, and at its destination (place() puts it there under its new parent);
  // for the flight it lives in the scene itself.
  function hopPrep(place) {
    scene.updateMatrixWorld(true);
    const a = new THREE.Vector3(), qa = new THREE.Quaternion(), sa = kid.group.scale.x;
    kid.group.getWorldPosition(a); kid.group.getWorldQuaternion(qa);
    place(); scene.updateMatrixWorld(true);
    const b = new THREE.Vector3(), qb = new THREE.Quaternion(), sb = kid.group.scale.x;
    kid.group.getWorldPosition(b); kid.group.getWorldQuaternion(qb);
    scene.add(kid.group);
    kid.group.position.copy(a); kid.group.quaternion.copy(qa); kid.group.scale.setScalar(sa);
    return { a, qa, sa, b, qb, sb, place };
  }
  // Moves the figure along a short jump arc; returns true when it has landed.
  function hopStep(hp, k) {
    const e = ease3(Math.min(1, k));
    kid.group.position.lerpVectors(hp.a, hp.b, e);
    kid.group.position.y += Math.sin(Math.min(1, k) * Math.PI) * 0.9;
    kid.group.quaternion.slerpQuaternions(hp.qa, hp.qb, e);
    kid.group.scale.setScalar(hp.sa + (hp.sb - hp.sa) * e);
    if (k < 1) return false;
    hp.place();
    return true;
  }
  const seatPlace = () => { train.engine.group.add(kid.group); kid.group.position.copy(SEAT); kid.group.rotation.set(0, 2.55, 0); kid.group.scale.setScalar(SEAT_SCALE); };
  function stepSeq(now, t) {
    const e = now - seq.t0;
    if (seq.phase === 'toot') {
      if (!seq.tooted) { seq.tooted = true; sfx.play('whistle'); debug.startTootAt = performance.now(); train.puff(t, true); train.pip.wave(true, t); waveUntil = t + 0.9; }
      if (e >= TOOT_LEAD_MS) { seq.phase = 'on'; seq.t0 = now; seq.hop = hopPrep(seatPlace); }
    } else if (seq.phase === 'on') {
      if (hopStep(seq.hop, e / HOP_MS)) {
        seq.phase = 'go'; seq.hop = null;
        arrival = { from: restS(fromIndex), to: restS(currentIndex), start: now, lastPuff: -1 };
        if (doneLessons.length) train.bounceLast(t);
        rig.follow(() => (arrival ? train.at - ENGINE_AT : null));
      }
    } else if (seq.phase === 'off') {
      if (hopStep(seq.hop, e / HOP_MS)) { seq = null; arrived(t); levelAfter(600); }
    }
  }

  // ---- the level celebration: the train rolls into the tunnel, toots, backs out, then the party (Pip dances, the banner,
  // confetti, the new car couples on and the star lands on the board). Drawn only while it plays, then nothing again. ----
  let lvl = null, lvlTimer = 0, gateTimer = 0;
  // The theme song waits while this is true: the station-complete ride and a level party come first.
  let celebrating = false;
  const levelIndex = () => builtLevels(curriculum).findIndex((v) => v.id === due.id);
  // Everything due on this visit is over (the ride, any level party): when a crossing is due, the train now rolls into the portal.
  const celebrationOver = () => {
    celebrating = false;
    if (cross && !disposed && !gate && !crossStarted) { crossStarted = true; gateTimer = setTimeout(() => { gateTimer = 0; startGate('out'); }, still ? 700 : 900); }
  };
  let crossStarted = false;
  const levelAfter = (ms) => {
    if (!due || disposed) { celebrationOver(); return; }
    lvlTimer = setTimeout(() => { lvlTimer = 0; if (!disposed) startLevel(); }, ms);
  };
  function startLevel() {
    if (still) {
      // reduced motion: no ride, no dance, no confetti; the banner, the star and one soft sound
      levelBanner({ level: due, host: root, reducedMotion: true });
      stars.pop(levelIndex());
      sfx.play('star');
      render();
      celebrationOver();
      return;
    }
    lvl = { phase: 'in', t0: performance.now(), lastPuff: -1, from: restS(currentIndex), pipY: train.pip.group.position.y };
    debug.level.phase = 'in';
    wake();
  }
  function stepLevel(now, t) {
    const e = now - lvl.t0, to = restS(currentIndex);
    const roll = (s) => { train.roll(s - train.at); train.place(s, t); if (t - lvl.lastPuff > 0.5) { train.puff(t); lvl.lastPuff = t; } };
    if (lvl.phase === 'in') {
      roll(lvl.from + IN * ease3(Math.min(1, e / LEVEL_IN_MS)));
      if (e >= LEVEL_IN_MS) { lvl.phase = 'hold'; lvl.t0 = now; debug.level.phase = 'hold'; sfx.play('whistle'); train.puff(t, true); rig.glideTo(stopS[currentIndex] - PARTY_BACK, LEVEL_HOLD_MS + LEVEL_OUT_MS, now); }
    } else if (lvl.phase === 'hold') {
      if (e >= LEVEL_HOLD_MS) { lvl.phase = 'out'; lvl.t0 = now; debug.level.phase = 'out'; }
    } else if (lvl.phase === 'out') {
      roll(lvl.from + IN * (1 - ease3(Math.min(1, e / LEVEL_OUT_MS))));
      if (e >= LEVEL_OUT_MS) {
        train.roll(to - train.at); train.place(to, t);
        lvl.phase = 'party'; lvl.t0 = now; debug.level.phase = 'party';
        sfx.play('checkpoint');
        if (dueCar) dueCar.visible = true;
        train.join(due.car, t);
        train.pip.wave(true, t); kid.wave(true, t);
        waveUntil = t + LEVEL_PARTY_MS / 1000 - 0.1;
      }
    } else if (lvl.phase === 'party') {
      const k = Math.min(1, e / LEVEL_PARTY_MS), g = train.pip.group;
      if (!lvl.bannered && e >= BANNER_AT_MS) { lvl.bannered = true; levelBanner({ level: due, host: root }); stars.pop(levelIndex()); }
      train.place(to, t); // the new car glides to its place
      g.position.y = lvl.pipY + Math.abs(Math.sin(k * Math.PI * 4)) * 0.12;
      g.rotation.z = Math.sin(k * Math.PI * 4) * 0.15;
      if (e >= LEVEL_PARTY_MS) { g.position.y = lvl.pipY; g.rotation.z = 0; train.place(to, t); lvl = null; debug.level.phase = ''; celebrationOver(); rig.glideTo(stopS[currentIndex], 1200, now); }
    }
  }

  // ---- the world gateway (preview): out, the train rolls into the tunnel at the end of the line; in, it rolls out of one at the start ----
  let gate = null;
  function startGate(mode) {
    if (disposed || gate) return;
    const t = (performance.now() - t0) / 1000;
    if (mode === 'in') {
      if (still) { train.place(restS(currentIndex)); rig.jump(stopS[currentIndex]); debug.gate.phase = 'done'; render(); if (gw.onDone) gw.onDone(); return; }
      gate = { mode, t0: performance.now(), lastPuff: -1, from: gateStartS, to: restS(currentIndex), ms: GATE_IN_MS, told: true };
      rig.follow(() => (gate ? train.at - ENGINE_AT : null));
    } else {
      if (still) { debug.gate.phase = 'entered'; render(); if (gw.onEnter) gw.onEnter(); return; }
      gate = { mode, t0: performance.now(), lastPuff: -1, from: restS(currentIndex), to: restS(currentIndex) + GATE_PAST, ms: GATE_OUT_MS, told: false };
      rig.glideTo(stopS[currentIndex] + 3, GATE_OUT_MS, performance.now());
    }
    debug.gate.phase = mode;
    sfx.play('whistle'); train.puff(t, true); train.pip.wave(true, t); waveUntil = t + 1.2;
    if (mode === 'out' && cross) train.detach(t); // the letter wagons stay behind as the engine goes into the portal
    wake();
  }
  function stepGate(now, t) {
    const k = Math.min(1, (now - gate.t0) / gate.ms);
    const s = gate.from + (gate.to - gate.from) * ease3(k);
    train.roll(s - train.at); train.place(s, t);
    if (t - gate.lastPuff > 0.35 && k < 1) { train.puff(t); gate.lastPuff = t; }
    if (!gate.told && k >= 0.55) { gate.told = true; debug.gate.phase = 'entered'; if (gw.onEnter) gw.onEnter(); }
    if (k >= 1) {
      const mode = gate.mode;
      gate = null;
      debug.gate.phase = mode === 'in' ? 'done' : 'entered';
      if (mode === 'in') { arrived(t); if (gw.onDone) gw.onDone(); }
    }
  }
  root.gatewayGo = () => startGate('in');

  function step(dt, now) {
    const t = (now - t0) / 1000;
    let busy = rig.update(dt, now);
    if (seq) { busy = true; stepSeq(now, t); }
    if (lvl) { busy = true; stepLevel(now, t); }
    if (gate) { busy = true; stepGate(now, t); }
    if (arrival) {
      const k = Math.min(1, Math.max(0, (now - arrival.start) / ARRIVE_MS));
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      const s = arrival.from + (arrival.to - arrival.from) * e;
      train.roll(s - train.at);
      train.place(s, t);
      // the reward: thick billowing smoke the whole way (a normal arrival puffs every half second)
      if (t - arrival.lastPuff > (seq ? 0.1 : 0.5) && k < 1) { train.puff(t, !!seq); arrival.lastPuff = t; }
      if (k >= 1) {
        arrival = null;
        if (seq) { seq.phase = 'off'; seq.t0 = now; seq.hop = hopPrep(() => kidTo(currentIndex)); }
        else arrived(t);
      }
      busy = true;
    }
    if (train.steam(t)) busy = true;
    if (waveUntil && t > waveUntil) { waveUntil = 0; train.pip.wave(false); train.pip.lean(0); kid.wave(false); }
    // Pip's life (breathing, blinking, waving) is drawn only while something else already moves or he waves
    if (!still) {
      train.pip.tick(t); kid.tick(t);
      if (waveUntil) busy = true;
    } else { train.pip.tick(t, true); kid.tick(t, true); }
    for (const [i, start] of wobbles) {
      const k = (now - start) / 320;
      built[i].sign.rotation.z = k >= 1 ? 0 : Math.sin(k * Math.PI * 3) * 0.12 * (1 - k);
      if (k >= 1) wobbles.delete(i); else busy = true;
    }
    return busy;
  }

  function frame(now) {
    raf = 0;
    if (disposed) return;
    const dt = Math.max(0, Math.min(0.1, (now - last) / 1000)); // rAF time can be a little behind performance.now()
    last = now;
    const busy = step(dt, now);
    render();
    debug.running = busy;
    if (busy) wake(); // otherwise nothing more is drawn until something moves
  }
  function wake() {
    if (disposed || document.hidden || raf) return;
    if (!debug.running) last = performance.now();
    raf = requestAnimationFrame(frame);
  }

  const onVisibility = () => {
    if (document.hidden) { cancelAnimationFrame(raf); raf = 0; debug.running = false; }
    else { last = performance.now(); wake(); }
  };
  document.addEventListener('visibilitychange', onVisibility);

  // ---- size ----
  const ro = new ResizeObserver(() => {
    const r = root.getBoundingClientRect();
    if (!r.width || !r.height) return;
    W = r.width; H = r.height;
    renderer.setSize(W, H, false);
    measureBlockers();
    rig.frame(W, H);
    render();
    wake();
  });
  ro.observe(root);

  // ---- one finger drags the camera along the line ----
  let pointer = null;
  const onDown = (e) => {
    if (pointer !== null || (e.pointerType === 'mouse' && e.button !== 0)) return;
    if (e.target.closest('.home-top, .home-fs, .first-run, .bubble')) return;
    pointer = e.pointerId; downAt = [e.clientX, e.clientY]; dragged = false; lastMove = performance.now();
  };
  const onMove = (e) => {
    if (e.pointerId !== pointer || !downAt) return;
    const dx = e.clientX - downAt[0], dy = e.clientY - downAt[1];
    if (!dragged && Math.hypot(dx, dy) > TAP_SLOP) { dragged = true; rig.dragStart(); downAt = [e.clientX, e.clientY]; return; }
    if (!dragged) return;
    const now = performance.now();
    rig.dragMove(e.clientY - downAt[1], (now - lastMove) / 1000);
    downAt = [e.clientX, e.clientY]; lastMove = now;
    wake();
  };
  const onUp = (e) => {
    if (e.pointerId !== pointer) return;
    pointer = null; downAt = null;
    if (dragged) { rig.dragEnd(); wake(); setTimeout(() => { dragged = false; }, 0); }
  };
  root.addEventListener('pointerdown', onDown, true);
  addEventListener('pointermove', onMove, true);
  addEventListener('pointerup', onUp, true);
  addEventListener('pointercancel', onUp, true);

  // A lost context (the phone took the GPU away): the 2D path takes over.
  const onLost = (e) => { if (disposed) return; e.preventDefault(); ctx.noTrain = true; queueMicrotask(() => router.go('/home')); };
  canvas.addEventListener('webglcontextlost', onLost);

  // ---- the opening ----
  const startAt = performance.now();
  celebrating = !preview && (!!arriving || !!due);
  if (glideIn) {
    setTimeout(() => { if (!disposed) { rig.glideTo(stopS[currentIndex], Math.min(3200, 1200 + currentIndex * 160), performance.now()); wake(); } }, 450);
  }
  if (arriving) {
    if (still) {
      // reduced motion: the train simply appears at the new stop with a short fade
      train.place(restS(currentIndex));
      rig.jump(stopS[currentIndex]);
      train.setOpacity(0.01);
      const fade = (now) => { if (disposed) return; const k = Math.min(1, (now - startAt) / 300); train.setOpacity(k); render(); if (k < 1) requestAnimationFrame(fade); else { train.setOpacity(1); debug.tootAt = performance.now(); sfx.play('whistle'); levelAfter(0); } };
      requestAnimationFrame(fade);
    } else {
      setTimeout(() => {
        if (disposed) return;
        seq = { phase: 'toot', t0: performance.now(), tooted: false };
        wake();
      }, 600);
    }
  } else if (preview || arrive) {
    // the gateway preview: leaving a world starts by itself; arriving (preview or the real next world) waits for gatewayGo() (the loading card is still showing)
    if (region) { if (!still) { train.pip.wave(true, 0); waveUntil = 2.2; } } else if (preview && preview.mode === 'out') { if (!still) { train.pip.wave(true, 0); waveUntil = 1.4; } gateTimer = setTimeout(() => startGate('out'), still ? 900 : 1100); }
  } else if (!still) {
    // Pip waves hello when Home opens
    train.pip.wave(true, 0); waveUntil = 2.2;
    levelAfter(900);
  } else levelAfter(0);
  debug.running = true;
  wake();
  const waitIdle = celebrating; // after a celebration the theme also waits for the last movement to settle
  if (!preview) music.enterHome({ hold: () => celebrating || (waitIdle && debug.running) || !!(gateHold && gateHold.active) });

  root.cleanup = () => {
    disposed = true;
    if (!preview) music.leaveHome();
    clearTimeout(lvlTimer); clearTimeout(gateTimer);
    gate = null;
    debug.disposed = true;
    cancelAnimationFrame(raf);
    grown.cleanup && grown.cleanup();
    ro.disconnect();
    document.removeEventListener('visibilitychange', onVisibility);
    root.removeEventListener('pointerdown', onDown, true);
    removeEventListener('pointermove', onMove, true);
    removeEventListener('pointerup', onUp, true);
    removeEventListener('pointercancel', onUp, true);
    canvas.removeEventListener('webglcontextlost', onLost);
    scene.traverse((o) => { if (o.isInstancedMesh) o.dispose(); });
    bag.dispose();
    renderer.renderLists.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    if (window.__train === debug) delete window.__train;
  };
  return root;
}

