import * as THREE from 'three';
import type { EnemyManager } from './EnemyManager';

interface WeaponDef {
  name: string;
  damage: number;
  cooldown: number;
}

/**
 * PR #1 ships only the pistol — instant-hit, infinite ammo, simple muzzle flash.
 * PR #2 will introduce slot-based weapon switching and the rest of the arsenal.
 */
export class WeaponSystem {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private weapons: WeaponDef[] = [
    { name: 'PISTOL', damage: 18, cooldown: 0.18 },
  ];
  private currentIndex = 0;
  private cooldown = 0;
  private flash: THREE.PointLight;
  private flashTimer = 0;
  private viewmodel: THREE.Group;
  private viewmodelKick = 0;

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    this.scene = scene;
    this.camera = camera;

    this.flash = new THREE.PointLight(0xffcc55, 0, 8, 2);
    this.scene.add(this.flash);

    this.viewmodel = this.buildPistolViewmodel();
    this.camera.add(this.viewmodel);
    this.scene.add(this.camera);
  }

  private buildPistolViewmodel(): THREE.Group {
    const group = new THREE.Group();
    group.position.set(0.32, -0.32, -0.7);

    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.6, roughness: 0.4 });
    const slideMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.8, roughness: 0.3 });
    const gripMat = new THREE.MeshStandardMaterial({ color: 0x1a0a05, roughness: 0.9 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, 0.5), bodyMat);
    group.add(body);

    const slide = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.1, 0.45), slideMat);
    slide.position.set(0, 0.1, 0.02);
    group.add(slide);

    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.22, 0.16), gripMat);
    grip.position.set(0, -0.18, -0.18);
    grip.rotation.x = -0.25;
    group.add(grip);

    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 0.1, 8),
      slideMat,
    );
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.05, 0.3);
    group.add(barrel);

    return group;
  }

  reset(): void {
    this.currentIndex = 0;
    this.cooldown = 0;
  }

  switchTo(slot: number): void {
    if (slot < 1) return;
    const idx = slot - 1;
    if (idx >= 0 && idx < this.weapons.length) {
      this.currentIndex = idx;
      this.cooldown = 0;
    }
  }

  currentName(): string {
    return this.weapons[this.currentIndex].name;
  }

  currentAmmo(): string {
    return '∞';
  }

  fire(enemies: EnemyManager): void {
    if (this.cooldown > 0) return;
    const def = this.weapons[this.currentIndex];
    this.cooldown = def.cooldown;

    const origin = new THREE.Vector3();
    this.camera.getWorldPosition(origin);
    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction);

    const hit = enemies.raycastClosest(origin, direction);
    if (hit) {
      hit.enemy.takeDamage(def.damage);
    }

    // Muzzle flash light pulse.
    this.flash.position.copy(origin).add(direction.clone().multiplyScalar(0.6));
    this.flash.intensity = 4;
    this.flashTimer = 0.05;

    // Viewmodel recoil.
    this.viewmodelKick = 0.08;
  }

  update(dt: number): void {
    if (this.cooldown > 0) this.cooldown -= dt;
    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
      if (this.flashTimer <= 0) this.flash.intensity = 0;
    }
    if (this.viewmodelKick > 0) {
      this.viewmodelKick = Math.max(0, this.viewmodelKick - dt * 0.5);
    }
    this.viewmodel.position.z = -0.7 + this.viewmodelKick;
    this.viewmodel.rotation.x = this.viewmodelKick * 0.6;
  }
}
