import { createStore } from './store.js';
import { createRouter } from './router.js';
import { homeScreen } from './screens/home.js';
import { lessonScreen } from './screens/lesson.js';
import { createSpeech } from './speech.js';
import { grownupsScreen } from './screens/grownups.js';
import { taskScreen } from './screens/task.js';
import { finishScreen, checkpointFinishScreen } from './screens/finish.js';
import { checkpointScreen } from './screens/checkpoint.js';

async function boot() {
  const root = document.getElementById('app');
  const store = createStore();
  let curriculum;
  try {
    const res = await fetch('data/curriculum.json');
    if (!res.ok) throw new Error(res.status);
    curriculum = await res.json();
  } catch (e) {
    const card = document.createElement('div');
    card.className = 'retry-card';
    const msg = document.createElement('p');
    msg.textContent = 'The lessons did not load. Check the connection and try again.';
    const btn = document.createElement('button');
    btn.className = 'btn'; btn.type = 'button'; btn.textContent = 'Try again';
    btn.addEventListener('click', () => location.reload());
    card.append(msg, btn);
    root.replaceChildren(card);
    return;
  }
  const speech = createSpeech({ store, curriculum });
  store.touch();
  const ctx = { store, curriculum, speech, router: null };
  // Browsers only allow speech after a completed tap, so the first pointerup (or click) unlocks it for this page session.
  for (const type of ['pointerup', 'click']) addEventListener(type, () => speech.unlock(), { capture: true });
  document.addEventListener('visibilitychange', () => { if (document.hidden) speech.cancel(); });
  const routes = [
    { re: /^\/home$/, screen: homeScreen },
    { re: /^\/lesson\/(\d+)$/, screen: lessonScreen },
    { re: /^\/lesson\/(\d+)\/task\/(\d+)$/, screen: taskScreen },
    { re: /^\/lesson\/(\d+)\/finish$/, screen: finishScreen },
    { re: /^\/checkpoint\/([\w-]+)$/, screen: checkpointScreen },
    { re: /^\/checkpoint\/([\w-]+)\/finish$/, screen: checkpointFinishScreen },
    { re: /^\/grownups$/, screen: grownupsScreen },
    // Debug routes for development and the smoke test. Loaded on demand and not precached by sw.js.
    { re: /^\/lab$/, screen: (...a) => import('./screens/lab.js').then((m) => m.labScreen(...a)) },
    { re: /^\/glyphs$/, screen: (...a) => import('./screens/glyphs-debug.js').then((m) => m.glyphsDebug(...a)) },
  ];
  ctx.router = createRouter(root, routes, ctx);
  await ctx.router.start();
  if ('serviceWorker' in navigator) {
    // A new service worker takes over: reload, but only when the parent next returns to Home, never mid-task.
    const hadController = !!navigator.serviceWorker.controller;
    let updated = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadController) updated = true; });
    addEventListener('hashchange', () => { if (updated && location.hash === '#/home') location.reload(); });
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}
boot();
