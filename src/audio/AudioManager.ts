/**
 * Procedural Web Audio engine. No external samples — every SFX is synthesised
 * from oscillators + noise + filters at play time. This keeps the bundle tiny
 * and lets us tune sounds in code.
 *
 * AudioContext is created lazily on the first user gesture (browsers refuse to
 * resume audio without one). Until then, every play() is a no-op.
 *
 * Master volume + a global mute are stored in localStorage so they survive
 * reloads.
 */

const VOLUME_KEY = 'doomsam.audio.volume';
const MUTED_KEY = 'doomsam.audio.muted';

export type SfxId =
  | 'pistol' | 'shotgun' | 'chaingun' | 'fist' | 'rocketLaunch' | 'rocketExplode'
  | 'cannonExplode' | 'plasma' | 'bfg'
  | 'enemyShoot' | 'enemyHit' | 'enemyDie' | 'kamikazeBoom' | 'bullCharge'
  | 'playerHurt' | 'playerDie'
  | 'pickupHealth' | 'pickupArmor' | 'pickupAmmo'
  | 'portalReady' | 'levelStart' | 'victory';

export class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private ambientNodes: { stop: () => void } | null = null;
  private volume: number;
  private muted: boolean;

  constructor() {
    const v = parseFloat(localStorage.getItem(VOLUME_KEY) ?? '0.6');
    this.volume = Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0.6;
    this.muted = localStorage.getItem(MUTED_KEY) === '1';
  }

  /** Must be called inside a user-gesture handler (e.g. CLICK TO PLAY). */
  resume(): void {
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : this.volume;
      this.masterGain.connect(this.ctx.destination);
      this.noiseBuffer = this.makeNoiseBuffer(2);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  isReady(): boolean {
    return this.ctx !== null && this.masterGain !== null;
  }

  getVolume(): number { return this.volume; }
  isMuted(): boolean { return this.muted; }

  setVolume(v: number): void {
    this.volume = Math.max(0, Math.min(1, v));
    localStorage.setItem(VOLUME_KEY, this.volume.toString());
    if (this.masterGain && !this.muted) {
      this.masterGain.gain.value = this.volume;
    }
  }

  setMuted(m: boolean): void {
    this.muted = m;
    localStorage.setItem(MUTED_KEY, m ? '1' : '0');
    if (this.masterGain) {
      this.masterGain.gain.value = m ? 0 : this.volume;
    }
  }

  toggleMute(): void { this.setMuted(!this.muted); }

  play(id: SfxId): void {
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;
    switch (id) {
      case 'pistol':         this.gunShot(t, 0.45, 1800, 0.07); break;
      case 'shotgun':        this.gunShot(t, 0.85, 900, 0.18); break;
      case 'chaingun':       this.gunShot(t, 0.35, 2400, 0.05); break;
      case 'fist':           this.thump(t, 120, 0.12, 0.45); break;
      case 'rocketLaunch':   this.rocketLaunch(t); break;
      case 'rocketExplode':  this.explosion(t, 0.9, 0.7); break;
      case 'cannonExplode':  this.explosion(t, 1.0, 1.1); break;
      case 'plasma':         this.zap(t, 880, 0.12, 'sawtooth'); break;
      case 'bfg':            this.zap(t, 110, 0.6, 'square'); break;
      case 'enemyShoot':     this.zap(t, 440, 0.18, 'square'); break;
      case 'enemyHit':       this.thump(t, 220, 0.06, 0.3); break;
      case 'enemyDie':       this.enemyDeath(t); break;
      case 'kamikazeBoom':   this.explosion(t, 0.7, 0.5); break;
      case 'bullCharge':     this.bullCharge(t); break;
      case 'playerHurt':     this.thump(t, 80, 0.18, 0.7); break;
      case 'playerDie':      this.playerDeath(t); break;
      case 'pickupHealth':   this.chime(t, [523, 659, 784], 0.1); break;
      case 'pickupArmor':    this.chime(t, [392, 523, 659], 0.1); break;
      case 'pickupAmmo':     this.chime(t, [659, 784], 0.07); break;
      case 'portalReady':    this.chime(t, [330, 415, 494, 659], 0.18); break;
      case 'levelStart':     this.chime(t, [262, 330, 392, 523], 0.16); break;
      case 'victory':        this.chime(t, [262, 330, 392, 523, 659, 784], 0.22); break;
    }
  }

  /** Start a per-level ambient drone. Replaces any previous one. */
  startAmbient(rootHz: number, color: 'warm' | 'cold' | 'menacing'): void {
    if (!this.ctx || !this.masterGain) return;
    this.stopAmbient();

    const ctx = this.ctx;
    const out = ctx.createGain();
    out.gain.value = 0;
    out.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 1.5);
    out.connect(this.masterGain);

    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = color === 'cold' ? 600 : color === 'menacing' ? 380 : 800;
    filt.Q.value = 0.6;
    filt.connect(out);

    // Slow LFO on filter cutoff for movement.
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.08;
    lfoGain.gain.value = 120;
    lfo.connect(lfoGain).connect(filt.frequency);
    lfo.start();

    // Two detuned saws an octave apart give a metal/horror drone.
    const oscs: OscillatorNode[] = [];
    for (const ratio of [1, 1.005, 2, 2.013]) {
      const o = ctx.createOscillator();
      o.type = color === 'menacing' ? 'sawtooth' : 'triangle';
      o.frequency.value = rootHz * ratio;
      o.connect(filt);
      o.start();
      oscs.push(o);
    }

    this.ambientNodes = {
      stop: () => {
        out.gain.cancelScheduledValues(ctx.currentTime);
        out.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
        const stopAt = ctx.currentTime + 0.5;
        for (const o of oscs) o.stop(stopAt);
        lfo.stop(stopAt);
      },
    };
  }

  stopAmbient(): void {
    if (this.ambientNodes) {
      this.ambientNodes.stop();
      this.ambientNodes = null;
    }
  }

  // ------------------------------------------------------------------
  // Internal SFX building blocks.
  // ------------------------------------------------------------------

  private gunShot(t: number, gain: number, lpHz: number, decay: number): void {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer) return;
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(lpHz, t);
    lp.frequency.exponentialRampToValueAtTime(Math.max(60, lpHz * 0.2), t + decay);

    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + decay);

    src.connect(lp).connect(g).connect(this.masterGain);
    src.start(t);
    src.stop(t + decay + 0.02);
  }

  private explosion(t: number, gain: number, decay: number): void {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer) return;
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(2200, t);
    lp.frequency.exponentialRampToValueAtTime(120, t + decay);

    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + decay);

    src.connect(lp).connect(g).connect(this.masterGain);
    src.start(t);
    src.stop(t + decay + 0.05);

    // Sub-bass thump.
    const sub = ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(120, t);
    sub.frequency.exponentialRampToValueAtTime(40, t + decay * 0.6);
    const sg = ctx.createGain();
    sg.gain.setValueAtTime(gain * 0.8, t);
    sg.gain.exponentialRampToValueAtTime(0.001, t + decay);
    sub.connect(sg).connect(this.masterGain);
    sub.start(t);
    sub.stop(t + decay + 0.05);
  }

  private rocketLaunch(t: number): void {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer) return;
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(400, t);
    bp.frequency.linearRampToValueAtTime(1200, t + 0.25);
    bp.Q.value = 1.5;

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.6, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    src.connect(bp).connect(g).connect(this.masterGain);
    src.start(t);
    src.stop(t + 0.42);
  }

  private zap(t: number, hz: number, decay: number, type: OscillatorType): void {
    if (!this.ctx || !this.masterGain) return;
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(hz * 1.5, t);
    o.frequency.exponentialRampToValueAtTime(hz, t + decay);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.35, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + decay);

    o.connect(g).connect(this.masterGain);
    o.start(t);
    o.stop(t + decay + 0.02);
  }

  private thump(t: number, hz: number, decay: number, gain: number): void {
    if (!this.ctx || !this.masterGain) return;
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(hz * 2, t);
    o.frequency.exponentialRampToValueAtTime(hz * 0.5, t + decay);

    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + decay);

    o.connect(g).connect(this.masterGain);
    o.start(t);
    o.stop(t + decay + 0.02);
  }

  private chime(t: number, freqs: number[], step: number): void {
    if (!this.ctx || !this.masterGain) return;
    const ctx = this.ctx;
    for (let i = 0; i < freqs.length; i++) {
      const start = t + i * step;
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = freqs[i];

      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, start);
      g.gain.exponentialRampToValueAtTime(0.32, start + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, start + step + 0.1);

      o.connect(g).connect(this.masterGain);
      o.start(start);
      o.stop(start + step + 0.15);
    }
  }

  private enemyDeath(t: number): void {
    if (!this.ctx || !this.masterGain) return;
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(360, t);
    o.frequency.exponentialRampToValueAtTime(60, t + 0.4);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.45, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    o.connect(g).connect(this.masterGain);
    o.start(t);
    o.stop(t + 0.45);
  }

  private playerDeath(t: number): void {
    if (!this.ctx || !this.masterGain) return;
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(180, t);
    o.frequency.exponentialRampToValueAtTime(50, t + 1.0);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.7, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 1.0);
    o.connect(g).connect(this.masterGain);
    o.start(t);
    o.stop(t + 1.05);
  }

  private bullCharge(t: number): void {
    if (!this.ctx || !this.masterGain) return;
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = 'square';
    o.frequency.setValueAtTime(80, t);
    o.frequency.linearRampToValueAtTime(140, t + 0.4);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.4, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    o.connect(g).connect(this.masterGain);
    o.start(t);
    o.stop(t + 0.55);
  }

  private makeNoiseBuffer(seconds: number): AudioBuffer | null {
    if (!this.ctx) return null;
    const sr = this.ctx.sampleRate;
    const buf = this.ctx.createBuffer(1, sr * seconds, sr);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buf;
  }
}
