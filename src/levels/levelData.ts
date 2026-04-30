import * as THREE from 'three';
import { EnemyKind } from '../enemies/types';
import type { LevelSpec, ObstacleSpec } from './LevelSpec';

/** Add the four outer walls of a rectangular arena to an obstacle list. */
function addArenaWalls(out: ObstacleSpec[], halfW: number, halfD: number, height: number, t = 2): void {
  // North & south
  out.push({ x: 0, z: halfD + t / 2, w: halfW * 2 + t * 2, h: height, d: t });
  out.push({ x: 0, z: -halfD - t / 2, w: halfW * 2 + t * 2, h: height, d: t });
  // East & west
  out.push({ x: halfW + t / 2, z: 0, w: t, h: height, d: halfD * 2 + t * 2 });
  out.push({ x: -halfW - t / 2, z: 0, w: t, h: height, d: halfD * 2 + t * 2 });
}

function ring(positions: Array<[number, number]>): THREE.Vector3[] {
  return positions.map(([x, z]) => new THREE.Vector3(x, 0, z));
}

/** Level 1 — the original Doom-Sam arena. Open square with scattered cover pillars. */
function buildFoundry(): LevelSpec {
  const obstacles: ObstacleSpec[] = [];
  const halfW = 60;
  const halfD = 60;
  addArenaWalls(obstacles, halfW, halfD, 8);
  const pillarPositions: Array<[number, number]> = [
    [-30, -30], [30, -30], [-30, 30], [30, 30],
    [-15, 0], [15, 0], [0, -25], [0, 25],
  ];
  for (const [x, z] of pillarPositions) {
    obstacles.push({ x, z, w: 4, h: 8, d: 4 });
  }

  return {
    id: 'foundry',
    displayName: 'LEVEL 1 — THE FOUNDRY',
    subtitle: 'Welcome to Hell',
    playerStart: new THREE.Vector3(0, 1.6, 50),
    bounds: { minX: -halfW, maxX: halfW, minZ: -halfD, maxZ: halfD },
    obstacles,
    spawnPoints: ring([
      [-50, -50], [50, -50], [-50, 50], [50, 50],
      [0, -55], [0, 55], [-55, 0], [55, 0],
      [-40, 20], [40, -20],
    ]),
    portal: new THREE.Vector3(0, 0, 0),
    theme: {
      floor: 0x3a1f15,
      wall: 0x5a2a1a,
      pillar: 0x3a1810,
      sky: 0x1a0a08,
      fog: 0x1a0a08,
      fogNear: 30,
      fogFar: 120,
      ambient: 0x553322,
      sun: 0xffaa66,
      rune: 0xff3311,
    },
    waves: [
      { name: 'WAVE 1 — Welcome', durationSec: 4, plan: [[EnemyKind.Imp, 4]] },
      { name: 'WAVE 2 — Bombers', durationSec: 8, plan: [[EnemyKind.Imp, 5], [EnemyKind.Kamikaze, 2]] },
      { name: 'WAVE 3 — Ranged Fire', durationSec: 9, plan: [[EnemyKind.Imp, 3], [EnemyKind.Skeleton, 3]] },
    ],
  };
}

/** Level 2 — a tighter "cathedral" arena: smaller bounds, taller walls, denser pillar grid. */
function buildCathedral(): LevelSpec {
  const obstacles: ObstacleSpec[] = [];
  const halfW = 45;
  const halfD = 45;
  addArenaWalls(obstacles, halfW, halfD, 14);
  // Inner pillars in a dense grid for cathedral-pillar feel.
  const grid: Array<[number, number]> = [];
  for (const x of [-25, -10, 10, 25]) {
    for (const z of [-25, -10, 10, 25]) {
      grid.push([x, z]);
    }
  }
  for (const [x, z] of grid) {
    obstacles.push({ x, z, w: 3, h: 14, d: 3 });
  }
  // Two thicker buttress walls forming a partial corridor near the player start.
  obstacles.push({ x: -8, z: 30, w: 4, h: 14, d: 12 });
  obstacles.push({ x: 8, z: 30, w: 4, h: 14, d: 12 });

  return {
    id: 'cathedral',
    displayName: 'LEVEL 2 — CATHEDRAL OF BONES',
    subtitle: 'Hold the nave',
    playerStart: new THREE.Vector3(0, 1.6, 38),
    bounds: { minX: -halfW, maxX: halfW, minZ: -halfD, maxZ: halfD },
    obstacles,
    spawnPoints: ring([
      [-40, -40], [40, -40], [-40, 30], [40, 30],
      [0, -42], [-42, 0], [42, 0],
      [-20, -30], [20, -30],
    ]),
    portal: new THREE.Vector3(0, 0, -36),
    theme: {
      floor: 0x1c2236,
      wall: 0x303a55,
      pillar: 0x1a1f33,
      sky: 0x0a1024,
      fog: 0x0a1024,
      fogNear: 20,
      fogFar: 90,
      ambient: 0x33445a,
      sun: 0xaaccff,
      rune: 0x66bbff,
    },
    waves: [
      { name: 'WAVE 1 — Choir of Bones', durationSec: 8, plan: [[EnemyKind.Skeleton, 5], [EnemyKind.Imp, 2]] },
      { name: 'WAVE 2 — Stampede', durationSec: 9, plan: [[EnemyKind.Bull, 2], [EnemyKind.Kamikaze, 3]] },
      { name: 'WAVE 3 — Heavy Hand', durationSec: 11, plan: [[EnemyKind.Skeleton, 4], [EnemyKind.Mancubus, 1], [EnemyKind.Imp, 3]] },
    ],
  };
}

/** Level 3 — wide volcanic arena with raised platform centre. The boss-tier finale. */
function buildBridge(): LevelSpec {
  const obstacles: ObstacleSpec[] = [];
  const halfW = 70;
  const halfD = 70;
  addArenaWalls(obstacles, halfW, halfD, 6);
  // Outer corner buttresses for cover.
  for (const [x, z] of [[-50, -50], [50, -50], [-50, 50], [50, 50]] as Array<[number, number]>) {
    obstacles.push({ x, z, w: 6, h: 6, d: 6 });
  }
  // Centre platform: 4 thick pillars around a clear arena hub.
  for (const [x, z] of [[-12, -12], [12, -12], [-12, 12], [12, 12]] as Array<[number, number]>) {
    obstacles.push({ x, z, w: 5, h: 6, d: 5 });
  }

  return {
    id: 'bridge',
    displayName: 'LEVEL 3 — BRIDGE OF THE DAMNED',
    subtitle: 'Hold the bridge — no retreat',
    playerStart: new THREE.Vector3(0, 1.6, 60),
    bounds: { minX: -halfW, maxX: halfW, minZ: -halfD, maxZ: halfD },
    obstacles,
    spawnPoints: ring([
      [-60, -60], [60, -60], [-60, 60], [60, 60],
      [0, -65], [0, 65], [-65, 0], [65, 0],
      [-40, -55], [40, -55], [-40, 55], [40, 55],
    ]),
    portal: new THREE.Vector3(0, 0, -55),
    theme: {
      floor: 0x2a0a08,
      wall: 0x6a1818,
      pillar: 0x300404,
      sky: 0x0a0203,
      fog: 0x180404,
      fogNear: 35,
      fogFar: 140,
      ambient: 0x661a18,
      sun: 0xff5522,
      rune: 0xff2200,
    },
    waves: [
      { name: 'WAVE 1 — Mixed Horde', durationSec: 10, plan: [
        [EnemyKind.Imp, 4], [EnemyKind.Kamikaze, 3], [EnemyKind.Skeleton, 2],
      ] },
      { name: 'WAVE 2 — Heavy Crew', durationSec: 12, plan: [
        [EnemyKind.Bull, 3], [EnemyKind.Mancubus, 2], [EnemyKind.Skeleton, 2],
      ] },
      { name: 'WAVE 3 — APOCALYPSE', durationSec: 16, plan: [
        [EnemyKind.Imp, 6], [EnemyKind.Kamikaze, 4], [EnemyKind.Skeleton, 3],
        [EnemyKind.Bull, 2], [EnemyKind.Mancubus, 2],
      ] },
    ],
  };
}

export const LEVELS: LevelSpec[] = [
  buildFoundry(),
  buildCathedral(),
  buildBridge(),
];
