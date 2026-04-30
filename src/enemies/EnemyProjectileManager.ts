import * as THREE from 'three';
import type { Level } from '../Level';
import type { Player } from '../Player';

const PLAYER_RADIUS = 0.6;
const MAX_LIFETIME = 6;

interface EnemyProjectile {
  mesh: THREE.Mesh;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  damage: number;
  radius: number;
  lifetime: number;
}

/**
 * Lightweight projectile pool for ranged enemies (Skeleton energy balls, Mancubus rockets, etc.).
 * Distinct from the player's `ProjectileManager` because the collision rules are simpler:
 * we only test against the player and the level — never against other enemies.
 */
export class EnemyProjectileManager {
  private scene: THREE.Scene;
  private projectiles: EnemyProjectile[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  spawn(opts: {
    origin: THREE.Vector3;
    direction: THREE.Vector3;
    speed: number;
    damage: number;
    color: number;
    radius?: number;
  }): void {
    const radius = opts.radius ?? 0.25;
    const geom = new THREE.SphereGeometry(radius, 12, 12);
    const mat = new THREE.MeshBasicMaterial({ color: opts.color });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.copy(opts.origin);
    this.scene.add(mesh);

    const dir = opts.direction.clone().normalize();
    const projectile: EnemyProjectile = {
      mesh,
      position: opts.origin.clone(),
      velocity: dir.multiplyScalar(opts.speed),
      damage: opts.damage,
      radius,
      lifetime: MAX_LIFETIME,
    };
    this.projectiles.push(projectile);
  }

  update(dt: number, level: Level, player: Player): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.lifetime -= dt;
      p.position.x += p.velocity.x * dt;
      p.position.y += p.velocity.y * dt;
      p.position.z += p.velocity.z * dt;
      p.mesh.position.copy(p.position);

      let hit = false;

      if (p.position.y <= 0.1 || p.lifetime <= 0) hit = true;
      if (!hit && level.collides(p.position.x, p.position.z, p.radius)) hit = true;
      if (!hit) {
        const dx = player.position.x - p.position.x;
        const dy = player.position.y - p.position.y;
        const dz = player.position.z - p.position.z;
        const distSq = dx * dx + dy * dy + dz * dz;
        const r = PLAYER_RADIUS + p.radius;
        if (distSq <= r * r) {
          player.takeDamage(p.damage);
          hit = true;
        }
      }

      if (hit) {
        this.scene.remove(p.mesh);
        this.projectiles.splice(i, 1);
      }
    }
  }

  reset(): void {
    for (const p of this.projectiles) this.scene.remove(p.mesh);
    this.projectiles = [];
  }
}
