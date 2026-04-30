import { Game } from './Game';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const overlay = document.getElementById('overlay') as HTMLDivElement;
const startBtn = document.getElementById('start-btn') as HTMLButtonElement;
const openSettingsBtn = document.getElementById('open-settings-btn') as HTMLButtonElement;
const deathOverlay = document.getElementById('death-overlay') as HTMLDivElement;
const respawnBtn = document.getElementById('respawn-btn') as HTMLButtonElement;
const deathStats = document.getElementById('death-stats') as HTMLParagraphElement;
const victoryOverlay = document.getElementById('victory-overlay') as HTMLDivElement;
const victoryBtn = document.getElementById('victory-btn') as HTMLButtonElement;
const victoryStats = document.getElementById('victory-stats') as HTMLParagraphElement;
const audioToggle = document.getElementById('audio-toggle') as HTMLButtonElement;
const pauseOverlay = document.getElementById('pause-overlay') as HTMLDivElement;
const resumeBtn = document.getElementById('resume-btn') as HTMLButtonElement;
const pauseSettingsBtn = document.getElementById('pause-settings-btn') as HTMLButtonElement;
const restartBtn = document.getElementById('restart-btn') as HTMLButtonElement;
const mainMenuBtn = document.getElementById('main-menu-btn') as HTMLButtonElement;
const settingsOverlay = document.getElementById('settings-overlay') as HTMLDivElement;
const settingsBackBtn = document.getElementById('settings-back-btn') as HTMLButtonElement;
const volumeInput = document.getElementById('settings-volume') as HTMLInputElement;
const volumeValue = document.getElementById('settings-volume-value') as HTMLSpanElement;
const sensitivityInput = document.getElementById('settings-sensitivity') as HTMLInputElement;
const sensitivityValue = document.getElementById('settings-sensitivity-value') as HTMLSpanElement;
const fovInput = document.getElementById('settings-fov') as HTMLInputElement;
const fovValue = document.getElementById('settings-fov-value') as HTMLSpanElement;
const muteInput = document.getElementById('settings-mute') as HTMLInputElement;

const game = new Game(canvas);
const audio = game.audioManager();
const settings = game.settingsStore();

type ScreenName = 'main' | 'pause' | 'settings' | 'death' | 'victory' | 'game';

/** Tracks where SETTINGS was opened from so BACK can return there. */
let settingsReturn: 'main' | 'pause' = 'main';

function show(...screens: ScreenName[]): void {
  const map: Record<ScreenName, HTMLElement | null> = {
    main: overlay,
    pause: pauseOverlay,
    settings: settingsOverlay,
    death: deathOverlay,
    victory: victoryOverlay,
    game: null,
  };
  const visible = new Set<ScreenName>(screens);
  for (const [key, el] of Object.entries(map)) {
    if (!el) continue;
    if (visible.has(key as ScreenName)) {
      el.classList.remove('hidden');
      el.classList.add('visible');
    } else {
      el.classList.add('hidden');
      el.classList.remove('visible');
    }
  }
}

function refreshAudioToggle(): void {
  if (audio.isMuted()) {
    audioToggle.textContent = 'SOUND OFF';
    audioToggle.classList.add('muted');
  } else {
    audioToggle.textContent = 'SOUND ON';
    audioToggle.classList.remove('muted');
  }
  muteInput.checked = audio.isMuted();
}

function refreshSettingsPanel(): void {
  const v = settings.get();
  volumeInput.value = audio.getVolume().toString();
  volumeValue.textContent = `${Math.round(audio.getVolume() * 100)}%`;
  sensitivityInput.value = v.sensitivity.toString();
  sensitivityValue.textContent = `${v.sensitivity.toFixed(2)}x`;
  fovInput.value = v.fov.toString();
  fovValue.textContent = `${Math.round(v.fov)}°`;
  refreshAudioToggle();
}
refreshSettingsPanel();

audioToggle.addEventListener('click', () => {
  audio.resume();
  audio.toggleMute();
  refreshAudioToggle();
});

volumeInput.addEventListener('input', () => {
  audio.resume();
  audio.setVolume(parseFloat(volumeInput.value));
  volumeValue.textContent = `${Math.round(audio.getVolume() * 100)}%`;
});
sensitivityInput.addEventListener('input', () => {
  const v = parseFloat(sensitivityInput.value);
  settings.setSensitivity(v);
  sensitivityValue.textContent = `${v.toFixed(2)}x`;
});
fovInput.addEventListener('input', () => {
  const v = parseFloat(fovInput.value);
  settings.setFov(v);
  fovValue.textContent = `${Math.round(v)}°`;
});
muteInput.addEventListener('change', () => {
  audio.setMuted(muteInput.checked);
  refreshAudioToggle();
});

function startRun(): void {
  show('game');
  game.start();
}

function formatRunStats(kills: number, timeAlive: number): string {
  const minutes = Math.floor(timeAlive / 60);
  const seconds = Math.floor(timeAlive % 60);
  return `Kills: ${kills}  ·  Time: ${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function openSettings(from: 'main' | 'pause'): void {
  settingsReturn = from;
  refreshSettingsPanel();
  show('settings');
}

function closeSettings(): void {
  show(settingsReturn);
}

function showMainMenu(): void {
  game.reset();
  show('main');
}

startBtn.addEventListener('click', startRun);
openSettingsBtn.addEventListener('click', () => openSettings('main'));
pauseSettingsBtn.addEventListener('click', () => openSettings('pause'));
settingsBackBtn.addEventListener('click', closeSettings);

resumeBtn.addEventListener('click', startRun);
restartBtn.addEventListener('click', () => {
  game.reset();
  startRun();
});
mainMenuBtn.addEventListener('click', showMainMenu);

respawnBtn.addEventListener('click', () => {
  game.reset();
  startRun();
});
victoryBtn.addEventListener('click', () => {
  game.reset();
  startRun();
});

window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyM' && !e.repeat) {
    audio.toggleMute();
    refreshAudioToggle();
  }
});

game.onDeath = (kills: number, timeAlive: number) => {
  deathStats.textContent = formatRunStats(kills, timeAlive);
  show('death');
};

game.onVictory = (kills: number, timeAlive: number) => {
  victoryStats.textContent = formatRunStats(kills, timeAlive);
  show('victory');
};

game.onPointerLockExit = () => {
  // Mid-run Esc → pause menu. Death/victory paths show their own overlays
  // before pointer-lock is released, so don't override them.
  if (game.isPlayerDead()) return;
  if (!victoryOverlay.classList.contains('hidden')) return;
  show('pause');
};

window.addEventListener('resize', () => game.resize());
game.resize();
game.renderIdle();
