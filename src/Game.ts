import * as THREE from 'three';
import { Player } from './Player';
import { InputManager } from './InputManager';
import { Level } from './Level';
import { EnemyManager } from './EnemyManager';
import { WeaponSystem } from './WeaponSystem';
import { HUD } from './HUD';

export class Game {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private clock: THREE.Clock;
  private player: Player;
  private input: InputManager;
  private level: Level;
  private enemies: EnemyManager;
  private weapons: WeaponSystem;
  private hud: HUD;
  private running = false;
  private startedAt = 0;

  onDeath: ((kills: number, timeAlive: number) => void) | null = null;
  onPointerLockExit: (() => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a0a08);
    this.scene.fog = new THREE.Fog(0x1a0a08, 30, 120);

    this.camera = new THREE.PerspectiveCamera(85, 1, 0.1, 500);

    this.clock = new THREE.Clock();
    this.input = new InputManager(canvas);
    this.level = new Level(this.scene);
    this.player = new Player(this.camera, this.level);
    this.weapons = new WeaponSystem(this.scene, this.camera);
    this.enemies = new EnemyManager(this.scene, this.level);
    this.hud = new HUD();

    this.input.onPointerLockChange = (locked) => {
      if (!locked && this.running) {
        this.running = false;
        if (this.onPointerLockExit) this.onPointerLockExit();
      }
    };

    this.input.onFire = () => {
      if (!this.running || this.player.isDead()) return;
      this.weapons.fire(this.enemies);
    };

    this.input.onSwitchWeapon = (slot) => {
      if (!this.running) return;
      this.weapons.switchTo(slot);
    };

    this.spawnInitialEntities();
  }

  private spawnInitialEntities(): void {
    this.enemies.spawnInitialWave();
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    if (this.startedAt === 0) this.startedAt = performance.now();
    this.input.requestPointerLock();
    this.clock.start();
    this.loop();
  }

  reset(): void {
    this.player.reset();
    this.enemies.reset();
    this.weapons.reset();
    this.startedAt = 0;
  }

  isPlayerDead(): boolean {
    return this.player.isDead();
  }

  private loop = (): void => {
    if (!this.running) return;
    requestAnimationFrame(this.loop);
    const dt = Math.min(this.clock.getDelta(), 0.1);

    this.player.update(dt, this.input);
    this.enemies.update(dt, this.player);
    this.weapons.update(dt);

    if (this.player.didTakeDamage()) {
      this.hud.flashDamage();
    }

    this.hud.update({
      health: this.player.health,
      armor: this.player.armor,
      ammo: this.weapons.currentAmmo(),
      weapon: this.weapons.currentName(),
      kills: this.enemies.kills,
    });

    if (this.player.isDead()) {
      this.running = false;
      this.input.exitPointerLock();
      const timeAlive = (performance.now() - this.startedAt) / 1000;
      if (this.onDeath) this.onDeath(this.enemies.kills, timeAlive);
    }

    this.renderer.render(this.scene, this.camera);
  };

  renderIdle(): void {
    this.renderer.render(this.scene, this.camera);
  }

  resize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }
}
