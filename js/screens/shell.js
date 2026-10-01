import { h, animate, icon, reduced } from '../dom.js';
import { speakButton } from '../components/speak-button.js';
import { scriptToParts } from '../scripts.js';
import { richText } from '../letters.js';

// The task shell shared by lesson tasks and checkpoints: header with back arrow and progress dots, the activity
// stage with its speaker, the parent script card and Again / Next.
//
// Two steps, because a task builds itself before the shell can show it (its own refresh() runs while it is built):
//   const shell = makeShell({ ctx, title, color, steps, pos, from, isLast, soundKeys, backLabel, stepNoun, seenKeys, autoOpen });
// autoOpen: false for the games, where the gist in the bar is enough and the sheet must not open over the play.
// skipUntilDone: the last button reads "Skip" until the game says it is done (setDone(true)), then "Finish".
// setDone(true) also pulses the button once, so a parent sees that the game is finished.
//   const current = build({ ...env, refresh: shell.refresh, setProgress: shell.setPos });
//   return shell.mount(current, advance);
// current is {el, parts(), script(), again(), next?(), onShow?(), cleanup?(), flush?, lockScroll?}.
// lockScroll: the activity never scrolls and ignores pan gestures (tasks where a finger slides across the screen).
export function makeShell({ ctx, title, color, steps, pos, from, isLast, soundKeys, backLabel = 'Back', stepNoun = 'Step', seenKeys = [], autoOpen = true, skipUntilDone = false }) {
  const { router, speech, store } = ctx;
  let current = null, doneHook = () => {};
  const scriptText = h('p', { class: 'script-text' });
  const refresh = () => { scriptText.replaceChildren(richText(current ? current.script() : '')); };

  // Progress dots: the previous step's dot starts wide and the new one widens.
  const dots = Array.from({ length: steps }, (_, i) => h('i', { class: 'dot' + (i < pos ? ' past' : '') }));
  const pill = h('i', { class: 'dot-pill', style: { '--at': from >= 0 && from !== pos ? from : pos } });
  const bar = h('div', { class: 'dots', role: 'progressbar', 'aria-valuemin': 1, 'aria-valuemax': steps, 'aria-valuenow': pos + 1, 'aria-label': `${stepNoun} ${pos + 1} of ${steps}` }, h('span', { class: 'dots-track' }, dots, pill));
  const setPos = (i) => {
    pill.style.setProperty('--at', Math.min(i, steps - 1));
    dots.forEach((d, k) => d.classList.toggle('past', k < i));
    bar.setAttribute('aria-valuenow', String(Math.min(i, steps - 1) + 1));
    bar.setAttribute('aria-label', `${stepNoun} ${Math.min(i, steps - 1) + 1} of ${steps}`);
  };
  requestAnimationFrame(() => requestAnimationFrame(() => setPos(pos)));

  // The parent script is a compact bar by default and opens, on demand, as a sheet over the stage (never resizing it).
  // With the Grownups switch "Always show full instructions" on, it is the old card, always open.
  const sheetId = 'script-sheet-' + Math.random().toString(36).slice(2, 7);
  const firstLine = h('span', { class: 'script-first' });
  const refreshAll = () => { refresh(); firstLine.replaceChildren(richText(current ? (current.gist ? current.gist() : current.script()) : '')); };

  return {
    refresh: () => refreshAll(), setPos, setDone: (done) => doneHook(done),
    mount(cur, advance) {
      current = cur;
      const full = !!store.settings.fullInstructions;
      const onDark = color === 'violet' || color === 'coral', light = color === 'violet'; // the speaker is violet with a white icon, white with a violet icon only on a violet stage
      const speaker = speakButton({ speech, getParts: () => current.parts(), label: 'Hear this again' });
      if (light) speaker.classList.add('light');
      const scriptParts = () => scriptToParts(current.script(), soundKeys, { quiet: !store.settings.playSounds });
      const mkScriptSpeaker = () => { const b = speakButton({ speech, getParts: scriptParts, label: 'Hear the parent script' }); b.classList.add('small'); return b; };
      const speakers = [mkScriptSpeaker()];

      const head = h('header', { class: 'task-head' },
        h('button', { class: 'icon-btn light', type: 'button', 'aria-label': backLabel, onclick: () => router.back() }, icon('back', 28)),
        h('h1', {}, title),
        h('span', { class: 'head-spacer' }),
        bar);
      const stage = h('main', { class: `task-stage c-${color}${onDark ? ' on-dark' : ''}` }, h('div', { class: 'task-activity' + (current.flush ? ' flush' : '') + (current.lockScroll ? ' lock' : '') }, current.el), speaker);

      // ---- the script: compact bar + sheet, or the full card ----
      let isOpen = false, closeTimer = 0, closeAnim = null, wrap, toggle = null, sheet = null, closeBtn = null;
      const setOpen = (open, { focus = false, hold = 15000 } = {}) => {
        if (full || !sheet || open === isOpen) return;
        isOpen = open;
        clearTimeout(closeTimer);
        toggle.setAttribute('aria-expanded', String(open));
        wrap.classList.toggle('is-open', open);
        stage.classList.toggle('dimmed', open);
        if (open) {
          if (closeAnim) { closeAnim.cancel(); closeAnim = null; } // its held last frame (opacity 0) must not outlive the close
          sheet.hidden = false;
          animate(sheet, [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], { duration: 260 });
          closeTimer = setTimeout(() => setOpen(false), hold);
          if (focus) closeBtn.focus({ preventScroll: true });
        } else {
          const hadFocus = sheet.contains(document.activeElement);
          const a = closeAnim = animate(sheet, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(12px)' }], { duration: 260, fill: 'forwards' });
          a.finished.then(() => { if (!isOpen) sheet.hidden = true; }).catch(() => { if (!isOpen) sheet.hidden = true; });
          if (hadFocus) toggle.focus({ preventScroll: true });
        }
      };
      const closeScript = () => setOpen(false);
      if (full) {
        const fullCard = h('section', { class: 'script-card full', 'aria-label': 'Parent script' },
          h('span', { class: 'script-ic' }, icon('adult', 22)),
          h('div', { class: 'script-body' }, h('span', { class: 'script-tag' }, 'Say this'), scriptText),
          speakers[0]);
        wrap = h('div', { class: 'script-wrap always' }, fullCard);
      } else {
        toggle = h('button', { class: 'script-toggle', type: 'button', 'aria-label': 'Show what to say', 'aria-expanded': 'false', 'aria-controls': sheetId, onclick: () => setOpen(true, { focus: true }) },
          h('span', { class: 'script-ic' }, icon('adult', 22)),
          h('span', { class: 'script-peek' }, h('span', { class: 'script-tag' }, 'Say this'), firstLine),
          h('span', { class: 'script-chev' }, icon('chevronUp', 22)));
        speakers.push(mkScriptSpeaker());
        closeBtn = h('button', { class: 'icon-btn sheet-close', type: 'button', 'aria-label': 'Close the script', onclick: closeScript }, icon('chevronDown', 26));
        sheet = h('section', { class: 'script-sheet', id: sheetId, 'aria-label': 'Parent script', hidden: true },
          h('div', { class: 'sheet-head' }, h('span', { class: 'script-ic' }, icon('adult', 22)), h('span', { class: 'script-tag' }, 'Say this'), speakers[1], closeBtn),
          h('div', { class: 'sheet-body' }, scriptText));
        wrap = h('div', { class: 'script-wrap' }, h('div', { class: 'script-bar' }, toggle, speakers[0]), sheet);
        // Touching the stage, Next or Again puts the sheet away (the touch itself still does its work).
        stage.addEventListener('pointerdown', () => { if (isOpen) closeScript(); }, true);
      }

      const again = h('button', { class: 'btn again', type: 'button', onclick: () => { closeScript(); current.again(); refreshAll(); } }, icon('redo', 22), 'Again');
      const nextText = h('span', {}, skipUntilDone ? 'Skip' : isLast ? 'Finish' : 'Next');
      const next = h('button', { class: 'btn next', type: 'button', disabled: true, onclick: () => { closeScript(); if (current.next && current.next()) { dimNext(); refreshAll(); return; } advance(); } }, nextText, icon('arrowRight', 22));
      doneHook = (done) => {
        if (skipUntilDone) nextText.textContent = done ? 'Finish' : 'Skip';
        if (done && !reduced()) next.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.04)', offset: 0.5 }, { transform: 'scale(1)' }], { duration: 420, easing: 'ease-in-out' });
      };
      const foot = h('footer', { class: 'task-foot' }, wrap, h('div', { class: 'task-buttons' }, again, next));
      refreshAll();

      const root = h('div', { class: 'task-screen' + (full ? ' full-script' : '') }, head, stage, foot);
      // Speak the child's line on entry once the screen has settled.
      // Next stays dimmed for a second so a quick double tap cannot skip the task.
      let nextTimer = 0;
      const dimNext = () => { next.disabled = true; clearTimeout(nextTimer); nextTimer = setTimeout(() => { next.disabled = false; }, 1000); }; // again after each review letter
      dimNext();
      const timer = setTimeout(() => { if (current.onShow) current.onShow(); speech.autoSay(current.parts()); }, 420);
      // A new parent should see what the bar is: the first time a kind of task (or a lesson) is opened on this device,
      // the script opens by itself for 6 seconds and then tucks itself away.
      let introTimer = 0;
      const saved = store.settings.seenScripts, seen = saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
      if (!full && autoOpen && seenKeys.some((k) => !seen[k])) {
        // Marked as seen only when it really opens, so leaving within half a second does not burn the first-visit help.
        introTimer = setTimeout(() => {
          store.setSetting('seenScripts', { ...seen, ...Object.fromEntries(seenKeys.map((k) => [k, true])) });
          setOpen(true, { hold: 6000 });
        }, 500);
      }
      root.cleanup = () => { clearTimeout(timer); clearTimeout(nextTimer); clearTimeout(closeTimer); clearTimeout(introTimer); speaker.cleanup(); speakers.forEach((s) => s.cleanup()); if (current.cleanup) current.cleanup(); };
      // Opacity only: the tap targets must not move while a finger may be heading for them.
      animate(stage, [{ opacity: 0 }, { opacity: 1 }], { duration: 260, delay: 60 });
      animate(foot, [{ opacity: 0 }, { opacity: 1 }], { duration: 260, delay: 120 });
      return root;
    },
  };
}
