// Hash router with directional screen transitions.
import { h, animate, reduced } from './dom.js';
import { isNative } from './platform.js';

const depthOf = (path) => {
  if (path === '/home') return 0;
  if (/^\/(lesson\/\d+\/(task\/\d+|finish)|checkpoint\/[\w-]+\/finish|proto\/f\/task\/\d+)$/.test(path)) return 2;
  return 1;
};

export function createRouter(root, routes, ctx) {
  let current = null; // {path, el}
  let token = 0;

  const parse = () => (location.hash.replace(/^#/, '') || '/home');

  async function render() {
    const path = parse();
    const my = ++token;
    let match = null;
    for (const r of routes) {
      const m = path.match(r.re);
      if (m) { match = { r, params: m.slice(1) }; break; }
    }
    if (!match) { location.replace('#/home'); return; }
    if (ctx && ctx.speech) ctx.speech.cancel();
    // The screen being left stops its timers now, not once the next screen is built (Home may take a moment to load).
    if (current && current.cleanup) { const c = current.cleanup; current.cleanup = null; c(); }
    const next = document.createElement('div');
    next.className = 'screen';
    let el;
    try { el = await match.r.screen(ctx, ...match.params); } catch (e) { console.error(e); el = h('div', { class: 'retry-card' }, h('p', {}, 'Something went wrong.'), h('button', { class: 'btn', type: 'button', onclick: () => { location.hash = '#/home'; } }, 'Back to the path')); }
    if (my !== token) { if (el && el.cleanup) el.cleanup(); return; }
    next.append(el);
    const back = current ? depthOf(path) < depthOf(current.path) : false;
    const dir = back ? -1 : 1;
    const prev = current;
    current = { path, el: next, cleanup: el && el.cleanup };
    if (prev) {
      prev.el.classList.add('leaving');
      prev.el.setAttribute('inert', '');
      animate(prev.el, [{ opacity: 1, transform: 'translateX(0)' }, { opacity: 0, transform: `translateX(${-12 * dir}px)` }], { duration: 200, fill: 'forwards' }).finished.then(() => prev.el.remove()).catch(() => prev.el.remove());
      if (prev.cleanup) prev.cleanup();
    }
    root.append(next);
    window.scrollTo(0, 0);
    animate(next, [{ opacity: 0, transform: `translateX(${16 * dir}px)` }, { opacity: 1, transform: 'translateX(0)' }], { duration: reduced() ? 0 : 260, delay: prev ? 60 : 0 });
    next.dispatchEvent(new CustomEvent('screenshown', { bubbles: true }));
  }

  return {
    start() { addEventListener('hashchange', render); return render(); },
    // For redirects: replaces the history entry, so Back never returns to the screen that bounced.
    replace(path) { location.replace('#' + path); },
    go(path) { if (parse() === path) return render(); location.hash = '#' + path; },
    // Back always goes to the parent screen, so it is predictable and animates in reverse.
    back() {
      const p = parse();
      const m = p.match(/^\/lesson\/(\d+)\/(task\/\d+|finish)$/);
      this.go(m ? `/lesson/${m[1]}` : /^\/proto\/f\/task\/\d+$/.test(p) ? '/proto/f' : '/home');
    },
    get path() { return parse(); },
  };
}

// The Android back button inside a native wrapper: nothing on Home, otherwise the same as the in-app Back button.
export function watchBackButton(router) {
  const app = isNative && window.Capacitor.Plugins && window.Capacitor.Plugins.App;
  if (!app || typeof app.addListener !== 'function') return;
  app.addListener('backButton', () => { if (router.path !== '/home') router.back(); });
}
