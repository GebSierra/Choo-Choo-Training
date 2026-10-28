import { h, animate, reduced, icon } from '../../dom.js';
import { huntBackdrop } from '../../art/train2d.js';
import { letterFace } from '../../components/letter-face.js';
import { sayPrompt } from '../../components/say-sound.js';
import { sparkle } from '../../components/sparkle.js';
import { timers, watchSize, starRow, shake } from '../../components/game-kit.js';
import { accentOf } from '../../theme.js';
import { fit } from '../../lessons.js';
import { sfx } from '../../sfx.js';
import { letterUnits } from '../../order.js';

const INK = '#1E2140';
const NEXT_MS = 1000;
const APART = 22; // how far the two chunks slide apart, in px

// Clap, Split, Glue (World 6, Endings Junction). A bigger word is a row of letter cars. The grown-up claps its beats; the child taps the gap where the word splits (between the
// two short words of a compound word, or between the two middle consonants of a two-beat word). The two chunks slide apart; "Glue" slides them back together and the word is
// whole again. A wrong gap only wobbles. The recording of the word plays only when the speaker is tapped. Nothing plays on its own.
export function build(ctx) {
  const { lesson, speech } = ctx;
  const items = (lesson.splits || []).slice(0, 4);
  const rounds = items.length;
  const T = timers();
  let round = 0, locked = true, done = false, W = 0, cars = [], cut = -1;

  const prompt = sayPrompt();
  const cur = () => items[Math.min(round, rounds - 1)];
  const unitsOf = (it) => letterUnits(it.word, lesson.number);
  // the unit index after which the word splits: the units of the first chunk
  const splitAt = (it) => { const u = unitsOf(it); let n = 0, at = 0; for (const x of u) { at += x.length; n++; if (at >= it.parts[0].length) break; } return n; };
  const hear = h('button', { class: 'say-hear board-hear', type: 'button', 'aria-label': 'Hear the word', onclick: () => speech.say([{ word: cur().word }]) }, icon('speaker', 26));
  const track = h('div', { class: 'chain-track split-track', role: 'group', 'aria-label': 'the word, in letter cars' });
  const glue = h('button', { class: 'btn primary big glue-btn off', type: 'button', disabled: true, 'aria-hidden': 'true', tabindex: '-1', onclick: () => doGlue() }, 'Glue it!');
  const showGlue = (on) => { glue.classList.toggle('off', !on); glue.disabled = !on; glue.setAttribute('aria-hidden', String(!on)); glue.tabIndex = on ? 0 : -1; };
  const wall = h('div', { class: 'station-wall', 'aria-hidden': 'true' });
  const platform = h('div', { class: 'station-platform', 'aria-hidden': 'true' });
  const stars = starRow(rounds);
  const scene = h('div', { class: 'farm board-scene chains-scene split-scene' }, huntBackdrop());
  const stack = h('div', { class: 'couple-stack' }, track, glue); // one column under the prompt: the word, then Glue
  scene.append(wall, platform, stack, prompt.el, hear);
  const el = h('div', { class: 'game board-game chains-game split-game', dataset: { round: '0', state: 'playing', word: '', step: 'split' } }, scene, stars.el);

  const sizeCars = () => {
    const n = Math.max(unitsOf(cur()).length, 1);
    scene.style.setProperty('--cw', Math.max(44, Math.min(60, Math.floor((W - 44 - 4 * (n - 1) - APART) / n))) + 'px');
  };
  const place = () => { const s = scene.getBoundingClientRect(), p = prompt.el.getBoundingClientRect(); if (s.height && p.height) scene.style.setProperty('--stack-top', Math.max(96, Math.round(p.bottom - s.top + 8)) + 'px'); };
  const stopWatching = watchSize(scene, (w) => { const first = !W; W = w; if (first) show(); sizeCars(); place(); placeGaps(); });

  // The gaps are real buttons, 48 px wide and as tall as a car, laid over the border between two cars.
  function placeGaps() {
    const bar = track.getBoundingClientRect();
    track.querySelectorAll('.split-gap').forEach((g) => {
      const i = Number(g.dataset.after), a = cars[i], b = cars[i + 1];
      if (!a || !b) return;
      const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect(), mid = (ra.right + rb.left) / 2 - bar.left;
      g.style.left = Math.round(mid - 24) + 'px'; g.style.top = Math.round(ra.top - bar.top) + 'px'; g.style.height = Math.round(ra.height) + 'px';
    });
  }

  function show() {
    const it = cur();
    sizeCars();
    el.dataset.word = it.word; el.dataset.round = String(round); el.dataset.step = 'split';
    cut = splitAt(it) - 1; // the gap after unit `cut`
    cars = unitsOf(it).map((u) => h('span', { class: 'chain-car', dataset: { letter: u } }, letterFace(u, INK)));
    const gaps = cars.slice(0, -1).map((_, i) => {
      const g = h('button', { class: 'split-gap', type: 'button', 'aria-label': 'split here', dataset: { after: String(i), right: i === cut ? '1' : '0' } });
      g.addEventListener('click', () => choose(g, i));
      return g;
    });
    track.replaceChildren(...cars, ...gaps);
    track.classList.remove('solved', 'apart');
    showGlue(false);
    prompt.show(`Say: ${it.word}. Clap the beats: ${it.parts.join('-')}.`);
    place();
    locked = false;
    if (ctx.refresh) ctx.refresh();
    T.later(placeGaps, 40); // once, after the cars are laid out; never a loop
  }

  function choose(g, i) {
    if (done || locked || el.dataset.step !== 'split') return;
    if (i !== cut) { shake(g.parentElement); return; }
    locked = true;
    const it = cur();
    el.dataset.step = 'glue';
    track.classList.add('apart');
    cars.forEach((c, k) => {
      c.classList.add(k <= cut ? 'chunk-a' : 'chunk-b');
      animate(c, [{ transform: 'translateX(0)' }, { transform: `translateX(${k <= cut ? -APART / 2 : APART / 2}px)` }], { duration: reduced() ? 1 : 360, fill: 'forwards', easing: 'ease-out' });
    });
    track.querySelectorAll('.split-gap').forEach((x) => { x.disabled = true; });
    sfx.play('pop', { step: round });
    prompt.show(`Say: ${it.parts.join(' ... ')}. Now glue them.`);
    showGlue(true);
    locked = false;
    if (ctx.refresh) ctx.refresh();
  }

  function doGlue() {
    if (done || locked || el.dataset.step !== 'glue') return;
    locked = true;
    const it = cur();
    el.dataset.step = 'done-round';
    cars.forEach((c, k) => animate(c, [{ transform: `translateX(${k <= cut ? -APART / 2 : APART / 2}px)` }, { transform: 'translateX(0)' }], { duration: reduced() ? 1 : 320, fill: 'forwards', easing: 'ease-in-out' }));
    showGlue(false);
    track.classList.add('solved');
    const o = scene.getBoundingClientRect(), r = track.getBoundingClientRect();
    sparkle(scene, r.left - o.left + r.width / 2, r.top - o.top + r.height / 2, { count: 11, size: [10, 20], reach: [34, 70] });
    cars.forEach((c) => { const f = c.querySelector('svg'); if (f) f.querySelectorAll('path.stroke').forEach((p) => p.setAttribute('stroke', accentOf(lesson.sound))); });
    sfx.play('pop', { step: round });
    stars.fill(round);
    prompt.show(`Say: ${it.word}!`);
    round++;
    if (round < rounds) { T.later(() => { locked = false; show(); }, NEXT_MS); return; }
    done = true;
    T.later(() => { el.dataset.state = 'done'; sfx.play('win'); ctx.setDone(true); }, NEXT_MS);
  }

  function again() {
    T.clear();
    round = 0; done = false; locked = false; el.dataset.state = 'playing';
    stars.reset();
    show();
  }

  const parts = [{ tts: 'Clap the beats. Where does the word split?' }];
  return {
    el, flush: true,
    parts: () => parts,
    gist: () => { const w = cur(); return fit(`Clap it: ${w.parts.join('-')}.`, `Clap: ${w.parts.join('-')}`, 'Clap, split, glue.'); },
    script: () => 'Say the word and clap its beats with your child: nap-kin has two. Your child taps the gap where the word splits: between the two short words of a compound word (sun | set), or between the two middle consonants (nap | kin). The two chunks slide apart. Read each chunk, then your child taps Glue and says the whole word. The recording of the word plays only when the speaker is tapped. A wrong gap only wobbles.',
    again: () => { again(); },
    cleanup: () => { T.clear(); stopWatching(); },
  };
}
