// ============================================================
// Speedball 2: Brutal Deluxe — AudioManager
// Procedural sound effects via Web Audio API.
// ============================================================

export class AudioManager {
  // ------ Public Sound API -------------------------------------------------

  /** Ascending 3-tone goal jingle: 440 → 660 → 880 Hz, square wave. */
  playGoal(): void {
    this.playTone(440, 0.12, 'square');
    setTimeout(() => this.playTone(660, 0.12, 'square'), 120);
    setTimeout(() => this.playTone(880, 0.18, 'square'), 240);
  }

  /** Low thud on a tackle: 120 Hz sawtooth, 0.1 s. */
  playTackle(): void {
    this.playTone(120, 0.1, 'sawtooth');
  }

  /** Short ping on a bounce: 300 Hz sine, 0.05 s. */
  playBounce(): void {
    this.playTone(300, 0.05, 'sine');
  }

  /** Referee whistle: 800 Hz square, 0.4 s. */
  playWhistle(): void {
    this.playTone(800, 0.4, 'square');
  }

  // ------ Private Tone Engine ----------------------------------------------

  /**
   * Creates a one-shot tone using the Web Audio API.
   * Volume starts at 0.1 and ramps down exponentially to near-silence,
   * giving a natural decay rather than a hard click at the end.
   *
   * @param freq     Frequency in Hz
   * @param duration Tone duration in seconds
   * @param type     OscillatorNode wave type
   */
  private playTone(freq: number, duration: number, type: OscillatorType): void {
    try {
      const ctx  = new AudioContext();
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type      = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);

      // Release the AudioContext once the tone has finished.
      osc.onended = (): void => {
        ctx.close().catch(() => { /* ignore */ });
      };
    } catch {
      // Web Audio not available — silently ignore (e.g. test environments).
    }
  }
}
