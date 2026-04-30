import * as THREE from 'three';
import { AmmoType, type FireContext, type Weapon } from './types';

/** Fist — melee, infinite ammo. Surprisingly viable as a panic option. */
export class Fist implements Weapon {
  readonly slot = 1;
  readonly name = 'FIST';
  readonly ammoType = AmmoType.Infinite;
  readonly cooldown = 0.35;
  readonly kickStrength = 0.05;

  buildViewmodel(): THREE.Group {
    const group = new THREE.Group();
    group.position.set(0.32, -0.42, -0.55);

    const handMat = new THREE.MeshStandardMaterial({ color: 0x9a6b3a, roughness: 0.85 });
    const knuckleMat = new THREE.MeshStandardMaterial({ color: 0x5a3015, roughness: 0.95 });

    const fist = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.22, 0.32), handMat);
    group.add(fist);
    for (let i = 0; i < 4; i++) {
      const k = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), knuckleMat);
      k.position.set(-0.1 + i * 0.07, 0.06, 0.18);
      group.add(k);
    }
    return group;
  }

  fire(ctx: FireContext): void {
    // Short-range hitscan with very generous radius.
    for (const enemy of ctx.enemies.list()) {
      if (!enemy.alive) continue;
      const dx = enemy.position.x - ctx.origin.x;
      const dz = enemy.position.z - ctx.origin.z;
      const distSq = dx * dx + dz * dz;
      if (distSq > 4) continue;
      // Facing check: angle between the horizontal-projected weapon direction
      // and the unit vector to the enemy. We normalize the projection so the
      // check works regardless of camera pitch (looking up/down at point-blank).
      const len = Math.sqrt(distSq);
      if (len < 0.001) continue;
      const dirHoriz = Math.sqrt(ctx.direction.x * ctx.direction.x + ctx.direction.z * ctx.direction.z);
      if (dirHoriz < 0.001) continue;
      const dot = (dx / len) * (ctx.direction.x / dirHoriz) + (dz / len) * (ctx.direction.z / dirHoriz);
      if (dot > 0.5) {
        enemy.takeDamage(20);
      }
    }
  }
}

/** Pistol — fast semi-auto hitscan, infinite ammo for utility. */
export class Pistol implements Weapon {
  readonly slot = 2;
  readonly name = 'PISTOL';
  readonly ammoType = AmmoType.Bullets;
  readonly cooldown = 0.2;
  readonly kickStrength = 0.08;

  buildViewmodel(): THREE.Group {
    const group = new THREE.Group();
    group.position.set(0.32, -0.32, -0.7);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.6, roughness: 0.4 });
    const slideMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.8, roughness: 0.3 });
    const gripMat = new THREE.MeshStandardMaterial({ color: 0x1a0a05, roughness: 0.9 });

    group.add(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, 0.5), bodyMat));
    const slide = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.1, 0.45), slideMat);
    slide.position.set(0, 0.1, 0.02);
    group.add(slide);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.22, 0.16), gripMat);
    grip.position.set(0, -0.18, -0.18);
    grip.rotation.x = -0.25;
    group.add(grip);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.1, 8), slideMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.05, 0.3);
    group.add(barrel);
    return group;
  }

  fire(ctx: FireContext): void {
    const hit = ctx.enemies.raycastClosest(ctx.origin, ctx.direction);
    if (hit) hit.enemy.takeDamage(18);
  }
}

/** Shotgun — wide pellet spread, devastating up close, falls off with distance. */
export class Shotgun implements Weapon {
  readonly slot = 3;
  readonly name = 'SHOTGUN';
  readonly ammoType = AmmoType.Shells;
  readonly cooldown = 0.85;
  readonly kickStrength = 0.18;
  private pellets = 8;
  private spread = 0.07;
  private damagePerPellet = 9;

  buildViewmodel(): THREE.Group {
    const group = new THREE.Group();
    group.position.set(0.3, -0.34, -0.85);

    const woodMat = new THREE.MeshStandardMaterial({ color: 0x4a2a12, roughness: 0.85 });
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.85, roughness: 0.3 });

    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.16, 0.45), woodMat);
    stock.position.set(0, -0.06, -0.25);
    group.add(stock);

    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, 0.35), steelMat);
    receiver.position.set(0, 0, 0);
    group.add(receiver);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.7, 12), steelMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.05, 0.4);
    group.add(barrel);

    const pump = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.08, 0.18), woodMat);
    pump.position.set(0, -0.05, 0.32);
    group.add(pump);

    return group;
  }

  fire(ctx: FireContext): void {
    const tangent = new THREE.Vector3();
    const bitangent = new THREE.Vector3();
    if (Math.abs(ctx.direction.y) < 0.99) {
      tangent.crossVectors(ctx.direction, new THREE.Vector3(0, 1, 0)).normalize();
    } else {
      tangent.set(1, 0, 0);
    }
    bitangent.crossVectors(ctx.direction, tangent).normalize();

    for (let i = 0; i < this.pellets; i++) {
      const r1 = (Math.random() - 0.5) * 2 * this.spread;
      const r2 = (Math.random() - 0.5) * 2 * this.spread;
      const dir = ctx.direction
        .clone()
        .addScaledVector(tangent, r1)
        .addScaledVector(bitangent, r2)
        .normalize();
      const hit = ctx.enemies.raycastClosest(ctx.origin, dir);
      if (hit) {
        const falloff = Math.max(0.4, 1 - hit.t / 50);
        hit.enemy.takeDamage(this.damagePerPellet * falloff);
      }
    }
  }
}

/** Chaingun — fast hitscan with mild spread; the workhorse against medium hordes. */
export class Chaingun implements Weapon {
  readonly slot = 4;
  readonly name = 'CHAINGUN';
  readonly ammoType = AmmoType.Bullets;
  readonly cooldown = 0.08;
  readonly kickStrength = 0.05;
  private spread = 0.025;

  buildViewmodel(): THREE.Group {
    const group = new THREE.Group();
    group.position.set(0.3, -0.34, -0.8);

    const steelMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.7, roughness: 0.4 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x1d1d1d, metalness: 0.6, roughness: 0.6 });

    const housing = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.18, 0.4), darkMat);
    group.add(housing);

    const barrelGroup = new THREE.Group();
    barrelGroup.position.set(0, 0, 0.4);
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.4, 6), steelMat);
      b.rotation.x = Math.PI / 2;
      b.position.set(Math.cos(angle) * 0.05, Math.sin(angle) * 0.05, 0.2);
      barrelGroup.add(b);
    }
    group.add(barrelGroup);

    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.2, 0.14), darkMat);
    grip.position.set(0, -0.18, -0.15);
    group.add(grip);

    return group;
  }

  fire(ctx: FireContext): void {
    const tangent = new THREE.Vector3();
    const bitangent = new THREE.Vector3();
    tangent.crossVectors(ctx.direction, new THREE.Vector3(0, 1, 0)).normalize();
    bitangent.crossVectors(ctx.direction, tangent).normalize();
    const r1 = (Math.random() - 0.5) * 2 * this.spread;
    const r2 = (Math.random() - 0.5) * 2 * this.spread;
    const dir = ctx.direction
      .clone()
      .addScaledVector(tangent, r1)
      .addScaledVector(bitangent, r2)
      .normalize();
    const hit = ctx.enemies.raycastClosest(ctx.origin, dir);
    if (hit) hit.enemy.takeDamage(10);
  }
}
