import { h } from '../dom.js';

// Grownups > Account: who is signed in, Sync now, Sign out, Delete account. Only when accounts are configured
// (js/config.js). The whole page is behind the Grownups hold gate. Sign out and delete reload the app, which then
// shows the sign-in screen (the local progress was cleared, or kept safe by the failed-sync warning below).
export function accountCard(account, store) {
  if (!account || !account.configured) return null;
  const box = h('div', { class: 'gu-account' });
  let msg = '', confirming = false, offerForce = false, typed = '', busy = false;
  const when = () => (account.lastSync ? new Date(account.lastSync).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'not yet');

  const act = async (work, okMsg) => {
    if (busy) return;
    busy = true; msg = ''; paint();
    try { await work(); msg = okMsg || ''; } catch (e) { msg = e && e.message ? e.message : 'Something went wrong. Please try again.'; offerForce = !!(e && /^unsynced/.test(e.code)); }
    busy = false; paint();
  };
  const reload = () => location.reload();

  function paint() {
    const kids = [];
    if (!account.signedIn) {
      kids.push(h('p', { class: 'gu-note' }, 'Not signed in (developer mode).'),
        h('button', { class: 'btn small', type: 'button', dataset: { acct: 'signin' }, onclick: () => { store.setSetting('dev', false); reload(); } }, 'Sign in'));
      box.replaceChildren(...kids);
      return;
    }
    kids.push(h('div', { class: 'gu-field' }, h('span', {}, 'Signed in as'), h('strong', { class: 'gu-acct-email' }, account.email)),
      h('p', { class: 'gu-note gu-synced' }, `Last synced: ${when()}`),
      h('div', { class: 'gu-actions gu-acct-actions' },
        h('button', { class: 'btn small', type: 'button', disabled: busy, dataset: { acct: 'sync' }, onclick: () => act(() => account.syncNow(), 'Synced.') }, busy ? 'Working...' : 'Sync now'),
        h('button', { class: 'btn small ghost', type: 'button', disabled: busy, dataset: { acct: 'signout' }, onclick: () => act(async () => { await account.signOut(); reload(); }) }, 'Sign out')));
    if (msg) kids.push(h('p', { class: 'gu-note gu-acct-msg', role: 'status' }, msg));
    if (offerForce) kids.push(h('button', { class: 'btn small ghost danger-text', type: 'button', dataset: { acct: 'force' }, onclick: () => act(async () => { await account.signOut({ force: true }); reload(); }) }, 'Sign out anyway (progress on this device is erased)'));
    if (confirming) {
      const input = h('input', { class: 'gu-name', type: 'text', autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false', 'aria-label': 'Type DELETE to confirm', placeholder: 'DELETE', value: typed, dataset: { acct: 'delete-input' } });
      const go = h('button', { class: 'btn small danger', type: 'button', disabled: typed !== 'DELETE' || busy, dataset: { acct: 'delete-go' }, onclick: () => act(async () => { await account.deleteAccount(); reload(); }) }, 'Delete forever');
      input.addEventListener('input', () => { typed = input.value.trim(); go.disabled = typed !== 'DELETE' || busy; });
      kids.push(h('div', { class: 'gu-confirm', role: 'alertdialog', 'aria-label': 'Confirm delete account' },
        h('p', {}, 'Delete this account? The account and all its saved progress are removed for good, and this device is cleared. This cannot be undone.'),
        h('label', { class: 'gu-field' }, h('span', {}, 'Type DELETE to confirm'), input),
        h('div', { class: 'gu-actions' }, h('button', { class: 'btn ghost small', type: 'button', onclick: () => { confirming = false; typed = ''; paint(); } }, 'Cancel'), go)));
    } else kids.push(h('button', { class: 'btn ghost small', type: 'button', disabled: busy, dataset: { acct: 'delete' }, onclick: () => { confirming = true; paint(); } }, 'Delete account'));
    box.replaceChildren(...kids);
  }
  paint();
  account.on((t) => { if (t === 'sync' && box.isConnected && !busy && !confirming) paint(); });
  return h('section', { class: 'gu-card', dataset: { section: 'account' } }, h('h2', {}, 'Account'), box);
}
