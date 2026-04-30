import * as THREE from 'three';
import type { Player } from '../Player';
import type { WeaponSystem } from '../WeaponSystem';
import { PickupKind, PICKUP_AMOUNTS, PICKUP_VISUALS, type PickupSpec } from './types';

const PICKUP_RADIUS = 1.4;
const PICKUP_HEIGHT = 0.9;
const BOB_AMPLITUDE = 0.12;
const BOB_SPEED = 2.4;
const SPIN_SPEED = 1.6;

interface ActivePickup {
  kind: PickupKind;
  amount: number;
  position: THREE.Vector3;
  group: THREE.Group;
  alive: boolean;
}

export class PickupManager {
  private scene: THREE.Scene;
  private pickups: ActivePickup[] = [];
  private elapsed = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  reset(): void {
    for (const p of this.pickups) {
      this.scene.remove(p.group);
      this.disposeGroup(p.group);
    }
    this.pickups = [];
  }

  loadSpecs(specs: PickupSpec[]): void {
    this.reset();
    for (const spec of specs) {
      this.spawn(spec.kind, spec.x, spec.z, spec.amount ?? PICKUP_AMOUNTS[spec.kind]);
    }
  }

  spawn(kind: PickupKind, x: number, z: number, amount: number): void {
    const visual = PICKUP_VISUALS[kind];
    const group = new THREE.Group();
    group.position.set(x, PICKUP_HEIGHT, z);

    const mat = new THREE.MeshStandardMaterial({
      color: visual.color,
      emissive: visual.emissive,
      emissiveIntensity: 1.4,
      roughness: 0.3,
      metalness: 0.5,
    });

    const core = new THREE.Mesh(geometryFor(kind), mat);
    core.castShadow = true;
    group.add(core);

    const halo = new THREE.PointLight(visual.emissive, 0.8, 6);
    halo.position.set(0, 0, 0);
    group.add(halo);

    this.scene.add(group);

    this.pickups.push({
      kind,
      amount,
      position: new THREE.Vector3(x, PICKUP_HEIGHT, z),
      group,
      alive: true,
    });
  }

  /** Animate floating pickups and pick up anything the player touches. */
  update(dt: number, player: Player, weapons: WeaponSystem): void {
    this.elapsed += dt;
    const py = 0;
    void py;
    for (const p of this.pickups) {
      if (!p.alive) continue;
      // Bob + spin.
      p.group.position.y = PICKUP_HEIGHT + Math.sin(this.elapsed * BOB_SPEED + p.position.x * 0.7) * BOB_AMPLITUDE;
      p.group.rotation.y += SPIN_SPEED * dt;

      const dx = player.position.x - p.position.x;
      const dz = player.position.z - p.position.z;
      if (dx * dx + dz * dz < PICKUP_RADIUS * PICKUP_RADIUS) {
        if (this.applyTo(p, player, weapons)) {
          p.alive = false;
          this.scene.remove(p.group);
          this.disposeGroup(p.group);
        }
      }
    }
    this.pickups = this.pickups.filter((p) => p.alive);
  }

  private applyTo(p: ActivePickup, player: Player, weapons: WeaponSystem): boolean {
    switch (p.kind) {
      case PickupKind.Health: {
        if (player.health >= player.maxHealth) return false;
        player.health = Math.min(player.maxHealth, player.health + p.amount);
        return true;
      }
      case PickupKind.Armor: {
        if (player.armor >= player.maxArmor) return false;
        player.armor = Math.min(player.maxArmor, player.armor + p.amount);
        return true;
      }
      case PickupKind.Bullets:
        weapons.addAmmoBullets(p.amount);
        return true;
      case PickupKind.Shells:
        weapons.addAmmoShells(p.amount);
        return true;
      case PickupKind.Rockets:
        weapons.addAmmoRockets(p.amount);
        return true;
      case PickupKind.Cells:
        weapons.addAmmoCells(p.amount);
        return true;
    }
  }

  private disposeGroup(group: THREE.Group): void {
    group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        const mat = obj.material;
        if (Array.isArray(mat)) {
          for (const m of mat) m.dispose();
        } else {
          mat.dispose();
        }
      }
    });
  }
}

function geometryFor(kind: PickupKind): THREE.BufferGeometry {
  switch (kind) {
    case PickupKind.Health:
      return new THREE.BoxGeometry(0.55, 0.55, 0.55);
    case PickupKind.Armor:
      return new THREE.OctahedronGeometry(0.5);
    case PickupKind.Rockets:
      return new THREE.CylinderGeometry(0.18, 0.18, 0.7, 12);
    case PickupKind.Shells:
      return new THREE.BoxGeometry(0.6, 0.35, 0.6);
    case PickupKind.Bullets:
      return new THREE.BoxGeometry(0.55, 0.3, 0.4);
    case PickupKind.Cells:
      return new THREE.IcosahedronGeometry(0.45, 0);
  }
}
