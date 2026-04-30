import * as THREE from 'three';
import { EnemyKind } from '../enemies/types';
import type { PickupSpec } from '../pickups/types';

/** A single AABB box obstacle (wall, pillar, prop) baked into the level. */
export interface ObstacleSpec {
  x: number;
  z: number;
  /** Width along X. */
  w: number;
  /** Height along Y (also used for visual mesh height). */
  h: number;
  /** Depth along Z. */
  d: number;
  /** Optional override colour. Defaults to the level's wall colour. */
  color?: number;
}

/** Counts-by-kind for one wave. The WaveManager turns this into a staggered spawn schedule. */
export type WaveCounts = Array<[EnemyKind, number]>;

export interface WaveSpec {
  /** Banner shown when the wave starts. */
  name: string;
  /** Total seconds across which the spawns are staggered. */
  durationSec: number;
  /** Counts per enemy kind. */
  plan: WaveCounts;
}

export interface LevelSpec {
  id: string;
  /** Display name shown when the level loads. */
  displayName: string;
  /** Subtitle / flavour text shown briefly when the level loads. */
  subtitle: string;
  /** Where the player spawns (camera Y is set to eye height by Player). */
  playerStart: THREE.Vector3;
  /** Horizontal playable bounds. */
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  /** Static obstacles built as box meshes + AABB collisions. */
  obstacles: ObstacleSpec[];
  /** Where enemy spawns can pick from. */
  spawnPoints: THREE.Vector3[];
  /** Where the exit portal appears once all waves are cleared. */
  portal: THREE.Vector3;

  /** Visual theme: colours used for floor, walls, ambient/hemi, sun, fog, sky. */
  theme: {
    floor: number;
    wall: number;
    pillar: number;
    sky: number;
    fog: number;
    fogNear: number;
    fogFar: number;
    ambient: number;
    sun: number;
    /** Optional centre rune colour; null skips the rune mesh. */
    rune: number | null;
  };

  /** Waves run on this level in order. Cleared all → portal spawns. */
  waves: WaveSpec[];

  /** Static pickups placed around the level. */
  pickups: PickupSpec[];
}
