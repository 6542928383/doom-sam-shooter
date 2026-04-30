import * as THREE from 'three';
import { Enemy } from './Enemy';
import { EnemyKind, type EnemyContext } from './types';

const FIRE_RANGE = 45;
const FIRE_COOLDOWN = 1.6;
const PROJECTILE_SPEED = 30;
const PROJECTILE_DAMAGE = 10;
const KEEP_DISTANCE = 18;

/**
 * Doom-style ranged stalker. Holds the player at distance and lobs energy balls.
 * Fragile in melee, dangerous in groups.
 */
export class Skeleton extends Enemy {
  readonly kind = EnemyKind.Skeleton;
  readonly displayName = 'Skeleton';

  constructor(level: import('../Level').Level, spawn: THREE.Vector3) {
    super(level, spawn, 25, 0xc8c0a0, 0x111122);
    this.speed = 4.5;
    this.radius = 0.55;
    this.meleeDamage = 8;
    this.meleeRange = 1.5;
    this.hitFlashColor = 0x66bbff;
  }

  protected buildMesh(): void {
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(this.radius, 1.6, 4, 8), this.bodyMaterial);
    body.position.y = 1.3;
    body.castShadow = true;
    this.mesh.add(body);

    // Tall narrow head.
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 10, 10),
      new THREE.MeshStandardMaterial({ color: 0xeeeacc, roughness: 0.6 }),
    );
    head.position.y = 2.25;
    this.mesh.add(head);

    // Glowing eye sockets.
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x55ddff });
    const eyeGeom = new THREE.SphereGeometry(0.08, 8, 8);
    const eyeL = new THREE.Mesh(eyeGeom, eyeMat);
    eyeL.position.set(-0.1, 2.3, 0.22);
    this.mesh.add(eyeL);
    const eyeR = new THREE.Mesh(eyeGeom, eyeMat);
    eyeR.position.set(0.1, 2.3, 0.22);
    this.mesh.add(eyeR);
  }

  override update(dt: number, ctx: EnemyContext): void {
    if (!this.alive) return;
    this.tickHitFlash(dt);
    if (this.attackCooldown > 0) this.attackCooldown -= dt;

    const dx = ctx.player.position.x - this.position.x;
    const dz = ctx.player.position.z - this.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist > this.sightRange) {
      this.mesh.position.copy(this.position);
      return;
    }

    this.faceTowards(dx, dz);

    if (dist < KEEP_DISTANCE - 2) {
      // Back away.
      this.moveTowards(-dx, -dz, dist, dt * 0.7);
    } else if (dist > KEEP_DISTANCE + 4) {
      // Close in.
      this.moveTowards(dx, dz, dist, dt);
    }

    if (dist <= FIRE_RANGE && this.attackCooldown <= 0) {
      this.fireBall(ctx, dx, dz, dist);
      this.attackCooldown = FIRE_COOLDOWN;
    }

    this.mesh.position.copy(this.position);
  }

  private fireBall(ctx: EnemyContext, dx: number, dz: number, dist: number): void {
    const origin = new THREE.Vector3(this.position.x, 1.7, this.position.z);
    // Lead the player slightly (poor man's prediction).
    const playerVy = 0;
    const dy = (ctx.player.position.y - origin.y) + playerVy;
    const direction = new THREE.Vector3(dx, dy, dz).normalize();
    // Inset spawn outside the body so the ball doesn't immediately collide with self.
    origin.add(direction.clone().multiplyScalar(this.radius + 0.4));
    void dist;
    ctx.projectiles.spawn({
      origin,
      direction,
      speed: PROJECTILE_SPEED,
      damage: PROJECTILE_DAMAGE,
      color: 0x66ddff,
      radius: 0.3,
    });
  }
}
