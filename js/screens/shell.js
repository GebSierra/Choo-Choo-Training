import { h, animate, icon } from '../dom.js';
import { speakButton } from '../components/speak-button.js';
import { scriptToParts } from '../scripts.js';
import { richText } from '../letters.js';

// The task shell shared by lesson tasks and checkpoints: header with back arrow and progress dots, the activity
// stage with its speaker, the parent script card and Again / Next.
//
// Two steps, because a task builds itself before the shell can show it (its own refresh() runs while it is built):
//   const shell = makeShell({ ctx, title, color, steps, pos, from, isLast, soundKeys, backLabel, stepNoun });
//   const current = build({ ...env, refresh: shell.refresh, setProgress: shell.setPos });
//   return shell.mount(current, advance);
// current is {el, parts(), script(), again(), next?(), onShow?(), cleanup?(), flush?}.
export function makeShell({ ctx, title, color, steps, pos, from, isLast, soundKeys, backLabel = 'Back', stepNoun = 'Step' }) {
  const { router, speech, store } = ctx;
  let current = null;
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

  return {
    refresh, setPos,
    mount(cur, advance) {
      current = cur;
      const light = color === 'violet' || color === 'coral';
      const speaker = speakButton({ speech, getParts: () => current.parts(), label: 'Hear this again' });
      if (light) speaker.classList.add('light');
      const scriptSpeaker = speakButton({ speech, getParts: () => scriptToParts(current.script(), soundKeys, { quiet: !store.settings.playSounds }), label: 'Hear the parent script' });
      scriptSpeaker.classList.add('small');

      const head = h('header', { class: 'task-head' },
        h('button', { class: 'icon-btn light', type: 'button', 'aria-label': backLabel, onclick: () => router.back() }, icon('back', 28)),
        h('h1', {}, title),
        h('span', { class: 'head-spacer' }),
        bar);
      const stage = h('main', { class: `task-stage c-${color}${light ? ' on-dark' : ''}` }, h('div', { class: 'task-activity' + (current.flush ? ' flush' : '') }, current.el), speaker);

      const again = h('button', { class: 'btn again', type: 'button', onclick: () => { current.again(); refresh(); } }, icon('redo', 22), 'Again');
      const next = h('button', { class: 'btn next', type: 'button', disabled: true, onclick: () => { if (current.next && current.next()) { refresh(); return; } advance(); } }, isLast ? 'Finish' : 'Next', icon('arrowRight', 22));
      const foot = h('footer', { class: 'task-foot' },
        h('section', { class: 'script-card', 'aria-label': 'Parent script' },
          h('span', { class: 'script-ic' }, icon('adult', 22)),
          h('div', { class: 'script-body' }, h('span', { class: 'script-tag' }, 'Say this'), scriptText),
          scriptSpeaker),
        h('div', { class: 'task-buttons' }, again, next));
      refresh();

      const root = h('div', { class: 'task-screen' }, head, stage, foot);
      // Speak the child's line on entry once the screen has settled.
      // Next stays dimmed for a second so a quick double tap cannot skip the task.
      const nextTimer = setTimeout(() => { next.disabled = false; }, 1000);
      const timer = setTimeout(() => { if (current.onShow) current.onShow(); speech.autoSay(current.parts()); }, 420);
      root.cleanup = () => { clearTimeout(timer); clearTimeout(nextTimer); speaker.cleanup(); scriptSpeaker.cleanup(); if (current.cleanup) current.cleanup(); };
      // Opacity only: the tap targets must not move while a finger may be heading for them.
      animate(stage, [{ opacity: 0 }, { opacity: 1 }], { duration: 260, delay: 60 });
      animate(foot, [{ opacity: 0 }, { opacity: 1 }], { duration: 260, delay: 120 });
      return root;
    },
  };
}
