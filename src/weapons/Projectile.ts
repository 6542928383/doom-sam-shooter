import * as THREE from 'three';
import type { EnemyManager } from '../EnemyManager';
import type { Level } from '../Level';

export interface ProjectileOpts {
  position: THREE.Vector3;
  direction: THREE.Vector3;
  speed: number;
  lifetime: number;
  damage: number;
  splashDamage?: number;
  splashRadius?: number;
  color: number;
  emissive?: number;
  size: number;
  trail?: boolean;
}

/**
 * A simple linear projectile. Supports optional splash damage on impact.
 * Used by the rocket launcher (splash) and the minigun/plasma weapons (direct).
 */
export class Projectile {
  mesh: THREE.Mesh;
  light: THREE.PointLight | null = null;
  position: THREE.Vector3;
  direction: THREE.Vector3;
  speed: number;
  lifetime: number;
  damage: number;
  splashDamage: number;
  splashRadius: number;
  alive = true;

  constructor(opts: ProjectileOpts) {
    this.position = opts.position.clone();
    this.direction = opts.direction.clone().normalize();
    this.speed = opts.speed;
    this.lifetime = opts.lifetime;
    this.damage = opts.damage;
    this.splashDamage = opts.splashDamage ?? 0;
    this.splashRadius = opts.splashRadius ?? 0;

    const geom = new THREE.SphereGeometry(opts.size, 10, 8);
    const mat = new THREE.MeshStandardMaterial({
      color: opts.color,
      emissive: opts.emissive ?? opts.color,
      emissiveIntensity: 1.5,
      roughness: 0.4,
    });
    this.mesh = new THREE.Mesh(geom, mat);
    this.mesh.position.copy(this.position);

    if (opts.trail) {
      this.light = new THREE.PointLight(opts.color, 1.2, 6, 2);
      this.mesh.add(this.light);
    }
  }

  update(dt: number, level: Level, enemies: EnemyManager): boolean {
    if (!this.alive) return false;
    this.lifetime -= dt;
    if (this.lifetime <= 0) {
      this.detonate(enemies);
      return false;
    }

    const step = this.speed * dt;
    this.position.addScaledVector(this.direction, step);
    this.mesh.position.copy(this.position);

    // Ground hit.
    if (this.position.y <= 0.2) {
      this.detonate(enemies);
      return false;
    }

    // Wall hit.
    if (level.collides(this.position.x, this.position.z, 0.2)) {
      this.detonate(enemies);
      return false;
    }

    // Direct hit on an enemy (cheap proximity check).
    for (const enemy of enemies.list()) {
      if (!enemy.alive) continue;
      const dx = enemy.position.x - this.position.x;
      const dz = enemy.position.z - this.position.z;
      const dy = 1.4 - this.position.y;
      const distSq = dx * dx + dy * dy + dz * dz;
      if (distSq < 1.4 * 1.4) {
        enemy.takeDamage(this.damage);
        this.detonate(enemies, enemy);
        return false;
      }
    }
    return true;
  }

  private detonate(enemies: EnemyManager, hitEnemy?: { position: THREE.Vector3 } | null): void {
    this.alive = false;
    if (this.splashRadius <= 0 || this.splashDamage <= 0) return;
    const center = hitEnemy ? hitEnemy.position : this.position;
    for (const enemy of enemies.list()) {
      if (!enemy.alive) continue;
      const dx = enemy.position.x - center.x;
      const dz = enemy.position.z - center.z;
      const distSq = dx * dx + dz * dz;
      if (distSq <= this.splashRadius * this.splashRadius) {
        const falloff = 1 - Math.sqrt(distSq) / this.splashRadius;
        enemy.takeDamage(this.splashDamage * falloff);
      }
    }
  }
}
