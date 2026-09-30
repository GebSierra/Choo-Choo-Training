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
      setTimeout(() => u.onend && u.onend({}), 40);
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
      if (/none|missing/.test(src)) { setTimeout(() => a.dispatchEvent(new Event('error')), 5); return Promise.reject(new Error('missing')); }
      setTimeout(() => { a.dispatchEvent(new Event('playing')); }, 5);
      setTimeout(() => a.dispatchEvent(new Event('ended')), 30);
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
