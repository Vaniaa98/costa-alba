// WebAudio synthesized sound + music. No audio files, no network. Starts on first input.
export function createAudio() {
  let ctx = null, master = null, engineOsc = null, engineGain = null, sirenOsc = null, sirenGain = null;
  let musicOn = false, musicTimer = null, muted = false;
  function ensure() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return true; }
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination);
      engineOsc = ctx.createOscillator(); engineOsc.type = 'sawtooth'; engineOsc.frequency.value = 60;
      engineGain = ctx.createGain(); engineGain.gain.value = 0; engineOsc.connect(engineGain); engineGain.connect(master); engineOsc.start();
      sirenOsc = ctx.createOscillator(); sirenOsc.type = 'sine'; sirenOsc.frequency.value = 700;
      sirenGain = ctx.createGain(); sirenGain.gain.value = 0; sirenOsc.connect(sirenGain); sirenGain.connect(master); sirenOsc.start();
      return true;
    } catch { return false; }
  }
  function tone(freq, dur, type = 'sine', vol = 0.2, when = 0) {
    if (!ctx || muted) return;
    const t = ctx.currentTime + when;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, vol = 0.25, freq = 1200) {
    if (!ctx || muted) return;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq;
    const g = ctx.createGain(); g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(master); src.start();
  }
  // Simple sunny bassline loop (A minor pentatonic-ish), scheduled in 8th notes.
  const BASS = [110, 0, 130.8, 0, 98, 0, 110, 0, 146.8, 0, 130.8, 0, 98, 0, 82.4, 0];
  let step = 0;
  function musicTick() {
    if (!musicOn || !ctx || muted) return;
    const n = BASS[step % BASS.length]; step++;
    if (n) tone(n, 0.22, 'triangle', 0.12);
    if (step % 4 === 0) tone(440 + ((step * 37) % 220), 0.1, 'square', 0.03);
    musicTimer = setTimeout(musicTick, 210);
  }
  return {
    ensure,
    setMuted(v) { muted = v; if (master) master.gain.value = v ? 0 : 0.5; },
    engine(speed01, on) {
      if (!ctx) return;
      engineGain.gain.value = on ? 0.03 + speed01 * 0.05 : 0;
      engineOsc.frequency.value = 55 + speed01 * 140;
    },
    siren(on, t) {
      if (!ctx) return;
      sirenGain.gain.value = on ? 0.05 : 0;
      if (on) sirenOsc.frequency.value = 650 + Math.sin(t * 6) * 250;
    },
    shot() { noise(0.12, 0.3, 900); tone(180, 0.08, 'square', 0.12); },
    hit() { tone(220, 0.12, 'sawtooth', 0.15); },
    pickup() { tone(880, 0.1, 'sine', 0.2); tone(1320, 0.14, 'sine', 0.18, 0.08); },
    cash() { tone(660, 0.08, 'sine', 0.2); tone(880, 0.08, 'sine', 0.2, 0.07); tone(1100, 0.16, 'sine', 0.22, 0.14); },
    mission() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, 'triangle', 0.2, i * 0.1)); },
    fail() { [392, 330, 262].forEach((f, i) => tone(f, 0.22, 'sawtooth', 0.12, i * 0.14)); },
    crash() { noise(0.35, 0.4, 500); tone(70, 0.3, 'sine', 0.3); },
    startMusic() { if (!musicOn) { musicOn = true; musicTick(); } },
    stopMusic() { musicOn = false; if (musicTimer) clearTimeout(musicTimer); },
  };
}
