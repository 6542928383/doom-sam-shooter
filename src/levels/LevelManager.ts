import type { Level } from '../Level';
import type { WaveManager } from '../waves/WaveManager';
import type { EnemyManager } from '../EnemyManager';
import type { Player } from '../Player';
import type { LevelSpec } from './LevelSpec';
import { LEVELS } from './levelData';

export interface LevelStatus {
  /** 1-based level index. */
  index: number;
  total: number;
  name: string;
  victory: boolean;
}

/**
 * Owns the campaign progression: which level is active, when to spawn the exit portal,
 * and triggering transitions when the player walks into it. The Level / WaveManager /
 * EnemyManager instances are reused across transitions; only their internal state is
 * swapped via `loadSpec` / `setWaves` / `reset`.
 */
export class LevelManager {
  private specs: LevelSpec[];
  private index = 0;
  private portalSpawned = false;
  private victory = false;

  constructor(specs: LevelSpec[] = LEVELS) {
    this.specs = specs;
  }

  /** Load the first level into the world. Call once at game start. */
  start(level: Level, waves: WaveManager, enemies: EnemyManager, player: Player): void {
    this.index = 0;
    this.portalSpawned = false;
    this.victory = false;
    this.applyCurrent(level, waves, enemies, player, 'GET READY');
  }

  reset(level: Level, waves: WaveManager, enemies: EnemyManager, player: Player): void {
    this.start(level, waves, enemies, player);
  }

  currentSpec(): LevelSpec {
    return this.specs[this.index];
  }

  status(): LevelStatus {
    return {
      index: this.index + 1,
      total: this.specs.length,
      name: this.specs[this.index].displayName,
      victory: this.victory,
    };
  }

  /**
   * Called every frame after waves/enemies update. Spawns the exit portal once the
   * current level's last wave is cleared, and triggers a transition when the player
   * walks into it.
   */
  update(level: Level, waves: WaveManager, enemies: EnemyManager, player: Player): void {
    if (this.victory) return;

    const status = waves.status(enemies);
    if (status.allClear && !this.portalSpawned) {
      level.spawnPortal();
      this.portalSpawned = true;
    }

    if (this.portalSpawned) {
      if (level.isInsidePortal(player.position.x, player.position.z)) {
        this.advance(level, waves, enemies, player);
      }
    }
  }

  private advance(level: Level, waves: WaveManager, enemies: EnemyManager, player: Player): void {
    if (this.index >= this.specs.length - 1) {
      this.victory = true;
      return;
    }
    this.index++;
    this.applyCurrent(level, waves, enemies, player, this.specs[this.index].subtitle);
  }

  private applyCurrent(level: Level, waves: WaveManager, enemies: EnemyManager, player: Player, banner: string): void {
    const spec = this.specs[this.index];
    level.loadSpec(spec);
    // Preserve the campaign kill total across level transitions. EnemyManager.reset()
    // also despawns enemies/projectiles, which is what we want — but it zeroes kills,
    // which would lose the cumulative campaign score.
    const savedKills = enemies.kills;
    enemies.reset();
    enemies.kills = savedKills;
    waves.setWaves(spec.waves, banner);
    player.respawnAt(level.playerStart);
    this.portalSpawned = false;
  }
}
