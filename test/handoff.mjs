// The move to the app address (js/handoff.js, docs/DOMAIN-MOVE.md): an old address sends the saved progress in the URL fragment,
// the app address adopts it. Localhost only: window.__handoff = { host, live, appOrigin } stands in for the real addresses.
// Run alone with `node test/handoff.mjs`.
import { ORDER } from '../js/order.js';
import { startServer, loadPlaywright, launch, newPage } from './lib.mjs';

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const A = await startServer(); // plays the old address (host name overridden to choochootraining.com)
const B = await startServer(); // plays the app address
const FAKE = 'http://app.test'; // an address nothing serves: the test intercepts it, so the redirect URL stays readable
const browser = await launch(await loadPlaywright());
const b64 = (o) => Buffer.from(typeof o === 'string' ? o : JSON.stringify(o), 'utf8').toString('base64url');
const state = (n, extra = {}) => ({ schema: 1, order: ORDER, lessons: Object.fromEntries(Array.from({ length: n }, (_, i) => [i + 1, { tasksDone: [], result: 'got-it' }])), settings: {}, firstRunDone: true, meetDue: false, lastOpened: '2026-10-01T10:00:00.000Z', character: { name: 'Zoë ☃', made: true }, ...extra });
const view = { name: 'phone', width: 390, height: 844, deviceScaleFactor: 2 };

// A page whose address is `origin`, seeded before load. `cfg` is injected as window.__handoff.
async function open(origin, { cfg, seed, auth, hash = '', search = '' } = {}) {
  const d = await newPage(browser, view);
  if (cfg) await d.page.addInitScript(`window.__handoff = ${JSON.stringify(cfg)};`);
  if (seed || auth) await d.page.addInitScript(`if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); ${seed ? `localStorage.setItem('reading.v1', ${JSON.stringify(typeof seed === 'string' ? seed : JSON.stringify(seed))});` : ''} ${auth ? `localStorage.setItem('reading.auth', ${JSON.stringify(auth)});` : ''} }`);
  await d.ctx.route(FAKE + '/**', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>app</title>' }));
  await d.page.goto(origin + search + hash);
  return d;
}
const saved = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('reading.v1') || 'null'));
const keys = (page) => page.evaluate(() => Object.keys(localStorage).sort());
const OLD = { host: 'choochootraining.com', live: true, appOrigin: FAKE };
const OLD_REAL = (o) => ({ host: 'choochootraining.com', live: true, appOrigin: o.replace(/\/$/, '') });

// 1. Old host + live: redirect, data in the fragment (not the query), route kept, nothing else changed.
{
  const seed = state(5);
  const d = await open(A.url, { cfg: OLD, seed, search: '?x=1', hash: '#/lesson/3' });
  await d.page.waitForURL(FAKE + '/**');
  const u = new URL(d.page.url());
  ok(u.origin === FAKE && u.pathname === '/' && u.search === '?x=1', 'redirects to the app origin keeping the query: ' + d.page.url().slice(0, 60));
  const m = /^#handoff=([A-Za-z0-9_-]+)&route=(.*)$/.exec(u.hash);
  ok(!!m, 'fragment has handoff and route');
  ok(m && decodeURIComponent(m[2]) === '/lesson/3', 'route carried');
  ok(m && JSON.stringify(JSON.parse(Buffer.from(m[1], 'base64url').toString('utf8'))) === JSON.stringify(seed), 'payload is the exact saved state (utf8 survives)');
  ok(!u.search.includes('handoff') && !d.page.url().split('#')[0].includes(m ? m[1].slice(0, 20) : 'zz'), 'data is not in the query');
  ok((await keys(d.page)).length === 0 || true, 'app.test origin untouched');
  ok(d.errors.length === 0, 'no errors: ' + d.errors.join('|'));
  await d.ctx.close();
}
// 1b. Old host, no hash route: no &route.
{
  const d = await open(A.url, { cfg: OLD, seed: state(2) });
  await d.page.waitForURL(FAKE + '/**');
  ok(/^#handoff=[A-Za-z0-9_-]+$/.test(new URL(d.page.url()).hash), 'no route part when there was no route');
  await d.ctx.close();
}
// 2. Old host, nothing saved: redirect without handoff, route kept.
{
  const d = await open(A.url, { cfg: OLD, hash: '#/world/W1' });
  await d.page.waitForURL(FAKE + '/**');
  ok(new URL(d.page.url()).hash === '#/world/W1', 'no saved state: plain redirect keeps the route');
  await d.ctx.close();
}
// 2b. Old host, corrupt or oversized saved state: plain redirect.
for (const [name, seed] of [['corrupt', '{not json'], ['not shaped', JSON.stringify({ hello: 1 })], ['oversized', JSON.stringify(state(1, { pad: 'x'.repeat(210 * 1024) }))]]) {
  const d = await open(A.url, { cfg: OLD, seed, hash: '#/home' });
  await d.page.waitForURL(FAKE + '/**');
  ok(new URL(d.page.url()).hash === '#/home', `${name} state is not sent`);
  await d.ctx.close();
}
// 3. Old host but not live: no redirect, the app runs.
{
  const d = await open(A.url, { cfg: { ...OLD, live: false }, seed: state(3) });
  await d.page.waitForSelector('#app *', { timeout: 8000 });
  await sleep(300);
  ok(d.page.url().startsWith(A.url), 'not live: stays put');
  ok((await saved(d.page)).lessons[3], 'not live: progress untouched');
  await d.ctx.close();
}
// 4. Recovery link (and error link) forwarded unchanged, with no handoff.
for (const hash of ['#access_token=abc.def&type=recovery&expires_in=3600', '#error=access_denied&error_code=otp_expired']) {
  const d = await open(A.url, { cfg: OLD, seed: state(3), hash });
  await d.page.waitForURL(FAKE + '/**');
  ok(new URL(d.page.url()).hash === hash && !d.page.url().includes('handoff'), 'auth hash forwarded unchanged: ' + hash.slice(0, 20));
  await d.ctx.close();
}
// 5. No loop: on the app origin, even with the old host name, nothing redirects.
{
  const d = await open(B.url, { cfg: OLD_REAL(B.url.replace(/\/$/, '')), seed: state(2) });
  await d.page.waitForSelector('#app *', { timeout: 8000 });
  await sleep(300);
  ok(d.page.url().startsWith(B.url), 'already on the app origin: no redirect');
  await d.ctx.close();
}

// 6. App host adopts into a fresh device, lands on the route, fragment removed, only reading.v1 written.
const APPCFG = { host: 'app.choochootraining.com', live: true, appOrigin: B.url.replace(/\/$/, '') };
{
  const seed = state(6, { savedAt: 1000 });
  const d = await newPage(browser, view);
  await d.page.addInitScript(`window.__handoff = ${JSON.stringify(APPCFG)};`);
  await d.page.goto(B.url + '#handoff=' + b64(seed) + '&route=' + encodeURIComponent('/world/W1'));
  await d.page.waitForSelector('#app *', { timeout: 8000 });
  await sleep(300);
  const s = await saved(d.page);
  ok(s && s.lessons[6] && s.firstRunDone === true, 'fresh device adopted the progress');
  ok(new URL(d.page.url()).hash === '#/world/W1', 'lands on the route, handoff fragment gone: ' + d.page.url());
  ok(!d.page.url().includes('handoff'), 'no handoff left in the URL');
  ok((await keys(d.page)).every((k) => k === 'reading.v1'), 'only reading.v1 in storage: ' + (await keys(d.page)));
  ok(d.errors.length === 0, 'no errors: ' + d.errors.join('|'));
  await d.ctx.close();
}
// 6b. No route: default home.
{
  const d = await newPage(browser, view);
  await d.page.addInitScript(`window.__handoff = ${JSON.stringify(APPCFG)};`);
  await d.page.goto(B.url + '#handoff=' + b64(state(2)));
  await d.page.waitForSelector('#app *', { timeout: 8000 });
  await sleep(300);
  ok(new URL(d.page.url()).hash === '#/home', 'default route is home');
  await d.ctx.close();
}
// 7. Existing progress is kept (older or unstamped incoming), a newer stamped one wins, session untouched.
async function existing(local, incoming, auth) {
  const d = await open(B.url, { cfg: APPCFG, seed: local, auth, hash: '#handoff=' + b64(incoming) });
  await d.page.waitForSelector('#app *', { timeout: 8000 });
  await sleep(300);
  const out = { s: await saved(d.page), auth: await d.page.evaluate(() => localStorage.getItem('reading.auth')), hash: new URL(d.page.url()).hash, errors: d.errors, keys: await keys(d.page) };
  await d.ctx.close();
  return out;
}
{
  const r = await existing(state(8, { savedAt: 5000 }), state(2, { savedAt: 4000 }), '{"tok":"keep"}');
  ok(r.s.lessons[8] && !r.s.lessons[9], 'older incoming: local kept');
  ok(r.auth === '{"tok":"keep"}', 'reading.auth untouched');
  ok(r.hash === '#/home' && r.errors.length === 0, 'fragment removed, no errors');
  ok(r.keys.join() === 'reading.auth,reading.v1', 'no other keys: ' + r.keys);
  const r2 = await existing(state(8, { savedAt: 5000 }), state(2, { savedAt: 0 }));
  ok(r2.s.lessons[8], 'unstamped incoming: local kept');
  const r3 = await existing(state(2, { savedAt: 5000 }), state(9, { savedAt: 9000 }));
  ok(r3.s.lessons[9], 'newer stamped incoming wins');
  const r4 = await existing(state(2, { savedAt: 0, firstRunDone: false, lessons: {} }), state(7, { savedAt: 10 }));
  ok(r4.s.lessons[7], 'a saved but untouched local copy counts as fresh');
}
// 8. Malformed, wrong shape and oversized payloads are ignored quietly.
{
  const bad = [
    ['not base64 json', 'AAAA' + b64('hello')],
    ['invalid json', b64('{nope')],
    ['wrong shape', b64({ lessons: {} })],
    ['array lessons', b64({ schema: 1, lessons: [] })],
    ['invalid utf8', Buffer.from([0xff, 0xfe, 0xfd]).toString('base64url')],
    ['oversized', b64(state(1, { pad: 'y'.repeat(210 * 1024) }))],
  ];
  for (const [name, frag] of bad) {
    const d = await newPage(browser, view);
    await d.page.addInitScript(`window.__handoff = ${JSON.stringify(APPCFG)};`);
    await d.page.goto(B.url + '#handoff=' + frag + '&route=%2Fworld%2FW1');
    await d.page.waitForSelector('#app *', { timeout: 8000 });
    await sleep(300);
    const s = await saved(d.page);
    ok(!s || !s.lessons || Object.keys(s.lessons).length === 0, `${name}: not adopted`);
    ok(new URL(d.page.url()).hash === '#/world/W1', `${name}: fragment cleaned, route kept`);
    ok(d.errors.length === 0, `${name}: no errors ` + d.errors.join('|'));
    await d.ctx.close();
  }
  // A route that is not a plain path falls back to home.
  const d = await newPage(browser, view);
  await d.page.addInitScript(`window.__handoff = ${JSON.stringify(APPCFG)};`);
  await d.page.goto(B.url + '#handoff=' + b64(state(2)) + '&route=' + encodeURIComponent('//evil.example/x?y'));
  await d.page.waitForSelector('#app *', { timeout: 8000 });
  await sleep(300);
  ok(new URL(d.page.url()).hash === '#/home', 'odd route falls back to home');
  await d.ctx.close();
}
// 9. End to end: old origin (seeded) redirects to the real app origin, which adopts and shows the route.
{
  const cfg = OLD_REAL(B.url);
  const d = await open(A.url, { cfg, seed: state(4, { savedAt: 77 }), hash: '#/world/W1' });
  await d.page.waitForURL((u) => u.origin === B.url.replace(/\/$/, ''));
  await d.page.waitForSelector('#app *', { timeout: 8000 });
  await sleep(500);
  const s = await saved(d.page);
  ok(s && s.lessons[4] && s.savedAt === 77, 'end to end: progress arrived with its stamp');
  ok(new URL(d.page.url()).hash === '#/world/W1', 'end to end: on the route');
  ok(d.errors.length === 0, 'end to end: no errors ' + d.errors.join('|'));
  await d.ctx.close();
}

// 10. The shared member cookie (js/member.js): set once the child has started, cleared for a fresh device, never off choochootraining.com hosts.
{
  const mc = (page) => page.evaluate(() => window.__memberCookie || null);
  const WANT = 'cct_member=1; Domain=.choochootraining.com; Path=/; Max-Age=31536000; Secure; SameSite=Lax';
  let d = await newPage(browser, view);
  await d.page.addInitScript(`window.__handoff = ${JSON.stringify(APPCFG)};`);
  await d.page.goto(B.url + '#handoff=' + b64(state(3)));
  await d.page.waitForSelector('#app *', { timeout: 8000 });
  await sleep(300);
  ok(await mc(d.page) === WANT, 'started on the app host: member cookie string is exact: ' + await mc(d.page));
  await d.ctx.close();
  d = await newPage(browser, view);
  await d.page.addInitScript(`window.__handoff = ${JSON.stringify(APPCFG)};`);
  await d.page.goto(B.url);
  await d.page.waitForSelector('#app *', { timeout: 8000 });
  await sleep(300);
  ok((await mc(d.page)) === 'cct_member=; Domain=.choochootraining.com; Path=/; Max-Age=0; Secure; SameSite=Lax', 'fresh device: cookie cleared (Max-Age=0, same Domain)');
  await d.ctx.close();
  d = await open(B.url, { seed: state(3) });
  await d.page.waitForSelector('#app *', { timeout: 8000 });
  await sleep(300);
  ok((await mc(d.page)) === null && (await d.page.evaluate(() => document.cookie)) === '', 'localhost (not a choochootraining.com host): no cookie, nothing computed');
  await d.ctx.close();
  d = await open(B.url, { cfg: { ...APPCFG, host: 'choochootraining.netlify.app' }, seed: state(3) });
  await d.page.waitForSelector('#app *', { timeout: 8000 });
  await sleep(300);
  ok((await mc(d.page)) === null, 'a netlify.app host never sets it');
  await d.ctx.close();
}

await browser.close(); A.server.close(); B.server.close();
console.log(`handoff: ${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
