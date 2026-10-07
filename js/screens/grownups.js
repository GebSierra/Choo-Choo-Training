import { openOutside } from '../components/grown-gate.js';
import { h, icon } from '../dom.js';
import { fullscreenButton } from '../components/fullscreen-button.js';
import { WELCOME } from '../guide.js';
import { characterPicker } from '../components/character-picker.js';
import { soundCard } from '../components/sound-card.js';
import { glyphSvg } from '../glyphs.js';
import { lessonList } from '../components/lesson-list.js';
import { sfx } from '../sfx.js';
import { accentOf } from '../theme.js';
import { APP_VERSION } from '../version.js';
import { richText } from '../letters.js';
import { soundPhrase } from '../lessons.js';
import { starSvg } from '../art.js';
import { NUMBER_WORDS, earnedLevels } from '../levels.js';
import { accountCard } from '../components/account-card.js';
import { progressBody } from '../components/progress-card.js';

export const CLIP_CREDIT = "Letter sound clips are derived from Wikipedia's IPA vowel and consonant chart recordings, CC BY-SA 3.0, obtained via github.com/joshstephenson/PhoneticFlashCards, trimmed and loudness-normalized.";

export const WHISTLE_CREDIT = 'The train whistle sound is a toy train whistle from Pixabay (Pixabay licence: free to use in apps, no credit required).';

// The screens the owner can try before they go live (prototype 2): route key and button label.
const PREVIEWS = [['tip', 'Did you know? card'], ['gateway', 'World gateway'], ['proto-f', 'New lesson: f (eight steps)'], ['proto-play', 'Sound play (Stage 1)'], ['proto-placement', 'Placement check'], ['proto-heart', 'Heart word: the']];

// Parent area. Reached only through the hold gate on Home (ctx.gate), and expires after ten minutes.
const folds = {}; // which reference cards are open, for this page session only

export function grownupsScreen(ctx) {
  const { store, router, curriculum, speech } = ctx;
  if (!ctx.gate || Date.now() - ctx.gate.openedAt > 10 * 60 * 1000) { queueMicrotask(() => router.replace('/home')); return h('div'); }
  ctx.guOpenedAt = ctx.gate.openedAt; // the previews send the grown-up back here, within the same ten minutes
  ctx.gate = null; // one visit per hold: Back then history.back() cannot re-enter

  // ---- lessons and checkpoints, grouped by world then unit, only the current world open (js/components/lesson-list.js) ----
  const lessonsBox = lessonList({ store, curriculum, grouped: true }).el;

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

  // ---- the child's figure and name (the character creator) ----
  const picker = characterPicker({ store, mode: 'grownups' });

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
  const fullSwitch = h('button', { class: 'gu-switch', type: 'button', role: 'switch', 'aria-checked': String(!!store.settings.fullInstructions), 'aria-label': 'Always show full instructions', onclick: () => { const v = !store.settings.fullInstructions; store.setSetting('fullInstructions', v); fullSwitch.setAttribute('aria-checked', String(v)); } }, h('i'));
  const test = h('button', { class: 'btn small', type: 'button', onclick: () => speech.say([{ tts: 'moon, apple, sun' }]) }, icon('speaker', 20), 'Test voice');

  // ---- sound effects ----
  const sfxOn = () => store.settings.sfx !== false;
  const sfxSwitch = h('button', { class: 'gu-switch', type: 'button', role: 'switch', 'aria-checked': String(sfxOn()), 'aria-label': 'Play sounds', onclick: () => { store.setSetting('sfx', !sfxOn()); sfxSwitch.setAttribute('aria-checked', String(sfxOn())); sfxTest.disabled = !sfxOn(); } }, h('i'));
  const sfxOut = h('output', {}, `${Math.round((store.settings.sfxVolume ?? 0.6) * 100)}%`);
  const sfxRange = h('input', { type: 'range', min: 0, max: 1, step: 0.05, value: store.settings.sfxVolume ?? 0.6, 'aria-label': 'Sound effects volume', class: 'gu-range', oninput: () => { store.setSetting('sfxVolume', Number(sfxRange.value)); sfxOut.textContent = `${Math.round(Number(sfxRange.value) * 100)}%`; } });
  const sfxTest = h('button', { class: 'btn small', type: 'button', disabled: !sfxOn(), onclick: () => sfx.play('lesson') }, icon('speaker', 20), 'Test sound');

  // ---- the theme song ----
  const musicOn = () => store.settings.music !== false;
  const musicSwitch = h('button', { class: 'gu-switch', type: 'button', role: 'switch', 'aria-checked': String(musicOn()), 'aria-label': 'Music', onclick: () => { store.setSetting('music', !musicOn()); musicSwitch.setAttribute('aria-checked', String(musicOn())); } }, h('i'));

  // ---- clips ----
  const clipList = h('div', { class: 'gu-list' });
  const paintClips = (status) => clipList.replaceChildren(...Object.keys(curriculum.sounds).filter((k) => curriculum.sounds[k].clip).map((k) => h('div', { class: 'gu-row slim' },
    h('span', { class: 'gu-glyph' }, glyphSvg(k, { color: accentOf(k), label: 'sound clip' })),
    h('div', { class: 'gu-row-text' }, h('span', { class: 'gu-sub' }, richText(soundPhrase(curriculum.sounds[k])))),
    h('span', { class: 'gu-pill ' + (status && status[k] ? 'ok' : 'no') }, status ? (status[k] ? 'found' : status[k] === false ? 'missing' : 'unknown') : 'checking'))));
  paintClips(null);
  speech.checkClips().then(paintClips).catch(() => paintClips({}));

  // ---- levels: each built level, with Play again once it is earned; the rest are listed as coming later ----
  const earnedIds = new Set(earnedLevels(curriculum, store).map((v) => v.id));
  const levelRows = (curriculum.levels || []).map((v) => {
    const name = `Level ${NUMBER_WORDS[v.n - 1]}`;
    if (v.after === null) return h('div', { class: 'gu-level off', 'data-level': v.id }, h('span', { class: 'gu-glyph' }, starSvg()), h('div', { class: 'gu-row-text' }, h('strong', {}, name), h('span', { class: 'gu-sub' }, 'Coming later')));
    const earned = earnedIds.has(v.id);
    return h('div', { class: 'gu-level' + (earned ? '' : ' off'), 'data-level': v.id },
      h('span', { class: 'gu-glyph' }, starSvg()),
      h('div', { class: 'gu-row-text' }, h('strong', {}, name), h('span', { class: 'gu-sub' }, `Sounds: ${v.needs.join(' ')}`), h('span', { class: 'gu-sub' }, earned ? 'Earned' : `Earned when lesson ${v.after} is done`)),
      earned ? h('button', { class: 'btn small level-replay', type: 'button', 'data-level': v.id, 'aria-label': `Play ${name} again`, onclick: () => { ctx.replayLevel = v.id; router.go('/home'); } }, 'Play again') : null);
  });

  const sec = (title, ...kids) => h('section', { class: 'gu-card' }, h('h2', {}, title), ...kids);

  // ---- pace: how many new lessons a day (settings.perDay) ----
  const PACE = [[1, '1'], [2, '2'], [3, '3'], [4, '4'], [0, 'No limit']];
  const paceBtns = PACE.map(([v, label]) => h('button', { class: 'btn small ghost', type: 'button', dataset: { perday: String(v) }, 'aria-pressed': String(store.settings.perDay === v), onclick: () => { store.setSetting('perDay', v); paceBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.perday === String(v)))); } }, label));

  // ---- developer mode: tap the version line 7 times within 3 s (the owner's switch; hidden from everyone else) ----
  let taps = [];
  const toast = (msg) => { const t = h('div', { class: 'gu-toast', role: 'status' }, msg); document.body.append(t); setTimeout(() => t.remove(), 2200); };
  const devSwitch = (key, label) => {
    const b = h('button', { class: 'gu-switch', type: 'button', role: 'switch', 'aria-checked': String(!!store.settings[key]), 'aria-label': label, dataset: { dev: key }, onclick: () => { store.setSetting(key, !store.settings[key]); b.setAttribute('aria-checked', String(!!store.settings[key])); } }, h('i'));
    return b;
  };
  const devBox = h('div', { class: 'gu-devbox' });
  const paintDev = () => {
    // The box joins the page only while developer mode is on, so the page is exactly as before when it is off.
    if (store.settings.dev !== true) { devBox.remove(); return; }
    if (!devBox.isConnected && bodyEl) bodyEl.prepend(devBox);
    devBox.replaceChildren(sec('Developer',
      h('div', { class: 'gu-field inline' }, h('span', {}, 'Open every lesson'), devSwitch('devOpenAll', 'Open every lesson')),
      h('div', { class: 'gu-field inline' }, h('span', {}, 'Ignore daily limit'), devSwitch('devNoLimit', 'Ignore daily limit')),
      h('p', { class: 'gu-note' }, 'Progress is not changed by these. Lessons finished now are still recorded.'),
      h('h3', { class: 'gu-h3' }, 'Look at a world'),
      h('div', { class: 'gu-devworlds' }, ...(curriculum.worlds || []).map((w) => h('button', { class: 'btn small ghost', type: 'button', dataset: { world: w.id }, onclick: () => router.go(`/world/${w.id}`) }, w.id))),
      h('button', { class: 'btn small ghost dev-off', type: 'button', onclick: () => { store.setSetting('dev', false); paintDev(); toast('Developer mode off'); } }, 'Turn off developer mode')));
  };
  const versionLine = h('p', { class: 'gu-version', onclick: () => {
    const now = Date.now(); taps = [...taps.filter((t) => now - t < 3000), now];
    if (taps.length >= 7) { taps = []; store.setSetting('dev', store.settings.dev !== true); paintDev(); toast(`Developer mode ${store.settings.dev ? 'on' : 'off'}`); }
  } }, `Choo Choo Training version ${APP_VERSION}`);
  let bodyEl = null;

  const fsBtn = fullscreenButton({ label: true, className: 'btn small fs-row' });
  // The two long reference cards start closed, so Reset is within reach; each stays as the grown-up left it until the page closes.
  const fold = (title, ...kids) => {
    const id = 'gu-fold-' + title.toLowerCase().replace(/\W+/g, '-');
    const body = h('div', { class: 'gu-fold-body', id, hidden: !folds[title] }, ...kids);
    const head = h('button', { class: 'gu-fold', type: 'button', 'aria-expanded': String(!!folds[title]), 'aria-controls': id, onclick: () => {
      folds[title] = !folds[title];
      head.setAttribute('aria-expanded', String(folds[title]));
      body.hidden = !folds[title];
    } }, h('span', {}, title), icon('chevronDown', 24));
    return h('section', { class: 'gu-card' }, h('h2', {}, head), body);
  };
  const root = h('div', { class: 'grownups' },
    h('header', { class: 'gu-head' }, h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Back to the path', onclick: () => router.go('/home') }, icon('back', 28)), h('h1', {}, 'Grownups')),
    h('div', { class: 'gu-body' },
      fold('Progress', ...progressBody({ curriculum, store })), // the journey board and a short summary for each world
      sec('Lessons', resetBox), lessonsBox, // Reset first: with the lessons below it, it would be buried at the bottom
      sec('Your child', picker,
        h('p', { class: 'gu-note' }, "The name is used only inside the stories on this device. It is never sent anywhere and never spoken by the phone's voice.")),
      sec('Voice', h('label', { class: 'gu-field' }, h('span', {}, 'Voice (US English)'), select), h('label', { class: 'gu-field' }, h('span', {}, 'Speed ', rateOut), rate), test,
        h('div', { class: 'gu-field inline' }, h('span', {}, 'Speak automatically'), toggle),
        h('div', { class: 'gu-field inline' }, h('span', {}, 'Always show full instructions'), fullSwitch),
        h('p', { class: 'gu-note' }, 'Off: the "Say this" line is one tidy bar that opens when you tap it. On: the full words are always shown, which leaves the activity less room.'),
        h('p', { class: 'gu-note' }, speech.hasSynth ? 'The voice comes from your phone. If a voice sounds robotic, pick another one here.' : 'This browser has no text to speech.')),
      sec('Sound effects', h('div', { class: 'gu-field inline' }, h('span', {}, 'Play sounds'), sfxSwitch), h('label', { class: 'gu-field' }, h('span', {}, 'Volume ', sfxOut), sfxRange), sfxTest,
        h('div', { class: 'gu-field inline' }, h('span', {}, 'Music'), musicSwitch),
        h('p', { class: 'gu-note' }, 'The theme song plays once when the railway opens.'),
        h('p', { class: 'gu-note' }, 'Little musical sounds when something is finished: a star, a train at its station, a lesson done. They never say a letter or a word, and there is no sound for a wrong touch.')),
      sec('Pace', h('div', { class: 'gu-field' }, h('span', {}, 'New lessons per day'), h('div', { class: 'gu-choices', role: 'group', 'aria-label': 'New lessons per day' }, ...paceBtns)), h('p', { class: 'gu-note' }, 'Short, daily practice works better than long sessions.')),
      fold('The thinking behind this app', ...WELCOME.slice(1).flatMap((pg) => [h('h3', { class: 'gu-h3' }, pg.title), ...pg.body.map((t) => h('p', { class: 'gu-para' }, t))])),
      fold('Recorded sounds', clipList, h('p', { class: 'gu-note' }, 'Isolated sounds play from recordings, never from the phone voice. A sound with no recording shows a line for you to say instead ("Say: mmm"). To use your own voice, follow the recording steps.'), h('p', { class: 'gu-note' }, 'Recording steps: see README in the repo.'), h('p', { class: 'gu-credit' }, CLIP_CREDIT), h('p', { class: 'gu-credit' }, WHISTLE_CREDIT)),
      fold('Levels', h('p', { class: 'gu-note' }, 'Each level adds a special car to the train and a gold star.'), h('div', { class: 'gu-list' }, ...levelRows)),
      fold('All the sounds', ...Object.values(curriculum.sounds).map((s) => soundCard(s))),
      ...[accountCard(ctx.account, store)].filter(Boolean),
      sec('Links', h('a', { class: 'gu-link', href: curriculum.playlistUrl, target: '_blank', rel: 'noopener', onclick: (e) => { e.preventDefault(); openOutside(curriculum.playlistUrl); } }, icon('external', 20), 'Sound story playlist'),
        h('a', { class: 'gu-link', href: curriculum.alphabetSongUrl, target: '_blank', rel: 'noopener', onclick: (e) => { e.preventDefault(); openOutside(curriculum.alphabetSongUrl); } }, icon('external', 20), 'Alphabet song')),
      ...(fsBtn ? [sec('Screen', fsBtn, h('p', { class: 'gu-note' }, 'Full screen hides the phone bars. It stays on while you move between lessons.'))] : []),
      sec('Install', h('p', {}, 'Chrome on Android: open the menu, then Add to Home screen, then Install. Edge on Android: open the menu, then Add to phone, then Install. It works offline after the first visit.')),
      fold('Previews', h('p', { class: 'gu-note' }, 'Try new screens before they go live.'), h('div', { class: 'gu-previews' }, ...PREVIEWS.map(([key, label]) => h('button', { class: 'btn small preview-btn', type: 'button', dataset: { preview: key }, onclick: () => router.go(key === 'proto-f' ? '/proto/f' : key === 'proto-heart' ? '/proto/heart' : key === 'proto-play' ? '/proto/play' : key === 'proto-placement' ? '/proto/placement' : '/preview/' + key) }, label)))),
      versionLine));
  bodyEl = root.querySelector('.gu-body');
  paintDev();
  root.cleanup = () => clearTimeout(voiceTimer);
  return root;
}
