import { h, animate, icon } from '../dom.js';
import { glyphSvg } from '../glyphs.js';
import { stopIcon } from '../art/train2d.js';
import { lessonByNumber } from '../lessons.js';
import { accentOf } from '../theme.js';
import { sfx } from '../sfx.js';
import { pipSvg } from '../art/pip.js';
import { kidSvg } from '../art/kid.js';

// A warm, short celebration (polish B): the letter on a little wagon ticket, a gold star, one burst of confetti that settles
// and stays (CSS only, finite; reduced motion shows the settled picture), and the two figures cheering. The parent still
// decides whether the child got it.
// Taps are ignored for the first 1.5 s, and "Yes" takes two taps, so a child cannot move on by accident.
// The first Yes tap only arms the button (and dims it for 1.5 s); the second records "got it" and goes back to the railway (onContinue).
// 22 pieces, each with its resting place around the wagon (--tx/--ty from its centre, --r turn), a colour, a shape and a delay.
const CONFETTI = ['#E5484D', '#FFD166', '#5FE3B0', '#5DE0F0', '#5A4BD6', '#F0556A'];
function confetti() {
  const box = h('span', { class: 'confetti', 'aria-hidden': 'true' });
  for (let i = 0; i < 22; i++) {
    const a = -Math.PI * 1.1 + (i / 21) * Math.PI * 1.2, k = (i * 37) % 10 / 10; // along an arch over the wagon and down both sides
    const tx = Math.round(Math.cos(a) * (158 + k * 40)), ty = Math.round(Math.sin(a) * (122 + (1 - k) * 46) - 6);
    box.append(h('i', { class: i % 3 === 0 ? 'dot' : i % 3 === 1 ? 'bar' : 'tri', style: { '--tx': tx + 'px', '--ty': ty + 'px', '--r': ((i * 83) % 360) + 'deg', '--c': CONFETTI[i % CONFETTI.length], '--d': (i % 7) * 45 + 'ms' } }));
  }
  return box;
}
const STAR_PATH = 'M12 2.4l2.8 6 6.5.7-4.9 4.4 1.4 6.4L12 16.6 6.2 19.9l1.4-6.4L2.7 9.1l6.5-.7z';
const goldStar = () => h('span', { class: 'finish-star', 'aria-hidden': 'true' }, h('svg', { viewBox: '0 0 24 24', width: 56, height: 56 }, h('path', { d: STAR_PATH, fill: '#FFD166', stroke: '#E8A93A', 'stroke-width': 1.4, 'stroke-linejoin': 'round' })));

function finishView({ speech, router, character, heading, badge, accent, armedLabel, armedNote, onContinue, onPractice }) {
  const note = h('p', { class: 'finish-note', 'aria-live': 'polite' });
  let armed = false, armTimer = 0; // the first "Yes" tap has been made
  const label = h('span', {}, 'Yes, go on');
  const gotIt = h('button', { class: 'btn big got', type: 'button', disabled: true, onclick: () => {
    if (armed) { sfx.play('unlock'); onContinue(); return; }
    armed = true;
    note.textContent = armedNote;
    gotIt.classList.add('chosen');
    label.textContent = armedLabel;
    gotIt.disabled = true;
    armTimer = setTimeout(() => { gotIt.disabled = false; }, 1500);
  } });
  gotIt.append(icon('check', 24), label);
  const again = h('button', { class: 'btn big ghost practice', type: 'button', disabled: true, onclick: onPractice }, icon('redo', 22), 'Not yet, practice again');
  const back = h('button', { class: 'btn secondary back-path', type: 'button', disabled: true, onclick: () => router.go('/home') }, 'Back to path');
  const ring = h('span', { class: 'finish-ring', style: { '--accent': accent } });
  const root = h('div', { class: 'finish' },
    h('div', { class: 'finish-glyph', style: { '--accent': accent } }, confetti(), ring, h('span', { class: 'finish-wagon' }, badge), goldStar(), h('span', { class: 'finish-pip' }, pipSvg({ pose: 'cheer' })), h('span', { class: 'finish-kid', 'aria-hidden': 'true' }, kidSvg({ ...character, pose: 'cheer' }))),
    h('h1', {}, heading),
    h('section', { class: 'finish-card' }, h('p', { class: 'finish-for' }, 'For the grown-up'), h('p', { class: 'finish-q' }, 'Did your child get it?'), h('div', { class: 'finish-choices' }, gotIt, again), note),
    back);
  animate(badge, [{ transform: 'scale(.4)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: 480, easing: 'cubic-bezier(.34,1.56,.64,1)' });
  animate(ring, [{ transform: 'scale(.8)', opacity: 0 }, { transform: 'scale(.9)', opacity: .7, offset: .2 }, { transform: 'scale(1.5)', opacity: 0 }], { duration: 560, delay: 420, easing: 'cubic-bezier(.2,.8,.2,1)' });
  // The voice says "Good job." first; the jingle waits for it to finish (see sfx.js).
  const t = setTimeout(() => { speech.autoSay([{ tts: 'Good job.' }]); sfx.play('lesson'); }, 500);
  const ready = setTimeout(() => { for (const b of [gotIt, again, back]) b.disabled = false; }, 1500);
  root.cleanup = () => { clearTimeout(t); clearTimeout(ready); clearTimeout(armTimer); };
  return root;
}

export function finishScreen({ store, router, curriculum, speech }, n) {
  const lesson = lessonByNumber(curriculum, n);
  if (!lesson || !store.isUnlocked(lesson.number)) { queueMicrotask(() => router.replace('/home')); return h('div'); }
  const num = lesson.number;
  return finishView({
    speech, router, character: store.character(),
    heading: `That's lesson ${num}.`,
    badge: glyphSvg(lesson.sound, { color: accentOf(lesson.sound), label: 'lesson letter' }),
    accent: accentOf(lesson.sound),
    // Yes goes back to the railway, where the station-complete sequence rides the train to the next stop (js/sequence.js).
    armedLabel: 'Yes, back to path',
    armedNote: 'Tap again to go back to the path.',
    onContinue: () => { store.setResult(num, 'got-it'); router.go('/home'); },
    onPractice: () => {
      if (!store.isDone(num)) store.setResult(num, 'practice-again'); // keep the best result
      store.resetLessonTasks(num);
      router.go(`/lesson/${num}`);
    },
  });
}

// The same two-step finish for a checkpoint (the sound sack): "Yes" goes back to the path, where its stone shows a tick.
export function checkpointFinishScreen({ store, router, curriculum, speech }, id) {
  const ck = (curriculum.checkpoints || []).find((c) => c.id === id);
  if (!ck || !store.isCheckpointUnlocked(ck)) { queueMicrotask(() => router.replace('/home')); return h('div'); }
  return finishView({
    speech, router, character: store.character(),
    heading: ck.kind === 'book' ? "That's the end of the story." : ck.kind === 'ride' ? 'Smooth ride!' : `That's the ${ck.title.toLowerCase()}.`,
    badge: stopIcon(ck),
    accent: ck.kind === 'book' ? '#E5484D' : ck.kind === 'ride' ? '#E5A73A' : '#C99A5B', // a book's red cover, a gauge's brass, a crate's wood
    armedLabel: 'Yes, back to path',
    armedNote: 'Tap again to go back to the path.',
    onContinue: () => { store.setCheckpointResult(ck.id, 'got-it'); router.go('/home'); },
    onPractice: () => {
      if (!store.isCheckpointDone(ck)) store.setCheckpointResult(ck.id, 'practice-again'); // keep the best result
      router.go(`/checkpoint/${ck.id}`);
    },
  });
}
