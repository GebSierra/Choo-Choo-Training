import { h } from '../dom.js';
import { kidSvg } from '../art/kid.js';
import { SKINS, HAIR_COLORS, HAIR_STYLES, HAIR_NAMES, OUTFITS, cleanCharacter } from '../character.js';
import { sfx } from '../sfx.js';

// The character creator: the child taps big swatches (skin, hair style, hair color) and watches the figure; the
// grown-up types the name. Used twice: "first" (after the welcome card, with "All aboard!" and "Later") and "grownups"
// (in the Grownups screen, with Save). Everything is kept on this device: nothing here is sent or spoken.
export function characterPicker({ store, mode = 'first', onDone = () => {}, onSave = () => {} }) {
  const picks = { ...cleanCharacter(store.character()) };
  const preview = h('div', { class: 'cp-preview' });
  const plate = h('span', { class: 'cp-plate' }, cleanCharacter(store.character()).name || 'Your child');
  const face = (st) => { const k = kidSvg({ skin: picks.skin, hair: st, hairColor: picks.hairColor, still: true }); k.setAttribute('viewBox', '14 0 92 84'); return k; }; // just the head
  const paintPreview = () => {
    preview.replaceChildren(kidSvg({ ...picks, pose: 'wave' }));
    preview.classList.remove('pop'); void preview.offsetWidth; preview.classList.add('pop'); // a small bounce whenever a choice changes
    for (const b of hairBtns) b.replaceChildren(face(b.dataset.style));
    for (const b of outfitBtns) b.replaceChildren(body(b.dataset.outfit));
  };
  const body = (id) => { const k = kidSvg({ skin: picks.skin, hair: 'short', hairColor: picks.hairColor, outfit: id, still: true }); k.setAttribute('viewBox', '30 80 60 60'); return k; }; // just the shirt
  const hairBtns = [], outfitBtns = [];
  const name = h('input', { class: 'cp-name gu-name', type: 'text', maxlength: 16, autocomplete: 'off', autocapitalize: 'words', spellcheck: 'false', 'aria-label': "Child's first name", value: picks.name, placeholder: 'First name', oninput: () => { picks.name = name.value; plate.textContent = name.value.trim() || 'Your child'; } });

  // One row of round choices; set(i) records the choice and every button's aria-pressed follows.
  const row = (cls, label, items, current, set, face, aria) => {
    const btns = items.map((it, i) => h('button', { class: 'cp-opt', type: 'button', 'aria-pressed': String(current() === i), 'aria-label': aria(it, i), onclick: () => { set(i); btns.forEach((b, k) => b.setAttribute('aria-pressed', String(k === i))); paintPreview(); } }, face(it, i)));
    const scroll = true; // one line per row that scrolls sideways when it must (more than five choices, or a very narrow phone); buttons stay full size
    const box = scroll ? h('div', { class: 'cp-scroll' }, ...btns) : null;
    // a row that runs past the edge fades out there, so it is clear it slides sideways
    const hint = () => { const more = box.scrollWidth - box.clientWidth - box.scrollLeft > 6; box.classList.toggle('more', more); box.classList.toggle('back', box.scrollLeft > 6); };
    if (box) { box.addEventListener('scroll', hint, { passive: true }); requestAnimationFrame(hint); setTimeout(hint, 300); }
    return h('div', { class: `cp-row ${cls}${scroll ? ' is-scroll' : ''}`, role: 'group', 'aria-labelledby': `${cls}-l` }, h('span', { class: 'cp-label', id: `${cls}-l` }, label), ...(scroll ? [box] : btns));
  };
  const swatch = (c) => h('span', { class: 'cp-swatch', style: { background: c } });
  const skinRow = row('cp-skin', 'Skin tone', SKINS, () => picks.skin, (i) => { picks.skin = i; }, (c) => swatch(c), (c, i) => `Skin tone ${i + 1}`);
  const hairIdx = () => HAIR_STYLES.indexOf(picks.hair);
  const hairRow = row('cp-hair', 'Hair style', HAIR_STYLES, hairIdx, (i) => { picks.hair = HAIR_STYLES[i]; }, (st) => face(st), (st) => HAIR_NAMES[st]);
  const colorRow = row('cp-hair-color', 'Hair color', HAIR_COLORS, () => picks.hairColor, (i) => { picks.hairColor = i; }, (c) => swatch(c), (c, i) => `Hair color ${i + 1}`);
  hairRow.querySelectorAll('.cp-opt').forEach((b, i) => { b.dataset.style = HAIR_STYLES[i]; hairBtns.push(b); });
  const outfitIdx = () => OUTFITS.findIndex((o) => o.id === picks.outfit);
  const outfitRow = row('cp-outfit', 'Clothes', OUTFITS, outfitIdx, (i) => { picks.outfit = OUTFITS[i].id; }, (o) => body(o.id), (o) => o.name);
  outfitRow.querySelectorAll('.cp-opt').forEach((b, i) => { b.dataset.outfit = OUTFITS[i].id; outfitBtns.push(b); });
  paintPreview();

  const kids = [];
  if (mode === 'first') kids.push(h('h2', {}, 'Who is riding with Pip?'));
  kids.push(
    h('div', { class: 'cp-top' }, h('div', { class: 'cp-stage' }, preview, plate), h('label', { class: 'gu-field cp-field' }, h('span', {}, "Child's first name"), name)),
    h('div', { class: 'cp-rows' }, skinRow, hairRow, colorRow, outfitRow));
  if (mode === 'first') {
    const done = h('button', { class: 'btn primary cp-done', type: 'button', onclick: () => { store.finishMeet(picks); sfx.play('toot'); onDone(); } }, 'All aboard!');
    const later = h('button', { class: 'cp-later meet-later', type: 'button', onclick: () => { store.finishMeet({}); onDone(); } }, 'Later');
    kids.push(h('div', { class: 'cp-actions' }, later, done));
  } else {
    const saved = h('span', { class: 'gu-sub', 'aria-live': 'polite' });
    const save = h('button', { class: 'btn small cp-save', type: 'button', onclick: () => { store.setCharacter(picks); name.value = store.character().name; saved.textContent = 'Saved'; onSave(); } }, 'Save');
    kids.push(h('div', { class: 'gu-actions' }, save, saved));
  }
  return h('div', { class: `cp cp-${mode}` }, ...kids);
}
