// The microphone for Smooth Ride, kept as small and as short-lived as it can be.
//  - askPermission(): one getUserMedia call, so the browser shows its normal permission prompt and nothing else. The tracks
//    are stopped at once.
//  - openMic(): opens a stream and its own AudioContext (js/sfx.js keeps a separate one that sleeps when silent) and returns
//    { readDb(), close() }. Loudness only: the analyser is never connected to the speakers and no sample is kept, stored or sent.
//  - close() stops every track, disconnects the nodes, closes the context. It is safe to call twice.
// Call openMic() straight from the Go tap: the tap is the user gesture the browser wants before it lets a context run.
const CONSTRAINTS = { audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: false } };
const streams = new Set();
let context = null;
let isOpen = false;

// For tests: is a stream open, what state is the last context in, how many tracks are still live (all streams, ever).
window.__ride = {
  get open() { return isOpen; },
  get ctxState() { return context ? context.state : 'none'; },
  get tracksLive() { let n = 0; for (const s of streams) n += s.getTracks().filter((t) => t.readyState === 'live').length; return n; },
};

export const hasMic = () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

export async function askPermission() {
  if (!hasMic()) return false;
  try {
    const stream = await navigator.mediaDevices.getUserMedia(CONSTRAINTS);
    streams.add(stream);
    stream.getTracks().forEach((t) => t.stop());
    return true;
  } catch { return false; }
}

export async function openMic() {
  if (!hasMic()) throw new Error('no microphone');
  const Ctx = window.AudioContext || window.webkitAudioContext;
  const ctx = new Ctx(); // made in the tap's own turn, before the first await
  context = ctx;
  let stream = null, src = null, an = null, closed = false;
  const close = () => {
    if (closed) return;
    closed = true; isOpen = false;
    try { if (stream) stream.getTracks().forEach((t) => t.stop()); } catch { /* already stopped */ }
    try { if (src) src.disconnect(); } catch { /* already disconnected */ }
    try { if (an) an.disconnect(); } catch { /* already disconnected */ }
    try { ctx.close(); } catch { /* already closed */ }
  };
  try {
    isOpen = true;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    stream = await navigator.mediaDevices.getUserMedia(CONSTRAINTS);
    streams.add(stream);
    if (closed) { stream.getTracks().forEach((t) => t.stop()); throw new Error('closed while opening'); }
    src = ctx.createMediaStreamSource(stream);
    an = ctx.createAnalyser();
    an.fftSize = 1024; an.smoothingTimeConstant = 0;
    src.connect(an); // not connected to the speakers
  } catch (e) { close(); throw e; }
  const buf = new Float32Array(an.fftSize);
  return {
    // The loudness of the last 1024 samples (21 ms at 48 kHz) as dBFS, -100 for silence.
    readDb() {
      an.getFloatTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
      return 20 * Math.log10(Math.max(Math.sqrt(sum / buf.length), 1e-5));
    },
    close,
  };
}
