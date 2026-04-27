// WebAudio mini-synth for arcade sound effects

const STORAGE_KEY = "loopclub-muted";
let audioContext = null;
let isMuted = localStorage.getItem(STORAGE_KEY) === "true";

function getAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContext;
}

function playTone(freq, duration, type = "sine", gain = 0.15) {
  if (isMuted) return;

  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const envGain = ctx.createGain();

    osc.type = type;
    osc.frequency.value = freq;

    envGain.gain.setValueAtTime(gain, ctx.currentTime);
    envGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration / 1000);

    osc.connect(envGain);
    envGain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration / 1000);
  } catch (e) {
    // Silently fail if audio context fails
  }
}

function playArpeggio(freqs, duration) {
  if (isMuted) return;

  const stepDuration = duration / freqs.length;
  freqs.forEach((freq, i) => {
    setTimeout(() => playTone(freq, stepDuration, "square", 0.12), i * stepDuration);
  });
}

export const SFX = {
  click: () => playTone(880, 40, "square", 0.1),
  hover: () => playTone(1200, 20, "sine", 0.08),
  keyPress: () => playTone(740, 25, "triangle", 0.08),
  move: () => playTone(1040, 30, "square", 0.09),
  score: () => playArpeggio([660, 880, 1320], 270),
  scoreSmall: () => playTone(990, 80, "sine", 0.1),
  gameOver: () => {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const envGain = ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(55, ctx.currentTime + 0.7);

    envGain.gain.setValueAtTime(0.2, ctx.currentTime);
    envGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.7);

    osc.connect(envGain);
    envGain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.7);
  },
  start: () => {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const envGain = ctx.createGain();

    osc.type = "square";
    osc.frequency.setValueAtTime(220, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.2);

    envGain.gain.setValueAtTime(0.15, ctx.currentTime);
    envGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

    osc.connect(envGain);
    envGain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.2);
  },
  select: () => playTone(1760, 60, "triangle", 0.12),
  pause: () => playTone(550, 100, "sine", 0.12),
  toggle: () => playArpeggio([440, 660], 120),
  warning: () => playTone(330, 150, "square", 0.12),
  impact: () => playTone(110, 80, "sine", 0.15),
  ping: () => playTone(1320, 25, "sine", 0.08),
  success: () => playArpeggio([880, 1100, 1320], 200),
};

export function toggleMute() {
  isMuted = !isMuted;
  localStorage.setItem(STORAGE_KEY, isMuted);
  const muteButton = document.querySelector("#muteButton");
  if (muteButton) {
    muteButton.textContent = isMuted ? "🔇" : "🔊";
  }
  return isMuted;
}

export function isSoundMuted() {
  return isMuted;
}

// Initialize mute button
document.addEventListener("DOMContentLoaded", () => {
  const muteButton = document.querySelector("#muteButton");
  if (muteButton) {
    muteButton.textContent = isMuted ? "🔇" : "🔊";
    muteButton.addEventListener("click", (e) => {
      e.preventDefault();
      toggleMute();
      SFX.click();
    });
  }
});
