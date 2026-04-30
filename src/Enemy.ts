import * as THREE from 'three';
import type { Level } from './Level';
import type { Player } from './Player';

const ENEMY_RADIUS = 0.7;
const ATTACK_RANGE = 1.6;
const ATTACK_COOLDOWN = 0.9;
const ATTACK_DAMAGE = 12;
const SIGHT_RANGE = 80;
const SPEED = 5.5;

/**
 * Imp-like grunt enemy: melee charger reminiscent of Serious Sam's Beheaded Kamikaze
 * but without the explosion. Chases the player and lunges in for melee damage.
 */
export class Enemy {
  mesh: THREE.Group;
  position: THREE.Vector3;
  health: number;
  maxHealth = 30;
  alive = true;
  private level: Level;
  private attackCooldown = 0;
  private bodyMaterial: THREE.MeshStandardMaterial;
  private hitFlashTimer = 0;

  constructor(level: Level, spawn: THREE.Vector3) {
    this.level = level;
    this.position = spawn.clone();
    this.position.y = 0;
    this.health = this.maxHealth;

    this.mesh = new THREE.Group();
    this.mesh.position.copy(this.position);

    this.bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0xa83218,
      emissive: 0x220000,
      roughness: 0.7,
    });

    const body = new THREE.Mesh(new THREE.CapsuleGeometry(ENEMY_RADIUS, 1.4, 4, 8), this.bodyMaterial);
    body.position.y = 1.2;
    body.castShadow = true;
    this.mesh.add(body);

    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffea00 });
    const eyeGeom = new THREE.SphereGeometry(0.12, 8, 8);
    const eyeL = new THREE.Mesh(eyeGeom, eyeMat);
    eyeL.position.set(-0.22, 1.85, 0.55);
    this.mesh.add(eyeL);
    const eyeR = new THREE.Mesh(eyeGeom, eyeMat);
    eyeR.position.set(0.22, 1.85, 0.55);
    this.mesh.add(eyeR);

    const horns = new THREE.Mesh(
      new THREE.ConeGeometry(0.18, 0.6, 6),
      new THREE.MeshStandardMaterial({ color: 0x1a0808, roughness: 0.6 }),
    );
    horns.position.set(-0.3, 2.25, 0);
    horns.rotation.z = 0.3;
    this.mesh.add(horns);
    const horns2 = horns.clone();
    horns2.position.x = 0.3;
    horns2.rotation.z = -0.3;
    this.mesh.add(horns2);
  }

  takeDamage(amount: number): void {
    if (!this.alive) return;
    this.health -= amount;
    this.hitFlashTimer = 0.12;
    if (this.health <= 0) {
      this.alive = false;
    }
  }

  update(dt: number, player: Player): void {
    if (!this.alive) return;

    if (this.hitFlashTimer > 0) {
      this.hitFlashTimer -= dt;
      this.bodyMaterial.emissive.setHex(this.hitFlashTimer > 0 ? 0xffaa00 : 0x220000);
    }

    if (this.attackCooldown > 0) this.attackCooldown -= dt;

    const dx = player.position.x - this.position.x;
    const dz = player.position.z - this.position.z;
    const distSq = dx * dx + dz * dz;
    const dist = Math.sqrt(distSq);

    if (dist > SIGHT_RANGE) return;

    if (dist > ATTACK_RANGE) {
      const nx = dx / (dist || 1);
      const nz = dz / (dist || 1);
      const step = SPEED * dt;
      const newX = this.position.x + nx * step;
      const newZ = this.position.z + nz * step;
      if (!this.level.collides(newX, this.position.z, ENEMY_RADIUS)) {
        this.position.x = newX;
      } else {
        // try to slide along Z if X is blocked
        if (!this.level.collides(this.position.x, newZ, ENEMY_RADIUS)) {
          this.position.z = newZ;
        }
      }
      if (!this.level.collides(this.position.x, newZ, ENEMY_RADIUS)) {
        this.position.z = newZ;
      }

      // Face the player (Y-rotation only).
      this.mesh.rotation.y = Math.atan2(dx, dz);
    } else if (this.attackCooldown <= 0) {
      player.takeDamage(ATTACK_DAMAGE);
      this.attackCooldown = ATTACK_COOLDOWN;
    }

    this.mesh.position.copy(this.position);
  }

  /** AABB-style hit test against a ray for hitscan weapons. Returns squared distance to hit, or null. */
  raycastHit(origin: THREE.Vector3, direction: THREE.Vector3): number | null {
    // Treat the enemy as a vertical capsule by approximating with a sphere centered at chest height.
    const center = new THREE.Vector3(this.position.x, 1.4, this.position.z);
    const oc = new THREE.Vector3().subVectors(origin, center);
    const a = direction.dot(direction);
    const b = 2 * oc.dot(direction);
    const c = oc.dot(oc) - 1.0 * 1.0; // radius=1.0 for generous hitbox
    const disc = b * b - 4 * a * c;
    if (disc < 0) return null;
    const t = (-b - Math.sqrt(disc)) / (2 * a);
    if (t < 0) return null;
    return t;
  }

  removeFromScene(scene: THREE.Scene): void {
    scene.remove(this.mesh);
  }
}
