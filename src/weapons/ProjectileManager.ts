import * as THREE from 'three';
import { Projectile, type ProjectileOpts } from './Projectile';
import type { EnemyManager } from '../EnemyManager';
import type { Level } from '../Level';

export class ProjectileManager {
  private scene: THREE.Scene;
  private level: Level;
  private projectiles: Projectile[] = [];
  private explosions: { mesh: THREE.Mesh; light: THREE.PointLight; ttl: number }[] = [];

  constructor(scene: THREE.Scene, level: Level) {
    this.scene = scene;
    this.level = level;
  }

  spawn(opts: ProjectileOpts): void {
    const p = new Projectile(opts);
    this.scene.add(p.mesh);
    this.projectiles.push(p);
  }

  spawnExplosion(position: THREE.Vector3, color: number, radius: number): void {
    const geom = new THREE.SphereGeometry(radius, 16, 12);
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.6,
    });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.copy(position);
    this.scene.add(mesh);

    const light = new THREE.PointLight(color, 6, radius * 4, 2);
    light.position.copy(position);
    this.scene.add(light);

    this.explosions.push({ mesh, light, ttl: 0.35 });
  }

  reset(): void {
    for (const p of this.projectiles) this.scene.remove(p.mesh);
    this.projectiles = [];
    for (const ex of this.explosions) {
      this.scene.remove(ex.mesh);
      this.scene.remove(ex.light);
    }
    this.explosions = [];
  }

  update(dt: number, enemies: EnemyManager): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      const before = p.alive;
      const stillAlive = p.update(dt, this.level, enemies);
      if (!stillAlive) {
        if (before && (p.splashRadius > 0 && p.splashDamage > 0)) {
          this.spawnExplosion(p.position, 0xffaa44, p.splashRadius);
        }
        this.scene.remove(p.mesh);
        this.projectiles.splice(i, 1);
      }
    }

    for (let i = this.explosions.length - 1; i >= 0; i--) {
      const ex = this.explosions[i];
      ex.ttl -= dt;
      const t = Math.max(0, ex.ttl / 0.35);
      (ex.mesh.material as THREE.MeshBasicMaterial).opacity = 0.6 * t;
      ex.mesh.scale.setScalar(1 + (1 - t) * 0.6);
      ex.light.intensity = 6 * t;
      if (ex.ttl <= 0) {
        this.scene.remove(ex.mesh);
        this.scene.remove(ex.light);
        this.explosions.splice(i, 1);
      }
    }
  }
}
