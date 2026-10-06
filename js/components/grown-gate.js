import { h } from '../dom.js';

// A grown-up check before a link leaves the app: "tap the number seven". The target is a random word each time, so it cannot
// be memorised, and the buttons show digits. Resolves true on the right tap, false on a wrong tap or close.
const WORDS = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];

export function grownGate() {
  if (document.querySelector('.grown-gate')) return Promise.resolve(false);
  return new Promise((resolve) => {
    const target = 1 + Math.floor(Math.random() * 9);
    const pool = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((n) => n !== target).sort(() => Math.random() - 0.5);
    const count = 4 + Math.floor(Math.random() * 3); // 4 to 6 buttons
    const nums = [target, ...pool.slice(0, count - 1)].sort(() => Math.random() - 0.5);
    const prevFocus = document.activeElement;
    let closed = false;
    const finish = (ok) => {
      if (closed) return;
      closed = true;
      removeEventListener('keydown', onKey, true);
      back.remove();
      try { prevFocus && prevFocus.focus && prevFocus.focus(); } catch { /* the opener may be gone */ }
      resolve(ok);
    };
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); finish(false); } };
    const buttons = nums.map((n) => h('button', { class: 'gg-num', type: 'button', 'data-n': String(n), onclick: () => finish(n === target) }, String(n)));
    const card = h('div', { class: 'gg-card', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Grown-ups only', 'data-target': String(target) },
      h('h2', { class: 'gg-title' }, 'Grown-ups only'),
      h('p', { class: 'gg-ask' }, 'Tap the number ', h('strong', {}, WORDS[target - 1]), '.'),
      h('div', { class: 'gg-row' }, buttons),
      h('button', { class: 'btn ghost gg-cancel', type: 'button', onclick: () => finish(false) }, 'Cancel'));
    const back = h('div', { class: 'grown-gate', onclick: (e) => { if (e.target === back) finish(false); } }, card);
    document.body.append(back);
    addEventListener('keydown', onKey, true);
    buttons[0].focus();
  });
}

// Opens an outside link only after the check passes.
export async function openOutside(url) {
  if (await grownGate()) window.open(url, '_blank', 'noopener');
}
