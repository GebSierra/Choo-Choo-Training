import { h } from '../dom.js';
import { kidSvg } from '../art/kid.js';
import { SKINS, HAIR_COLORS, HAIR_STYLES, HAIR_NAMES, cleanCharacter } from '../character.js';
import { sfx } from '../sfx.js';

// The character creator: the child taps big swatches (skin, hair style, hair color) and watches the figure; the
// grown-up types the name. Used twice: "first" (after the welcome card, with "All aboard!" and "Later") and "grownups"
// (in the Grownups screen, with Save). Everything is kept on this device: nothing here is sent or spoken.
export function characterPicker({ store, mode = 'first', onDone = () => {} }) {
  const picks = { ...cleanCharacter(store.character()) };
  const preview = h('div', { class: 'cp-preview' });
  const face = (st) => { const k = kidSvg({ skin: picks.skin, hair: st, hairColor: picks.hairColor, still: true }); k.setAttribute('viewBox', '14 0 92 84'); return k; }; // just the head
  const paintPreview = () => {
    preview.replaceChildren(kidSvg({ ...picks, pose: 'wave' }));
    for (const b of hairBtns) b.replaceChildren(face(b.dataset.style));
  };
  const hairBtns = [];
  const name = h('input', { class: 'cp-name gu-name', type: 'text', maxlength: 16, autocomplete: 'off', autocapitalize: 'words', spellcheck: 'false', 'aria-label': 'Name (the grown-up types it)', value: picks.name, placeholder: 'Name', oninput: () => { picks.name = name.value; } });

  // One row of round choices; set(i) records the choice and every button's aria-pressed follows.
  const row = (cls, label, items, current, set, face, aria) => {
    const btns = items.map((it, i) => h('button', { class: 'cp-opt', type: 'button', 'aria-pressed': String(current() === i), 'aria-label': aria(it, i), onclick: () => { set(i); btns.forEach((b, k) => b.setAttribute('aria-pressed', String(k === i))); paintPreview(); } }, face(it, i)));
    return h('div', { class: `cp-row ${cls}`, role: 'group', 'aria-labelledby': `${cls}-l` }, h('span', { class: 'cp-label', id: `${cls}-l` }, label), ...btns);
  };
  const swatch = (c) => h('span', { class: 'cp-swatch', style: { background: c } });
  const skinRow = row('cp-skin', 'Skin', SKINS, () => picks.skin, (i) => { picks.skin = i; }, (c) => swatch(c), (c, i) => `Skin tone ${i + 1}`);
  const hairIdx = () => HAIR_STYLES.indexOf(picks.hair);
  const hairRow = row('cp-hair', 'Hair', HAIR_STYLES, hairIdx, (i) => { picks.hair = HAIR_STYLES[i]; }, (st) => face(st), (st) => HAIR_NAMES[st]);
  const colorRow = row('cp-hair-color', 'Hair color', HAIR_COLORS, () => picks.hairColor, (i) => { picks.hairColor = i; }, (c) => swatch(c), (c, i) => `Hair color ${i + 1}`);
  hairRow.querySelectorAll('.cp-opt').forEach((b, i) => { b.dataset.style = HAIR_STYLES[i]; hairBtns.push(b); });
  paintPreview();

  const kids = [];
  if (mode === 'first') kids.push(h('h2', {}, 'Who is riding with Pip?'));
  kids.push(preview, h('label', { class: 'gu-field cp-field' }, h('span', {}, 'Name (the grown-up types it)'), name), skinRow, hairRow, colorRow);
  if (mode === 'first') {
    const done = h('button', { class: 'btn primary cp-done', type: 'button', onclick: () => { store.finishMeet(picks); sfx.play('toot'); onDone(); } }, 'All aboard!');
    const later = h('button', { class: 'cp-later meet-later', type: 'button', onclick: () => { store.finishMeet({}); onDone(); } }, 'Later');
    kids.push(h('div', { class: 'cp-actions' }, later, done));
  } else {
    const saved = h('span', { class: 'gu-sub', 'aria-live': 'polite' });
    const save = h('button', { class: 'btn small cp-save', type: 'button', onclick: () => { store.setCharacter(picks); name.value = store.character().name; saved.textContent = 'Saved'; } }, 'Save');
    kids.push(h('div', { class: 'gu-actions' }, save, saved));
  }
  return h('div', { class: `cp cp-${mode}` }, ...kids);
}
