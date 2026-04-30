import type { EnemyManager } from '../EnemyManager';
import type { WaveSpec } from '../levels/LevelSpec';

interface SpawnEntry {
  kind: import('../enemies/types').EnemyKind;
  /** Seconds after the wave starts to spawn this enemy. */
  at: number;
}

const INTERMISSION_DURATION = 4;
const PRE_GAME_INTERMISSION = 2;

/** Build an evenly-staggered spawn schedule from a counts-by-kind plan. */
function buildSchedule(spec: WaveSpec): SpawnEntry[] {
  const total = spec.plan.reduce((acc, [, n]) => acc + n, 0);
  const out: SpawnEntry[] = [];
  let i = 0;
  for (const [kind, count] of spec.plan) {
    for (let k = 0; k < count; k++) {
      const t = total === 1 ? 0 : (i / (total - 1)) * spec.durationSec;
      out.push({ kind, at: t });
      i++;
    }
  }
  out.sort((a, b) => a.at - b.at);
  return out;
}

export interface WaveStatus {
  /** 1-based wave index within the current level. */
  wave: number;
  /** Total waves in the current level. */
  totalWaves: number;
  /** Total number of enemies queued + alive in the current wave. */
  remaining: number;
  /** Seconds left in the intermission, or 0 if the wave is active. */
  intermissionLeft: number;
  /** Banner text to display, or null if nothing to display. */
  banner: string | null;
  /** True once the last wave of the current level has been cleared. */
  allClear: boolean;
}

/**
 * Drives Serious-Sam-style scripted waves for a single level. The level provides the
 * wave schedule via `setWaves`; once every wave is cleared, `status.allClear` becomes
 * true and the LevelManager spawns the exit portal.
 */
export class WaveManager {
  private waves: WaveSpec[] = [];
  private waveIndex = 0;
  private spawnQueue: SpawnEntry[] = [];
  private waveTime = 0;
  private intermission = PRE_GAME_INTERMISSION;
  private bannerText: string | null = 'GET READY';
  private bannerTimer = PRE_GAME_INTERMISSION;
  private waveActive = false;
  private allClear = false;

  /** Replace the wave list (used at level start / transition). Resets internal state. */
  setWaves(waves: WaveSpec[], firstBanner = 'GET READY'): void {
    this.waves = waves;
    this.waveIndex = 0;
    this.spawnQueue = [];
    this.waveTime = 0;
    this.intermission = PRE_GAME_INTERMISSION;
    this.bannerText = firstBanner;
    this.bannerTimer = PRE_GAME_INTERMISSION;
    this.waveActive = false;
    this.allClear = false;
  }

  reset(): void {
    this.setWaves(this.waves);
  }

  status(enemies: EnemyManager): WaveStatus {
    const remaining = this.spawnQueue.length + enemies.aliveCount();
    return {
      wave: Math.min(this.waveIndex + 1, this.waves.length),
      totalWaves: this.waves.length,
      remaining,
      intermissionLeft: this.intermission,
      banner: this.bannerTimer > 0 ? this.bannerText : null,
      allClear: this.allClear,
    };
  }

  update(dt: number, enemies: EnemyManager): void {
    if (this.bannerTimer > 0) this.bannerTimer -= dt;
    if (this.allClear) return;

    if (this.intermission > 0) {
      this.intermission -= dt;
      if (this.intermission <= 0) {
        this.beginCurrentWave();
      }
      return;
    }

    if (!this.waveActive) return;
    this.waveTime += dt;

    while (this.spawnQueue.length > 0 && this.spawnQueue[0].at <= this.waveTime) {
      const entry = this.spawnQueue.shift()!;
      enemies.spawn(entry.kind);
    }

    if (this.spawnQueue.length === 0 && enemies.aliveCount() === 0) {
      this.endCurrentWave();
    }
  }

  private beginCurrentWave(): void {
    if (this.waves.length === 0) return;
    const def = this.waves[this.waveIndex];
    this.spawnQueue = buildSchedule(def);
    this.waveTime = 0;
    this.waveActive = true;
    this.bannerText = def.name;
    this.bannerTimer = 3;
  }

  private endCurrentWave(): void {
    this.waveActive = false;
    this.waveIndex++;
    if (this.waveIndex >= this.waves.length) {
      this.allClear = true;
      this.bannerText = 'AREA CLEAR — FIND THE PORTAL';
      this.bannerTimer = 5;
      this.intermission = 0;
      return;
    }
    this.intermission = INTERMISSION_DURATION;
    this.bannerText = 'WAVE CLEARED';
    this.bannerTimer = INTERMISSION_DURATION;
  }
}
