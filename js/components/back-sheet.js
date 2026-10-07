// Full-screen sheets over a screen (the journey board) close with Back, the browser's or the phone's, without a route change:
// opening one adds a history entry with the same address; Back pops it and closes the sheet. Closing it another way
// (its own button) takes that entry off again. No loop, no timer.
const stack = [];
let skip = 0, listening = false;

function onPop() {
  if (skip > 0) { skip--; return; }
  while (stack.length) {
    const top = stack.pop();
    if (top.el && !top.el.isConnected) continue; // its screen is gone
    top.fromPop = true;
    top.close();
    return;
  }
}

// close: closes the sheet. Returns the function the sheet calls when it closes (it takes the history entry off again).
export function pushSheet(close, el) {
  if (!listening) { addEventListener('popstate', onPop); listening = true; }
  const entry = { close, el, fromPop: false };
  try { history.pushState({ sheet: 1 }, ''); stack.push(entry); } catch { return () => {}; }
  return () => {
    const i = stack.indexOf(entry);
    if (i >= 0) stack.splice(i, 1);
    if (!entry.fromPop && i >= 0) { skip++; history.back(); } // closed by its own button: take the entry off
  };
}

// The phone's Back button in a native wrapper (js/router.js): true when it closed a sheet.
export function closeTopSheet() {
  for (let i = stack.length - 1; i >= 0; i--) {
    const top = stack[i];
    if (top.el && !top.el.isConnected) { stack.splice(i, 1); continue; }
    top.close();
    return true;
  }
  return false;
}
