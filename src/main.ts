import { Game } from './Game';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const overlay = document.getElementById('overlay') as HTMLDivElement;
const startBtn = document.getElementById('start-btn') as HTMLButtonElement;
const deathOverlay = document.getElementById('death-overlay') as HTMLDivElement;
const respawnBtn = document.getElementById('respawn-btn') as HTMLButtonElement;
const deathStats = document.getElementById('death-stats') as HTMLParagraphElement;

const game = new Game(canvas);

function start(): void {
  overlay.classList.remove('visible');
  overlay.classList.add('hidden');
  deathOverlay.classList.add('hidden');
  game.start();
}

startBtn.addEventListener('click', start);
respawnBtn.addEventListener('click', () => {
  game.reset();
  start();
});

game.onDeath = (kills: number, timeAlive: number) => {
  const minutes = Math.floor(timeAlive / 60);
  const seconds = Math.floor(timeAlive % 60);
  deathStats.textContent = `Kills: ${kills}  ·  Time: ${minutes}:${seconds.toString().padStart(2, '0')}`;
  deathOverlay.classList.remove('hidden');
};

game.onPointerLockExit = () => {
  if (!game.isPlayerDead()) {
    overlay.classList.remove('hidden');
    overlay.classList.add('visible');
  }
};

window.addEventListener('resize', () => game.resize());
game.resize();
game.renderIdle();
