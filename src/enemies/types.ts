import type * as THREE from 'three';
import type { Level } from '../Level';
import type { Player } from '../Player';
import type { EnemyProjectileManager } from './EnemyProjectileManager';

/** Identifier used by the WaveManager to request a particular archetype. */
export enum EnemyKind {
  Imp = 'imp',
  Kamikaze = 'kamikaze',
  Skeleton = 'skeleton',
  Bull = 'bull',
  Mancubus = 'mancubus',
}

/** Shared world handles passed to every enemy update so ranged archetypes can spawn projectiles. */
export interface EnemyContext {
  scene: THREE.Scene;
  level: Level;
  player: Player;
  projectiles: EnemyProjectileManager;
}
