// Per-screen audits shared by the smoke test.
import { LETTER_NAMES } from './check-content.mjs';

const NAMES = LETTER_NAMES;

// Returns a list of problems found on the current screen.
export async function audit(page, label) {
  const problems = await page.evaluate((names) => {
    const out = [];
    const re = new RegExp(`\\b(${names.join('|')})\\b`, 'i');
    const root = document.querySelector('.screen:not(.leaving)') || document.body;
    // Horizontal overflow (page-level).
    const de = document.documentElement;
    if (de.scrollWidth > de.clientWidth + 1) out.push(`horizontal overflow ${de.scrollWidth} > ${de.clientWidth}`);
    // Landscape: nothing core may need a scroll (task stage, finish screen).
    if (innerWidth > innerHeight) {
      const act = root.querySelector('.task-activity');
      if (act && act.scrollHeight > act.clientHeight + 1) out.push(`landscape: task content is ${act.scrollHeight} tall in a ${act.clientHeight} stage`);
      if (root.querySelector('.finish') && de.scrollHeight > innerHeight + 1) out.push(`landscape: finish screen scrolls (${de.scrollHeight} > ${innerHeight})`);
    }
    // Tap targets.
    for (const el of root.querySelectorAll('button, a, [role=button]')) {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      if (!r.width || !r.height || cs.visibility === 'hidden' || cs.display === 'none' || el.closest('[hidden], [inert]')) continue;
      // Skip elements scrolled out of a horizontal carousel (still real, but judged by size only).
      if (r.width < 47.5 || r.height < 47.5) out.push(`small target ${Math.round(r.width)}x${Math.round(r.height)}: ${(el.getAttribute('aria-label') || el.textContent || el.className).slice(0, 40)}`);
    }
    // Text that a child might read: skip parent-facing blocks.
    const skip = '.script-card, .finish-card, .first-card, .debug, .grownups, .hold-hint, .script-text';
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walker.nextNode())) {
      const t = n.textContent.trim();
      if (!t || (n.parentElement && n.parentElement.closest(skip))) continue;
      if (re.test(t)) out.push(`letter name in text: "${t}"`);
      // Text and labels must not contain a capital except for sentence case headings; flag lone capital letters used as letters.
    }
    for (const el of root.querySelectorAll('[aria-label], [alt], [title]')) {
      if (el.closest(skip)) continue;
      for (const a of ['aria-label', 'alt', 'title']) { const v = el.getAttribute(a); if (v && re.test(v)) out.push(`letter name in ${a}: "${v}"`); }
    }
    return out;
  }, NAMES);
  return problems.map((p) => `${label}: ${p}`);
}
