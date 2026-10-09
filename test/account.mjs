// Grown-up accounts (docs/BACKEND.md): sign-in screen, sign up / in / forgot / reset, session refresh, offline-first sync,
// sign out, delete account, developer bypass. Every Supabase endpoint is faked with Playwright route interception: no real
// network. Config is injected with window.__config = { url, key, providers } before load (honoured on localhost / 127.0.0.1 only;
// without it, or ?accounts=1, accounts are OFF on localhost even though js/config.js is filled in).
// Run alone with `node test/account.mjs [--shots]`.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { startServer, loadPlaywright, launch, newPage, ROOT, doneThrough } from './lib.mjs';

const SHOTS = process.argv.includes('--shots');
const SHOT_DIR = path.join(ROOT, 'docs/screenshots/account');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SB = 'https://fake-project.supabase.test';
const CONFIG = (providers) => `window.__config = { url: '${SB}', key: 'anon-key-for-tests', providers: ${JSON.stringify(providers)} };`;
const b64url = (buf) => buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const VP = { name: 'phone', width: 390, height: 844, deviceScaleFactor: 2 };

// ---- the fake Supabase: users, one progress row each, and a log of every call ----
function makeBackend({ confirm = false, ttl = 3600 } = {}) {
  const b = { users: {}, rows: {}, tokens: {}, refresh: {}, log: [], confirm, ttl, offline: false, n: 0, other: [], rejectRefresh: false, authorize: [], codes: {} };
  b.calls = (re) => b.log.filter((l) => re.test(l.method + ' ' + l.path));
  b.addUser = (email, password, confirmed = true, provider = 'email') => { b.users[email] = { id: 'user-' + (++b.n), email, password, confirmed, provider }; return b.users[email]; };
  b.issue = (u) => { const at = 'at-' + (++b.n), rt = 'rt-' + b.n; b.tokens[at] = { id: u.id, exp: Date.now() / 1000 + b.ttl }; b.refresh[rt] = u.id; return { access_token: at, refresh_token: rt, expires_in: b.ttl, token_type: 'bearer', user: { id: u.id, email: u.email, app_metadata: { provider: u.provider || 'email' } } }; };
  return b;
}
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization, apikey, content-type, accept, prefer', 'access-control-allow-methods': 'GET, POST, PUT, OPTIONS', 'access-control-allow-private-network': 'true' };
async function attach(ctx, b, appOrigin) {
  await ctx.route('**/*', async (route) => {
    const req = route.request(); const u = new URL(req.url());
    if (u.origin === appOrigin || u.protocol === 'data:' || u.protocol === 'blob:') return route.continue();
    if (u.origin !== SB) { b.other.push(req.url()); return route.abort(); }
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    const json = (status, body) => route.fulfill({ status, headers: { ...CORS, 'content-type': 'application/json' }, body: body === undefined ? '' : JSON.stringify(body) });
    const body = req.postData() ? JSON.parse(req.postData()) : null;
    const entry = { method: req.method(), path: u.pathname + u.search, body, auth: req.headers().authorization, apikey: req.headers().apikey };
    b.log.push(entry);
    if (b.offline) return route.abort('internetdisconnected');
    const p = u.pathname;
    if (p === '/auth/v1/authorize') { b.authorize.push(req.url()); b.authorizeNav = req.isNavigationRequest(); return route.fulfill({ status: 200, headers: { 'content-type': 'text/html' }, body: '<!doctype html><title>Google</title>fake google' }); }
    const who = () => { const t = b.tokens[(entry.auth || '').replace('Bearer ', '')]; return t && t.exp > Date.now() / 1000 ? t.id : null; };
    if (p === '/auth/v1/signup') {
      const ex = b.users[body.email];
      if (ex) return json(200, { id: 'fake', email: body.email, identities: [] });
      const nu = b.addUser(body.email, body.password, !b.confirm);
      return b.confirm ? json(200, { id: nu.id, email: nu.email, identities: [{ id: nu.id }] }) : json(200, b.issue(nu));
    }
    if (p === '/auth/v1/token' && u.searchParams.get('grant_type') === 'password') {
      const us = b.users[body.email];
      if (!us || us.password !== body.password) return json(400, { code: 400, error_code: 'invalid_credentials', msg: 'Invalid login credentials' });
      if (!us.confirmed) return json(400, { code: 400, error_code: 'email_not_confirmed', msg: 'Email not confirmed' });
      return json(200, b.issue(us));
    }
    if (p === '/auth/v1/token' && u.searchParams.get('grant_type') === 'refresh_token') {
      const id = b.refresh[body.refresh_token];
      if (!id || b.rejectRefresh) return json(400, { code: 400, error_code: 'refresh_token_not_found', msg: 'Invalid Refresh Token' });
      return json(200, b.issue(Object.values(b.users).find((x) => x.id === id)));
    }
    if (p === '/auth/v1/token' && u.searchParams.get('grant_type') === 'pkce') {
      const us = b.codes[body.auth_code];
      if (!us || !body.code_verifier) return json(400, { code: 400, error_code: 'bad_code_verifier', msg: 'invalid flow state' });
      delete b.codes[body.auth_code];
      return json(200, b.issue(us));
    }
    if (p === '/auth/v1/user' && req.method() === 'GET') {
      const id = who(); if (!id) return json(401, { msg: 'bad token' });
      const us = Object.values(b.users).find((x) => x.id === id);
      return json(200, { id: us.id, email: us.email, app_metadata: { provider: us.provider || 'email' } });
    }
    if (p === '/auth/v1/recover') return json(200, {});
    if (p === '/auth/v1/logout') return json(204);
    if (p === '/auth/v1/user' && req.method() === 'PUT') {
      const id = b.tokens[(entry.auth || '').replace('Bearer ', '')] ? who() : null;
      if (!id) return json(401, { msg: 'bad token' });
      Object.values(b.users).find((x) => x.id === id).password = body.password;
      return json(200, {});
    }
    if (p === '/rest/v1/progress' && req.method() === 'GET') {
      const id = who(); if (!id) return json(401, { code: 'PGRST301', message: 'JWT expired' });
      return json(200, b.rows[id] ? [b.rows[id]] : []);
    }
    if (p === '/rest/v1/progress' && req.method() === 'POST') {
      const id = who(); if (!id || body.user_id !== id) return json(401, { code: 'PGRST301', message: 'JWT expired' });
      b.rows[id] = { data: body.data, updated_at: body.updated_at };
      return json(201);
    }
    if (p === '/rest/v1/rpc/delete_my_account') {
      const id = who(); if (!id) return json(401, { message: 'not signed in' });
      delete b.rows[id]; for (const k of Object.keys(b.users)) if (b.users[k].id === id) delete b.users[k];
      return json(204);
    }
    return json(404, { message: 'unknown ' + p });
  });
}

const { server, url } = await startServer();
const origin = new URL(url).origin;
const browser = await launch(await loadPlaywright());

const SEEDED = { schema: 1, lessons: doneThrough(4), settings: {}, firstRunDone: true, meetDue: false };
const seedScript = (obj) => `if (!localStorage.getItem('reading.v1') && !sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('reading.v1', ${JSON.stringify(JSON.stringify(obj))}); }`;

// A device: its own browser context (own storage), the fake backend attached, config injected or not.
async function device(b, { config = true, seed = null, vp = VP, providers = [] } = {}) {
  const d = await newPage(browser, vp);
  await attach(d.ctx, b, origin);
  if (config) await d.page.addInitScript(CONFIG(providers));
  if (seed) await d.page.addInitScript(seedScript(seed));
  d.bad = () => d.errors.filter((e) => !/Failed to load resource/.test(e)); // the browser logs every faked 400 and aborted call itself
  d.ls = (k) => d.page.evaluate((key) => localStorage.getItem(key), k);
  d.lsJson = async (k) => JSON.parse(await d.ls(k));
  d.open = async (hash = '') => { await d.page.goto(url + hash); await d.page.waitForSelector('.signin, .screen'); };
  d.fill = async (name, v) => { await d.page.fill(`input[name=${name}]`, v); };
  d.mode = (m) => d.page.click(`.si-tab[data-mode=${m}]`);
  d.err = async () => (await d.page.textContent('.si-error')).trim();
  d.signIn = async (email, pw) => { await d.fill('email', email); await d.fill('password', pw); await d.page.click('.si-go'); };
  d.home = async () => { await d.page.waitForSelector('.screen'); await d.page.waitForTimeout(1200); };
  d.grownups = async () => {
    await d.page.waitForSelector('.pill-hold'); await d.page.waitForTimeout(900);
    const gb = await d.page.locator('.pill-hold').boundingBox();
    await d.page.mouse.move(gb.x + gb.width / 2, gb.y + gb.height / 2); await d.page.mouse.down(); await d.page.waitForTimeout(2300); await d.page.mouse.up();
    await d.page.waitForSelector('.grownups'); await d.page.waitForTimeout(400);
  };
  return d;
}
const uidOf = (b, email) => b.users[email].id;

// ---- 1. unconfigured: nothing changes ----
{
  const b = makeBackend();
  const d = await device(b, { config: false, seed: SEEDED });
  const reqs = []; d.page.on('request', (r) => reqs.push(r.url()));
  await d.open('#/home'); await d.home();
  ok((await d.page.locator('.signin').count()) === 0, 'unconfigured: no sign-in screen');
  ok(reqs.every((r) => r.startsWith(origin) || r.startsWith('data:') || r.startsWith('blob:')) && b.log.length === 0 && b.other.length === 0, 'unconfigured: no network beyond the app files');
  ok((await d.ls('reading.auth')) === null, 'unconfigured: no auth key written');
  await d.grownups();
  ok((await d.page.locator('[data-section=account]').count()) === 0, 'unconfigured: no Account section in Grownups');
  ok(d.bad().length === 0, 'unconfigured: no errors ' + d.bad().join('|'));
  await d.ctx.close();
}

// ---- 2. configured: the screen at boot, its fields and its fit ----
{
  const b = makeBackend({ confirm: true });
  b.addUser('mum@example.com', 'correct-horse', true);
  b.addUser('new@example.com', 'x-unconfirmed', false);
  const d = await device(b, { seed: SEEDED });
  await d.open('#/home');
  ok((await d.page.locator('.signin').count()) === 1 && (await d.page.locator('.screen').count()) === 0, 'configured: the sign-in screen shows at boot, not the app');
  ok((await d.page.textContent('.signin h1')).trim() === 'Welcome! Grown-ups, please sign in', 'sign-in: the title');
  ok((await d.page.locator('.si-tab').allTextContents()).join('|') === 'Sign in|Create account' && (await d.page.locator('.si-link[data-mode=forgot]').count()) === 1, 'sign-in: tabs and Forgot password link');
  const attrs = await d.page.evaluate(() => { const e = document.querySelector('input[name=email]'), p = document.querySelector('input[name=password]'); return { et: e.type, ea: e.autocomplete, em: e.inputMode, pt: p.type, pa: p.autocomplete }; });
  ok(attrs.et === 'email' && attrs.ea === 'username' && attrs.em === 'email' && attrs.pt === 'password' && attrs.pa === 'current-password', 'sign-in: input types and autocomplete ' + JSON.stringify(attrs));
  await d.mode('signup');
  const sattrs = await d.page.evaluate(() => [...document.querySelectorAll('.si-form input')].map((i) => `${i.name}:${i.type}:${i.autocomplete}`));
  ok(sattrs.join() === 'email:email:email,password:password:new-password,confirm:password:new-password', 'sign-up: fields and autocomplete ' + sattrs);
  ok(!/privacy|record/i.test(await d.page.textContent('.signin')), 'sign-in: no privacy or recording wording');
  await d.ctx.close();

  // fit and 48 px targets at three phone sizes (portrait and landscape)
  for (const v of [{ width: 360, height: 640 }, { width: 390, height: 844 }, { width: 915, height: 412 }]) {
    const e = await device(b, { vp: { ...v, deviceScaleFactor: 2 } });
    await e.open('#/home');
    for (const m of ['signin', 'signup', 'forgot']) {
      if (m === 'forgot') await e.page.click('.si-tab[data-mode=signin]'), await e.page.click('.si-link[data-mode=forgot]'); else await e.mode(m);
      const fit = await e.page.evaluate(() => {
        const small = [...document.querySelectorAll('.signin button, .signin input')].filter((x) => { const r = x.getBoundingClientRect(); return r.height < 47.5 || r.width < 47.5; }).map((x) => x.className);
        const off = [...document.querySelectorAll('.signin input, .signin .si-go')].filter((x) => { const r = x.getBoundingClientRect(); return r.left < 0 || r.right > innerWidth + 0.5; }).length;
        const fields = document.querySelectorAll('.signin .si-go').length;
        return { small, off, hScroll: document.documentElement.scrollWidth > innerWidth + 1, fields, canScroll: document.documentElement.scrollHeight >= innerHeight };
      });
      ok(fit.small.length === 0 && fit.off === 0 && !fit.hScroll && fit.fields === 1, `${v.width}x${v.height} ${m}: 48 px targets, nothing off screen ${JSON.stringify(fit)}`);
      // keyboard-safe: the last field and the button can be scrolled into view
      const reach = await e.page.evaluate(() => { const g = document.querySelector('.si-go'); g.scrollIntoView({ block: 'center' }); const r = g.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; });
      ok(reach, `${v.width}x${v.height} ${m}: the button can be scrolled into view`);
    }
    await e.ctx.close();
  }
}

// ---- 3. sign up with email confirmation on, sign in, wrong password ----
let backend;
{
  const b = backend = makeBackend({ confirm: true });
  const d = await device(b, { seed: SEEDED });
  await d.open('#/home');
  const before = await d.ls('reading.v1');
  await d.mode('signup');
  await d.fill('email', 'mum@example.com'); await d.fill('password', 'short'); await d.fill('confirm', 'short'); await d.page.click('.si-go');
  ok(/at least 8/.test(await d.err()) && b.log.length === 0, 'sign up: a short password is refused before any call');
  await d.fill('password', 'correct-horse'); await d.fill('confirm', 'correct-horsE'); await d.page.click('.si-go');
  ok(/not the same/.test(await d.err()) && b.log.length === 0, 'sign up: mismatched passwords are refused before any call');
  await d.fill('confirm', 'correct-horse'); await d.page.click('.si-go');
  await d.page.waitForSelector('.si-note[data-state=check-email]');
  const note = await d.page.textContent('.si-note');
  ok(/Check your email/.test(note) && note.includes('mum@example.com'), 'sign up: the Check your email card names the address');
  const su = b.calls(/POST \/auth\/v1\/signup/);
  ok(su.length === 1 && su[0].apikey === 'anon-key-for-tests' && su[0].auth === undefined && su[0].body.password === 'correct-horse', 'sign up: one signup call with the key in apikey and no Authorization header');
  ok((await d.ls('reading.auth')) === null && (await d.ls('reading.v1')) === before, 'sign up (confirm on): no session and reading.v1 untouched');
  if (SHOTS) { fs.mkdirSync(SHOT_DIR, { recursive: true }); await d.page.screenshot({ path: path.join(SHOT_DIR, 'check-your-email-390x844.png') }); }
  await d.page.click('.si-go'); // Back to sign in
  await d.page.waitForSelector('input[name=password]');
  await d.signIn('mum@example.com', 'correct-horse'); // not confirmed yet
  await d.page.waitForSelector('.si-note[data-state=check-email]');
  ok(true, 'sign in before confirming: shows Check your email');
  b.users['mum@example.com'].confirmed = true;
  await d.page.click('.si-go');
  await d.page.waitForSelector('input[name=password]');
  await d.signIn('mum@example.com', 'wrong-password');
  await d.page.waitForFunction(() => document.querySelector('.si-error').textContent.length > 0);
  ok(/don't match/.test(await d.err()), 'sign in: wrong password gives a friendly message: ' + await d.err());
  ok((await d.ls('reading.auth')) === null && (await d.ls('reading.v1')) === before, 'sign in (wrong): nothing stored, reading.v1 untouched');
  b.offline = true; await d.fill('password', 'correct-horse'); await d.page.click('.si-go');
  await d.page.waitForFunction(() => /internet/.test(document.querySelector('.si-error').textContent));
  ok(/No internet connection/.test(await d.err()), 'sign in: offline gives a friendly message');
  b.offline = false;
  await d.page.click('.si-go');
  await d.page.waitForSelector('.screen'); await d.page.waitForTimeout(800);
  ok((await d.page.locator('.signin').count()) === 0, 'sign in: the app opens');
  const auth = await d.lsJson('reading.auth');
  ok(auth && auth.user.email === 'mum@example.com' && auth.access_token && auth.refresh_token && auth.expires_at > Date.now() / 1000, 'sign in: session saved under reading.auth');
  for (let t = 0; t < 50 && !b.rows[uidOf(b, 'mum@example.com')]; t++) await d.page.waitForTimeout(100); // the upload lands within a few seconds (a routine debounced save may follow it)
  const rowsUp = b.calls(/POST \/rest\/v1\/progress/);
  ok(rowsUp.length >= 1 && b.rows[uidOf(b, 'mum@example.com')].data.lessons[4].result === 'got-it', 'first sign-in with progress and an empty cloud uploads it');
  ok(JSON.stringify((await d.lsJson('reading.v1')).lessons) === JSON.stringify(SEEDED.lessons), 'upload leaves reading.v1 lessons as they were');
  await d.page.waitForTimeout(100);
  ok(d.bad().length === 0, 'sign up/in: no errors ' + d.bad().join('|'));
  await d.ctx.close();
}

// ---- 4. sign up with confirmation off signs straight in; email in use ----
{
  const b = makeBackend({ confirm: false });
  b.addUser('taken@example.com', 'abcdefgh', true);
  const d = await device(b, { seed: SEEDED });
  await d.open('#/home');
  await d.mode('signup');
  await d.fill('email', 'taken@example.com'); await d.fill('password', 'abcdefgh'); await d.fill('confirm', 'abcdefgh'); await d.page.click('.si-go');
  await d.page.waitForFunction(() => document.querySelector('.si-error').textContent.length > 0);
  ok(/already has an account/.test(await d.err()), 'sign up: email already in use message');
  await d.fill('email', 'dad@example.com'); await d.page.click('.si-go');
  await d.page.waitForSelector('.screen');
  ok((await d.lsJson('reading.auth')).user.email === 'dad@example.com', 'sign up (confirm off): signed in straight away');
  await d.ctx.close();
}

// ---- 5. forgot password and the reset link ----
{
  const b = makeBackend();
  b.addUser('mum@example.com', 'correct-horse', true);
  const d = await device(b);
  await d.open('#/home');
  await d.page.click('.si-link[data-mode=forgot]');
  await d.fill('email', 'not-an-email'); await d.page.click('.si-go');
  ok(/check the email/i.test(await d.err()) && b.log.length === 0, 'forgot: a bad address is refused before any call');
  if (SHOTS) await d.page.screenshot({ path: path.join(SHOT_DIR, 'forgot-password-390x844.png') });
  await d.fill('email', 'mum@example.com'); await d.page.click('.si-go');
  await d.page.waitForSelector('.si-note[data-state=sent]');
  const rc = b.calls(/POST \/auth\/v1\/recover/);
  ok(rc.length === 1 && rc[0].body.email === 'mum@example.com' && rc[0].path.includes('redirect_to='), 'forgot: the recover call is made with a redirect');
  ok(/Check your email/.test(await d.page.textContent('.si-note')), 'forgot: Check your email state');
  await d.ctx.close();

  // the link opens the app with the recovery token in the hash
  const e = await device(b);
  b.tokens['reset-token'] = { id: uidOf(b, 'mum@example.com'), exp: Date.now() / 1000 + 600 };
  await e.page.goto(url + '#access_token=reset-token&refresh_token=x&type=recovery&expires_in=600');
  await e.page.waitForSelector('.signin');
  ok((await e.page.textContent('.si-sub')).includes('Choose a new password') && !(await e.page.url()).includes('access_token'), 'reset: the link opens the new-password form and clears the token from the address');
  await e.fill('password', 'a-new-password'); await e.fill('confirm', 'a-new-password'); await e.page.click('.si-go');
  await e.page.waitForSelector('.si-ok');
  const put = b.calls(/PUT \/auth\/v1\/user/);
  ok(put.length === 1 && put[0].auth === 'Bearer reset-token' && put[0].body.password === 'a-new-password' && b.users['mum@example.com'].password === 'a-new-password', 'reset: the password is set with the link token');
  ok((await e.ls('reading.auth')) === null, 'reset: no session is created by the link');
  await e.signIn('mum@example.com', 'a-new-password');
  await e.page.waitForSelector('.screen');
  ok(true, 'reset: signing in with the new password works');
  await e.ctx.close();
}

// ---- 6. session refresh ----
{
  const b = makeBackend({ ttl: 62 });
  b.addUser('mum@example.com', 'correct-horse', true);
  const d = await device(b, { seed: SEEDED });
  await d.open('#/home');
  await d.signIn('mum@example.com', 'correct-horse');
  await d.page.waitForSelector('.screen');
  const first = (await d.lsJson('reading.auth')).access_token;
  await d.page.waitForTimeout(3500); // refreshes 60 s before expiry: about 2 s after sign-in
  const r = b.calls(/POST \/auth\/v1\/token\?grant_type=refresh_token/);
  const second = (await d.lsJson('reading.auth')).access_token;
  ok(r.length >= 1 && second !== first && r[0].body.refresh_token.startsWith('rt-'), 'refresh: the session renews itself before it expires');
  await d.ctx.close();

  // an expired stored session is renewed at app start, before the pull
  const b2 = makeBackend();
  b2.addUser('mum@example.com', 'correct-horse', true);
  const e = await device(b2, { seed: SEEDED });
  await e.open('#/home'); await e.signIn('mum@example.com', 'correct-horse'); await e.page.waitForSelector('.screen');
  await e.page.evaluate(() => { const a = JSON.parse(localStorage.getItem('reading.auth')); a.expires_at = 5; localStorage.setItem('reading.auth', JSON.stringify(a)); });
  b2.log.length = 0;
  await e.page.reload(); await e.page.waitForSelector('.screen');
  const order = b2.log.map((l) => l.method + ' ' + l.path.split('?')[0]);
  ok(order[0] === 'POST /auth/v1/token' && order.some((o) => o === 'GET /rest/v1/progress') && (await e.page.locator('.signin').count()) === 0, 'refresh: an expired session is renewed at start, then pulled (' + order.join(', ') + ')');
  // a refused refresh token ends the session and shows the sign-in screen; the progress stays on the device
  await e.page.evaluate(() => { const a = JSON.parse(localStorage.getItem('reading.auth')); a.expires_at = 5; localStorage.setItem('reading.auth', JSON.stringify(a)); });
  b2.rejectRefresh = true;
  await e.page.reload(); await e.page.waitForSelector('.signin');
  ok((await e.ls('reading.auth')) === null && (await e.lsJson('reading.v1')).lessons[4].result === 'got-it', 'refresh: a refused token ends the session, progress kept');
  await e.ctx.close();
}

// ---- 7. sync: push after a lesson result, pull into a fresh device, newer wins, offline then online ----
{
  const b = makeBackend();
  b.addUser('mum@example.com', 'correct-horse', true);
  const uid = uidOf(b, 'mum@example.com');
  const A = await device(b, { seed: SEEDED });
  await A.open('#/home'); await A.signIn('mum@example.com', 'correct-horse'); await A.home(); await A.page.waitForTimeout(2600); // let Home's own saves settle
  ok(b.rows[uid] && !b.rows[uid].data.lessons[5], 'sync: the cloud starts with the uploaded progress (4 lessons)');
  // a lesson result through the real finish screen
  await A.page.goto(url + '#/lesson/5/finish'); await A.page.waitForSelector('.finish .got:not([disabled])', { timeout: 6000 });
  await A.page.waitForTimeout(2600); // let any push still pending from opening the finish screen go out first
  const pushesBefore = b.calls(/POST \/rest\/v1\/progress/).length;
  await A.page.click('.finish .got'); await A.page.waitForSelector('.finish .got:not([disabled])', { timeout: 6000 }); await A.page.click('.finish .got');
  await A.page.waitForSelector('.screen:not(.leaving) .path, .home, .screen', { timeout: 6000 });
  await A.page.waitForTimeout(500);
  ok(b.calls(/POST \/rest\/v1\/progress/).length === pushesBefore, 'sync: a push waits (debounced about 2 s), it does not fire at once');
  // (1.9.31: the finish screen returns to Home by itself, whose own saves restart the debounce, so wait for the uploads to settle)
  for (let t = 0, n = -1; t < 40; t++) { await A.page.waitForTimeout(250); const c = b.calls(/POST \/rest\/v1\/progress/).length; if (c === n && b.rows[uid].data.lessons[5] && t > 12) break; n = c; }
  const pushed = b.rows[uid].data;
  ok(b.calls(/POST \/rest\/v1\/progress/).length > pushesBefore && pushed.lessons[5] && pushed.lessons[5].result === 'got-it' && pushed.savedAt > 0, 'sync: the lesson result is pushed after the debounce, with savedAt');
  const last = b.calls(/POST \/rest\/v1\/progress/).pop();
  ok(last.path.includes('on_conflict=user_id') && last.body.user_id === uid && last.auth.startsWith('Bearer at-'), 'sync: an upsert for the signed-in user with the access token');
  // a fresh device takes the cloud copy
  const B = await device(b);
  await B.open('#/home');
  ok((await B.ls('reading.v1')) === null, 'fresh device: nothing on the device before signing in');
  await B.signIn('mum@example.com', 'correct-horse'); await B.home();
  const bs = await B.lsJson('reading.v1');
  ok(bs.lessons[5] && bs.lessons[5].result === 'got-it' && bs.firstRunDone === true && bs.savedAt === pushed.savedAt, 'fresh device: takes the cloud copy on sign-in');
  ok(b.calls(/POST \/rest\/v1\/progress/).length === pushesBefore + 1, 'fresh device: nothing is pushed back');
  // newer wins: B changes a setting, A (older) reloads and takes it
  await B.grownups();
  await B.page.click('[data-perday="1"]');
  await B.page.waitForTimeout(2600);
  ok(b.rows[uid].data.settings.perDay === 1, 'newer wins: B pushed its change');
  await A.page.goto(url + '#/home'); await A.page.reload(); await A.home();
  ok((await A.lsJson('reading.v1')).settings.perDay === 1, 'newer wins: A (older copy) takes the cloud copy on start');
  // older cloud loses: put an old copy in the cloud and reload A, which holds the later one
  b.rows[uid].data = { ...b.rows[uid].data, savedAt: 1000, settings: { ...b.rows[uid].data.settings, perDay: 3 } };
  const n0 = b.calls(/POST \/rest\/v1\/progress/).length;
  await A.page.reload(); await A.home(); await A.page.waitForTimeout(300);
  ok((await A.lsJson('reading.v1')).settings.perDay === 1 && b.calls(/POST \/rest\/v1\/progress/).length === n0 + 1 && b.rows[uid].data.settings.perDay === 1, 'newer wins: the later local copy overwrites an older cloud copy');
  // offline: the change waits, comes back online, pushes
  await A.grownups();
  b.offline = true;
  const off0 = b.calls(/POST \/rest\/v1\/progress/).length;
  await A.page.click('[data-perday="2"]');
  await A.page.waitForTimeout(2800);
  ok(b.calls(/POST \/rest\/v1\/progress/).length === off0 + 1 && b.rows[uid].data.settings.perDay === 1, 'offline: a push was tried and failed, the cloud is unchanged');
  ok((await A.lsJson('reading.v1')).settings.perDay === 2, 'offline: the change is kept on the device');
  b.offline = false;
  await A.page.evaluate(() => window.dispatchEvent(new Event('online')));
  await A.page.waitForTimeout(900);
  ok(b.rows[uid].data.settings.perDay === 2, 'online again: the waiting change is pushed');
  ok(A.bad().length === 0 && B.bad().length === 0, 'sync: no errors ' + A.bad().concat(B.bad()).join('|'));
  await A.ctx.close(); await B.ctx.close();
}

// ---- 8. Grownups Account section, Sync now, sign out ----
{
  const b = makeBackend();
  b.addUser('mum@example.com', 'correct-horse', true);
  const uid = uidOf(b, 'mum@example.com');
  const d = await device(b, { seed: SEEDED });
  await d.open('#/home'); await d.signIn('mum@example.com', 'correct-horse'); await d.home();
  await d.grownups();
  const sec = d.page.locator('[data-section=account]');
  ok((await sec.count()) === 1 && /mum@example\.com/.test(await sec.textContent()) && /Last synced/.test(await sec.textContent()), 'Grownups: the Account section shows the email and last synced');
  ok((await sec.locator('[data-acct=sync]').count()) === 1 && (await sec.locator('[data-acct=signout]').count()) === 1 && (await sec.locator('[data-acct=delete]').count()) === 1, 'Grownups: Sync now, Sign out and Delete account are there');
  const g0 = b.calls(/GET \/rest\/v1\/progress/).length;
  await sec.locator('[data-acct=sync]').scrollIntoViewIfNeeded(); await sec.locator('[data-acct=sync]').click();
  await d.page.waitForFunction(() => /Synced\./.test(document.querySelector('[data-section=account]').textContent));
  ok(b.calls(/GET \/rest\/v1\/progress/).length === g0 + 1, 'Sync now pulls');
  if (SHOTS) { await sec.scrollIntoViewIfNeeded(); await d.page.screenshot({ path: path.join(SHOT_DIR, 'grownups-account-390x844.png') }); }
  // a change, then Sign out: the last progress is uploaded first, then this device is cleared
  await d.page.click('[data-perday="3"]');
  const logout0 = b.calls(/POST \/auth\/v1\/logout/).length;
  await sec.locator('[data-acct=signout]').click();
  await d.page.waitForSelector('.signin');
  ok(b.rows[uid].data.settings.perDay === 3, 'sign out: the latest progress was uploaded first');
  ok(b.calls(/POST \/auth\/v1\/logout/).length === logout0 + 1, 'sign out: the logout call was made');
  ok((await d.ls('reading.v1')) === null || (await d.lsJson('reading.v1')).firstRunDone === false && Object.keys((await d.lsJson('reading.v1')).lessons).length === 0, 'sign out: the progress is cleared from the device');
  ok((await d.ls('reading.auth')) === null, 'sign out: the session is gone');
  // sign out while offline with unsynced changes: stops, offers "Sign out anyway"
  await d.signIn('mum@example.com', 'correct-horse'); await d.home();
  ok((await d.lsJson('reading.v1')).lessons[4].result === 'got-it', 'sign back in: the progress comes back from the cloud');
  await d.grownups();
  await d.page.click('[data-perday="1"]'); // dirty, push is 2 s away
  b.offline = true;
  await d.page.locator('[data-acct=signout]').click();
  await d.page.waitForSelector('[data-acct=force]');
  ok(/could not be saved/.test(await d.page.textContent('.gu-acct-msg')) && (await d.lsJson('reading.v1')).settings.perDay === 1, 'sign out offline: stops with a message and keeps the progress');
  await d.page.locator('[data-acct=force]').click();
  await d.page.waitForSelector('.signin');
  ok((await d.ls('reading.auth')) === null, 'sign out anyway: signed out');
  ok(d.bad().length === 0, 'account section: no errors ' + d.bad().join('|'));
  await d.ctx.close();
}

// ---- 9. delete account ----
{
  const b = makeBackend();
  b.addUser('mum@example.com', 'correct-horse', true);
  const uid = uidOf(b, 'mum@example.com');
  const d = await device(b, { seed: SEEDED });
  await d.open('#/home'); await d.signIn('mum@example.com', 'correct-horse'); await d.home();
  await d.grownups();
  await d.page.locator('[data-acct=delete]').scrollIntoViewIfNeeded(); await d.page.click('[data-acct=delete]');
  const go = d.page.locator('[data-acct=delete-go]');
  ok((await go.isDisabled()) && (await d.page.locator('.gu-confirm').count()) === 1, 'delete: a confirm step with the button disabled');
  await d.page.fill('[data-acct=delete-input]', 'delete');
  ok(await go.isDisabled(), 'delete: lower case "delete" does not unlock it');
  await d.page.fill('[data-acct=delete-input]', 'DELET'); ok(await go.isDisabled(), 'delete: "DELET" does not unlock it');
  ok(b.calls(/rpc\/delete_my_account/).length === 0, 'delete: nothing called yet');
  await d.page.fill('[data-acct=delete-input]', 'DELETE');
  ok(!(await go.isDisabled()), 'delete: typing DELETE unlocks it');
  if (SHOTS) { await d.page.locator('.gu-confirm').scrollIntoViewIfNeeded(); await d.page.screenshot({ path: path.join(SHOT_DIR, 'delete-confirm-390x844.png') }); }
  await go.click();
  await d.page.waitForSelector('.signin');
  const rpc = b.calls(/POST \/rest\/v1\/rpc\/delete_my_account/);
  ok(rpc.length === 1 && rpc[0].auth.startsWith('Bearer at-'), 'delete: the RPC was called with the user token');
  ok(!b.rows[uid] && !b.users['mum@example.com'], 'delete: the cloud row and the user are gone');
  ok((await d.ls('reading.auth')) === null && ((await d.ls('reading.v1')) === null || Object.keys((await d.lsJson('reading.v1')).lessons).length === 0), 'delete: local data cleared');
  await d.signIn('mum@example.com', 'correct-horse');
  await d.page.waitForFunction(() => document.querySelector('.si-error').textContent.length > 0);
  ok(/don't match/.test(await d.err()), 'delete: the account can no longer sign in');
  await d.ctx.close();
}

// ---- 10. developer bypass ----
{
  const b = makeBackend();
  const d = await device(b, { seed: SEEDED });
  await d.open('#/home');
  const tap = (n) => d.page.evaluate((k) => { const el = document.querySelector('.si-version'); for (let i = 0; i < k; i++) el.click(); }, n);
  await tap(6); await d.page.waitForTimeout(300);
  ok((await d.page.locator('.signin').count()) === 1, 'developer bypass: six taps do nothing');
  await tap(1);
  await d.page.waitForSelector('.screen');
  ok((await d.lsJson('reading.v1')).settings.dev === true && (await d.ls('reading.auth')) === null && b.log.length === 0, 'developer bypass: seven taps set developer mode, no account, no network');
  await d.home(); await d.grownups();
  ok(/Not signed in/.test(await d.page.textContent('[data-section=account]')), 'developer bypass: Grownups says not signed in');
  await d.page.reload(); await d.page.waitForSelector('.screen');
  ok((await d.page.locator('.signin').count()) === 0, 'developer mode: the next start skips the sign-in screen');
  await d.ctx.close();
  // taps spread over more than 3 s do not count
  const e = await device(b, { seed: SEEDED });
  await e.open('#/home');
  for (let i = 0; i < 7; i++) { await e.page.evaluate(() => document.querySelector('.si-version').click()); await e.page.waitForTimeout(600); }
  ok((await e.page.locator('.signin').count()) === 1, 'developer bypass: seven slow taps (over 3 s) do nothing');
  await e.ctx.close();
}

// ---- 11. native builds behave the same ----
{
  const b = makeBackend();
  b.addUser('mum@example.com', 'correct-horse', true);
  const d = await device(b, { seed: SEEDED });
  await d.page.addInitScript(`window.Capacitor = { isNativePlatform: () => true };`);
  await d.open('#/home');
  ok((await d.page.locator('.signin').count()) === 1, 'native: the sign-in screen shows too');
  await d.signIn('mum@example.com', 'correct-horse'); await d.page.waitForSelector('.screen');
  ok((await d.lsJson('reading.auth')).user.email === 'mum@example.com', 'native: sign in works');
  await d.ctx.close();
}

// ---- 12. only the Supabase origin, never cached ----
{
  const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
  ok(/url\.origin !== self\.origin[^\n]*return;/.test(sw) && /\(auth\|rest\)\\\/v1/.test(sw), 'sw.js: other origins and /auth, /rest calls are left to the network');
  ok(!/supabase\.(co|test)/i.test(sw), 'sw.js: no Supabase address cached');
  const code = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/\/\/.*$/gm, ''); // without comments
  const acct = code('js/account.js');
  ok(!/(local|session)Storage|reading\.v1/.test(acct) && !/(local|session)Storage/.test(code('js/screens/signin.js')), 'account code never touches storage or reading.v1 directly (only the store seam)');
  ok(backend.other.length === 0, 'configured runs: no request left for any other origin ' + backend.other.join(','));
}

// ---- 9. Sign in with Google (Supabase OAuth, PKCE) ----
{
  const email = 'mum@gmail.example';
  const mk = () => { const b = makeBackend(); b.addUser(email, null, true, 'google'); return b; };
  const configSrc = fs.readFileSync(path.join(ROOT, 'js/config.js'), 'utf8');
  ok(/OAUTH_PROVIDERS = \['google'\]/.test(configSrc), 'config: OAUTH_PROVIDERS lists google');
  ok(!/sb_secret_|eyJ[A-Za-z0-9_-]{20,}/.test(configSrc) && /SUPABASE_ANON_KEY = 'sb_publishable_/.test(configSrc), 'config: a publishable key and no secret key');

  // the button shows only for providers that are listed
  {
    const b = mk();
    const none = await device(b, { providers: [] });
    await none.open('#/home');
    ok((await none.page.locator('.si-google').count()) === 0 && (await none.page.locator('.si-or').count()) === 0, 'google: no button and no divider when google is not in the providers');
    await none.ctx.close();
    const g = await device(b, { providers: ['google'], seed: SEEDED });
    await g.open('#/home');
    const info = await g.page.evaluate(() => {
      const btn = document.querySelector('.si-google'), r = btn.getBoundingClientRect(), form = document.querySelector('.si-form');
      return { text: btn.textContent.trim(), h: r.height, w: r.width, bg: getComputedStyle(btn).backgroundColor, paths: btn.querySelectorAll('svg path').length, fills: [...btn.querySelectorAll('svg path')].map((x) => x.getAttribute('fill')).join(), before: !!(btn.compareDocumentPosition(form) & Node.DOCUMENT_POSITION_FOLLOWING), or: document.querySelector('.si-or').textContent.trim(), off: r.left < 0 || r.right > innerWidth };
    });
    ok(info.text === 'Continue with Google' && info.h >= 48 && info.bg === 'rgb(255, 255, 255)' && info.paths === 4 && info.fills === '#EA4335,#4285F4,#FBBC05,#34A853' && info.before && info.or === 'or use your email' && !info.off, 'google: white 48 px+ button, four-colour G, text, above the form with the divider ' + JSON.stringify(info));
    await g.mode('signup');
    ok((await g.page.locator('.si-google').count()) === 1, 'google: the button is also on the Create account tab');
    await g.mode('signin');
    ok((await g.page.locator('.si-link[data-mode=forgot]').count()) === 1, 'google: the email form is still there');

    // tap: PKCE verifier stored, navigation to the authorize URL
    await g.page.click('.si-google');
    for (let t = 0; t < 50 && !b.authorize.length; t++) await g.page.waitForTimeout(100);
    ok(b.authorize.length === 1, 'google tap: navigated to the authorize endpoint');
    const au = new URL(b.authorize[0]);
    const challenge = au.searchParams.get('code_challenge');
    ok(au.pathname === '/auth/v1/authorize' && au.searchParams.get('provider') === 'google' && au.searchParams.get('redirect_to') === 'https://app.choochootraining.com/' && au.searchParams.get('code_challenge_method') === 's256' && /^[A-Za-z0-9_-]{43}$/.test(challenge), 'google tap: provider, redirect_to, S256 challenge ' + b.authorize[0]);
    ok(b.authorizeNav === true && b.log.find((l) => l.path.startsWith('/auth/v1/authorize')).auth === undefined, 'google tap: a top-level page navigation, not a fetch');
    await g.page.goto(url + '?probe=1'); await g.page.waitForSelector('.signin');
    const verifier = await g.page.evaluate(() => sessionStorage.getItem('reading.pkce'));
    ok(verifier && /^[A-Za-z0-9_-]{43,128}$/.test(verifier) && b64url(crypto.createHash('sha256').update(verifier).digest()) === challenge, 'google tap: the stored verifier hashes to the challenge');

    // the return: ?code=X is exchanged with that verifier, the session saved, the address cleaned, the app opened, progress uploaded
    b.codes['good-code'] = b.users[email];
    b.log.length = 0;
    await g.page.goto(url + '?code=good-code');
    await g.page.waitForSelector('.screen'); await g.page.waitForTimeout(800);
    const px = b.calls(/POST \/auth\/v1\/token\?grant_type=pkce/);
    ok(px.length === 1 && px[0].body.auth_code === 'good-code' && px[0].body.code_verifier === verifier && px[0].auth === undefined && px[0].apikey === 'anon-key-for-tests', 'google return: one pkce exchange with the code and the stored verifier, no Authorization header');
    ok(!g.page.url().includes('code='), 'google return: code removed from the address bar ' + g.page.url());
    const auth = await g.lsJson('reading.auth');
    ok(auth && auth.user.email === email && auth.user.provider === 'google' && auth.access_token && auth.refresh_token, 'google return: session saved with the google provider');
    ok((await g.page.evaluate(() => sessionStorage.getItem('reading.pkce') || localStorage.getItem('reading.pkce'))) === null, 'google return: the verifier is cleared');
    ok((await g.page.locator('.signin').count()) === 0, 'google return: the app opens');
    for (let t = 0; t < 50 && !b.rows[b.users[email].id]; t++) await g.page.waitForTimeout(100);
    ok(b.calls(/GET \/rest\/v1\/progress/).length >= 1 && !!b.rows[b.users[email].id] && b.rows[b.users[email].id].data.lessons[4].result === 'got-it', 'google return: the sync ran and uploaded progress to the empty cloud');
    ok(b.calls(/\/rest\/v1\//).every((l) => /^Bearer at-/.test(l.auth)), 'google return: data calls carry the user token');

    // Grownups
    await g.grownups();
    const sec = g.page.locator('[data-section=account]');
    const txt = await sec.textContent();
    ok(/Signed in with Google/.test(txt) && txt.includes(email) && !/password/i.test(txt) && (await sec.locator('[data-acct=signout]').count()) === 1 && (await sec.locator('[data-acct=delete]').count()) === 1, 'Grownups: Signed in with Google, no password options, Sign out and Delete there');
    if (SHOTS) { await sec.scrollIntoViewIfNeeded(); await g.page.screenshot({ path: path.join(SHOT_DIR, 'grownups-google-390x844.png') }); }
    // the provider survives a reload (restored session) and a token refresh
    await g.page.reload(); await g.grownups();
    ok(/Signed in with Google/.test(await g.page.locator('[data-section=account]').textContent()), 'Grownups: still Signed in with Google after a reload');
    ok(g.bad().length === 0, 'google: no errors ' + g.bad().join('|'));
    await g.ctx.close();
  }

  // errors on the way back
  for (const [label, suffix] of [['query error', '?error=access_denied&error_code=bad_oauth_callback&error_description=Unable+to+exchange'], ['hash error', '#error=server_error&error_description=oops'], ['bad code', '?code=never-issued'], ['code but no verifier', '?code=orphan']]) {
    const b = mk();
    const d = await device(b, { providers: ['google'], seed: SEEDED });
    if (label === 'bad code') { await d.open(''); await d.page.evaluate(() => sessionStorage.setItem('reading.pkce', 'v'.repeat(43))); }
    await d.page.goto(url + suffix); await d.page.waitForSelector('.signin');
    const msg = (await d.page.textContent('.si-gerror')).trim();
    ok(msg === "Google sign-in didn't finish. Please try again.", `google ${label}: friendly message (${msg})`);
    ok(!/error|code=/.test(d.page.url()) && (await d.ls('reading.auth')) === null && (await d.page.locator('.si-google').count()) === 1, `google ${label}: address cleaned, no session, button still there ${d.page.url()}`);
    ok(d.bad().length === 0, `google ${label}: no errors ` + d.bad().join('|'));
    await d.ctx.close();
  }

  // an expired reset link keeps its own message
  {
    const b = mk();
    const d = await device(b, { providers: ['google'] });
    await d.page.goto(url + '#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired'); await d.page.waitForSelector('.signin');
    ok(/link has expired/i.test(await d.page.textContent('.si-ok')) && (await d.page.textContent('.si-gerror')).trim() === '', 'an expired reset link still says the link expired');
    await d.ctx.close();
  }

  // the implicit fallback: tokens in the hash, not a recovery link
  {
    const b = mk();
    const us = b.users[email];
    b.tokens['at-implicit'] = { id: us.id, exp: Date.now() / 1000 + 3600 };
    const d = await device(b, { providers: ['google'], seed: SEEDED });
    await d.page.goto(url + '#access_token=at-implicit&refresh_token=rt-implicit&expires_in=3600&token_type=bearer');
    await d.page.waitForSelector('.screen'); await d.page.waitForTimeout(600);
    const auth = await d.lsJson('reading.auth');
    ok(auth && auth.access_token === 'at-implicit' && auth.refresh_token === 'rt-implicit' && auth.user.email === email && auth.user.provider === 'google', 'implicit hash: the session is saved with the looked-up user');
    ok(!d.page.url().includes('access_token') && (await d.page.locator('.signin').count()) === 0 && b.calls(/PUT \/auth\/v1\/user/).length === 0, 'implicit hash: tokens removed from the address, app opens, not treated as a password reset');
    ok(b.calls(/GET \/auth\/v1\/user/).length === 1 && b.calls(/GET \/auth\/v1\/user/)[0].auth === 'Bearer at-implicit', 'implicit hash: the user is read with the new token');
    ok(d.bad().length === 0, 'implicit hash: no errors ' + d.bad().join('|'));
    await d.ctx.close();
  }

  // accounts stay OFF on localhost unless a test turns them on (so every other suite runs without the sign-in gate)
  {
    const b = mk();
    const d = await device(b, { config: false, seed: SEEDED });
    await d.open('#/home');
    ok((await d.page.locator('.signin').count()) === 0 && b.log.length === 0, 'localhost: the real config is ignored by default (accounts off)');
    await d.ctx.close();
    const e = await device(b, { config: false });
    await e.page.goto(url + '?accounts=1'); await e.page.waitForSelector('.signin');
    ok((await e.page.locator('.si-google').count()) === 1, 'localhost: ?accounts=1 turns the real config on (sign-in gate and Google button)');
    await e.ctx.close();
  }
}

// ---- screenshots (--shots) ----
if (SHOTS) {
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  for (const vp of [{ name: '390x844', width: 390, height: 844 }, { name: '915x412', width: 915, height: 412 }]) {
    const b = makeBackend({ confirm: true });
    const d = await device(b, { providers: ['google'], vp: { ...vp, deviceScaleFactor: 2 } });
    await d.open('#/home'); await d.page.waitForTimeout(500);
    await d.page.screenshot({ path: path.join(SHOT_DIR, `sign-in-${vp.name}.png`) });
    await d.mode('signup'); await d.fill('email', 'mum@example.com'); await d.fill('password', 'correct-horse'); await d.fill('confirm', 'correct-horse');
    await d.page.screenshot({ path: path.join(SHOT_DIR, `create-account-${vp.name}.png`) });
    await d.mode('signin'); await d.page.click('.si-link[data-mode=forgot]'); await d.fill('email', 'mum@example.com');
    await d.page.screenshot({ path: path.join(SHOT_DIR, `forgot-password-${vp.name}.png`) });
    await d.page.click('.si-go'); await d.page.waitForSelector('.si-note');
    await d.page.screenshot({ path: path.join(SHOT_DIR, `check-your-email-${vp.name}.png`) });
    await d.ctx.close();
    if (vp.name === '915x412') {
      const b2 = makeBackend(); b2.addUser('mum@example.com', 'correct-horse', true);
      const e = await device(b2, { seed: SEEDED, vp: { ...vp, deviceScaleFactor: 2 } });
      await e.open('#/home'); await e.signIn('mum@example.com', 'correct-horse'); await e.home(); await e.grownups();
      const sec = e.page.locator('[data-section=account]'); await sec.scrollIntoViewIfNeeded();
      await e.page.screenshot({ path: path.join(SHOT_DIR, `grownups-account-${vp.name}.png`) });
      await e.page.click('[data-acct=delete]'); await e.page.fill('[data-acct=delete-input]', 'DELETE');
      await e.page.locator('.gu-confirm').scrollIntoViewIfNeeded();
      await e.page.screenshot({ path: path.join(SHOT_DIR, `delete-confirm-${vp.name}.png`) });
      await e.ctx.close();
    }
  }
}

await browser.close(); server.close();
console.log(`account: ${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
