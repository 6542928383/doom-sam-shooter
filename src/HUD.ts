interface HUDState {
  health: number;
  armor: number;
  ammo: string;
  weapon: string;
  kills: number;
  wave: number;
  totalWaves: number;
  remaining: number;
  level: number;
  totalLevels: number;
  levelName: string;
  banner: string | null;
}

export class HUD {
  private elHealth = document.getElementById('hud-health-value')!;
  private elArmor = document.getElementById('hud-armor-value')!;
  private elAmmo = document.getElementById('hud-ammo-value')!;
  private elWeapon = document.getElementById('hud-weapon-value')!;
  private elKills = document.getElementById('hud-kills-value')!;
  private elWave = document.getElementById('hud-wave-value')!;
  private elRemaining = document.getElementById('hud-remaining-value')!;
  private elLevel = document.getElementById('hud-level-value')!;
  private elBanner = document.getElementById('wave-banner')!;
  private flashTimer = 0;
  private body = document.body;

  update(state: HUDState, dt: number): void {
    this.elHealth.textContent = Math.max(0, Math.round(state.health)).toString();
    this.elArmor.textContent = Math.max(0, Math.round(state.armor)).toString();
    this.elAmmo.textContent = state.ammo;
    this.elWeapon.textContent = state.weapon;
    this.elKills.textContent = state.kills.toString();
    this.elWave.textContent = `${state.wave}/${state.totalWaves}`;
    this.elRemaining.textContent = state.remaining.toString();
    this.elLevel.textContent = `${state.level}/${state.totalLevels}`;

    if (state.banner) {
      this.elBanner.textContent = state.banner;
      this.elBanner.classList.remove('hidden');
    } else {
      this.elBanner.classList.add('hidden');
    }

    if (this.flashTimer > 0) {
      this.flashTimer = Math.max(0, this.flashTimer - dt);
      const a = this.flashTimer / 0.4;
      this.body.style.boxShadow = `inset 0 0 200px rgba(214, 40, 40, ${a.toFixed(3)})`;
    } else {
      this.body.style.boxShadow = '';
    }
  }

  flashDamage(): void {
    this.flashTimer = 0.4;
  }
}
