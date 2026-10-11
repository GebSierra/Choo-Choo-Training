import { h, animate, reduced, icon } from '../dom.js';
import { engineSvg, wagonSvg, stationSvg, huntBackdrop, puffEl, FUNNEL_TOP } from '../art/train2d.js';
import { pipSvg } from '../art/pip.js';
import { sparkle } from '../components/sparkle.js';
import { timers, watchSize } from '../components/game-kit.js';
import { fit } from '../lessons.js';
import { sfx } from '../sfx.js';

// Read It Again (checkpoint kind "reread", id r1): a repeated-reading station (docs/CURRICULUM.md, Therrien 2004).
// The grown-up reads a tiny story once, pointing to each word (phase "listen"); then the child reads it back one sentence
// at a time (phase "read"). The grown-up taps "Read it!" for each sentence the child has read and the train pulls one more
// wagon into view. "Again" starts the reading over. The story is ck.story (2 to 4 short sentences, taught letters only).
// The app never listens or records: the grown-up judges. Only CSS transforms and opacity move; nothing runs while idle.
const WAGON = [{ body: '#D65A4A', rib: '#B8463A' }, { body: '#E5A73A', rib: '#C58A22' }, { body: '#4FB286', rib: '#3A9470' }, { body: '#5A8FE0', rib: '#4474C0' }];
const STAR = 'M12 2.4l2.8 6 6.5.7-4.9 4.4 1.4 6.4L12 16.6 6.2 19.9l1.4-6.4L2.7 9.1l6.5-.7z';
const ENGINE_W = 68, WAGON_W = 46;

export function rereadBuild({ checkpoint, speech, refresh, setProgress, setDone }) {
  const story = checkpoint.story;
  const n = story.length;
  const T = timers();
  let phase = 'listen', read = 0, disposed = false;

  // ---- the scene: the train arrives one wagon at a time from the left edge ----
  const wagons = story.map((_, i) => {
    const art = wagonSvg(WAGON[i % WAGON.length]);
    art.append(h('path', { class: 'ra-star', d: STAR, transform: 'translate(76 55) scale(2)', fill: '#FFD166', stroke: '#E8A93A', 'stroke-width': 1, 'stroke-linejoin': 'round' }));
    return h('div', { class: 'ra-wagon', style: { width: WAGON_W + 'px' }, dataset: { n: String(i + 1) } }, art);
  });
  const engine = h('div', { class: 'ra-engine', style: { width: ENGINE_W + 'px' } }, engineSvg({ still: true }));
  // the first wagon is the one behind the engine, so the wagons are laid out last to first
  const train = h('div', { class: 'ra-train' }, ...[...wagons].reverse(), engine);
  const lane = h('div', { class: 'ra-lane' }, train);
  const goal = h('div', { class: 'hunt-goal ra-goal' }, h('span', { class: 'goal-glow', 'aria-hidden': 'true' }), stationSvg({ accent: '#5A8FE0' }));
  const scene = h('div', { class: 'farm ra-scene' }, huntBackdrop());
  scene.append(goal, lane);
  const seat = () => engine.querySelector('.pip-seat');
  const setPip = (pose) => { const s = seat(), old = s.firstChild, p = pipSvg({ pose, still: true }); for (const k of ['x', 'y', 'width', 'height']) p.setAttribute(k, old.getAttribute(k)); s.replaceChildren(p); };

  // The train stands with only its engine in view; each sentence read brings the next wagon in.
  const place = () => { train.style.transform = `translate3d(${10 - (n - read) * WAGON_W}px,0,0)`; };
  const light = () => wagons.forEach((w, i) => w.classList.toggle('on', i < read));

  // ---- the page: the sentences, big, with one "Read it!" for the grown-up under the current one ----
  const rows = story.map((text, i) => {
    const btn = h('button', { class: 'ra-read', type: 'button', 'aria-label': `Read it! Sentence ${i + 1}`, onclick: () => markRead(i) }, h('span', { class: 'ra-read-on' }, icon('check', 22), 'Read it!'), h('span', { class: 'ra-read-done', 'aria-hidden': 'true' }, icon('check', 26)));
    return { text, btn, el: h('li', { class: 'ra-row', dataset: { n: String(i + 1) } }, h('p', { class: 'ra-sentence' }, text), btn) };
  });
  const turn = h('button', { class: 'btn big ra-turn', type: 'button', onclick: () => startReading() }, 'Your child reads', icon('arrowRight', 22));
  const foot = h('div', { class: 'ra-foot' }, turn);
  const page = h('section', { class: 'ra-page', 'aria-label': 'The story' }, h('ol', { class: 'ra-list' }, rows.map((r) => r.el)), foot);
  const el = h('div', { class: 'game reread', dataset: { phase, read: '0', total: String(n), state: 'playing' } }, scene, page);

  function paint() {
    el.dataset.phase = phase; el.dataset.read = String(read);
    rows.forEach((r, i) => {
      const st = phase === 'listen' ? 'listen' : i < read ? 'done' : i === read ? 'now' : 'wait';
      r.el.dataset.state = st;
      r.btn.disabled = st !== 'now';
      r.btn.tabIndex = st === 'now' ? 0 : -1;
      r.btn.setAttribute('aria-label', st === 'done' ? `Sentence ${i + 1}, read` : `Read it! Sentence ${i + 1}`);
    });
    foot.hidden = phase !== 'listen';
    light(); place();
  }

  function startReading() {
    if (phase !== 'listen') return;
    phase = 'read'; paint(); refresh();
    speech.say([{ tts: 'Now you read it.' }]);
  }

  // One wheel turn, a puff of steam and a small hop of the engine: finite animations of transform and opacity only.
  function chug() {
    if (reduced() || disposed) return;
    engine.querySelectorAll('.wheel').forEach((w) => w.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }], { duration: 700, easing: 'cubic-bezier(.45,.05,.3,1)' }));
    engine.querySelector('.engine-body').animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-2px)' }], { duration: 117, iterations: 6, direction: 'alternate', easing: 'ease-in-out' });
    const r = engine.getBoundingClientRect(), o = scene.getBoundingClientRect();
    if (!r.width) return;
    const p = puffEl();
    Object.assign(p.style, { left: r.left - o.left + r.width * FUNNEL_TOP.x - 12 + 'px', top: r.top - o.top + r.height * FUNNEL_TOP.y - 14 + 'px' });
    scene.append(p);
    const a = p.animate([{ transform: 'translate(0,0) scale(.5)', opacity: 0.95 }, { transform: 'translate(-14px,-30px) scale(1)', opacity: 0.9, offset: 0.4 }, { transform: 'translate(-26px,-52px) scale(1.4)', opacity: 0 }], { duration: 1300, easing: 'ease-out', fill: 'forwards' });
    a.finished.then(() => p.remove()).catch(() => p.remove());
  }

  function markRead(i) {
    if (phase !== 'read' || i !== read || disposed) return;
    read++;
    setProgress(read);
    sfx.play('pop', { step: read - 1 });
    const w = wagons[i];
    if (!reduced()) animate(w, [{ transform: 'scale(.9)' }, { transform: 'scale(1.06)', offset: 0.55 }, { transform: 'scale(1)' }], { duration: 520, delay: 250, easing: 'ease-out' });
    chug();
    if (read < n) { paint(); refresh(); return; }
    phase = 'done';
    paint();
    setPip('wave');
    goal.classList.add('arrived', 'done');
    const o = scene.getBoundingClientRect(), g = goal.getBoundingClientRect();
    T.later(() => { if (disposed) return; sparkle(scene, g.left - o.left + g.width / 2, g.top - o.top + g.height * 0.4, { count: 14, size: [10, 22], reach: [40, 90] }); sfx.play('toot'); }, reduced() ? 0 : 500);
    T.later(() => { if (disposed) return; sfx.play('checkpoint'); setDone(true); }, reduced() ? 0 : 1300);
    refresh();
  }

  function again() {
    T.clear();
    phase = 'read'; read = 0;
    goal.classList.remove('arrived', 'done');
    setPip('idle'); setProgress(0); setDone(false);
    el.dataset.state = 'playing';
    paint();
  }

  const stopWatching = watchSize(scene, () => place());
  paint();

  return {
    el, flush: true,
    parts: () => [{ tts: phase === 'listen' ? 'Listen to your grown up read the story.' : phase === 'done' ? 'You read it!' : 'Now you read it.' }],
    script: () => (phase === 'listen'
      ? "Read the whole story to your child once, slowly, pointing to each word as you say it. Your child only listens. Then tap 'Your child reads'."
      : phase === 'done'
        ? "Well done. Reading the same story again makes it smoother. Tap Again for one more read, or Finish."
        : `Your child reads one sentence at a time: '${story[read]}' Let your child try first. If your child gets stuck, sound the word out together. Still stuck? Read the sentence yourself, then have your child read it after you. When the sentence is read, tap Read it!`),
    gist: () => (phase === 'listen' ? fit('Read the story once, then tap', 'Read it once, point to words') : phase === 'done' ? fit('Well done. Again, or Finish') : fit('Child reads. Then tap Read it!', 'Tap Read it! when read')),
    again: () => { again(); speech.say([{ tts: 'Now you read it.' }]); },
    cleanup: () => { disposed = true; T.clear(); stopWatching(); },
  };
}
