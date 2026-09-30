import { h, icon } from '../dom.js';

// Full screen on and off. Returns null where the browser cannot do it, so no dead button shows.
const canFullscreen = () => !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);
const isFull = () => !!(document.fullscreenElement || document.webkitFullscreenElement);

export function fullscreenButton({ label = false, className = '' } = {}) {
  if (!canFullscreen()) return null;
  const btn = h('button', { class: `fs-btn ${className}`.trim(), type: 'button' });
  const paint = () => {
    const full = isFull();
    btn.setAttribute('aria-label', full ? 'Leave full screen' : 'Full screen');
    btn.replaceChildren(icon(full ? 'shrink' : 'expand', 26), ...(label ? [h('span', {}, full ? 'Leave full screen' : 'Full screen')] : []));
  };
  const toggle = () => {
    const el = document.documentElement;
    if (isFull()) return (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    return (el.requestFullscreen || el.webkitRequestFullscreen).call(el, { navigationUI: 'hide' });
  };
  btn.addEventListener('click', () => { Promise.resolve(toggle()).catch(() => {}); });
  const onChange = () => { if (!btn.isConnected) { document.removeEventListener('fullscreenchange', onChange); return; } paint(); };
  document.addEventListener('fullscreenchange', onChange);
  paint();
  return btn;
}
