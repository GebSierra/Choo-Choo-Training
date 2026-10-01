import { h, animate, reduced, icon } from '../dom.js';
import { sackSvg, barnSvg, starSvg } from '../art.js';
import { glyphSvg } from '../glyphs.js';
import { sparkle } from '../components/sparkle.js';
import { picture } from '../components/picture.js';
import { timers, farm, watchSize, starRow, shake, shuffle } from '../components/game-kit.js';
import { accentOf } from '../theme.js';
import { soundPhrase, fit } from '../lessons.js';
import { sfx } from '../sfx.js';

const SPRING = 'cubic-bezier(.34,1.56,.64,1)';

// Which sound each round is about: balanced over the checkpoint's sounds, shuffled, never the same sound twice running.
export function roundSounds(sounds, rounds) {
  const pool = Array.from({ length: rounds }, (_, i) => sounds[i % sounds.length]);
  for (let tries = 0; tries < 60; tries++) {
    const p = shuffle(pool);
    if (p.every((s, i) => !i || s !== p[i - 1])) return p;
  }
  return pool;
}

// The Sound Sack: a burlap sack with a letter on it and three picture cards. The child drags the card whose word
// starts with that sound into the sack. A wrong card glides home with a small shake; nothing else changes.
export function build({ checkpoint, curriculum, speech, refresh, setProgress, setDone }) {
  const T = timers();
  const rounds = checkpoint.rounds;
  let order = roundSounds(checkpoint.sounds, rounds), round = 0, locked = false, drag = null, demoTimer = 0, demoShown = false, demoHand = null, W = 0, H = 0, sackRect = null, bases = [], size = 96, cards = [];
  const used = {}; // start words already shown, per sound

  const front = h('div', { class: 'sack-front' });
  const sack = h('div', { class: 'sack' }, sackSvg(), front);
  const table = h('div', { class: 'sack-cards' });
  const decor = h('div', { class: 'sack-barn', 'aria-hidden': 'true' }, barnSvg());
  const scene = farm();
  scene.append(decor, sack, table);
  const row = starRow(rounds);
  const el = h('div', { class: 'game sack-game', dataset: { round: '1', stars: '0', state: 'playing', sound: order[0] } }, scene, row.el);

  const sound = () => curriculum.sounds[order[Math.min(round, rounds - 1)]];

  function pickWord(key) {
    const list = curriculum.sounds[key].startWords;
    const fresh = list.filter((w) => !(used[key] || new Set()).has(w.word));
    const w = (fresh.length ? fresh : list)[Math.floor(Math.random() * (fresh.length ? fresh.length : list.length))];
    (used[key] = used[key] || new Set()).add(w.word);
    return w;
  }

  // Sack at the bottom centre, three cards across the top, staggered; nothing overlaps.
  function layout(w, hgt) {
    W = w; H = hgt;
    const landscape = W > H * 1.2, gap = 12, dy = landscape ? 14 : 34, top = landscape ? 8 : 12;
    const sw = Math.max(130, Math.min(210, landscape ? H * 0.42 : W * 0.5)), sh = (sw * 184) / 160;
    sackRect = { x: (W - sw) / 2, y: H - 10 - sh, w: sw, h: sh };
    size = Math.max(96, Math.min(120, Math.floor((W - 24 - 2 * gap) / 3), Math.floor(sackRect.y - 10 - top - 2 * dy)));
    const x0 = (W - (3 * size + 2 * gap)) / 2;
    bases = [0, 1, 2].map((i) => ({ x: x0 + i * (size + gap), y: top + i * dy }));
    Object.assign(sack.style, { left: sackRect.x + 'px', top: sackRect.y + 'px', width: sw + 'px', height: sh + 'px' });
    table.style.setProperty('--card', size + 'px');
    cards.forEach((c, i) => placeCard(c, i));
    if (!cards.length) renderRound();
  }
  const placeCard = (c, i) => { c.style.left = bases[i].x + 'px'; c.style.top = bases[i].y + 'px'; };

  function renderRound() {
    const key = order[round];
    el.dataset.round = String(round + 1); el.dataset.sound = key;
    const right = pickWord(key);
    const wrong = shuffle(curriculum.gameDistractors.filter((w) => !(w.avoid || []).includes(key))).slice(0, 2); // avoid: a look-alike for this sound
    const choices = shuffle([{ ...right, correct: true }, ...wrong.map((w) => ({ ...w, correct: false }))]);
    front.replaceChildren(glyphSvg(key, { color: accentOf(key), label: 'the sound on the sack' }));
    cards = choices.map((c, i) => {
      const card = h('button', { class: 'sack-card', type: 'button', 'aria-label': c.word, dataset: { correct: c.correct ? '1' : '0', word: c.word } }, picture(c));
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
  const mouth = () => ({ x: sackRect.x + sackRect.w / 2, y: sackRect.y + sackRect.h * 0.24 });

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

  function wiggle(n = 1) {
    if (reduced()) return;
    sack.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(-4deg)', offset: 0.25 }, { transform: 'rotate(3deg)', offset: 0.55 }, { transform: 'rotate(-2deg)', offset: 0.8 }, { transform: 'rotate(0deg)' }], { duration: 520, iterations: n, easing: 'ease-in-out' });
  }

  function drop(card, i, dx, dy) {
    locked = true;
    stopDemo();
    const c = centerOf(i, dx, dy), m = mouth();
    animate(card, [{ transform: `translate(${dx}px,${dy}px) scale(1.06)`, opacity: 1 }, { transform: `translate(${dx + m.x - c.x}px,${dy + m.y - c.y}px) scale(.2)`, opacity: 0 }], { duration: 380, easing: 'cubic-bezier(.5,0,.75,0)', fill: 'forwards' });
    cards.filter((o) => o !== card).forEach((o) => { o.disabled = true; animate(o, [{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' }); });
    T.later(() => cards.forEach((o) => { o.hidden = true; }), 420); // gone for good: no invisible buttons left behind
    T.later(() => {
      wiggle();
      sparkle(scene, m.x, m.y, { count: 14, size: [12, 26], reach: [50, 100] });
      sfx.play('star', { bloop: true });
      row.fill(round);
      el.dataset.stars = String(round + 1);
      round++;
      setProgress(round);
      if (round >= rounds) T.later(finish, 500); else T.later(renderRound, 1200);
    }, 360);
  }

  // After the last round the sack overflows with gold stars.
  function finish() {
    el.dataset.state = 'done';
    setDone(true);
    const m = mouth();
    sparkle(scene, m.x, m.y, { count: 30, size: [16, 34], reach: [90, 180] });
    sfx.play('checkpoint');
    wiggle(2);
    for (let i = 0; i < 7; i++) {
      const ang = (-70 + i * (140 / 6)) * (Math.PI / 180), r = sackRect.w * (0.26 + (i % 2) * 0.1), s = 26 + (i % 3) * 6;
      const star = starSvg('overflow');
      Object.assign(star.style, { position: 'absolute', width: s + 'px', height: s + 'px', left: m.x + Math.sin(ang) * r - s / 2 + 'px', top: m.y - Math.cos(ang) * r * 0.9 - s / 2 - 8 + 'px', zIndex: 5 });
      scene.append(star);
      animate(star, [{ transform: `translate(${-Math.sin(ang) * r}px,${r * 0.9}px) scale(0) rotate(0deg)`, opacity: 0 }, { transform: `rotate(${(i % 2 ? 1 : -1) * 14}deg) scale(1)`, opacity: 1 }], { duration: 520, delay: 80 * i, easing: SPRING, fill: 'backwards' });
    }
  }

  function again() {
    T.clear();
    scene.querySelectorAll('.gold-star.overflow').forEach((s) => s.remove());
    order = roundSounds(checkpoint.sounds, rounds); round = 0; drag = null;
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
    script: () => `Say: 'Which one starts with ${soundPhrase(sound())}?' Let them drag it into the sack. There is no right or wrong here.`,
    gist: () => fit(`Ask: which starts with ${soundPhrase(sound())}?`, `Ask: ${soundPhrase(sound())}?`),
    again: () => { again(); speech.say(say); },
    cleanup: () => { T.clear(); stopDemo(); stopWatching(); },
  };
}
