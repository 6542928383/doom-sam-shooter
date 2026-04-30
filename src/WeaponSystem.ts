import * as THREE from 'three';
import type { EnemyManager } from './EnemyManager';
import type { Level } from './Level';
import { Inventory } from './weapons/Inventory';
import { ProjectileManager } from './weapons/ProjectileManager';
import { Fist, Pistol, Shotgun, Chaingun } from './weapons/HitscanWeapons';
import { RocketLauncher, Minigun, Cannon } from './weapons/ProjectileWeapons';
import type { Weapon } from './weapons/types';

/**
 * Manages the active weapon, the player's inventory, and projectiles.
 * Weapons are stored in an array indexed by slot - 1.
 */
export class WeaponSystem {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private weapons: Weapon[];
  private current = 1; // pistol by default
  private cooldown = 0;
  private flash: THREE.PointLight;
  private flashTimer = 0;
  private viewmodelGroup: THREE.Group;
  private currentViewmodel: THREE.Group | null = null;
  private viewmodelKick = 0;
  private projectiles: ProjectileManager;
  private inventory = new Inventory();
  private switchCooldown = 0;
  private autoFireDirty = false;

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera, level: Level) {
    this.scene = scene;
    this.camera = camera;
    this.projectiles = new ProjectileManager(scene, level);

    this.weapons = [
      new Fist(),
      new Pistol(),
      new Shotgun(),
      new Chaingun(),
      new RocketLauncher(),
      new Minigun(),
      new Cannon(),
    ];

    this.flash = new THREE.PointLight(0xffcc55, 0, 8, 2);
    this.scene.add(this.flash);

    this.viewmodelGroup = new THREE.Group();
    this.camera.add(this.viewmodelGroup);
    this.scene.add(this.camera);

    this.equipCurrent();
  }

  reset(): void {
    this.current = 1;
    this.cooldown = 0;
    this.inventory.reset();
    this.projectiles.reset();
    this.equipCurrent();
  }

  switchTo(slot: number): void {
    if (this.switchCooldown > 0) return;
    const idx = slot - 1;
    if (idx < 0 || idx >= this.weapons.length) return;
    if (idx === this.current) return;
    this.current = idx;
    this.cooldown = 0;
    this.switchCooldown = 0.18;
    this.equipCurrent();
  }

  cycle(direction: 1 | -1): void {
    if (this.switchCooldown > 0) return;
    let next = this.current;
    for (let i = 0; i < this.weapons.length; i++) {
      next = (next + direction + this.weapons.length) % this.weapons.length;
      if (next !== this.current) {
        // skip empty-ammo weapons except fist (slot 0).
        const w = this.weapons[next];
        if (next === 0 || this.inventory.has(w.ammoType, 1)) {
          this.switchTo(next + 1);
          return;
        }
      }
    }
  }

  private equipCurrent(): void {
    if (this.currentViewmodel) {
      this.viewmodelGroup.remove(this.currentViewmodel);
    }
    this.currentViewmodel = this.weapons[this.current].buildViewmodel();
    this.viewmodelGroup.add(this.currentViewmodel);
  }

  currentName(): string {
    return this.weapons[this.current].name;
  }

  currentAmmo(): string {
    const w = this.weapons[this.current];
    return this.inventory.display(w.ammoType);
  }

  /** Triggered by the InputManager on a fresh fire press OR while the trigger is held. */
  fire(enemies: EnemyManager): void {
    this.autoFireDirty = true;
    this.tryFire(enemies);
  }

  private tryFire(enemies: EnemyManager): void {
    if (this.cooldown > 0) return;
    const w = this.weapons[this.current];
    if (!this.inventory.consume(w.ammoType, 1)) {
      // Out of ammo — auto-switch to fist next time.
      this.cooldown = 0.2;
      return;
    }
    this.cooldown = w.cooldown;

    const origin = new THREE.Vector3();
    this.camera.getWorldPosition(origin);
    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction);

    w.fire({
      origin,
      direction,
      enemies,
      projectiles: this.projectiles,
      scene: this.scene,
    });

    // Muzzle flash + recoil.
    this.flash.position.copy(origin).add(direction.clone().multiplyScalar(0.6));
    this.flash.intensity = 4;
    this.flashTimer = 0.05;
    this.viewmodelKick = w.kickStrength;
  }

  /** Called every frame; supports autofire on continuous LMB hold. */
  update(dt: number, isFiring: boolean, enemies: EnemyManager): void {
    if (this.cooldown > 0) this.cooldown -= dt;
    if (this.switchCooldown > 0) this.switchCooldown -= dt;

    // Auto-fire while held for full-auto weapons (chaingun, minigun, fist).
    if (isFiring && this.autoFireDirty && this.cooldown <= 0) {
      this.tryFire(enemies);
    }

    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
      if (this.flashTimer <= 0) this.flash.intensity = 0;
    }
    if (this.viewmodelKick > 0) {
      this.viewmodelKick = Math.max(0, this.viewmodelKick - dt * 0.6);
    }
    if (this.currentViewmodel) {
      this.currentViewmodel.position.z = this.viewmodelKick * 0.7;
      this.currentViewmodel.rotation.x = this.viewmodelKick * 0.4;
    }

    this.projectiles.update(dt, enemies);
  }

  /** Despawn any in-flight projectiles. Used on level transitions to keep
   * rockets/cannon balls from carrying over into the new arena. */
  clearProjectiles(): void {
    this.projectiles.reset();
  }

  /** Pickup hooks (used by future PR #5). */
  addAmmoBullets(n: number): void {
    this.inventory.add(this.weapons[1].ammoType, n);
  }
  addAmmoShells(n: number): void {
    this.inventory.add(this.weapons[2].ammoType, n);
  }
  addAmmoRockets(n: number): void {
    this.inventory.add(this.weapons[4].ammoType, n);
  }
  addAmmoCells(n: number): void {
    this.inventory.add(this.weapons[6].ammoType, n);
  }
}
