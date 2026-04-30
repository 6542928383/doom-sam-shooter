import { Game } from './Game';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const overlay = document.getElementById('overlay') as HTMLDivElement;
const startBtn = document.getElementById('start-btn') as HTMLButtonElement;
const deathOverlay = document.getElementById('death-overlay') as HTMLDivElement;
const respawnBtn = document.getElementById('respawn-btn') as HTMLButtonElement;
const deathStats = document.getElementById('death-stats') as HTMLParagraphElement;
const victoryOverlay = document.getElementById('victory-overlay') as HTMLDivElement;
const victoryBtn = document.getElementById('victory-btn') as HTMLButtonElement;
const victoryStats = document.getElementById('victory-stats') as HTMLParagraphElement;

const game = new Game(canvas);

function start(): void {
  overlay.classList.remove('visible');
  overlay.classList.add('hidden');
  deathOverlay.classList.add('hidden');
  victoryOverlay.classList.add('hidden');
  game.start();
}

function formatRunStats(kills: number, timeAlive: number): string {
  const minutes = Math.floor(timeAlive / 60);
  const seconds = Math.floor(timeAlive % 60);
  return `Kills: ${kills}  ·  Time: ${minutes}:${seconds.toString().padStart(2, '0')}`;
}

startBtn.addEventListener('click', start);
respawnBtn.addEventListener('click', () => {
  game.reset();
  start();
});
victoryBtn.addEventListener('click', () => {
  game.reset();
  start();
});

game.onDeath = (kills: number, timeAlive: number) => {
  deathStats.textContent = formatRunStats(kills, timeAlive);
  deathOverlay.classList.remove('hidden');
};

game.onVictory = (kills: number, timeAlive: number) => {
  victoryStats.textContent = formatRunStats(kills, timeAlive);
  victoryOverlay.classList.remove('hidden');
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
