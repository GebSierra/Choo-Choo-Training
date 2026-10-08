import { h, animate, reduced, icon } from '../../dom.js';
import { engineSvg, huntBackdrop, puffEl, FUNNEL_TOP } from '../../art/train2d.js';
import { pipSvg } from '../../art/pip.js';
import { letterFace, tintLetter } from '../../components/letter-face.js';
import { sayPrompt, saySound } from '../../components/say-sound.js';
import { sparkle } from '../../components/sparkle.js';
import { timers, watchSize, starRow, shake, idleHints } from '../../components/game-kit.js';
import { order, roundsFor, boardWords } from '../../games-data.js';
import { accentOf } from '../../theme.js';
import { soundPhrase, fit } from '../../lessons.js';
import { sfx } from '../../sfx.js';

const INK = '#1E2140';
const TRAIN_W = 116, FLIP = 150, STAGGER = 60, NEXT_MS = 600, FIRST_MS = 400;

// Station Board. A split-flap departures board hangs on the station wall; its tiles spell a short word. The grown-up's
// recorded sound plays (or "Say: This is sad. Tap aaa." shows for the grown-up); the child taps the tile that makes the
// sound. The right tile glows, Pip cheers in the cab and the board flips to the next word. The word is never sent to the
// phone's voice. Reduced motion: no flip, the letters swap with a short fade.
export function build(ctx) {
  const { lesson, sound, speech, curriculum } = ctx;
  const rounds = roundsFor(lesson, 'board');
  const words = (lesson.board || boardWords(order(curriculum), lesson.number, rounds)).slice(0, rounds);
  const T = timers();
  let round = 0, locked = true, done = false, tiles = [], W = 0, serial = 0, endAnims = [];

  const prompt = sayPrompt();
  const hear = h('button', { class: 'say-hear board-hear', type: 'button', 'aria-label': 'Hear the sound again', onclick: () => saySound(ctx, words[round].target, prompt, { lead: `This is ${words[round].word}.` }) }, icon('speaker', 32));
  const row = h('div', { class: 'flap-row' });
  const board = h('div', { class: 'flap-board', role: 'group', 'aria-label': 'station board' }, h('span', { class: 'flap-chain l', 'aria-hidden': 'true' }), h('span', { class: 'flap-chain r', 'aria-hidden': 'true' }), row);
  const wall = h('div', { class: 'station-wall', 'aria-hidden': 'true' }, h('span', { class: 'wall-clock' }, h('i'), h('i')));
  const platform = h('div', { class: 'station-platform', 'aria-hidden': 'true' });
  const trainHop = h('div', { class: 'train-hop' }, engineSvg());
  const train = h('div', { class: 'train-wrap', style: { width: TRAIN_W + 'px' } }, trainHop);
  const stars = starRow(rounds);
  const scene = h('div', { class: 'farm board-scene' }, huntBackdrop());
  scene.append(wall, platform, board, prompt.el, hear, train);
  const el = h('div', { class: 'game board-game', dataset: { round: '0', state: 'playing', word: '' } }, scene, stars.el);

  const seat = () => train.querySelector('.pip-seat');
  const setPip = (pose) => { const s = seat(), old = s.firstChild, p = pipSvg({ pose }); for (const k of ['x', 'y', 'width', 'height']) p.setAttribute(k, old.getAttribute(k)); s.replaceChildren(p); };

  function puff(big = 1) {
    if (!train.isConnected) return;
    const r = trainHop.getBoundingClientRect(), o = scene.getBoundingClientRect();
    const p = puffEl();
    Object.assign(p.style, { left: r.left - o.left + r.width * FUNNEL_TOP.x - 12 + 'px', top: r.top - o.top + r.height * FUNNEL_TOP.y - 14 + 'px' });
    scene.append(p);
    const a = p.animate([{ transform: 'translate(0,0) scale(.5)', opacity: 0.95 }, { transform: `translate(${-8 - big * 6}px,${-20 - big * 10}px) scale(${big})`, opacity: 0.9, offset: 0.4 }, { transform: `translate(${-14 - big * 12}px,${-34 - big * 18}px) scale(${1.4 * big})`, opacity: 0 }], { duration: 1100 + big * 300, easing: 'ease-out', fill: 'forwards' });
    a.finished.then(() => p.remove()).catch(() => p.remove());
  }

  function makeTile(ch, isTarget) {
    const b = h('button', { class: 'flap-tile', type: 'button', 'aria-label': 'letter' }, h('span', { class: 'flap-face' }, letterFace(ch, INK)));
    b.dataset.letter = ch; b.dataset.target = isTarget ? '1' : '0';
    b.addEventListener('click', () => choose(b));
    return b;
  }
  const setTile = (b, ch, isTarget) => { b.dataset.letter = ch; b.dataset.target = isTarget ? '1' : '0'; b.firstChild.replaceChildren(letterFace(ch, INK)); };
  const wordKey = (w) => w.word;

  function say() { const mine = serial; return saySound(ctx, words[round].target, prompt, { lead: `This is ${words[round].word}.`, stale: () => mine !== serial || done }); }

  function layout(w) {
    const first = !W;
    W = w;
    scene.style.setProperty('--tw', Math.max(72, Math.min(80, Math.floor((w - 14 - 16 - 18) / 4))) + 'px');
    if (first) show(0);
  }
  const stopWatching = watchSize(scene, layout);

  // The first word, with no flip.
  function show(i) {
    const { word, target } = words[i];
    row.replaceChildren();
    tiles = [...word].map((ch) => makeTile(ch, ch === target));
    row.append(...tiles);
    el.dataset.word = word; el.dataset.round = String(round);
    prompt.hide();
    locked = false;
    const mine = ++serial;
    T.later(() => { if (mine === serial && !done) say(); }, FIRST_MS);
  }

  // Every tile flips to the next word: rotateX to edge-on, swap the letter, and back; tiles are added or removed on the way.
  function flipTo(i) {
    const { word, target } = words[i];
    const mine = ++serial;
    locked = true; prompt.hide();
    el.dataset.word = word; el.dataset.round = String(round);
    const n = Math.max(tiles.length, word.length), old = tiles.slice(), next = [];
    let total = 0;
    for (let k = 0; k < n; k++) {
      const ch = word[k], isT = ch === target;
      let tile = old[k];
      if (reduced()) {
        if (tile && ch) { setTile(tile, ch, isT); animate(tile, [{ opacity: 0 }, { opacity: 1 }], { duration: FLIP }); }
        else if (tile) tile.remove();
        else { tile = makeTile(ch, isT); row.append(tile); animate(tile, [{ opacity: 0 }, { opacity: 1 }], { duration: FLIP }); }
        if (ch) next.push(tile);
        total = FLIP;
        continue;
      }
      const delay = k * STAGGER;
      total = Math.max(total, delay + 2 * FLIP);
      if (tile) {
        const out = tile.animate([{ transform: 'rotateX(0deg)' }, { transform: 'rotateX(-90deg)' }], { duration: FLIP, delay, fill: 'forwards', easing: 'ease-in' });
        endAnims.push(out);
        out.finished.then(() => {
          if (ch) { setTile(tile, ch, isT); endAnims.push(tile.animate([{ transform: 'rotateX(90deg)' }, { transform: 'rotateX(0deg)' }], { duration: FLIP, easing: 'ease-out' })); out.cancel(); }
          else { tile.remove(); }
        }).catch(() => {});
      } else {
        tile = makeTile(ch, isT);
        tile.style.opacity = '0';
        row.append(tile);
        T.later(() => { tile.style.opacity = ''; endAnims.push(tile.animate([{ transform: 'rotateX(90deg)' }, { transform: 'rotateX(0deg)' }], { duration: FLIP, easing: 'ease-out' })); }, delay + FLIP);
      }
      if (ch) next.push(tile);
    }
    tiles = next;
    T.later(() => { if (mine !== serial) return; locked = false; if (!done) say(); }, total + 80);
  }

  function choose(b) {
    if (done || locked) return;
    if (b.dataset.target !== '1') { shake(b); return; }
    locked = true;
    tintLetter(b.querySelector('.glyph, .font-letter'), accentOf(b.dataset.letter));
    b.classList.add('glow');
    const r = b.getBoundingClientRect(), o = scene.getBoundingClientRect();
    sparkle(scene, r.left - o.left + r.width / 2, r.top - o.top + r.height / 2, { count: 9, size: [10, 20], reach: [30, 62] });
    sfx.play('pop', { step: round });
    stars.fill(round);
    setPip('cheer'); T.later(() => setPip('idle'), 900);
    if (!reduced()) { train.querySelectorAll('.wheel').forEach((w) => w.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }], { duration: 700, easing: 'cubic-bezier(.45,.05,.3,1)' })); puff(); }
    round++;
    if (round < rounds) { T.later(() => { tiles.forEach((t) => t.classList.remove('glow')); flipTo(round); }, NEXT_MS); return; }
    done = true; hints.stop();
    T.later(ending, NEXT_MS);
  }

  function ending() {
    el.dataset.state = 'ending';
    setPip('wave');
    if (reduced()) { sfx.play('win'); finish(); return; }
    sfx.play('toot');
    for (let k = 0; k < 4; k++) T.later(() => puff(1.5 + (k % 3) * 0.3), k * 170);
    T.later(() => { sfx.play('win'); finish(); }, 1600);
  }
  function finish() { el.dataset.state = 'done'; ctx.setDone(true); }

  const hints = idleHints(scene, () => {
    if (locked || done) return;
    hear.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.18)', offset: 0.5 }, { transform: 'scale(1)' }], { duration: 500, iterations: 2, easing: 'ease-in-out' });
    setPip('point'); T.later(() => setPip('idle'), 1600);
  });

  function again() {
    T.clear(); endAnims.forEach((a) => a.cancel()); endAnims = [];
    hints.arm();
    round = 0; done = false; el.dataset.state = 'playing';
    stars.reset(); setPip('idle');
    scene.querySelectorAll('.steam-puff').forEach((p) => p.remove());
    show(0);
  }

  const parts = [{ tts: curriculum.games.board.say }];
  return {
    el, flush: true,
    parts: () => parts,
    gist: () => fit(`Find ${soundPhrase(sound)} in the word.`, 'Find the sound.'),
    script: () => "Read the word on the board to your child: 'This is …' Then say the sound shown at the top. Your child taps the letter that makes it. If they are stuck, say the sound together.",
    again: () => { again(); speech.say(parts); },
    cleanup: () => { T.clear(); hints.stop(); stopWatching(); endAnims.forEach((a) => a.cancel()); },
  };
}
