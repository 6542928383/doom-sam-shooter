import { EnemyKind } from '../enemies/types';
import type { EnemyManager } from '../EnemyManager';

interface SpawnEntry {
  kind: EnemyKind;
  /** Seconds after the wave starts to spawn this enemy. */
  at: number;
}

interface WaveDef {
  /** Human-readable name shown briefly when the wave begins. */
  name: string;
  /** Time in seconds from wave start to spawn each enemy. */
  spawns: SpawnEntry[];
}

const INTERMISSION_DURATION = 4;
const PRE_GAME_INTERMISSION = 2;

/**
 * Builds an evenly-staggered spawn schedule for a wave from a counts-by-kind map.
 * Earlier kinds spawn slightly earlier than later kinds to maintain pressure.
 */
function buildWave(name: string, plan: Array<[EnemyKind, number]>, durationSec: number): WaveDef {
  const total = plan.reduce((acc, [, n]) => acc + n, 0);
  const spawns: SpawnEntry[] = [];
  let i = 0;
  for (const [kind, count] of plan) {
    for (let k = 0; k < count; k++) {
      const t = total === 1 ? 0 : (i / (total - 1)) * durationSec;
      spawns.push({ kind, at: t });
      i++;
    }
  }
  // Shuffle within each second-bucket to mix archetypes a bit.
  spawns.sort((a, b) => a.at - b.at);
  return { name, spawns };
}

const WAVE_DEFS: WaveDef[] = [
  buildWave('WAVE 1 — Welcome to Hell', [[EnemyKind.Imp, 4]], 4),
  buildWave('WAVE 2 — Bombers Inbound', [[EnemyKind.Imp, 6], [EnemyKind.Kamikaze, 2]], 8),
  buildWave('WAVE 3 — Ranged Fire', [[EnemyKind.Imp, 4], [EnemyKind.Skeleton, 3]], 9),
  buildWave('WAVE 4 — Charge!', [[EnemyKind.Kamikaze, 4], [EnemyKind.Bull, 2]], 10),
  buildWave('WAVE 5 — The Heavy', [[EnemyKind.Imp, 5], [EnemyKind.Skeleton, 3], [EnemyKind.Mancubus, 1]], 11),
  buildWave('WAVE 6 — Mixed Horde', [
    [EnemyKind.Imp, 6], [EnemyKind.Kamikaze, 4], [EnemyKind.Bull, 3], [EnemyKind.Mancubus, 2],
  ], 14),
  buildWave('WAVE 7 — No Mercy', [
    [EnemyKind.Imp, 8], [EnemyKind.Skeleton, 4], [EnemyKind.Bull, 2], [EnemyKind.Mancubus, 2],
  ], 16),
  buildWave('WAVE 8 — APOCALYPSE', [
    [EnemyKind.Imp, 10], [EnemyKind.Kamikaze, 6], [EnemyKind.Skeleton, 4],
    [EnemyKind.Bull, 3], [EnemyKind.Mancubus, 2],
  ], 18),
];

export interface WaveStatus {
  /** 1-based wave index. */
  wave: number;
  /** Total number of enemies queued + alive in the current wave. */
  remaining: number;
  /** Seconds left in the intermission, or 0 if the wave is active. */
  intermissionLeft: number;
  /** Difficulty loop counter (0 on first run, 1 after looping past the last wave, etc.). */
  loop: number;
  /** Banner text to display, or null if nothing to display. */
  banner: string | null;
}

/**
 * Drives Serious-Sam-style scripted waves. After every wave is cleared, plays a brief
 * intermission then starts the next wave. Once the last wave ends, the schedule loops
 * with a count multiplier so the game doesn't end abruptly.
 */
export class WaveManager {
  private waveIndex = 0;
  private loop = 0;
  private spawnQueue: SpawnEntry[] = [];
  private waveTime = 0;
  private intermission = PRE_GAME_INTERMISSION;
  private bannerText: string | null = 'GET READY';
  private bannerTimer = PRE_GAME_INTERMISSION;
  private waveActive = false;

  reset(): void {
    this.waveIndex = 0;
    this.loop = 0;
    this.spawnQueue = [];
    this.waveTime = 0;
    this.intermission = PRE_GAME_INTERMISSION;
    this.bannerText = 'GET READY';
    this.bannerTimer = PRE_GAME_INTERMISSION;
    this.waveActive = false;
  }

  status(enemies: EnemyManager): WaveStatus {
    const remaining = this.spawnQueue.length + enemies.aliveCount();
    return {
      wave: this.waveIndex + 1,
      remaining,
      intermissionLeft: this.intermission,
      loop: this.loop,
      banner: this.bannerTimer > 0 ? this.bannerText : null,
    };
  }

  update(dt: number, enemies: EnemyManager): void {
    if (this.bannerTimer > 0) this.bannerTimer -= dt;

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
    const def = WAVE_DEFS[this.waveIndex];
    const multiplier = 1 + this.loop * 0.5;
    this.spawnQueue = def.spawns.flatMap((s) => {
      const copies = Math.max(1, Math.round(multiplier));
      const out: SpawnEntry[] = [];
      for (let k = 0; k < copies; k++) {
        // Spread duplicates evenly within a small window after the original time.
        out.push({ kind: s.kind, at: s.at + k * 0.6 });
      }
      return out;
    });
    this.waveTime = 0;
    this.waveActive = true;
    this.bannerText = this.loop > 0 ? `${def.name} (LOOP ${this.loop + 1})` : def.name;
    this.bannerTimer = 3;
  }

  private endCurrentWave(): void {
    this.waveActive = false;
    this.waveIndex++;
    if (this.waveIndex >= WAVE_DEFS.length) {
      this.waveIndex = 0;
      this.loop++;
    }
    this.intermission = INTERMISSION_DURATION;
    this.bannerText = 'WAVE CLEARED';
    this.bannerTimer = INTERMISSION_DURATION;
  }
}
