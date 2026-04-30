import * as THREE from 'three';
import { Enemy } from './Enemy';
import { EnemyKind } from './types';

/**
 * Doom-style melee grunt. Standard chase-and-claw archetype: cheap, plentiful, easy to kill.
 */
export class Imp extends Enemy {
  readonly kind = EnemyKind.Imp;
  readonly displayName = 'Imp';

  constructor(level: import('../Level').Level, spawn: THREE.Vector3) {
    super(level, spawn, 30, 0xa83218, 0x220000);
    this.speed = 5.5;
    this.meleeDamage = 12;
  }

  protected buildMesh(): void {
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(this.radius, 1.4, 4, 8), this.bodyMaterial);
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

    const hornMat = new THREE.MeshStandardMaterial({ color: 0x1a0808, roughness: 0.6 });
    const hornGeom = new THREE.ConeGeometry(0.18, 0.6, 6);
    const hornL = new THREE.Mesh(hornGeom, hornMat);
    hornL.position.set(-0.3, 2.25, 0);
    hornL.rotation.z = 0.3;
    this.mesh.add(hornL);
    const hornR = new THREE.Mesh(hornGeom, hornMat);
    hornR.position.set(0.3, 2.25, 0);
    hornR.rotation.z = -0.3;
    this.mesh.add(hornR);
  }
}
