// Tiny DOM helper. Content goes in through textContent only, never innerHTML.
const SVG_NS = 'http://www.w3.org/2000/svg';

export function h(tag, attrs, ...children) {
  const svg = ['svg', 'path', 'circle', 'g', 'rect', 'line', 'defs', 'linearGradient', 'stop', 'ellipse', 'polyline', 'text', 'polygon', 'clipPath'].includes(tag);
  const el = svg ? document.createElementNS(SVG_NS, tag) : document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.setAttribute('class', v);
    else if (k === 'style' && typeof v === 'object') { for (const [p, val] of Object.entries(v)) { if (p.startsWith('--')) el.style.setProperty(p, val); else el.style[p] = val; } }
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  append(el, children);
  return el;
}

function append(el, children) {
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
}

export const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// Web Animations wrapper that respects reduced motion (resolves immediately).
export function animate(el, keyframes, opts) {
  if (!el || !el.animate) return { finished: Promise.resolve(), cancel() {} };
  if (reduced()) opts = { ...opts, duration: 0, delay: 0, iterations: 1 };
  const a = el.animate(keyframes, { fill: 'backwards', easing: 'cubic-bezier(.2,.8,.2,1)', ...opts });
  return a;
}

export function icon(name, size = 24) {
  const paths = {
    back: 'M15 5l-7 7 7 7',
    chevronUp: 'M6 15l6-6 6 6',
    chevronDown: 'M6 9l6 6 6-6',
    speaker: 'M4 9v6h4l5 4V5L8 9H4z M16.5 8.5a5 5 0 010 7 M19 6a8.5 8.5 0 010 12',
    adult: 'M12 4a3 3 0 100 6 3 3 0 000-6z M5 20c0-4 3-6 7-6s7 2 7 6',
    check: 'M5 12.5l4.5 4.5L19 7.5',
    lock: 'M7 11V8a5 5 0 0110 0v3 M6 11h12v9H6z',
    slider: 'M4 8h9 M17 8h3 M4 16h3 M11 16h9 M15 5v6 M9 13v6',
    close: 'M6 6l12 12 M18 6L6 18',
    arrowRight: 'M5 12h14 M13 6l6 6-6 6',
    redo: 'M20 12a8 8 0 11-3-6.2 M20 4v5h-5',
    eraser: 'M4 15l8-9 8 8-5 5H8z M9 10l7 7',
    play: 'M8 5l11 7-11 7z',
    tap: 'M9 11V5a2 2 0 014 0v6 M13 10.5a2 2 0 014 0V12 M17 11.5a2 2 0 014 0V15a6 6 0 01-6 6h-2a6 6 0 01-5-3l-3-5a2 2 0 013-2l2 2',
    external: 'M14 4h6v6 M20 4l-9 9 M18 14v5H5V6h5',
    expand: 'M4 9V4h5 M20 9V4h-5 M4 15v5h5 M20 15v5h-5',
    shrink: 'M9 4v5H4 M15 4v5h5 M9 20v-5H4 M15 20v-5h5',
  };
  const svg = h('svg', { viewBox: '0 0 24 24', width: size, height: size, fill: 'none', stroke: 'currentColor', 'stroke-width': name === 'back' ? 3 : 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', class: 'icon' });
  for (const d of paths[name].split(' M').map((s, i) => (i ? 'M' + s : s))) svg.append(h('path', { d }));
  return svg;
}
