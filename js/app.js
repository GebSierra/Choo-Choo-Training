import { createStore } from './store.js';
import { createRouter, watchBackButton } from './router.js';
import { isNative } from './platform.js';
import { homeScreen } from './screens/home.js';
import { lessonScreen } from './screens/lesson.js';
import { createSpeech } from './speech.js';
import { sfx } from './sfx.js';
import { music } from './music.js';
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
  sfx.init({ store, speech });
  music.init({ store, speech, sfx });
  const ctx = { store, curriculum, speech, router: null };
  // Browsers only allow speech after a completed tap, so the first pointerup (or click) unlocks it for this page session.
  for (const type of ['pointerup', 'click']) addEventListener(type, () => { speech.unlock(); sfx.unlock(); music.unlock(); }, { capture: true });
  document.addEventListener('visibilitychange', () => { if (document.hidden) speech.cancel(); });
  const routes = [
    { re: /^\/home$/, screen: homeScreen },
    { re: /^\/lesson\/(\d+)$/, screen: lessonScreen },
    { re: /^\/lesson\/(\d+)\/task\/(\d+)$/, screen: taskScreen },
    { re: /^\/lesson\/(\d+)\/finish$/, screen: finishScreen },
    { re: /^\/checkpoint\/([\w-]+)$/, screen: checkpointScreen },
    { re: /^\/checkpoint\/([\w-]+)\/finish$/, screen: checkpointFinishScreen },
    { re: /^\/grownups$/, screen: grownupsScreen },
    // Prototype 2 previews (Grownups > Previews). Loaded on demand; nothing in the child's flow leads here.
    { re: /^\/preview\/tip$/, screen: (...a) => import('./screens/previews.js').then((m) => m.tipPreview(...a)) },
    { re: /^\/preview\/board$/, screen: (...a) => import('./screens/previews.js').then((m) => m.boardPreview(...a)) },
    { re: /^\/preview\/gateway$/, screen: (...a) => import('./screens/previews.js').then((m) => m.gatewayPreview(...a)) },
    // Prototype 4: one lesson in the new eight-step loop (Grownups > Previews). Loaded on demand; its files are precached.
    { re: /^\/proto\/f$/, screen: (...a) => import('./screens/proto-lesson.js').then((m) => m.protoIntro(...a)) },
    { re: /^\/proto\/f\/task\/(\d+)$/, screen: (...a) => import('./screens/proto-lesson.js').then((m) => m.protoTask(...a)) },
    // Debug routes for development and the smoke test. Loaded on demand and not precached by sw.js.
    { re: /^\/lab$/, screen: (...a) => import('./screens/lab.js').then((m) => m.labScreen(...a)) },
    { re: /^\/glyphs$/, screen: (...a) => import('./screens/glyphs-debug.js').then((m) => m.glyphsDebug(...a)) },
  ];
  ctx.router = createRouter(root, routes, ctx);
  await ctx.router.start();
  watchBackButton(ctx.router);
  if (!isNative && 'serviceWorker' in navigator) {
    // A new service worker takes over: reload, but only when the parent next returns to Home, never mid-task.
    const hadController = !!navigator.serviceWorker.controller;
    let updated = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadController) updated = true; });
    addEventListener('hashchange', () => { if (updated && location.hash === '#/home') location.reload(); });
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}
boot();
