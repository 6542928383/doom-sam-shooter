export enum PickupKind {
  Health = 'health',
  Armor = 'armor',
  Bullets = 'bullets',
  Shells = 'shells',
  Rockets = 'rockets',
  Cells = 'cells',
}

export interface PickupSpec {
  kind: PickupKind;
  x: number;
  z: number;
  /** Optional override for the default amount. */
  amount?: number;
}

export interface PickupVisual {
  color: number;
  emissive: number;
}

export const PICKUP_VISUALS: Record<PickupKind, PickupVisual> = {
  [PickupKind.Health]: { color: 0x33ff66, emissive: 0x114422 },
  [PickupKind.Armor]: { color: 0x66aaff, emissive: 0x113366 },
  [PickupKind.Bullets]: { color: 0xffd17a, emissive: 0x553311 },
  [PickupKind.Shells]: { color: 0xff8a3a, emissive: 0x442211 },
  [PickupKind.Rockets]: { color: 0xff5544, emissive: 0x441111 },
  [PickupKind.Cells]: { color: 0x9ad3ff, emissive: 0x113366 },
};

export const PICKUP_AMOUNTS: Record<PickupKind, number> = {
  [PickupKind.Health]: 25,
  [PickupKind.Armor]: 25,
  [PickupKind.Bullets]: 40,
  [PickupKind.Shells]: 8,
  [PickupKind.Rockets]: 4,
  [PickupKind.Cells]: 30,
};
