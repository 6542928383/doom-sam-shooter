import * as THREE from 'three';
import type { Level } from './Level';
import type { InputManager } from './InputManager';

const PLAYER_RADIUS = 0.5;
const EYE_HEIGHT = 1.6;
const WALK_SPEED = 8;
const SPRINT_MULT = 1.55;
const JUMP_VELOCITY = 8.2;
const GRAVITY = 22;
const MOUSE_SENSITIVITY = 0.0022;

export class Player {
  camera: THREE.PerspectiveCamera;
  level: Level;
  position = new THREE.Vector3();
  velocityY = 0;
  yaw = 0;
  pitch = 0;
  health = 100;
  armor = 0;
  maxHealth = 100;
  maxArmor = 100;
  private grounded = true;
  private damagedThisFrame = false;
  private invulnerableUntil = 0;

  constructor(camera: THREE.PerspectiveCamera, level: Level) {
    this.camera = camera;
    this.level = level;
    this.position.copy(level.playerStart);
    this.camera.position.copy(this.position);
    this.camera.rotation.order = 'YXZ';
  }

  reset(): void {
    this.position.copy(this.level.playerStart);
    this.velocityY = 0;
    this.yaw = Math.PI; // facing -Z (into the arena)
    this.pitch = 0;
    this.health = this.maxHealth;
    this.armor = 0;
    this.grounded = true;
    this.invulnerableUntil = 0;
    this.applyTransform();
  }

  isDead(): boolean {
    return this.health <= 0;
  }

  /** Returns true if the player took damage on this frame, then resets the flag. */
  didTakeDamage(): boolean {
    const r = this.damagedThisFrame;
    this.damagedThisFrame = false;
    return r;
  }

  takeDamage(amount: number): void {
    if (this.isDead()) return;
    if (performance.now() < this.invulnerableUntil) return;
    let remaining = amount;
    if (this.armor > 0) {
      const absorbed = Math.min(this.armor, remaining * 0.5);
      this.armor -= absorbed;
      remaining -= absorbed;
    }
    this.health = Math.max(0, this.health - remaining);
    this.damagedThisFrame = true;
    this.invulnerableUntil = performance.now() + 120; // brief i-frames
  }

  update(dt: number, input: InputManager): void {
    if (this.isDead()) return;

    const mouse = input.consumeMouse();
    this.yaw -= mouse.dx * MOUSE_SENSITIVITY;
    this.pitch -= mouse.dy * MOUSE_SENSITIVITY;
    const limit = Math.PI / 2 - 0.05;
    this.pitch = Math.max(-limit, Math.min(limit, this.pitch));

    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));

    let moveX = 0;
    let moveZ = 0;
    if (input.isDown('KeyW')) {
      moveX += forward.x;
      moveZ += forward.z;
    }
    if (input.isDown('KeyS')) {
      moveX -= forward.x;
      moveZ -= forward.z;
    }
    if (input.isDown('KeyD')) {
      moveX += right.x;
      moveZ += right.z;
    }
    if (input.isDown('KeyA')) {
      moveX -= right.x;
      moveZ -= right.z;
    }

    const len = Math.hypot(moveX, moveZ);
    if (len > 0) {
      moveX /= len;
      moveZ /= len;
    }

    let speed = WALK_SPEED;
    if (input.isDown('ShiftLeft') || input.isDown('ShiftRight')) {
      speed *= SPRINT_MULT;
    }

    // Horizontal movement with axis-separated collision response.
    const dx = moveX * speed * dt;
    const dz = moveZ * speed * dt;
    this.tryMove(dx, 0);
    this.tryMove(0, dz);

    // Vertical (gravity + jump).
    if (this.grounded && (input.isDown('Space'))) {
      this.velocityY = JUMP_VELOCITY;
      this.grounded = false;
    }
    this.velocityY -= GRAVITY * dt;
    this.position.y += this.velocityY * dt;
    if (this.position.y <= EYE_HEIGHT) {
      this.position.y = EYE_HEIGHT;
      this.velocityY = 0;
      this.grounded = true;
    }

    this.level.clampToBounds(this.position, PLAYER_RADIUS);
    this.applyTransform();
  }

  private tryMove(dx: number, dz: number): void {
    const newX = this.position.x + dx;
    const newZ = this.position.z + dz;
    if (!this.level.collides(newX, this.position.z, PLAYER_RADIUS)) {
      this.position.x = newX;
    }
    if (!this.level.collides(this.position.x, newZ, PLAYER_RADIUS)) {
      this.position.z = newZ;
    }
  }

  private applyTransform(): void {
    this.camera.position.copy(this.position);
    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
  }
}
