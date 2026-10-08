import { h, animate, icon, reduced } from '../dom.js';
import { speakButton } from '../components/speak-button.js';
import { scriptToParts } from '../scripts.js';
import { richText } from '../letters.js';
import { landscape, trainBar } from './practice-world.js';

// The task shell shared by lesson tasks and checkpoints: header with back arrow and progress dots, the activity
// stage with its speaker, the parent script card and Again / Next.
//
// Two steps, because a task builds itself before the shell can show it (its own refresh() runs while it is built):
//   const shell = makeShell({ ctx, title, color, steps, pos, from, isLast, soundKeys, backLabel, stepNoun, seenKeys, autoOpen });
// autoOpen: false for the games, where the gist in the bar is enough and the sheet must not open over the play.
// tip: one short grown-up reminder (js/guide.js) shown under the script, with tipKey in seenScripts: the first time, the script opens by itself for longer so it is read.
// skipUntilDone: the last button reads "Skip" until the game says it is done (setDone(true)), then "Finish".
// noScript: no grown-up script bar (the book gives that height to the page and has its own intro). noAgain: no Again button.
// world: a world id ('W1'...): with the developer switch settings.newPractice on, the screen gets the world-themed look (practice-world.js, css "practice world"); without it, or without a world, nothing changes.
// setDone(true) also pulses the button once, so a parent sees that the game is finished.
//   const current = build({ ...env, refresh: shell.refresh, setProgress: shell.setPos });
//   return shell.mount(current, advance);
// current is {el, parts(), script(), again(), next?(), onShow?(), cleanup?(), flush?, lockScroll?}.
// lockScroll: the activity never scrolls and ignores pan gestures (tasks where a finger slides across the screen).
export function makeShell({ ctx, title, color, steps, pos, from, isLast, soundKeys, backLabel = 'Back', stepNoun = 'Step', seenKeys = [], autoOpen = true, skipUntilDone = false, tip = null, tipKey = '', noScript = false, noAgain = false, autoAdvance = false, world = null }) {
  const { router, speech, store } = ctx;
  const themed = !!world && store.settings.newPractice === true;
  let current = null, doneHook = () => {};
  const scriptText = h('p', { class: 'script-text' });
  const tipEl = () => (tip ? h('p', { class: 'grown-tip' }, h('strong', {}, 'Grown-up tip: '), tip) : null);
  const refresh = () => { scriptText.replaceChildren(richText(current ? current.script() : '')); };

  // Progress dots: the previous step's dot starts wide and the new one widens.
  const dots = themed ? [] : Array.from({ length: steps }, (_, i) => h('i', { class: 'dot' + (i < pos ? ' past' : '') }));
  const pill = themed ? null : h('i', { class: 'dot-pill', style: { '--at': from >= 0 && from !== pos ? from : pos } });
  const train = themed ? trainBar({ steps, pos, from, stepNoun }) : null;
  const bar = themed ? train.bar : h('div', { class: 'dots', role: 'progressbar', 'aria-valuemin': 1, 'aria-valuemax': steps, 'aria-valuenow': pos + 1, 'aria-label': `${stepNoun} ${pos + 1} of ${steps}` }, h('span', { class: 'dots-track' }, dots, pill));
  const setPos = (i) => {
    if (themed) { train.setPos(i); return; }
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
      // Auto-advance (lesson games): a moment after the game says it is done, go on as Next would. Runs once, and only if nothing cancelled it.
      const AUTO_MS = 1200;
      let autoTimer = 0, autoWait = null, advanced = false;
      const cancelAuto = () => { clearTimeout(autoTimer); autoTimer = 0; if (autoWait) { document.removeEventListener('visibilitychange', autoWait); autoWait = null; } };
      const goNext = () => { if (advanced) return; advanced = true; cancelAuto(); advance(); };
      const full = !!store.settings.fullInstructions;
      const onDark = color === 'violet' || color === 'coral', light = color === 'violet'; // the speaker is violet with a white icon, white with a violet icon only on a violet stage
      const speaker = speakButton({ speech, getParts: () => current.parts(), label: 'Hear this again' });
      if (light) speaker.classList.add('light');
      const scriptParts = () => (current.scriptParts ? current.scriptParts() : scriptToParts(current.script(), soundKeys, { quiet: !store.settings.playSounds })); // scriptParts(): a task that must control exactly what the phone says
      const mkScriptSpeaker = () => { const b = speakButton({ speech, getParts: scriptParts, label: 'Hear the parent script' }); b.classList.add('small'); return b; };
      const speakers = [mkScriptSpeaker()];

      const head = h('header', { class: 'task-head' },
        h('button', { class: 'icon-btn light', type: 'button', 'aria-label': backLabel, onclick: () => { cancelAuto(); router.back(); } }, icon('back', 28)),
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
      if (noScript) {
        wrap = null;
      } else if (full) {
        const fullCard = h('section', { class: 'script-card full', 'aria-label': 'Parent script' },
          h('span', { class: 'script-ic' }, icon('adult', 22)),
          h('div', { class: 'script-body' }, h('span', { class: 'script-tag' }, 'Say this'), scriptText, tipEl()),
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
          h('div', { class: 'sheet-body' }, scriptText, tipEl()));
        wrap = h('div', { class: 'script-wrap' }, h('div', { class: 'script-bar' }, toggle, speakers[0]), sheet);
        // Touching the stage, Next or Again puts the sheet away (the touch itself still does its work).
        stage.addEventListener('pointerdown', () => { if (isOpen) closeScript(); }, true);
      }

      const again = h('button', { class: 'btn again', type: 'button', onclick: () => { cancelAuto(); closeScript(); current.again(); refreshAll(); } }, icon('redo', 22), 'Again');
      const nextText = h('span', {}, skipUntilDone ? 'Skip' : isLast ? 'Finish' : 'Next');
      const next = h('button', { class: 'btn next', type: 'button', disabled: true, onclick: () => { closeScript(); if (current.next && current.next()) { dimNext(); refreshAll(); return; } goNext(); } }, nextText, icon('arrowRight', 22));
      doneHook = (done) => {
        cancelAuto();
        if (done && autoAdvance && !advanced) {
          const fire = () => {
            autoTimer = 0;
            if (document.hidden) { autoWait = () => { if (!document.hidden) { cancelAuto(); fire(); } }; document.addEventListener('visibilitychange', autoWait); return; }
            if (window.__noAutoAdvance) return; // tests that sit on a finished game switch this on
            if (isOpen) return; // the grown-up is reading the script: leave Next to them
            closeScript(); goNext();
          };
          autoTimer = setTimeout(fire, AUTO_MS);
        }
        if (skipUntilDone) nextText.textContent = done ? 'Finish' : 'Skip';
        if (done && !reduced()) next.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.04)', offset: 0.5 }, { transform: 'scale(1)' }], { duration: 420, easing: 'ease-in-out' });
      };
      const foot = h('footer', { class: 'task-foot' + (noScript ? ' no-script' : '') }, ...(wrap ? [wrap] : []), h('div', { class: 'task-buttons' + (noAgain ? ' solo' : '') }, ...(noAgain ? [] : [again]), next));
      refreshAll();

      const root = h('div', { class: 'task-screen' + (full ? ' full-script' : '') + (themed ? ' practice-world' : ''), dataset: themed ? { world } : {} }, ...(themed ? landscape() : []), head, stage, foot);
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
      const keys = tip ? [...seenKeys, tipKey] : seenKeys;
      if (!noScript && !full && autoOpen && keys.some((k) => !seen[k])) {
        // Marked as seen only when it really opens, so leaving within half a second does not burn the first-visit help.
        const longer = tip && !seen[tipKey]; // a tip is worth reading: it stays open longer
        introTimer = setTimeout(() => {
          store.setSetting('seenScripts', { ...seen, ...Object.fromEntries(keys.map((k) => [k, true])) });
          setOpen(true, { hold: longer ? 11000 : 6000 });
        }, 500);
      }
      root.cleanup = () => { cancelAuto(); clearTimeout(timer); clearTimeout(nextTimer); clearTimeout(closeTimer); clearTimeout(introTimer); speaker.cleanup(); speakers.forEach((s) => s.cleanup()); if (current.cleanup) current.cleanup(); };
      // Opacity only: the tap targets must not move while a finger may be heading for them.
      animate(stage, [{ opacity: 0 }, { opacity: 1 }], { duration: 260, delay: 60 });
      animate(foot, [{ opacity: 0 }, { opacity: 1 }], { duration: 260, delay: 120 });
      return root;
    },
  };
}
