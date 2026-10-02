import { h, icon } from '../dom.js';

// The first-run card: a few short pages for the grown-up, one at a time. All pages sit in the same grid cell, so the
// card keeps one size and nothing jumps when the page changes. Nothing here is spoken.
export function welcomeCard({ pages, onDone }) {
  let i = 0;
  const els = pages.map((p, k) => h('section', { class: 'wc-page' + (k === 0 ? ' on' : ''), 'aria-hidden': String(k !== 0) }, h('h2', {}, p.title), ...p.body.map((t) => h('p', {}, t))));
  const dots = pages.map((_, k) => h('i', { class: 'wc-dot' + (k === 0 ? ' on' : '') }));
  const back = h('button', { class: 'wc-back', type: 'button', onclick: () => go(i - 1) }, 'Back');
  const nextText = h('span', {}, 'Next');
  const next = h('button', { class: 'btn primary wc-next', type: 'button', onclick: () => (i === pages.length - 1 ? onDone() : go(i + 1)) }, nextText);
  const skip = h('button', { class: 'wc-skip', type: 'button', onclick: onDone }, 'Skip');
  const go = (k) => {
    i = Math.max(0, Math.min(pages.length - 1, k));
    els.forEach((e, n) => { e.classList.toggle('on', n === i); e.setAttribute('aria-hidden', String(n !== i)); });
    dots.forEach((d, n) => d.classList.toggle('on', n === i));
    nextText.textContent = i === pages.length - 1 ? 'Start' : 'Next';
    back.style.visibility = i === 0 ? 'hidden' : 'visible';
    skip.style.visibility = i === pages.length - 1 ? 'hidden' : 'visible';
  };
  go(0);
  return h('div', { class: 'first-card welcome' },
    h('div', { class: 'adult-ic' }, icon('adult', 28)),
    h('div', { class: 'wc-pages', 'aria-live': 'polite' }, ...els),
    h('div', { class: 'wc-dots', 'aria-hidden': 'true' }, ...dots),
    h('div', { class: 'wc-actions' }, back, next),
    skip);
}
