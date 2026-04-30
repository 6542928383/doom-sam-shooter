import * as THREE from 'three';
import { AmmoType, type FireContext, type Weapon } from './types';

/** Rocket launcher — slow projectile with big splash. Mind your toes. */
export class RocketLauncher implements Weapon {
  readonly slot = 5;
  readonly name = 'ROCKET LAUNCHER';
  readonly ammoType = AmmoType.Rockets;
  readonly cooldown = 0.95;
  readonly kickStrength = 0.25;

  buildViewmodel(): THREE.Group {
    const group = new THREE.Group();
    group.position.set(0.3, -0.36, -0.9);

    const tubeMat = new THREE.MeshStandardMaterial({ color: 0x265f30, roughness: 0.7 });
    const ringMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.6, roughness: 0.4 });

    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.9, 16), tubeMat);
    tube.rotation.x = Math.PI / 2;
    tube.position.set(0, 0, 0.25);
    group.add(tube);

    for (let i = 0; i < 3; i++) {
      const r = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.015, 8, 16), ringMat);
      r.rotation.y = Math.PI / 2;
      r.position.set(0, 0, -0.1 + i * 0.3);
      group.add(r);
    }

    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.2, 0.12), ringMat);
    grip.position.set(0, -0.2, 0.05);
    group.add(grip);

    return group;
  }

  fire(ctx: FireContext): void {
    const muzzle = ctx.origin.clone().addScaledVector(ctx.direction, 1.0);
    ctx.projectiles.spawn({
      position: muzzle,
      direction: ctx.direction.clone(),
      speed: 36,
      lifetime: 4,
      damage: 80,
      splashDamage: 80,
      splashRadius: 5,
      color: 0xff6622,
      emissive: 0xffaa00,
      size: 0.22,
      trail: true,
    });
  }
}

/** Minigun — rapid plasma-style projectiles; the Serious Sam workhorse. */
export class Minigun implements Weapon {
  readonly slot = 6;
  readonly name = 'MINIGUN';
  readonly ammoType = AmmoType.Bullets;
  readonly cooldown = 0.06;
  readonly kickStrength = 0.04;

  buildViewmodel(): THREE.Group {
    const group = new THREE.Group();
    group.position.set(0.3, -0.34, -0.95);

    const housingMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.7, roughness: 0.4 });
    const barrelMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.85, roughness: 0.3 });

    const housing = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.36, 16), housingMat);
    housing.rotation.x = Math.PI / 2;
    housing.position.set(0, 0, -0.05);
    group.add(housing);

    const barrels = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.85, 12), barrelMat);
    barrels.rotation.x = Math.PI / 2;
    barrels.position.set(0, 0, 0.5);
    group.add(barrels);

    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.24, 0.14), housingMat);
    grip.position.set(0, -0.22, -0.18);
    group.add(grip);

    return group;
  }

  fire(ctx: FireContext): void {
    const muzzle = ctx.origin.clone().addScaledVector(ctx.direction, 0.9);
    const tangent = new THREE.Vector3();
    tangent.crossVectors(ctx.direction, new THREE.Vector3(0, 1, 0)).normalize();
    const bitangent = new THREE.Vector3().crossVectors(ctx.direction, tangent).normalize();
    const spread = 0.04;
    const dir = ctx.direction
      .clone()
      .addScaledVector(tangent, (Math.random() - 0.5) * 2 * spread)
      .addScaledVector(bitangent, (Math.random() - 0.5) * 2 * spread)
      .normalize();

    ctx.projectiles.spawn({
      position: muzzle,
      direction: dir,
      speed: 90,
      lifetime: 1.5,
      damage: 14,
      color: 0xfff3a8,
      emissive: 0xffd84a,
      size: 0.07,
      trail: false,
    });
  }
}

/** Cannon — heavy projectile, devastating splash. The Serious Sam crowd-eraser. */
export class Cannon implements Weapon {
  readonly slot = 7;
  readonly name = 'CANNON';
  readonly ammoType = AmmoType.Cells;
  readonly cooldown = 1.4;
  readonly kickStrength = 0.4;

  buildViewmodel(): THREE.Group {
    const group = new THREE.Group();
    group.position.set(0.32, -0.4, -1.0);

    const ironMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.4, roughness: 0.6 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0x886622, metalness: 0.6, roughness: 0.5 });

    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 1.05, 18), ironMat);
    tube.rotation.x = Math.PI / 2;
    tube.position.set(0, 0, 0.35);
    group.add(tube);

    const muzzleRing = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.025, 12, 24), goldMat);
    muzzleRing.rotation.y = Math.PI / 2;
    muzzleRing.position.set(0, 0, 0.85);
    group.add(muzzleRing);

    const breech = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.18), ironMat);
    breech.position.set(0, 0, -0.18);
    group.add(breech);

    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.24, 0.14), ironMat);
    handle.position.set(0, -0.22, -0.15);
    group.add(handle);

    return group;
  }

  fire(ctx: FireContext): void {
    const muzzle = ctx.origin.clone().addScaledVector(ctx.direction, 1.2);
    ctx.projectiles.spawn({
      position: muzzle,
      direction: ctx.direction.clone(),
      speed: 28,
      lifetime: 5,
      damage: 200,
      splashDamage: 150,
      splashRadius: 8,
      color: 0x222222,
      emissive: 0x550000,
      size: 0.4,
      trail: true,
    });
  }
}
