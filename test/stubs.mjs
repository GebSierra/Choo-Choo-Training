// Playwright cannot produce speech, so tests replace speechSynthesis with a recorder.
export const SPEECH_STUB = () => {
  window.__spoken = [];
  window.__events = [];
  class FakeUtterance { constructor(text) { this.text = text; this.voice = null; this.rate = 1; this.lang = ''; } }
  const voices = [
    { name: 'Google UK English', lang: 'en-GB', voiceURI: 'g-uk' },
    { name: 'Google US English', lang: 'en_US', voiceURI: 'g-us' },
  ];
  const synth = {
    speaking: false,
    getVoices: () => voices,
    addEventListener() {}, removeEventListener() {},
    cancel() {},
    speak(u) {
      window.__spoken.push(u.text);
      window.__events.push({ type: 'tts', text: u.text, voice: u.voice && u.voice.voiceURI, lang: u.lang, rate: u.rate });
      setTimeout(() => u.onstart && u.onstart({}), 5);
      setTimeout(() => u.onend && u.onend({}), window.__ttsMs || 40);
    },
  };
  Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true });
  window.SpeechSynthesisUtterance = FakeUtterance;
  // Record clip playback and let it "end" quickly; a src containing "none" errors like a missing file.
  const RealAudio = window.Audio;
  window.Audio = function () {
    const a = new RealAudio();
    const origPlay = a.play.bind(a);
    a.play = () => {
      const src = a.src;
      window.__events.push({ type: 'clip', src: src.split('/').slice(-1)[0] });
      // A missing file fires its error event first, then the play() promise rejects, as browsers do.
      if (/none|missing/.test(src)) return new Promise((_, reject) => setTimeout(() => { a.dispatchEvent(new Event('error')); reject(new Error('missing')); }, 5));
      setTimeout(() => { a.dispatchEvent(new Event('playing')); }, 5);
      setTimeout(() => a.dispatchEvent(new Event('ended')), window.__clipMs || 30);
      return Promise.resolve();
    };
    return a;
  };
};

// A tiny valid WAV (silence) used as a stand-in for a recorded clip.
export function silentWav() {
  const n = 800, buf = Buffer.alloc(44 + n);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22); buf.writeUInt32LE(8000, 24); buf.writeUInt32LE(8000, 28);
  buf.writeUInt16LE(1, 32); buf.writeUInt16LE(8, 34); buf.write('data', 36); buf.writeUInt32LE(n, 40); buf.fill(128, 44);
  return buf;
}

// Web Audio cannot be heard here, so tests replace it with a recorder of what would be scheduled: every oscillator and
// noise source with its event name (set by js/sfx.js), frequency, start and stop times. window.__audioNotes() returns
// them as plain objects; window.__audio.contexts counts the AudioContexts created.
export const AUDIO_STUB = () => {
  const log = { contexts: 0, nodes: [] };
  window.__audio = log;
  const t0 = performance.now();
  class Param {
    constructor(v = 0) { this.value = v; this.values = [v]; }
    setValueAtTime(v) { this.value = v; this.values.push(v); return this; }
    linearRampToValueAtTime(v) { this.values.push(v); return this; }
    exponentialRampToValueAtTime(v) { this.values.push(v); return this; }
    setTargetAtTime() { return this; }
    cancelScheduledValues() { return this; }
  }
  class Node { connect(n) { return n; } disconnect() {} }
  class Source extends Node {
    constructor(noise) { super(); this.noise = noise; this.type = 'sine'; this.frequency = new Param(440); this.stops = []; this.startedAt = null; }
    start(t) { this.startedAt = t; log.nodes.push(this); }
    stop(t) { this.stops.push(t); }
  }
  class FakeAudioContext {
    constructor() { log.contexts++; this.state = 'running'; this.sampleRate = 44100; this.destination = new Node(); }
    get currentTime() { return (performance.now() - t0) / 1000; }
    resume() { this.state = 'running'; return Promise.resolve(); }
    suspend() { this.state = 'suspended'; log.suspends = (log.suspends || 0) + 1; return Promise.resolve(); }
    createGain() { const n = new Node(); n.gain = new Param(1); return n; }
    createDynamicsCompressor() { const n = new Node(); for (const k of ['threshold', 'knee', 'ratio', 'attack', 'release']) n[k] = new Param(0); return n; }
    createBiquadFilter() { const n = new Node(); n.frequency = new Param(350); n.Q = new Param(1); return n; }
    createBuffer(ch, len) { return { getChannelData: () => new Float32Array(len) }; }
    createBufferSource() { return new Source(true); }
    createOscillator() { return new Source(false); }
  }
  window.AudioContext = FakeAudioContext;
  window.webkitAudioContext = undefined;
  window.__audioNotes = () => log.nodes.map((n) => ({
    event: n.eventName, partial: !!n.partial, bloop: !!n.bloop, noise: !!n.noise, t: n.startedAt,
    freqs: n.noise ? (n.filter ? n.filter.frequency.values : (n.filterParam || [])) : n.frequency.values,
    stops: n.stops,
  }));
  window.__audioClear = () => { log.nodes.length = 0; };
};
