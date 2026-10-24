import { h, reduced, icon } from '../../dom.js';
import { huntBackdrop } from '../../art/train2d.js';
import { glyphSvg } from '../../glyphs.js';
import { letterText } from '../../letters.js';
import { accentOf } from '../../theme.js';
import { picture } from '../../components/picture.js';
import { sayPrompt, saySound } from '../../components/say-sound.js';
import { timers, starRow, shake, idleHints } from '../../components/game-kit.js';
import { whichRounds } from '../../games-data.js';
import { fit } from '../../lessons.js';
import { soundText } from '../../scripts.js';
import { sfx } from '../../sfx.js';

const NEXT_MS = 950, FIRST_MS = 350;

// Which One? (Tricky Sounds, checkpoint kind contrast). Two ticket cards show a minimal pair (pin / pen), with a picture on each only when both words have a
// tile; otherwise the words alone, never a wrong picture. The grown-up's pill says "Say: pen" and the grown-up says it: the app plays a recorded word only when
// assets/audio/words/<word>.mp3 exists, and never uses text to speech for the word. The child taps the card they heard. A wrong card only shakes (the pill
// stays), a right one lights up and the next round comes. Six rounds, mixing both words of the pairs; stage 2 of x7 opens with the two letters (the sound).
export function build(ctx) {
  const { speech, curriculum } = ctx, ck = ctx.checkpoint;
  const T = timers();
  let rounds = whichRounds(ck), round = 0, locked = true, done = false, serial = 0;
  const prompt = sayPrompt();
  const hear = h('button', { class: 'say-hear which-hear', type: 'button', 'aria-label': 'Say it again', onclick: () => say(true) }, icon('speaker', 32));
  const stars = starRow(rounds.length);
  const cards = [0, 1].map((i) => {
    const b = h('button', { class: 'which-card', type: 'button' });
    b.addEventListener('click', () => choose(i));
    return b;
  });
  const scene = h('div', { class: 'farm which-scene' }, huntBackdrop());
  scene.append(prompt.el, hear, h('div', { class: 'which-row' }, cards));
  const el = h('div', { class: 'game which', dataset: { round: '0', state: 'playing' } }, scene, stars.el);

  const cur = () => rounds[Math.min(round, rounds.length - 1)];
  const lineOf = (r) => (r.kind === 'letter' ? null : `Say: ${r.word}`);
  async function say(again) {
    const mine = serial, r = cur();
    if (done && !again) return;
    if (r.kind === 'letter') { await saySound(ctx, r.cards[r.target].key, prompt, { stale: () => mine !== serial, play: !!again }); return; }
    prompt.show(lineOf(r), r.word);
    if (again && ctx.store.settings.playSounds) await speech.say([{ word: r.word }]); // a recording of the word if one exists, otherwise silence
  }
  function newRound() {
    const mine = ++serial, r = rounds[round];
    cards.forEach((b, i) => {
      const c = r.cards[i];
      b.replaceChildren(...(c.image ? [picture({ word: c.value, image: c.image })] : []), r.kind === 'letter' ? h('span', { class: 'which-glyph' }, glyphSvg(c.value, { color: accentOf(c.value), label: 'letter choice' })) : h('span', { class: 'which-word' }, letterText(c.value, { label: true, level: ck.after })));
      b.classList.remove('go');
      b.classList.toggle('has-pic', !!c.image);
      b.dataset.word = c.value; b.dataset.target = i === r.target ? '1' : '0';
      b.setAttribute('aria-label', r.kind === 'letter' ? 'letter choice' : c.value);
      b.disabled = false;
    });
    el.dataset.round = String(round);
    if (ctx.refresh) ctx.refresh();
    prompt.hide();
    locked = false;
    T.later(() => { if (mine === serial && !done) say(); }, FIRST_MS);
  }
  function choose(i) {
    if (done || locked) return;
    const r = rounds[round];
    if (i !== r.target) { shake(cards[i]); return; } // no penalty and no sound: the pill still shows what to say
    locked = true;
    cards[i].classList.add('go');
    sfx.play('pop', { step: round });
    stars.fill(round);
    round++;
    el.dataset.round = String(round);
    if (round < rounds.length) { T.later(newRound, NEXT_MS); return; }
    done = true; hints.stop();
    T.later(() => { sfx.play('win'); el.dataset.state = 'done'; ctx.setDone(true); }, NEXT_MS);
  }
  const hints = idleHints(scene, () => {
    if (locked || done) return;
    hear.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.18)', offset: 0.5 }, { transform: 'scale(1)' }], { duration: 500, iterations: 2, easing: 'ease-in-out' });
  });
  function again() { T.clear(); hints.arm(); rounds = whichRounds(ck); round = 0; done = false; el.dataset.state = 'playing'; stars.reset(); newRound(); }
  newRound();

  const spoken = (r) => (r.kind === 'letter' ? soundText(r.cards[r.target].key, curriculum.sounds) : r.word);
  return {
    el, flush: true,
    parts: () => [],
    gist: () => fit(`Say: ${spoken(cur())}. Which one?`, `Say: ${spoken(cur())}.`),
    script: () => `Say the ${cur().kind === 'letter' ? 'sound' : 'word'} shown at the top: ${spoken(cur())}. Say it clearly, without pointing. Your child taps the one they heard. If they tap the other one, say both ${cur().kind === 'letter' ? 'sounds' : 'words'} slowly side by side, then say it again.${ck.hint ? ' ' + ck.hint : ''}`,
    again: () => { again(); },
    cleanup: () => { T.clear(); hints.stop(); },
  };
}
