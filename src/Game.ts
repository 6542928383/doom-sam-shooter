import * as THREE from 'three';
import { Player } from './Player';
import { InputManager } from './InputManager';
import { Level } from './Level';
import { EnemyManager } from './EnemyManager';
import { WeaponSystem } from './WeaponSystem';
import { HUD } from './HUD';
import { WaveManager } from './waves/WaveManager';
import { LevelManager } from './levels/LevelManager';
import { LEVELS } from './levels/levelData';

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
  private waves: WaveManager;
  private levels: LevelManager;
  private hud: HUD;
  private running = false;
  private startedAt = 0;

  onDeath: ((kills: number, timeAlive: number) => void) | null = null;
  onVictory: ((kills: number, timeAlive: number) => void) | null = null;
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
    this.level = new Level(this.scene, LEVELS[0]);
    this.player = new Player(this.camera, this.level);
    this.weapons = new WeaponSystem(this.scene, this.camera, this.level);
    this.enemies = new EnemyManager(this.scene, this.level);
    this.waves = new WaveManager();
    this.levels = new LevelManager();
    this.levels.start(this.level, this.waves, this.enemies, this.player);
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

    this.input.onCycleWeapon = (dir) => {
      if (!this.running) return;
      this.weapons.cycle(dir);
    };

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
    this.weapons.reset();
    this.levels.reset(this.level, this.waves, this.enemies, this.player);
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
    this.waves.update(dt, this.enemies);
    this.enemies.update(dt, this.player);
    this.weapons.update(dt, this.input.isFiring(), this.enemies);
    this.level.tickPortal(dt);
    const indexBefore = this.levels.status().index;
    this.levels.update(this.level, this.waves, this.enemies, this.player);
    if (this.levels.status().index !== indexBefore) {
      // Level transition just fired — drop any in-flight rockets / cannon
      // balls so they don't carry over into the new arena.
      this.weapons.clearProjectiles();
    }

    if (this.player.didTakeDamage()) {
      this.hud.flashDamage();
    }

    const wave = this.waves.status(this.enemies);
    const lvl = this.levels.status();
    const banner = lvl.victory ? 'VICTORY' : wave.banner;
    this.hud.update({
      health: this.player.health,
      armor: this.player.armor,
      ammo: this.weapons.currentAmmo(),
      weapon: this.weapons.currentName(),
      kills: this.enemies.kills,
      wave: wave.wave,
      totalWaves: wave.totalWaves,
      remaining: wave.remaining,
      level: lvl.index,
      totalLevels: lvl.total,
      levelName: lvl.name,
      banner,
    }, dt);

    if (lvl.victory && !this.player.isDead()) {
      this.running = false;
      this.input.exitPointerLock();
      const timeAlive = (performance.now() - this.startedAt) / 1000;
      if (this.onVictory) this.onVictory(this.enemies.kills, timeAlive);
      this.renderer.render(this.scene, this.camera);
      return;
    }

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
