import { h } from '../dom.js';
import { pipSvg } from '../art/pip.js';
import { APP_VERSION } from '../version.js';

// The grown-up sign-in screen. Shown at boot when accounts are configured, nobody is signed in and developer mode is off.
// Modes: signin, signup, forgot, check-email (after Create account or an unconfirmed sign-in), sent (reset email sent),
// reset (the password reset link brought the grown-up here). onDone() runs once the grown-up is in (or developer mode is on).
// Google's multicolour "G" (their brand guidelines: the standard logo on a white button).
const googleLogo = () => {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 48 48'); svg.setAttribute('width', '22'); svg.setAttribute('height', '22'); svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('class', 'si-glogo');
  for (const [fill, d] of [['#EA4335', 'M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z'], ['#4285F4', 'M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z'], ['#FBBC05', 'M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z'], ['#34A853', 'M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z']]) {
    const p = document.createElementNS(ns, 'path'); p.setAttribute('fill', fill); p.setAttribute('d', d); svg.append(p);
  }
  return svg;
};

export function signinScreen({ account, store, onDone, mode = 'signin', resetToken = null, notice = '', error = '' }) {
  const root = h('div', { class: 'signin' });
  let taps = [];
  let busy = false;
  let firstError = error; // a Google return that failed: shown once, under the Google button

  const versionLine = h('p', { class: 'si-version', onclick: () => {
    const now = Date.now(); taps = [...taps.filter((t) => now - t < 3000), now];
    if (taps.length >= 7) { taps = []; store.setSetting('dev', true); finish(); }
  } }, `Choo Choo Training version ${APP_VERSION}`);

  const finish = () => { root.remove(); onDone(); };

  const field = (label, attrs) => {
    const input = h('input', { class: 'gu-name si-input', ...attrs });
    input.addEventListener('focus', () => setTimeout(() => { try { input.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch { /* old browser */ } }, 300));
    return { input, el: h('label', { class: 'gu-field si-field' }, h('span', {}, label), input) };
  };

  function paint(next, extra = {}) {
    mode = next;
    const email = extra.email || '';
    const err = h('p', { class: 'si-error', role: 'alert', 'aria-live': 'polite' }, extra.error || '');
    const tabs = h('div', { class: 'si-tabs', role: 'tablist' },
      ...[['signin', 'Sign in'], ['signup', 'Create account']].map(([m, label]) => h('button', { class: 'si-tab', type: 'button', role: 'tab', 'aria-selected': String(m === mode), dataset: { mode: m }, onclick: () => paint(m, { email: root.querySelector('.si-email') ? root.querySelector('.si-email').value : '' }) }, label)));
    let body;
    const hasGoogle = (mode === 'signin' || mode === 'signup') && (account.providers || []).includes('google');
    const gerr = h('p', { class: 'si-gerror', role: 'alert', 'aria-live': 'polite' }, firstError);
    firstError = '';
    const google = hasGoogle ? [h('button', { class: 'si-google', type: 'button', dataset: { provider: 'google' }, onclick: async (ev) => {
      if (busy) return;
      const btn = ev.currentTarget;
      busy = true; btn.disabled = true; gerr.textContent = '';
      try { await account.signInWithProvider('google'); } catch { gerr.textContent = "Google sign-in didn't finish. Please try again."; busy = false; btn.disabled = false; }
    } }, googleLogo(), h('span', {}, 'Continue with Google')), gerr, h('div', { class: 'si-or', role: 'separator' }, h('span', {}, 'or use your email'))] : [];

    const run = (btn, work) => async (e) => {
      e.preventDefault();
      if (busy) return;
      busy = true; btn.disabled = true; err.textContent = '';
      try { await work(); } catch (ex) { err.textContent = ex && ex.message ? ex.message : 'Something went wrong. Please try again.'; if (ex && ex.code === 'email_not_confirmed') { busy = false; paint('check-email', { email: emailVal() }); return; } }
      busy = false; btn.disabled = false;
    };
    const emailVal = () => { const i = root.querySelector('.si-email'); return i ? i.value.trim() : email; };

    if (mode === 'signin' || mode === 'signup') {
      const e = field('Email', { class: 'gu-name si-input si-email', type: 'email', name: 'email', autocomplete: mode === 'signin' ? 'username' : 'email', inputmode: 'email', autocapitalize: 'none', autocorrect: 'off', spellcheck: 'false', value: email, required: true });
      const p = field('Password', { type: 'password', name: 'password', autocomplete: mode === 'signin' ? 'current-password' : 'new-password', required: true });
      const c = mode === 'signup' ? field('Type the password again', { type: 'password', name: 'confirm', autocomplete: 'new-password', required: true }) : null;
      const go = h('button', { class: 'btn big si-go', type: 'submit' }, mode === 'signin' ? 'Sign in' : 'Create account');
      const form = h('form', { class: 'si-form', novalidate: true, onsubmit: run(go, async () => {
        if (mode === 'signin') await account.signIn(e.input.value, p.input.value);
        else {
          const r = await account.signUp(e.input.value, p.input.value, c.input.value);
          if (r.state === 'check-email') { paint('check-email', { email: r.email }); return; }
        }
        finish();
      }) }, e.el, p.el, c ? c.el : null, mode === 'signup' ? h('p', { class: 'si-hint' }, 'At least 8 characters.') : null, err, go,
      mode === 'signin' ? h('button', { class: 'si-link', type: 'button', dataset: { mode: 'forgot' }, onclick: () => paint('forgot', { email: e.input.value }) }, 'Forgot password?') : null);
      body = [...google, tabs, form];
    } else if (mode === 'forgot') {
      const e = field('Email', { class: 'gu-name si-input si-email', type: 'email', name: 'email', autocomplete: 'email', inputmode: 'email', autocapitalize: 'none', autocorrect: 'off', spellcheck: 'false', value: email, required: true });
      const go = h('button', { class: 'btn big si-go', type: 'submit' }, 'Send reset email');
      body = [h('h2', { class: 'si-sub' }, 'Forgot password'), h('p', { class: 'si-text' }, 'Type your email and we will send a link to choose a new password.'),
        h('form', { class: 'si-form', novalidate: true, onsubmit: run(go, async () => { const r = await account.forgot(e.input.value); paint('sent', { email: r.email }); }) }, e.el, err, go),
        h('button', { class: 'si-link', type: 'button', dataset: { mode: 'signin' }, onclick: () => paint('signin', { email: e.input.value }) }, 'Back to sign in')];
    } else if (mode === 'check-email' || mode === 'sent') {
      body = [h('div', { class: 'si-note', role: 'status', dataset: { state: mode } },
        h('h2', { class: 'si-sub' }, 'Check your email'),
        h('p', { class: 'si-text' }, mode === 'sent' ? `If ${email} has an account, a link to choose a new password is on its way.` : `We sent a link to ${email}. Tap it, then come back here and sign in.`)),
      h('button', { class: 'btn big si-go', type: 'button', dataset: { mode: 'signin' }, onclick: () => paint('signin', { email }) }, 'Back to sign in')];
    } else { // reset
      const p = field('New password', { type: 'password', name: 'password', autocomplete: 'new-password', required: true });
      const c = field('Type it again', { type: 'password', name: 'confirm', autocomplete: 'new-password', required: true });
      const go = h('button', { class: 'btn big si-go', type: 'submit' }, 'Save new password');
      body = [h('h2', { class: 'si-sub' }, 'Choose a new password'),
        h('form', { class: 'si-form', novalidate: true, onsubmit: run(go, async () => { await account.resetPassword(resetToken, p.input.value, c.input.value); if (account.signedIn) finish(); else paint('signin', { notice: 'Your password was changed. Please sign in.' }); }) }, p.el, c.el, h('p', { class: 'si-hint' }, 'At least 8 characters.'), err, go)];
    }
    const noticeEl = (extra.notice || notice) && (mode === 'signin') ? h('p', { class: 'si-ok', role: 'status' }, extra.notice || notice) : null;
    notice = '';
    card.replaceChildren(...[noticeEl, ...body].filter(Boolean));
  }

  const card = h('div', { class: 'si-card' });
  root.append(h('div', { class: 'si-wrap' },
    h('div', { class: 'si-intro' }, h('div', { class: 'si-pip' }, pipSvg({ pose: 'wave' })), h('h1', {}, 'Welcome! Grown-ups, please sign in')),
    h('div', { class: 'si-main' }, card, versionLine)));
  paint(mode);
  return root;
}
