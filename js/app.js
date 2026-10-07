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
import { createAccount } from './account.js';
import { signinScreen } from './screens/signin.js';
import { handoffOut, handoffIn } from './handoff.js';
import { initMember } from './member.js';

async function boot() {
  if (handoffOut()) return; // an old address: the page is being sent to the app address with the progress
  const root = document.getElementById('app');
  const store = createStore();
  handoffIn(store); // arriving from an old address: take its progress (before sign-in and sync)
  const account = createAccount({ store });
  initMember({ store, account }); // the shared cct_member cookie for the marketing website (js/member.js)
  // Accounts (off until js/config.js is filled in): renew the session and pull, then ask for sign-in if nobody is in.
  if (account.configured) {
    const hash = new URLSearchParams(location.hash.replace(/^#\/?/, '').replace(/^.*?(?=access_token|error)/, ''));
    const resetToken = hash.get('type') === 'recovery' ? hash.get('access_token') : null;
    const linkError = hash.get('error_code') || hash.get('error') ? 'That link has expired. Please ask for a new one.' : '';
    if (resetToken || linkError) history.replaceState(null, '', location.pathname + location.search);
    await Promise.race([account.start(), new Promise((r) => setTimeout(r, 2500))]);
    if (resetToken || linkError || account.required()) await new Promise((done) => root.append(signinScreen({ account, store, onDone: done, mode: resetToken ? 'reset' : 'signin', resetToken, notice: linkError })));
  }
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
  const ctx = { store, curriculum, speech, router: null, account };
  account.on((t) => { if (t === 'adopted' && ctx.router && /^#?\/?(home)?$/.test(location.hash)) ctx.router.go('/home'); }); // the cloud copy arrived late: show it
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
    // A read-only look at one world (W1 .. W11), linked from Grownups. Loaded on demand; its files are precached.
    { re: /^\/world\/(W\d+)$/, screen: (...a) => import('./screens/region.js').then((m) => m.regionScreen(...a)) },
    // Prototype 2 previews (Grownups > Previews). Loaded on demand; nothing in the child's flow leads here.
    { re: /^\/preview\/tip$/, screen: (...a) => import('./screens/previews.js').then((m) => m.tipPreview(...a)) },
    { re: /^\/preview\/board$/, screen: (...a) => import('./screens/previews.js').then((m) => m.boardPreview(...a)) },
    { re: /^\/preview\/gateway$/, screen: (...a) => import('./screens/previews.js').then((m) => m.gatewayPreview(...a)) },
    // Prototype 4: one lesson in the new eight-step loop (Grownups > Previews). Loaded on demand; its files are precached.
    { re: /^\/proto\/f$/, screen: (...a) => import('./screens/proto-lesson.js').then((m) => m.protoIntro(...a)) },
    { re: /^\/proto\/f\/task\/(\d+)$/, screen: (...a) => import('./screens/proto-lesson.js').then((m) => m.protoTask(...a)) },
    // Prototype 6: Stage 1 sound play and the placement check (Grownups > Previews).
    { re: /^\/proto\/play$/, screen: (...a) => import('./screens/proto-play.js').then((m) => m.playIntro(...a)) },
    { re: /^\/proto\/play\/(\d+)\/task\/(\d+)$/, screen: (...a) => import('./screens/proto-play.js').then((m) => m.playTask(...a)) },
    { re: /^\/proto\/placement$/, screen: (...a) => import('./screens/proto-placement.js').then((m) => m.placementScreen(...a)) },
    // Prototype 5: a heart-word step for "the" (Grownups > Previews). Loaded on demand; its files are precached.
    { re: /^\/proto\/heart$/, screen: (...a) => import('./screens/proto-heart.js').then((m) => m.protoHeart(...a)) },
    { re: /^\/proto\/heart\/done$/, screen: (...a) => import('./screens/proto-heart.js').then((m) => m.protoHeartDone(...a)) },
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
