import { AmmoType } from './types';

export class Inventory {
  private ammo = new Map<AmmoType, number>();
  private max = new Map<AmmoType, number>();

  constructor() {
    this.max.set(AmmoType.Bullets, 200);
    this.max.set(AmmoType.Shells, 50);
    this.max.set(AmmoType.Rockets, 30);
    this.max.set(AmmoType.Cells, 200);

    // Starting loadout — generous so the game is fun out of the gate.
    this.ammo.set(AmmoType.Bullets, 60);
    this.ammo.set(AmmoType.Shells, 16);
    this.ammo.set(AmmoType.Rockets, 6);
    this.ammo.set(AmmoType.Cells, 60);
  }

  reset(): void {
    this.ammo.set(AmmoType.Bullets, 60);
    this.ammo.set(AmmoType.Shells, 16);
    this.ammo.set(AmmoType.Rockets, 6);
    this.ammo.set(AmmoType.Cells, 60);
  }

  get(type: AmmoType): number {
    if (type === AmmoType.Infinite) return Number.POSITIVE_INFINITY;
    return this.ammo.get(type) ?? 0;
  }

  has(type: AmmoType, amount: number): boolean {
    if (type === AmmoType.Infinite) return true;
    return (this.ammo.get(type) ?? 0) >= amount;
  }

  consume(type: AmmoType, amount: number): boolean {
    if (type === AmmoType.Infinite) return true;
    const current = this.ammo.get(type) ?? 0;
    if (current < amount) return false;
    this.ammo.set(type, current - amount);
    return true;
  }

  /** Returns true if any ammo was actually added (false when already at cap). */
  add(type: AmmoType, amount: number): boolean {
    if (type === AmmoType.Infinite) return false;
    const cap = this.max.get(type) ?? amount;
    const current = this.ammo.get(type) ?? 0;
    if (current >= cap) return false;
    this.ammo.set(type, Math.min(cap, current + amount));
    return true;
  }

  display(type: AmmoType): string {
    if (type === AmmoType.Infinite) return '∞';
    return (this.ammo.get(type) ?? 0).toString();
  }
}
