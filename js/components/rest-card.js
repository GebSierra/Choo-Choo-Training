// The pace limit's friendly card ("Great riding today!"), the moon badge a resting station wears, and the DEV pill.
// The card reuses the Grown-ups-only dialog styles (.grown-gate, .gg-card). "Open it anyway" is a hold button like the
// Grownups gate, and lets that one lesson open for the rest of today (store.allowToday).
import { h } from '../dom.js';
import { holdButton } from './hold-button.js';

export const REST_TITLE = 'Great riding today!';
export const REST_BODY = 'New stations open tomorrow. Short, daily practice helps reading stick.';

// A small static moon with a "z": one SVG, no animation.
export function moonBadge() {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 32 32'); svg.setAttribute('width', '26'); svg.setAttribute('height', '26'); svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = '<path d="M21 4.5a11.5 11.5 0 1 0 6.5 20.8A12.5 12.5 0 0 1 21 4.5z" fill="#FFD66B" stroke="#E0A93A" stroke-width="1.5" stroke-linejoin="round"/><path d="M19 10h5l-5 6h5" fill="none" stroke="#4C63F0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
  return h('span', { class: 'rest-badge', 'aria-hidden': 'true' }, svg);
}

// A small "DEV" pill for the Home top bar while developer mode is on; null otherwise.
export const devPill = (store) => (store.settings.dev === true ? h('span', { class: 'dev-pill', 'aria-label': 'Developer mode is on' }, 'DEV') : null);

// Opens the card over host. onOpenAnyway runs after the grown-up's hold (the lesson is allowed for today first).
export function restCard({ host, store, onOpenAnyway }) {
  if (host.querySelector('.rest-card')) return null;
  let back = null;
  const close = () => { hold.cleanup(); back.remove(); };
  const hold = holdButton({ label: 'Open it anyway', caption: 'Grown-up: hold', hint: 'Press and hold', className: 'rest-hold', onComplete: () => { store.allowToday(); close(); if (onOpenAnyway) onOpenAnyway(); } });
  const card = h('div', { class: 'gg-card rest-card', role: 'dialog', 'aria-modal': 'true', 'aria-label': REST_TITLE },
    h('div', { class: 'rest-moon', 'aria-hidden': 'true' }, moonBadge()),
    h('h2', { class: 'gg-title' }, REST_TITLE),
    h('p', { class: 'gg-ask' }, REST_BODY),
    h('button', { class: 'btn rest-replay', type: 'button', onclick: close }, 'Replay a station'),
    h('div', { class: 'rest-grown' }, hold));
  back = h('div', { class: 'grown-gate rest-gate', onclick: (e) => { if (e.target === back) close(); } }, card);
  host.append(back);
  return { el: back, close };
}

// Runs fn once root is on the page (a screen is built before the router attaches it); gives up after about a second.
export function whenShown(root, fn, tries = 20) {
  if (root.isConnected) fn();
  else if (tries > 0) setTimeout(() => whenShown(root, fn, tries - 1), 50);
}
