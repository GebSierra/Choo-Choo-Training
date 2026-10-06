import { GROUPS, ITEMS, HOLD_LABEL } from './studio-list.js';

const KEY = 'ccstudio.v1';
const $ = (id) => document.getElementById(id);
const LIMIT = { blend: 5, stretchy: 4, bouncy: 4 };

// ---- saved place (localStorage) and recordings (IndexedDB), both optional ----
let state = { done: {}, idx: 0 }; // done: { file: 'webm' | 'm4a' | ... }
try {
  const s = JSON.parse(localStorage.getItem(KEY) || 'null');
  if (s && typeof s === 'object') state = { done: s.done && typeof s.done === 'object' ? s.done : {}, idx: Math.min(Math.max(+s.idx || 0, 0), ITEMS.length - 1) };
} catch { /* storage unavailable: start fresh */ }
function persist() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ } }

const mem = new Map(); // fallback when IndexedDB is unavailable: file -> Blob
let dbp = null;
function db() {
  if (!dbp) {
    dbp = new Promise((resolve) => {
      try {
        const req = indexedDB.open('ccstudio', 1);
        req.onupgradeneeded = () => req.result.createObjectStore('rec');
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      } catch { resolve(null); }
    });
  }
  return dbp;
}
async function putBlob(file, blob) {
  mem.set(file, blob);
  const d = await db();
  if (!d) return;
  await new Promise((res) => { try { const tx = d.transaction('rec', 'readwrite'); tx.objectStore('rec').put(blob, file); tx.oncomplete = res; tx.onerror = res; tx.onabort = res; } catch { res(); } });
}
async function getBlob(file) {
  if (mem.has(file)) return mem.get(file);
  const d = await db();
  if (!d) return null;
  return new Promise((res) => { try { const r = d.transaction('rec').objectStore('rec').get(file); r.onsuccess = () => res(r.result || null); r.onerror = () => res(null); } catch { res(null); } });
}
async function clearBlobs() {
  mem.clear();
  const d = await db();
  if (!d) return;
  await new Promise((res) => { try { const tx = d.transaction('rec', 'readwrite'); tx.objectStore('rec').clear(); tx.oncomplete = res; tx.onerror = res; tx.onabort = res; } catch { res(); } });
}

// ---- helpers ----
const cur = () => ITEMS[state.idx];
const doneCount = () => ITEMS.filter((i) => state.done[i.file]).length;
const nameFor = (item, ext) => item.file + '.' + ext;

function download(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.style.display = 'none';
  document.body.appendChild(a); a.click();
  setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 4000);
}

// ---- recording ----
let stream = null, recorder = null, chunks = [], take = null; // take: { blob, ext }
let audioCtx = null, analyser = null, raf = 0, timer = 0, startedAt = 0, playing = null, busy = false;

const MIMES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
function pickMime() {
  if (!window.MediaRecorder) return '';
  for (const m of MIMES) { try { if (MediaRecorder.isTypeSupported(m)) return m; } catch { /* next */ } }
  return '';
}
function extOf(type) {
  const t = (type || '').toLowerCase();
  if (t.includes('webm')) return 'webm';
  if (t.includes('mp4') || t.includes('aac') || t.includes('m4a')) return 'm4a';
  if (t.includes('ogg')) return 'ogg';
  return 'webm';
}

function setStatus(msg, err) { const s = $('status'); s.textContent = msg || ''; s.className = 'status' + (err ? ' err' : ''); }
const UNSUPPORTED = "This browser can't record here. Try Chrome or Safari, and allow the microphone.";

async function getStream() {
  if (stream && stream.getTracks().some((t) => t.readyState === 'live')) return stream;
  const base = { echoCancellation: false, noiseSuppression: false, autoGainControl: false };
  try { stream = await navigator.mediaDevices.getUserMedia({ audio: base }); }
  catch (e) {
    if (e && e.name === 'OverconstrainedError') stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    else throw e;
  }
  return stream;
}

function meterLoop() {
  if (!analyser) return;
  const buf = new Uint8Array(analyser.fftSize);
  analyser.getByteTimeDomainData(buf);
  let peak = 0;
  for (let i = 0; i < buf.length; i++) peak = Math.max(peak, Math.abs(buf[i] - 128));
  $('level').style.width = Math.min(100, Math.round((peak / 128) * 160)) + '%';
  raf = requestAnimationFrame(meterLoop);
}

async function startRecording() {
  if (busy) return;
  busy = true;
  stopPlayback();
  if (!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder)) { setStatus(UNSUPPORTED, true); busy = false; return; }
  let st;
  try { st = await getStream(); } catch { setStatus(UNSUPPORTED, true); busy = false; render(); return; }
  try {
    const mime = pickMime();
    recorder = mime ? new MediaRecorder(st, { mimeType: mime }) : new MediaRecorder(st);
  } catch { setStatus(UNSUPPORTED, true); busy = false; return; }
  chunks = [];
  const item = cur();
  const rc = recorder;
  rc.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
  rc.onstop = () => {
    cancelAnimationFrame(raf); raf = 0; clearInterval(timer); timer = 0;
    try { if (audioCtx) audioCtx.close(); } catch { /* ignore */ }
    audioCtx = null; analyser = null;
    $('level').style.width = '0';
    const type = rc.mimeType || (chunks[0] && chunks[0].type) || 'audio/webm';
    if (cur() === item && chunks.length) take = { blob: new Blob(chunks, { type }), ext: extOf(type) };
    recorder = null; busy = false;
    setStatus(take ? 'Got it. Play it back, then Save & next.' : '');
    render();
  };
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AC();
    const src = audioCtx.createMediaStreamSource(st);
    analyser = audioCtx.createAnalyser(); analyser.fftSize = 512;
    src.connect(analyser);
    meterLoop();
  } catch { /* the meter is optional */ }
  take = null;
  rc.start();
  startedAt = Date.now();
  const limit = LIMIT[item.hold] * 1000;
  timer = setInterval(() => {
    const left = limit - (Date.now() - startedAt);
    if (left <= 0) { stopRecording(); return; }
    setStatus('Recording... ' + Math.ceil(left / 1000) + ' s left. Tap Stop when you are done.');
  }, 100);
  setStatus('Recording... ' + LIMIT[item.hold] + ' s left. Tap Stop when you are done.');
  render();
}
function stopRecording() { if (recorder && recorder.state !== 'inactive') { try { recorder.stop(); } catch { /* ignore */ } } }

async function play() {
  if (playing) { stopPlayback(); return; }
  let blob = take && take.blob;
  if (!blob) blob = await getBlob(cur().file);
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const a = new Audio(url);
  playing = { a, url };
  a.onended = a.onerror = () => { stopPlayback(); };
  try { await a.play(); } catch { stopPlayback(); }
  render();
}
function stopPlayback() {
  if (!playing) return;
  try { playing.a.pause(); } catch { /* ignore */ }
  URL.revokeObjectURL(playing.url);
  playing = null;
  render();
}

// ---- navigation and saving ----
function go(i) {
  if (recorder) { const rc = recorder; rc.onstop = null; try { rc.stop(); } catch { /* ignore */ } cancelAnimationFrame(raf); clearInterval(timer); recorder = null; busy = false; $('level').style.width = '0'; try { if (audioCtx) audioCtx.close(); } catch { /* ignore */ } audioCtx = null; analyser = null; }
  stopPlayback();
  state.idx = Math.min(Math.max(i, 0), ITEMS.length - 1);
  take = null;
  persist(); setStatus(''); render();
}
function nextTarget() {
  for (let k = 1; k <= ITEMS.length; k++) {
    const j = (state.idx + k) % ITEMS.length;
    if (!state.done[ITEMS[j].file]) return j;
  }
  return Math.min(state.idx + 1, ITEMS.length - 1);
}
async function saveAndNext() {
  if (!take) return;
  const item = cur(), t = take;
  await putBlob(item.file, t.blob);
  state.done[item.file] = t.ext;
  download(t.blob, nameFor(item, t.ext));
  const all = doneCount() === ITEMS.length;
  take = null;
  persist();
  if (all) { setStatus('Every sound is recorded. Use Download all recorded if you need the files again.'); render(); }
  else go(nextTarget());
}
async function downloadAgain(item) {
  const blob = await getBlob(item.file);
  if (blob) download(blob, nameFor(item, state.done[item.file]));
  else setStatus('That recording is not stored in this browser. Record it again.', true);
}
async function downloadAll() {
  for (const item of ITEMS) {
    if (!state.done[item.file]) continue;
    const blob = await getBlob(item.file);
    if (blob) { download(blob, nameFor(item, state.done[item.file])); await new Promise((r) => setTimeout(r, 450)); }
  }
}

// ---- drawing ----
function buildList() {
  const root = $('list');
  root.textContent = '';
  for (const g of GROUPS) {
    const h = document.createElement('div'); h.className = 'grp'; h.textContent = g.title; root.appendChild(h);
    const wrap = document.createElement('div'); wrap.className = 'chips'; root.appendChild(wrap);
    ITEMS.forEach((item, i) => {
      if (item.group !== g.id) return;
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'chip'; b.dataset.i = i; b.dataset.file = item.file;
      b.innerHTML = '<span class="dot"></span><span></span>';
      b.lastChild.textContent = item.show;
      b.setAttribute('aria-label', item.file);
      b.onclick = () => go(i);
      wrap.appendChild(b);
    });
  }
}
function render() {
  const item = cur();
  const n = doneCount();
  $('count').textContent = n + ' of ' + ITEMS.length + ' recorded';
  $('barfill').style.width = Math.round((n / ITEMS.length) * 100) + '%';
  document.querySelectorAll('.chip').forEach((b) => {
    b.classList.toggle('cur', +b.dataset.i === state.idx);
    b.classList.toggle('done', !!state.done[b.dataset.file]);
  });
  const grp = GROUPS.find((g) => g.id === item.group);
  const inGroup = ITEMS.filter((x) => x.group === item.group);
  $('where').textContent = grp.title + ' · ' + (inGroup.indexOf(item) + 1) + ' of ' + inGroup.length + (state.done[item.file] ? ' · recorded' : '');
  const sh = $('show'); sh.textContent = item.show; sh.classList.toggle('long', item.show.length > 3);
  $('hold').textContent = HOLD_LABEL[item.hold];
  $('say').textContent = item.say; $('dont').textContent = item.dont; $('tip').textContent = item.tip; $('ex').textContent = item.example;
  const recording = !!recorder;
  const rb = $('rec');
  rb.textContent = recording ? 'Stop' : (take ? 'Record again' : 'Record');
  const hasSaved = !!state.done[item.file];
  $('play').disabled = recording || !(take || hasSaved);
  $('play').textContent = playing ? 'Stop playing' : 'Play back';
  $('redo').disabled = recording || !take;
  $('save').disabled = recording || !take;
  $('prev').disabled = recording || state.idx === 0;
  $('skip').disabled = recording || state.idx === ITEMS.length - 1;
  $('again').classList.toggle('hidden', !hasSaved);
  $('all').disabled = n === 0;
}

$('rec').onclick = () => { if (recorder) stopRecording(); else startRecording(); };
$('play').onclick = play;
$('redo').onclick = () => { take = null; stopPlayback(); setStatus(''); render(); };
$('save').onclick = saveAndNext;
$('prev').onclick = () => go(state.idx - 1);
$('skip').onclick = () => go(state.idx + 1);
$('again').onclick = () => downloadAgain(cur());
$('all').onclick = downloadAll;
$('reset').onclick = async () => {
  if (!confirm('Start over? This clears your saved place and every saved recording in this browser.')) return;
  if (recorder) go(state.idx);
  await clearBlobs();
  state = { done: {}, idx: 0 }; take = null;
  persist(); setStatus(''); render();
};
document.addEventListener('visibilitychange', () => { if (document.hidden && !recorder && stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; } });

buildList();
render();
