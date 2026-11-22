// Procedural Web Audio API sound effects for responsive game feel

class SoundEngine {
  private ctx: AudioContext | null = null;
  private panner: StereoPannerNode | null = null;
  private lastPanValue = 0;
  private lastRoarAt = 0;
  public muted = false;

  constructor() {
    if (typeof window !== 'undefined') {
      const unlockHandler = () => {
        this.unlock();
      };
      window.addEventListener('pointerdown', unlockHandler, { passive: true, once: true });
      window.addEventListener('touchstart', unlockHandler, { passive: true, once: true });
      window.addEventListener('keydown', unlockHandler, { passive: true, once: true });
    }
  }

  public unlock() {
    this.ensureContext();
  }

  private ensureContext(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    if (!this.panner && typeof this.ctx.createStereoPanner === 'function') {
      this.panner = this.ctx.createStereoPanner();
      this.panner.connect(this.ctx.destination);
    }
    return this.ctx;
  }

  setDragonSpatialAngle(yawRadians: number) {
    if (this.muted || !this.ctx || !this.panner) return;
    const pan = Math.max(-0.85, Math.min(0.85, Math.sin(yawRadians) * 0.85));
    if (Math.abs(pan - this.lastPanValue) < 0.02) return;
    this.lastPanValue = pan;
    this.panner.pan.setTargetAtTime(pan, this.ctx.currentTime, 0.08);
  }

  playDragonRoar(intensity = 1.0, yawRadians?: number) {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const nowMs = performance.now();
    if (nowMs - this.lastRoarAt < 260) return;
    this.lastRoarAt = nowMs;

    if (yawRadians !== undefined) {
      this.setDragonSpatialAngle(yawRadians);
    }

    const now = ctx.currentTime;
    const clamped = Math.max(0.45, Math.min(1.4, intensity));
    const duration = 0.36 + clamped * 0.14;
    const targetNode: AudioNode = this.panner ?? ctx.destination;

    // Low chest sub-growl
    const subOsc = ctx.createOscillator();
    const midOsc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    subOsc.type = 'sawtooth';
    subOsc.frequency.setValueAtTime(102 * (0.95 + clamped * 0.08), now);
    subOsc.frequency.exponentialRampToValueAtTime(36, now + duration);

    midOsc.type = 'triangle';
    midOsc.frequency.setValueAtTime(158, now);
    midOsc.frequency.exponentialRampToValueAtTime(54, now + duration);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(460 + clamped * 160, now);
    filter.frequency.exponentialRampToValueAtTime(125, now + duration);
    filter.Q.setValueAtTime(3.8, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.11 * clamped, now + 0.045);
    gain.gain.exponentialRampToValueAtTime(0.0008, now + duration);

    subOsc.connect(filter);
    midOsc.connect(filter);
    filter.connect(gain);
    gain.connect(targetNode);

    subOsc.start(now);
    midOsc.start(now);
    subOsc.stop(now + duration + 0.02);
    midOsc.stop(now + duration + 0.02);
  }

  private playTone(
    freq: number,
    endFreq: number,
    duration: number,
    type: OscillatorType = 'sine',
    volume = 0.12,
    delay = 0
  ) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq !== freq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);
    }
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  playTapFeed() {
    this.playTone(340, 520, 0.075, 'triangle', 0.12);
    this.playTone(880, 1120, 0.09, 'sine', 0.07, 0.03);
  }

  playComboTap(combo: number) {
    const step = Math.min(combo, 20);
    const base = 360 + step * 26;
    this.playTone(base, base * 1.38, 0.075, 'triangle', 0.12);
    this.playTone(base * 1.5, base * 1.8, 0.08, 'sine', 0.06, 0.025);
  }

  playCritHit() {
    this.playTone(220, 95, 0.13, 'sawtooth', 0.14);
    this.playTone(920, 1480, 0.16, 'triangle', 0.14, 0.02);
  }

  playFeverStart() {
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    notes.forEach((n, i) => {
      this.playTone(n, n * 1.05, 0.14, 'triangle', 0.13, i * 0.045);
    });
  }

  playBattleHit() {
    this.playTone(190, 80, 0.09, 'square', 0.11);
    this.playTone(480, 260, 0.08, 'triangle', 0.09);
  }

  playSkillUse() {
    this.playTone(420, 960, 0.16, 'triangle', 0.14, 0);
    this.playTone(660, 1320, 0.22, 'sine', 0.14, 0.06);
  }

  playParry() {
    this.playTone(980, 1560, 0.09, 'triangle', 0.16, 0);
    this.playTone(540, 1180, 0.15, 'sine', 0.14, 0.03);
  }

  playVictory() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, i) => {
      this.playTone(n, n, 0.18, 'triangle', 0.15, i * 0.08);
    });
  }

  playDefeat() {
    this.playTone(340, 220, 0.2, 'sawtooth', 0.1, 0);
    this.playTone(220, 130, 0.28, 'sawtooth', 0.1, 0.14);
  }

  playAuctionAlert() {
    this.playTone(760, 920, 0.09, 'square', 0.09, 0);
    this.playTone(920, 760, 0.11, 'square', 0.09, 0.1);
  }

  playBlitzStart() {
    this.playTone(440, 880, 0.14, 'triangle', 0.14, 0);
    this.playTone(660, 1320, 0.18, 'sine', 0.14, 0.09);
  }

  playRaceBeep(final = false) {
    if (final) {
      this.playTone(880, 1174, 0.22, 'triangle', 0.15);
    } else {
      this.playTone(520, 520, 0.1, 'sine', 0.1);
    }
  }

  playLevelUp() {
    this.playTone(523.25, 523.25, 0.12, 'triangle', 0.14, 0);
    this.playTone(659.25, 659.25, 0.12, 'triangle', 0.14, 0.08);
    this.playTone(783.99, 783.99, 0.14, 'triangle', 0.14, 0.16);
    this.playTone(1046.5, 1046.5, 0.25, 'sine', 0.16, 0.24);
  }

  playMerge(tier = 1) {
    const base = 360 + Math.min(tier, 8) * 55;
    this.playTone(base, base * 1.35, 0.14, 'triangle', 0.14, 0);
    this.playTone(base * 1.5, base * 2, 0.18, 'sine', 0.11, 0.06);
  }

  playGodConfirm() {
    this.playTone(440, 440, 0.1, 'triangle', 0.13, 0);
    this.playTone(554.37, 554.37, 0.1, 'triangle', 0.13, 0.07);
    this.playTone(659.25, 659.25, 0.14, 'triangle', 0.14, 0.14);
    this.playTone(880, 920, 0.28, 'sine', 0.16, 0.21);
  }

  playChestOpen() {
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    notes.forEach((n, i) => {
      this.playTone(n, n * 1.02, 0.16, 'sine', 0.12, i * 0.06);
    });
  }

  playClaim() {
    this.playTone(740, 980, 0.11, 'sine', 0.12, 0);
    this.playTone(1174, 1480, 0.16, 'sine', 0.12, 0.06);
  }

  playFlip() {
    this.playTone(300, 650, 0.12, 'triangle', 0.12, 0);
    this.playTone(650, 960, 0.15, 'sine', 0.12, 0.1);
  }

  playWheelTick() {
    this.playTone(620, 420, 0.035, 'square', 0.05);
  }

  playTabSwitch() {
    this.playTone(480, 560, 0.05, 'sine', 0.06);
  }

  playError() {
    this.playTone(220, 160, 0.14, 'sawtooth', 0.08);
  }
}

export const soundFX = new SoundEngine();
