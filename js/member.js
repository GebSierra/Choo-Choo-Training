// A shared "member" cookie so the marketing website on the main address (which cannot read this app's storage) can send
// people who already use the app to app.choochootraining.com. Holds no personal data: just cct_member=1.
// Set while the child has started (welcome done, or a lesson done) or a grown-up is signed in; cleared otherwise
// (sign out and delete account both empty the progress, so they clear it). Only on choochootraining.com hosts, never native.
import { isNative } from './platform.js';

const local = ['localhost', '127.0.0.1'].includes(location.hostname);
// Tests on localhost can pretend to be another host: window.__handoff = { host }. The computed string is exposed as window.__memberCookie.
const hostName = () => (local && window.__handoff && window.__handoff.host ? String(window.__handoff.host) : location.hostname);
const eligible = (h) => h === 'choochootraining.com' || h.endsWith('.choochootraining.com');

export const memberCookie = (on) => `cct_member=${on ? '1' : ''}; Domain=.choochootraining.com; Path=/; Max-Age=${on ? 31536000 : 0}; Secure; SameSite=Lax`;
export const isMember = (store, account) => !!(store.state.firstRunDone || Object.values(store.state.lessons).some((l) => l && l.result) || (account && account.signedIn));

export function initMember({ store, account }) {
  if (isNative) return;
  const apply = () => {
    try {
      if (!eligible(hostName())) return;
      const c = memberCookie(isMember(store, account));
      if (local) window.__memberCookie = c;
      else document.cookie = c;
    } catch { /* cookies blocked: nothing to do */ }
  };
  apply();
  store.subscribe(apply);
  if (account && account.on) account.on(apply);
}
