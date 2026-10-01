import { h, animate, reduced } from '../../dom.js';
import { barnSvg } from '../../art.js';
import { letterFace, tintLetter } from '../../components/letter-face.js';
import { sparkle } from '../../components/sparkle.js';
import { timers, farm, watchSize, findCard, starRow, shake } from '../../components/game-kit.js';
import { accentOf } from '../../theme.js';
import { soundPhrase } from '../../lessons.js';
import { sfx } from '../../sfx.js';

const STARS = 5;
const INK = '#1E2140';
const OPEN_MS = 400;

// Task 8: Barn Doors. The doors swing open on one big letter. A matching letter waits to be touched;
// now and then a different one shows, shakes if touched, and the doors close on their own.
export function build({ lesson, sound, speech, curriculum }) {
  const target = lesson.sound, accent = accentOf(target);
  const cfg = curriculum.games.barn;
  const others = cfg.distractors[target];
  const T = timers();
  let stars = 0, rounds = 0, found = false, kind = 'target', lastKind = 'target', lastLetter = '', running = false;

  const art = barnSvg({ interior: true });
  const doors = [art.querySelector('.door-l'), art.querySelector('.door-r')];
  const letterBtn = h('button', { class: 'barn-letter', type: 'button', 'aria-label': 'letter', disabled: true });
  const barn = h('div', { class: 'barn' }, art, letterBtn);
  const row = starRow(STARS);
  const scene = farm();
  scene.append(barn, findCard(target));
  const el = h('div', { class: 'game barn-game', dataset: { stars: '0', state: 'closed', kind: 'target' } }, scene, row.el);

  // The barn is as large as the scene allows, centred on the grass.
  const stopWatching = watchSize(scene, (w, hgt) => {
    const bw = Math.max(200, Math.min(w * 0.94, (hgt - 76) * 1.2));
    barn.style.width = bw + 'px';
    barn.style.height = (bw * 200) / 240 + 'px';
    barn.style.setProperty('--bw', bw + 'px');
  });

  const setState = (s) => { el.dataset.state = s; };
  let doorAnims = [], faceAnims = [];
  const cancel = (list) => { list.forEach((a) => a.cancel()); return []; };

  // Doors swing from their outer edges and hold their last frame. With reduced motion they swap instantly by opacity.
  function swing(open) {
    if (open) sfx.play('doors'); // closing is silent
    doorAnims = cancel(doorAnims);
    doorAnims = doors.map((d) => (reduced()
      ? d.animate([{ opacity: open ? 1 : 0 }, { opacity: open ? 0 : 1 }], { duration: 0, fill: 'forwards' })
      : d.animate([{ transform: `scaleX(${open ? 1 : 0.1})` }, { transform: `scaleX(${open ? 0.1 : 1})` }], { duration: OPEN_MS, fill: 'forwards', easing: 'cubic-bezier(.2,.8,.2,1)' })));
  }

  function showLetter(ch, isTarget) {
    faceAnims = cancel(faceAnims);
    letterBtn.replaceChildren(h('span', { class: 'face' }, letterFace(ch, INK)));
    letterBtn.dataset.target = isTarget ? '1' : '0';
    letterBtn.dataset.letter = ch;
    letterBtn.disabled = false;
    const face = letterBtn.firstChild;
    if (reduced()) return;
    animate(face, [{ opacity: 0, transform: 'scale(.9)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 320, delay: 240 });
    if (isTarget) faceAnims = [face.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.05)' }], { duration: 2400, direction: 'alternate', iterations: Infinity, easing: 'ease-in-out', delay: 700 })];
  }

  function startRound() {
    if (!running) return;
    found = false;
    kind = rounds >= 2 && lastKind === 'target' && Math.random() < 1 / 3 ? 'distractor' : 'target'; // about one round in three, never two in a row
    lastKind = kind; rounds++;
    el.dataset.kind = kind;
    let ch = target;
    if (kind === 'distractor') { do { ch = others[Math.floor(Math.random() * others.length)]; } while (ch === lastLetter && others.length > 1); }
    lastLetter = ch;
    setState('opening');
    swing(true);
    showLetter(ch, kind === 'target');
    T.later(() => {
      setState('open');
      if (kind === 'distractor') T.later(() => { closeDoors(); T.later(startRound, OPEN_MS + 900); }, 2500);
    }, OPEN_MS);
  }

  function closeDoors() {
    faceAnims = cancel(faceAnims);
    letterBtn.disabled = true;
    letterBtn.replaceChildren();
    setState('closing');
    swing(false);
    T.later(() => setState('closed'), OPEN_MS);
  }

  const hop = (n = 1) => { if (!reduced()) barn.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-8px)' }, { transform: 'translateY(0)' }], { duration: 420, iterations: n, easing: 'cubic-bezier(.34,1.56,.64,1)' }); };
  const center = () => ({ x: barn.offsetLeft + barn.offsetWidth / 2, y: barn.offsetTop + barn.offsetHeight * 0.73 });

  letterBtn.addEventListener('click', () => {
    const face = letterBtn.firstChild;
    if (!face || found || letterBtn.disabled) return;
    if (kind === 'distractor') { shake(face); return; }
    found = true;
    faceAnims = cancel(faceAnims); // stop the breathing; the doors stay open
    tintLetter(face.firstChild, accent);
    animate(face, [{ transform: 'scale(1)' }, { transform: 'scale(1.18)', offset: 0.45 }, { transform: 'scale(1)' }], { duration: 420, easing: 'cubic-bezier(.34,1.56,.64,1)' });
    const c = center();
    row.fill(stars);
    stars++;
    el.dataset.stars = String(stars);
    hop();
    if (stars >= STARS) {
      sparkle(scene, c.x, c.y, { count: 28, size: [16, 34], reach: [80, 170] });
      sfx.play('win');
      T.later(() => hop(2), 500);
      running = false;
      setState('done');
      return;
    }
    sparkle(scene, c.x, c.y, { count: 12, size: [12, 26], reach: [44, 90] });
    sfx.play('star'); // the chime lands as the star fills
    T.later(() => { closeDoors(); T.later(startRound, OPEN_MS + 900); }, 600);
  });

  function again() {
    T.clear(); faceAnims = cancel(faceAnims); doorAnims = cancel(doorAnims);
    stars = 0; rounds = 0; found = false; running = true; lastKind = 'target';
    row.reset();
    el.dataset.stars = '0';
    letterBtn.replaceChildren(); letterBtn.disabled = true;
    setState('closed');
    T.later(startRound, 500);
  }
  running = true;
  T.later(startRound, 700);

  const say = [{ tts: cfg.say }];
  return {
    el, flush: true,
    parts: () => say,
    script: () => `Say: 'Watch the doors. When you see the letter that says ${soundPhrase(sound)}, touch it.' Then say ${soundPhrase(sound)} together.`,
    again: () => { again(); speech.say(say); },
    cleanup: () => { T.clear(); faceAnims = cancel(faceAnims); doorAnims = cancel(doorAnims); stopWatching(); },
  };
}
