import { advanceState, createInitialState, queueDirection, DIRECTION_VECTORS } from "./snake-logic.js";
import { SFX, toggleMute } from "./sfx.js";
import { shake, burst } from "./juice.js";

const LEGACY_SCORE_KEY = "ultra-arcade-scores-v1";
const HISCORE_KEY = "loopclub-hiscores-v1";
const CREDITS_KEY = "loopclub-credits-v1";
const CONTROL_KEY_TO_DIRECTION = {
  ArrowUp: "up",
  ArrowRight: "right",
  ArrowDown: "down",
  ArrowLeft: "left",
  w: "up",
  d: "right",
  s: "down",
  a: "left",
  W: "up",
  D: "right",
  S: "down",
  A: "left"
};

const MEMORY_KEY_TO_INDEX = {
  "1": 0,
  "2": 1,
  "3": 2,
  "4": 3,
  "5": 4,
  "6": 5,
  "7": 6,
  "8": 7,
  "9": 8
};

const canvas = document.querySelector("#gameCanvas");
const gamePicker = document.querySelector("#gamePicker");
const modePicker = document.querySelector("#modePicker");
const pauseButton = document.querySelector("#pauseButton");
const fullscreenButton = document.querySelector("#fullscreenButton");
const restartButton = document.querySelector("#restartButton");
const scoreLabel = document.querySelector("#scoreLabel");
const scoreValue = document.querySelector("#scoreValue");
const bestValue = document.querySelector("#bestValue");
const bestInitials = document.querySelector("#bestInitials");
const modeValue = document.querySelector("#modeValue");
const metaLabel = document.querySelector("#metaLabel");
const metaValue = document.querySelector("#metaValue");
const statusText = document.querySelector("#statusText");
const gameTag = document.querySelector("#gameTag");
const gameTitle = document.querySelector("#gameTitle");
const gameSubtitle = document.querySelector("#gameSubtitle");
const controlHint = document.querySelector("#controlHint");
const gameNote = document.querySelector("#gameNote");
const controlDeck = document.querySelector("#controlDeck");
const controlButtons = Array.from(document.querySelectorAll("[data-control]"));
const stageElement = document.querySelector(".stage");
const creditsValue = document.querySelector("#creditsValue");
const marqueeElement = document.querySelector(".crt-marquee");
const crtScreen = document.querySelector(".crt-screen");
const initialsModal = document.querySelector("#initialsModal");
const initialsScore = document.querySelector("#initialsScore");
const initialsSlots = Array.from(document.querySelectorAll("#initialsModal .slot"));

const context = canvas.getContext("2d");
const viewport = { width: 720, height: 720 };
const hiscores = loadHiscores();
let credits = loadCredits();

const gameDefinitions = [
  {
    id: "snake",
    accent: "#46f06e",
    kicker: "Grid Runner",
    title: "Snake",
    summary: "Eat. Grow. Don't clip your own tail.",
    icon: '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3" y="2" width="10" height="2"/><rect x="3" y="4" width="2" height="3"/><rect x="3" y="7" width="10" height="2"/><rect x="11" y="9" width="2" height="3"/><rect x="3" y="12" width="10" height="2"/></svg>',
    modes: [
      { id: "classic", label: "Classic", summary: "Solid walls, steady pace. The original board rules." },
      { id: "wrap", label: "Wrap", summary: "Edges are tunnels — exit one side, enter the other." },
      { id: "rush", label: "Rush", summary: "Every meal speeds the clock. It gets vicious." }
    ],
    create: createSnakeGame
  },
  {
    id: "dodge",
    accent: "#ff6a3d",
    kicker: "Lane Survival",
    title: "Meteor",
    summary: "Slide through falling rock and hold your line.",
    icon: '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3" y="2" width="2" height="2"/><rect x="9" y="1" width="2" height="2"/><rect x="12" y="5" width="2" height="2"/><rect x="6" y="6" width="2" height="2"/><rect x="7" y="10" width="2" height="3"/><rect x="5" y="13" width="6" height="2"/></svg>',
    modes: [
      { id: "cruise", label: "Cruise", summary: "Measured pacing with room to read the lanes." },
      { id: "storm", label: "Storm", summary: "Denser waves, faster impact windows." }
    ],
    create: createDodgeGame
  },
  {
    id: "memory",
    accent: "#c08bff",
    kicker: "Pattern Recall",
    title: "Pulse",
    summary: "Watch the flash. Play it back. No mistakes.",
    icon: '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="1" y="1" width="4" height="4"/><rect x="11" y="1" width="4" height="4"/><rect x="6" y="6" width="4" height="4"/><rect x="1" y="11" width="4" height="4"/><rect x="11" y="11" width="4" height="4"/></svg>',
    modes: [
      { id: "focus", label: "Focus", summary: "Calmer rhythm and longer reveal windows." },
      { id: "rush", label: "Rush", summary: "Sharp reveal windows for high-speed recall." }
    ],
    create: createMemoryGame
  },
  {
    id: "blackout",
    accent: "#e9e9ee",
    kicker: "Black Cabinet",
    title: "Blackout",
    summary: "One ball, one paddle, no color. Keep the rally.",
    icon: '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="2" y="2" width="4" height="2"/><rect x="7" y="2" width="4" height="2"/><rect x="12" y="2" width="2" height="2"/><rect x="7" y="8" width="2" height="2"/><rect x="4" y="13" width="8" height="2"/></svg>',
    modes: [
      { id: "night", label: "Night", summary: "Wider paddle, balanced speed, clean monochrome pacing." },
      { id: "hardcut", label: "Hard Cut", summary: "Faster rebounds, tighter paddle, no room for error." }
    ],
    create: createBlackoutGame
  },
  {
    id: "cipher",
    accent: "#7dd3fc",
    kicker: "Dark Grid",
    title: "Cipher",
    summary: "Grab the nodes. Outrun the hunters.",
    icon: '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="7" y="2" width="2" height="2"/><rect x="5" y="4" width="6" height="2"/><rect x="3" y="6" width="10" height="3"/><rect x="5" y="9" width="6" height="2"/><rect x="7" y="11" width="2" height="2"/></svg>',
    modes: [
      { id: "trace", label: "Trace", summary: "One hunter to open, with a measured ramp." },
      { id: "panic", label: "Panic", summary: "Two hunters from the start, climbing fast." }
    ],
    create: createCipherGame
  },
  {
    id: "flappy",
    accent: "#ffd23f",
    kicker: "Tap & Fly",
    title: "Flappy",
    summary: "One button. Gravity is the enemy.",
    icon: '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="5" y="5" width="6" height="5"/><rect x="3" y="7" width="2" height="2"/><rect x="11" y="7" width="3" height="2"/><rect x="7" y="3" width="3" height="2"/><rect x="8" y="6" width="2" height="1"/></svg>',
    modes: [
      { id: "easy", label: "Easy", summary: "Wider gaps, slower scroll. Learn the rhythm." },
      { id: "hard", label: "Hard", summary: "Tight gaps, fast pipes. One mistake ends it." }
    ],
    create: createFlappyGame
  },
  {
    id: "pong",
    accent: "#ff4f9a",
    kicker: "Paddle Duel",
    title: "Pong",
    summary: "First to eleven against the machine.",
    icon: '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="1" y="5" width="2" height="6"/><rect x="13" y="5" width="2" height="6"/><rect x="7" y="7" width="2" height="2"/><rect x="7" y="1" width="1" height="2"/><rect x="7" y="13" width="1" height="2"/></svg>',
    modes: [
      { id: "normal", label: "Normal", summary: "A fair opponent at standard court speed." },
      { id: "hardcore", label: "Hardcore", summary: "Sharper tracking, faster rallies." }
    ],
    create: createPongGame
  },
  {
    id: "platformer",
    accent: "#a6ff3d",
    kicker: "Path Jumper",
    title: "Ascent",
    summary: "Climb the platforms. Don't look down.",
    icon: '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="1" y="12" width="5" height="2"/><rect x="6" y="8" width="5" height="2"/><rect x="11" y="4" width="4" height="2"/><rect x="12" y="1" width="2" height="2"/></svg>',
    modes: [
      { id: "sprint", label: "Sprint", summary: "Sixty seconds on the clock. Climb fast." },
      { id: "survival", label: "Survival", summary: "No clock. Just don't fall." }
    ],
    create: createPlatformerGame
  }
];

let activeGameId = "snake";
let activeModeId = "classic";
let activeGame = null;
let lastFrameTime = performance.now();
let lastStatus = null;
let runStartBest = 0;
let initialsOpen = false;
let initialsChars = [];

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function randomInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function loadHiscores() {
  let store = {};

  try {
    const raw = window.localStorage.getItem(HISCORE_KEY);
    store = raw ? JSON.parse(raw) : {};
  } catch {
    store = {};
  }

  // Fold legacy plain-number scores into the new {score, initials} shape.
  try {
    const legacy = JSON.parse(window.localStorage.getItem(LEGACY_SCORE_KEY) ?? "{}");

    for (const [key, score] of Object.entries(legacy)) {
      if (typeof score === "number" && score > (store[key]?.score ?? 0)) {
        store[key] = { score, initials: store[key]?.initials ?? "---" };
      }
    }
  } catch {
    // Legacy data unreadable; start clean.
  }

  return store;
}

function saveHiscores() {
  try {
    window.localStorage.setItem(HISCORE_KEY, JSON.stringify(hiscores));
  } catch {
    // Ignore storage failures and keep the arcade playable.
  }
}

function loadCredits() {
  try {
    return Math.max(0, Number(window.localStorage.getItem(CREDITS_KEY)) || 0);
  } catch {
    return 0;
  }
}

function saveCredits() {
  try {
    window.localStorage.setItem(CREDITS_KEY, String(credits));
  } catch {
    // Ignore storage failures.
  }
}

function getDefinition(gameId = activeGameId) {
  return gameDefinitions.find((definition) => definition.id === gameId) ?? gameDefinitions[0];
}

function getMode(definition, modeId = activeModeId) {
  return definition.modes.find((mode) => mode.id === modeId) ?? definition.modes[0];
}

function getScoreKey(gameId, modeId) {
  return `${gameId}:${modeId}`;
}

function getBestEntry(gameId, modeId) {
  return hiscores[getScoreKey(gameId, modeId)] ?? { score: 0, initials: "---" };
}

function syncBest(gameId, modeId, score) {
  const key = getScoreKey(gameId, modeId);
  const entry = hiscores[key] ?? (hiscores[key] = { score: 0, initials: "---" });

  if (score > entry.score) {
    entry.score = score;
    saveHiscores();
  }

  return entry;
}

function formatScore(value, digits = 6) {
  return String(Math.max(0, Math.floor(value))).padStart(digits, "0");
}

function updateCreditsReadout() {
  creditsValue.textContent = formatScore(credits, 2);
}

function renderInitialsSlots() {
  initialsSlots.forEach((slot, index) => {
    slot.textContent = initialsChars[index] ?? "";
    slot.classList.toggle("is-current", initialsOpen && index === Math.min(initialsChars.length, 2));
  });
}

function openInitials(score) {
  initialsOpen = true;
  initialsChars = [];
  initialsScore.textContent = formatScore(score);
  initialsModal.classList.remove("hidden");
  renderInitialsSlots();
  SFX.success();
}

function closeInitials(save) {
  if (!initialsOpen) {
    return;
  }

  if (save && initialsChars.length > 0) {
    const key = getScoreKey(activeGameId, activeModeId);
    const entry = hiscores[key] ?? (hiscores[key] = { score: 0, initials: "---" });
    entry.initials = initialsChars.join("").padEnd(3, "-");
    saveHiscores();
  }

  initialsOpen = false;
  initialsChars = [];
  initialsModal.classList.add("hidden");
  renderGamePicker();
}

function handleInitialsKey(event) {
  if (/^[a-zA-Z0-9]$/.test(event.key) && initialsChars.length < 3) {
    initialsChars.push(event.key.toUpperCase());
    SFX.keyPress();
  } else if (event.key === "Backspace") {
    initialsChars.pop();
    SFX.click();
  } else if (event.key === "Enter" && initialsChars.length > 0) {
    SFX.score();
    closeInitials(true);
    return;
  } else if (event.key === "Escape") {
    closeInitials(false);
    return;
  }

  renderInitialsSlots();
}

function drawRoundedRectPath(ctx, x, y, width, height, radius) {
  const corner = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + corner, y);
  ctx.arcTo(x + width, y, x + width, y + height, corner);
  ctx.arcTo(x + width, y + height, x, y + height, corner);
  ctx.arcTo(x, y + height, x, y, corner);
  ctx.arcTo(x, y, x + width, y, corner);
  ctx.closePath();
}

function fillRoundedRect(ctx, x, y, width, height, radius, fillStyle) {
  drawRoundedRectPath(ctx, x, y, width, height, radius);
  ctx.fillStyle = fillStyle;
  ctx.fill();
}

function strokeRoundedRect(ctx, x, y, width, height, radius, strokeStyle, lineWidth = 1) {
  drawRoundedRectPath(ctx, x, y, width, height, radius);
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = strokeStyle;
  ctx.stroke();
}

function drawStageBackdrop(ctx, colors = {}) {
  const accent = colors.accentColor || colors.accent || getDefinition().accent;

  ctx.clearRect(0, 0, viewport.width, viewport.height);
  ctx.fillStyle = "#050507";
  ctx.fillRect(0, 0, viewport.width, viewport.height);

  // Faint dot matrix instead of grid lines — quieter texture.
  ctx.fillStyle = "rgba(255, 255, 255, 0.045)";
  const dotGap = 36;
  for (let x = dotGap; x < viewport.width; x += dotGap) {
    for (let y = dotGap; y < viewport.height; y += dotGap) {
      ctx.fillRect(x, y, 1.5, 1.5);
    }
  }

  // Vignette.
  const vignette = ctx.createRadialGradient(
    viewport.width / 2, viewport.height / 2, viewport.height * 0.34,
    viewport.width / 2, viewport.height / 2, viewport.height * 0.74
  );
  vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
  vignette.addColorStop(1, "rgba(0, 0, 0, 0.5)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, viewport.width, viewport.height);

  // Accent corner ticks.
  const inset = 18;
  const tick = 14;
  ctx.strokeStyle = accent;
  ctx.globalAlpha = 0.65;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  // top-left
  ctx.moveTo(inset, inset + tick); ctx.lineTo(inset, inset); ctx.lineTo(inset + tick, inset);
  // top-right
  ctx.moveTo(viewport.width - inset - tick, inset); ctx.lineTo(viewport.width - inset, inset); ctx.lineTo(viewport.width - inset, inset + tick);
  // bottom-right
  ctx.moveTo(viewport.width - inset, viewport.height - inset - tick); ctx.lineTo(viewport.width - inset, viewport.height - inset); ctx.lineTo(viewport.width - inset - tick, viewport.height - inset);
  // bottom-left
  ctx.moveTo(inset + tick, viewport.height - inset); ctx.lineTo(inset, viewport.height - inset); ctx.lineTo(inset, viewport.height - inset - tick);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function getGridMetrics(columns, rows, padding = 82) {
  const availableWidth = viewport.width - padding * 2;
  const availableHeight = viewport.height - padding * 2;
  const cellSize = Math.max(16, Math.floor(Math.min(availableWidth / columns, availableHeight / rows)));
  const width = cellSize * columns;
  const height = cellSize * rows;

  return {
    cellSize,
    columns,
    height,
    rows,
    width,
    x: Math.floor((viewport.width - width) / 2),
    y: Math.floor((viewport.height - height) / 2)
  };
}

function drawOverlayCard(ctx, title, subtitle, accent) {
  // Dim the whole stage behind the card.
  ctx.fillStyle = "rgba(3, 3, 5, 0.6)";
  ctx.fillRect(0, 0, viewport.width, viewport.height);

  const width = Math.min(400, viewport.width - 72);
  const height = 138;
  const x = Math.floor((viewport.width - width) / 2);
  const y = Math.floor((viewport.height - height) / 2);

  ctx.fillStyle = "rgba(7, 7, 9, 0.96)";
  ctx.fillRect(x, y, width, height);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);

  // Corner ticks on the card.
  const tick = 8;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - 3, y + tick); ctx.lineTo(x - 3, y - 3); ctx.lineTo(x + tick, y - 3);
  ctx.moveTo(x + width - tick, y - 3); ctx.lineTo(x + width + 3, y - 3); ctx.lineTo(x + width + 3, y + tick);
  ctx.moveTo(x + width + 3, y + height - tick); ctx.lineTo(x + width + 3, y + height + 3); ctx.lineTo(x + width - tick, y + height + 3);
  ctx.moveTo(x + tick, y + height + 3); ctx.lineTo(x - 3, y + height + 3); ctx.lineTo(x - 3, y + height - tick);
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.fillStyle = accent;
  ctx.font = '24px "Silkscreen", "JetBrains Mono", monospace';
  ctx.fillText(title.toUpperCase(), x + width / 2, y + 60);

  // Blinking prompt line, arcade attract style.
  const blink = Math.floor(performance.now() / 530) % 2 === 0;
  ctx.fillStyle = blink ? "rgba(233, 231, 224, 0.9)" : "rgba(233, 231, 224, 0.3)";
  ctx.font = '500 12px "JetBrains Mono", monospace';
  ctx.fillText(subtitle.toUpperCase(), x + width / 2, y + 96);
  ctx.textAlign = "left";
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const pixelRatio = window.devicePixelRatio || 1;

  viewport.width = Math.max(320, Math.round(rect.width));
  viewport.height = Math.max(320, Math.round(rect.height));

  canvas.width = Math.round(viewport.width * pixelRatio);
  canvas.height = Math.round(viewport.height * pixelRatio);
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
}

function renderGamePicker() {
  gamePicker.innerHTML = "";

  for (const definition of gameDefinitions) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "cab";
    button.style.setProperty("--card-acc", definition.accent);

    if (definition.id === activeGameId) {
      button.classList.add("is-active");
    }

    const bestScore = Math.max(...definition.modes.map((mode) => getBestEntry(definition.id, mode.id).score), 0);
    button.innerHTML = `${definition.icon}<strong>${definition.title}</strong><span class="cab-hi">HI ${formatScore(bestScore)}</span>`;
    button.title = definition.summary;
    button.addEventListener("click", () => {
      if (definition.id !== activeGameId) {
        switchGame(definition.id);
      }
    });

    gamePicker.append(button);
  }
}

function renderModePicker() {
  const definition = getDefinition();
  modePicker.innerHTML = "";

  for (const mode of definition.modes) {
    const button = document.createElement("button");
    button.type = "button";

    if (mode.id === activeModeId) {
      button.classList.add("is-active");
    }

    button.textContent = mode.label;
    button.title = mode.summary;
    button.addEventListener("click", () => {
      if (mode.id !== activeModeId) {
        switchMode(mode.id);
      }
    });

    modePicker.append(button);
  }
}

function renderHud() {
  if (!activeGame) {
    return null;
  }

  const definition = getDefinition();
  const mode = getMode(definition);
  const meta = activeGame.getMeta();
  const best = syncBest(activeGameId, activeModeId, meta.score);

  gameTag.textContent = definition.kicker;
  gameTitle.textContent = definition.title;
  gameSubtitle.textContent = definition.summary;

  scoreLabel.textContent = meta.scoreLabel;
  scoreValue.textContent = formatScore(meta.score);
  bestValue.textContent = formatScore(best.score);
  bestInitials.textContent = best.initials;
  modeValue.textContent = mode.label;
  metaLabel.textContent = meta.metricLabel;
  metaValue.textContent = meta.metricValue;
  statusText.textContent = meta.statusText;
  controlHint.textContent = meta.controlHint;
  gameNote.textContent = meta.noteText;
  pauseButton.textContent = meta.isPaused ? "Resume" : "Pause";
  pauseButton.disabled = !meta.canPause;

  controlDeck.classList.toggle("is-hidden", Boolean(meta.controlPadHidden));

  for (const button of controlButtons) {
    const control = meta.controls?.[button.dataset.control] ?? { enabled: false, label: button.textContent };
    button.textContent = control.label;
    button.disabled = !control.enabled;
  }

  return meta;
}

function applyAccent(definition) {
  document.documentElement.style.setProperty("--acc", definition.accent);
  document.body.dataset.game = definition.id;
}

function playBootAnimation() {
  if (!crtScreen) {
    return;
  }

  crtScreen.classList.remove("is-booting");
  void crtScreen.offsetWidth;
  crtScreen.classList.add("is-booting");
}

function switchGame(gameId) {
  closeInitials(initialsChars.length > 0);

  const definition = getDefinition(gameId);
  const mode = definition.modes[0];

  activeGameId = definition.id;
  activeModeId = mode.id;
  activeGame = definition.create(mode);
  lastFrameTime = performance.now();
  lastStatus = null;
  applyAccent(definition);
  playBootAnimation();
  renderGamePicker();
  renderModePicker();
  renderHud();
  SFX.select();
}

function switchMode(modeId) {
  closeInitials(initialsChars.length > 0);

  const definition = getDefinition();
  const mode = getMode(definition, modeId);

  activeModeId = mode.id;
  activeGame = definition.create(mode);
  lastFrameTime = performance.now();
  lastStatus = null;
  renderModePicker();
  renderHud();
  SFX.click();
}

function handleButtonAction(action) {
  if (!activeGame) {
    return;
  }

  if (action === "pause") {
    activeGame.togglePause();
    SFX.pause();
  } else if (action === "restart") {
    activeGame.restart();
    SFX.start();
  } else {
    activeGame.action(action);
    SFX.click();
  }

  renderHud();
}

function isStageFullscreen() {
  return document.fullscreenElement === stageElement;
}

function updateFullscreenButton() {
  if (!fullscreenButton) {
    return;
  }

  fullscreenButton.textContent = isStageFullscreen() ? "EXIT" : "FULL";
}

async function toggleFullscreen() {
  if (!stageElement || !document.fullscreenEnabled) {
    return;
  }

  try {
    if (isStageFullscreen()) {
      await document.exitFullscreen();
    } else {
      await stageElement.requestFullscreen();
    }
  } catch {
    // Ignore fullscreen failures and leave the stage usable.
  }
}

function frame(now) {
  const deltaMs = Math.min(48, now - lastFrameTime);
  lastFrameTime = now;

  if (activeGame) {
    if (!initialsOpen) {
      activeGame.update(deltaMs, now / 1000);
    }

    activeGame.render(context, now / 1000);
    const meta = renderHud();

    if (meta && meta.status !== lastStatus) {
      handleStatusChange(lastStatus, meta);
      lastStatus = meta.status;
    }
  }

  window.requestAnimationFrame(frame);
}

function handleStatusChange(previousStatus, meta) {
  marqueeElement.classList.toggle("is-ready", meta.status === "ready");

  // A fresh run started: burn a credit, remember the score to beat.
  if (meta.status === "running" && ["ready", "game-over", "won"].includes(previousStatus)) {
    credits += 1;
    saveCredits();
    updateCreditsReadout();
    runStartBest = getBestEntry(activeGameId, activeModeId).score;
  }

  // A run ended: refresh cabinet hi-scores, prompt for initials on a new record.
  if ((meta.status === "game-over" || meta.status === "won") && previousStatus === "running") {
    renderGamePicker();

    if (meta.score > 0 && meta.score > runStartBest) {
      openInitials(meta.score);
    }
  }
}

function createSnakeGame(mode) {
  const config = {
    classic: {
      accent: "#46f06e",
      accentColor: "#46f06e",
      bodyColor: "#46f06e",
      foodColor: "#ffd23f",
      gridSize: 18,
      minTickMs: 140,
      tickMs: 140,
      wrap: false
    },
    wrap: {
      accent: "#3ae8c2",
      accentColor: "#3ae8c2",
      bodyColor: "#3ae8c2",
      foodColor: "#ff6a3d",
      gridSize: 18,
      minTickMs: 124,
      tickMs: 124,
      wrap: true
    },
    rush: {
      accent: "#ffd23f",
      accentColor: "#ffd23f",
      bodyColor: "#ffd23f",
      foodColor: "#ff4f9a",
      gridSize: 18,
      minTickMs: 72,
      speedGain: 4,
      tickMs: 112,
      wrap: false
    }
  }[mode.id];

  function createRunState(status = "ready") {
    return {
      ...createInitialState({ gridSize: config.gridSize }),
      status
    };
  }

  let state = createRunState();
  let accumulator = 0;
  let tickMs = config.tickMs;

  function restart() {
    state = createRunState();
    accumulator = 0;
    tickMs = config.tickMs;
  }

  function launch() {
    if (state.status === "ready") {
      state = { ...state, status: "running" };
      SFX.start();
      return true;
    }

    if (state.status === "game-over" || state.status === "won") {
      state = createRunState("running");
      accumulator = 0;
      tickMs = config.tickMs;
      SFX.start();
      return true;
    }

    return false;
  }

  function togglePause() {
    if (state.status === "running") {
      state = { ...state, status: "paused" };
      SFX.pause();
      return true;
    }

    if (state.status === "paused") {
      state = { ...state, status: "running" };
      SFX.start();
      return true;
    }

    return false;
  }

  function update(deltaMs) {
    if (state.status !== "running") {
      return;
    }

    accumulator += deltaMs;

    while (accumulator >= tickMs) {
      accumulator -= tickMs;
      const previousScore = state.score;
      state = advanceState(state, { wrap: config.wrap });

      if (state.score > previousScore) {
        SFX.score();
        const scoreCell = document.querySelector(".hud-cell");
        if (scoreCell) {
          shake(scoreCell, 140);
          burst(scoreCell);
        }
      }

      if (config.speedGain && state.score > previousScore) {
        tickMs = Math.max(config.minTickMs, tickMs - config.speedGain);
      }

      if (state.status === "game-over") {
        SFX.gameOver();
        shake(stageElement, 200);
      } else if (state.status === "won") {
        SFX.score();
      }

      if (state.status !== "running") {
        break;
      }
    }
  }

  function keydown(event) {
    const direction = CONTROL_KEY_TO_DIRECTION[event.key];

    if (direction) {
      SFX.keyPress();
      state = queueDirection(state, direction);
      return true;
    }

    if (event.code === "Space") {
      if (state.status === "ready" || state.status === "game-over" || state.status === "won") {
        return launch();
      }

      return togglePause();
    }

    if (event.key === "Enter" && (state.status === "ready" || state.status === "game-over" || state.status === "won")) {
      return launch();
    }

    return false;
  }

  function render(ctx, time) {
    drawStageBackdrop(ctx, { accentColor: config.accentColor });

    const board = getGridMetrics(state.gridSize, state.gridSize, 88);

    // Board background
    ctx.fillStyle = "#050507";
    ctx.fillRect(board.x - 20, board.y - 20, board.width + 40, board.height + 40);
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = config.accentColor;
    ctx.lineWidth = 1;
    ctx.strokeRect(board.x - 20, board.y - 20, board.width + 40, board.height + 40);
    ctx.globalAlpha = 1;
    ctx.fillRect(board.x, board.y, board.width, board.height);

    // Grid lines
    ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
    ctx.lineWidth = 0.5;

    for (let index = 0; index <= state.gridSize; index += 1) {
      const horizontal = board.y + index * board.cellSize + 0.5;
      const vertical = board.x + index * board.cellSize + 0.5;

      ctx.beginPath();
      ctx.moveTo(board.x, horizontal);
      ctx.lineTo(board.x + board.width, horizontal);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(vertical, board.y);
      ctx.lineTo(vertical, board.y + board.height);
      ctx.stroke();
    }

    // Food with neon glow
    if (state.food) {
      const pulseFactor = 0.84 + Math.sin(time * 6) * 0.12;
      const centerX = board.x + state.food.x * board.cellSize + board.cellSize / 2;
      const centerY = board.y + state.food.y * board.cellSize + board.cellSize / 2;
      const radius = board.cellSize * 0.28 * pulseFactor;

      ctx.fillStyle = `rgba(182, 255, 60, 0.2)`;
      ctx.shadowColor = "#b6ff3c";
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 1.8, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = config.foodColor;
      ctx.shadowColor = config.foodColor;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Snake body: tail fades out, head gets eyes.
    for (let index = state.snake.length - 1; index >= 0; index -= 1) {
      const segment = state.snake[index];
      const pad = index === 0 ? 2 : 3;
      const x = board.x + segment.x * board.cellSize + pad;
      const y = board.y + segment.y * board.cellSize + pad;
      const size = board.cellSize - pad * 2;
      const isHead = index === 0;

      ctx.globalAlpha = isHead ? 1 : Math.max(0.3, 1 - (index / state.snake.length) * 0.65);
      ctx.shadowColor = config.bodyColor;
      ctx.shadowBlur = isHead ? 16 : 6;
      fillRoundedRect(ctx, x, y, size, size, isHead ? 5 : 3, config.bodyColor);
      ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;

    // Eyes track the travel direction.
    if (state.snake.length > 0) {
      const head = state.snake[0];
      const cell = board.cellSize;
      const vector = DIRECTION_VECTORS[state.direction] ?? { x: 1, y: 0 };
      const eye = Math.max(2, cell * 0.13);
      const eyeX = board.x + head.x * cell + cell / 2 + vector.x * cell * 0.18;
      const eyeY = board.y + head.y * cell + cell / 2 + vector.y * cell * 0.18;

      ctx.fillStyle = "#050507";
      ctx.fillRect(eyeX + vector.y * cell * 0.17 - eye / 2, eyeY + vector.x * cell * 0.17 - eye / 2, eye, eye);
      ctx.fillRect(eyeX - vector.y * cell * 0.17 - eye / 2, eyeY - vector.x * cell * 0.17 - eye / 2, eye, eye);
    }

    // Mode label
    ctx.fillStyle = config.accentColor;
    ctx.font = '10px "Silkscreen", "JetBrains Mono", monospace';
    ctx.fillText(mode.label.toUpperCase(), board.x, board.y - 12);

    // Status overlays
    if (state.status === "ready") {
      drawOverlayCard(ctx, "Ready", "Press Enter or Space to start.", config.accent);
    } else if (state.status === "paused") {
      drawOverlayCard(ctx, "Paused", "Press Space to resume.", config.accent);
    } else if (state.status === "game-over") {
      drawOverlayCard(ctx, "Run Ended", "Press Enter to restart.", config.accent);
    } else if (state.status === "won") {
      drawOverlayCard(ctx, "Perfect Clear", "You filled the entire grid.", config.accent);
    }
  }

  return {
    action(control) {
      if (["up", "right", "down", "left"].includes(control)) {
        state = queueDirection(state, control);
        return true;
      }

      return false;
    },
    getMeta() {
      return {
        canPause: state.status === "running" || state.status === "paused",
        controlHint: "Arrows or WASD steer. Enter or Space starts. Space pauses.",
        controls: {
          down: { enabled: true, label: "Down" },
          left: { enabled: true, label: "Left" },
          right: { enabled: true, label: "Right" },
          up: { enabled: true, label: "Up" }
        },
        controlPadHidden: false,
        isPaused: state.status === "paused",
        metricLabel: "Tempo",
        metricValue: `${tickMs} ms`,
        noteText: mode.summary,
        score: state.score,
        scoreLabel: "Score",
        status: state.status,
        statusText:
          state.status === "ready"
            ? "CREDIT READY · PRESS START"
            : state.status === "game-over"
            ? "Snake clipped the board. R restarts."
            : state.status === "won"
              ? "Full board clear. A perfect control run."
              : state.status === "paused"
                ? "Run frozen. Space resumes."
                : config.wrap
                  ? "Wrap is live — the walls are tunnels."
                  : mode.id === "rush"
                    ? "Tempo rises with every meal. Stay ahead of it."
                    : "Solid walls. Watch your tail."
      };
    },
    keydown,
    pointerdown() {
      return false;
    },
    render,
    restart,
    togglePause,
    update
  };
}

function createDodgeGame(mode) {
  const config = {
    cruise: {
      accent: "#ff6a3d",
      accentColor: "#ff6a3d",
      hazardColor: "#ff5c5c",
      playerColor: "#ffd23f",
      baseTickMs: 176,
      maxHazards: 4,
      minHazards: 2,
      minTickMs: 106
    },
    storm: {
      accent: "#ff3355",
      accentColor: "#ff3355",
      hazardColor: "#ff3355",
      playerColor: "#f4f4f8",
      baseTickMs: 148,
      maxHazards: 5,
      minHazards: 3,
      minTickMs: 84
    }
  }[mode.id];

  const columns = 12;
  const rows = 18;
  let accumulator = 0;
  let tickMs = config.baseTickMs;
  function createRunState(status = "ready") {
    return {
      hazards: [],
      playerX: Math.floor(columns / 2),
      score: 0,
      status,
      wave: 1
    };
  }

  let state = createRunState();

  function restart() {
    accumulator = 0;
    tickMs = config.baseTickMs;
    state = createRunState();
  }

  function launch() {
    if (state.status === "ready") {
      state = { ...state, status: "running" };
      SFX.start();
      return true;
    }

    if (state.status === "game-over") {
      accumulator = 0;
      tickMs = config.baseTickMs;
      state = createRunState("running");
      SFX.start();
      return true;
    }

    return false;
  }

  function togglePause() {
    if (state.status === "running") {
      state = { ...state, status: "paused" };
      SFX.pause();
      return true;
    }

    if (state.status === "paused") {
      state = { ...state, status: "running" };
      SFX.start();
      return true;
    }

    return false;
  }

  function move(delta) {
    if (state.status === "game-over") {
      return false;
    }

    state = {
      ...state,
      playerX: clamp(state.playerX + delta, 0, columns - 1)
    };
    return true;
  }

  function spawnWave() {
    const count = randomInt(config.minHazards, Math.min(config.maxHazards, config.minHazards + Math.floor(state.wave / 3)));
    const used = new Set();

    while (used.size < count) {
      used.add(Math.floor(Math.random() * columns));
    }

    return Array.from(used, (column) => ({ x: column, y: 0 }));
  }

  function step() {
    const shifted = [];
    let escaped = 0;

    for (const hazard of state.hazards) {
      const nextY = hazard.y + 1;

      if (nextY >= rows) {
        escaped += 1;
      } else {
        shifted.push({ x: hazard.x, y: nextY });
      }
    }

    const nextScore = state.score + 1 + escaped * 4;
    const nextWave = 1 + Math.floor(nextScore / 40);
    const nextHazards = [...shifted, ...spawnWave()];
    const collision = nextHazards.some((hazard) => hazard.y === rows - 1 && hazard.x === state.playerX);

    tickMs = Math.max(config.minTickMs, config.baseTickMs - (nextWave - 1) * 4);
    state = {
      ...state,
      hazards: nextHazards,
      score: nextScore,
      status: collision ? "game-over" : state.status,
      wave: nextWave
    };
  }

  function update(deltaMs) {
    if (state.status !== "running") {
      return;
    }

    accumulator += deltaMs;

    while (accumulator >= tickMs) {
      accumulator -= tickMs;
      step();

      if (state.status !== "running") {
        break;
      }
    }
  }

  function keydown(event) {
    if (event.key === "ArrowLeft" || event.key === "a" || event.key === "A") {
      SFX.keyPress();
      return move(-1);
    }

    if (event.key === "ArrowRight" || event.key === "d" || event.key === "D") {
      SFX.keyPress();
      return move(1);
    }

    if (event.code === "Space") {
      if (state.status === "ready" || state.status === "game-over") {
        return launch();
      }

      return togglePause();
    }

    if (event.key === "Enter" && (state.status === "ready" || state.status === "game-over")) {
      return launch();
    }

    return false;
  }

  function render(ctx) {
    drawStageBackdrop(ctx, { accentColor: config.accentColor });

    const board = getGridMetrics(columns, rows, 92);
    ctx.fillStyle = "#050507";
    ctx.fillRect(board.x - 20, board.y - 20, board.width + 40, board.height + 40);
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = config.accentColor;
    ctx.lineWidth = 1;
    ctx.strokeRect(board.x - 20, board.y - 20, board.width + 40, board.height + 40);
    ctx.globalAlpha = 1;
    ctx.fillRect(board.x, board.y, board.width, board.height);

    // Alternating lane stripes
    for (let column = 0; column < columns; column += 1) {
      const x = board.x + column * board.cellSize;
      const stripe = column % 2 === 0 ? "rgba(255, 255, 255, 0.035)" : "rgba(255, 255, 255, 0.015)";
      ctx.fillStyle = stripe;
      ctx.fillRect(x, board.y, board.cellSize, board.height);
    }

    // Grid lines
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 0.5;
    for (let row = 1; row < rows; row += 1) {
      const y = board.y + row * board.cellSize + 0.5;
      ctx.beginPath();
      ctx.moveTo(board.x, y);
      ctx.lineTo(board.x + board.width, y);
      ctx.stroke();
    }

    // Hazards with neon glow
    for (const hazard of state.hazards) {
      const x = board.x + hazard.x * board.cellSize + 4;
      const y = board.y + hazard.y * board.cellSize + 4;
      const size = board.cellSize - 8;
      ctx.fillStyle = config.hazardColor;
      ctx.shadowColor = config.hazardColor;
      ctx.shadowBlur = 16;
      ctx.fillRect(x, y, size, size);
      ctx.shadowBlur = 0;
    }

    // Player with neon glow
    const playerY = board.y + (rows - 1) * board.cellSize + 6;
    const playerX = board.x + state.playerX * board.cellSize + board.cellSize / 2;
    ctx.fillStyle = config.playerColor;
    ctx.shadowBlur = 20;
    ctx.shadowColor = config.playerColor;
    ctx.beginPath();
    ctx.moveTo(playerX, playerY + 4);
    ctx.lineTo(playerX - board.cellSize * 0.28, playerY + board.cellSize - 6);
    ctx.lineTo(playerX + board.cellSize * 0.28, playerY + board.cellSize - 6);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    // Mode label
    ctx.fillStyle = config.accentColor;
    ctx.font = '10px "Silkscreen", "JetBrains Mono", monospace';
    ctx.fillText(mode.label.toUpperCase(), board.x, board.y - 12);

    if (state.status === "ready") {
      drawOverlayCard(ctx, "Ready", "Press Enter or Space to launch the run.", config.accent);
    } else if (state.status === "paused") {
      drawOverlayCard(ctx, "Paused", "Resume when you are ready to re-enter traffic.", config.accent);
    } else if (state.status === "game-over") {
      drawOverlayCard(ctx, "Impact", "Press Enter or Space to restart the run.", config.accent);
    }
  }

  return {
    action(control) {
      if (control === "left") {
        return move(-1);
      }

      if (control === "right") {
        return move(1);
      }

      return false;
    },
    getMeta() {
      return {
        canPause: state.status === "running" || state.status === "paused",
        controlHint: "Use Left and Right or A and D to weave. Enter or Space starts. Space pauses after launch.",
        controls: {
          down: { enabled: false, label: "Locked" },
          left: { enabled: true, label: "Left" },
          right: { enabled: true, label: "Right" },
          up: { enabled: false, label: "Locked" }
        },
        controlPadHidden: false,
        isPaused: state.status === "paused",
        metricLabel: "Wave",
        metricValue: String(state.wave),
        noteText: mode.summary,
        score: state.score,
        scoreLabel: "Score",
        status: state.status,
        statusText:
          state.status === "ready"
            ? "CREDIT READY · PRESS START"
            : state.status === "game-over"
            ? "Meteor contact. R restarts the run."
            : state.status === "paused"
              ? "Traffic frozen. Space resumes."
              : mode.id === "storm"
                ? "Storm density. Read the next row before you commit."
                : "Cruise ramps gently, but the board still tightens."
      };
    },
    keydown,
    pointerdown() {
      return false;
    },
    render,
    restart,
    togglePause,
    update
  };
}

function createMemoryGame(mode) {
  const config = {
    focus: {
      accent: "#a855f7",
      clearDelay: 520,
      flashGap: 210,
      flashOn: 560,
      introDelay: 420
    },
    rush: {
      accent: "#ec4899",
      clearDelay: 420,
      flashGap: 140,
      flashOn: 360,
      introDelay: 260
    }
  }[mode.id];

  const palette = ["#5eead4", "#60a5fa", "#a78bfa", "#f472b6", "#fb7185", "#f59e0b", "#22c55e", "#38bdf8", "#f97316"];
  let hitRegions = [];
  let state;

  function startRound() {
    state.sequence.push(Math.floor(Math.random() * 9));
    state.flashIndex = null;
    state.inputIndex = 0;
    state.showIndex = 0;
    state.status = "showing";
    state.timer = config.introDelay;
  }

  function restart() {
    state = {
      flashIndex: null,
      inputIndex: 0,
      pausedFrom: null,
      pressedIndex: null,
      pressedTimer: 0,
      score: 0,
      sequence: [],
      showIndex: 0,
      status: "ready",
      timer: 0
    };
  }

  function launch() {
    if (state.status === "ready") {
      state.sequence = [];
      state.score = 0;
      state.flashIndex = null;
      state.inputIndex = 0;
      state.showIndex = 0;
      state.pressedIndex = null;
      state.pressedTimer = 0;
      startRound();
      return true;
    }

    if (state.status === "game-over") {
      restart();
      return launch();
    }

    return false;
  }

  function togglePause() {
    if (state.status === "game-over" || state.status === "ready") {
      return false;
    }

    if (state.status === "paused") {
      state.status = state.pausedFrom ?? "showing";
      state.pausedFrom = null;
      return true;
    }

    state.pausedFrom = state.status;
    state.status = "paused";
    return true;
  }

  function acceptIndex(index) {
    if (state.status !== "input") {
      return false;
    }

    state.pressedIndex = index;
    state.pressedTimer = 180;

    if (index !== state.sequence[state.inputIndex]) {
      state.status = "game-over";
      return true;
    }

    state.inputIndex += 1;

    if (state.inputIndex >= state.sequence.length) {
      state.score += 1;
      state.status = "round-clear";
      state.timer = config.clearDelay;
    }

    return true;
  }

  function update(deltaMs) {
    if (state.pressedTimer > 0) {
      state.pressedTimer = Math.max(0, state.pressedTimer - deltaMs);

      if (state.pressedTimer === 0) {
        state.pressedIndex = null;
      }
    }

    if (state.status === "paused" || state.status === "game-over") {
      return;
    }

    if (state.status === "round-clear") {
      state.timer -= deltaMs;

      if (state.timer <= 0) {
        startRound();
      }

      return;
    }

    if (state.status !== "showing") {
      return;
    }

    state.timer -= deltaMs;

    while (state.timer <= 0 && state.status === "showing") {
      if (state.flashIndex === null) {
        if (state.showIndex >= state.sequence.length) {
          state.status = "input";
          state.flashIndex = null;
          break;
        }

        state.flashIndex = state.sequence[state.showIndex];
        state.timer += config.flashOn;
      } else {
        state.flashIndex = null;
        state.showIndex += 1;
        state.timer += config.flashGap;
      }
    }
  }

  function keydown(event) {
    if (event.code === "Space") {
      if (state.status === "ready" || state.status === "game-over") {
        return launch();
      }

      return togglePause();
    }

    if (event.key === "Enter" && (state.status === "ready" || state.status === "game-over")) {
      return launch();
    }

    const index = MEMORY_KEY_TO_INDEX[event.key];

    if (index !== undefined) {
      return acceptIndex(index);
    }

    return false;
  }

  function render(ctx) {
    drawStageBackdrop(ctx, { accentColor: config.accent });

    const boardSize = Math.min(viewport.width, viewport.height) - 182;
    const gap = Math.max(12, Math.floor(boardSize * 0.035));
    const tileSize = Math.floor((boardSize - gap * 2) / 3);
    const size = tileSize * 3 + gap * 2;
    const startX = Math.floor((viewport.width - size) / 2);
    const startY = Math.floor((viewport.height - size) / 2);

    hitRegions = [];

    fillRoundedRect(ctx, startX - 24, startY - 24, size + 48, size + 48, 30, "rgba(10, 11, 24, 0.78)");
    strokeRoundedRect(ctx, startX - 24, startY - 24, size + 48, size + 48, 30, "rgba(255, 255, 255, 0.08)");

    for (let index = 0; index < 9; index += 1) {
      const column = index % 3;
      const row = Math.floor(index / 3);
      const x = startX + column * (tileSize + gap);
      const y = startY + row * (tileSize + gap);
      const active = state.flashIndex === index || state.pressedIndex === index;
      const color = palette[index];
      const fill = active ? color : "rgba(255, 255, 255, 0.08)";
      const stroke = active ? "rgba(255, 255, 255, 0.75)" : "rgba(255, 255, 255, 0.1)";

      ctx.shadowBlur = active ? 28 : 0;
      ctx.shadowColor = color;
      fillRoundedRect(ctx, x, y, tileSize, tileSize, 22, fill);
      ctx.shadowBlur = 0;
      strokeRoundedRect(ctx, x, y, tileSize, tileSize, 22, stroke, 1.5);

      ctx.fillStyle = active ? "#0f1020" : "rgba(255, 255, 255, 0.82)";
      ctx.font = '700 22px "JetBrains Mono", monospace';
      ctx.textAlign = "center";
      ctx.fillText(String(index + 1), x + tileSize / 2, y + tileSize / 2 + 8);

      hitRegions.push({ index, size: tileSize, x, y });
    }

    ctx.textAlign = "left";
    ctx.fillStyle = config.accent;
    ctx.font = '10px "Silkscreen", "JetBrains Mono", monospace';
    ctx.fillText(mode.label.toUpperCase(), startX, startY - 34);

    if (state.status === "ready") {
      drawOverlayCard(ctx, "Ready", "Press Enter or Space to start the pattern.", config.accent);
    } else if (state.status === "paused") {
      drawOverlayCard(ctx, "Paused", "Resume to continue the pattern chain.", config.accent);
    } else if (state.status === "game-over") {
      drawOverlayCard(ctx, "Sequence Broken", "Press Enter or Space to restart.", config.accent);
    } else if (state.status === "round-clear") {
      drawOverlayCard(ctx, "Clean Recall", "Next pattern loading.", config.accent);
    }
  }

  restart();

  return {
    action() {
      return false;
    },
    getMeta() {
      return {
        canPause: state.status !== "game-over" && state.status !== "ready",
        controlHint: "Tap pads or use number keys 1 to 9. Enter or Space starts. Space pauses after launch.",
        controls: {
          down: { enabled: false, label: "Tap" },
          left: { enabled: false, label: "Tap" },
          right: { enabled: false, label: "Tap" },
          up: { enabled: false, label: "Tap" }
        },
        controlPadHidden: true,
        isPaused: state.status === "paused",
        metricLabel: state.status === "input" ? "Input" : "Chain",
        metricValue:
          state.status === "input"
            ? `${state.inputIndex}/${state.sequence.length}`
            : String(state.sequence.length),
        noteText: mode.summary,
        score: state.score,
        scoreLabel: "Rounds",
        status: ["showing", "input", "round-clear"].includes(state.status) ? "running" : state.status,
        statusText:
          state.status === "ready"
            ? "CREDIT READY · PRESS START"
            : state.status === "game-over"
            ? "Wrong tile. The chain broke."
            : state.status === "paused"
              ? "Playback frozen. Space resumes."
              : state.status === "input"
                ? "Your turn. Repeat the full pattern."
                : mode.id === "rush"
                  ? "Short flash windows. Read early, commit."
                  : "Watch the sequence build."
      };
    },
    keydown,
    pointerdown(point) {
      for (const region of hitRegions) {
        if (
          point.x >= region.x &&
          point.x <= region.x + region.size &&
          point.y >= region.y &&
          point.y <= region.y + region.size
        ) {
          return acceptIndex(region.index);
        }
      }

      return false;
    },
    render,
    restart,
    togglePause,
    update
  };
}

function createBlackoutGame(mode) {
  const config = {
    night: {
      accent: "#f5f7fb",
      ballSpeed: 300,
      paddleStep: 46,
      paddleWidth: 136,
      targetColumns: 5
    },
    hardcut: {
      accent: "#f59e0b",
      ballSpeed: 352,
      paddleStep: 38,
      paddleWidth: 108,
      targetColumns: 6
    }
  }[mode.id];

  const world = { height: 1000, width: 1000 };
  const ballRadius = 12;
  const paddleHeight = 18;
  const paddleY = 912;
  const targetGap = 18;
  const targetHeight = 18;

  function createTargets() {
    const width = config.targetColumns === 6 ? 104 : 118;
    const totalWidth = config.targetColumns * width + (config.targetColumns - 1) * targetGap;
    const startX = (world.width - totalWidth) / 2;
    const targets = [];

    for (let row = 0; row < 2; row += 1) {
      for (let column = 0; column < config.targetColumns; column += 1) {
        targets.push({
          height: targetHeight,
          live: true,
          width,
          x: startX + column * (width + targetGap),
          y: 150 + row * 54
        });
      }
    }

    return targets;
  }

  function createRunState(status = "ready") {
    return {
      ball: {
        vx: (Math.random() > 0.5 ? 1 : -1) * config.ballSpeed * 0.72,
        vy: -config.ballSpeed,
        x: world.width / 2,
        y: world.height * 0.68
      },
      paddleX: world.width / 2,
      score: 0,
      status,
      streak: 0,
      targets: createTargets()
    };
  }

  function intersectsCircle(rect, circleX, circleY, radius) {
    const closestX = clamp(circleX, rect.x, rect.x + rect.width);
    const closestY = clamp(circleY, rect.y, rect.y + rect.height);
    const dx = circleX - closestX;
    const dy = circleY - closestY;
    return dx * dx + dy * dy <= radius * radius;
  }

  let state = createRunState();

  function restart() {
    state = createRunState();
  }

  function launch() {
    if (state.status === "ready") {
      state = { ...state, status: "running" };
      return true;
    }

    if (state.status === "game-over") {
      state = createRunState("running");
      return true;
    }

    return false;
  }

  function togglePause() {
    if (state.status === "running") {
      state = { ...state, status: "paused" };
      return true;
    }

    if (state.status === "paused") {
      state = { ...state, status: "running" };
      return true;
    }

    return false;
  }

  function move(delta) {
    if (state.status === "game-over") {
      return false;
    }

    const halfWidth = config.paddleWidth / 2;
    state = {
      ...state,
      paddleX: clamp(state.paddleX + delta, 80 + halfWidth, world.width - 80 - halfWidth)
    };
    return true;
  }

  function update(deltaMs) {
    if (state.status !== "running") {
      return;
    }

    const deltaSeconds = deltaMs / 1000;
    const nextBall = {
      ...state.ball,
      x: state.ball.x + state.ball.vx * deltaSeconds,
      y: state.ball.y + state.ball.vy * deltaSeconds
    };

    let nextTargets = state.targets;
    let nextScore = state.score;
    let nextStreak = state.streak;
    let nextStatus = state.status;

    if (nextBall.x <= 70 + ballRadius || nextBall.x >= world.width - 70 - ballRadius) {
      nextBall.x = clamp(nextBall.x, 70 + ballRadius, world.width - 70 - ballRadius);
      nextBall.vx *= -1;
    }

    if (nextBall.y <= 90 + ballRadius) {
      nextBall.y = 90 + ballRadius;
      nextBall.vy = Math.abs(nextBall.vy);
    }

    const halfWidth = config.paddleWidth / 2;
    const paddleRect = {
      height: paddleHeight,
      width: config.paddleWidth,
      x: state.paddleX - halfWidth,
      y: paddleY - paddleHeight / 2
    };

    if (
      nextBall.vy > 0 &&
      intersectsCircle(paddleRect, nextBall.x, nextBall.y, ballRadius)
    ) {
      const offset = (nextBall.x - state.paddleX) / halfWidth;
      nextBall.y = paddleRect.y - ballRadius;
      nextBall.vy = -Math.abs(nextBall.vy);
      nextBall.vx = clamp(nextBall.vx + offset * 220, -520, 520);
      nextScore += 1;
      nextStreak += 1;
    }

    for (let index = 0; index < nextTargets.length; index += 1) {
      const target = nextTargets[index];

      if (!target.live || !intersectsCircle(target, nextBall.x, nextBall.y, ballRadius)) {
        continue;
      }

      nextBall.vy *= -1;
      nextTargets = nextTargets.map((item, itemIndex) => (itemIndex === index ? { ...item, live: false } : item));
      nextScore += 5;
      nextStreak += 1;
      break;
    }

    if (nextTargets.length > 0 && nextTargets.every((target) => !target.live)) {
      nextTargets = createTargets();
      nextScore += 12;
    }

    if (nextBall.y - ballRadius > world.height + 20) {
      nextStatus = "game-over";
    }

    state = {
      ...state,
      ball: nextBall,
      score: nextScore,
      status: nextStatus,
      streak: nextStreak,
      targets: nextTargets
    };
  }

  function keydown(event) {
    if (event.key === "ArrowLeft" || event.key === "a" || event.key === "A") {
      return move(-config.paddleStep);
    }

    if (event.key === "ArrowRight" || event.key === "d" || event.key === "D") {
      return move(config.paddleStep);
    }

    if (event.code === "Space") {
      if (state.status === "ready" || state.status === "game-over") {
        return launch();
      }

      return togglePause();
    }

    if (event.key === "Enter" && (state.status === "ready" || state.status === "game-over")) {
      return launch();
    }

    return false;
  }

  function render(ctx) {
    drawStageBackdrop(ctx, { accentColor: config.accent });

    const board = getGridMetrics(20, 20, 92);
    const scale = board.width / world.width;
    fillRoundedRect(ctx, board.x - 18, board.y - 18, board.width + 36, board.height + 36, 18, "rgba(8, 8, 8, 0.92)");
    strokeRoundedRect(ctx, board.x - 18, board.y - 18, board.width + 36, board.height + 36, 18, "rgba(255, 255, 255, 0.1)");
    fillRoundedRect(ctx, board.x, board.y, board.width, board.height, 12, "#030303");

    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 1;

    for (let index = 0; index <= 20; index += 1) {
      const position = board.x + (board.width / 20) * index + 0.5;
      const vertical = board.y + (board.height / 20) * index + 0.5;

      ctx.beginPath();
      ctx.moveTo(position, board.y);
      ctx.lineTo(position, board.y + board.height);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(board.x, vertical);
      ctx.lineTo(board.x + board.width, vertical);
      ctx.stroke();
    }

    for (const target of state.targets) {
      if (!target.live) {
        continue;
      }

      fillRoundedRect(
        ctx,
        board.x + target.x * scale,
        board.y + target.y * scale,
        target.width * scale,
        target.height * scale,
        6,
        "rgba(255, 255, 255, 0.92)"
      );
    }

    fillRoundedRect(
      ctx,
      board.x + (state.paddleX - config.paddleWidth / 2) * scale,
      board.y + (paddleY - paddleHeight / 2) * scale,
      config.paddleWidth * scale,
      paddleHeight * scale,
      6,
      "#f6f7fb"
    );

    ctx.fillStyle = "#f6f7fb";
    ctx.shadowBlur = 18;
    ctx.shadowColor = "rgba(255, 255, 255, 0.3)";
    ctx.beginPath();
    ctx.arc(board.x + state.ball.x * scale, board.y + state.ball.y * scale, ballRadius * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
    ctx.font = '10px "Silkscreen", "JetBrains Mono", monospace';
    ctx.fillText(mode.label.toUpperCase(), board.x, board.y - 30);

    if (state.status === "ready") {
      drawOverlayCard(ctx, "Ready", "Press Enter or Space to start the rally.", config.accent);
    } else if (state.status === "paused") {
      drawOverlayCard(ctx, "Paused", "Resume when you want the rally back.", config.accent);
    } else if (state.status === "game-over") {
      drawOverlayCard(ctx, "Drop", "Press Enter or Space to restart the rally.", config.accent);
    }
  }

  return {
    action(control) {
      if (control === "left") {
        return move(-config.paddleStep);
      }

      if (control === "right") {
        return move(config.paddleStep);
      }

      return false;
    },
    getMeta() {
      return {
        canPause: state.status === "running" || state.status === "paused",
        controlHint: "Use Left and Right or A and D. Enter or Space starts. Space pauses after launch.",
        controls: {
          down: { enabled: false, label: "Locked" },
          left: { enabled: true, label: "Left" },
          right: { enabled: true, label: "Right" },
          up: { enabled: false, label: "Locked" }
        },
        controlPadHidden: false,
        isPaused: state.status === "paused",
        metricLabel: "Rally",
        metricValue: String(state.streak),
        noteText: mode.summary,
        score: state.score,
        scoreLabel: "Score",
        status: state.status,
        statusText:
          state.status === "ready"
            ? "CREDIT READY · PRESS START"
            : state.status === "game-over"
              ? "Ball dropped below the rail. R restarts."
              : state.status === "paused"
                ? "Rally frozen. Space resumes."
                : mode.id === "hardcut"
                  ? "Tight paddle, fast returns. No room for error."
                  : "Wide paddle, steady rhythm. Build the rally."
      };
    },
    keydown,
    pointerdown() {
      return false;
    },
    render,
    restart,
    togglePause,
    update
  };
}

function createCipherGame(mode) {
  const config = {
    trace: {
      accent: "#7dd3fc",
      baseHunters: 1,
      maxHunters: 3,
      minTickMs: 108,
      tickMs: 176
    },
    panic: {
      accent: "#f87171",
      baseHunters: 2,
      maxHunters: 4,
      minTickMs: 92,
      tickMs: 144
    }
  }[mode.id];

  const gridSize = 14;
  let accumulator = 0;
  let tickMs = config.tickMs;

  function sameCell(first, second) {
    return first.x === second.x && first.y === second.y;
  }

  function buildCorners() {
    return [
      { x: 1, y: 1 },
      { x: gridSize - 2, y: 1 },
      { x: 1, y: gridSize - 2 },
      { x: gridSize - 2, y: gridSize - 2 }
    ];
  }

  function isTaken(cell, cells) {
    return cells.some((item) => item && sameCell(item, cell));
  }

  function createPickup(player, hunters) {
    const blocked = [player, ...hunters];

    for (let attempt = 0; attempt < 80; attempt += 1) {
      const candidate = {
        x: randomInt(0, gridSize - 1),
        y: randomInt(0, gridSize - 1)
      };

      if (!isTaken(candidate, blocked)) {
        return candidate;
      }
    }

    for (let y = 0; y < gridSize; y += 1) {
      for (let x = 0; x < gridSize; x += 1) {
        const candidate = { x, y };

        if (!isTaken(candidate, blocked)) {
          return candidate;
        }
      }
    }

    return null;
  }

  function createHunter(player, hunters, pickup) {
    const corners = buildCorners();

    for (const corner of corners) {
      if (!isTaken(corner, [player, pickup, ...hunters])) {
        return corner;
      }
    }

    for (let y = 0; y < gridSize; y += 1) {
      for (let x = 0; x < gridSize; x += 1) {
        const candidate = { x, y };

        if (!isTaken(candidate, [player, pickup, ...hunters])) {
          return candidate;
        }
      }
    }

    return null;
  }

  function createHunters(count, player) {
    return buildCorners()
      .filter((corner) => !sameCell(corner, player))
      .slice(0, count);
  }

  function createRunState(status = "ready") {
    const player = {
      x: Math.floor(gridSize / 2),
      y: Math.floor(gridSize / 2)
    };
    const hunters = createHunters(config.baseHunters, player);

    return {
      hunters,
      pickup: createPickup(player, hunters),
      player,
      queuedDirection: null,
      score: 0,
      status,
      tick: 0
    };
  }

  let state = createRunState();

  function restart() {
    accumulator = 0;
    tickMs = config.tickMs;
    state = createRunState();
  }

  function launch() {
    if (state.status === "ready") {
      state = { ...state, status: "running" };
      return true;
    }

    if (state.status === "game-over") {
      accumulator = 0;
      tickMs = config.tickMs;
      state = createRunState("running");
      return true;
    }

    return false;
  }

  function togglePause() {
    if (state.status === "running") {
      state = { ...state, status: "paused" };
      return true;
    }

    if (state.status === "paused") {
      state = { ...state, status: "running" };
      return true;
    }

    return false;
  }

  function setDirection(direction) {
    if (!DIRECTION_VECTORS[direction] || state.status === "game-over") {
      return false;
    }

    state = {
      ...state,
      queuedDirection: direction
    };
    return true;
  }

  function moveHunter(hunter, player, tickOffset) {
    const dx = player.x - hunter.x;
    const dy = player.y - hunter.y;

    if (dx === 0 && dy === 0) {
      return hunter;
    }

    const preferX = Math.abs(dx) > Math.abs(dy) || (Math.abs(dx) === Math.abs(dy) && tickOffset % 2 === 0);

    if (preferX && dx !== 0) {
      return { x: hunter.x + Math.sign(dx), y: hunter.y };
    }

    if (dy !== 0) {
      return { x: hunter.x, y: hunter.y + Math.sign(dy) };
    }

    return { x: hunter.x + Math.sign(dx), y: hunter.y };
  }

  function step() {
    const vector = state.queuedDirection ? DIRECTION_VECTORS[state.queuedDirection] : null;
    const nextPlayer = vector
      ? {
          x: clamp(state.player.x + vector.x, 0, gridSize - 1),
          y: clamp(state.player.y + vector.y, 0, gridSize - 1)
        }
      : state.player;

    if (state.hunters.some((hunter) => sameCell(hunter, nextPlayer))) {
      state = {
        ...state,
        player: nextPlayer,
        status: "game-over",
        tick: state.tick + 1
      };
      return;
    }

    let nextScore = state.score;
    let nextHunters = state.hunters.map((hunter, index) => moveHunter(hunter, nextPlayer, state.tick + index));
    let nextPickup = state.pickup;
    let nextStatus = state.status;

    if (nextHunters.some((hunter) => sameCell(hunter, nextPlayer))) {
      nextStatus = "game-over";
    }

    if (nextStatus === "running" && nextPickup && sameCell(nextPlayer, nextPickup)) {
      nextScore += 1;
      tickMs = Math.max(config.minTickMs, config.tickMs - nextScore * 4);

      if (nextScore % 4 === 0 && nextHunters.length < config.maxHunters) {
        const newHunter = createHunter(nextPlayer, nextHunters, nextPickup);

        if (newHunter) {
          nextHunters = [...nextHunters, newHunter];
        }
      }

      nextPickup = createPickup(nextPlayer, nextHunters);
    }

    state = {
      ...state,
      hunters: nextHunters,
      pickup: nextPickup,
      player: nextPlayer,
      score: nextScore,
      status: nextStatus,
      tick: state.tick + 1
    };
  }

  function update(deltaMs) {
    if (state.status !== "running") {
      return;
    }

    accumulator += deltaMs;

    while (accumulator >= tickMs) {
      accumulator -= tickMs;
      step();

      if (state.status !== "running") {
        break;
      }
    }
  }

  function keydown(event) {
    // Try event.key first, then event.code as fallback for arrow keys
    const direction = CONTROL_KEY_TO_DIRECTION[event.key] || CONTROL_KEY_TO_DIRECTION[event.code];

    if (direction) {
      if (state.status === "running" || state.status === "paused" || state.status === "ready") {
        SFX.keyPress();
        setDirection(direction);
        return true;
      }
    }

    if (event.code === "Space") {
      if (state.status === "ready" || state.status === "game-over") {
        return launch();
      }

      return togglePause();
    }

    if (event.key === "Enter" && (state.status === "ready" || state.status === "game-over")) {
      return launch();
    }

    return false;
  }

  function render(ctx, time) {
    drawStageBackdrop(ctx, { accentColor: config.accent });

    const board = getGridMetrics(gridSize, gridSize, 88);
    fillRoundedRect(ctx, board.x - 18, board.y - 18, board.width + 36, board.height + 36, 16, "rgba(5, 5, 5, 0.94)");
    strokeRoundedRect(ctx, board.x - 18, board.y - 18, board.width + 36, board.height + 36, 16, "rgba(255, 255, 255, 0.1)");
    fillRoundedRect(ctx, board.x, board.y, board.width, board.height, 10, "#020202");

    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 1;

    for (let index = 0; index <= gridSize; index += 1) {
      const horizontal = board.y + index * board.cellSize + 0.5;
      const vertical = board.x + index * board.cellSize + 0.5;

      ctx.beginPath();
      ctx.moveTo(board.x, horizontal);
      ctx.lineTo(board.x + board.width, horizontal);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(vertical, board.y);
      ctx.lineTo(vertical, board.y + board.height);
      ctx.stroke();
    }

    if (state.pickup) {
      const centerX = board.x + state.pickup.x * board.cellSize + board.cellSize / 2;
      const centerY = board.y + state.pickup.y * board.cellSize + board.cellSize / 2;
      const pulse = 0.9 + Math.sin(time * 5.2) * 0.12;
      const size = board.cellSize * 0.22 * pulse;

      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(Math.PI / 4);
      ctx.shadowBlur = 22;
      ctx.shadowColor = "rgba(125, 211, 252, 0.46)";
      fillRoundedRect(ctx, -size, -size, size * 2, size * 2, 4, "#9ae6ff");
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    for (const hunter of state.hunters) {
      const x = board.x + hunter.x * board.cellSize + 5;
      const y = board.y + hunter.y * board.cellSize + 5;
      const size = board.cellSize - 10;

      strokeRoundedRect(ctx, x, y, size, size, 4, "rgba(248, 113, 113, 0.95)", 1.5);
      ctx.strokeStyle = "rgba(248, 113, 113, 0.7)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x + 6, y + 6);
      ctx.lineTo(x + size - 6, y + size - 6);
      ctx.moveTo(x + size - 6, y + 6);
      ctx.lineTo(x + 6, y + size - 6);
      ctx.stroke();
    }

    const playerX = board.x + state.player.x * board.cellSize + 4;
    const playerY = board.y + state.player.y * board.cellSize + 4;
    const playerSize = board.cellSize - 8;
    ctx.shadowBlur = 18;
    ctx.shadowColor = "rgba(255, 255, 255, 0.26)";
    fillRoundedRect(ctx, playerX, playerY, playerSize, playerSize, 4, "#f4f7fb");
    ctx.shadowBlur = 0;
    strokeRoundedRect(ctx, playerX + 5, playerY + 5, playerSize - 10, playerSize - 10, 2, "rgba(5, 10, 16, 0.5)");

    ctx.fillStyle = config.accent;
    ctx.font = '10px "Silkscreen", "JetBrains Mono", monospace';
    ctx.fillText(mode.label.toUpperCase(), board.x, board.y - 30);

    if (state.status === "ready") {
      drawOverlayCard(ctx, "Ready", "Press Enter or Space to start the chase.", config.accent);
    } else if (state.status === "paused") {
      drawOverlayCard(ctx, "Paused", "Resume when you want the grid live again.", config.accent);
    } else if (state.status === "game-over") {
      drawOverlayCard(ctx, "Caught", "Press Enter or Space to restart the chase.", config.accent);
    }
  }

  return {
    action(control) {
      if (["up", "right", "down", "left"].includes(control)) {
        return setDirection(control);
      }

      return false;
    },
    getMeta() {
      return {
        canPause: state.status === "running" || state.status === "paused",
        controlHint: "Arrow keys or WASD route the runner. Enter or Space starts. Space pauses after launch.",
        controls: {
          down: { enabled: true, label: "Down" },
          left: { enabled: true, label: "Left" },
          right: { enabled: true, label: "Right" },
          up: { enabled: true, label: "Up" }
        },
        controlPadHidden: false,
        isPaused: state.status === "paused",
        metricLabel: "Heat",
        metricValue: `${state.hunters.length}x`,
        noteText: mode.summary,
        score: state.score,
        scoreLabel: "Nodes",
        status: state.status,
        statusText:
          state.status === "ready"
            ? "CREDIT READY · PRESS START"
            : state.status === "game-over"
              ? "Hunter contact. R restarts the chase."
              : state.status === "paused"
                ? "Grid frozen. Space resumes."
                : mode.id === "panic"
                  ? "Two hunters and climbing. Keep moving."
                  : "Pressure builds with every node. Plan the route."
      };
    },
    keydown,
    pointerdown() {
      return false;
    },
    render,
    restart,
    togglePause,
    update
  };
}

function createFlappyGame(mode) {
  const config = {
    easy: {
      accent: "#ffd23f",
      accentColor: "#ffd23f",
      gravity: 1250,
      flapPower: 400,
      pipeGap: 150,
      pipeSpeed: 180,
      pipeFreq: 2000
    },
    hard: {
      accent: "#ff6a3d",
      accentColor: "#ff6a3d",
      gravity: 1450,
      flapPower: 420,
      pipeGap: 110,
      pipeSpeed: 240,
      pipeFreq: 1600
    }
  }[mode.id];

  const width = viewport.width;
  const height = viewport.height;
  const birdX = width * 0.2;
  const birdSize = 16;
  const pipeWidth = 60;
  const minPipeHeight = 60;

  function createRunState(status = "ready") {
    return {
      birdY: height / 2,
      birdVY: 0,
      pipes: [],
      score: 0,
      status,
      nextPipeTime: config.pipeFreq
    };
  }

  let state = createRunState();
  let gameTime = 0;

  function restart() {
    state = createRunState();
    gameTime = 0;
  }

  function launch() {
    if (state.status === "ready") {
      state = { ...state, status: "running" };
      SFX.start();
      return true;
    }
    if (state.status === "game-over") {
      state = createRunState("running");
      gameTime = 0;
      SFX.start();
      return true;
    }
    return false;
  }

  function togglePause() {
    if (state.status === "running") {
      state = { ...state, status: "paused" };
      SFX.pause();
      return true;
    }
    if (state.status === "paused") {
      state = { ...state, status: "running" };
      SFX.start();
      return true;
    }
    return false;
  }

  function flap() {
    if (state.status === "running") {
      state = { ...state, birdVY: -config.flapPower };
      SFX.ping();
      return true;
    }
    return false;
  }

  function update(deltaMs) {
    if (state.status !== "running") return;

    gameTime += deltaMs;
    const deltaS = deltaMs / 1000;
    // Integrate per-second so the feel doesn't depend on frame rate.
    const nextVY = state.birdVY + config.gravity * deltaS;
    let nextBirdY = state.birdY + nextVY * deltaS;

    let nextPipes = state.pipes
      .map(p => ({ ...p, x: p.x - config.pipeSpeed * deltaS }))
      .filter(p => p.x > -pipeWidth);

    let nextScore = state.score;
    for (const pipe of nextPipes) {
      if (pipe.x < birdX && pipe.x + pipeWidth > birdX && !pipe.scored) {
        nextScore++;
        pipe.scored = true;
        SFX.scoreSmall();
      }
    }

    if (gameTime > state.nextPipeTime) {
      const gapTop = randomInt(minPipeHeight, height - minPipeHeight - config.pipeGap);
      nextPipes.push({
        x: width,
        gapTop,
        gapBottom: gapTop + config.pipeGap,
        scored: false
      });
      gameTime = 0;
    }

    let nextStatus = state.status;
    if (nextBirdY + birdSize > height || nextBirdY < 0) {
      nextStatus = "game-over";
      SFX.gameOver();
    } else {
      for (const pipe of nextPipes) {
        if (birdX + birdSize > pipe.x && birdX < pipe.x + pipeWidth) {
          if (state.birdY < pipe.gapTop || state.birdY + birdSize > pipe.gapBottom) {
            nextStatus = "game-over";
            SFX.gameOver();
          }
        }
      }
    }

    state = {
      ...state,
      birdY: nextBirdY,
      birdVY: nextVY,
      pipes: nextPipes,
      score: nextScore,
      status: nextStatus
    };
  }

  function keydown(event) {
    if (event.code === "Space" || event.key === " ") {
      if (state.status === "ready" || state.status === "game-over") {
        return launch();
      }
      return flap();
    }
    return false;
  }

  function render(ctx) {
    drawStageBackdrop(ctx, { accentColor: config.accentColor });

    for (const pipe of state.pipes) {
      ctx.fillStyle = config.accentColor;
      ctx.shadowColor = config.accentColor;
      ctx.shadowBlur = 12;
      ctx.fillRect(pipe.x, 0, pipeWidth, pipe.gapTop);
      ctx.fillRect(pipe.x, pipe.gapBottom, pipeWidth, height - pipe.gapBottom);
      ctx.shadowBlur = 0;
    }

    // Bird tilts with its velocity.
    ctx.save();
    ctx.translate(birdX, state.birdY);
    ctx.rotate(clamp(state.birdVY / 600, -0.4, 1.05));
    ctx.fillStyle = "#f4f4f8";
    ctx.shadowColor = config.accentColor;
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(0, 0, birdSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = config.accentColor;
    ctx.fillRect(-birdSize * 0.6, -2, birdSize * 0.7, 5);
    ctx.beginPath();
    ctx.moveTo(birdSize - 2, -4);
    ctx.lineTo(birdSize + 7, 0);
    ctx.lineTo(birdSize - 2, 4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#050507";
    ctx.fillRect(birdSize * 0.25, -birdSize * 0.5, 4, 4);
    ctx.restore();

    if (state.status === "ready") {
      drawOverlayCard(ctx, "Ready", "Press Space to flap and start.", config.accent);
    } else if (state.status === "paused") {
      drawOverlayCard(ctx, "Paused", "Press Space to resume.", config.accent);
    } else if (state.status === "game-over") {
      drawOverlayCard(ctx, "Collision", "Press Space to retry.", config.accent);
    }
  }

  return {
    action() { return false; },
    getMeta() {
      return {
        canPause: state.status === "running" || state.status === "paused",
        controlHint: "Press Space or tap to flap and navigate gaps.",
        controls: { up: { enabled: false, label: "" }, down: { enabled: false, label: "" }, left: { enabled: false, label: "" }, right: { enabled: false, label: "" } },
        controlPadHidden: true,
        isPaused: state.status === "paused",
        metricLabel: "Scroll",
        metricValue: `${config.pipeSpeed} px/s`,
        noteText: mode.summary,
        score: state.score,
        scoreLabel: "Pipes",
        status: state.status,
        statusText: state.status === "ready" ? "CREDIT READY · PRESS START" : state.status === "game-over" ? "Clipped. Space retries." : "Hold the rhythm. Thread the gaps."
      };
    },
    keydown,
    pointerdown() { return flap(); },
    render,
    restart,
    togglePause,
    update
  };
}

function createPongGame(mode) {
  const config = {
    normal: {
      accent: "#ff4f9a",
      accentColor: "#ff4f9a",
      ballSpeed: 240,
      paddleSpeed: 420,
      aiDelay: 0.1
    },
    hardcore: {
      accent: "#ff2454",
      accentColor: "#ff2454",
      ballSpeed: 300,
      paddleSpeed: 480,
      aiDelay: 0.04
    }
  }[mode.id];

  const width = viewport.width;
  const height = viewport.height;
  const paddleHeight = 80;
  const paddleWidth = 12;
  const ballSize = 8;

  function createRunState(status = "ready") {
    return {
      ball: {
        x: width / 2,
        y: height / 2,
        vx: (Math.random() > 0.5 ? 1 : -1) * config.ballSpeed * 0.5,
        vy: (Math.random() - 0.5) * config.ballSpeed * 0.5
      },
      playerY: height / 2 - paddleHeight / 2,
      aiY: height / 2 - paddleHeight / 2,
      playerScore: 0,
      aiScore: 0,
      status,
      aiTarget: height / 2
    };
  }

  let state = createRunState();
  const held = { up: false, down: false };

  function restart() {
    state = createRunState();
    held.up = false;
    held.down = false;
  }

  function launch() {
    if (state.status === "ready") {
      state = { ...state, status: "running" };
      SFX.start();
      return true;
    }
    if (state.status === "game-over") {
      // Full reset — otherwise the finished scoreline ends the match instantly.
      state = createRunState("running");
      SFX.start();
      return true;
    }
    return false;
  }

  function togglePause() {
    if (state.status === "running") {
      state = { ...state, status: "paused" };
      SFX.pause();
      return true;
    }
    if (state.status === "paused") {
      state = { ...state, status: "running" };
      SFX.start();
      return true;
    }
    return false;
  }

  function update(deltaMs) {
    if (state.status !== "running") return;

    const deltaS = deltaMs / 1000;
    let nextBall = {
      ...state.ball,
      x: state.ball.x + state.ball.vx * deltaS,
      y: state.ball.y + state.ball.vy * deltaS
    };

    if (nextBall.y - ballSize < 0 || nextBall.y + ballSize > height) {
      nextBall.vy *= -1;
      nextBall.y = clamp(nextBall.y, ballSize, height - ballSize);
    }

    let nextPlayerScore = state.playerScore;
    let nextAiScore = state.aiScore;

    if (nextBall.x - ballSize < paddleWidth && nextBall.y > state.playerY && nextBall.y < state.playerY + paddleHeight && state.ball.x > paddleWidth) {
      nextBall.vx *= -1.05;
      nextBall.x = paddleWidth + ballSize;
      SFX.ping();
    }

    if (nextBall.x + ballSize > width - paddleWidth && nextBall.y > state.aiY && nextBall.y < state.aiY + paddleHeight && state.ball.x < width - paddleWidth) {
      nextBall.vx *= -1.05;
      nextBall.x = width - paddleWidth - ballSize;
      SFX.ping();
    }

    if (nextBall.x < 0) {
      nextAiScore++;
      nextBall = createRunState("running").ball;
    }
    if (nextBall.x > width) {
      nextPlayerScore++;
      nextBall = createRunState("running").ball;
    }

    let nextPlayerY = state.playerY;
    if (held.up) nextPlayerY -= config.paddleSpeed * deltaS;
    if (held.down) nextPlayerY += config.paddleSpeed * deltaS;
    nextPlayerY = clamp(nextPlayerY, 0, height - paddleHeight);

    let nextAiY = state.aiY;

    const aiErrorMargin = mode.id === "hardcore" ? 20 : 40;
    if (Math.random() > config.aiDelay) {
      const target = nextBall.y + randomInt(-aiErrorMargin, aiErrorMargin);
      nextAiY = clamp(state.aiY + (target - (state.aiY + paddleHeight / 2)) * 0.08, 0, height - paddleHeight);
    }

    state = {
      ...state,
      ball: nextBall,
      playerScore: nextPlayerScore,
      aiScore: nextAiScore,
      playerY: nextPlayerY,
      aiY: nextAiY,
      status: nextPlayerScore >= 11 || nextAiScore >= 11 ? "game-over" : "running"
    };
  }

  function keydown(event) {
    if (event.key === "ArrowUp" || event.key === "w" || event.key === "W") {
      held.up = true;
      return true;
    }
    if (event.key === "ArrowDown" || event.key === "s" || event.key === "S") {
      held.down = true;
      return true;
    }
    if (event.code === "Space") {
      return launch() || togglePause();
    }
    return false;
  }

  function keyup(event) {
    if (event.key === "ArrowUp" || event.key === "w" || event.key === "W") {
      held.up = false;
    }
    if (event.key === "ArrowDown" || event.key === "s" || event.key === "S") {
      held.down = false;
    }
  }

  function pointermove(point) {
    if (state.status !== "running") {
      return false;
    }
    state = { ...state, playerY: clamp(point.y - paddleHeight / 2, 0, height - paddleHeight) };
    return true;
  }

  function render(ctx) {
    drawStageBackdrop(ctx, { accentColor: config.accentColor });

    // Dashed center line.
    ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 10]);
    ctx.beginPath();
    ctx.moveTo(width / 2, 24);
    ctx.lineTo(width / 2, height - 24);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = config.accentColor;
    ctx.shadowColor = config.accentColor;
    ctx.shadowBlur = 12;
    ctx.fillRect(0, state.playerY, paddleWidth, paddleHeight);
    ctx.fillRect(width - paddleWidth, state.aiY, paddleWidth, paddleHeight);
    ctx.fillStyle = "#f4f4f8";
    ctx.shadowColor = "rgba(255, 255, 255, 0.4)";
    ctx.beginPath();
    ctx.arc(state.ball.x, state.ball.y, ballSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
    ctx.font = '32px "Silkscreen", "JetBrains Mono", monospace';
    ctx.textAlign = "center";
    ctx.fillText(state.playerScore, width / 4, 76);
    ctx.fillText(state.aiScore, (width * 3) / 4, 76);
    ctx.textAlign = "left";

    if (state.status === "ready") {
      drawOverlayCard(ctx, "Ready", "W/S to move, or follow the mouse. Space starts.", config.accent);
    } else if (state.status === "paused") {
      drawOverlayCard(ctx, "Paused", "Space to resume.", config.accent);
    } else if (state.status === "game-over") {
      const playerWon = state.playerScore > state.aiScore;
      drawOverlayCard(ctx, playerWon ? "You Win" : "Machine Wins", "Space for a rematch.", config.accent);
    }
  }

  return {
    action(control) {
      if (control === "up") {
        state = { ...state, playerY: clamp(state.playerY - 48, 0, height - paddleHeight) };
        return true;
      }
      if (control === "down") {
        state = { ...state, playerY: clamp(state.playerY + 48, 0, height - paddleHeight) };
        return true;
      }
      return false;
    },
    getMeta() {
      return {
        canPause: state.status === "running" || state.status === "paused",
        controlHint: "Hold W/S or Up/Down, or steer with the mouse. Space starts.",
        controls: { up: { enabled: true, label: "Up" }, down: { enabled: true, label: "Down" }, left: { enabled: false, label: "—" }, right: { enabled: false, label: "—" } },
        controlPadHidden: false,
        isPaused: state.status === "paused",
        metricLabel: "Machine",
        metricValue: String(state.aiScore),
        noteText: mode.summary,
        score: state.playerScore,
        scoreLabel: "You",
        status: state.status,
        statusText: state.status === "ready" ? "CREDIT READY · PRESS START" : state.status === "game-over" ? (state.playerScore > state.aiScore ? "Match won. Rematch?" : "The machine took it. Rematch?") : "First to eleven."
      };
    },
    keydown,
    keyup,
    pointerdown() { return false; },
    pointermove,
    render,
    restart,
    togglePause,
    update
  };
}

function createPlatformerGame(mode) {
  const config = {
    sprint: {
      accent: "#a6ff3d",
      accentColor: "#a6ff3d",
      timeLimit: 60000,
      platformCount: 8,
      gravity: 0.6
    },
    survival: {
      accent: "#ffb547",
      accentColor: "#ffb547",
      timeLimit: null,
      platformCount: 12,
      gravity: 0.5
    }
  }[mode.id];

  const width = viewport.width;
  const height = viewport.height;
  const playerSize = 14;
  const platformHeight = 10;

  function generatePlatforms() {
    const platforms = [];
    for (let i = 0; i < config.platformCount; i++) {
      platforms.push({
        x: randomInt(20, width - 80),
        y: height - 40 - i * (height / config.platformCount),
        width: randomInt(60, 100),
        active: true
      });
    }
    platforms.push({ x: 0, y: height - 20, width, active: true });
    return platforms;
  }

  function createRunState(status = "ready") {
    return {
      playerX: width / 2,
      playerY: height - 50,
      playerVX: 0,
      playerVY: 0,
      platforms: generatePlatforms(),
      score: 0,
      status,
      time: config.timeLimit || 0,
      onGround: true
    };
  }

  let state = createRunState();
  let keysPressed = {};

  function restart() {
    state = createRunState();
    keysPressed = {};
  }

  function launch() {
    if (state.status === "ready" || state.status === "game-over") {
      state = { ...state, status: "running" };
      SFX.start();
      return true;
    }
    return false;
  }

  function togglePause() {
    if (state.status === "running") {
      state = { ...state, status: "paused" };
      SFX.pause();
      return true;
    }
    if (state.status === "paused") {
      state = { ...state, status: "running" };
      SFX.start();
      return true;
    }
    return false;
  }

  function update(deltaMs) {
    if (state.status !== "running") return;

    const deltaS = deltaMs / 1000;
    let nextX = state.playerX;
    if (keysPressed["a"] || keysPressed["A"] || keysPressed["ArrowLeft"]) nextX -= 250 * deltaS;
    if (keysPressed["d"] || keysPressed["D"] || keysPressed["ArrowRight"]) nextX += 250 * deltaS;
    nextX = clamp(nextX, 0, width - playerSize);

    let nextVY = state.playerVY + config.gravity;
    let nextY = state.playerY + nextVY * deltaS;
    let onGround = false;

    for (const platform of state.platforms) {
      if (platform.active && state.playerVY >= 0 && nextY + playerSize >= platform.y && nextY + playerSize <= platform.y + platformHeight + 5 && nextX + playerSize > platform.x && nextX < platform.x + platform.width) {
        nextY = platform.y - playerSize;
        nextVY = 0;
        onGround = true;
        if (keysPressed["w"] || keysPressed["W"] || keysPressed[" "] || keysPressed["ArrowUp"]) {
          nextVY = -15;
          SFX.ping();
        }
      }
    }

    if (nextY > height) {
      state = { ...state, status: "game-over" };
      SFX.gameOver();
      return;
    }

    if (config.timeLimit) {
      state = { ...state, time: state.time - deltaMs };
      if (state.time <= 0) {
        state = { ...state, status: "game-over" };
        SFX.gameOver();
        return;
      }
    }

    state = {
      ...state,
      playerX: nextX,
      playerY: nextY,
      playerVY: nextVY,
      onGround,
      score: Math.max(state.score, Math.floor((height - nextY) / 10))
    };
  }

  function keydown(event) {
    keysPressed[event.key] = true;
    keysPressed[event.code] = true;

    if (event.code === "Space") {
      if (state.status === "ready" || state.status === "game-over") {
        return launch();
      }
      // Space is the jump key mid-run; pause lives on P and the button.
      return true;
    }

    if (event.key === "w" || event.key === "W" || event.key === "a" || event.key === "A" ||
        event.key === "d" || event.key === "D" || event.code === "ArrowUp" ||
        event.code === "ArrowLeft" || event.code === "ArrowRight") {
      return true;
    }
    return false;
  }

  function keyup(event) {
    keysPressed[event.key] = false;
    keysPressed[event.code] = false;
  }

  function render(ctx) {
    drawStageBackdrop(ctx, { accentColor: config.accentColor });

    ctx.fillStyle = config.accentColor;
    ctx.shadowColor = config.accentColor;
    ctx.shadowBlur = 12;

    for (const platform of state.platforms) {
      ctx.globalAlpha = platform.active ? 1 : 0.3;
      ctx.fillRect(platform.x, platform.y, platform.width, platformHeight);
    }
    ctx.globalAlpha = 1;

    ctx.beginPath();
    ctx.arc(state.playerX + playerSize / 2, state.playerY + playerSize / 2, playerSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    if (state.status === "ready") {
      drawOverlayCard(ctx, "Ready", "WASD or Arrows to move. Space to jump.", config.accent);
    } else if (state.status === "paused") {
      drawOverlayCard(ctx, "Paused", "Space to resume.", config.accent);
    } else if (state.status === "game-over") {
      drawOverlayCard(ctx, "Game Over", "Space to try again.", config.accent);
    }
  }

  return {
    action(control) {
      if (control === "up" && state.status === "running") {
        keysPressed["w"] = true;
        setTimeout(() => { keysPressed["w"] = false; }, 120);
        return true;
      }
      return false;
    },
    getMeta() {
      return {
        canPause: state.status === "running" || state.status === "paused",
        controlHint: "A/D or arrows move. W or Space jumps. P pauses.",
        controls: { up: { enabled: true, label: "Jump" }, down: { enabled: false, label: "—" }, left: { enabled: true, label: "Left" }, right: { enabled: true, label: "Right" } },
        controlPadHidden: false,
        isPaused: state.status === "paused",
        metricLabel: config.timeLimit ? "Time" : "Height",
        metricValue: config.timeLimit ? `${Math.max(0, Math.floor(state.time / 1000))}s` : `${state.score}m`,
        noteText: mode.summary,
        score: state.score,
        scoreLabel: "Height",
        status: state.status,
        statusText: state.status === "ready" ? "CREDIT READY · PRESS START" : state.status === "game-over" ? "Fell too far. R restarts." : "Climb. The score is altitude."
      };
    },
    keydown,
    keyup,
    pointerdown() { return false; },
    render,
    restart,
    togglePause,
    update
  };
}

canvas.addEventListener("pointerdown", (event) => {
  if (!activeGame) {
    return;
  }

  const rect = canvas.getBoundingClientRect();
  const point = {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };

  if (activeGame.pointerdown(point)) {
    event.preventDefault();
  }
});

document.addEventListener("keydown", (event) => {
  if (initialsOpen) {
    handleInitialsKey(event);
    event.preventDefault();
    return;
  }

  if (!activeGame) {
    return;
  }

  if (activeGame.keydown(event)) {
    event.preventDefault();
    return;
  }

  // Cabinet-level shortcuts for keys the active game didn't claim.
  const key = event.key.toLowerCase();

  if (key === "r") {
    handleButtonAction("restart");
    event.preventDefault();
  } else if (key === "p") {
    handleButtonAction("pause");
    event.preventDefault();
  } else if (key === "m") {
    toggleMute();
    SFX.click();
  } else if (key === "f") {
    toggleFullscreen();
    event.preventDefault();
  } else if (event.key === "[" || event.key === "]") {
    const index = gameDefinitions.findIndex((definition) => definition.id === activeGameId);
    const step = event.key === "]" ? 1 : gameDefinitions.length - 1;
    switchGame(gameDefinitions[(index + step) % gameDefinitions.length].id);
    event.preventDefault();
  }
});

document.addEventListener("keyup", (event) => {
  if (activeGame?.keyup) {
    activeGame.keyup(event);
  }
});

canvas.addEventListener("pointermove", (event) => {
  if (!activeGame?.pointermove) {
    return;
  }

  const rect = canvas.getBoundingClientRect();
  activeGame.pointermove({
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  });
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden && activeGame) {
    const meta = activeGame.getMeta();

    if (meta.status === "running" && meta.canPause) {
      activeGame.togglePause();
    }
  }
});

pauseButton.addEventListener("click", () => {
  handleButtonAction("pause");
});

restartButton.addEventListener("click", () => {
  handleButtonAction("restart");
});

if (fullscreenButton) {
  if (!document.fullscreenEnabled) {
    fullscreenButton.disabled = true;
  }

  fullscreenButton.addEventListener("click", () => {
    toggleFullscreen();
  });
}

for (const button of controlButtons) {
  button.addEventListener("click", () => {
    handleButtonAction(button.dataset.control);
  });
}

window.addEventListener("resize", () => {
  resizeCanvas();
});

document.addEventListener("fullscreenchange", () => {
  updateFullscreenButton();
  resizeCanvas();
});

resizeCanvas();
updateCreditsReadout();
switchGame(activeGameId);
updateFullscreenButton();
window.requestAnimationFrame(frame);
