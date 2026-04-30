import * as THREE from 'three';
import type { Level } from './Level';
import type { Player } from './Player';
import { Enemy } from './enemies/Enemy';
import { Imp } from './enemies/Imp';
import { Kamikaze } from './enemies/Kamikaze';
import { Skeleton } from './enemies/Skeleton';
import { Bull } from './enemies/Bull';
import { Mancubus } from './enemies/Mancubus';
import { EnemyKind, type EnemyContext } from './enemies/types';
import { EnemyProjectileManager } from './enemies/EnemyProjectileManager';
import type { AudioManager } from './audio/AudioManager';

/**
 * Owns the live enemy list. Spawning is delegated to the WaveManager — this class
 * only knows how to instantiate a kind, run AI, and remove corpses once they finish
 * their death animation.
 */
export class EnemyManager {
  private scene: THREE.Scene;
  private level: Level;
  private audio: AudioManager;
  private enemies: Enemy[] = [];
  readonly projectiles: EnemyProjectileManager;
  kills = 0;

  constructor(scene: THREE.Scene, level: Level, audio: AudioManager) {
    this.scene = scene;
    this.level = level;
    this.audio = audio;
    this.projectiles = new EnemyProjectileManager(scene);
  }

  /** Read-only enumeration of all enemies currently tracked. */
  list(): readonly Enemy[] {
    return this.enemies;
  }

  aliveCount(): number {
    let n = 0;
    for (const e of this.enemies) if (e.alive) n++;
    return n;
  }

  reset(): void {
    for (const e of this.enemies) e.removeFromScene(this.scene);
    this.enemies = [];
    this.projectiles.reset();
    this.kills = 0;
  }

  /** Spawn a single enemy of the given kind. If `at` is omitted, a level spawn point is picked at random. */
  spawn(kind: EnemyKind, at?: THREE.Vector3): Enemy | null {
    const pos = at ?? this.pickSpawnPoint();
    if (!pos) return null;
    const enemy = this.create(kind, pos);
    this.scene.add(enemy.mesh);
    this.enemies.push(enemy);
    return enemy;
  }

  private create(kind: EnemyKind, spawn: THREE.Vector3): Enemy {
    switch (kind) {
      case EnemyKind.Imp: return new Imp(this.level, spawn);
      case EnemyKind.Kamikaze: return new Kamikaze(this.level, spawn);
      case EnemyKind.Skeleton: return new Skeleton(this.level, spawn);
      case EnemyKind.Bull: return new Bull(this.level, spawn);
      case EnemyKind.Mancubus: return new Mancubus(this.level, spawn);
    }
  }

  private pickSpawnPoint(): THREE.Vector3 | null {
    if (this.level.spawnPoints.length === 0) return null;
    const base = this.level.spawnPoints[Math.floor(Math.random() * this.level.spawnPoints.length)];
    const jitter = base.clone();
    jitter.x += (Math.random() - 0.5) * 6;
    jitter.z += (Math.random() - 0.5) * 6;
    return jitter;
  }

  update(dt: number, player: Player): void {
    const ctx: EnemyContext = {
      scene: this.scene,
      level: this.level,
      player,
      projectiles: this.projectiles,
      audio: this.audio,
    };

    for (const e of this.enemies) e.update(dt, ctx);
    this.projectiles.update(dt, this.level, player);

    // Reap enemies that have finished their death animation.
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (e.isDone()) {
        e.removeFromScene(this.scene);
        this.enemies.splice(i, 1);
        // Only count kills for enemies that died (not e.g. a spawn that was forcibly cleared).
        this.kills++;
        this.audio.play('enemyDie');
      }
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
