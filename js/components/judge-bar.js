import { h, icon } from '../dom.js';

// The grown-up is the judge (owner decision 6A): two big buttons under a reading item. "Got it" is the green tick; "Help"
// is soft and calm, never red, because the child must not feel judged. There is no speech recognition and no red cross.
//   const judge = judgeBar({ onGot, onHelp });  judge.el  judge.hide()  judge.show()
// The buttons ignore a second tap for 400 ms, so a quick double tap cannot judge two items.
export function judgeBar({ onGot, onHelp }) {
  let lock = false;
  const once = (fn) => () => { if (lock) return; lock = true; setTimeout(() => { lock = false; }, 400); fn(); };
  const got = h('button', { class: 'judge-btn got', type: 'button', onclick: once(onGot) }, icon('check', 28), h('span', {}, 'Got it'));
  const help = h('button', { class: 'judge-btn help', type: 'button', onclick: once(onHelp) }, h('span', {}, 'Help'));
  const el = h('div', { class: 'judge-bar', role: 'group', 'aria-label': 'For the grown-up: did your child read it?' },
    h('span', { class: 'judge-tag' }, 'For the grown-up'), got, help);
  return { el, hide() { el.hidden = true; }, show() { el.hidden = false; lock = false; }, get hidden() { return el.hidden; } };
}
