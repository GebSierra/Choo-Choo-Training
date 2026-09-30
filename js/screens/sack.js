import { h, animate, reduced } from '../dom.js';
import { sackSvg, barnSvg, starSvg } from '../art.js';
import { glyphSvg } from '../glyphs.js';
import { sparkle } from '../components/sparkle.js';
import { timers, farm, watchSize, starRow, shake } from '../components/game-kit.js';
import { accentOf } from '../theme.js';
import { soundPhrase } from '../lessons.js';

const SPRING = 'cubic-bezier(.34,1.56,.64,1)';
const ease = (list) => [...list].sort(() => Math.random() - 0.5);

// Which sound each round is about: balanced over the checkpoint's sounds, shuffled, never the same sound twice running.
export function roundSounds(sounds, rounds) {
  const pool = Array.from({ length: rounds }, (_, i) => sounds[i % sounds.length]);
  for (let tries = 0; tries < 60; tries++) {
    const p = ease(pool);
    if (p.every((s, i) => !i || s !== p[i - 1])) return p;
  }
  return pool;
}

// The Sound Sack: a burlap sack with a letter on it and three picture cards. The child drags the card whose word
// starts with that sound into the sack. A wrong card glides home with a small shake; nothing else changes.
export function build({ checkpoint, curriculum, speech, refresh, setProgress }) {
  const T = timers();
  const rounds = checkpoint.rounds;
  let order = roundSounds(checkpoint.sounds, rounds), round = 0, locked = false, drag = null, W = 0, H = 0, sackRect = null, bases = [], size = 96, cards = [], lastWords = new Set();
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
    const wrong = ease(curriculum.gameDistractors).slice(0, 2);
    const choices = ease([{ ...right, correct: true }, ...wrong.map((w) => ({ ...w, correct: false }))]);
    front.replaceChildren(glyphSvg(key, { color: accentOf(key), label: 'the sound on the sack' }));
    cards = choices.map((c, i) => {
      const card = h('button', { class: 'sack-card', type: 'button', 'aria-label': c.word, dataset: { correct: c.correct ? '1' : '0', word: c.word } }, h('span', { class: 'emoji', 'aria-hidden': 'true' }, c.emoji));
      placeCard(card, i);
      hookDrag(card, i);
      animate(card, [{ opacity: 0 }, { opacity: 1 }], { duration: 260, delay: 60 * i });
      return card;
    });
    table.replaceChildren(...cards);
    locked = false;
    refresh();
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
    const release = () => {
      if (drag !== card) return;
      drag = null;
      card.classList.remove('lifted');
      const c = centerOf(i, dx, dy), r = sackRect, m = 24;
      const inside = c.x > r.x - m && c.x < r.x + r.w + m && c.y > r.y - m && c.y < r.y + r.h + m;
      if (!inside || !moved(dx, dy)) return glide(card, false);
      if (card.dataset.correct === '1') drop(card, i, dx, dy); else glide(card, true);
    };
    card.addEventListener('pointerup', release);
    card.addEventListener('pointercancel', release);
    // Keyboard: Enter or Space puts the card in the sack, so the game can be played without dragging.
    card.addEventListener('keydown', (e) => {
      if ((e.key !== 'Enter' && e.key !== ' ') || locked || drag) return;
      e.preventDefault();
      const m = mouth();
      if (card.dataset.correct === '1') drop(card, i, m.x - (bases[i].x + size / 2), m.y - (bases[i].y + size / 2) + 30); else shake(card);
    });
  }
  const moved = (dx, dy) => Math.hypot(dx, dy) > 8;

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
    const c = centerOf(i, dx, dy), m = mouth();
    animate(card, [{ transform: `translate(${dx}px,${dy}px) scale(1.06)`, opacity: 1 }, { transform: `translate(${dx + m.x - c.x}px,${dy + m.y - c.y}px) scale(.2)`, opacity: 0 }], { duration: 380, easing: 'cubic-bezier(.5,0,.75,0)', fill: 'forwards' });
    cards.filter((o) => o !== card).forEach((o) => { o.disabled = true; animate(o, [{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' }); });
    T.later(() => cards.forEach((o) => { o.hidden = true; }), 420); // gone for good: no invisible buttons left behind
    T.later(() => {
      wiggle();
      sparkle(scene, m.x, m.y, { count: 14, size: [12, 26], reach: [50, 100] });
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
    const m = mouth();
    sparkle(scene, m.x, m.y, { count: 30, size: [16, 34], reach: [90, 180] });
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
    renderRound();
  }

  const stopWatching = watchSize(scene, layout);
  const say = [{ tts: curriculum.games.sack.say }];
  return {
    el, flush: true,
    parts: () => say,
    script: () => `Say: 'Which one starts with ${soundPhrase(sound())}?' Let them drag it into the bag. There is no right or wrong here.`,
    again: () => { again(); speech.say(say); },
    cleanup: () => { T.clear(); stopWatching(); },
  };
}
