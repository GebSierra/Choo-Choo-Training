// Moving from the old address (choochootraining.com) to the app address (app.choochootraining.com).
// Saved progress is per address, so the old page sends its progress along in the URL FRAGMENT (never the query: a fragment is not
// sent to any server, so it cannot reach logs):  APP_ORIGIN/<query>#handoff=<base64url(utf8 JSON of reading.v1)>&route=<encoded route>
// 'route' is the old hash without '#', e.g. /lesson/3 (optional). An old reset-password link (#access_token=... / type=recovery) is
// forwarded unchanged instead. The session (reading.auth) never travels. Docs: docs/DOMAIN-MOVE.md.
import { APP_ORIGIN as CFG_ORIGIN, OLD_HOSTS, HANDOFF_LIVE } from './config.js';
import { readRawProgress } from './store.js';

const MAX = 200 * 1024; // bytes of JSON we will send or accept
const local = ['localhost', '127.0.0.1'].includes(location.hostname);
// Tests may override on localhost only: window.__handoff = { host, live, appOrigin }. Production ignores it.
const cfg = () => {
  const t = local && window.__handoff && typeof window.__handoff === 'object' ? window.__handoff : null;
  return { host: t && t.host ? String(t.host) : location.hostname, live: t ? t.live === true : HANDOFF_LIVE, appOrigin: String((t && t.appOrigin) || CFG_ORIGIN).replace(/\/+$/, '') };
};

const toB64 = (str) => {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const fromB64 = (b64) => {
  const bin = atob(b64.replace(/-/g, '+').replace(/_/g, '/'));
  return new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
};
// A reading.v1-shaped object: schema 1 and a lessons map. The store cleans the rest when it adopts.
const shaped = (p) => !!p && typeof p === 'object' && !Array.isArray(p) && p.schema === 1 && !!p.lessons && typeof p.lessons === 'object' && !Array.isArray(p.lessons);

// Old address: redirect to the app address. Returns true when it did (the caller stops booting).
export function handoffOut() {
  const { host, live, appOrigin } = cfg();
  if (!live || !OLD_HOSTS.includes(host) || location.origin === appOrigin) return false;
  const hash = location.hash;
  let tail = hash; // a reset-password or error link is forwarded exactly as it came
  if (!/access_token|type=recovery|error/.test(hash)) {
    let data = '';
    const raw = readRawProgress();
    if (raw && raw.length <= MAX) { try { if (shaped(JSON.parse(raw))) data = toB64(raw); } catch { /* corrupt: no handoff */ } }
    const route = hash.replace(/^#/, '');
    tail = data ? '#handoff=' + data + (route ? '&route=' + encodeURIComponent(route) : '') : hash;
  }
  location.replace(appOrigin + '/' + location.search + tail);
  return true;
}

// App address: adopt a handoff fragment, then show the route it carried. Never throws.
export function handoffIn(store) {
  try {
    const { host, appOrigin } = cfg();
    if (OLD_HOSTS.includes(host) && location.origin !== appOrigin) return;
    const m = /^#handoff=([A-Za-z0-9_-]+)(?:&route=(.*))?$/.exec(location.hash);
    if (!m) return;
    let route = '/home';
    try { const r = m[2] ? decodeURIComponent(m[2]) : ''; if (/^\/[\w/-]*$/.test(r)) route = r; } catch { /* default route */ }
    try {
      if (m[1].length <= MAX * 1.4) {
        const text = fromB64(m[1]);
        if (text.length <= MAX) {
          const incoming = JSON.parse(text);
          const have = store.state.savedAt || 0, inc = Number.isFinite(incoming && incoming.savedAt) ? incoming.savedAt : 0;
          // A fresh device takes it; otherwise this device keeps its own unless both are stamped and the incoming one is newer.
          if (shaped(incoming) && (store.isFresh() || (have > 0 && inc > have))) store.adopt(incoming);
        }
      }
    } catch { /* malformed: ignore it */ }
    history.replaceState(null, '', location.pathname + location.search + '#' + route);
  } catch { /* never block the app */ }
}
