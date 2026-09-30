import { h, animate, icon } from '../dom.js';
import { glyphSvg } from '../glyphs.js';
import { sackSvg } from '../art.js';
import { lessonByNumber } from '../lessons.js';
import { accentOf } from '../theme.js';

// Calm finish: no confetti. The parent decides whether the child got it.
// Taps are ignored for the first 1.5 s, and "Yes" takes two taps, so a child cannot move on by accident.
// The first Yes tap only records the result and arms the button; the second goes on (onContinue).
function finishView({ speech, router, heading, badge, accent, armedLabel, armedNote, onArm, onContinue, onPractice }) {
  const note = h('p', { class: 'finish-note', 'aria-live': 'polite' });
  let armed = false; // the first "Yes" tap has been made
  const label = h('span', {}, 'Yes, go on');
  const gotIt = h('button', { class: 'btn big got', type: 'button', disabled: true, onclick: () => {
    if (armed) { onContinue(); return; }
    armed = true;
    onArm();
    note.textContent = armedNote;
    gotIt.classList.add('chosen');
    label.textContent = armedLabel;
  } });
  gotIt.append(icon('check', 24), label);
  const again = h('button', { class: 'btn big ghost practice', type: 'button', disabled: true, onclick: onPractice }, icon('redo', 22), 'Not yet, practice again');
  const back = h('button', { class: 'btn secondary back-path', type: 'button', disabled: true, onclick: () => router.go('/home') }, 'Back to path');
  const ring = h('span', { class: 'finish-ring', style: { '--accent': accent } });
  const root = h('div', { class: 'finish' },
    h('div', { class: 'finish-glyph' }, ring, badge),
    h('h1', {}, heading),
    h('section', { class: 'finish-card' }, h('p', { class: 'finish-q' }, 'Did your child get it?'), h('div', { class: 'finish-choices' }, gotIt, again), note),
    back);
  animate(badge, [{ transform: 'scale(.4)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: 480, easing: 'cubic-bezier(.34,1.56,.64,1)' });
  animate(ring, [{ transform: 'scale(.8)', opacity: 0 }, { transform: 'scale(.9)', opacity: .7, offset: .2 }, { transform: 'scale(1.5)', opacity: 0 }], { duration: 560, delay: 420, easing: 'cubic-bezier(.2,.8,.2,1)' });
  const t = setTimeout(() => speech.autoSay([{ tts: 'Good job.' }]), 500);
  const ready = setTimeout(() => { for (const b of [gotIt, again, back]) b.disabled = false; }, 1500);
  root.cleanup = () => { clearTimeout(t); clearTimeout(ready); };
  return root;
}

export function finishScreen({ store, router, curriculum, speech }, n) {
  const lesson = lessonByNumber(curriculum, n);
  if (!lesson || !store.isUnlocked(lesson.number)) { queueMicrotask(() => router.replace('/home')); return h('div'); }
  const num = lesson.number;
  const last = num >= curriculum.lessons.length;
  return finishView({
    speech, router,
    heading: `That's lesson ${num}.`,
    badge: glyphSvg(lesson.sound, { color: accentOf(lesson.sound), label: 'lesson letter' }),
    accent: accentOf(lesson.sound),
    armedLabel: last ? 'Yes, back to path' : `Yes, open lesson ${num + 1}`,
    armedNote: last ? 'You finished all three lessons.' : `Lesson ${num + 1} is ready.`,
    onArm: () => store.setResult(num, 'got-it'),
    onContinue: () => router.go(last ? '/home' : `/lesson/${num + 1}`),
    onPractice: () => {
      if (store.lesson(num).result !== 'got-it') store.setResult(num, 'practice-again'); // keep the best result
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
    speech, router,
    heading: `That's the ${ck.title.toLowerCase()}.`,
    badge: sackSvg(),
    accent: '#C99A5B',
    armedLabel: 'Yes, back to path',
    armedNote: 'The path has a tick on the sack.',
    onArm: () => store.setCheckpointResult(ck.id, 'got-it'),
    onContinue: () => router.go('/home'),
    onPractice: () => {
      if (store.checkpoint(ck.id).result !== 'got-it') store.setCheckpointResult(ck.id, 'practice-again'); // keep the best result
      router.go(`/checkpoint/${ck.id}`);
    },
  });
}
