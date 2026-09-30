import { h, animate, icon } from '../dom.js';
import { glyphSvg } from '../glyphs.js';
import { lessonByNumber } from '../lessons.js';
import { accentOf } from '../theme.js';

// Calm finish: no confetti. The parent decides whether the child got it.
// Taps are ignored for the first 1.5 s, and "Yes" takes two taps, so a child cannot move on by accident.
export function finishScreen({ store, router, curriculum, speech }, n) {
  const lesson = lessonByNumber(curriculum, n);
  if (!lesson || !store.isUnlocked(lesson.number)) { queueMicrotask(() => router.replace('/home')); return h('div'); }
  const accent = accentOf(lesson.sound);
  const num = lesson.number;
  const last = num >= curriculum.lessons.length;
  const note = h('p', { class: 'finish-note', 'aria-live': 'polite' });
  let armed = false; // the first "Yes" tap has been made
  const yesLabel = () => (!armed ? 'Yes, go on' : last ? 'Yes, back to path' : `Yes, open lesson ${num + 1}`);
  const gotIt = h('button', { class: 'btn big got', type: 'button', disabled: true, onclick: () => {
    if (armed) { router.go(last ? '/home' : `/lesson/${num + 1}`); return; }
    armed = true;
    store.setResult(num, 'got-it');
    note.textContent = last ? 'You finished all three lessons.' : `Lesson ${num + 1} is ready.`;
    gotIt.classList.add('chosen');
    label.textContent = yesLabel();
  } });
  const label = h('span', {}, yesLabel());
  gotIt.append(icon('check', 24), label);
  const again = h('button', { class: 'btn big ghost practice', type: 'button', disabled: true, onclick: () => {
    if (store.lesson(num).result !== 'got-it') store.setResult(num, 'practice-again'); // keep the best result
    store.resetLessonTasks(num);
    note.textContent = `We'll do lesson ${num} again next time.`;
    router.go(`/lesson/${num}`);
  } }, icon('redo', 22), 'Not yet, practice again');
  const back = h('button', { class: 'btn secondary back-path', type: 'button', disabled: true, onclick: () => router.go('/home') }, 'Back to path');
  const g = glyphSvg(lesson.sound, { color: accent, label: 'lesson letter' });
  const ring = h('span', { class: 'finish-ring', style: { '--accent': accent } });
  const badge = h('div', { class: 'finish-glyph' }, ring, g);
  const root = h('div', { class: 'finish' },
    badge,
    h('h1', {}, `That's lesson ${num}.`),
    h('section', { class: 'finish-card' }, h('p', { class: 'finish-q' }, 'Did your child get it?'), h('div', { class: 'finish-choices' }, gotIt, again), note),
    back);
  animate(g, [{ transform: 'scale(.4)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: 480, easing: 'cubic-bezier(.34,1.56,.64,1)' });
  animate(ring, [{ transform: 'scale(.8)', opacity: 0 }, { transform: 'scale(.9)', opacity: .7, offset: .2 }, { transform: 'scale(1.5)', opacity: 0 }], { duration: 900, delay: 420, easing: 'cubic-bezier(.2,.8,.2,1)' });
  const t = setTimeout(() => speech.autoSay([{ tts: 'Good job.' }]), 500);
  const ready = setTimeout(() => { for (const b of [gotIt, again, back]) b.disabled = false; }, 1500);
  root.cleanup = () => { clearTimeout(t); clearTimeout(ready); };
  return root;
}
