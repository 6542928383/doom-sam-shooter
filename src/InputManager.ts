export class InputManager {
  private canvas: HTMLCanvasElement;
  private keys = new Set<string>();
  mouseDX = 0;
  mouseDY = 0;
  pointerLocked = false;

  onPointerLockChange: ((locked: boolean) => void) | null = null;
  onFire: (() => void) | null = null;
  onSwitchWeapon: ((slot: number) => void) | null = null;

  private mouseDown = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    document.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
      if (e.code.startsWith('Digit')) {
        const n = parseInt(e.code.replace('Digit', ''), 10);
        if (!Number.isNaN(n) && this.onSwitchWeapon) this.onSwitchWeapon(n);
      }
    });
    document.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });

    document.addEventListener('mousemove', (e) => {
      if (this.pointerLocked) {
        this.mouseDX += e.movementX;
        this.mouseDY += e.movementY;
      }
    });

    document.addEventListener('mousedown', (e) => {
      if (e.button === 0 && this.pointerLocked) {
        this.mouseDown = true;
        if (this.onFire) this.onFire();
      }
    });

    document.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouseDown = false;
    });

    document.addEventListener('pointerlockchange', () => {
      this.pointerLocked = document.pointerLockElement === this.canvas;
      if (this.onPointerLockChange) this.onPointerLockChange(this.pointerLocked);
    });
  }

  isFiring(): boolean {
    return this.mouseDown && this.pointerLocked;
  }

  requestPointerLock(): void {
    this.canvas.requestPointerLock();
  }

  exitPointerLock(): void {
    document.exitPointerLock();
  }

  isDown(code: string): boolean {
    return this.keys.has(code);
  }

  consumeMouse(): { dx: number; dy: number } {
    const out = { dx: this.mouseDX, dy: this.mouseDY };
    this.mouseDX = 0;
    this.mouseDY = 0;
    return out;
  }
}
