import * as THREE from 'three';
import { Enemy } from './Enemy';
import { EnemyKind, type EnemyContext } from './types';

const FIRE_RANGE = 50;
const FIRE_COOLDOWN = 2.6;
const PROJECTILE_SPEED = 22;
const PROJECTILE_DAMAGE = 22;
const KEEP_DISTANCE = 25;

/**
 * Heavy gunner — slow, fat, dangerous. Stays at long range and lobs twin slow rockets
 * for high splash-style damage if the player doesn't strafe.
 */
export class Mancubus extends Enemy {
  readonly kind = EnemyKind.Mancubus;
  readonly displayName = 'Mancubus';

  constructor(level: import('../Level').Level, spawn: THREE.Vector3) {
    super(level, spawn, 150, 0x884422, 0x331100);
    this.speed = 2.4;
    this.radius = 1.1;
    this.hitboxRadius = 1.4;
    this.hitboxHeight = 1.7;
    this.meleeDamage = 20;
    this.meleeRange = 2.5;
    this.meleeCooldown = 1.5;
    this.hitFlashColor = 0xffaa55;
  }

  protected buildMesh(): void {
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(1.0, 1.4, 4, 10),
      this.bodyMaterial,
    );
    body.position.y = 1.3;
    body.castShadow = true;
    this.mesh.add(body);

    // Two cannon barrels on the arms.
    const barrelMat = new THREE.MeshStandardMaterial({ color: 0x222018, metalness: 0.6, roughness: 0.5 });
    const barrelGeom = new THREE.CylinderGeometry(0.2, 0.2, 1.4, 12);
    const barrelL = new THREE.Mesh(barrelGeom, barrelMat);
    barrelL.position.set(-0.95, 1.6, 0.4);
    barrelL.rotation.x = -Math.PI / 2;
    this.mesh.add(barrelL);
    const barrelR = new THREE.Mesh(barrelGeom, barrelMat);
    barrelR.position.set(0.95, 1.6, 0.4);
    barrelR.rotation.x = -Math.PI / 2;
    this.mesh.add(barrelR);

    // Glowing piggish eyes.
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffdd66 });
    const eyeGeom = new THREE.SphereGeometry(0.13, 8, 8);
    const eyeL = new THREE.Mesh(eyeGeom, eyeMat);
    eyeL.position.set(-0.25, 2.05, 0.7);
    this.mesh.add(eyeL);
    const eyeR = new THREE.Mesh(eyeGeom, eyeMat);
    eyeR.position.set(0.25, 2.05, 0.7);
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
      this.moveTowards(-dx, -dz, dist, dt * 0.6);
    } else if (dist > KEEP_DISTANCE + 6) {
      this.moveTowards(dx, dz, dist, dt);
    }

    if (dist <= FIRE_RANGE && this.attackCooldown <= 0) {
      this.fireTwinSalvo(ctx, dx, dz);
      this.attackCooldown = FIRE_COOLDOWN;
    } else if (dist <= this.meleeRange && this.attackCooldown <= 0) {
      ctx.player.takeDamage(this.meleeDamage);
      this.attackCooldown = this.meleeCooldown;
    }

    this.mesh.position.copy(this.position);
  }

  private fireTwinSalvo(ctx: EnemyContext, dx: number, dz: number): void {
    const baseDir = new THREE.Vector3(dx, ctx.player.position.y - 1.6, dz).normalize();
    // Two shots with slight horizontal spread.
    const right = new THREE.Vector3(-baseDir.z, 0, baseDir.x).normalize();
    for (const offset of [-0.6, 0.6]) {
      const origin = new THREE.Vector3(
        this.position.x + right.x * offset,
        1.6,
        this.position.z + right.z * offset,
      );
      const dir = baseDir.clone();
      origin.add(dir.clone().multiplyScalar(this.radius + 0.5));
      ctx.projectiles.spawn({
        origin,
        direction: dir,
        speed: PROJECTILE_SPEED,
        damage: PROJECTILE_DAMAGE,
        color: 0xffaa44,
        radius: 0.4,
      });
    }
    ctx.audio.play('enemyShoot');
  }
}
