import { h, animate, icon, reduced } from '../dom.js';
import { makeShell } from './shell.js';
import { sfx } from '../sfx.js';
import { starSvg } from '../art.js';
import { sparkle } from '../components/sparkle.js';
import { pipSvg } from '../art/pip.js';
import { kidSvg } from '../art/kid.js';
import { build as heartStep, wordTiles, PHASES, TIP } from './tasks/proto/heart.js';

// PROTOTYPE 5: a heart-word step for "the" (unit 2.3), at #/proto/heart, reached from Grownups > Previews ("Heart word: the").
// One task shell with five sub-steps (Meet it, Map it, Fix the word, Spell it, Find it; the shell's Next moves through them and
// its progress dots count them), then a small celebration at #/proto/heart/done. Not wired into the lessons; it writes nothing to
// progress. The child knows m a s i t p and the heart words a, I, is.
const backToGrownups = (ctx) => { ctx.gate = { openedAt: ctx.guOpenedAt || Date.now() }; ctx.router.go('/grownups'); };

export function protoHeart(ctx) {
  const { router, curriculum } = ctx;
  const shell = makeShell({ ctx, title: 'Heart word: the', color: 'sky', steps: PHASES.length, pos: 0, from: -1, isLast: false, soundKeys: Object.keys(curriculum.sounds), backLabel: 'Back to Grownups', stepNoun: 'Step',
    tip: TIP, tipKey: 'tip:proto-heart', autoOpen: true, seenKeys: ['proto-heart'] });
  const current = heartStep({ ...ctx, refresh: shell.refresh, setDone: shell.setDone, setPos: shell.setPos });
  const root = shell.mount(current, () => router.go('/proto/heart/done'));
  root.classList.add('proto-task'); // the title fits one line on a small phone
  return root;
}

export function protoHeartDone(ctx) {
  const { speech, store } = ctx;
  const tiles = wordTiles();
  const stars = h('div', { class: 'pf-stars', 'aria-hidden': 'true' }, [0, 1, 2].map(() => starSvg()));
  const word = h('div', { class: 'hw-done-row' }, h('span', { class: 'hw-done-kid', 'aria-hidden': 'true' }, kidSvg({ ...store.character(), pose: 'cheer' })), tiles.el, h('span', { class: 'hw-done-pip' }, pipSvg({ pose: 'cheer' })));
  const back = h('button', { class: 'btn big pf-back', type: 'button', onclick: () => { sfx.play('unlock'); backToGrownups(ctx); } }, 'Back to Grownups', icon('arrowRight', 24));
  const root = h('div', { class: 'proto-finish proto-heart-done', dataset: { step: 'celebrate' } }, word, h('h1', {}, 'You learned a heart word!'), stars, back);
  animate(tiles.el, [{ transform: 'scale(.5)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: 480, easing: 'cubic-bezier(.34,1.56,.64,1)' });
  [...stars.children].forEach((s, i) => animate(s, [{ transform: 'scale(.3)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: 360, delay: 500 + i * 160, easing: 'cubic-bezier(.34,1.56,.64,1)' }));
  const t = setTimeout(() => {
    speech.autoSay([{ tts: 'Good job.' }]); sfx.play('lesson');
    if (!reduced() && word.isConnected) { const g = word.getBoundingClientRect(), o = root.getBoundingClientRect(); sparkle(root, g.left - o.left + g.width / 2, g.top - o.top + g.height / 2, { count: 22, size: [14, 30], reach: [90, 170] }); }
  }, 500);
  root.cleanup = () => clearTimeout(t);
  return root;
}
