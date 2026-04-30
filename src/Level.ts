import * as THREE from 'three';

/** A simple AABB obstacle used for collisions. */
export interface Obstacle {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  height: number;
}

/**
 * The first level: a Doom-style enclosed corridor that opens into a Serious-Sam-style arena.
 * Geometry is built from boxed walls + an open floor. Collision uses simple AABBs.
 */
export class Level {
  scene: THREE.Scene;
  obstacles: Obstacle[] = [];
  /** Horizontal bounds of the playable area (the arena). */
  bounds = { minX: -60, maxX: 60, minZ: -60, maxZ: 60 };
  spawnPoints: THREE.Vector3[] = [];
  playerStart = new THREE.Vector3(0, 1.6, 50);

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.buildLights();
    this.buildFloor();
    this.buildArena();
    this.buildSpawnPoints();
  }

  private buildLights(): void {
    const ambient = new THREE.AmbientLight(0x553322, 0.6);
    this.scene.add(ambient);

    const hemi = new THREE.HemisphereLight(0xff7733, 0x110505, 0.4);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xffaa66, 0.7);
    sun.position.set(40, 80, 20);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -80;
    sun.shadow.camera.right = 80;
    sun.shadow.camera.top = 80;
    sun.shadow.camera.bottom = -80;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 200;
    this.scene.add(sun);
  }

  private buildFloor(): void {
    const floorGeom = new THREE.PlaneGeometry(200, 200, 1, 1);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x3a1f15,
      roughness: 0.95,
    });
    const floor = new THREE.Mesh(floorGeom, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Subtle grid overlay reminiscent of techbase tiles.
    const grid = new THREE.GridHelper(200, 40, 0x552211, 0x331108);
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.35;
    this.scene.add(grid);
  }

  private buildArena(): void {
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x5a2a1a, roughness: 0.85 });
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x3a1810, roughness: 0.9 });

    // Outer walls of arena (approx. 120 x 120).
    const wallH = 8;
    const halfW = 60;
    const t = 2;
    this.addBoxWall(wallMat, 0, halfW + t / 2, halfW * 2 + t * 2, wallH, t); // north
    this.addBoxWall(wallMat, 0, -halfW - t / 2, halfW * 2 + t * 2, wallH, t); // south
    this.addBoxWall(wallMat, halfW + t / 2, 0, t, wallH, halfW * 2 + t * 2); // east
    this.addBoxWall(wallMat, -halfW - t / 2, 0, t, wallH, halfW * 2 + t * 2); // west

    // Pillars scattered for cover.
    const pillarPositions: Array<[number, number]> = [
      [-30, -30],
      [30, -30],
      [-30, 30],
      [30, 30],
      [-15, 0],
      [15, 0],
      [0, -25],
      [0, 25],
    ];
    for (const [x, z] of pillarPositions) {
      this.addBoxWall(pillarMat, x, z, 4, wallH, 4);
    }

    // Decorative emissive runes at center.
    const runeGeom = new THREE.RingGeometry(8, 9, 32);
    const runeMat = new THREE.MeshBasicMaterial({
      color: 0xff3311,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.35,
    });
    const rune = new THREE.Mesh(runeGeom, runeMat);
    rune.rotation.x = -Math.PI / 2;
    rune.position.y = 0.02;
    this.scene.add(rune);
  }

  private addBoxWall(mat: THREE.Material, x: number, z: number, w: number, h: number, d: number): void {
    const geom = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(x, h / 2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);
    this.obstacles.push({
      minX: x - w / 2,
      maxX: x + w / 2,
      minZ: z - d / 2,
      maxZ: z + d / 2,
      height: h,
    });
  }

  private buildSpawnPoints(): void {
    // Spawn points around the perimeter for enemies.
    const perimeter: Array<[number, number]> = [
      [-50, -50],
      [50, -50],
      [-50, 50],
      [50, 50],
      [0, -55],
      [0, 55],
      [-55, 0],
      [55, 0],
      [-40, 20],
      [40, -20],
    ];
    for (const [x, z] of perimeter) {
      this.spawnPoints.push(new THREE.Vector3(x, 0, z));
    }
  }

  /** Test whether (x, z) collides with any obstacle. Uses the player/enemy radius. */
  collides(x: number, z: number, radius: number): boolean {
    for (const o of this.obstacles) {
      if (
        x + radius > o.minX &&
        x - radius < o.maxX &&
        z + radius > o.minZ &&
        z - radius < o.maxZ
      ) {
        return true;
      }
    }
    return false;
  }

  /** Clamp a horizontal position inside the playable bounds with a margin. */
  clampToBounds(out: THREE.Vector3, radius: number): void {
    out.x = Math.max(this.bounds.minX + radius, Math.min(this.bounds.maxX - radius, out.x));
    out.z = Math.max(this.bounds.minZ + radius, Math.min(this.bounds.maxZ - radius, out.z));
  }
}
