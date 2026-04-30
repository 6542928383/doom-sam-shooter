import * as THREE from 'three';
import { Enemy } from './Enemy';
import type { Level } from './Level';
import type { Player } from './Player';

const TARGET_ALIVE = 8;
const RESPAWN_INTERVAL = 1.5;

/**
 * Maintains a steady horde around the player. PR #1 ships a single enemy archetype;
 * later PRs add variety, scripted waves and boss spawns.
 */
export class EnemyManager {
  private scene: THREE.Scene;
  private level: Level;
  private enemies: Enemy[] = [];
  private respawnTimer = 0;
  kills = 0;

  constructor(scene: THREE.Scene, level: Level) {
    this.scene = scene;
    this.level = level;
  }

  spawnInitialWave(): void {
    for (let i = 0; i < TARGET_ALIVE; i++) {
      this.spawnOne();
    }
  }

  reset(): void {
    for (const e of this.enemies) e.removeFromScene(this.scene);
    this.enemies = [];
    this.kills = 0;
    this.respawnTimer = 0;
    this.spawnInitialWave();
  }

  private spawnOne(): void {
    if (this.level.spawnPoints.length === 0) return;
    const spawn = this.level.spawnPoints[Math.floor(Math.random() * this.level.spawnPoints.length)];
    const jittered = spawn.clone();
    jittered.x += (Math.random() - 0.5) * 6;
    jittered.z += (Math.random() - 0.5) * 6;
    const enemy = new Enemy(this.level, jittered);
    this.scene.add(enemy.mesh);
    this.enemies.push(enemy);
  }

  update(dt: number, player: Player): void {
    for (const e of this.enemies) e.update(dt, player);

    // Remove dead and tally kills.
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (!e.alive) {
        e.removeFromScene(this.scene);
        this.enemies.splice(i, 1);
        this.kills++;
      }
    }

    // Maintain target population.
    this.respawnTimer -= dt;
    if (this.enemies.length < TARGET_ALIVE && this.respawnTimer <= 0) {
      this.spawnOne();
      this.respawnTimer = RESPAWN_INTERVAL;
    }
  }

  /** Used by hitscan weapons. Returns the closest hit enemy along the ray, if any. */
  raycastClosest(origin: THREE.Vector3, direction: THREE.Vector3): { enemy: Enemy; t: number } | null {
    let best: { enemy: Enemy; t: number } | null = null;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const t = e.raycastHit(origin, direction);
      if (t === null) continue;
      if (!best || t < best.t) best = { enemy: e, t };
    }
    return best;
  }
}
