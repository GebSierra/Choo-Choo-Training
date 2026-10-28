// "Ride again from the first letter": the grown-up's choice after World 1, shown on the last Review Stop's finish screen and in Grown-ups.
// It starts the next ride at Lesson 1 (never the placement check), erases nothing, and asks for a confirm first. The grown-up can still go on
// to World 2 at any time. The store holds the ride (store.rideAgain); a station finished again on the ride gets a star (js/store.js).
import { h, icon } from '../dom.js';
import { lessonsIn, worldComplete } from '../worlds.js';

export const RIDE_WORLD = 'W1';

// before: runs just before the ride starts (the finish screen saves the Review Stop). enabled: false shows the choice greyed out with its reason.
export function rideAgainCard({ store, curriculum, router, before = null, enabled = true, className = '' }) {
  const lessons = lessonsIn(curriculum, RIDE_WORLD);
  const last = lessons.length ? lessons[lessons.length - 1].number : 0;
  const root = h('section', { class: 'ride-card ' + className, 'aria-label': 'Ride again', dataset: { ride: String(store.ride) } });
  let confirming = false;
  const go = () => { if (before) before(); store.rideAgain(last); router.go('/home'); };
  function paint() {
    if (store.lapActive()) {
      const done = lessons.filter((l) => (store.lesson(l.number).redone || 0) >= store.ride).length;
      root.replaceChildren(
        h('h3', {}, `Ride ${store.ride} is under way`),
        h('p', { class: 'ride-note' }, `${done} of ${lessons.length} stations finished again. Each one gets a star. You can go on to World 2 at any time.`),
        h('button', { class: 'btn secondary ride-btn ride-onward', type: 'button', onclick: () => { store.endRide(); paint(); } }, 'Go on to World 2 now'));
      return;
    }
    if (confirming) {
      root.replaceChildren(
        h('h3', {}, 'Start again from Lesson 1?'),
        h('p', { class: 'ride-note' }, "Nothing is erased. Your child's results stay, and each station finished again gets a star. You can go on to World 2 at any time."),
        h('div', { class: 'ride-actions', role: 'alertdialog', 'aria-label': 'Confirm ride again' },
          h('button', { class: 'btn ghost ride-btn ride-cancel', type: 'button', onclick: () => { confirming = false; paint(); } }, 'Not now'),
          h('button', { class: 'btn ride-btn ride-yes', type: 'button', onclick: go }, 'Yes, ride again')));
      return;
    }
    root.replaceChildren(
      h('h3', {}, icon('redo', 22), ' Ride again?'),
      h('p', { class: 'ride-note' }, enabled ? 'Your child finished World 1. Ride the train again from the first letter for more practice. Nothing is erased.' : 'Available after your child finishes World 1 and its Review Stop.'),
      h('button', { class: 'btn ride-btn ride-start', type: 'button', disabled: !enabled, onclick: () => { confirming = true; paint(); } }, 'Ride again from the first letter'));
  }
  paint();
  return root;
}

export const rideReady = (store, curriculum) => worldComplete(store, curriculum, RIDE_WORLD);
