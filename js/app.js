import { createStore } from './store.js';
import { createRouter } from './router.js';
import { homeScreen } from './screens/home.js';
import { lessonScreen } from './screens/lesson.js';
import { createSpeech } from './speech.js';
import { taskScreen } from './screens/task.js';
import { finishScreen } from './screens/finish.js';
import { labScreen } from './screens/lab.js';
import { glyphsDebug } from './screens/glyphs-debug.js';

async function boot() {
  const root = document.getElementById('app');
  const store = createStore();
  let curriculum;
  try {
    const res = await fetch('data/curriculum.json');
    if (!res.ok) throw new Error(res.status);
    curriculum = await res.json();
  } catch (e) {
    root.textContent = 'Could not load the lessons. Please check the connection and reload.';
    return;
  }
  const speech = createSpeech({ store, curriculum });
  const ctx = { store, curriculum, speech, router: null };
  // Browsers only allow speech after a tap. The first pointerdown unlocks it for this page session.
  addEventListener('pointerdown', () => speech.unlock(), { capture: true, once: true });
  document.addEventListener('visibilitychange', () => { if (document.hidden) speech.cancel(); });
  const routes = [
    { re: /^\/home$/, screen: homeScreen },
    { re: /^\/lesson\/(\d+)$/, screen: lessonScreen },
    { re: /^\/lesson\/(\d+)\/task\/(\d+)$/, screen: taskScreen },
    { re: /^\/lesson\/(\d+)\/finish$/, screen: finishScreen },
    { re: /^\/lab$/, screen: labScreen },
    { re: /^\/glyphs$/, screen: glyphsDebug },
  ];
  ctx.router = createRouter(root, routes, ctx);
  await ctx.router.start();
}
boot();
