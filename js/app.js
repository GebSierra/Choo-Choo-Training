import { createStore } from './store.js';
import { createRouter } from './router.js';
import { homeScreen } from './screens/home.js';
import { lessonScreen } from './screens/lesson.js';

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
  const ctx = { store, curriculum, speech: null, router: null };
  const routes = [
    { re: /^\/home$/, screen: homeScreen },
    { re: /^\/lesson\/(\d+)$/, screen: lessonScreen },
  ];
  ctx.router = createRouter(root, routes, ctx);
  await ctx.router.start();
}
boot();
