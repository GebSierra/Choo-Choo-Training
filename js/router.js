// Hash router with directional screen transitions.
import { animate, reduced } from './dom.js';

const depthOf = (path) => {
  if (path === '/home') return 0;
  if (/^\/lesson\/\d+\/(task\/\d+|finish)$/.test(path)) return 2;
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
    const next = document.createElement('div');
    next.className = 'screen';
    let el;
    try { el = await match.r.screen(ctx, ...match.params); } catch (e) { console.error(e); el = document.createTextNode('Something went wrong.'); }
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
      this.go(m ? `/lesson/${m[1]}` : '/home');
    },
    get path() { return parse(); },
  };
}
