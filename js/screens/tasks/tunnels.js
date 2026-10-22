import { h, animate, reduced } from '../../dom.js';
import { huntBackdrop, wagonSvg, puffEl } from '../../art/train2d.js';
import { glyphSvg } from '../../glyphs.js';
import { letterText } from '../../letters.js';
import { accentOf } from '../../theme.js';
import { timers, watchSize, starRow, idleHints } from '../../components/game-kit.js';
import { tunnelRounds } from '../../games-data.js';
import { soundPhrase } from '../../lessons.js';
import { sfx } from '../../sfx.js';

const SWIPE = 24, ROLL_MS = 650, GO_MS = 760, BACK_MS = 560;

// A tunnel: a green hill with a dark arch, a brick rim and a sleeper at the foot. The sign (letters or text) is HTML over the hill (.tunnel-sign).
const tunnelSvg = () => h('svg', { class: 'tunnel-art', viewBox: '0 0 160 120', preserveAspectRatio: 'xMidYMax meet', 'aria-hidden': 'true' },
  h('path', { d: 'M4 118 C4 40 40 8 80 8 C120 8 156 40 156 118 Z', fill: '#78D193' }),
  h('path', { d: 'M4 118 C4 70 22 40 44 24 C30 48 30 90 34 118 Z', fill: '#A6E3B4', opacity: 0.7 }),
  h('path', { d: 'M30 118 L30 70 C30 44 52 30 80 30 C108 30 130 44 130 70 L130 118 Z', fill: '#B8926A' }),
  h('path', { d: 'M40 118 L40 72 C40 52 58 40 80 40 C102 40 120 52 120 72 L120 118 Z', fill: '#2B2D5C' }),
  h('rect', { x: 36, y: 112, width: 88, height: 6, rx: 2, fill: '#8A6E5A' }));

// Two Tunnels (Tricky Sounds, checkpoint kind contrast). Two tunnels wear the two letters. A train car rolls in carrying a letter (the first rounds) or a word; the
// child taps the tunnel it belongs to (or swipes the car toward it). Right: the car rolls into the tunnel with a puff of steam. Wrong: it bounces gently back
// and waits. Nothing is scored or timed; six rounds, then a toot. CSS transforms and finite animations only.
export function build(ctx) {
  const { speech } = ctx, ck = ctx.checkpoint;
  const T = timers();
  let rounds = tunnelRounds(ck), round = 0, locked = true, done = false, serial = 0, drag = null, W = 0;
  const stars = starRow(rounds.length);
  const tunnels = ck.sides.map((side, i) => {
    const sign = h('span', { class: 'tunnel-sign' }, side.sign ? side.sign.map((ch) => glyphSvg(ch, { color: accentOf(ch), label: 'letter' })) : h('span', { class: 'tunnel-text' }, side.signText));
    const b = h('button', { class: 'tunnel', type: 'button', dataset: { side: String(i) }, 'aria-label': side.signText ? `Tunnel: ${side.signText}` : 'Tunnel for ' + side.letters.join(' or ') }, tunnelSvg(), sign);
    b.addEventListener('click', () => choose(i));
    return b;
  });
  const face = h('span', { class: 'tcar-face' });
  const car = h('div', { class: 'tcar', role: 'img', 'aria-label': 'train car' }, wagonSvg({ body: '#7B61D6', rib: '#5E47B0' }), face);
  const scene = h('div', { class: 'farm tunnels-scene' }, huntBackdrop());
  scene.append(h('div', { class: 'tunnel-row' }, tunnels), car);
  const el = h('div', { class: 'game tunnels', dataset: { round: '0', state: 'playing' } }, scene, stars.el);

  const centre = (n) => { const r = n.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
  const toward = (side, f) => { const a = centre(car), b = centre(tunnels[side]); return { dx: (b.x - a.x) * f, dy: (b.y - a.y) * f }; };
  function puff(side) {
    if (!scene.isConnected) return;
    const o = scene.getBoundingClientRect(), t = centre(tunnels[side]);
    const p = puffEl();
    Object.assign(p.style, { left: t.x - o.left - 12 + 'px', top: t.y - o.top + 6 + 'px' });
    scene.append(p);
    const a = p.animate([{ transform: 'translate(0,0) scale(.6)', opacity: 0.95 }, { transform: 'translate(-6px,-26px) scale(1.4)', opacity: 0 }], { duration: 900, easing: 'ease-out', fill: 'forwards' });
    a.finished.then(() => p.remove()).catch(() => p.remove());
  }
  function newRound() {
    const mine = ++serial, r = rounds[round];
    face.replaceChildren(r.kind === 'letter' ? glyphSvg(r.value, { color: accentOf(r.value), label: 'letter on the car' }) : letterText(r.value, { label: true, level: ck.after }));
    face.dataset.kind = r.kind;
    car.dataset.side = String(r.side); car.dataset.kind = r.kind; car.dataset.value = r.value;
    car.style.opacity = '1';
    el.dataset.round = String(round);
    if (ctx.refresh) ctx.refresh();
    locked = true;
    if (!W || reduced()) { locked = false; return; }
    animate(car, [{ transform: `translateX(${-Math.round(W * 0.7)}px)` }, { transform: 'translateX(0)' }], { duration: ROLL_MS, easing: 'cubic-bezier(.25,.8,.35,1)' });
    T.later(() => { if (mine === serial) locked = false; }, ROLL_MS);
  }
  function choose(i) {
    if (done || locked) return;
    const r = rounds[round];
    if (i !== r.side) { // wrong: a gentle bounce back, nothing counted
      locked = true;
      const { dx, dy } = toward(i, 0.3);
      animate(car, [{ transform: 'translate(0,0)' }, { transform: `translate(${dx}px,${dy}px) scale(.96)`, offset: 0.4 }, { transform: 'translate(0,0)' }], { duration: BACK_MS, easing: 'ease-in-out' });
      T.later(() => { locked = false; }, reduced() ? 0 : BACK_MS);
      return;
    }
    locked = true;
    const { dx, dy } = toward(i, 1);
    car.style.opacity = '0';
    animate(car, [{ transform: 'translate(0,0) scale(1)', opacity: 1 }, { transform: `translate(${dx}px,${dy}px) scale(.4)`, opacity: 0.2 }], { duration: GO_MS, easing: 'cubic-bezier(.5,0,.8,.6)' });
    T.later(() => puff(i), reduced() ? 0 : GO_MS * 0.7);
    sfx.play('pop', { step: round });
    stars.fill(round);
    round++;
    el.dataset.round = String(round);
    if (round < rounds.length) { T.later(newRound, GO_MS + 150); return; }
    done = true; hints.stop();
    T.later(() => { sfx.play('toot'); T.later(() => { sfx.play('win'); el.dataset.state = 'done'; ctx.setDone(true); }, reduced() ? 0 : 500); }, GO_MS + 100);
  }
  // A swipe on the car toward a tunnel counts as tapping that tunnel.
  car.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY }; try { car.setPointerCapture(e.pointerId); } catch { /* a touch is enough */ } });
  car.addEventListener('pointerup', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag = null;
    if (Math.hypot(dx, dy) >= SWIPE && Math.abs(dx) > 6) choose(dx < 0 ? 0 : 1);
  });
  car.addEventListener('pointercancel', () => { drag = null; });

  const stop = watchSize(scene, (w, hgt) => { const first = !W; W = w; scene.style.setProperty('--ch', Math.round(hgt * 0.38) + 'px'); if (first) newRound(); });
  const hints = idleHints(scene, () => {
    if (locked || done) return;
    tunnels[rounds[round].side].animate([{ transform: 'scale(1)' }, { transform: 'scale(1.06)', offset: 0.5 }, { transform: 'scale(1)' }], { duration: 500, iterations: 2, easing: 'ease-in-out' });
  });
  function again() { T.clear(); hints.arm(); rounds = tunnelRounds(ck); round = 0; done = false; el.dataset.state = 'playing'; stars.reset(); scene.querySelectorAll('.steam-puff').forEach((p) => p.remove()); newRound(); }

  const [a, b] = ck.pair.map((k) => soundPhrase(ctx.curriculum.sounds[k]));
  const which = ck.sides[1].signText ? `the word ${ck.pair[0]}-` : ck.mode === 'vowel' ? 'the middle sound' : 'the first sound';
  const prompt = [{ tts: 'Which tunnel is it for?' }];
  return {
    el, flush: true,
    parts: () => prompt,
    gist: () => 'Which tunnel is it for?', // one wording in every round
    script: () => `Say: 'Which tunnel does the car go in?' Your child looks at the letter or word on the car, says it, and listens for ${ck.sides[1].signText ? 'the breath sound ' + a : 'the sound'}. Then your child taps the tunnel, or slides the car to it. ${ck.sides[1].signText ? '' : `Listen for ${which}: ${a} or ${b}. `}If the car rolls back, say both sounds slowly together and try again.${ck.hint ? ' ' + ck.hint : ''}`,
    again: () => { again(); speech.say(prompt); },
    cleanup: () => { T.clear(); hints.stop(); stop(); },
  };
}
