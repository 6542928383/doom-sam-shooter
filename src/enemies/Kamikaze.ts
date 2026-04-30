import * as THREE from 'three';
import { Enemy } from './Enemy';
import { EnemyKind, type EnemyContext } from './types';

const EXPLOSION_RADIUS = 5.5;
const EXPLOSION_DAMAGE = 60;
const EXPLOSION_DURATION = 0.45;

/**
 * Serious-Sam Beheaded-Bomber homage. Sprints at the player and detonates on contact.
 * Glowing torso, no head, and a bright detonation flash + light when killed or on contact.
 */
export class Kamikaze extends Enemy {
  readonly kind = EnemyKind.Kamikaze;
  readonly displayName = 'Kamikaze';

  private detonated = false;
  private explosion: THREE.Mesh | null = null;
  private explosionLight: THREE.PointLight | null = null;
  private explosionTimer = 0;

  constructor(level: import('../Level').Level, spawn: THREE.Vector3) {
    super(level, spawn, 18, 0xff5500, 0x331100);
    this.speed = 9.5;
    this.radius = 0.55;
    this.meleeRange = 1.8;
    this.meleeDamage = EXPLOSION_DAMAGE;
    this.hitFlashColor = 0xffd766;
  }

  protected buildMesh(): void {
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(this.radius, 1.2, 4, 8), this.bodyMaterial);
    body.position.y = 1.0;
    body.castShadow = true;
    this.mesh.add(body);

    const fuseMat = new THREE.MeshBasicMaterial({ color: 0xffe080 });
    const fuseGeom = new THREE.SphereGeometry(0.22, 8, 8);
    const fuseL = new THREE.Mesh(fuseGeom, fuseMat);
    fuseL.position.set(-0.5, 1.55, 0);
    this.mesh.add(fuseL);
    const fuseR = new THREE.Mesh(fuseGeom, fuseMat);
    fuseR.position.set(0.5, 1.55, 0);
    this.mesh.add(fuseR);
  }

  override update(dt: number, ctx: EnemyContext): void {
    if (this.detonated) {
      this.tickExplosion(dt, ctx.scene);
      return;
    }

    if (!this.alive) {
      // Killed by ranged damage — detonate where it dropped.
      this.beginDetonation(ctx, this.position.clone());
      return;
    }

    this.tickHitFlash(dt);
    if (this.attackCooldown > 0) this.attackCooldown -= dt;

    const dx = ctx.player.position.x - this.position.x;
    const dz = ctx.player.position.z - this.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist > this.sightRange) {
      this.mesh.position.copy(this.position);
      return;
    }

    if (dist > this.meleeRange) {
      this.moveTowards(dx, dz, dist, dt);
      this.faceTowards(dx, dz);
    } else {
      this.alive = false;
      this.beginDetonation(ctx, this.position.clone());
    }

    this.mesh.position.copy(this.position);
  }

  override isDone(): boolean {
    return this.detonated && this.explosion === null;
  }

  private beginDetonation(ctx: EnemyContext, epicenter: THREE.Vector3): void {
    if (this.detonated) return;
    this.detonated = true;
    this.alive = false;
    this.applyBlast(ctx, epicenter);

    const geom = new THREE.SphereGeometry(EXPLOSION_RADIUS, 16, 16);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffaa44,
      transparent: true,
      opacity: 0.85,
    });
    const sphere = new THREE.Mesh(geom, mat);
    sphere.scale.setScalar(0.05);
    sphere.position.set(epicenter.x, 1.2, epicenter.z);
    ctx.scene.add(sphere);
    this.explosion = sphere;

    const light = new THREE.PointLight(0xffaa55, 6, EXPLOSION_RADIUS * 3);
    light.position.copy(sphere.position);
    ctx.scene.add(light);
    this.explosionLight = light;
    this.explosionTimer = EXPLOSION_DURATION;
    this.mesh.visible = false;
  }

  private tickExplosion(dt: number, scene: THREE.Scene): void {
    if (!this.explosion || !this.explosionLight) return;
    this.explosionTimer -= dt;
    const t = 1 - Math.max(0, this.explosionTimer) / EXPLOSION_DURATION;
    this.explosion.scale.setScalar(0.05 + t);
    (this.explosion.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.85 * (1 - t));
    this.explosionLight.intensity = Math.max(0, 6 * (1 - t));
    if (this.explosionTimer <= 0) {
      scene.remove(this.explosion);
      scene.remove(this.explosionLight);
      this.explosion = null;
      this.explosionLight = null;
    }
  }

  private applyBlast(ctx: EnemyContext, epicenter: THREE.Vector3): void {
    const dx = ctx.player.position.x - epicenter.x;
    const dz = ctx.player.position.z - epicenter.z;
    const dist = Math.hypot(dx, dz);
    if (dist <= EXPLOSION_RADIUS) {
      const falloff = 1 - dist / EXPLOSION_RADIUS;
      ctx.player.takeDamage(EXPLOSION_DAMAGE * falloff);
    }
  }
}
