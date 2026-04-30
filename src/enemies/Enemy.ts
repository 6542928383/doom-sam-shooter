import * as THREE from 'three';
import type { Level } from '../Level';
import type { EnemyContext, EnemyKind } from './types';

/**
 * Base class for every enemy archetype. Owns the mesh, position, hitbox, and a default
 * "chase the player and melee on contact" behaviour. Subclasses override `buildMesh`
 * and (optionally) `update` to specialise.
 */
export abstract class Enemy {
  abstract readonly kind: EnemyKind;
  /** Display name shown in death feed / debug overlays. */
  abstract readonly displayName: string;

  mesh: THREE.Group;
  position: THREE.Vector3;
  health: number;
  maxHealth: number;
  alive = true;

  /** Subclasses that play their own death/detonation cue (e.g. Kamikaze) set
   * this true so EnemyManager skips the generic `enemyDie` sound on reaping. */
  hasCustomDeathSound = false;

  /** Horizontal collision radius, used by the level + projectile collision. */
  radius = 0.7;
  /** Sphere hitbox radius for hitscan/projectile weapons (chest level). */
  hitboxRadius = 1.0;
  /** Y of hitbox centre. */
  hitboxHeight = 1.4;
  /** Movement speed while chasing the player. */
  speed = 5.5;
  /** Stop pursuing if the player is further than this. */
  sightRange = 80;
  /** Melee distance at which the default behaviour starts swinging. */
  meleeRange = 1.6;
  /** Cooldown between melee swings, in seconds. */
  meleeCooldown = 0.9;
  /** Damage per melee hit. */
  meleeDamage = 12;

  protected level: Level;
  protected attackCooldown = 0;
  protected bodyMaterial: THREE.MeshStandardMaterial;
  protected hitFlashTimer = 0;
  /** Emissive colour to flash on hit. Subclasses can override for more vibrant feedback. */
  protected hitFlashColor = 0xffaa00;

  constructor(level: Level, spawn: THREE.Vector3, maxHealth: number, baseColor: number, emissive = 0x220000) {
    this.level = level;
    this.position = spawn.clone();
    this.position.y = 0;
    this.maxHealth = maxHealth;
    this.health = maxHealth;
    this.bodyMaterial = new THREE.MeshStandardMaterial({
      color: baseColor,
      emissive,
      roughness: 0.7,
    });
    this.mesh = new THREE.Group();
    this.mesh.position.copy(this.position);
    this.buildMesh();
  }

  protected abstract buildMesh(): void;

  takeDamage(amount: number): void {
    if (!this.alive) return;
    this.health -= amount;
    this.hitFlashTimer = 0.12;
    if (this.health <= 0) {
      this.alive = false;
      this.onDeath();
    }
  }

  /** Called once when health hits zero. Subclasses can trigger explosions etc. */
  protected onDeath(): void {
    // Default: no special behaviour.
  }

  /** AABB-style hit test against a ray for hitscan/projectile weapons. */
  raycastHit(origin: THREE.Vector3, direction: THREE.Vector3): number | null {
    const center = new THREE.Vector3(this.position.x, this.hitboxHeight, this.position.z);
    const oc = new THREE.Vector3().subVectors(origin, center);
    const a = direction.dot(direction);
    const b = 2 * oc.dot(direction);
    const c = oc.dot(oc) - this.hitboxRadius * this.hitboxRadius;
    const disc = b * b - 4 * a * c;
    if (disc < 0) return null;
    const t = (-b - Math.sqrt(disc)) / (2 * a);
    if (t < 0) return null;
    return t;
  }

  removeFromScene(scene: THREE.Scene): void {
    scene.remove(this.mesh);
  }

  /**
   * Returns true once the EnemyManager is free to remove this enemy from the world.
   * Default: as soon as it dies. Archetypes that play an after-death animation
   * (e.g. Kamikaze detonation) override this to defer removal.
   */
  isDone(): boolean {
    return !this.alive;
  }

  update(dt: number, ctx: EnemyContext): void {
    if (!this.alive) return;
    this.tickHitFlash(dt);
    if (this.attackCooldown > 0) this.attackCooldown -= dt;

    const dx = ctx.player.position.x - this.position.x;
    const dz = ctx.player.position.z - this.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist > this.sightRange) return;

    if (dist > this.meleeRange) {
      this.moveTowards(dx, dz, dist, dt);
      this.faceTowards(dx, dz);
    } else if (this.attackCooldown <= 0) {
      ctx.player.takeDamage(this.meleeDamage);
      this.attackCooldown = this.meleeCooldown;
    }

    this.mesh.position.copy(this.position);
  }

  protected tickHitFlash(dt: number): void {
    if (this.hitFlashTimer > 0) {
      this.hitFlashTimer -= dt;
      this.bodyMaterial.emissive.setHex(this.hitFlashTimer > 0 ? this.hitFlashColor : 0x220000);
    }
  }

  protected moveTowards(dx: number, dz: number, dist: number, dt: number): void {
    const inv = 1 / (dist || 1);
    const nx = dx * inv;
    const nz = dz * inv;
    const step = this.speed * dt;
    const newX = this.position.x + nx * step;
    const newZ = this.position.z + nz * step;
    if (!this.level.collides(newX, this.position.z, this.radius)) {
      this.position.x = newX;
    }
    if (!this.level.collides(this.position.x, newZ, this.radius)) {
      this.position.z = newZ;
    }
  }

  protected faceTowards(dx: number, dz: number): void {
    this.mesh.rotation.y = Math.atan2(dx, dz);
  }
}
