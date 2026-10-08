// Grown-up accounts: email + password through Supabase Auth, called with fetch (no SDK, no remote script), and an
// offline-first copy of the whole progress state in one cloud row. Inert until js/config.js is filled in.
// Local progress (reading.v1) stays the source of truth; the cloud is a copy. Auth code never writes reading.v1:
// only sync does (store.adopt on a pull). Details and setup: docs/BACKEND.md.
import { SUPABASE_URL, SUPABASE_ANON_KEY, SITE_URL, OAUTH_PROVIDERS } from './config.js';
import { authStore, pkceStore } from './store.js';
import { isNative } from './platform.js';

// Test hooks, on localhost only (production ignores them all). Accounts are OFF on localhost by default, so the test suites and
// local work run without the sign-in gate even though js/config.js is filled in. Turn them on with either
//   window.__config = { url, key, providers? }  (set before load; a fake project, as test/account.mjs does), or
//   ?accounts=1 in the address (the real js/config.js values).
const local = ['localhost', '127.0.0.1'].includes(location.hostname);
export const getConfig = () => {
  let t = null, real = !local;
  if (local) {
    if (window.__config && typeof window.__config === 'object') t = window.__config;
    else { try { real = new URLSearchParams(location.search).get('accounts') === '1'; } catch { real = false; } }
  }
  const url = String((t ? t.url : real ? SUPABASE_URL : '') || '').replace(/\/+$/, '');
  const key = String((t ? t.key : real ? SUPABASE_ANON_KEY : '') || '');
  const providers = (t && Array.isArray(t.providers) ? t.providers : OAUTH_PROVIDERS).filter((p) => p === 'google');
  return url && key ? { url, key, providers } : null;
};

const PUSH_DELAY = 2000; // ms after the last change
const REFRESH_EARLY = 60; // seconds before expiry
export const MIN_PASSWORD = 8;

export class AccountError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

const MESSAGES = {
  offline: 'No internet connection. Please connect and try again.',
  invalid_credentials: "That email and password don't match. Please try again.",
  email_in_use: 'That email already has an account. Try signing in instead.',
  weak_password: `Please choose a password with at least ${MIN_PASSWORD} characters.`,
  rate_limit: 'Too many tries. Please wait a minute and try again.',
  bad_email: 'Please check the email address.',
  generic: 'Something went wrong. Please try again.',
  oauth: "Google sign-in didn't finish. Please try again.",
};
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function createAccount({ store, fetchImpl } = {}) {
  const cfg = getConfig();
  const doFetch = (...a) => (fetchImpl || fetch)(...a);
  const listeners = new Set();
  let session = null; // {access_token, refresh_token, expires_at (s), user:{id,email}}
  const meta = { lastSync: null }; // saved with the session
  let refreshTimer = null, pushTimer = null, retryTimer = null;
  let dirty = false, syncing = false, unsub = null, lastError = null, refreshing = null;

  const emit = (type) => { for (const fn of listeners) { try { fn(type); } catch { /* never break the caller */ } } };
  const persist = () => { if (session) authStore.write({ ...session, lastSync: meta.lastSync }); };

  // ---- the REST calls ----
  async function api(path, { method = 'GET', body, token: bearer, headers = {} } = {}) {
    let res;
    try {
      // Only a signed-in call carries Authorization (the user's token). The new publishable keys are not JWTs, so they go in apikey alone.
      res = await doFetch(cfg.url + path, { method, headers: { apikey: cfg.key, ...(bearer ? { Authorization: 'Bearer ' + bearer } : {}), 'Content-Type': 'application/json', Accept: 'application/json', ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
    } catch { throw new AccountError('offline', MESSAGES.offline); }
    let data = null;
    const text = await res.text().catch(() => '');
    if (text) { try { data = JSON.parse(text); } catch { data = null; } }
    if (!res.ok) throw toError(res.status, data);
    return data;
  }
  function toError(status, d) {
    const code = String((d && (d.error_code || d.code)) || '');
    const msg = String((d && (d.msg || d.message || d.error_description || d.error)) || '');
    if (code === 'email_not_confirmed' || /not confirmed/i.test(msg)) return new AccountError('email_not_confirmed', 'Please check your email and tap the link first.');
    if (code === 'invalid_credentials' || /invalid login credentials/i.test(msg)) return new AccountError('invalid_credentials', MESSAGES.invalid_credentials);
    if (code === 'user_already_exists' || /already registered/i.test(msg)) return new AccountError('email_in_use', MESSAGES.email_in_use);
    if (code === 'weak_password' || /password should be/i.test(msg)) return new AccountError('weak_password', MESSAGES.weak_password);
    if (status === 429 || /rate.?limit/i.test(code + msg)) return new AccountError('rate_limit', MESSAGES.rate_limit);
    if (/invalid.*email|email.*invalid|unable to validate email/i.test(code + msg)) return new AccountError('bad_email', MESSAGES.bad_email);
    if (status === 401 || status === 403) return new AccountError('unauthorized', MESSAGES.generic);
    return new AccountError('generic', MESSAGES.generic);
  }

  // ---- the session ----
  function setSession(tok) {
    const expiresAt = tok.expires_at && tok.expires_at > 1e9 ? tok.expires_at : Math.floor(Date.now() / 1000) + (Number(tok.expires_in) || 3600);
    const u = tok.user || {};
    const provider = (u.app_metadata && u.app_metadata.provider) || u.provider || null;
    session = { access_token: tok.access_token, refresh_token: tok.refresh_token, expires_at: expiresAt, user: { id: u.id, email: u.email, ...(provider ? { provider } : {}) } };
    persist();
    scheduleRefresh();
  }
  function scheduleRefresh() {
    clearTimeout(refreshTimer);
    if (!session) return;
    const ms = Math.max(1000, (session.expires_at - REFRESH_EARLY) * 1000 - Date.now());
    refreshTimer = setTimeout(() => { refresh().catch(() => {}); }, Math.min(ms, 2 ** 31 - 1));
  }
  // Renew the tokens. Offline: keep the session and try again later. A refused refresh token ends the session (progress stays).
  function refresh() {
    if (!session) return Promise.resolve(false);
    if (refreshing) return refreshing;
    refreshing = (async () => {
      try {
        const tok = await api('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: session.refresh_token } });
        setSession({ ...tok, user: tok.user || session.user });
        return true;
      } catch (e) {
        if (e.code === 'offline') { clearTimeout(refreshTimer); refreshTimer = setTimeout(() => refresh().catch(() => {}), 30000); throw e; }
        endSession(); emit('session');
        throw e;
      } finally { refreshing = null; }
    })();
    return refreshing;
  }
  async function token() {
    if (!session) throw new AccountError('unauthorized', MESSAGES.generic);
    if (session.expires_at - REFRESH_EARLY <= Date.now() / 1000) await refresh();
    return session.access_token;
  }
  function endSession() {
    clearTimeout(refreshTimer); clearTimeout(pushTimer); clearTimeout(retryTimer);
    if (unsub) { unsub(); unsub = null; }
    session = null; dirty = false; authStore.clear();
  }
  function watchStore() {
    if (unsub || !session) return;
    unsub = store.subscribe(() => { dirty = true; schedulePush(PUSH_DELAY); emit('sync'); });
  }

  // ---- sign up, sign in, forgot password, sign out, delete ----
  function checkCreds(email, password) {
    if (!EMAIL_RE.test(email)) throw new AccountError('bad_email', MESSAGES.bad_email);
    if (typeof password !== 'string' || password.length < MIN_PASSWORD) throw new AccountError('weak_password', MESSAGES.weak_password);
  }
  async function signUp(email, password, confirm) {
    email = String(email || '').trim();
    checkCreds(email, password);
    if (password !== confirm) throw new AccountError('mismatch', 'The two passwords are not the same.');
    const r = await api('/auth/v1/signup', { method: 'POST', body: { email, password } });
    if (r && r.access_token) { setSession(r); await afterSignIn(); return { state: 'signed-in' }; }
    // An address that already has an account comes back as a user with no identities (Supabase hides it on purpose).
    if (r && Array.isArray(r.identities) && r.identities.length === 0) throw new AccountError('email_in_use', MESSAGES.email_in_use);
    return { state: 'check-email', email };
  }
  async function signIn(email, password) {
    email = String(email || '').trim();
    if (!email || !password) throw new AccountError('invalid_credentials', MESSAGES.invalid_credentials);
    const tok = await api('/auth/v1/token?grant_type=password', { method: 'POST', body: { email, password } });
    setSession(tok);
    await afterSignIn();
    return { state: 'signed-in' };
  }
  // ---- Sign in with Google (Supabase OAuth, PKCE) ----
  const b64url = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  // Make a verifier + S256 challenge, keep the verifier for the return trip, and go to Supabase, which sends the grown-up to Google.
  async function signInWithProvider(provider) {
    if (!cfg.providers.includes(provider)) throw new AccountError('generic', MESSAGES.generic);
    const verifier = b64url(crypto.getRandomValues(new Uint8Array(48)));
    const challenge = b64url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))));
    pkceStore.write(verifier);
    location.assign(`${cfg.url}/auth/v1/authorize?provider=${encodeURIComponent(provider)}&redirect_to=${encodeURIComponent(SITE_URL)}&code_challenge=${challenge}&code_challenge_method=s256`);
  }
  // Back from Google: ?code=... (PKCE) is traded for a session. Throws if it cannot be (the caller shows the friendly message).
  async function completeOAuthCode(code) {
    const verifier = pkceStore.read();
    pkceStore.clear();
    if (!verifier || !code) throw new AccountError('oauth', MESSAGES.oauth);
    let tok;
    try { tok = await api('/auth/v1/token?grant_type=pkce', { method: 'POST', body: { auth_code: code, code_verifier: verifier } }); } catch (e) { throw e.code === 'offline' ? e : new AccountError('oauth', MESSAGES.oauth); }
    if (!tok || !tok.access_token) throw new AccountError('oauth', MESSAGES.oauth);
    setSession(tok);
    await afterSignIn();
  }
  // The older implicit return: tokens in the address hash. The user is looked up with the new access token.
  async function completeOAuthTokens({ access_token, refresh_token, expires_in, expires_at }) {
    if (!access_token || !refresh_token) throw new AccountError('oauth', MESSAGES.oauth);
    let user;
    try { user = await api('/auth/v1/user', { token: access_token }); } catch (e) { throw e.code === 'offline' ? e : new AccountError('oauth', MESSAGES.oauth); }
    if (!user || !user.id) throw new AccountError('oauth', MESSAGES.oauth);
    setSession({ access_token, refresh_token, expires_in, expires_at: Number(expires_at) || 0, user });
    await afterSignIn();
  }
  async function afterSignIn() {
    watchStore(); emit('session');
    try { await pull(); } catch { /* offline: it syncs later */ }
  }
  async function forgot(email) {
    email = String(email || '').trim();
    if (!EMAIL_RE.test(email)) throw new AccountError('bad_email', MESSAGES.bad_email);
    const redirect = isNative ? SITE_URL : (local ? location.origin + location.pathname : SITE_URL);
    await api('/auth/v1/recover?redirect_to=' + encodeURIComponent(redirect), { method: 'POST', body: { email } });
    return { state: 'sent', email };
  }
  // The reset link lands on the app with #access_token=..&type=recovery. This sets the new password with that one-time token.
  async function resetPassword(accessToken, password, confirm) {
    if (typeof password !== 'string' || password.length < MIN_PASSWORD) throw new AccountError('weak_password', MESSAGES.weak_password);
    if (password !== confirm) throw new AccountError('mismatch', 'The two passwords are not the same.');
    await api('/auth/v1/user', { method: 'PUT', token: accessToken, body: { password } });
  }
  // Sign out: one last sync, then this device forgets the progress (so the next grown-up does not see it).
  // If that last sync fails (offline) the progress would be lost, so it stops with an error unless force is true.
  async function signOut({ force = false } = {}) {
    if (session && !force) {
      clearTimeout(pushTimer);
      if (dirty || !meta.lastSync) { try { await push(); } catch (e) { throw new AccountError(e.code === 'offline' ? 'unsynced_offline' : 'unsynced', 'The latest progress could not be saved to the account.'); } }
    }
    if (session) { api('/auth/v1/logout', { method: 'POST', token: session.access_token }).catch(() => {}); }
    endSession(); store.clearLocal(); emit('session');
  }
  async function deleteAccount() {
    await api('/rest/v1/rpc/delete_my_account', { method: 'POST', token: await token(), body: {} });
    endSession(); store.clearLocal(); emit('session');
  }

  // ---- sync ----
  async function push() {
    if (!session) return;
    const t = await token();
    const data = JSON.parse(JSON.stringify(store.state));
    syncing = true; emit('sync');
    try {
      await api('/rest/v1/progress?on_conflict=user_id', { method: 'POST', token: t, headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: { user_id: session.user.id, data, updated_at: new Date().toISOString() } });
      if (store.state.savedAt === data.savedAt) dirty = false;
      meta.lastSync = Date.now(); lastError = null; persist();
    } catch (e) { lastError = e.code; throw e; } finally { syncing = false; emit('sync'); }
  }
  // Pull: the cloud copy against this one. A fresh device takes the cloud; otherwise the later savedAt wins;
  // an empty cloud gets this device's progress.
  async function pull() {
    if (!session) return;
    const t = await token();
    syncing = true; emit('sync');
    try {
      const rows = await api(`/rest/v1/progress?select=data,updated_at&user_id=eq.${encodeURIComponent(session.user.id)}`, { token: t });
      const row = Array.isArray(rows) ? rows[0] : null;
      const cloud = row && row.data && typeof row.data === 'object' && row.data.schema === 1 ? row.data : null;
      const cs = cloud ? Number(cloud.savedAt) || 0 : 0;
      if (!cloud) {
        if (!store.isFresh()) await push();
      } else if (store.isFresh() || cs > (store.state.savedAt || 0)) {
        store.adopt(cloud); emit('adopted');
      } else if (cs < (store.state.savedAt || 0)) {
        await push();
      }
      meta.lastSync = Date.now(); lastError = null; persist();
    } catch (e) { lastError = e.code; throw e; } finally { syncing = false; emit('sync'); }
  }
  function schedulePush(ms) {
    clearTimeout(pushTimer); clearTimeout(retryTimer);
    if (!session) return;
    pushTimer = setTimeout(async () => {
      if (!dirty || !session) return;
      if (navigator.onLine === false) return; // the online event brings it back
      try { await push(); } catch (e) { if (e.code === 'offline') retryTimer = setTimeout(() => schedulePush(0), 30000); }
    }, ms);
  }
  async function syncNow() {
    if (!session) throw new AccountError('unauthorized', MESSAGES.generic);
    clearTimeout(pushTimer);
    await pull();
    if (dirty) await push();
  }

  // ---- start: restore the session, renew it, pull ----
  async function start() {
    if (!cfg) return;
    addEventListener('online', () => { if (session) { if (dirty) schedulePush(0); else pull().catch(() => {}); } });
    const saved = session ? null : authStore.read(); // a session already made by the Google return needs no restore
    if (saved && saved.access_token && saved.refresh_token && saved.user && saved.user.id) {
      session = { access_token: saved.access_token, refresh_token: saved.refresh_token, expires_at: saved.expires_at || 0, user: saved.user };
      meta.lastSync = saved.lastSync || null;
      watchStore(); scheduleRefresh();
      try { await pull(); } catch { /* offline or refused: local stays */ }
    }
  }

  return {
    configured: !!cfg,
    // The sign-in screen shows when accounts are on, nobody is signed in and developer mode is off.
    required: () => !!cfg && !session && store.settings.dev !== true,
    get signedIn() { return !!session; },
    get email() { return session ? session.user.email : null; },
    get provider() { return session && session.user.provider ? session.user.provider : null; },
    providers: cfg ? cfg.providers : [],
    get lastSync() { return meta.lastSync; },
    get syncing() { return syncing; },
    get dirty() { return dirty; },
    get lastError() { return lastError; },
    on(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    start, signUp, signIn, signInWithProvider, completeOAuthCode, completeOAuthTokens, forgot, resetPassword, signOut, deleteAccount, syncNow, refresh,
  };
}
