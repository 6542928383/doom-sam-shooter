import * as THREE from 'three';
import { Enemy } from './Enemy';
import { EnemyKind, type EnemyContext } from './types';

const CHARGE_TRIGGER_RANGE = 28;
const CHARGE_SPEED = 18;
const CHARGE_DURATION = 1.3;
const CHARGE_COOLDOWN = 3.0;

/**
 * Heavy charger inspired by Serious Sam's Werebull. Slow when shuffling,
 * but periodically locks on to the player and rams forward at high speed.
 */
export class Bull extends Enemy {
  readonly kind = EnemyKind.Bull;
  readonly displayName = 'Bull';

  private chargeTimer = 0;
  private chargeCooldown = CHARGE_COOLDOWN;
  private chargeDir = new THREE.Vector3();

  constructor(level: import('../Level').Level, spawn: THREE.Vector3) {
    super(level, spawn, 80, 0x6a2a55, 0x331122);
    this.speed = 3.0;
    this.radius = 1.0;
    this.hitboxRadius = 1.3;
    this.hitboxHeight = 1.6;
    this.meleeRange = 2.2;
    this.meleeDamage = 28;
    this.meleeCooldown = 1.2;
    this.hitFlashColor = 0xff66cc;
  }

  protected buildMesh(): void {
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.9, 1.6, 4, 10),
      this.bodyMaterial,
    );
    body.position.y = 1.4;
    body.castShadow = true;
    this.mesh.add(body);

    const hornMat = new THREE.MeshStandardMaterial({ color: 0xeeeecc, roughness: 0.4 });
    const hornGeom = new THREE.ConeGeometry(0.25, 1, 8);
    const hornL = new THREE.Mesh(hornGeom, hornMat);
    hornL.position.set(-0.55, 2.3, 0.4);
    hornL.rotation.set(-Math.PI / 2.2, 0, 0.4);
    this.mesh.add(hornL);
    const hornR = new THREE.Mesh(hornGeom, hornMat);
    hornR.position.set(0.55, 2.3, 0.4);
    hornR.rotation.set(-Math.PI / 2.2, 0, -0.4);
    this.mesh.add(hornR);

    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff2244 });
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

    if (this.chargeTimer > 0) {
      this.chargeTimer -= dt;
      const step = CHARGE_SPEED * dt;
      const newX = this.position.x + this.chargeDir.x * step;
      const newZ = this.position.z + this.chargeDir.z * step;
      if (!this.level.collides(newX, this.position.z, this.radius)) {
        this.position.x = newX;
      } else {
        this.chargeTimer = 0; // wall stops charge
      }
      if (!this.level.collides(this.position.x, newZ, this.radius)) {
        this.position.z = newZ;
      } else {
        this.chargeTimer = 0;
      }
      if (dist <= this.meleeRange && this.attackCooldown <= 0) {
        ctx.player.takeDamage(this.meleeDamage);
        this.attackCooldown = this.meleeCooldown;
      }
    } else {
      this.faceTowards(dx, dz);
      this.chargeCooldown -= dt;
      if (dist > this.meleeRange) {
        this.moveTowards(dx, dz, dist, dt);
      } else if (this.attackCooldown <= 0) {
        ctx.player.takeDamage(this.meleeDamage);
        this.attackCooldown = this.meleeCooldown;
      }

      if (this.chargeCooldown <= 0 && dist < CHARGE_TRIGGER_RANGE) {
        const inv = 1 / (dist || 1);
        this.chargeDir.set(dx * inv, 0, dz * inv);
        this.chargeTimer = CHARGE_DURATION;
        this.chargeCooldown = CHARGE_COOLDOWN;
        ctx.audio.play('bullCharge');
      }
    }

    this.mesh.position.copy(this.position);
  }
}
