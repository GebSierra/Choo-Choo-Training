// "Did you know?": a calm, non-blocking tip card for the grown-up (data/tips.json). It fades in, and closes on a tap or
// after `ms` (one setTimeout, then a CSS opacity fade; no loop). The card is the only part that takes touches, so
// whatever is under it stays usable. Returns { el, close }.
import { h, icon, reduced } from '../dom.js';
import { pipSvg } from '../art/pip.js';

export const TIP_MS = 4500, TIP_FADE_MS = 300;

export function tipCard({ host, tip, title = 'Did you know?', onClose, ms = TIP_MS }) {
  let closed = false, timer = 0;
  const still = reduced();
  const el = h('div', { class: 'tip-card' + (still ? ' still' : ''), role: 'status', dataset: { tip: String(tip.id) } },
    h('div', { class: 'tip-pip', 'aria-hidden': 'true' }, pipSvg({ pose: 'point', still: true })),
    h('div', { class: 'tip-body' }, h('strong', { class: 'tip-title' }, title), h('p', { class: 'tip-text' }, tip.text)),
    h('button', { class: 'tip-close', type: 'button', 'aria-label': 'Close the tip', onclick: (e) => { e.stopPropagation(); close(); } }, icon('close', 22)));
  function close() {
    if (closed) return;
    closed = true; clearTimeout(timer);
    el.classList.add('closing');
    setTimeout(() => { el.remove(); if (onClose) onClose(); }, still ? 0 : TIP_FADE_MS);
  }
  el.addEventListener('click', close);
  host.append(el);
  // The fade in is a CSS transition (under reduced motion it is simply shown).
  void el.offsetWidth; // flush the starting style, so the transition runs
  el.classList.add('in');
  timer = setTimeout(close, ms);
  return { el, close };
}

// The next tip: tips show in order, none twice until all have shown, then the cycle starts again (never the same tip twice
// in a row). Which have shown is kept in the settings (store.setSetting), never in browser storage directly.
export function nextTip(store, tips) {
  if (!tips || !tips.length) return null;
  const ids = tips.map((t) => t.id);
  let seen = Array.isArray(store.settings.tipsSeen) ? store.settings.tipsSeen.filter((id) => ids.includes(id)) : [];
  let pick = tips.find((t) => !seen.includes(t.id));
  if (!pick) {
    const last = seen[seen.length - 1];
    seen = [];
    pick = tips.find((t) => t.id !== last) || tips[0];
  }
  store.setSetting('tipsSeen', [...seen, pick.id]);
  return pick;
}

export async function loadTips() {
  try {
    const res = await fetch('data/tips.json');
    if (!res.ok) throw new Error(res.status);
    const tips = await res.json();
    return Array.isArray(tips) ? tips : [];
  } catch { return []; }
}
