import { notificationPriority } from "./events.js";
// Original synthesized effects: no samples from the commercial game are used.
const terrainUnit = 22.4 / 576;
const arenaCues = new Set([6, 7, 14, 15]);

// Match announcements stay centered; action sounds follow the visible court.
export function eventPan(state, event, view) {
  if (arenaCues.has(event.kind)) return 0;
  const centerZ =
    view?.centerZ ?? ((state.logicalView?.[0] ?? 160) - 160) * terrainUnit;
  return Math.max(
    -0.8,
    Math.min(0.8, (event.z - centerZ) / (view?.halfWidth ?? 160 * terrainUnit)),
  );
}

// Each layer is [waveform, start Hz, end Hz, seconds, gain, delay seconds].
export const cues = {
  // Distinct source collection cues: coin 0x15, equipment 0x21. New synthesized timbres.
  coin: [["sine", 1568, 1568, .16, .13, 0], ["sine", 2352, 2352, .12, .05, 0], ["triangle", 2093, 2093, .14, .07, .07]],
  equipment: [["noise", 1600, 500, .06, .08, 0], ["triangle", 440, 440, .13, .10, 0], ["triangle", 660, 660, .13, .10, .08], ["sine", 880, 880, .20, .12, .16]],
  // Tackle contact (Amiga 0x06), including unsuccessful attempts.
  29: [["noise", 1800, 500, .065, .12, 0], ["triangle", 210, 100, .07, .075, 0]],
  // Zap pickup activation (Amiga sound 0x12), distinct from electroball contact.
  zap: [
    ["noise", 4800, 600, .24, .19, 0],
    ["sawtooth", 980, 95, .28, .08, 0],
    ["noise", 3200, 1100, .055, .1, .06],
    ["noise", 2200, 500, .065, .08, .15],
  ],
  // Amiga wall contacts: high side 0x32, low end 0x33, high end 0x34.
  26: [["noise", 5100, 3200, 0.03, 0.08, 0], ["sine", 1800, 1800, 0.15, 0.12, 0], ["sine", 2710, 2710, 0.1, 0.05, 0]],
  27: [["noise", 850, 230, 0.08, 0.14, 0], ["sine", 240, 160, 0.18, 0.16, 0], ["triangle", 650, 440, 0.1, 0.05, 0]],
  28: [["noise", 3100, 1500, 0.05, 0.1, 0], ["sine", 1200, 900, 0.17, 0.13, 0], ["sine", 2070, 2070, 0.12, 0.06, 0]],
  // Distinct team interception signals, alongside the catch contact sound.
  24: [["triangle", 440, 880, 0.16, 0.1, 0], ["sine", 1100, 1100, 0.12, 0.06, 0.08]],
  25: [["triangle", 880, 440, 0.16, 0.1, 0], ["sine", 550, 550, 0.12, 0.06, 0.08]],
  // Launcher mechanism (source 0x09), then pneumatic release (0x28).
  22: [
    ["noise", 600, 1200, 0.55, 0.15, 0],
    ["sawtooth", 65, 115, 0.5, 0.055, 0],
    ["sine", 340, 280, 0.1, 0.08, 0.5],
  ],
  23: [
    ["noise", 280, 2800, 0.22, 0.2, 0],
    ["sine", 100, 42, 0.16, 0.2, 0],
    ["noise", 2400, 600, 0.2, 0.08, 0.1],
  ],
  // Floor-item appearance, matching original sound 0x25 timing.
  21: [
    ["sine", 1040, 1560, 0.11, 0.1, 0],
    ["triangle", 2080, 2080, 0.12, 0.04, 0.045],
  ],
  20: [["noise", 1800, 700, 0.1, 0.1, 0]],
  // Landing and slide recovery: original event timing, newly synthesized timbres.
  18: [
    ["noise", 650, 160, 0.09, 0.1, 0],
    ["sine", 125, 55, 0.1, 0.14, 0],
  ],
  19: [["noise", 1100, 280, 0.1, 0.08, 0]],
  17: [
    ["noise", 1100, 250, 0.1, 0.18, 0],
    ["triangle", 750, 320, 0.14, 0.12, 0],
  ],
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
    ["noise", 900, 120, 0.25, 0.2, 0],
    ["sine", 130, 38, 0.22, 0.26, 0],
    // Brief armor rattle over the low body impact.
    ["noise", 3400, 1500, 0.045, 0.07, 0.008],
    ["sine", 720, 690, 0.08, 0.035, 0.01],
  ],
  5: [
    // Inharmonic resonances distinguish steel contact from body impact.
    ["noise", 4200, 2400, 0.025, 0.07, 0],
    ["sine", 950, 950, 0.18, 0.11, 0],
    ["sine", 1430, 1430, 0.13, 0.06, 0],
    ["sine", 2130, 2130, 0.09, 0.035, 0],
    ["sine", 2981, 2981, 0.065, 0.02, 0],
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
    this.volume = 0.65;
    this.active = false;
    this.voices = new Set();
    this.lastEvent = 0;
    this.wasPlaying = false;
    this.wasOver = false;
    this.wasPaused = false;
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
        this.master.gain.value = this.volume;
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

  setVolume(value) {
    if (!Number.isFinite(value)) return this.volume;
    this.volume = Math.max(0, Math.min(1, value));
    if (this.master) {
      const now = this.context.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setTargetAtTime(this.volume, now, 0.015);
    }
    if (this.volume === 0) this.stop();
    return this.volume;
  }

  reset() {
    this.stop();
    this.lastEvent = 0;
    this.wasPlaying = false;
    this.wasOver = false;
    this.wasPaused = false;
  }

  setActive(active) {
    if (this.active && !active) this.stop();
    this.active = active;
  }

  observe(state, playing, view) {
    const paused = state.pause > 0 || !!state.medical || !!state.restartPhase;
    if (
      playing &&
      !state.over &&
      !paused &&
      (!this.wasPlaying || this.wasPaused)
    )
      this.play("kickoff");
    if (state.over && !this.wasOver) this.play("fulltime");
    this.wasPlaying = playing;
    this.wasOver = state.over;
    this.wasPaused = paused;
    for (const e of state.events?.length
      ? state.events
      : state.event
        ? [state.event]
        : []) {
      if (e.id <= this.lastEvent) continue;
      this.lastEvent = e.id;
      // Event 3 marks physical release; its sound belongs to windup event 30.
      if (e.kind === 3) continue;
      const cue = e.kind === 30 ? 3 : e.kind !== 11 ? e.kind : e.target === 12 ? "zap"
        : e.target === 13 ? "coin" : e.target >= 14 ? "equipment" : 11;
      // Stable presentation variation: clients hearing the same hit choose the
      // same timbre without consuming any simulation random numbers.
      if (cue === 4) this.play(cue, eventPan(state, e, view), e.id & 3);
      else this.play(cue, eventPan(state, e, view));
    }
  }

  play(kind, pan = 0, variant = 0) {
    const c = this.context;
    if (!this.enabled || !this.active || this.volume === 0 || !c || c.state !== "running") return;
    const priority =
      ["zap", "coin", "equipment"].includes(kind) ? 1 : typeof kind === "string" ? 3 : Math.max(0, notificationPriority(kind));
    for (const layer of cues[kind] ?? []) {
      // Keep whistles and match announcements audible through dense collisions.
      if (this.voices.size >= 32) {
        let victim;
        for (const voice of this.voices)
          if (!victim || voice.priority < victim.priority) victim = voice;
        if (victim.priority > priority) continue;
        victim.stop();
      }
      const [wave, baseFrom, baseTo, baseDuration, volume, delay] = layer;
      // Four newly synthesized impact colors echo the original alternating hits.
      const pitch = kind === 4 ? [0.82, 0.94, 1.06, 1.18][variant & 3] : 1;
      const from = baseFrom * pitch, to = baseTo * pitch;
      const duration = baseDuration * (kind === 4 ? [1.05, 1, .92, .86][variant & 3] : 1);
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
        priority,
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
