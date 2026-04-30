/**
 * Persistent player preferences. Stored in localStorage and surfaced via the
 * settings panel. AudioManager owns its own volume + mute keys; this class
 * only covers controls/visuals.
 */

const SENSITIVITY_KEY = 'doomsam.sensitivity';
const FOV_KEY = 'doomsam.fov';

export interface SettingsValues {
  /** Mouse sensitivity multiplier (1.0 = stock, 0.4–2.5 typical range). */
  sensitivity: number;
  /** Vertical field of view in degrees. */
  fov: number;
}

const DEFAULTS: SettingsValues = {
  sensitivity: 1.0,
  fov: 85,
};

const RANGES = {
  sensitivity: { min: 0.4, max: 2.5 },
  fov: { min: 60, max: 110 },
};

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function readNumber(key: string, fallback: number, range: { min: number; max: number }): number {
  const raw = localStorage.getItem(key);
  if (raw === null) return fallback;
  const v = parseFloat(raw);
  if (!Number.isFinite(v)) return fallback;
  return clamp(v, range.min, range.max);
}

export class Settings {
  private values: SettingsValues;
  private listeners: Array<(v: SettingsValues) => void> = [];

  constructor() {
    this.values = {
      sensitivity: readNumber(SENSITIVITY_KEY, DEFAULTS.sensitivity, RANGES.sensitivity),
      fov: readNumber(FOV_KEY, DEFAULTS.fov, RANGES.fov),
    };
  }

  get(): SettingsValues {
    return { ...this.values };
  }

  ranges(): typeof RANGES {
    return RANGES;
  }

  setSensitivity(v: number): void {
    this.values.sensitivity = clamp(v, RANGES.sensitivity.min, RANGES.sensitivity.max);
    localStorage.setItem(SENSITIVITY_KEY, this.values.sensitivity.toString());
    this.emit();
  }

  setFov(v: number): void {
    this.values.fov = clamp(v, RANGES.fov.min, RANGES.fov.max);
    localStorage.setItem(FOV_KEY, this.values.fov.toString());
    this.emit();
  }

  /** Subscribe to setting changes. Listener receives the current values. */
  subscribe(fn: (v: SettingsValues) => void): () => void {
    this.listeners.push(fn);
    fn(this.get());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  private emit(): void {
    const snap = this.get();
    for (const l of this.listeners) l(snap);
  }
}
