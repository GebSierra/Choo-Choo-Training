import { h, animate, reduced, icon } from '../dom.js';
import { wagonSvg, engineSvg, dockBackdrop, puffEl, FUNNEL_TOP } from '../art/train2d.js';
import { pipSvg } from '../art/pip.js';
import { glyphSvg } from '../glyphs.js';
import { sparkle } from '../components/sparkle.js';
import { picture } from '../components/picture.js';
import { timers, watchSize, starRow, shake, shuffle } from '../components/game-kit.js';
import { accentOf } from '../theme.js';
import { soundPhrase, fit, sackPool, roundCaps } from '../lessons.js';
import { sfx } from '../sfx.js';

const SPRING = 'cubic-bezier(.34,1.56,.64,1)';

// Which sound each round is about: the favoured sounds first (each at least once), the rest filled from the other sounds,
// shuffled, never the same sound twice running. A sound takes at most as many rounds as it has start words (caps).
// With no favour list and few sounds (checkpoint c1) the rounds are balanced over the sounds as before.
export function roundSounds(sounds, rounds, { favour = [], caps = {} } = {}) {
  const cap = (k) => (caps[k] === undefined ? Infinity : caps[k]);
  const pool = [];
  const left = (k) => cap(k) - pool.filter((x) => x === k).length;
  const fav = favour.filter((k) => sounds.includes(k));
  if (fav.length) {
    // Favoured sounds first, then the others in a shuffled order, cycling until the rounds are full.
    const rest = () => shuffle(sounds.filter((k) => !fav.includes(k)));
    const turn = [...fav];
    let others = rest();
    while (pool.length < rounds) {
      if (turn.length) { const k = turn.shift(); if (left(k) > 0) pool.push(k); continue; }
      if (!others.length) others = shuffle(sounds);
      const k = others.shift();
      if (left(k) > 0) pool.push(k);
      if (others.length === 0 && sounds.every((x) => left(x) <= 0)) break;
    }
  } else {
    for (let i = 0; pool.length < rounds && i < rounds * sounds.length + sounds.length; i++) { const k = sounds[i % sounds.length]; if (left(k) > 0) pool.push(k); }
  }
  for (let tries = 0; tries < 60; tries++) {
    const p = shuffle(pool);
    if (p.every((s, i) => !i || s !== p[i - 1])) return p;
  }
  return pool;
}

// The Sound Station (the Loading Dock): an open goods wagon with a letter painted on its side stands on the track by a
// wooden platform, with three picture crates on the platform. The child drags (or taps) the crate whose word starts
// with that sound into the wagon: it drops in, the lid closes with a soft bounce and a star fills. A wrong crate glides
// home with a small shake; nothing else changes. After the last round the train backs up, couples the wagon and steams
// away with Pip waving, to the checkpoint jingle and a toot. (Mechanics, timing and sounds are the sound sack's.)
export function build({ checkpoint, curriculum, speech, refresh, setProgress, setDone }) {
  const T = timers();
  const rounds = checkpoint.rounds;
  const pickOrder = () => roundSounds(checkpoint.sounds, rounds, { favour: checkpoint.favour, caps: roundCaps(curriculum, checkpoint) });
  let order = pickOrder(), round = 0, locked = false, drag = null, demoTimer = 0, demoShown = false, demoHand = null, W = 0, H = 0, sackRect = null, bases = [], size = 96, cards = [];
  const used = {}; // start words already shown, per sound

  const front = h('div', { class: 'sack-front' });
  const wagonArt = wagonSvg();
  const lid = wagonArt.querySelector('.wagon-lid');
  const sack = h('div', { class: 'sack wagon' }, wagonArt, front); // .sack: the drop target, as before
  const table = h('div', { class: 'sack-cards' });
  const platform = h('div', { class: 'dock-platform-top', 'aria-hidden': 'true' });
  const engine = h('div', { class: 'dock-train', 'aria-hidden': 'true' }, engineSvg({ still: true })); // hidden until the end, so Pip holds still
  const scene = h('div', { class: 'farm dock-scene' }, dockBackdrop());
  scene.append(platform, sack, engine, table);
  const row = starRow(rounds);
  const el = h('div', { class: 'game sack-game', dataset: { round: '1', stars: '0', state: 'playing', sound: order[0], train: 'away' } }, scene, row.el);
  let endAnims = [];
  const keep = (a) => { endAnims.push(a); return a; };
  const setPip = (pose) => { const seat = engine.querySelector('.pip-seat'), old = seat.firstChild, p = pipSvg({ pose, still: pose === 'idle' }); for (const k of ['x', 'y', 'width', 'height']) p.setAttribute(k, old.getAttribute(k)); seat.replaceChildren(p); };

  const sound = () => curriculum.sounds[order[Math.min(round, rounds - 1)]];

  function pickWord(key) {
    const list = curriculum.sounds[key].startWords;
    const fresh = list.filter((w) => !(used[key] || new Set()).has(w.word));
    const w = (fresh.length ? fresh : list)[Math.floor(Math.random() * (fresh.length ? fresh.length : list.length))];
    (used[key] = used[key] || new Set()).add(w.word);
    return w;
  }

  // The wagon on the track at the bottom centre, the crates in a row on the platform above it; nothing overlaps.
  let engineW = 0, engineTop = 0;
  function layout(w, hgt) {
    W = w; H = hgt;
    const landscape = W > H * 1.2, gap = 12, minTop = landscape ? 10 : 18;
    const sw = Math.max(150, Math.min(240, landscape ? H * 0.5 : W * 0.58)), sh = (sw * 150) / 200;
    sackRect = { x: (W - sw) / 2, y: H - 22 - sh * (140 / 150), w: sw, h: sh };
    size = Math.max(96, Math.min(120, Math.floor((W - 24 - 2 * gap) / 3), Math.floor(sackRect.y - 16 - minTop)));
    // the crates stand on the dock just above the wagon (a short way to drag); the dock runs down to the track behind it
    const top = Math.max(minTop, Math.round(sackRect.y - 16 - size));
    const x0 = (W - (3 * size + 2 * gap)) / 2;
    bases = [0, 1, 2].map((i) => ({ x: x0 + i * (size + gap), y: top }));
    Object.assign(sack.style, { left: sackRect.x + 'px', top: sackRect.y + 'px', width: sw + 'px', height: sh + 'px' });
    Object.assign(platform.style, { top: top + size - 10 + 'px', bottom: '30px', height: 'auto' });
    engineW = (sw * 150) / 200; engineTop = H - 22 - engineW * (110 / 150) * (101 / 110);
    Object.assign(engine.style, { width: engineW + 'px', top: engineTop + 'px', left: sackRect.x + sw - 4 + 'px' });
    table.style.setProperty('--card', size + 'px');
    cards.forEach((c, i) => placeCard(c, i));
    if (!cards.length) renderRound();
  }
  const placeCard = (c, i) => { c.style.left = bases[i].x + 'px'; c.style.top = bases[i].y + 'px'; };

  function renderRound() {
    const key = order[round];
    el.dataset.round = String(round + 1); el.dataset.sound = key;
    const right = pickWord(key);
    const wrong = shuffle(sackPool(curriculum, checkpoint).filter((w) => !(w.avoid || []).includes(key))).slice(0, 2); // avoid: a look-alike for this sound
    const choices = shuffle([{ ...right, correct: true }, ...wrong.map((w) => ({ ...w, correct: false }))]);
    front.replaceChildren(glyphSvg(key, { color: accentOf(key), label: 'the sound on the wagon' }));
    openLid();
    cards = choices.map((c, i) => {
      const card = h('button', { class: 'sack-card crate', type: 'button', 'aria-label': c.word, dataset: { correct: c.correct ? '1' : '0', word: c.word } }, picture(c));
      placeCard(card, i);
      hookDrag(card, i);
      animate(card, [{ opacity: 0 }, { opacity: 1 }], { duration: 260, delay: 60 * i });
      return card;
    });
    table.replaceChildren(...cards);
    locked = false;
    demoShown = false;
    armDemo();
    refresh();
  }

  // After 8 quiet seconds in a round a small hand glides once from the right card to the sack, silently. A touch
  // starts the wait again; the demo plays at most once a round, and not at all with reduced motion.
  function stopDemo() { clearTimeout(demoTimer); if (demoHand) { demoHand.remove(); demoHand = null; } }
  function armDemo() {
    stopDemo();
    if (!demoShown && !locked && !reduced()) demoTimer = setTimeout(demo, 8000);
  }
  function demo() {
    const i = cards.findIndex((c) => c.dataset.correct === '1');
    if (i < 0 || locked || drag) return;
    demoShown = true;
    const from = centerOf(i, 0, 0), m = mouth(), to = `translate(${m.x - from.x}px,${m.y - from.y}px)`;
    demoHand = h('span', { class: 'demo-hand', 'aria-hidden': 'true', style: { left: from.x - 22 + 'px', top: from.y - 6 + 'px' } }, icon('tap', 48));
    scene.append(demoHand);
    const hand = demoHand;
    hand.animate([{ transform: 'translate(0,0)', opacity: 0 }, { transform: 'translate(0,0)', opacity: 1, offset: 0.15 }, { transform: to, opacity: 1, offset: 0.85 }, { transform: to, opacity: 0 }], { duration: 1800, easing: 'ease-in-out' }).finished.then(() => { if (demoHand === hand) stopDemo(); }).catch(() => {});
  }

  const centerOf = (i, dx, dy) => ({ x: bases[i].x + size / 2 + dx, y: bases[i].y + size / 2 + dy });
  const mouth = () => ({ x: sackRect.x + sackRect.w / 2, y: sackRect.y + sackRect.h * 0.3 });

  function hookDrag(card, i) {
    let sx = 0, sy = 0, dx = 0, dy = 0;
    card.addEventListener('pointerdown', (e) => {
      if (locked || drag || card.returning) return;
      drag = card; sx = e.clientX; sy = e.clientY; dx = dy = 0;
      try { card.setPointerCapture(e.pointerId); } catch { /* a synthetic pointer: fine */ }
      card.classList.add('lifted');
    });
    card.addEventListener('pointermove', (e) => {
      if (drag !== card) return;
      dx = e.clientX - sx; dy = e.clientY - sy;
      card.style.transform = `translate(${dx}px,${dy}px) scale(1.06)`;
    });
    const release = (cancelled) => {
      if (drag !== card) return;
      drag = null;
      card.classList.remove('lifted');
      // A tap (under 8 px) does what a drag into the sack does: the right card flies in, a wrong one shakes, silently.
      if (!cancelled && !moved(dx, dy)) { card.style.transform = ''; return fly(card, i); }
      const c = centerOf(i, dx, dy), r = sackRect, m = 24;
      const inside = c.x > r.x - m && c.x < r.x + r.w + m && c.y > r.y - m && c.y < r.y + r.h + m;
      if (!inside || !moved(dx, dy)) return glide(card, false);
      if (card.dataset.correct === '1') drop(card, i, dx, dy); else glide(card, true);
    };
    card.addEventListener('pointerup', () => release(false));
    card.addEventListener('pointercancel', () => release(true));
    // Keyboard: Enter or Space does the same as a tap, so the game can be played without dragging.
    card.addEventListener('keydown', (e) => {
      if ((e.key !== 'Enter' && e.key !== ' ') || locked || drag) return;
      e.preventDefault();
      fly(card, i);
    });
  }
  const moved = (dx, dy) => Math.hypot(dx, dy) > 8;
  const fly = (card, i) => { if (card.dataset.correct === '1') drop(card, i, 0, 0); else shake(card); };

  // Back to its place: a spring when it was let go anywhere else, a glide and a small shake when it was a wrong card in the sack.
  function glide(card, wrongInSack) {
    const from = card.style.transform || 'translate(0,0)';
    card.style.transform = '';
    card.returning = true;
    const a = animate(card, [{ transform: from }, { transform: 'translate(0,0) scale(1)' }], { duration: wrongInSack ? 340 : 420, easing: wrongInSack ? 'cubic-bezier(.2,.8,.2,1)' : SPRING });
    a.finished.then(() => { card.returning = false; if (wrongInSack) shake(card); }).catch(() => { card.returning = false; });
  }

  // The wagon takes the crate with a little bounce, and its lid drops shut (soft clunk); the next round opens it again.
  function bounce() {
    if (reduced()) return;
    sack.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(5px) scaleY(.97)', offset: 0.3 }, { transform: 'translateY(-2px)', offset: 0.65 }, { transform: 'translateY(0)' }], { duration: 460, easing: 'ease-out' });
  }
  let lidOpen = true;
  function closeLid() {
    lidOpen = false; lid.classList.add('shut');
    if (!reduced()) lid.animate([{ transform: 'translateY(-26px)', opacity: 0 }, { transform: 'translateY(2px)', opacity: 1, offset: 0.65 }, { transform: 'translateY(-1px)', offset: 0.82 }, { transform: 'translateY(0)', opacity: 1 }], { duration: 420, easing: 'cubic-bezier(.5,0,.75,0)' });
  }
  function openLid() {
    if (lidOpen) return;
    lidOpen = true; lid.classList.remove('shut');
    if (!reduced()) lid.animate([{ transform: 'translateY(0)', opacity: 1 }, { transform: 'translateY(-22px)', opacity: 0 }], { duration: 260, easing: 'ease-out' });
  }

  function drop(card, i, dx, dy) {
    locked = true;
    stopDemo();
    const c = centerOf(i, dx, dy), m = mouth();
    animate(card, [{ transform: `translate(${dx}px,${dy}px) scale(1.06)`, opacity: 1 }, { transform: `translate(${dx + m.x - c.x}px,${dy + m.y - c.y}px) scale(.2)`, opacity: 0 }], { duration: 380, easing: 'cubic-bezier(.5,0,.75,0)', fill: 'forwards' });
    cards.filter((o) => o !== card).forEach((o) => { o.disabled = true; animate(o, [{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' }); });
    T.later(() => cards.forEach((o) => { o.hidden = true; }), 420); // gone for good: no invisible buttons left behind
    T.later(() => {
      bounce();
      closeLid();
      sparkle(scene, m.x, m.y, { count: 14, size: [12, 26], reach: [50, 100] });
      sfx.play('star', { bloop: true });
      row.fill(round);
      el.dataset.stars = String(round + 1);
      round++;
      setProgress(round);
      if (round >= rounds) T.later(finish, 500); else T.later(renderRound, 1200);
    }, 360);
  }

  // After the last round: the jingle, the train backs up to the wagon and couples it (a little bump), then both steam
  // away to the right with Pip waving, and the train toots once the jingle has finished.
  function puff() {
    const r = engine.getBoundingClientRect(), o = scene.getBoundingClientRect();
    const p = puffEl();
    Object.assign(p.style, { left: r.left - o.left + r.width * FUNNEL_TOP.x - 12 + 'px', top: r.top - o.top + r.height * FUNNEL_TOP.y - 14 + 'px' });
    scene.append(p);
    const a = p.animate([{ transform: 'translate(0,0) scale(.5)', opacity: 0.9 }, { transform: 'translate(-18px,-36px) scale(1.5)', opacity: 0 }], { duration: 1100, easing: 'ease-out', fill: 'forwards' });
    a.finished.then(() => p.remove()).catch(() => p.remove());
  }
  function finish() {
    el.dataset.state = 'done';
    setDone(true);
    const m = mouth();
    sparkle(scene, m.x, m.y, { count: 30, size: [16, 34], reach: [90, 180] });
    sfx.play('checkpoint');
    setPip('wave');
    engine.classList.add('here');
    const back = W - (sackRect.x + sackRect.w - 4) + 10; // the engine starts just off the right edge
    if (reduced()) {
      el.dataset.train = 'coupled';
      T.later(() => sfx.play('toot'), 2500);
      return;
    }
    keep(engine.animate([{ transform: `translateX(${back}px)` }, { transform: 'translateX(0)' }], { duration: 900, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'both' }));
    T.later(() => { el.dataset.train = 'coupled'; keep(sack.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-5px)' }, { transform: 'translateX(0)' }], { duration: 260, easing: 'ease-out' })); }, 900);
    T.later(() => {
      el.dataset.train = 'leaving';
      const away = W - sackRect.x + 40;
      const opts = { duration: 1700, easing: 'cubic-bezier(.5,0,.8,.6)', fill: 'forwards' };
      keep(engine.animate([{ transform: 'translateX(0)' }, { transform: `translateX(${away}px)` }], opts));
      keep(sack.animate([{ transform: 'translateX(0)' }, { transform: `translateX(${away}px)` }], opts));
      [sack, engine].forEach((x) => x.querySelectorAll('.wheel').forEach((w) => keep(w.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(720deg)' }], { duration: 1700, easing: 'cubic-bezier(.5,0,.8,.6)' }))));
      for (let k = 0; k < 4; k++) T.later(puff, k * 320);
    }, 1350);
    T.later(() => { el.dataset.train = 'gone'; sfx.play('toot'); }, 2500);
  }

  function again() {
    T.clear();
    endAnims.forEach((a) => a.cancel()); endAnims = [];
    scene.querySelectorAll('.steam-puff').forEach((p) => p.remove());
    engine.classList.remove('here');
    setPip('idle');
    el.dataset.train = 'away';
    order = pickOrder(); round = 0; drag = null;
    for (const k of Object.keys(used)) delete used[k];
    row.reset(); setProgress(0);
    el.dataset.stars = '0'; el.dataset.state = 'playing';
    setDone(false);
    renderRound();
  }

  scene.addEventListener('pointerdown', armDemo, true);
  const stopWatching = watchSize(scene, layout);
  const say = [{ tts: curriculum.games.sack.say }];
  return {
    el, flush: true,
    parts: () => say,
    script: () => `Say: 'Which one starts with ${soundPhrase(sound())}?' Let them drag it into the wagon. There is no right or wrong here.`,
    gist: () => fit(`Ask: which starts with ${soundPhrase(sound())}?`, `Ask: ${soundPhrase(sound())}?`),
    again: () => { again(); speech.say(say); },
    cleanup: () => { T.clear(); stopDemo(); stopWatching(); endAnims.forEach((a) => a.cancel()); },
  };
}
