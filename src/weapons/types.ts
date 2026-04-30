import * as THREE from 'three';
import type { EnemyManager } from '../EnemyManager';
import type { ProjectileManager } from './ProjectileManager';

export const enum AmmoType {
  Infinite = 'INF',
  Bullets = 'BULLETS',
  Shells = 'SHELLS',
  Rockets = 'ROCKETS',
  Cells = 'CELLS',
}

export interface FireContext {
  origin: THREE.Vector3;
  direction: THREE.Vector3;
  enemies: EnemyManager;
  projectiles: ProjectileManager;
  scene: THREE.Scene;
}

export interface Weapon {
  readonly slot: number;
  readonly name: string;
  readonly ammoType: AmmoType;
  cooldown: number;
  buildViewmodel(): THREE.Group;
  fire(ctx: FireContext): void;
  /** Recoil kick to apply to viewmodel translation along Z. */
  readonly kickStrength: number;
}
