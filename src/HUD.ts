interface HUDState {
  health: number;
  armor: number;
  ammo: string;
  weapon: string;
  kills: number;
  wave: number;
  remaining: number;
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
  private elBanner = document.getElementById('wave-banner')!;
  private flashTimer = 0;
  private body = document.body;

  update(state: HUDState): void {
    this.elHealth.textContent = Math.max(0, Math.round(state.health)).toString();
    this.elArmor.textContent = Math.max(0, Math.round(state.armor)).toString();
    this.elAmmo.textContent = state.ammo;
    this.elWeapon.textContent = state.weapon;
    this.elKills.textContent = state.kills.toString();
    this.elWave.textContent = state.wave.toString();
    this.elRemaining.textContent = state.remaining.toString();

    if (state.banner) {
      this.elBanner.textContent = state.banner;
      this.elBanner.classList.remove('hidden');
    } else {
      this.elBanner.classList.add('hidden');
    }

    if (this.flashTimer > 0) {
      this.flashTimer -= 0.016;
      const a = Math.max(0, this.flashTimer / 0.4);
      this.body.style.boxShadow = `inset 0 0 200px rgba(214, 40, 40, ${a.toFixed(3)})`;
    } else {
      this.body.style.boxShadow = '';
    }
  }

  flashDamage(): void {
    this.flashTimer = 0.4;
  }
}
