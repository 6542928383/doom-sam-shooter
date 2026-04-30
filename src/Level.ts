import * as THREE from 'three';
import type { LevelSpec } from './levels/LevelSpec';

/** A simple AABB obstacle used for collisions. */
export interface Obstacle {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  height: number;
}

const PORTAL_RADIUS = 2.4;

/**
 * Builds and owns all meshes / lights for a single level. The same instance is reused
 * across level transitions: `loadSpec` tears down the previous geometry and constructs
 * the new one in-place, so other systems (Player, WeaponSystem) keep their `level`
 * reference valid for the lifetime of the Game.
 */
export class Level {
  scene: THREE.Scene;
  spec!: LevelSpec;
  /** Root group holding all meshes for the current spec. */
  private root: THREE.Group = new THREE.Group();
  obstacles: Obstacle[] = [];
  bounds = { minX: -60, maxX: 60, minZ: -60, maxZ: 60 };
  spawnPoints: THREE.Vector3[] = [];
  playerStart = new THREE.Vector3(0, 1.6, 50);

  /** The exit portal group (null until `spawnPortal` has been called for the current spec). */
  private portalGroup: THREE.Group | null = null;
  private portalLight: THREE.PointLight | null = null;
  private portalTime = 0;

  constructor(scene: THREE.Scene, spec: LevelSpec) {
    this.scene = scene;
    this.loadSpec(spec);
  }

  /** Tear down the current geometry and build the next spec. */
  loadSpec(spec: LevelSpec): void {
    this.scene.remove(this.root);

    this.spec = spec;
    this.root = new THREE.Group();
    this.obstacles = [];
    this.bounds = { ...spec.bounds };
    this.spawnPoints = spec.spawnPoints.map((v) => v.clone());
    this.playerStart = spec.playerStart.clone();
    this.portalGroup = null;
    this.portalLight = null;
    this.portalTime = 0;

    this.scene.background = new THREE.Color(spec.theme.sky);
    this.scene.fog = new THREE.Fog(spec.theme.fog, spec.theme.fogNear, spec.theme.fogFar);

    this.buildLights();
    this.buildFloor();
    this.buildObstacles();
    this.buildRune();

    this.scene.add(this.root);
  }

  private buildLights(): void {
    const t = this.spec.theme;
    const ambient = new THREE.AmbientLight(t.ambient, 0.6);
    this.root.add(ambient);

    const hemi = new THREE.HemisphereLight(t.sun, 0x110505, 0.4);
    this.root.add(hemi);

    const sun = new THREE.DirectionalLight(t.sun, 0.7);
    sun.position.set(40, 80, 20);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -90;
    sun.shadow.camera.right = 90;
    sun.shadow.camera.top = 90;
    sun.shadow.camera.bottom = -90;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 200;
    this.root.add(sun);
  }

  private buildFloor(): void {
    const t = this.spec.theme;
    const floorGeom = new THREE.PlaneGeometry(220, 220, 1, 1);
    const floorMat = new THREE.MeshStandardMaterial({ color: t.floor, roughness: 0.95 });
    const floor = new THREE.Mesh(floorGeom, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.root.add(floor);

    const grid = new THREE.GridHelper(220, 44, t.wall, t.pillar);
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.3;
    this.root.add(grid);
  }

  private buildObstacles(): void {
    const t = this.spec.theme;
    const wallMat = new THREE.MeshStandardMaterial({ color: t.wall, roughness: 0.85 });
    const pillarMat = new THREE.MeshStandardMaterial({ color: t.pillar, roughness: 0.9 });

    for (const o of this.spec.obstacles) {
      const isPillar = o.w <= 6 && o.d <= 6;
      const mat = o.color !== undefined
        ? new THREE.MeshStandardMaterial({ color: o.color, roughness: 0.85 })
        : (isPillar ? pillarMat : wallMat);
      const geom = new THREE.BoxGeometry(o.w, o.h, o.d);
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.set(o.x, o.h / 2, o.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.root.add(mesh);
      this.obstacles.push({
        minX: o.x - o.w / 2,
        maxX: o.x + o.w / 2,
        minZ: o.z - o.d / 2,
        maxZ: o.z + o.d / 2,
        height: o.h,
      });
    }
  }

  private buildRune(): void {
    const color = this.spec.theme.rune;
    if (color === null) return;
    const runeGeom = new THREE.RingGeometry(8, 9, 32);
    const runeMat = new THREE.MeshBasicMaterial({
      color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.35,
    });
    const rune = new THREE.Mesh(runeGeom, runeMat);
    rune.rotation.x = -Math.PI / 2;
    rune.position.y = 0.02;
    this.root.add(rune);
  }

  /** Places the level's exit portal mesh + light in the world. Idempotent. */
  spawnPortal(): void {
    if (this.portalGroup) return;
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(PORTAL_RADIUS, 0.4, 16, 48),
      new THREE.MeshBasicMaterial({ color: 0x66ffaa }),
    );
    ring.rotation.x = -Math.PI / 2;
    const inner = new THREE.Mesh(
      new THREE.CircleGeometry(PORTAL_RADIUS - 0.4, 32),
      new THREE.MeshBasicMaterial({
        color: 0x88ffcc,
        transparent: true,
        opacity: 0.55,
        side: THREE.DoubleSide,
      }),
    );
    inner.rotation.x = -Math.PI / 2;

    const group = new THREE.Group();
    group.add(ring);
    group.add(inner);
    group.position.copy(this.spec.portal);
    group.position.y = 0.05;

    const light = new THREE.PointLight(0x66ffcc, 4, 18, 2);
    light.position.copy(group.position);
    light.position.y = 1.6;

    this.root.add(group);
    this.root.add(light);
    this.portalGroup = group;
    this.portalLight = light;
  }

  hasPortal(): boolean {
    return this.portalGroup !== null;
  }

  /** Animate the portal (called every frame from Game). */
  tickPortal(dt: number): void {
    if (!this.portalGroup) return;
    this.portalTime += dt;
    this.portalGroup.rotation.y += dt * 0.8;
    if (this.portalLight) {
      this.portalLight.intensity = 4 + Math.sin(this.portalTime * 6) * 1.5;
    }
  }

  /** Returns true if the (x, z) point is inside the active portal's footprint. */
  isInsidePortal(x: number, z: number): boolean {
    if (!this.portalGroup) return false;
    const dx = x - this.spec.portal.x;
    const dz = z - this.spec.portal.z;
    return dx * dx + dz * dz <= PORTAL_RADIUS * PORTAL_RADIUS;
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
