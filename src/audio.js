// Original synthesized effects: no samples from the commercial game are used.
// Each layer is [waveform, start Hz, end Hz, seconds, gain, delay seconds].
export const cues = {
  16: [
    ["noise", 450, 180, 0.08, 0.1, 0],
    ["sine", 160, 80, 0.07, 0.12, 0],
  ],
  1: [["noise", 1700, 450, 0.22, 0.12, 0]],
  2: [["noise", 500, 2100, 0.18, 0.08, 0]],
  3: [
    ["noise", 3000, 650, 0.12, 0.15, 0],
    ["sine", 380, 120, 0.08, 0.1, 0],
  ],
  4: [
    ["noise", 900, 120, 0.25, 0.24, 0],
    ["sine", 130, 38, 0.22, 0.3, 0],
  ],
  5: [
    ["triangle", 1350, 650, 0.15, 0.15, 0],
    ["sine", 2130, 1700, 0.09, 0.06, 0],
  ],
  6: [
    ["sine", 1800, 1770, 0.24, 0.1, 0],
    ["sine", 1800, 1770, 0.4, 0.1, 0.35],
  ],
  7: [
    ["sawtooth", 146.8, 146.8, 0.7, 0.07, 0],
    ["sawtooth", 220, 220, 0.7, 0.06, 0],
    ["noise", 700, 1400, 1.2, 0.17, 0.1],
  ],
  8: [
    ["sine", 880, 880, 0.2, 0.13, 0],
    ["sine", 1320, 1320, 0.3, 0.1, 0.09],
  ],
  9: [
    ["triangle", 440, 880, 0.2, 0.12, 0],
    ["triangle", 880, 1760, 0.24, 0.1, 0.15],
  ],
  10: [["triangle", 660, 220, 0.25, 0.12, 0]],
  11: [
    ["sine", 660, 660, 0.1, 0.12, 0],
    ["sine", 880, 880, 0.15, 0.1, 0.08],
    ["sine", 1320, 1320, 0.2, 0.08, 0.16],
  ],
  12: [
    ["sine", 180, 2200, 0.2, 0.14, 0],
    ["noise", 300, 4000, 0.25, 0.12, 0],
    ["sine", 2200, 180, 0.25, 0.12, 0.2],
  ],
  13: [
    ["sawtooth", 90, 160, 0.3, 0.09, 0],
    ["noise", 5000, 1800, 0.3, 0.17, 0],
  ],
  14: [
    ["sine", 660, 660, 0.3, 0.1, 0],
    ["sine", 440, 440, 0.3, 0.1, 0.3],
    ["sine", 660, 660, 0.3, 0.1, 0.6],
  ],
  15: [
    ["triangle", 440, 440, 0.16, 0.1, 0],
    ["triangle", 660, 660, 0.24, 0.1, 0.14],
  ],
  kickoff: [["sine", 1850, 1800, 0.35, 0.1, 0]],
  fulltime: [
    ["sine", 1800, 1750, 0.2, 0.1, 0],
    ["sine", 1800, 1750, 0.2, 0.1, 0.3],
    ["sine", 1800, 1750, 0.55, 0.1, 0.6],
  ],
};

export class ArenaAudio {
  constructor(createContext = () => new AudioContext()) {
    this.createContext = createContext;
    this.enabled = false;
    this.active = false;
    this.voices = new Set();
    this.lastEvent = 0;
    this.wasPlaying = false;
    this.wasOver = false;
  }

  async enable(enabled) {
    this.enabled = enabled;
    if (!enabled) {
      this.stop();
      return false;
    }
    try {
      if (!this.context) {
        const c = (this.context = this.createContext());
        this.master = c.createGain();
        this.master.gain.value = 0.65;
        this.limiter = c.createDynamicsCompressor();
        this.master.connect(this.limiter);
        this.limiter.connect(c.destination);
        this.noise = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
        const data = this.noise.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      }
      // Called by the sound button, inside a user gesture, to unlock autoplay.
      await this.context.resume();
      return this.enabled;
    } catch {
      this.enabled = false;
      this.stop();
      return false;
    }
  }

  reset() {
    this.stop();
    this.lastEvent = 0;
    this.wasPlaying = false;
    this.wasOver = false;
  }

  setActive(active) {
    if (this.active && !active) this.stop();
    this.active = active;
  }

  observe(state, playing) {
    if (playing && !this.wasPlaying && !state.over) this.play("kickoff");
    if (state.over && !this.wasOver) this.play("fulltime");
    this.wasPlaying = playing;
    this.wasOver = state.over;
    const e = state.event;
    if (e.id <= this.lastEvent) return;
    this.lastEvent = e.id;
    // The camera faces along the court: transverse Z is screen left/right.
    this.play(e.kind, Math.max(-0.8, Math.min(0.8, e.z / 14)));
  }

  play(kind, pan = 0) {
    const c = this.context;
    if (!this.enabled || !this.active || !c || c.state !== "running") return;
    for (const layer of cues[kind] ?? []) {
      // Bound polyphony during collisions and rapid repeated score contacts.
      if (this.voices.size >= 32) this.voices.values().next().value.stop();
      const [wave, from, to, duration, volume, delay] = layer;
      const start = c.currentTime + delay;
      const source =
        wave === "noise" ? c.createBufferSource() : c.createOscillator();
      const envelope = c.createGain();
      const stereo = c.createStereoPanner();
      const filter = wave === "noise" ? c.createBiquadFilter() : null;
      if (filter) {
        source.buffer = this.noise;
        filter.type = "bandpass";
        filter.Q.value = 0.7;
        filter.frequency.setValueAtTime(from, start);
        filter.frequency.exponentialRampToValueAtTime(to, start + duration);
        source.connect(filter);
        filter.connect(envelope);
      } else {
        source.type = wave;
        source.frequency.setValueAtTime(from, start);
        source.frequency.exponentialRampToValueAtTime(to, start + duration);
        source.connect(envelope);
      }
      envelope.gain.setValueAtTime(0.0001, start);
      envelope.gain.exponentialRampToValueAtTime(volume, start + 0.005);
      envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      stereo.pan.value = pan;
      envelope.connect(stereo);
      stereo.connect(this.master);
      let stopped = false;
      const cleanup = () => {
        source.disconnect();
        filter?.disconnect();
        envelope.disconnect();
        stereo.disconnect();
        this.voices.delete(voice);
      };
      const voice = {
        stop: () => {
          if (stopped) return;
          stopped = true;
          source.stop();
          cleanup();
        },
      };
      this.voices.add(voice);
      source.onended = cleanup;
      source.start(start);
      source.stop(start + duration + 0.01);
    }
  }

  stop() {
    for (const voice of this.voices) voice.stop();
  }
}
