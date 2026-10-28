import { h, animate, icon } from '../dom.js';
import { glyphSvg } from '../glyphs.js';
import { stopIcon } from '../art/train2d.js';
import { lessonByNumber } from '../lessons.js';
import { accentOf } from '../theme.js';
import { sfx } from '../sfx.js';
import { pipSvg } from '../art/pip.js';
import { kidSvg } from '../art/kid.js';
import { keepsakeButton, keepsakeStory } from '../components/keepsake.js';
import { rideAgainCard } from '../components/ride-again.js';
import { lastReviewIn, worldDone } from '../worlds.js';

// A warm, short celebration (polish B): the letter on a little wagon ticket, a gold star, one burst of confetti that settles
// and stays (CSS only, finite; reduced motion shows the settled picture), and the two figures cheering. The parent still
// decides whether the child got it.
// Taps are ignored for the first 1.5 s, so a child cannot move on by accident. Two buttons only: "Yes, go on" records "got it"
// (onContinue) with one tap and goes to the railway by itself after LESSON_RETURN_MS (lessons and checkpoints alike);
// "Not yet, back to the path" records practice-again (best result kept) and goes to the railway at once.
// 22 pieces, each with its resting place around the wagon (--tx/--ty from its centre, --r turn), a colour, a shape and a delay.
const CONFETTI = ['#E5484D', '#FFD166', '#5FE3B0', '#5DE0F0', '#5A4BD6', '#F0556A'];
export function confetti() {
  const box = h('span', { class: 'confetti', 'aria-hidden': 'true' });
  for (let i = 0; i < 22; i++) {
    const a = -Math.PI * 1.1 + (i / 21) * Math.PI * 1.2, k = (i * 37) % 10 / 10; // along an arch over the wagon and down both sides
    const tx = Math.round(Math.cos(a) * (158 + k * 40)), ty = Math.round(Math.sin(a) * (122 + (1 - k) * 46) - 6);
    box.append(h('i', { class: i % 3 === 0 ? 'dot' : i % 3 === 1 ? 'bar' : 'tri', style: { '--tx': tx + 'px', '--ty': ty + 'px', '--r': ((i * 83) % 360) + 'deg', '--c': CONFETTI[i % CONFETTI.length], '--d': (i % 7) * 45 + 'ms' } }));
  }
  return box;
}
// After "Yes, go on" on a lesson, the short success moment before the railway opens by itself.
export const LESSON_RETURN_MS = 1200;
const STAR_PATH = 'M12 2.4l2.8 6 6.5.7-4.9 4.4 1.4 6.4L12 16.6 6.2 19.9l1.4-6.4L2.7 9.1l6.5-.7z';
const goldStar = () => h('span', { class: 'finish-star', 'aria-hidden': 'true' }, h('svg', { viewBox: '0 0 24 24', width: 56, height: 56 }, h('path', { d: STAR_PATH, fill: '#FFD166', stroke: '#E8A93A', 'stroke-width': 1.4, 'stroke-linejoin': 'round' })));

function finishView({ speech, router, character, heading, badge, accent, onContinue, onPractice, returnMs = LESSON_RETURN_MS, extra = null }) {
  let goTimer = 0, left = false; // one tap on either button is final
  const gotIt = h('button', { class: 'btn big got', type: 'button', disabled: true, onclick: () => {
    if (left) return;
    left = true; sfx.play('unlock'); onContinue();
    // The grown-up needs no extra tap: after a short success moment the railway opens by itself, where the child's figure
    // boards the train and rides to the next station (the reward; js/sequence.js).
    for (const b of [gotIt, again]) b.disabled = true;
    goTimer = setTimeout(() => router.go('/home'), returnMs);
  } }, icon('check', 24), h('span', {}, 'Yes, go on'));
  // "Not yet" records practice-again (only when not done yet; onPractice keeps the best result) and opens the railway, where any station can be picked to redo.
  const again = h('button', { class: 'btn big ghost practice', type: 'button', disabled: true, onclick: () => {
    if (left) return;
    left = true;
    for (const b of [gotIt, again]) b.disabled = true;
    onPractice();
    router.go('/home');
  } }, icon('redo', 22), 'Not yet, back to the path');
  const ring = h('span', { class: 'finish-ring', style: { '--accent': accent } });
  const root = h('div', { class: 'finish' },
    h('div', { class: 'finish-glyph', style: { '--accent': accent } }, confetti(), ring, h('span', { class: 'finish-chassis', 'aria-hidden': 'true' }, h('i', { class: 'fw-wheel' }), h('i', { class: 'fw-wheel' })), h('span', { class: 'finish-wagon' }, badge), goldStar(), h('span', { class: 'finish-pip' }, pipSvg({ pose: 'cheer' })), h('span', { class: 'finish-kid', 'aria-hidden': 'true' }, kidSvg({ ...character, pose: 'cheer' }))),
    h('h1', {}, heading),
    extra,
    h('section', { class: 'finish-card' }, h('p', { class: 'finish-for' }, 'For the grown-up'), h('p', { class: 'finish-q' }, 'Did your child get it?'), h('div', { class: 'finish-choices' }, gotIt, again)));
  animate(badge, [{ transform: 'scale(.4)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: 480, easing: 'cubic-bezier(.34,1.56,.64,1)' });
  animate(ring, [{ transform: 'scale(.8)', opacity: 0 }, { transform: 'scale(.9)', opacity: .7, offset: .2 }, { transform: 'scale(1.5)', opacity: 0 }], { duration: 560, delay: 420, easing: 'cubic-bezier(.2,.8,.2,1)' });
  // The voice says "Good job." first; the jingle waits for it to finish (see sfx.js).
  const t = setTimeout(() => { speech.autoSay([{ tts: 'Good job.' }]); sfx.play('lesson'); }, 500);
  const ready = setTimeout(() => { for (const b of [gotIt, again]) b.disabled = false; }, 1500);
  root.cleanup = () => { clearTimeout(t); clearTimeout(ready); clearTimeout(goTimer); };
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
    onContinue: () => store.setResult(num, 'got-it'),
    onPractice: () => {
      if (!store.isDone(num)) store.setResult(num, 'practice-again'); // keep the best result
    },
  });
}

// The same two-step finish for a checkpoint (the sound sack): "Yes" goes back to the path, where its stone shows a tick.
// The end of a Review Stop (owner): how many sounds, example words, and W, the number of words of data/words-decodable.json that use only the
// letters taught so far (counted by tools/gen-lessons.mjs, stored on the stop as `summary`). "Read", never "pronounce".
export const reviewMessageText = (s) => `Your child has learned ${s.sounds} sounds${s.blends ? ` and ${s.blends} blends` : ''}. Words made only from these sounds include: ${s.examples.join(', ')}. That's ${s.words} words in all.` + (s.hearts && s.hearts.length ? ` Heart words learned so far, counted apart: ${s.hearts.join(', ')}.` : '');
const reviewMessage = (s) => h('p', { class: 'review-message' }, reviewMessageText(s));

// The end of a story: a grown-up's "Save this moment" button (a picture made on this device; nothing is uploaded).
const storyKeepsake = (store, ck) => keepsakeButton({ filename: 'story.png', options: async () => {
  const ch = store.character() || {};
  let title = ck.title;
  try { const { loadBook } = await import('./book.js'); title = (await loadBook(ck, store)).title || title; } catch { /* the stop's own name is used */ }
  return { headline: keepsakeStory(ch.name), word: title, date: new Date(), character: ch };
} });

export function checkpointFinishScreen({ store, router, curriculum, speech }, id) {
  const rv = (curriculum.checkpoints || []).find((c) => c.id === id);
  // The end of World 1 (its last lesson done, and this is its last Review Stop): offer the grown-up a ride again from the first letter.
  const ride = rv && rv.kind === 'review' && rv.world === 'W1' && lastReviewIn(curriculum, 'W1')?.id === rv.id && worldDone(store, curriculum, 'W1') && !store.lapActive() ? rideAgainCard({ store, curriculum, router, before: () => store.setCheckpointResult(rv.id, 'got-it') }) : null;
  const ck = (curriculum.checkpoints || []).find((c) => c.id === id);
  if (!ck || !store.isCheckpointUnlocked(ck)) { queueMicrotask(() => router.replace('/home')); return h('div'); }
  return finishView({
    speech, router, character: store.character(),
    heading: ck.kind === 'book' ? "That's the end of the story." : ck.kind === 'reread' ? 'You read it again!' : ck.kind === 'contrast' ? 'Tricky Sounds, done!' : `That's the ${ck.title.toLowerCase()}.`,
    badge: stopIcon(ck),
    accent: ck.kind === 'book' ? '#E5484D' : ck.kind === 'reread' ? '#3E9C8B' : ck.kind === 'review' ? '#5A8FE0' : ck.kind === 'contrast' ? '#7B61D6' : '#C99A5B', // a book's red cover, a teal reading book, a blue ticket, a crate's wood
    extra: ck.kind === 'contrast' ? h('p', { class: 'review-message' }, ck.end) : ck.kind === 'review' && ck.summary ? h('div', { class: 'finish-extras' }, reviewMessage(ck.summary), ride) : ride ? ride : ck.kind === 'book' ? storyKeepsake(store, ck) : null,
    onContinue: () => store.setCheckpointResult(ck.id, 'got-it'),
    onPractice: () => {
      if (!store.isCheckpointDone(ck)) store.setCheckpointResult(ck.id, 'practice-again'); // keep the best result
    },
  });
}
