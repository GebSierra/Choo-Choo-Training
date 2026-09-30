import { h, icon } from '../dom.js';
import { soundCard } from '../components/sound-card.js';
import { glyphSvg } from '../glyphs.js';
import { accentOf } from '../theme.js';
import { APP_VERSION } from '../version.js';

const fmt = (iso) => { try { return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }); } catch { return ''; } };
export const CLIP_CREDIT = "Letter sound clips are derived from Wikipedia's IPA vowel and consonant chart recordings, CC BY-SA 3.0, obtained via github.com/joshstephenson/PhoneticFlashCards, trimmed and loudness-normalized.";

// Parent area. Reached only through the hold gate on Home (ctx.gate), and expires after ten minutes.
export function grownupsScreen(ctx) {
  const { store, router, curriculum, speech } = ctx;
  if (!ctx.gate || Date.now() - ctx.gate.openedAt > 10 * 60 * 1000) { queueMicrotask(() => router.go('/home')); return h('div'); }

  // ---- lessons ----
  const lessonsBox = h('div', { class: 'gu-list' });
  const paintLessons = () => {
    lessonsBox.replaceChildren(...curriculum.lessons.map((l) => {
      const st = store.lesson(l.number);
      const unlocked = store.isUnlocked(l.number);
      const status = st.result === 'got-it' ? `Got it${st.completedAt ? ' on ' + fmt(st.completedAt) : ''}` : st.result === 'practice-again' ? `Practice again${st.completedAt ? ' (' + fmt(st.completedAt) + ')' : ''}` : (unlocked ? 'Open, not finished' : 'Locked');
      return h('div', { class: 'gu-row' },
        h('span', { class: 'gu-glyph' }, glyphSvg(l.sound, { color: accentOf(l.sound), label: 'lesson ' + l.number })),
        h('div', { class: 'gu-row-text' }, h('strong', {}, `Lesson ${l.number}`), h('span', { class: 'gu-sub' }, status)),
        unlocked ? h('span', { class: 'gu-open' }, st.result === 'got-it' ? icon('check', 20) : '') : h('button', { class: 'btn ghost small', type: 'button', onclick: () => { store.unlock(l.number); paintLessons(); } }, 'Unlock'));
    }));
  };
  paintLessons();

  // ---- reset ----
  const resetBox = h('div', { class: 'gu-reset' });
  const paintReset = (confirming) => {
    resetBox.replaceChildren(confirming
      ? h('div', { class: 'gu-confirm', role: 'alertdialog', 'aria-label': 'Confirm reset' },
        h('p', {}, 'Reset all progress? Every lesson goes back to the start.'),
        h('div', { class: 'gu-actions' },
          h('button', { class: 'btn ghost small', type: 'button', onclick: () => paintReset(false) }, 'Cancel'),
          h('button', { class: 'btn small danger', type: 'button', onclick: () => { store.resetAll(); router.go('/home'); } }, 'Reset')))
      : h('button', { class: 'btn ghost small', type: 'button', onclick: () => paintReset(true) }, 'Reset all progress'));
  };
  paintReset(false);

  // ---- voice ----
  const select = h('select', { class: 'gu-select', 'aria-label': 'Voice', onchange: () => { store.setSetting('voiceURI', select.value); } });
  const paintVoices = () => {
    const vs = speech.voices();
    select.replaceChildren(...(vs.length ? vs.map((v) => h('option', { value: v.voiceURI }, v.name)) : [h('option', { value: '' }, 'Default voice')]));
    if (store.settings.voiceURI && vs.some((v) => v.voiceURI === store.settings.voiceURI)) select.value = store.settings.voiceURI;
  };
  paintVoices();
  const voiceTimer = setTimeout(paintVoices, 900);
  const rateOut = h('output', {}, `${Number(store.settings.rate).toFixed(2)}`);
  const rate = h('input', { type: 'range', min: 0.7, max: 1.1, step: 0.05, value: store.settings.rate, 'aria-label': 'Speaking speed', class: 'gu-range', oninput: () => { store.setSetting('rate', Number(rate.value)); rateOut.textContent = Number(rate.value).toFixed(2); } });
  const toggle = h('button', { class: 'gu-switch', type: 'button', role: 'switch', 'aria-checked': String(store.settings.autoSpeak), 'aria-label': 'Speak automatically when a task opens', onclick: () => { const v = !store.settings.autoSpeak; store.setSetting('autoSpeak', v); toggle.setAttribute('aria-checked', String(v)); } }, h('i'));
  const test = h('button', { class: 'btn small', type: 'button', onclick: () => speech.say([{ tts: 'moon, apple, sun' }]) }, icon('speaker', 20), 'Test voice');

  // ---- clips ----
  const clipList = h('div', { class: 'gu-list' });
  const paintClips = (status) => clipList.replaceChildren(...Object.keys(curriculum.sounds).map((k) => h('div', { class: 'gu-row slim' },
    h('span', { class: 'gu-glyph' }, glyphSvg(k, { color: accentOf(k), label: 'sound clip' })),
    h('div', { class: 'gu-row-text' }, h('span', { class: 'gu-sub' }, curriculum.sounds[k].sayItLike === 'a' ? 'short sound' : curriculum.sounds[k].sayItLike)),
    h('span', { class: 'gu-pill ' + (status && status[k] ? 'ok' : 'no') }, status ? (status[k] ? 'found' : 'missing') : 'checking'))));
  paintClips(null);
  speech.checkClips().then(paintClips).catch(() => paintClips({}));

  const sec = (title, ...kids) => h('section', { class: 'gu-card' }, h('h2', {}, title), ...kids);
  return h('div', { class: 'grownups' },
    h('header', { class: 'gu-head' }, h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Back to the path', onclick: () => router.go('/home') }, icon('back', 28)), h('h1', {}, 'Grownups')),
    h('div', { class: 'gu-body' },
      sec('Lessons', lessonsBox, resetBox),
      sec('Voice', h('label', { class: 'gu-field' }, h('span', {}, 'Voice (US English)'), select), h('label', { class: 'gu-field' }, h('span', {}, 'Speed ', rateOut), rate),
        h('div', { class: 'gu-field inline' }, h('span', {}, 'Speak automatically'), toggle), test,
        h('p', { class: 'gu-note' }, speech.hasSynth ? 'The voice comes from your phone. If a voice sounds robotic, pick another one here.' : 'This browser has no text to speech.')),
      sec('Recorded sounds', clipList, h('p', { class: 'gu-note' }, 'Isolated sounds are always played from recordings, never from the phone voice. A missing sound is skipped. To use your own voice, follow the recording steps.'), h('a', { class: 'gu-link', href: 'README.md', target: '_blank', rel: 'noopener' }, icon('external', 20), 'Recording steps (README.md)'), h('p', { class: 'gu-credit' }, CLIP_CREDIT)),
      sec('The three sounds', ...Object.values(curriculum.sounds).map((s) => soundCard(s))),
      sec('Links', h('a', { class: 'gu-link', href: curriculum.playlistUrl, target: '_blank', rel: 'noopener' }, icon('external', 20), 'Sound story playlist'),
        h('a', { class: 'gu-link', href: curriculum.alphabetSongUrl, target: '_blank', rel: 'noopener' }, icon('external', 20), 'Alphabet song')),
      sec('Install', h('p', {}, 'Chrome on Android: open the menu, then Add to Home screen, then Install. Edge on Android: open the menu, then Add to phone, then Install. It works offline after the first visit.')),
      h('p', { class: 'gu-version' }, `Reading version ${APP_VERSION}`)));
}
