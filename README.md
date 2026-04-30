# DOOM · SAM — Hybrid FPS

A first-person shooter that fuses the **fast, weapon-rich combat of classic DOOM** with the **wide-open arenas and relentless hordes of Serious Sam**. Built with TypeScript + [three.js](https://threejs.org/) and runs in any modern browser — no install, no plugins.

> Status: early. PR #1 ships the playable foundation. Each subsequent PR adds a major slice (arsenal, enemy variety, levels, sound, menu, polish).

## Quick start

```bash
npm install
npm run dev
```

Open the URL printed by Vite (default: <http://localhost:5173>), click **CLICK TO PLAY**, and your mouse will be captured. Press <kbd>Esc</kbd> to release the pointer.

## Build for production

```bash
npm run build
npm run preview
```

The `dist/` directory contains a fully static bundle that can be served from any CDN (GitHub Pages, Netlify, etc.).

## Controls

| Action          | Key                    |
| --------------- | ---------------------- |
| Move            | <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> |
| Aim             | Mouse                  |
| Fire            | Left mouse button      |
| Sprint          | <kbd>Shift</kbd>       |
| Jump            | <kbd>Space</kbd>       |
| Switch weapon   | <kbd>1</kbd>–<kbd>9</kbd> (PR #2) |
| Release pointer | <kbd>Esc</kbd>         |

## Roadmap

- [x] **PR #1 — Foundation:** FPS controller, pointer-lock, hitscan pistol, single arena, basic horde, HUD, death/respawn flow.
- [ ] **PR #2 — Arsenal:** shotgun, chaingun, rocket launcher, minigun, BFG-style heavy, slot switching, weapon-pickups.
- [ ] **PR #3 — Bestiary:** ranged imps, kamikaze rushers, heavy bulls, flying skulls, scripted spawn waves.
- [ ] **PR #4 — Levels:** 3+ hand-built levels with corridor/arena flow, level-end portals.
- [ ] **PR #5 — Pickups & damage model:** medkits, armor shards, ammo crates, secret areas.
- [ ] **PR #6 — Audio:** Web Audio SFX (hits, weapons, enemy growls), looping metal soundtrack.
- [ ] **PR #7 — Menu & flow:** main menu, pause, settings (sensitivity, fullscreen), win/lose screens.
- [ ] **PR #8 — Polish:** balance pass, boss encounters, additional arenas.

## Architecture

```
src/
├── main.ts            # Entry point: wires DOM overlays to the Game instance
├── Game.ts            # Orchestrates renderer, scene, sub-systems, main loop
├── Player.ts          # FPS movement, look, jump, damage handling
├── InputManager.ts    # Pointer-lock, keyboard, mouse, weapon-slot keys
├── Level.ts           # Arena geometry, lighting, AABB obstacles, spawn points
├── Enemy.ts           # Single enemy: AI, animation, collision, raycast hitbox
├── EnemyManager.ts    # Maintains a target population, tracks kills
├── WeaponSystem.ts    # Hitscan firing, viewmodel, muzzle flash, recoil
├── HUD.ts             # DOM-based heads-up display (cheap, accessible)
└── style.css          # Overlay/HUD styling
```

Collision is intentionally cheap: axis-aligned bounding boxes for static geometry and a sphere approximation for enemy hitboxes. This keeps headroom for big crowds and lets us scale up enemy counts in later PRs.

## License

MIT — see `LICENSE`.
